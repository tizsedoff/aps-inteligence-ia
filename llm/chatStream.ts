import {
  AppliedChange,
  MAX_CALLS_PER_ROUND,
  MAX_TOOL_ROUNDS,
  WorkFile,
  applyToolCall,
  getCodeToolDeclarations,
} from './codeTools.ts';

type Send = (event: string, data: any) => void;

export interface ChatRunOptions {
  ai: any; // cliente de @google/genai (inyectable para pruebas)
  Type: Record<string, string>;
  candidates: string[];
  makeConfig: (modelName: string) => any;
  contents: any[];
  /** Archivos actuales del espacio CÓDIGO. null = el chat no puede editar código. */
  files: WorkFile[] | null;
  truncated: Set<string>;
  send: Send;
  meta: { model: string; isHardWork: boolean };
}

export interface ChatRunResult {
  totalText: string;
  totalThoughts: string;
  resolvedModel: string;
  changes: AppliedChange[];
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runChatWithTools(opts: ChatRunOptions): Promise<ChatRunResult> {
  const { ai, Type, candidates, makeConfig, files, truncated, send, meta } = opts;
  const contents = [...opts.contents];
  const toolsEnabled = Array.isArray(files);
  const tools = toolsEnabled ? [{ functionDeclarations: getCodeToolDeclarations(Type) }] : undefined;

  // Archivos de trabajo del turno: parten de lo que envió el cliente y acumulan los cambios.
  const work = new Map<string, WorkFile>((files || []).map((f) => [f.filename, { ...f }]));
  const originalNames = new Set(work.keys());
  const changeActions = new Map<string, AppliedChange['action']>();

  let preferred = 0;
  let resolvedModel = candidates[0];
  let totalText = '';
  let totalThoughts = '';
  let started = false;

  const startStream = async () => {
    let lastError: any = null;
    for (let i = preferred; i < candidates.length; i++) {
      const modelName = candidates[i];
      try {
        const config = makeConfig(modelName);
        if (tools) config.tools = tools;
        const stream = await ai.models.generateContentStream({ model: modelName, contents, config });
        preferred = i;
        resolvedModel = modelName;
        return stream;
      } catch (err: any) {
        lastError = err;
        console.warn(`APS Engine: Model ${modelName} unavailable (${err?.status || err?.message}). Cascading to next candidate...`);
        await wait(400);
      }
    }
    throw lastError || new Error('Los modelos están experimentando una alta demanda temporal en Google. Por favor, reintenta tu solicitud.');
  };

  const maxRounds = toolsEnabled ? MAX_TOOL_ROUNDS : 1;
  for (let round = 1; round <= maxRounds; round++) {
    const stream = await startStream();
    if (!started) {
      started = true;
      send('start', { model: meta.model, resolvedModel, isHardWork: meta.isHardWork });
    }

    const calls: { id?: string; name: string; args: any }[] = [];
    const modelParts: any[] = [];

    for await (const chunk of stream) {
      const candidate = chunk.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if ((part as any).thought === true) {
            if (part.text) {
              totalThoughts += part.text;
              send('thinking', { chunk: part.text });
            }
            continue;
          }
          if (part.functionCall) {
            calls.push({ id: part.functionCall.id, name: part.functionCall.name, args: part.functionCall.args });
            modelParts.push(part);
          } else if (part.text) {
            totalText += part.text;
            send('token', { chunk: part.text });
            modelParts.push(part);
          }
        }
      } else if (chunk.text) {
        totalText += chunk.text;
        send('token', { chunk: chunk.text });
        modelParts.push({ text: chunk.text });
      }
    }

    if (calls.length === 0) break;

    // Aplicar las operaciones propuestas (validadas) y devolver el resultado al modelo
    const results = calls.map((call, idx) =>
      idx >= MAX_CALLS_PER_ROUND
        ? { ok: false, message: `Demasiadas operaciones a la vez (máximo ${MAX_CALLS_PER_ROUND}). Envía el resto en otro paso.` }
        : applyToolCall(work, truncated, call.name, call.args)
    );

    const changedNames = new Set<string>();
    results.forEach((r) => {
      if (r.ok && r.change) {
        changedNames.add(r.change.filename);
        // Un archivo creado en este turno sigue contando como "creado" aunque luego se edite
        if (!changeActions.has(r.change.filename)) {
          changeActions.set(r.change.filename, originalNames.has(r.change.filename) ? 'modified' : 'created');
        }
      }
    });
    if (changedNames.size > 0) {
      send('code_changes', {
        files: [...changedNames].map((n) => {
          const f = work.get(n)!;
          return { filename: f.filename, language: f.language, code: f.code, description: f.description || '' };
        }),
        changes: [...changedNames].map((n) => ({ filename: n, action: changeActions.get(n) })),
      });
    }

    if (round === maxRounds) {
      const note = '\n\n_(Se alcanzó el límite de pasos de edición para este mensaje.)_';
      totalText += note;
      send('token', { chunk: note });
      break;
    }

    contents.push({ role: 'model', parts: modelParts });
    contents.push({
      role: 'user',
      parts: calls.map((call, idx) => ({
        functionResponse: {
          ...(call.id ? { id: call.id } : {}),
          name: call.name,
          response: { ok: results[idx].ok, message: results[idx].message },
        },
      })),
    });
  }

  return {
    totalText,
    totalThoughts,
    resolvedModel,
    changes: [...changeActions.entries()].map(([filename, action]) => ({ filename, action })),
  };
}
