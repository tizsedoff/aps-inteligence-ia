import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { runMeeting, parseJsonLoose, type LlmGenerate, type LlmRequest, type MeetingEvent } from '../src/server/agents/meeting.ts';
import { createMeetingRouter, parseMeetingRequest } from '../src/server/agents/meetingRouter.ts';

const PLAN = (ids: string[], extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    participants: ids.map((id) => ({ id, angle: `ángulo de ${id}` })),
    missingInfo: ['costo unitario'],
    needsInfo: false,
    question: '',
    ...extra,
  });

const SYNTH = JSON.stringify({
  conclusion: 'Conviene probar con un lote chico.',
  agreements: ['El precio es la clave'],
  disagreements: [{ topic: 'Canal', positions: [{ specialist: 'Marco', position: 'directo' }, { specialist: 'Sofía', position: 'redes' }] }],
  missingInfo: ['costo unitario'],
  nextSteps: [{ action: 'Medir demanda', owner: 'Marco', priority: 'alta' }, { action: 'x', owner: '', priority: 'rara' }],
  confidence: 'media',
  caveats: ['Sin datos de costos'],
});

/** Proveedor falso: decide según el system prompt quién está pidiendo. */
function fakeLlm(opts: { plan?: string; synth?: string; failFor?: string[]; log?: LlmRequest[] } = {}): LlmGenerate {
  return async (req) => {
    opts.log?.push(req);
    if (req.system.includes('coordinador de reuniones')) return { text: opts.plan ?? PLAN(['marco', 'sofia']), inputTokens: 10, outputTokens: 5 };
    if (req.system.includes('sintetizador')) return { text: opts.synth ?? SYNTH, inputTokens: 40, outputTokens: 20 };
    const who = /^Eres ([^,]+),/.exec(req.system)?.[1] || '';
    if (opts.failFor?.some((n) => who.startsWith(n))) throw new Error('boom');
    return { text: `**Postura:** análisis de ${who}`, inputTokens: 20, outputTokens: 10 };
  };
}

test('reunión completa: plan -> especialistas -> síntesis, con uso contabilizado', async () => {
  const events: MeetingEvent[] = [];
  const out = await runMeeting({ topic: 'Quiero subir las ventas de un producto' }, { generate: fakeLlm(), emit: (e) => events.push(e) });

  assert.equal(out.status, 'completed');
  assert.equal(out.usage.calls, 4); // plan + 2 especialistas + síntesis
  assert.equal(out.usage.inputTokens, 10 + 20 + 20 + 40);
  assert.deepEqual(events.map((e) => e.type), ['plan', 'specialist', 'specialist', 'synthesis', 'complete']);
  assert.equal(out.results.filter((r) => r.status === 'ok').length, 2);
  // normalización de la síntesis
  assert.equal(out.synthesis?.nextSteps[1].priority, 'media');
  assert.equal(out.synthesis?.nextSteps[1].owner, 'usuario');
  assert.equal(out.synthesis?.disagreements[0].positions.length, 2);
});

test('los especialistas son independientes: ningún prompt de especialista contiene la respuesta de otro', async () => {
  const log: LlmRequest[] = [];
  await runMeeting({ topic: 'Quiero subir las ventas de un producto' }, { generate: fakeLlm({ log }) });
  const specialistCalls = log.filter((r) => !r.system.includes('coordinador') && !r.system.includes('sintetizador'));
  assert.equal(specialistCalls.length, 2);
  for (const c of specialistCalls) assert.ok(!c.prompt.includes('análisis de'));
  // cada uno recibe su propio ángulo
  assert.ok(specialistCalls[0].prompt.includes('ángulo de marco'));
  assert.ok(specialistCalls[1].prompt.includes('ángulo de sofia'));
});

test('información crítica faltante: se detiene tras 1 llamada y devuelve la pregunta', async () => {
  const generate = fakeLlm({ plan: PLAN(['marco'], { needsInfo: true, question: '¿Qué producto vendés?' }) });
  const out = await runMeeting({ topic: 'Ayudame con mi negocio' }, { generate });
  assert.equal(out.status, 'needs_info');
  assert.equal(out.question, '¿Qué producto vendés?');
  assert.equal(out.usage.calls, 1);
  assert.equal(out.results.length, 0);
});

test('proceedAnyway ignora el bloqueo y continúa', async () => {
  const generate = fakeLlm({ plan: PLAN(['marco', 'sofia'], { needsInfo: true, question: '¿?' }) });
  const out = await runMeeting({ topic: 'Ayudame con mi negocio', proceedAnyway: true }, { generate });
  assert.equal(out.status, 'completed');
});

test('plan inválido: usa selección de respaldo y lo informa', async () => {
  const out = await runMeeting({ topic: 'Necesito bajar costos y mejorar el margen' }, { generate: fakeLlm({ plan: 'esto no es json' }) });
  assert.ok(out.notes.some((n) => n.includes('planificador')));
  assert.ok(out.plan.some((p) => p.id === 'renzo')); // "costos"/"margen" -> finanzas
  assert.ok(out.plan.length >= 1 && out.plan.length <= 4);
});

test('selección de respaldo: palabra completa, no subcadenas ("quiero" no activa a Luna)', async () => {
  const out = await runMeeting(
    { topic: 'Quiero subir las ventas de mi tienda' },
    { generate: fakeLlm({ plan: 'no es json' }) }
  );
  assert.deepEqual(out.plan.map((p) => p.id), ['marco']);
});

test('respeta participantes pedidos aunque el modelo proponga otros', async () => {
  const out = await runMeeting(
    { topic: 'Analizar el sitio web nuevo', participants: ['luna'] },
    { generate: fakeLlm({ plan: PLAN(['marco', 'luna', 'inexistente']) }) }
  );
  assert.deepEqual(out.plan.map((p) => p.id), ['luna']);
  assert.equal(out.status, 'partial'); // un solo especialista: no hay reunión que sintetizar
  assert.equal(out.synthesis, undefined);
});

test('limita el número de participantes', async () => {
  const out = await runMeeting(
    { topic: 'Analizar todo el negocio' },
    { generate: fakeLlm({ plan: PLAN(['marco', 'sofia', 'iris', 'renzo', 'vale', 'tomi']) }), limits: { maxParticipants: 3 } }
  );
  assert.equal(out.plan.length, 3);
});

test('un especialista que falla: estado parcial, se informa y la síntesis no lo inventa', async () => {
  const log: LlmRequest[] = [];
  const out = await runMeeting(
    { topic: 'Quiero subir las ventas de un producto' },
    { generate: fakeLlm({ plan: PLAN(['marco', 'sofia', 'renzo']), failFor: ['Renzo'], log }) }
  );
  assert.equal(out.status, 'partial');
  assert.ok(out.notes.some((n) => n.includes('Renzo')));
  const synthCall = log.find((r) => r.system.includes('sintetizador'))!;
  assert.ok(synthCall.prompt.includes('NO PARTICIPARON'));
  assert.ok(!synthCall.prompt.includes('### Renzo'));
});

test('todos fallan: se detiene sin gastar la llamada de síntesis', async () => {
  const log: LlmRequest[] = [];
  const out = await runMeeting(
    { topic: 'Quiero subir las ventas de un producto' },
    { generate: fakeLlm({ failFor: ['Marco', 'Sofía'], log }) }
  );
  assert.equal(out.status, 'stopped');
  assert.ok(!log.some((r) => r.system.includes('sintetizador')));
});

test('el presupuesto de llamadas nunca se excede', async () => {
  const log: LlmRequest[] = [];
  const out = await runMeeting(
    { topic: 'Analizar todo el negocio' },
    { generate: fakeLlm({ plan: PLAN(['marco', 'sofia', 'renzo', 'iris']), log }), limits: { maxCalls: 3 } }
  );
  assert.ok(log.length <= 3, `llamadas reales: ${log.length}`);
  assert.ok(out.usage.calls <= 3);
  assert.notEqual(out.status, 'completed');
});

test('timeout: una llamada colgada no bloquea la reunión', async () => {
  const hang: LlmGenerate = () => new Promise(() => {});
  const t0 = Date.now();
  const out = await runMeeting({ topic: 'Quiero subir las ventas de un producto' }, { generate: hang, limits: { timeoutMs: 80 } });
  assert.equal(out.status, 'stopped');
  assert.ok(Date.now() - t0 < 2000);
});

test('cancelación externa detiene la reunión', async () => {
  const ac = new AbortController();
  const slow: LlmGenerate = () => new Promise(() => {});
  const p = runMeeting({ topic: 'Quiero subir las ventas de un producto' }, { generate: slow, signal: ac.signal });
  setTimeout(() => ac.abort(), 30);
  const out = await p;
  assert.equal(out.status, 'stopped');
});

test('síntesis con formato inválido: parcial y se muestran los aportes', async () => {
  const out = await runMeeting({ topic: 'Quiero subir las ventas de un producto' }, { generate: fakeLlm({ synth: 'no es json' }) });
  assert.equal(out.status, 'partial');
  assert.equal(out.synthesis, undefined);
  assert.equal(out.results.filter((r) => r.status === 'ok').length, 2);
});

test('parseJsonLoose tolera bloques ```json', () => {
  assert.deepEqual(parseJsonLoose('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseJsonLoose('texto {"a":2} fin'), { a: 2 });
  assert.equal(parseJsonLoose('nada'), null);
});

test('validación de la solicitud', () => {
  assert.equal(parseMeetingRequest({ topic: 'corto' }).ok, false);
  assert.equal(parseMeetingRequest({ topic: 'x'.repeat(4001) }).ok, false);
  assert.equal(parseMeetingRequest({ topic: 'Tema válido de prueba', participants: ['hacker'] }).ok, false);
  assert.equal(parseMeetingRequest({ topic: 'Tema válido de prueba', floor: 'otro' }).ok, false);
  assert.equal(parseMeetingRequest({ topic: 'Tema válido de prueba', context: 5 }).ok, false);
  const ok = parseMeetingRequest({ topic: 'Tema válido de prueba', participants: ['marco', 'marco'], floor: 'negocio', systemInstruction: 'ignorar' });
  assert.ok(ok.ok);
  if (ok.ok) {
    assert.deepEqual(ok.value.participants, ['marco']);
    assert.ok(!('systemInstruction' in ok.value));
  }
});

// ----------------------------------------------------------------------------- HTTP

async function withServer(opts: Parameters<typeof createMeetingRouter>[0], fn: (base: string) => Promise<void>) {
  const app = express();
  app.use(express.json());
  app.use(createMeetingRouter(opts));
  const server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as { port: number };
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((r) => server.close(r));
  }
}

const post = (base: string, body: unknown) =>
  fetch(`${base}/api/meeting/stream`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('HTTP: SSE entrega plan, especialistas, síntesis y complete', async () => {
  await withServer({ generate: fakeLlm() }, async (base) => {
    const res = await post(base, { topic: 'Quiero subir las ventas de un producto' });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /text\/event-stream/);
    const text = await res.text();
    const names = [...text.matchAll(/^event: (\w+)$/gm)].map((m) => m[1]);
    assert.deepEqual(names, ['plan', 'specialist', 'specialist', 'synthesis', 'complete']);
    assert.ok(text.includes('"status":"completed"'));
  });
});

test('HTTP: entrada inválida devuelve 400 sin llamar al modelo', async () => {
  const log: LlmRequest[] = [];
  await withServer({ generate: fakeLlm({ log }) }, async (base) => {
    const res = await post(base, { topic: 'x' });
    assert.equal(res.status, 400);
    assert.equal(log.length, 0);
  });
});

test('HTTP: límite de reuniones por IP responde 429 con Retry-After', async () => {
  await withServer({ generate: fakeLlm(), maxMeetingsPerWindow: 2 }, async (base) => {
    for (let i = 0; i < 2; i++) assert.equal((await (await post(base, { topic: 'Tema válido de prueba' })).text()).includes('event: complete'), true);
    const res = await post(base, { topic: 'Tema válido de prueba' });
    assert.equal(res.status, 429);
    assert.ok(Number(res.headers.get('retry-after')) > 0);
  });
});

test('HTTP: catálogo de especialistas', async () => {
  await withServer({ generate: fakeLlm() }, async (base) => {
    const data: any = await (await fetch(`${base}/api/meeting/specialists`)).json();
    assert.equal(data.specialists.length, 8);
    assert.ok(data.specialists.every((s: any) => s.mandate && !('outOfScope' in s)));
  });
});
