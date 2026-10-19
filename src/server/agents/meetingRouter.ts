// Endpoints de reunión grupal.
//   GET  /api/meeting/specialists  -> catálogo de especialistas y pisos
//   POST /api/meeting/stream       -> ejecuta una reunión y la transmite por SSE
//
// Protección de costo (la reunión hace hasta 6 llamadas al modelo):
//   - validación estricta de entrada (la instrucción de sistema NUNCA viene del cliente)
//   - tope de reuniones por IP en una ventana de tiempo y de reuniones simultáneas
// LIMITACIÓN CONOCIDA: los contadores viven en memoria de cada instancia. En serverless (Vercel)
// cada instancia tiene los suyos; el control real por usuario requiere autenticación verificada
// en el servidor (token de Firebase) y contadores persistentes.

import express from 'express';
import type { Request, Response, Router } from 'express';
import { FLOORS, SPECIALISTS, isSpecialistId, type FloorId } from './specialists.ts';
import { runMeeting, type LlmGenerate, type MeetingEvent, type MeetingLimits } from './meeting.ts';

export interface MeetingRouterOptions {
  generate: LlmGenerate;
  limits?: Partial<MeetingLimits>;
  maxMeetingsPerWindow?: number;
  windowMs?: number;
  maxConcurrent?: number;
}

const MAX_TOPIC = 4000;
const MIN_TOPIC = 8;
const MAX_CONTEXT = 6000;

export type ParsedMeetingRequest =
  | { ok: true; value: { topic: string; context?: string; participants?: string[]; floor?: FloorId; proceedAnyway: boolean } }
  | { ok: false; error: string };

export function parseMeetingRequest(body: any): ParsedMeetingRequest {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Solicitud inválida.' };

  const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
  if (topic.length < MIN_TOPIC) return { ok: false, error: 'Describe el tema de la reunión (mínimo 8 caracteres).' };
  if (topic.length > MAX_TOPIC) return { ok: false, error: `El tema es demasiado largo (máximo ${MAX_TOPIC} caracteres).` };

  let context: string | undefined;
  if (body.context !== undefined && body.context !== null && body.context !== '') {
    if (typeof body.context !== 'string') return { ok: false, error: 'El contexto debe ser texto.' };
    if (body.context.length > MAX_CONTEXT) return { ok: false, error: `El contexto es demasiado largo (máximo ${MAX_CONTEXT} caracteres).` };
    context = body.context.trim() || undefined;
  }

  let participants: string[] | undefined;
  if (body.participants !== undefined && body.participants !== null) {
    if (!Array.isArray(body.participants) || body.participants.length > 8) {
      return { ok: false, error: 'La lista de participantes es inválida.' };
    }
    const unknown = body.participants.filter((p: unknown) => !isSpecialistId(p));
    if (unknown.length) return { ok: false, error: 'Hay participantes que no existen.' };
    participants = Array.from(new Set<string>(body.participants));
  }

  let floor: FloorId | undefined;
  if (body.floor !== undefined && body.floor !== null && body.floor !== '') {
    if (typeof body.floor !== 'string' || !(body.floor in FLOORS)) return { ok: false, error: 'El piso indicado no existe.' };
    floor = body.floor as FloorId;
  }

  return { ok: true, value: { topic, context, participants, floor, proceedAnyway: body.proceedAnyway === true } };
}

function clientKey(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  const first = Array.isArray(fwd) ? fwd[0] : fwd?.split(',')[0];
  return (first || req.ip || req.socket.remoteAddress || 'unknown').trim();
}

export function createMeetingRouter(options: MeetingRouterOptions): Router {
  const router = express.Router();
  const maxPerWindow = options.maxMeetingsPerWindow ?? 6;
  const windowMs = options.windowMs ?? 10 * 60_000;
  const maxConcurrent = options.maxConcurrent ?? 4;

  const hits = new Map<string, number[]>();
  let active = 0;

  router.get(['/api/meeting/specialists', '/meeting/specialists'], (_req: Request, res: Response) => {
    res.json({
      floors: Object.values(FLOORS),
      specialists: SPECIALISTS.map(({ id, name, floor, role, mandate }) => ({ id, name, floor, role, mandate })),
    });
  });

  router.post(['/api/meeting/stream', '/meeting/stream'], async (req: Request, res: Response) => {
    const parsed = parseMeetingRequest(req.body);
    if (!parsed.ok) {
      res.status(400).json({ success: false, error: parsed.error });
      return;
    }

    // Límite por IP (ventana deslizante) y por concurrencia.
    const key = clientKey(req);
    const nowMs = Date.now();
    const recent = (hits.get(key) || []).filter((t) => nowMs - t < windowMs);
    if (recent.length >= maxPerWindow) {
      const retryAfter = Math.ceil((windowMs - (nowMs - recent[0])) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({
        success: false,
        error: `Alcanzaste el límite de reuniones (${maxPerWindow} cada ${Math.round(windowMs / 60_000)} minutos). Intenta de nuevo en ${Math.ceil(retryAfter / 60)} min.`,
      });
      return;
    }
    if (active >= maxConcurrent) {
      res.setHeader('Retry-After', '15');
      res.status(503).json({ success: false, error: 'Hay muchas reuniones en curso. Reintenta en unos segundos.' });
      return;
    }
    recent.push(nowMs);
    hits.set(key, recent);
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (v.every((t) => nowMs - t >= windowMs)) hits.delete(k);
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const abort = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) abort.abort(new Error('cancelled'));
    });

    const send = (event: string, data: unknown) => {
      if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    active += 1;
    try {
      await runMeeting(parsed.value, {
        generate: options.generate,
        limits: options.limits,
        signal: abort.signal,
        emit: (e: MeetingEvent) => {
          switch (e.type) {
            case 'plan':
              send('plan', e);
              break;
            case 'specialist':
              send('specialist', e.result);
              break;
            case 'synthesis':
              send('synthesis', e.synthesis);
              break;
            case 'complete':
              send('complete', { status: e.status, usage: e.usage, notes: e.notes });
              break;
          }
        },
      });
    } catch (error: any) {
      console.error('Meeting error:', error);
      send('error', { message: 'No se pudo completar la reunión. Intenta de nuevo.' });
    } finally {
      active -= 1;
      res.end();
    }
  });

  return router;
}
