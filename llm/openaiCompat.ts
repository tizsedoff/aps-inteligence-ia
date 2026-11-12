// Chat con proveedores externos (Groq, NVIDIA) detrás de la misma interfaz que usa el motor con Gemini.
//
// chatStream.ts le pide a `ai.models.generateContentStream({ model, contents, config })` un flujo de
// "chunks" con forma de Gemini. Este módulo traduce eso al formato "chat completions" de OpenAI
// (que hablan Groq y NVIDIA) y devuelve chunks con la misma forma, así el resto del motor no cambia.
//
// Los modelos externos son OPCIONALES y van delante de los de Gemini en la lista de candidatos:
// si uno falla (cupo, error, adjunto no soportado), el motor cae solo al siguiente, que es Gemini.
// Se configuran por variable de entorno (nunca se asume un ID de modelo):
//   APS_EXT_INSTANT / APS_EXT_PRO / APS_EXT_HARD = "groq:<id-de-modelo>,nvidia:<id-de-modelo>"
import { ExternalProviderId, getProviderEndpoint } from './providers.ts';

export const EXT_PREFIX = 'ext:';
const REQUEST_TIMEOUT_MS = 200_000;

export function parseExtModel(name: string): { provider: ExternalProviderId; model: string } | null {
  if (!name.startsWith(EXT_PREFIX)) return null;
  const rest = name.slice(EXT_PREFIX.length);
  const i = rest.indexOf(':');
  if (i < 1) return null;
  const provider = rest.slice(0, i);
  const model = rest.slice(i + 1);
  if ((provider !== 'groq' && provider !== 'nvidia') || !model) return null;
  return { provider, model };
}

/** Candidatos externos del nivel pedido, solo de proveedores con clave cargada. */
export function externalCandidates(tier: 'instant' | 'pro' | 'hard', envSource: NodeJS.ProcessEnv = process.env): string[] {
  const raw = (envSource[`APS_EXT_${tier.toUpperCase()}`] || '').trim();
  if (!raw) return [];
  const out: string[] = [];
  for (const spec of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
    const parsed = parseExtModel(EXT_PREFIX + spec);
    if (parsed && getProviderEndpoint(parsed.provider)) out.push(EXT_PREFIX + spec);
  }
  return out;
}

export class UnsupportedForProviderError extends Error {
  constructor(what: string) {
    super(`Este modelo no admite ${what}`);
    this.name = 'UnsupportedForProviderError';
  }
}

type Json = Record<string, any>;

/** Convierte el historial con forma Gemini a mensajes de chat. Lanza si hay adjuntos que no son imágenes. */
export function toChatMessages(contents: Json[], systemInstruction?: string): Json[] {
  const messages: Json[] = [];
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });

  for (const c of contents) {
    const parts: Json[] = Array.isArray(c.parts) ? c.parts : [];
    if (c.role === 'model') {
      const text = parts.filter((p) => typeof p.text === 'string').map((p) => p.text).join('');
      const toolCalls = parts
        .filter((p) => p.functionCall)
        .map((p, i) => ({
          id: p.functionCall.id || `call_${i}`,
          type: 'function',
          function: { name: p.functionCall.name, arguments: JSON.stringify(p.functionCall.args ?? {}) },
        }));
      const msg: Json = { role: 'assistant', content: text || (toolCalls.length ? null : '') };
      if (toolCalls.length) msg.tool_calls = toolCalls;
      messages.push(msg);
      continue;
    }

    // Respuestas de herramientas: un mensaje "tool" por cada una.
    const responses = parts.filter((p) => p.functionResponse);
    responses.forEach((p, i) =>
      messages.push({
        role: 'tool',
        tool_call_id: p.functionResponse.id || `call_${i}`,
        content: JSON.stringify(p.functionResponse.response ?? {}),
      })
    );

    const content: Json[] = [];
    for (const p of parts) {
      if (typeof p.text === 'string' && p.text) content.push({ type: 'text', text: p.text });
      else if (p.inlineData) {
        const mime = String(p.inlineData.mimeType || '');
        if (!mime.startsWith('image/')) throw new UnsupportedForProviderError('adjuntos que no sean imágenes');
        content.push({ type: 'image_url', image_url: { url: `data:${mime};base64,${p.inlineData.data}` } });
      }
    }
    if (content.length === 0) continue;
    const onlyText = content.every((x) => x.type === 'text');
    messages.push({ role: 'user', content: onlyText ? content.map((x) => x.text).join('\n') : content });
  }
  return messages;
}

function lowerTypes(schema: any): any {
  if (Array.isArray(schema)) return schema.map(lowerTypes);
  if (schema && typeof schema === 'object') {
    const out: Json = {};
    for (const [k, v] of Object.entries(schema)) out[k] = k === 'type' && typeof v === 'string' ? v.toLowerCase() : lowerTypes(v);
    return out;
  }
  return schema;
}

export function toOpenAiTools(tools: Json[] | undefined): Json[] | undefined {
  const decls = (tools || []).flatMap((t) => t.functionDeclarations || []);
  if (decls.length === 0) return undefined;
  return decls.map((d) => ({
    type: 'function',
    function: { name: d.name, description: d.description, parameters: lowerTypes(d.parameters) },
  }));
}

const chunkOf = (part: Json) => ({ candidates: [{ content: { parts: [part] } }] });

/** Abre la conexión y valida la respuesta ANTES de devolver el flujo (como Gemini): así los fallos activan la cascada. */
async function openStream(
  fetchImpl: typeof fetch,
  req: { provider: ExternalProviderId; model: string; contents: Json[]; config: Json }
) {
  const endpoint = getProviderEndpoint(req.provider);
  if (!endpoint) throw Object.assign(new Error(`${req.provider} no está configurado`), { status: 503 });

  const body: Json = {
    model: req.model,
    messages: toChatMessages(req.contents, req.config?.systemInstruction),
    stream: true,
  };
  const tools = toOpenAiTools(req.config?.tools);
  if (tools) body.tools = tools;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetchImpl(`${endpoint.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${endpoint.apiKey}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok || !res.body) {
      throw Object.assign(new Error(`El proveedor ${req.provider} respondió ${res.status}`), { status: res.status });
    }
    return { body: res.body, done: () => clearTimeout(timer) };
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

async function* parseStream(opened: { body: ReadableStream<Uint8Array>; done: () => void }) {
  try {
    const reader = opened.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let inThink = false;
    const calls = new Map<number, { id?: string; name: string; args: string }>();

    const handleData = function* (data: string): Generator<Json> {
      let json: any;
      try {
        json = JSON.parse(data);
      } catch {
        return;
      }
      const delta = json?.choices?.[0]?.delta;
      if (!delta) return;

      const reasoning = delta.reasoning_content ?? delta.reasoning;
      if (typeof reasoning === 'string' && reasoning) yield chunkOf({ text: reasoning, thought: true });

      if (typeof delta.content === 'string' && delta.content) {
        // Algunos modelos mezclan su razonamiento en el texto entre <think>…</think>.
        for (const piece of delta.content.split(/(<\/?think>)/)) {
          if (piece === '<think>') inThink = true;
          else if (piece === '</think>') inThink = false;
          else if (piece) yield chunkOf(inThink ? { text: piece, thought: true } : { text: piece });
        }
      }

      for (const tc of delta.tool_calls || []) {
        const idx = typeof tc.index === 'number' ? tc.index : 0;
        const cur = calls.get(idx) || { name: '', args: '' };
        if (tc.id) cur.id = tc.id;
        if (tc.function?.name) cur.name += tc.function.name;
        if (tc.function?.arguments) cur.args += tc.function.arguments;
        calls.set(idx, cur);
      }
    };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data && data !== '[DONE]') yield* handleData(data);
      }
    }
    const tail = buffer.trim();
    if (tail.startsWith('data:') && tail.slice(5).trim() !== '[DONE]') yield* handleData(tail.slice(5).trim());

    for (const [idx, c] of [...calls.entries()].sort((a, b) => a[0] - b[0])) {
      if (!c.name) continue;
      let args: any = {};
      try {
        args = c.args ? JSON.parse(c.args) : {};
      } catch {
        args = {};
      }
      yield chunkOf({ functionCall: { id: c.id || `call_${idx}`, name: c.name, args } });
    }
  } finally {
    opened.done();
  }
}

/** Cliente con la misma forma que `ai` de @google/genai, pero hablando con Groq/NVIDIA. */
export function createExternalClient(fetchImpl: typeof fetch = fetch) {
  return {
    models: {
      async generateContentStream(args: { model: string; contents: Json[]; config?: Json }) {
        const parsed = parseExtModel(args.model);
        if (!parsed) throw new Error(`Modelo externo inválido: ${args.model}`);
        // openStream convierte los mensajes (lanza si hay adjuntos no soportados) y valida la respuesta
        // antes de devolver nada: cualquier fallo cae al siguiente candidato (Gemini) sin llegar al usuario.
        const opened = await openStream(fetchImpl, { ...parsed, contents: args.contents, config: args.config || {} });
        return parseStream(opened);
      },
    },
  };
}

/** Enruta: los modelos "ext:" van al proveedor externo; el resto, al cliente de Gemini. */
export function withExternalModels(gemini: any, ext = createExternalClient()) {
  return {
    ...gemini,
    models: {
      generateContentStream(args: any) {
        return String(args?.model || '').startsWith(EXT_PREFIX)
          ? ext.models.generateContentStream(args)
          : gemini.models.generateContentStream(args);
      },
    },
  };
}
