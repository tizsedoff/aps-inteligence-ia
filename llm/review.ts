import {
  ExternalProviderId,
  LlmError,
  chatCompletion,
  getReviewModel,
  getReviewProviders,
  parseModelJson,
} from './providers.ts';

export interface ReviewIssue {
  severity: 'high' | 'medium' | 'low';
  file: string;
  problem: string;
}

export interface ReviewOutcome {
  status: 'ok' | 'issues' | 'skipped' | 'failed';
  issues: ReviewIssue[];
  reason?: string;
  // Solo para registros del servidor (no se envía al cliente)
  provider?: ExternalProviderId;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  ms?: number;
}

const REVIEW_SYSTEM = `Eres un revisor de código independiente y estricto.
Recibes una orden del usuario y los archivos que otro modelo generó para cumplirla.
Busca SOLO problemas reales y verificables leyendo el código: errores de sintaxis o de lógica, referencias a funciones/ids/archivos que no existen, funcionalidad pedida que falta, bugs que rompen la ejecución, vulnerabilidades evidentes (XSS, secretos en el código).
NO comentes estilo, preferencias ni mejoras opcionales. NO afirmes que ejecutaste el código: solo lo leíste.
Severidad: "high" = el resultado no funciona o no cumple lo pedido; "medium" = falla en casos concretos; "low" = detalle menor.
Si no encuentras problemas reales, devuelve una lista vacía.
Responde ÚNICAMENTE con JSON: {"issues":[{"severity":"high|medium|low","file":"nombre","problem":"qué falla y por qué, en 1-2 frases"}]}`;

const MAX_REVIEW_CHARS = 60_000;
const MAX_ISSUES = 8;

export async function reviewGeneratedCode(
  command: string,
  files: { filename: string; language: string; code: string }[]
): Promise<ReviewOutcome> {
  const providers = getReviewProviders();
  if (providers.length === 0) {
    return {
      status: 'skipped',
      issues: [],
      reason: 'No hay un proveedor de revisión configurado.',
    };
  }
  if (files.length === 0) {
    return { status: 'skipped', issues: [], reason: 'No hay archivos para revisar.' };
  }

  let budget = MAX_REVIEW_CHARS;
  const parts: string[] = [];
  for (const f of files) {
    const code = f.code.slice(0, Math.max(0, budget));
    if (!code) break;
    budget -= code.length;
    parts.push(`=== ARCHIVO: ${f.filename} (${f.language}) ===\n${code}\n=== FIN ARCHIVO ===`);
  }
  const user = `ORDEN DEL USUARIO:\n"${command.slice(0, 2000)}"\n\nARCHIVOS GENERADOS:\n${parts.join('\n\n')}`;

  let lastError = '';
  for (const provider of providers) {
    try {
      const r = await chatCompletion(provider, {
        model: getReviewModel(provider),
        system: REVIEW_SYSTEM,
        user,
        maxTokens: 1500,
        timeoutMs: 30_000,
      });
      const parsed = parseModelJson(r.text);
      if (!parsed || !Array.isArray(parsed.issues)) {
        lastError = `${provider}: respuesta de revisión ilegible`;
        continue;
      }
      const issues: ReviewIssue[] = parsed.issues
        .filter((i: any) => i && typeof i.problem === 'string' && i.problem.trim())
        .slice(0, MAX_ISSUES)
        .map((i: any) => ({
          severity: ['high', 'medium', 'low'].includes(i.severity) ? i.severity : 'medium',
          file: typeof i.file === 'string' ? i.file.slice(0, 64) : '',
          problem: i.problem.trim().slice(0, 400),
        }));
      return {
        status: issues.length > 0 ? 'issues' : 'ok',
        issues,
        provider: r.provider,
        model: r.model,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        ms: r.ms,
      };
    } catch (e: any) {
      lastError = e instanceof LlmError ? `${e.provider}: ${e.message}` : String(e?.message || e);
    }
  }
  return { status: 'failed', issues: [], reason: lastError || 'La revisión falló.' };
}
