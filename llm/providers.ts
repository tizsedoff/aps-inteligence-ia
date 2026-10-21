// Capa de proveedores de IA (servidor). Las claves viven solo aquí: nunca llegan al frontend.
//
// Gemini se usa a través de su SDK (ver server.ts). Groq y NVIDIA exponen APIs compatibles con
// el formato "chat completions" de OpenAI, así que comparten un único adaptador.
// Los IDs de modelo de Groq y NVIDIA NO se asumen: se configuran por variable de entorno y,
// mientras falten la clave o el modelo, ese proveedor queda desactivado.

export type ExternalProviderId = 'groq' | 'nvidia';

interface ProviderConfig {
  id: ExternalProviderId;
  apiKeyEnv: string;
  baseUrlEnv: string;
  defaultBaseUrl: string;
  reviewModelEnv: string;
}

const PROVIDERS: Record<ExternalProviderId, ProviderConfig> = {
  groq: {
    id: 'groq',
    apiKeyEnv: 'GROQ_API_KEY',
    baseUrlEnv: 'GROQ_BASE_URL',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    reviewModelEnv: 'GROQ_REVIEW_MODEL',
  },
  nvidia: {
    id: 'nvidia',
    apiKeyEnv: 'NVIDIA_API_KEY',
    baseUrlEnv: 'NVIDIA_BASE_URL',
    defaultBaseUrl: 'https://integrate.api.nvidia.com/v1',
    reviewModelEnv: 'NVIDIA_REVIEW_MODEL',
  },
};

export interface LlmRequest {
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface LlmResult {
  text: string;
  provider: ExternalProviderId;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  ms: number;
}

export class LlmError extends Error {
  constructor(message: string, public provider: ExternalProviderId, public status?: number) {
    super(message);
    this.name = 'LlmError';
  }
}

const env = (name: string) => (process.env[name] || '').trim();

export function getReviewModel(id: ExternalProviderId): string {
  return env(PROVIDERS[id].reviewModelEnv);
}

/** Un proveedor externo está listo solo si tiene clave y modelo de revisión configurados. */
export function isProviderReady(id: ExternalProviderId): boolean {
  const cfg = PROVIDERS[id];
  return Boolean(env(cfg.apiKeyEnv) && env(cfg.reviewModelEnv));
}

/** Orden de preferencia para revisar: REVIEW_PROVIDERS="groq,nvidia" (por defecto ese orden). */
export function getReviewProviders(): ExternalProviderId[] {
  const order = (env('REVIEW_PROVIDERS') || 'groq,nvidia')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is ExternalProviderId => s === 'groq' || s === 'nvidia');
  return order.filter(isProviderReady);
}

export async function chatCompletion(
  provider: ExternalProviderId,
  req: LlmRequest
): Promise<LlmResult> {
  const cfg = PROVIDERS[provider];
  const apiKey = env(cfg.apiKeyEnv);
  if (!apiKey) throw new LlmError(`${cfg.apiKeyEnv} no está configurada`, provider);
  const baseUrl = (env(cfg.baseUrlEnv) || cfg.defaultBaseUrl).replace(/\/+$/, '');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), req.timeoutMs ?? 30_000);
  const started = Date.now();
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: req.model,
        messages: [
          { role: 'system', content: req.system },
          { role: 'user', content: req.user },
        ],
        max_tokens: req.maxTokens ?? 2000,
        temperature: req.temperature ?? 0.1,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      let detail = '';
      try {
        detail = (await res.text()).slice(0, 300);
      } catch {}
      throw new LlmError(`HTTP ${res.status} ${detail}`.trim(), provider, res.status);
    }

    const data: any = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim()) {
      throw new LlmError('Respuesta vacía del proveedor', provider, res.status);
    }
    return {
      text,
      provider,
      model: req.model,
      inputTokens: data?.usage?.prompt_tokens,
      outputTokens: data?.usage?.completion_tokens,
      ms: Date.now() - started,
    };
  } catch (e: any) {
    if (e instanceof LlmError) throw e;
    if (e?.name === 'AbortError') throw new LlmError('Tiempo de espera agotado', provider);
    throw new LlmError(e?.message || 'Fallo de red', provider);
  } finally {
    clearTimeout(timer);
  }
}

/** Lee un JSON devuelto por un modelo (con o sin bloque ```json). */
export function parseModelJson(text: string): any | null {
  const raw = (text || '').trim();
  if (!raw) return null;
  const unfenced = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(unfenced);
  } catch {
    const a = unfenced.indexOf('{');
    const b = unfenced.lastIndexOf('}');
    if (a !== -1 && b > a) {
      try {
        return JSON.parse(unfenced.slice(a, b + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}
