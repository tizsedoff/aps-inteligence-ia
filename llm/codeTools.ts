// Herramientas que permiten a la IA del CHAT modificar los archivos del espacio CÓDIGO.
// Todo se valida aquí, en el servidor, contra el contenido real de los archivos que envió el
// cliente. La IA nunca escribe directo: propone operaciones y estas funciones las aplican o las
// rechazan con un motivo que se le devuelve al modelo para que corrija.

export interface WorkFile {
  filename: string;
  language: string;
  code: string;
  description?: string;
}

export type ChangeAction = 'created' | 'modified';

export interface AppliedChange {
  filename: string;
  action: ChangeAction;
}

export interface ToolResult {
  ok: boolean;
  message: string;
  change?: AppliedChange;
}

export const MAX_FILE_CHARS = 200_000;
export const MAX_FILES = 40;
export const MAX_TOOL_ROUNDS = 4;
export const MAX_CALLS_PER_ROUND = 10;

// Contexto de archivos que ve el modelo. Un archivo más largo se trunca y NO puede
// reescribirse completo (solo editarse con edit_file sobre texto visible).
export const CONTEXT_PER_FILE = 20_000;
export const CONTEXT_TOTAL = 80_000;

export const LANGUAGE_BY_EXT: Record<string, string> = {
  html: 'html', htm: 'html', css: 'css', js: 'javascript', mjs: 'javascript', ts: 'typescript',
  tsx: 'typescript', jsx: 'javascript', json: 'json', md: 'markdown', py: 'python', txt: 'text',
  svg: 'xml', xml: 'xml', sql: 'sql', sh: 'bash',
};

export function sanitizeFilename(input: unknown): string {
  const base = String(input ?? '').split(/[\\/]/).pop() || '';
  return base.replace(/[^\w.\-]/g, '_').replace(/^\.+/, '').slice(0, 64);
}

function inferLanguage(filename: string, given: unknown): string {
  if (typeof given === 'string' && given.trim()) return given.trim().slice(0, 30);
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return LANGUAGE_BY_EXT[ext] || 'text';
}

/** Texto de archivos para el prompt + qué archivos quedaron truncados. */
export function buildFilesContext(files: WorkFile[]): { text: string; truncated: Set<string> } {
  const truncated = new Set<string>();
  let budget = CONTEXT_TOTAL;
  const parts: string[] = [];
  for (const f of files) {
    const limit = Math.min(CONTEXT_PER_FILE, Math.max(0, budget));
    const visible = f.code.slice(0, limit);
    budget -= visible.length;
    const cut = visible.length < f.code.length;
    if (cut) truncated.add(f.filename);
    parts.push(
      `--- ARCHIVO: ${f.filename} (${f.language})${
        cut ? ` [TRUNCADO: solo ves ${visible.length} de ${f.code.length} caracteres; no lo reescribas completo, usa edit_file]` : ''
      } ---\n${visible}`
    );
  }
  return { text: parts.join('\n\n'), truncated };
}

export const CODE_TOOL_NAMES = ['write_file', 'edit_file'] as const;

/** Declaraciones de funciones para Gemini (esquema OpenAPI con tipos en mayúscula). */
export function getCodeToolDeclarations(Type: Record<string, string>) {
  return [
    {
      name: 'write_file',
      description:
        'Crea un archivo nuevo o reemplaza por completo uno existente en el espacio CÓDIGO del usuario. Úsalo para archivos nuevos o reescrituras grandes. El código debe ir completo, sin marcadores como "// resto igual".',
      parameters: {
        type: Type.OBJECT,
        properties: {
          filename: { type: Type.STRING, description: 'Nombre del archivo, sin carpetas. Ej: index.html' },
          language: { type: Type.STRING, description: 'Lenguaje (html, css, javascript, typescript, python, json…)' },
          code: { type: Type.STRING, description: 'Contenido completo del archivo' },
          description: { type: Type.STRING, description: 'Qué hace el archivo (una frase corta)' },
        },
        required: ['filename', 'code'],
      },
    },
    {
      name: 'edit_file',
      description:
        'Modifica un archivo existente reemplazando un fragmento exacto. old_text debe aparecer EXACTAMENTE una vez en el archivo (cópialo tal cual, con espacios y saltos de línea). Úsalo para cambios puntuales: es más rápido y seguro que reescribir todo.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          filename: { type: Type.STRING, description: 'Archivo existente a modificar' },
          old_text: { type: Type.STRING, description: 'Fragmento exacto a reemplazar (único en el archivo)' },
          new_text: { type: Type.STRING, description: 'Texto nuevo. Puede ser vacío para borrar el fragmento' },
        },
        required: ['filename', 'old_text', 'new_text'],
      },
    },
  ];
}

/**
 * Aplica una llamada a herramienta sobre el conjunto de archivos de trabajo (se muta `work`).
 * Devuelve ok=false con un motivo claro si no se pudo; en ese caso no se cambia nada.
 */
export function applyToolCall(
  work: Map<string, WorkFile>,
  truncated: Set<string>,
  name: string,
  rawArgs: unknown
): ToolResult {
  const args: any = rawArgs && typeof rawArgs === 'object' ? rawArgs : {};

  if (name === 'write_file') {
    const filename = sanitizeFilename(args.filename);
    if (!filename) return { ok: false, message: 'Falta un nombre de archivo válido.' };
    if (typeof args.code !== 'string' || args.code.length === 0) {
      return { ok: false, message: 'El código está vacío. Envía el contenido completo del archivo.' };
    }
    if (args.code.length > MAX_FILE_CHARS) {
      return { ok: false, message: `El archivo supera el máximo de ${MAX_FILE_CHARS} caracteres. Divídelo en varios archivos.` };
    }
    const existing = work.get(filename);
    if (existing && truncated.has(filename)) {
      return {
        ok: false,
        message: `${filename} es largo y solo viste una parte: no se puede reescribir completo. Usa edit_file sobre texto que veas.`,
      };
    }
    if (!existing && work.size >= MAX_FILES) {
      return { ok: false, message: `Se alcanzó el máximo de ${MAX_FILES} archivos.` };
    }
    work.set(filename, {
      filename,
      language: inferLanguage(filename, args.language ?? existing?.language),
      code: args.code,
      description:
        typeof args.description === 'string' && args.description.trim()
          ? args.description.trim().slice(0, 300)
          : existing?.description,
    });
    return {
      ok: true,
      message: `${existing ? 'Reemplazado' : 'Creado'} ${filename} (${args.code.length} caracteres).`,
      change: { filename, action: existing ? 'modified' : 'created' },
    };
  }

  if (name === 'edit_file') {
    const filename = sanitizeFilename(args.filename);
    const file = work.get(filename);
    if (!file) {
      return { ok: false, message: `No existe el archivo ${filename || '(sin nombre)'}. Archivos: ${[...work.keys()].join(', ') || 'ninguno'}.` };
    }
    if (typeof args.old_text !== 'string' || args.old_text.length === 0) {
      return { ok: false, message: 'old_text está vacío. Indica el fragmento exacto a reemplazar.' };
    }
    if (typeof args.new_text !== 'string') {
      return { ok: false, message: 'Falta new_text (puede ser una cadena vacía).' };
    }
    const first = file.code.indexOf(args.old_text);
    if (first === -1) {
      return { ok: false, message: `old_text no se encontró en ${filename}. Cópialo exactamente del archivo actual (espacios y saltos de línea incluidos).` };
    }
    if (file.code.indexOf(args.old_text, first + 1) !== -1) {
      return { ok: false, message: `old_text aparece más de una vez en ${filename}. Incluye más contexto para que sea único.` };
    }
    const next = file.code.slice(0, first) + args.new_text + file.code.slice(first + args.old_text.length);
    if (next.length > MAX_FILE_CHARS) {
      return { ok: false, message: `El resultado superaría ${MAX_FILE_CHARS} caracteres.` };
    }
    work.set(filename, { ...file, code: next });
    return { ok: true, message: `Editado ${filename}.`, change: { filename, action: 'modified' } };
  }

  return { ok: false, message: `Herramienta desconocida: ${name}.` };
}
