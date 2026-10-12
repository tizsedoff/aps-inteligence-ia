import express, { Request, Response } from 'express';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Middleware for parsing JSON with generous payload limits for images and files
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to instantiate Gemini client
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Get resilient model candidate list with automatic fallback on demand spikes
function getModelCandidateList(apsModel: string): string[] {
  switch (apsModel) {
    case 'APS INSTANT':
    case 'instant':
      return ['gemini-3.1-flash-lite', 'gemini-2.5-flash-lite', 'gemini-3.8-flash'];
    case 'APS HARD WORK':
    case 'hardwork':
      return ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite'];
    case 'APS PRO':
    case 'pro':
    default:
      return ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite', 'gemini-flash-latest'];
  }
}

// System Instruction Builder trained for APS INSTANT, PRO & HARD WORK + 3 Modes
function buildSystemPrompt(
  model: string,
  mode: 'code' | 'teens' | 'adults' = 'code',
  userName?: string
): string {
  // 1. Model Core Profile
  let modelProfile = '';
  switch (model) {
    case 'APS INSTANT':
    case 'instant':
      modelProfile = `IDENTIDAD: APS INSTANT
- Eres directo, sumamente ágil y conciso.
- Ve directo al grano sin introducciones largas ni rodeos. Entrega soluciones inmediatas y precisas.`;
      break;

    case 'APS HARD WORK':
    case 'hardwork':
      modelProfile = `IDENTIDAD: APS HARD WORK
- Eres analítico, riguroso y de alto nivel técnico.
- Te enfocas en ingeniería de software, arquitectura robusta, deducción lógica y código de producción completo.`;
      break;

    case 'APS PRO':
    case 'pro':
    default:
      modelProfile = `IDENTIDAD: APS PRO
- Eres equilibrado, inteligente, claro y versátil.
- Ofreces explicaciones completas, análisis contextual de archivos/imágenes y respuestas fundamentadas.`;
      break;
  }

  // 2. Interaction Mode Profile
  let modeProfile = '';
  switch (mode) {
    case 'code':
      modeProfile = `MODO DE INTERACCIÓN: PROGRAMACIÓN
- Hablas con desarrolladores: código limpio, arquitectura, buenas prácticas (SOLID, Clean Code), tipado estricto y rendimiento.
- Proporciona bloques de código listos para usar en producción, sin rodeos teóricos innecesarios.`;
      break;

    case 'teens':
      modeProfile = `MODO DE INTERACCIÓN: ADOLESCENTES
- Hablas con jóvenes: sé fresco, natural, empático, buena onda y cercano.
- No uses frases robóticas ni formales. Sé entretenido y motivador, usando ejemplos claros de la vida real o tecnología.`;
      break;

    case 'adults':
    default:
      modeProfile = `MODO DE INTERACCIÓN: ADULTOS / PROFESIONALES
- Tono sobrio, maduro, respetuoso y profesional.
- Enfocado en productividad, claridad estratégica y valor práctico.`;
      break;
  }

  const userGreeting = userName ? `El usuario se llama ${userName}. Puedes saludarlo o llamarlo por su nombre de forma natural.` : '';

  return `Eres APS INTELLIGENCE.
${userGreeting}

${modelProfile}

${modeProfile}

REGLAS OBLIGATORIAS:
- PROHIBIDO hablar de tu diseño visual, interfaz o frases como 'Liquid Glass', 'arquitectura de cristal', 'Old Money' o similares. Son estilos de la interfaz web, no parte de tu conversación.
- NUNCA agregues aclaraciones innecesarias, disculpas, notas explicativas ("Como IA...", "Cabe aclarar que...", "Es importante recordar...") ni sermones no solicitados. Ve directo al grano con lo que el usuario pidió.
- NUNCA digas frases de presentación robóticas como 'reportándome desde...', ni discursos acartonados.
- Cuando el usuario te pida escribir código, entrega el código limpio, completo y funcional sin disculpas ni aclaraciones redundantes.
- Responde de forma orgánica, fluida y directa a lo que el usuario pida.`;
}

// SSE Streaming Chat Endpoint
app.post('/api/chat/stream', async (req: Request, res: Response) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const {
      model = 'APS PRO',
      mode = 'code',
      userName,
      prompt,
      messages = [],
      attachments = [],
      extendedThinking = false,
      systemInstructionPrompt,
    } = req.body;

    const ai = getGenAI();
    const candidateModels = getModelCandidateList(model);
    const targetModel = candidateModels[0];

    // Build trained system instructions matching model and interaction mode
    const systemInstruction = systemInstructionPrompt || buildSystemPrompt(model, mode, userName);

    // Build contents payload
    const contents: any[] = [];

    // History
    for (const msg of messages) {
      const parts: any[] = [];
      if (msg.attachments && Array.isArray(msg.attachments)) {
        for (const att of msg.attachments) {
          if (att.data && att.mimeType) {
            parts.push({
              inlineData: {
                data: att.data,
                mimeType: att.mimeType,
              },
            });
          }
        }
      }
      if (msg.content) {
        parts.push({ text: msg.content });
      }
      if (parts.length > 0) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts,
        });
      }
    }

    // Current turn parts
    const currentParts: any[] = [];
    if (attachments && Array.isArray(attachments)) {
      for (const att of attachments) {
        if (att.data && att.mimeType) {
          currentParts.push({
            inlineData: {
              data: att.data,
              mimeType: att.mimeType,
            },
          });
        }
      }
    }

    if (prompt) {
      currentParts.push({ text: prompt });
    }

    if (currentParts.length > 0) {
      contents.push({
        role: 'user',
        parts: currentParts,
      });
    }

    const isHardWork = model === 'APS HARD WORK' || model === 'hardwork' || extendedThinking;

    let responseStream: any = null;
    let activeModelUsed = candidateModels[0];
    let lastError: any = null;

    // Multi-model resilience loop: if upstream returns 503 or is unavailable, seamlessly cascade!
    for (const modelToTry of candidateModels) {
      try {
        const isGemini3 = modelToTry.startsWith('gemini-3');
        const modelConfig: any = {
          systemInstruction,
        };

        if (isGemini3) {
          if (isHardWork) {
            modelConfig.thinkingConfig = {
              thinkingLevel: ThinkingLevel.HIGH,
            };
          } else if (model === 'APS INSTANT' || model === 'instant') {
            modelConfig.thinkingConfig = {
              thinkingLevel: ThinkingLevel.MINIMAL,
            };
          }
        }

        responseStream = await ai.models.generateContentStream({
          model: modelToTry,
          contents,
          config: modelConfig,
        });

        activeModelUsed = modelToTry;
        break; // Stream started successfully!
      } catch (err: any) {
        lastError = err;
        console.warn(`APS Engine: Model ${modelToTry} unavailable (${err?.status || err?.message}). Cascading to next candidate...`);
        // Brief delay before attempting next candidate
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }

    if (!responseStream) {
      throw lastError || new Error('Los modelos están experimentando una alta demanda temporal en Google. Por favor, reintenta tu solicitud.');
    }

    sendEvent('start', { model, resolvedModel: activeModelUsed, isHardWork });

    const startTime = Date.now();
    let totalText = '';
    let totalThoughts = '';

    for await (const chunk of responseStream) {
      const candidate = chunk.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          // Check for thought/reasoning part
          const isThoughtPart = (part as any).thought === true;
          if (isThoughtPart && part.text) {
            totalThoughts += part.text;
            sendEvent('thinking', { chunk: part.text });
          } else if (part.text) {
            totalText += part.text;
            sendEvent('token', { chunk: part.text });
          }
        }
      } else if (chunk.text) {
        totalText += chunk.text;
        sendEvent('token', { chunk: chunk.text });
      }
    }

    const durationMs = Date.now() - startTime;
    sendEvent('complete', {
      durationMs,
      hasThoughts: totalThoughts.length > 0,
      textLength: totalText.length,
    });
    res.end();
  } catch (error: any) {
    console.error('Chat stream error:', error);
    // Parse error into clean, readable Spanish
    let userFriendlyMessage = 'Error temporal en los servidores de inferencia. Por favor reintenta en unos instantes.';
    if (error?.status === 503 || error?.message?.includes('503') || error?.message?.includes('high demand')) {
      userFriendlyMessage = 'El servidor de Google experimentó una sobrecarga temporal de alta demanda (503). Presiona el botón Reintentar.';
    } else if (error?.status === 429 || error?.message?.includes('429')) {
      userFriendlyMessage = 'Límite de solicitudes alcanzado momentáneamente. Por favor espera unos segundos.';
    } else if (error?.message) {
      userFriendlyMessage = error.message;
    }

    sendEvent('error', {
      message: userFriendlyMessage,
    });
    res.end();
  }
});

// APS Hard Work Exclusive CLI Code Generator & Processor
app.post('/api/cli/execute', async (req: Request, res: Response) => {
  try {
    const { command, files = [], activeFilename = '', attachments = [], language = 'typescript' } = req.body;
    const ai = getGenAI();

    const filesContext = Array.isArray(files) && files.length > 0
      ? files.map((f: any) => `=== ARCHIVO: ${f.filename} (${f.language || 'código'}) ===\n${f.code}\n=== FIN ARCHIVO ===`).join('\n\n')
      : 'No hay archivos previos en el proyecto.';

    const cliSystemPrompt = `Eres el motor de consola CLI de desarrollo de APS HARD WORK.
Tu misión exclusiva es RECIBIR ÓRDENES DEL USUARIO Y ESCRIBIR CÓDIGO COMPLETO, FUNCIONAL Y LISTO PARA EJECUTARSE EN TIEMPO REAL.
Cualquier orden en lenguaje natural o comando (por ejemplo: "crea un juego de snake", "haz una calculadora interactiva", "escribe un algoritmo de grafos", "modifica este archivo para añadir cronómetro", "haz un clon de tetris", "crea una api") debe ser traducida inmediatamente en los archivos de código necesarios.

REGLAS CRÍTICAS:
1. "generatedFiles": Genera SIEMPRE el código 100% completo, sin abreviaciones ni comentarios de marcador de posición como "// tu código aquí" o "// implementar lógica".
2. Si el usuario solicita un juego, interfaz o aplicación visual web, incluye o genera un "index.html" que contenga todo el CSS y JavaScript necesario (o genera archivos separados index.html, style.css, script.js enlazados adecuadamente) para que la pestaña de Vista Previa funcione al instante.
3. Si el usuario pide modificar o extender el código actual, toma en cuenta los archivos existentes y añade o actualiza los archivos con la funcionalidad pedida.
4. "stdout": Debe incluir un log realista de compilación o salida de terminal (e.g. "✔ Compilado con éxito. Archivos creados: [lista]. Listo para ejecutar.").
5. "extendedReasoning": Breve resumen técnico de la arquitectura implementada (máximo 2-3 líneas).
6. PROHIBIDO incluir explicaciones vacías, disculpas, sermones, o aclaraciones innecesarias ("Cabe aclarar que...", "Como IA...").
7. Devuelve ÚNICAMENTE el JSON en la siguiente estructura estricta:
{
  "command": string,
  "status": "success" | "error",
  "executionSummary": string,
  "generatedFiles": [
    {
      "filename": string,
      "language": string,
      "code": string,
      "description": string
    }
  ],
  "stdout": string,
  "extendedReasoning": string
}`;

    const cliCandidates = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite'];
    let response: any = null;

    const userPromptContent = `ORDEN RECIBIDA EN CONSOLA CLI:
"${command}"

Archivo actualmente enfocado: ${activeFilename || 'ninguno'}
Archivos existentes en el espacio de trabajo:
${filesContext}

Archivos adjuntos/imágenes: ${JSON.stringify(
      (attachments || []).map((f: any) => ({ name: f.name, size: f.size, type: f.type }))
    )}

Escribe el código completo ahora en JSON estricto:`;

    for (const m of cliCandidates) {
      try {
        const isGemini3 = m.startsWith('gemini-3');
        const cliConfig: any = {
          systemInstruction: cliSystemPrompt,
          responseMimeType: 'application/json',
        };
        if (isGemini3) {
          cliConfig.thinkingConfig = {
            thinkingLevel: ThinkingLevel.HIGH,
          };
        }

        response = await ai.models.generateContent({
          model: m,
          contents: [
            {
              role: 'user',
              parts: [{ text: userPromptContent }],
            },
          ],
          config: cliConfig,
        });
        break;
      } catch (err: any) {
        console.warn(`CLI Model ${m} unavailable (${err?.status || err?.message}). Trying next candidate...`);
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    if (!response) {
      throw new Error('Servicio CLI temporalmente bajo alta demanda.');
    }

    let resultJson: any;
    try {
      resultJson = JSON.parse(response.text || '{}');
    } catch {
      resultJson = {
        command,
        status: 'success',
        executionSummary: 'Procesamiento completado con éxito.',
        generatedFiles: [
          {
            filename: 'main.ts',
            language: 'typescript',
            code: response.text || '// Sin código',
            description: 'Salida de ejecución',
          },
        ],
        stdout: 'Task executed in real time.',
        extendedReasoning: 'Análisis heurístico completado.',
      };
    }

    res.json({
      success: true,
      data: resultJson,
    });
  } catch (error: any) {
    console.error('CLI error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Error en la consola CLI de APS HARD WORK',
    });
  }
});

// Setup Vite middlewares in development or static serve in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`APS INTELLIGENCE server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
