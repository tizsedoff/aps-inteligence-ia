// Orquestador de reunión grupal de APS INTELLIGENCE.
//
// Flujo controlado (una sola ronda):
//   1. PLAN        – un planificador barato elige participantes y asigna a cada uno un ángulo distinto.
//                    Si falta información crítica, la reunión se detiene y se la pide al usuario.
//   2. ANÁLISIS    – cada especialista analiza el tema por separado y en paralelo (sin ver a los demás).
//   3. SÍNTESIS    – un sintetizador integra acuerdos, desacuerdos, datos faltantes y próximos pasos.
//
// Todo pasa por la interfaz `LlmGenerate`, de modo que cambiar de proveedor no toca esta lógica.
// Límites duros: participantes, llamadas, tokens de salida por llamada y tiempo total.

import {
  FLOORS,
  SPECIALISTS,
  buildSpecialistSystemPrompt,
  getSpecialist,
  type FloorId,
  type Specialist,
} from './specialists.ts';

// ---------------------------------------------------------------------------
// Interfaz de proveedor
// ---------------------------------------------------------------------------

export type ModelTier = 'fast' | 'strong';

export interface LlmRequest {
  system: string;
  prompt: string;
  /** Pide salida JSON estricta. */
  json?: boolean;
  tier: ModelTier;
  maxOutputTokens: number;
  signal?: AbortSignal;
}

export interface LlmResponse {
  text: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
}

export type LlmGenerate = (req: LlmRequest) => Promise<LlmResponse>;

// ---------------------------------------------------------------------------
// Tipos de entrada / salida
// ---------------------------------------------------------------------------

export interface MeetingLimits {
  maxParticipants: number;
  /** Máximo de llamadas al modelo en toda la reunión (plan + especialistas + síntesis). */
  maxCalls: number;
  maxOutputTokensPerCall: number;
  /** Tiempo total de la reunión. */
  timeoutMs: number;
}

export const DEFAULT_LIMITS: MeetingLimits = {
  maxParticipants: 4,
  maxCalls: 6,
  maxOutputTokensPerCall: 1200,
  timeoutMs: 90_000,
};

export interface MeetingInput {
  topic: string;
  /** Contexto autorizado por el usuario (datos del negocio, números, restricciones). */
  context?: string;
  /** Si se indican, se respetan (se recortan a `maxParticipants`). */
  participants?: string[];
  floor?: FloorId;
  /** Si es true, no se detiene aunque el planificador marque información crítica faltante. */
  proceedAnyway?: boolean;
}

export interface PlannedParticipant {
  id: string;
  name: string;
  role: string;
  angle: string;
}

export interface SpecialistResult {
  id: string;
  name: string;
  role: string;
  status: 'ok' | 'failed';
  text: string;
  error?: string;
}

export interface Disagreement {
  topic: string;
  positions: { specialist: string; position: string }[];
}

export interface NextStep {
  action: string;
  owner: string;
  priority: 'alta' | 'media' | 'baja';
}

export interface Synthesis {
  conclusion: string;
  agreements: string[];
  disagreements: Disagreement[];
  missingInfo: string[];
  nextSteps: NextStep[];
  confidence: 'baja' | 'media' | 'alta';
  caveats: string[];
}

export type MeetingStatus = 'completed' | 'partial' | 'needs_info' | 'stopped';

export interface MeetingUsage {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  elapsedMs: number;
}

export type MeetingEvent =
  | {
      type: 'plan';
      participants: PlannedParticipant[];
      missingInfo: string[];
      needsInfo: boolean;
      question?: string;
      planSource: 'model' | 'fallback';
    }
  | { type: 'specialist'; result: SpecialistResult }
  | { type: 'synthesis'; synthesis: Synthesis }
  | { type: 'complete'; status: MeetingStatus; usage: MeetingUsage; notes: string[] };

export interface MeetingOutcome {
  status: MeetingStatus;
  plan: PlannedParticipant[];
  results: SpecialistResult[];
  synthesis?: Synthesis;
  question?: string;
  usage: MeetingUsage;
  notes: string[];
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

class BudgetError extends Error {}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** Extrae un objeto JSON de la respuesta del modelo (tolera ```json ... ```). */
export function parseJsonLoose(raw: string): any | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function strArray(value: unknown, maxItems = 6, maxLen = 300): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v) => typeof v === 'string' && v.trim().length > 0)
    .slice(0, maxItems)
    .map((v) => clip(v.trim(), maxLen));
}

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Selección de respaldo cuando el planificador falla: pedidos > piso > palabras clave > piso de negocio. */
export function fallbackSelection(input: MeetingInput, maxParticipants: number): Specialist[] {
  const picked: Specialist[] = [];
  const push = (s?: Specialist) => {
    if (s && !picked.some((p) => p.id === s.id)) picked.push(s);
  };

  for (const id of input.participants || []) push(getSpecialist(id));

  if (picked.length === 0 && input.floor && FLOORS[input.floor]) {
    for (const id of FLOORS[input.floor].defaultTeam) push(getSpecialist(id));
  }

  if (picked.length === 0) {
    // Coincidencia por palabra completa (evita que "ui" calce dentro de "quiero").
    const haystack = normalize(`${input.topic} ${input.context || ''}`);
    const tokens = haystack.split(/[^a-z0-9]+/).filter(Boolean);
    const padded = ` ${tokens.join(' ')} `;
    const matches = (keyword: string) => {
      const k = normalize(keyword);
      if (k.includes(' ')) return padded.includes(` ${k} `);
      return tokens.some((t) => t === k || (k.length >= 5 && t.startsWith(k)));
    };
    const scored = SPECIALISTS.map((s) => ({
      s,
      score: s.keywords.filter(matches).length,
    }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    for (const x of scored) push(x.s);
  }

  if (picked.length === 0) {
    for (const id of FLOORS.negocio.defaultTeam) push(getSpecialist(id));
  }

  return picked.slice(0, maxParticipants);
}

// ---------------------------------------------------------------------------
// Orquestador
// ---------------------------------------------------------------------------

export interface RunMeetingOptions {
  generate: LlmGenerate;
  limits?: Partial<MeetingLimits>;
  emit?: (event: MeetingEvent) => void;
  signal?: AbortSignal;
  now?: () => number;
}

export async function runMeeting(input: MeetingInput, options: RunMeetingOptions): Promise<MeetingOutcome> {
  const limits: MeetingLimits = { ...DEFAULT_LIMITS, ...(options.limits || {}) };
  const now = options.now || Date.now;
  const emit = options.emit || (() => {});
  const startedAt = now();
  const notes: string[] = [];
  const usage: MeetingUsage = { calls: 0, inputTokens: 0, outputTokens: 0, elapsedMs: 0 };

  // Cancelación combinada: tiempo máximo + señal externa (cliente desconectado).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('timeout')), limits.timeoutMs);
  const onExternalAbort = () => controller.abort(new Error('cancelled'));
  if (options.signal) {
    if (options.signal.aborted) controller.abort(new Error('cancelled'));
    else options.signal.addEventListener('abort', onExternalAbort, { once: true });
  }

  const call = async (req: Omit<LlmRequest, 'maxOutputTokens' | 'signal'> & { maxOutputTokens?: number }) => {
    if (controller.signal.aborted) throw new Error('La reunión se detuvo (tiempo agotado o cancelada).');
    if (usage.calls >= limits.maxCalls) throw new BudgetError('Se alcanzó el máximo de llamadas permitido.');
    usage.calls += 1; // se cuenta al iniciar: una llamada fallida igualmente consume presupuesto
    // Aunque el proveedor ignore la señal, la reunión no queda colgada: se compite contra el abort.
    let onAbort: (() => void) | undefined;
    const aborted = new Promise<never>((_, reject) => {
      onAbort = () => reject(new Error('La reunión se detuvo (tiempo agotado o cancelada).'));
      controller.signal.addEventListener('abort', onAbort, { once: true });
    });
    let res: LlmResponse;
    try {
      res = await Promise.race([
        options.generate({
          ...req,
          maxOutputTokens: Math.min(req.maxOutputTokens ?? limits.maxOutputTokensPerCall, limits.maxOutputTokensPerCall),
          signal: controller.signal,
        }),
        aborted,
      ]);
    } finally {
      if (onAbort) controller.signal.removeEventListener('abort', onAbort);
    }
    usage.inputTokens += res.inputTokens || 0;
    usage.outputTokens += res.outputTokens || 0;
    return res;
  };

  const finish = (outcome: Omit<MeetingOutcome, 'usage' | 'notes'>): MeetingOutcome => {
    usage.elapsedMs = now() - startedAt;
    const full: MeetingOutcome = { ...outcome, usage: { ...usage }, notes };
    emit({ type: 'complete', status: full.status, usage: full.usage, notes });
    return full;
  };

  try {
    // ---------------------------------------------------------------- 1. PLAN
    const cards = SPECIALISTS.map((s) => `- ${s.id} (${s.name}, ${s.role}): ${s.mandate}`).join('\n');
    const requested = (input.participants || []).filter((id) => getSpecialist(id));

    const planPrompt = `TEMA DE LA REUNIÓN:
${input.topic}

CONTEXTO AUTORIZADO POR EL USUARIO:
${input.context?.trim() || '(sin contexto adicional)'}

ESPECIALISTAS DISPONIBLES:
${cards}

${requested.length ? `El usuario pidió explícitamente a: ${requested.join(', ')}. Debes usar solo a ellos.` : `Elige entre 2 y ${limits.maxParticipants} especialistas, solo los necesarios. No incluyas a alguien cuyo aporte sería redundante.`}

Asigna a cada participante un ÁNGULO propio y distinto (una pregunta concreta que solo él deba responder), para que no repitan lo mismo.
Marca "needsInfo": true SOLO si el tema es tan vago que ningún análisis útil es posible sin una respuesta del usuario; en ese caso escribe "question". Si se puede avanzar con supuestos razonables, pon false y lista lo que falta en "missingInfo".

Devuelve SOLO este JSON:
{"participants":[{"id":"...","angle":"..."}],"missingInfo":["..."],"needsInfo":false,"question":""}`;

    let planned: PlannedParticipant[] = [];
    let missingInfo: string[] = [];
    let needsInfo = false;
    let question: string | undefined;
    let planSource: 'model' | 'fallback' = 'model';

    try {
      const planRes = await call({
        system: 'Eres el coordinador de reuniones de APS INTELLIGENCE. Planificas quién participa y con qué ángulo. Respondes solo JSON válido.',
        prompt: planPrompt,
        json: true,
        tier: 'fast',
        maxOutputTokens: 600,
      });
      const parsed = parseJsonLoose(planRes.text);
      const seen = new Set<string>();
      const fromModel: PlannedParticipant[] = [];
      for (const p of Array.isArray(parsed?.participants) ? parsed.participants : []) {
        const spec = typeof p?.id === 'string' ? getSpecialist(p.id) : undefined;
        if (!spec || seen.has(spec.id)) continue;
        if (requested.length && !requested.includes(spec.id)) continue;
        seen.add(spec.id);
        fromModel.push({
          id: spec.id,
          name: spec.name,
          role: spec.role,
          angle: typeof p.angle === 'string' && p.angle.trim() ? clip(p.angle.trim(), 300) : spec.mandate,
        });
      }
      if (fromModel.length === 0) throw new Error('plan sin participantes válidos');
      planned = fromModel.slice(0, limits.maxParticipants);
      missingInfo = strArray(parsed?.missingInfo);
      needsInfo = parsed?.needsInfo === true;
      question = typeof parsed?.question === 'string' && parsed.question.trim() ? clip(parsed.question.trim(), 400) : undefined;
    } catch (err: any) {
      if (err instanceof BudgetError || controller.signal.aborted) throw err;
      planSource = 'fallback';
      notes.push('El planificador no devolvió un plan válido; se eligieron participantes por reglas simples.');
      planned = fallbackSelection(input, limits.maxParticipants).map((s) => ({
        id: s.id,
        name: s.name,
        role: s.role,
        angle: s.mandate,
      }));
    }

    if (needsInfo && !input.proceedAnyway) {
      emit({ type: 'plan', participants: planned, missingInfo, needsInfo: true, question, planSource });
      notes.push('La reunión se detuvo antes de consultar a los especialistas: falta información crítica.');
      return finish({ status: 'needs_info', plan: planned, results: [], question });
    }

    emit({ type: 'plan', participants: planned, missingInfo, needsInfo: false, planSource });

    // ------------------------------------------------------------ 2. ANÁLISIS
    const analyses = await Promise.all(
      planned.map(async (p): Promise<SpecialistResult> => {
        const spec = getSpecialist(p.id)!;
        const prompt = `TEMA:
${input.topic}

CONTEXTO AUTORIZADO:
${input.context?.trim() || '(sin contexto adicional)'}

TU ÁNGULO EN ESTA REUNIÓN:
${p.angle}

${missingInfo.length ? `Información que se sabe que falta: ${missingInfo.join('; ')}. Trabaja con supuestos explícitos.` : ''}`;
        let result: SpecialistResult;
        try {
          const res = await call({
            system: buildSpecialistSystemPrompt(spec),
            prompt,
            tier: 'strong',
            maxOutputTokens: 700,
          });
          const text = res.text.trim();
          result = text
            ? { id: p.id, name: p.name, role: p.role, status: 'ok', text }
            : { id: p.id, name: p.name, role: p.role, status: 'failed', text: '', error: 'Respuesta vacía.' };
        } catch (err: any) {
          result = {
            id: p.id,
            name: p.name,
            role: p.role,
            status: 'failed',
            text: '',
            error: err instanceof Error ? err.message : 'Error desconocido.',
          };
        }
        emit({ type: 'specialist', result });
        return result;
      })
    );

    const ok = analyses.filter((r) => r.status === 'ok');
    const failed = analyses.filter((r) => r.status === 'failed');
    for (const f of failed) notes.push(`${f.name} (${f.role}) no pudo aportar: ${(f.error || 'error').replace(/\.+$/, '')}.`);

    if (controller.signal.aborted) {
      notes.push('La reunión se detuvo por tiempo agotado o cancelación; no se generó síntesis.');
      return finish({ status: 'stopped', plan: planned, results: analyses });
    }

    if (ok.length === 0) {
      notes.push('Ningún especialista respondió; no se generó síntesis.');
      return finish({ status: 'stopped', plan: planned, results: analyses });
    }

    if (ok.length === 1) {
      notes.push('Solo un especialista respondió; una reunión necesita al menos dos perspectivas, por lo que no se generó síntesis.');
      return finish({ status: 'partial', plan: planned, results: analyses });
    }

    // -------------------------------------------------------------- 3. SÍNTESIS
    const digest = ok.map((r) => `### ${r.name} (${r.role})\n${clip(r.text, 1800)}`).join('\n\n');
    const synthPrompt = `TEMA:
${input.topic}

CONTEXTO AUTORIZADO:
${input.context?.trim() || '(sin contexto adicional)'}

APORTES INDEPENDIENTES DE LOS ESPECIALISTAS:
${digest}
${failed.length ? `\nNO PARTICIPARON (fallaron): ${failed.map((f) => f.name).join(', ')}. No inventes su postura.` : ''}

Integra los aportes. Reglas:
- No repitas lo que ya dijo cada uno; consolida.
- "agreements": solo puntos en los que al menos dos coinciden realmente.
- "disagreements": solo diferencias reales, indicando quién sostiene qué.
- "missingInfo": datos concretos que el usuario debería aportar.
- "nextSteps": acciones concretas con responsable (un especialista o "usuario") y prioridad.
- "confidence": baja/media/alta según cuánta información sólida había.
- "caveats": limitaciones honestas de este análisis.

Devuelve SOLO este JSON:
{"conclusion":"...","agreements":["..."],"disagreements":[{"topic":"...","positions":[{"specialist":"...","position":"..."}]}],"missingInfo":["..."],"nextSteps":[{"action":"...","owner":"...","priority":"alta"}],"confidence":"media","caveats":["..."]}`;

    let synthesis: Synthesis | undefined;
    try {
      const res = await call({
        system: 'Eres el sintetizador de reuniones de APS INTELLIGENCE. Integras posturas sin inventar ni suavizar desacuerdos. Respondes solo JSON válido.',
        prompt: synthPrompt,
        json: true,
        tier: 'strong',
        maxOutputTokens: 1200,
      });
      const parsed = parseJsonLoose(res.text);
      if (parsed && typeof parsed.conclusion === 'string' && parsed.conclusion.trim()) {
        synthesis = {
          conclusion: clip(parsed.conclusion.trim(), 1500),
          agreements: strArray(parsed.agreements),
          disagreements: (Array.isArray(parsed.disagreements) ? parsed.disagreements : [])
            .slice(0, 5)
            .filter((d: any) => typeof d?.topic === 'string')
            .map((d: any) => ({
              topic: clip(d.topic, 200),
              positions: (Array.isArray(d.positions) ? d.positions : [])
                .slice(0, 6)
                .filter((p: any) => typeof p?.specialist === 'string' && typeof p?.position === 'string')
                .map((p: any) => ({ specialist: clip(p.specialist, 60), position: clip(p.position, 300) })),
            })),
          missingInfo: strArray(parsed.missingInfo),
          nextSteps: (Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [])
            .slice(0, 8)
            .filter((n: any) => typeof n?.action === 'string' && n.action.trim())
            .map((n: any) => ({
              action: clip(n.action.trim(), 300),
              owner: typeof n.owner === 'string' && n.owner.trim() ? clip(n.owner.trim(), 60) : 'usuario',
              priority: ['alta', 'media', 'baja'].includes(n.priority) ? n.priority : 'media',
            })),
          confidence: ['baja', 'media', 'alta'].includes(parsed.confidence) ? parsed.confidence : 'media',
          caveats: strArray(parsed.caveats),
        };
      }
    } catch (err: any) {
      if (controller.signal.aborted) {
        notes.push('La síntesis se interrumpió por tiempo agotado o cancelación.');
      } else {
        notes.push(`La síntesis falló: ${err instanceof Error ? err.message : 'error desconocido'}.`);
      }
    }

    if (!synthesis) {
      if (!notes.some((n) => n.startsWith('La síntesis'))) {
        notes.push('La síntesis no tuvo un formato válido; se muestran los aportes individuales sin integrar.');
      }
      return finish({ status: 'partial', plan: planned, results: analyses });
    }

    emit({ type: 'synthesis', synthesis });
    return finish({
      status: failed.length > 0 ? 'partial' : 'completed',
      plan: planned,
      results: analyses,
      synthesis,
    });
  } catch (err: any) {
    notes.push(err instanceof Error ? err.message : 'Error inesperado en la reunión.');
    return finish({ status: 'stopped', plan: [], results: [] });
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onExternalAbort);
  }
}
