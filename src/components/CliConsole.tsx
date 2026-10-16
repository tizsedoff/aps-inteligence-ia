import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CliFile, CliExecutionResult, Attachment, UserAccount } from '../types';
import { canUserAccessHardWork, isUserQuotaExceeded, getUserPlan } from '../constants/plans';
import {
  Play,
  Download,
  Copy,
  Check,
  Sparkles,
  Paperclip,
  FileCode,
  Eye,
  RefreshCw,
  X,
  Code2,
  Brain,
  Maximize2,
  Minimize2,
  Monitor,
  Tablet,
  Smartphone,
  MessageSquare,
  Plus,
  ArrowUp,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Info,
} from 'lucide-react';

// Helper to construct fully bundled and self-contained preview HTML for multi-file projects
function buildCombinedPreviewHtml(allFiles: CliFile[], activeFile?: CliFile): string {
  const isActiveHtml = Boolean(
    activeFile &&
      (activeFile.filename.endsWith('.html') ||
        activeFile.code.includes('<!DOCTYPE') ||
        activeFile.code.includes('<html') ||
        activeFile.code.includes('<body') ||
        activeFile.code.includes('<canvas') ||
        activeFile.code.includes('<div'))
  );

  const htmlFile = isActiveHtml
    ? activeFile
    : allFiles.find((f) => f.filename.endsWith('.html') || f.filename === 'index.html') ||
      (activeFile && activeFile.filename.endsWith('.html') ? activeFile : null);

  if (htmlFile) {
    let combined = htmlFile.code;

    // Collect all CSS files
    const cssFiles = allFiles.filter(
      (f) => f.filename.endsWith('.css') && f.filename !== htmlFile.filename
    );
    if (cssFiles.length > 0) {
      const stylesBundle = cssFiles.map((c) => `/* File: ${c.filename} */\n${c.code}`).join('\n\n');
      if (combined.includes('</head>')) {
        combined = combined.replace('</head>', `<style>\n${stylesBundle}\n</style>\n</head>`);
      } else {
        combined = `<style>\n${stylesBundle}\n</style>\n` + combined;
      }
    }

    // Collect all JS/TS files
    const jsFiles = allFiles.filter(
      (f) =>
        (f.filename.endsWith('.js') || f.filename.endsWith('.ts')) &&
        !f.filename.endsWith('.d.ts') &&
        f.filename !== htmlFile.filename
    );
    if (jsFiles.length > 0) {
      const scriptsBundle = jsFiles
        .map((j) => {
          // Strip basic TS types and exports for browser sandbox
          const cleaned = j.code
            .replace(/export\s+default\s+/g, '')
            .replace(/export\s+(const|let|var|function|class|async)\s+/g, '$1 ')
            .replace(/export\s*\{[\s\S]*?\};?/g, '')
            .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '')
            .replace(/import\s+['"][^'"]+['"];?/g, '');
          return `// File: ${j.filename}\n${cleaned}`;
        })
        .join('\n\n');

      if (combined.includes('</body>')) {
        combined = combined.replace('</body>', `<script>\n${scriptsBundle}\n</script>\n</body>`);
      } else {
        combined = combined + `\n<script>\n${scriptsBundle}\n</script>`;
      }
    }

    return combined;
  }

  // Fallback interactive playground view for JS/TS/other code
  const codeToDisplay = activeFile?.code || '// Sin código';
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Vista Previa APS</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f1115; color: #e8eaed; padding: 24px; margin: 0; }
    h2 { color: #ffffff; border-bottom: 1px solid #2a2f3a; padding-bottom: 10px; font-size: 1.1rem; }
    p { color: #9aa3b2; font-size: 0.85rem; }
    pre { background: #161a22; border: 1px solid #2a2f3a; padding: 16px; border-radius: 8px; color: #d6deeb; overflow: auto; font-size: 0.8rem; font-family: monospace; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h2>${activeFile?.filename || 'archivo'}</h2>
  <p>Este archivo no es una página web, así que se muestra su código. Usa «Ejecutar» en la pestaña Código para correrlo.</p>
  <pre>${codeToDisplay.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body>
</html>`;
}

type LogItem = {
  type: 'input' | 'stdout' | 'stderr' | 'system' | 'thinking';
  text: string;
  time: string;
};

type Viewport = 'full' | 'tablet' | 'mobile';

const EXAMPLE_PROMPTS = [
  { title: 'Juego de Snake', desc: 'Clásico, con canvas y puntaje', cmd: 'Crea un juego de Snake en HTML con Canvas' },
  { title: 'Calculadora', desc: 'Interactiva y elegante', cmd: 'Haz una calculadora interactiva y elegante' },
  { title: 'App de notas', desc: 'Guarda tus notas en el navegador', cmd: 'Crea una app de notas con localStorage' },
  { title: 'Cronómetro', desc: 'Con vueltas y reinicio', cmd: 'Crea un cronómetro interactivo con vueltas' },
];

const FOLLOW_UPS = [
  'Mejora el diseño visual',
  'Hazlo responsive para celular',
  'Agrega animaciones suaves',
  'Cambia la paleta de colores',
];

/** Una entrada del historial, mostrada como conversación en lugar de log de terminal. */
const LogEntry: React.FC<{ log: LogItem }> = ({ log }) => {
  const text = log.text;

  if (log.type === 'input') {
    const clean = text.replace(/^aps@hardwork:~\$\s*/, '');
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[90%] break-words rounded-2xl rounded-br-md border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/15 px-3.5 py-2 text-[13px] leading-snug text-[color:var(--text-primary)]"
          title={log.time}
        >
          {clean}
        </div>
      </div>
    );
  }

  if (log.type === 'stderr') {
    return (
      <div className="flex gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-[13px] text-red-300">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 whitespace-pre-wrap break-words">{text}</div>
      </div>
    );
  }

  if (log.type === 'stdout') {
    return (
      <div className="rounded-xl border border-white/10 bg-[color:var(--surface-0)] px-3 py-2.5">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">
          Resultado
        </div>
        <pre className="whitespace-pre-wrap break-words font-mono-code text-xs leading-relaxed text-[color:var(--text-primary)]">
          {text}
        </pre>
      </div>
    );
  }

  if (log.type === 'thinking') {
    // El aviso genérico "Procesando..." ya lo cubre el indicador de progreso.
    if (!text.startsWith('Razonamiento:')) return null;
    return (
      <details className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-[color:var(--text-secondary)]">
        <summary className="flex cursor-pointer select-none items-center gap-1.5 font-medium">
          <Brain className="h-3.5 w-3.5 text-[color:var(--accent)]" />
          Ver cómo lo pensó la IA
        </summary>
        <div className="mt-2 whitespace-pre-wrap leading-relaxed">
          {text.replace(/^Razonamiento:\s*/, '')}
        </div>
      </details>
    );
  }

  // system
  const ok = text.startsWith('✔');
  const fail = text.startsWith('✖');
  const bolt = text.startsWith('⚡');
  const body = text.replace(/^[✔✖⚡]\s*/, '');

  if (body.includes('\n')) {
    return (
      <div className="rounded-xl border border-white/10 bg-[color:var(--surface-0)] px-3 py-2.5">
        <pre className="whitespace-pre-wrap break-words font-mono-code text-xs leading-relaxed text-[color:var(--text-secondary)]">
          {body}
        </pre>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-2 px-1 text-[13px] leading-snug ${
        fail ? 'text-red-300' : 'text-[color:var(--text-secondary)]'
      }`}
    >
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
      ) : fail ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      ) : bolt ? (
        <Zap className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--accent)]" />
      ) : (
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
      )}
      <span className="min-w-0 break-words">{body}</span>
    </div>
  );
};

/** Selector de tamaño de pantalla (escritorio / tablet / móvil). */
const ViewportSwitch: React.FC<{ value: Viewport; onChange: (v: Viewport) => void }> = ({
  value,
  onChange,
}) => {
  const options: { id: Viewport; label: string; icon: React.ReactNode }[] = [
    { id: 'full', label: 'Escritorio', icon: <Monitor className="h-3.5 w-3.5" /> },
    { id: 'tablet', label: 'Tablet', icon: <Tablet className="h-3.5 w-3.5" /> },
    { id: 'mobile', label: 'Móvil', icon: <Smartphone className="h-3.5 w-3.5" /> },
  ];
  return (
    <div className="flex items-center rounded-lg border border-white/10 bg-[color:var(--surface-0)] p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          title={`Ver como ${o.label.toLowerCase()}`}
          aria-label={o.label}
          className={`flex items-center rounded-md px-2 py-1 transition-colors ${
            value === o.id
              ? 'bg-[color:var(--accent)]/25 text-[color:var(--text-primary)]'
              : 'text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]'
          }`}
        >
          {o.icon}
        </button>
      ))}
    </div>
  );
};

/** Iframe de vista previa con marco según el tamaño elegido. */
const PreviewFrame: React.FC<{
  srcDoc: string;
  frameKey: string;
  viewport: Viewport;
  title: string;
}> = ({ srcDoc, frameKey, viewport, title }) => (
  <div className="flex h-full w-full items-start justify-center overflow-auto bg-[color:var(--surface-0)]">
    <div
      className={`bg-white transition-all duration-300 ${
        viewport === 'full'
          ? 'h-full w-full'
          : `my-3 h-[calc(100%-1.5rem)] max-w-full overflow-hidden rounded-2xl border border-white/15 shadow-2xl ${
              viewport === 'mobile' ? 'w-[390px]' : 'w-[768px]'
            }`
      }`}
    >
      <iframe
        key={frameKey}
        title={title}
        srcDoc={srcDoc}
        className="h-full w-full border-none bg-white"
        sandbox="allow-scripts allow-modals allow-same-origin allow-forms"
      />
    </div>
  </div>
);

/** Botón de icono con etiqueta accesible. */
const IconButton: React.FC<{
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ title, onClick, children }) => (
  <button
    onClick={onClick}
    title={title}
    aria-label={title}
    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-[color:var(--text-secondary)] transition-colors hover:bg-white/10 hover:text-[color:var(--text-primary)]"
  >
    {children}
  </button>
);

interface CliConsoleProps {
  initialCode?: string;
  initialLang?: string;
  currentUser?: UserAccount | null;
  onOpenPlans?: (notice?: string) => void;
  onIncrementUsage?: () => void;
  onStateUpdate?: (state: {
    files: CliFile[];
    terminalLogs: { type: 'input' | 'stdout' | 'stderr' | 'system' | 'thinking'; text: string; time: string }[];
    isProcessing: boolean;
    lastCommand: string;
  }) => void;
}

export const CliConsole: React.FC<CliConsoleProps> = ({
  initialCode,
  initialLang = 'typescript',
  currentUser,
  onOpenPlans,
  onIncrementUsage,
  onStateUpdate,
}) => {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isProcessing, setIsProcessing] = useState(false);

  // Vista activa: 'orders' (conversación con la IA), 'preview' o 'code'.
  // En pantallas grandes las órdenes siempre se ven a la izquierda.
  const [activeTab, setActiveTab] = useState<'orders' | 'preview' | 'code'>('orders');

  // Requirement 2: FULL SCREEN PREVIEW TOGGLE
  const [isFullScreenPreview, setIsFullScreenPreview] = useState(false);
  const [previewViewport, setPreviewViewport] = useState<'full' | 'tablet' | 'mobile'>('full');

  // Falso hasta que haya código real (generado, importado o escrito a mano)
  const [hasContent, setHasContent] = useState(Boolean(initialCode));
  const [codeScrollTop, setCodeScrollTop] = useState(0);
  const [lineProgress, setLineProgress] = useState<{
    filename: string;
    current: number;
    total: number;
  } | null>(null);

  const [previewKey, setPreviewKey] = useState(0);
  const [copied, setCopied] = useState(false);

  // Files in workspace: starts with an interactive index.html so preview is immediately functional
  // Workspace starts clean without preloaded bulky templates; ready for user code/orders
  const [files, setFiles] = useState<CliFile[]>([
    {
      filename: 'index.html',
      language: 'html',
      code: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>APS HARD WORK</title>
  <style>
    body {
      background: #0f1115;
      color: #e8eaed;
      font-family: system-ui, sans-serif;
      padding: 24px;
      margin: 0;
    }
    h1 { color: #ffffff; font-size: 1.2rem; }
    p { color: #9aa3b2; font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>Tu proyecto</h1>
  <p>Escribe una orden para que la IA cree algo aquí.</p>
</body>
</html>`,
      description: 'Documento web principal',
    },
    ]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  // Terminal logs: starts with welcoming prompt
  const [terminalLogs, setTerminalLogs] = useState<
    { type: 'input' | 'stdout' | 'stderr' | 'system' | 'thinking'; text: string; time: string }[]
  >([]);

  // Uploaded files in CLI
  const [cliAttachments, setCliAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const terminalBottomRef = useRef<HTMLDivElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);

  // Listen to Escape to close full screen
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreenPreview) {
        setIsFullScreenPreview(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullScreenPreview]);

  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [terminalLogs, lineProgress?.current, isProcessing]);

  // When initialCode changes from outside, add to files and notify in terminal
  useEffect(() => {
    if (initialCode) {
      const existingIdx = files.findIndex((f) => f.filename === 'imported_snippet.ts');
      if (existingIdx !== -1) {
        const updated = [...files];
        updated[existingIdx].code = initialCode;
        setFiles(updated);
        setActiveFileIndex(existingIdx);
      } else {
        const newSnippetFile = {
          filename: `snippet_${Date.now().toString().slice(-4)}.${initialLang === 'python' ? 'py' : 'ts'}`,
          language: initialLang,
          code: initialCode,
          description: 'Código importado desde la conversación',
        };
        setFiles((prev) => [...prev, newSnippetFile]);
        setActiveFileIndex(files.length);
      }
      setHasContent(true);
      addLog('system', `✔ Snippet importado desde el chat cargado en el espacio de trabajo.`);
      // Keep terminal view as primary per user requirement
      setActiveTab('orders');
    }
  }, [initialCode, initialLang]);

  const [lastExecutedCmd, setLastExecutedCmd] = useState<string>('');

  const addLog = (
    type: 'input' | 'stdout' | 'stderr' | 'system' | 'thinking',
    text: string
  ) => {
    setTerminalLogs((prev) => [
      ...prev,
      { type, text, time: new Date().toLocaleTimeString() },
    ]);
  };

  // Sync state upward to parent so CHAT assistant has live terminal awareness
  useEffect(() => {
    if (onStateUpdate) {
      onStateUpdate({
        files,
        terminalLogs,
        isProcessing,
        lastCommand: lastExecutedCmd,
      });
    }
  }, [files, terminalLogs, isProcessing, lastExecutedCmd, onStateUpdate]);

  const processCliFiles = (fileList: File[]) => {
    fileList.forEach((file) => {
      const reader = new FileReader();
      const isImg = file.type.startsWith('image/');
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || '';
        const att: Attachment = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name || `captura_${Date.now()}.png`,
          type: file.type || 'image/png',
          size: file.size,
          data: base64,
          mimeType: file.type || 'image/png',
          previewUrl: isImg ? result : undefined,
        };
        setCliAttachments((prev) => [...prev, att]);
        addLog(
          'system',
          `✔ ${isImg ? 'Imagen' : 'Archivo'} cargado en sandbox: ${file.name || 'captura'} (${(file.size / 1024).toFixed(1)} KB)`
        );
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files;
    if (!uploaded || uploaded.length === 0) return;
    processCliFiles(Array.from(uploaded));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items || items.length === 0) return;

    const filesToProcess: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          filesToProcess.push(file);
        }
      }
    }

    if (filesToProcess.length > 0) {
      processCliFiles(filesToProcess);
      const textData = e.clipboardData.getData('text');
      if (!textData) {
        e.preventDefault();
      }
    }
  };

  // Add a new file to the workspace
  const handleAddNewFile = () => {
    const defaultName = `archivo_${files.length + 1}.html`;
    const newFile: CliFile = {
      filename: defaultName,
      language: 'html',
      code: `<!DOCTYPE html>\n<html>\n<head>\n  <style>body { background: #ffffff; color: #1f2937; font-family: system-ui, sans-serif; padding: 20px; }</style>\n</head>\n<body>\n  <h1>Nuevo archivo</h1>\n  <p>Edita el código o pídele cambios a la IA.</p>\n</body>\n</html>\n`,
      description: 'Nuevo archivo en blanco',
    };
    setFiles((prev) => [...prev, newFile]);
    setActiveFileIndex(files.length);
    setHasContent(true);
    addLog('system', `✔ Creado nuevo archivo: '${defaultName}'`);
  };

  // Delete a file from the workspace
  const handleDeleteFile = (e: React.MouseEvent, indexToDelete: number) => {
    e.stopPropagation();
    if (files.length <= 1) return;
    const fileToRemove = files[indexToDelete];
    setFiles((prev) => prev.filter((_, i) => i !== indexToDelete));
    if (activeFileIndex >= indexToDelete) {
      setActiveFileIndex((prev) => Math.max(0, prev - 1));
    }
    addLog('system', `Eliminado archivo: '${fileToRemove.filename}'`);
  };

  // Progressive line-by-line stream implementation for generated code
  const streamCodeLineByLine = async (incomingFiles: CliFile[]) => {
    setHasContent(true);
    for (const newFile of incomingFiles) {
      const lines = newFile.code.split('\n');
      const totalLines = lines.length;

      // Initialize the target file empty so user sees it stream in
      setFiles((prev) => {
        const next = [...prev];
        const idx = next.findIndex((f) => f.filename === newFile.filename);
        if (idx !== -1) {
          next[idx] = { ...newFile, code: '' };
        } else {
          next.push({ ...newFile, code: '' });
        }
        return next;
      });

      addLog(
        'system',
        `⚡ Escribiendo ${newFile.filename} (${totalLines} líneas)…`
      );

      // Stream in progressive chunks of 2-4 lines every 20ms
      const step = Math.max(1, Math.min(4, Math.ceil(totalLines / 35)));
      let currentIdx = 0;

      while (currentIdx < totalLines) {
        currentIdx = Math.min(totalLines, currentIdx + step);
        const chunkCode = lines.slice(0, currentIdx).join('\n');

        setFiles((prev) => {
          const next = [...prev];
          const idx = next.findIndex((f) => f.filename === newFile.filename);
          if (idx !== -1) {
            next[idx] = { ...next[idx], code: chunkCode };
          }
          return next;
        });

        setLineProgress({
          filename: newFile.filename,
          current: currentIdx,
          total: totalLines,
        });

        // Fast yield so React renders the updated code and preview iframe synchronously
        await new Promise((r) => setTimeout(r, 20));
      }
    }

    setLineProgress(null);
    addLog('system', `✔ Listo: el código está generado y ya se ve en la vista previa.`);
  };

  // Run the current active file in simulated / real JS sandbox
  const executeActiveCode = () => {
    const currentFile = files[activeFileIndex];
    if (!currentFile) return;

    if (
      currentFile.code.includes('<!DOCTYPE') ||
      currentFile.code.includes('<html') ||
      currentFile.code.includes('<body') ||
      currentFile.filename.endsWith('.html')
    ) {
      setActiveTab('preview');
      addLog('input', `preview ${currentFile.filename}`);
      addLog(
        'system',
        `✔ Archivo web interactivo '${currentFile.filename}' renderizado en la pestaña Vista Previa.`
      );
      return;
    }

    setActiveTab('orders');
    addLog('input', `run ${currentFile.filename}`);
    addLog('system', `Compilando y ejecutando '${currentFile.filename}' en sandbox virtual...`);

    const startTime = performance.now();

    try {
      const capturedLogs: string[] = [];
      const fakeConsole = {
        log: (...args: any[]) =>
          capturedLogs.push(
            args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')
          ),
        error: (...args: any[]) => capturedLogs.push('[ERROR] ' + args.map(String).join(' ')),
        warn: (...args: any[]) => capturedLogs.push('[WARN] ' + args.map(String).join(' ')),
        info: (...args: any[]) => capturedLogs.push('[INFO] ' + args.map(String).join(' ')),
      };

      const executable = currentFile.code
        .replace(/export\s+default\s+/g, '')
        .replace(/export\s+(const|let|var|function|class|async)\s+/g, '$1 ')
        .replace(/export\s*\{[\s\S]*?\};?/g, '')
        .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '')
        .replace(/import\s+['"][^'"]+['"];?/g, '')
        .replace(/interface\s+\w+[\s\S]*?\{[\s\S]*?\}/g, '')
        .replace(/type\s+\w+\s*=[\s\S]*?;/g, '')
        .replace(/:\s*[A-Za-z0-9_<>[\]|& ]+(?=[,=);{])/g, '')
        .replace(/\bas\s+[A-Za-z0-9_<>[\]]+/g, '');

      const runFn = new Function('console', executable);
      runFn(fakeConsole);

      const elapsed = (performance.now() - startTime).toFixed(2);
      if (capturedLogs.length > 0) {
        addLog('stdout', capturedLogs.join('\n'));
      } else {
        addLog('stdout', `[APS ENGINE] Proceso finalizado sin errores.`);
      }
      addLog('system', `✔ Ejecución finalizada en ${elapsed}ms con código de salida 0.`);
    } catch (err: any) {
      const elapsed = (performance.now() - startTime).toFixed(2);
      addLog('stderr', `Error de ejecución: ${err.message}`);
      addLog('system', `✖ Proceso abortado tras ${elapsed}ms.`);
    }
  };

  // Execute CLI Command via Gemini APS HARD WORK
  const handleExecuteCommand = async (cmdToRun?: string) => {
    const rawCmd = (cmdToRun || command).trim();
    if (!rawCmd || isProcessing) return;

    addLog('input', `aps@hardwork:~$ ${rawCmd}`);
    setHistory((prev) => [...prev, rawCmd]);
    setHistoryIndex(-1);
    setCommand('');
    setLastExecutedCmd(rawCmd);
    setIsProcessing(true);

    if (rawCmd === 'clear' || rawCmd === 'cls') {
      setTerminalLogs([]);
      setIsProcessing(false);
      return;
    }
    if (rawCmd === 'run') {
      executeActiveCode();
      setIsProcessing(false);
      return;
    }
    if (rawCmd === 'preview') {
      setActiveTab('preview');
      setIsProcessing(false);
      return;
    }
    if (rawCmd === 'fullscreen') {
      setIsFullScreenPreview(true);
      setIsProcessing(false);
      return;
    }
    if (rawCmd === 'split') {
      setActiveTab('code');
      setIsProcessing(false);
      return;
    }
    if (rawCmd === 'editor') {
      setActiveTab('code');
      setIsProcessing(false);
      return;
    }
    if (rawCmd === 'help') {
      addLog(
        'system',
        `Comandos disponibles:
  <cualquier texto>   Pídele a la IA que cree o cambie algo (ej: "juego de snake")
  preview             Ir a la vista previa
  editor              Ir al código
  fullscreen          Vista previa a pantalla completa
  run                 Ejecutar el archivo actual
  clear               Limpiar el historial`
      );
      setIsProcessing(false);
      return;
    }

    // Plan and quota gating for APS HARD WORK:
    if (!canUserAccessHardWork(currentUser)) {
      addLog('stderr', 'El motor de desarrollo APS HARD WORK requiere como mínimo el Plan Advanced ($25/mes).');
      addLog('system', '⚠ Actualiza tu suscripción para desbloquear la consola y el motor de código.');
      if (onOpenPlans) {
        onOpenPlans('El motor de desarrollo APS HARD WORK requiere como mínimo el Plan Advanced ($25/mes) para desbloquear la consola y el motor de código.');
      }
      setIsProcessing(false);
      return;
    }

    if (isUserQuotaExceeded(currentUser)) {
      const plan = getUserPlan(currentUser);
      const periodLabel = plan.period === 'day' ? 'por día' : 'por mes';
      addLog('stderr', `Has alcanzado el límite de tu plan ${plan.name} (${plan.limit} mensajes ${periodLabel}).`);
      addLog('system', '⚠ Mejora tu plan para continuar ejecutando órdenes en la terminal.');
      if (onOpenPlans) {
        onOpenPlans(`Has alcanzado el límite de tu plan ${plan.name} (${plan.limit} mensajes ${periodLabel}). Mejora tu plan para continuar.`);
      }
      setIsProcessing(false);
      return;
    }

    try {
      addLog(
        'thinking',
        'Pensamiento extendido: Procesando arquitectura y preparando generación línea por línea...'
      );

      const currentFile = files[activeFileIndex];
      const res = await fetch('/api/cli/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: rawCmd,
          files: files.map((f) => ({
            filename: f.filename,
            language: f.language,
            code: f.code,
          })),
          activeFilename: currentFile ? currentFile.filename : '',
          language: currentFile ? currentFile.language : 'typescript',
          attachments: cliAttachments,
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        const result: CliExecutionResult = data.data;

        if (onIncrementUsage) {
          onIncrementUsage();
        }

        if (result.extendedReasoning) {
          addLog('thinking', `Razonamiento: ${result.extendedReasoning}`);
        }

        if (result.stdout) {
          addLog('stdout', result.stdout);
        }

        if (result.executionSummary) {
          addLog('system', `✔ ${result.executionSummary}`);
        }

        // Stream generated files line-by-line so progress is visible dynamically
        if (result.generatedFiles && result.generatedFiles.length > 0) {
          await streamCodeLineByLine(result.generatedFiles);
          setPreviewKey((k) => k + 1);
          // En celular, al terminar llevamos al usuario directo al resultado
          if (window.matchMedia('(max-width: 1023px)').matches) setActiveTab('preview');
        }
      } else {
        addLog('stderr', data.error || 'Error desconocido en el motor CLI.');
      }
    } catch (err: any) {
      addLog('stderr', `Fallo de red al comunicar con APS HARD WORK: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleExecuteCommand();
    } else if (e.key === 'ArrowUp') {
      if (history.length > 0) {
        const newIdx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIdx);
        setCommand(history[newIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      if (historyIndex !== -1) {
        const newIdx = historyIndex + 1;
        if (newIdx >= history.length) {
          setHistoryIndex(-1);
          setCommand('');
        } else {
          setHistoryIndex(newIdx);
          setCommand(history[newIdx]);
        }
      }
    }
  };

  const currentFile = files[activeFileIndex] || files[0];

  const handleCopyCode = () => {
    if (!currentFile) return;
    navigator.clipboard.writeText(currentFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCode = () => {
    if (!currentFile) return;
    const blob = new Blob([currentFile.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = currentFile.filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Memoized compiled preview HTML
  const compiledPreviewHtml = useMemo(() => {
    return buildCombinedPreviewHtml(files, currentFile);
  }, [files, currentFile]);

  // Code line count for active file
  const activeLineCount = currentFile?.code.split('\n').length || 1;

  const showRun = Boolean(currentFile && !currentFile.filename.endsWith('.html'));
  const hasLogs = terminalLogs.some((l) => !(l.type === 'thinking' && !l.text.startsWith('Razonamiento:')));
  const progressPct = lineProgress
    ? Math.round((lineProgress.current / Math.max(1, lineProgress.total)) * 100)
    : 0;
  const canSend = command.trim().length > 0 && !isProcessing;
  const showOrders = activeTab === 'orders';
  const rightIsCode = activeTab === 'code';

  const mobileTabs: { id: 'orders' | 'preview' | 'code'; label: string; icon: React.ReactNode }[] = [
    { id: 'orders', label: 'Órdenes', icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'preview', label: 'Vista previa', icon: <Eye className="h-4 w-4" /> },
    { id: 'code', label: 'Código', icon: <Code2 className="h-4 w-4" /> },
  ];

  const tabBtn = (active: boolean) =>
    `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${
      active
        ? 'bg-[color:var(--accent)]/25 text-[color:var(--text-primary)]'
        : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]'
    }`;

  return (
    <div className="flex h-full w-full flex-1 flex-col overflow-hidden bg-[color:var(--surface-0)] p-0 sm:p-2">
      <div className="flex h-full w-full flex-1 flex-col overflow-hidden rounded-none border-0 border-white/10 bg-[color:var(--surface-1)] shadow-2xl sm:rounded-2xl sm:border">
        {/* Selector de vista (solo celular): Órdenes / Vista previa / Código */}
        <div className="flex items-center gap-1 border-b border-white/10 bg-[color:var(--surface-2)] p-1.5 lg:hidden">
          {mobileTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex flex-1 items-center justify-center ${tabBtn(activeTab === t.id)}`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* ───────── IZQUIERDA: órdenes a la IA ───────── */}
          <section
            className={`${
              showOrders ? 'flex' : 'hidden lg:flex'
            } min-h-0 flex-1 flex-col border-white/10 lg:w-[38%] lg:min-w-[340px] lg:max-w-[520px] lg:flex-none lg:border-r xl:w-[34%]`}
          >
            <div className="hidden items-center gap-2 border-b border-white/10 bg-[color:var(--surface-2)] px-4 py-3 lg:flex">
              <span
                className={`h-2 w-2 rounded-full ${
                  isProcessing ? 'animate-pulse bg-amber-400' : 'bg-emerald-400'
                }`}
              />
              <h2 className="text-sm font-bold text-[color:var(--text-primary)]">Órdenes</h2>
              <span className="ml-auto text-xs text-[color:var(--text-muted)]">
                {isProcessing ? 'Trabajando…' : 'APS Hard Work · listo'}
              </span>
            </div>

            {/* Historial */}
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4">
              {!hasLogs && !isProcessing ? (
                <div className="flex min-h-full flex-col justify-center">
                  <div className="mb-5 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/10">
                      <Sparkles className="h-6 w-6 text-[color:var(--accent)]" />
                    </div>
                    <h3 className="text-base font-bold text-[color:var(--text-primary)]">
                      ¿Qué quieres crear?
                    </h3>
                    <p className="mx-auto mt-1 max-w-[34ch] text-[13px] leading-relaxed text-[color:var(--text-secondary)]">
                      Escribe una orden y la IA arma el código. El resultado se ve al instante en la
                      vista previa.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    {EXAMPLE_PROMPTS.map((p) => (
                      <button
                        key={p.title}
                        onClick={() => handleExecuteCommand(p.cmd)}
                        className="rounded-xl border border-white/10 bg-[color:var(--surface-2)] px-3.5 py-3 text-left transition-all hover:border-[color:var(--accent)]/50 hover:bg-[color:var(--surface-3)]"
                      >
                        <div className="text-[13px] font-semibold text-[color:var(--text-primary)]">
                          {p.title}
                        </div>
                        <div className="mt-0.5 text-xs text-[color:var(--text-secondary)]">{p.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {terminalLogs.map((log, i) => (
                    <LogEntry key={i} log={log} />
                  ))}

                  {lineProgress && (
                    <div className="rounded-xl border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/10 px-3.5 py-3">
                      <div className="mb-2 flex items-center justify-between gap-2 text-[13px]">
                        <span className="flex min-w-0 items-center gap-2 text-[color:var(--text-primary)]">
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[color:var(--accent)]" />
                          <span className="truncate">
                            Escribiendo <strong className="font-mono-code">{lineProgress.filename}</strong>
                          </span>
                        </span>
                        <span className="shrink-0 font-semibold text-[color:var(--accent)]">
                          {progressPct}%
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-[color:var(--accent)] transition-all duration-150"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <div className="mt-1.5 text-xs text-[color:var(--text-secondary)]">
                        Línea {lineProgress.current} de {lineProgress.total} · la vista previa se actualiza sola
                      </div>
                    </div>
                  )}

                  {isProcessing && !lineProgress && (
                    <div className="flex items-center gap-2 px-1 text-[13px] text-[color:var(--text-secondary)]">
                      <Loader2 className="h-4 w-4 animate-spin text-[color:var(--accent)]" />
                      <span>La IA está pensando tu orden…</span>
                    </div>
                  )}
                </div>
              )}
              <div ref={terminalBottomRef} />
            </div>

            {/* Sugerencias para seguir editando */}
            {hasContent && !isProcessing && (
              <div className="flex gap-1.5 overflow-x-auto border-t border-white/10 px-3 py-2 scrollbar-none sm:px-4">
                {FOLLOW_UPS.map((f) => (
                  <button
                    key={f}
                    onClick={() => handleExecuteCommand(f)}
                    className="shrink-0 whitespace-nowrap rounded-full border border-white/10 bg-[color:var(--surface-2)] px-3 py-1 text-xs text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--accent)]/50 hover:text-[color:var(--text-primary)]"
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}

            {/* Entrada */}
            <div className="border-t border-white/10 bg-[color:var(--surface-2)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />

              {cliAttachments.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {cliAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-1.5 rounded-lg border border-[color:var(--accent)]/30 bg-[color:var(--surface-3)] px-2 py-1 text-xs text-[color:var(--text-primary)]"
                    >
                      <Paperclip className="h-3 w-3 text-[color:var(--text-muted)]" />
                      <span className="max-w-[140px] truncate">{att.name}</span>
                      <button
                        onClick={() => setCliAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                        className="text-[color:var(--text-muted)] hover:text-red-400"
                        aria-label={`Quitar ${att.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-1.5 rounded-2xl border border-white/15 bg-[color:var(--surface-0)] py-1.5 pl-1.5 pr-1.5 transition-colors focus-within:border-[color:var(--accent)]/70">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[color:var(--text-secondary)] transition-colors hover:bg-white/10 hover:text-[color:var(--text-primary)]"
                  title="Adjuntar archivos o imágenes"
                  aria-label="Adjuntar archivos o imágenes"
                >
                  <Paperclip className="h-4 w-4" />
                </button>

                <input
                  ref={commandInputRef}
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={
                    hasContent ? 'Pide un cambio: "agrega un botón de reiniciar"…' : 'Describe lo que quieres crear…'
                  }
                  className="min-w-0 flex-1 bg-transparent text-sm text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:outline-none"
                />

                <button
                  onClick={() => handleExecuteCommand()}
                  disabled={!canSend}
                  title="Enviar orden"
                  aria-label="Enviar orden"
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all ${
                    canSend
                      ? 'bg-[color:var(--accent)] text-[color:var(--on-accent)] shadow-md hover:brightness-110 active:scale-95'
                      : 'bg-white/5 text-[color:var(--text-muted)]'
                  }`}
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1.5 hidden px-1 text-[11px] text-[color:var(--text-muted)] sm:block">
                Enter envía · ↑ repite la última orden · <code className="font-mono-code">help</code> muestra los comandos
              </p>
            </div>
          </section>

          {/* ───────── DERECHA: resultado ───────── */}
          <section
            className={`${
              showOrders ? 'hidden lg:flex' : 'flex'
            } relative min-h-0 min-w-0 flex-1 flex-col bg-[color:var(--surface-0)]`}
          >
            {/* Barra de progreso fina mientras se escribe el código */}
            {lineProgress && (
              <div className="absolute inset-x-0 top-0 z-10 h-0.5 bg-white/5">
                <div
                  className="h-full bg-[color:var(--accent)] transition-all duration-150"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-[color:var(--surface-2)] px-3 py-2">
              <div className="hidden items-center gap-1 rounded-xl border border-white/10 bg-[color:var(--surface-0)] p-0.5 lg:flex">
                <button onClick={() => setActiveTab('preview')} className={tabBtn(!rightIsCode)}>
                  <Eye className="h-4 w-4" />
                  Vista previa
                </button>
                <button onClick={() => setActiveTab('code')} className={tabBtn(rightIsCode)}>
                  <Code2 className="h-4 w-4" />
                  Código
                </button>
              </div>

              <div className="ml-auto flex items-center gap-1.5">
                {rightIsCode ? (
                  <>
                    {showRun && (
                      <button
                        onClick={executeActiveCode}
                        className="flex items-center gap-1.5 rounded-lg bg-[color:var(--accent)] px-3 py-1.5 text-[13px] font-semibold text-[color:var(--on-accent)] transition-all hover:brightness-110 active:scale-95"
                        title="Ejecutar este archivo y ver el resultado en Órdenes"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        Ejecutar
                      </button>
                    )}
                    <IconButton title={copied ? 'Copiado' : 'Copiar código'} onClick={handleCopyCode}>
                      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </IconButton>
                    <IconButton title="Descargar archivo" onClick={handleDownloadCode}>
                      <Download className="h-4 w-4" />
                    </IconButton>
                  </>
                ) : (
                  <>
                    <div className="hidden sm:block">
                      <ViewportSwitch value={previewViewport} onChange={setPreviewViewport} />
                    </div>
                    <IconButton title="Recargar vista previa" onClick={() => setPreviewKey((k) => k + 1)}>
                      <RefreshCw className="h-4 w-4" />
                    </IconButton>
                    <button
                      onClick={() => setIsFullScreenPreview(true)}
                      className="flex items-center gap-1.5 rounded-lg border border-[color:var(--accent)]/40 bg-[color:var(--accent)]/15 px-3 py-1.5 text-[13px] font-semibold text-[color:var(--text-primary)] transition-all hover:bg-[color:var(--accent)]/30 active:scale-95"
                      title="Ver a pantalla completa"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Pantalla completa</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Archivos (solo en la vista de código) */}
            {rightIsCode && (
              <div className="flex items-center gap-1.5 overflow-x-auto border-b border-white/10 bg-[color:var(--surface-1)] px-3 py-1.5 scrollbar-none">
                {files.map((file, idx) => (
                  <div
                    key={file.filename}
                    onClick={() => setActiveFileIndex(idx)}
                    className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono-code text-xs transition-colors ${
                      activeFileIndex === idx
                        ? 'border border-[color:var(--accent)]/40 bg-[color:var(--accent)]/15 font-semibold text-[color:var(--text-primary)]'
                        : 'border border-transparent text-[color:var(--text-secondary)] hover:bg-white/5'
                    }`}
                  >
                    <FileCode className="h-3.5 w-3.5 text-[color:var(--accent)]" />
                    <span>{file.filename}</span>
                    {files.length > 1 && (
                      <button
                        onClick={(e) => handleDeleteFile(e, idx)}
                        className="rounded p-0.5 text-[color:var(--text-muted)] hover:text-red-400"
                        title="Eliminar archivo"
                        aria-label={`Eliminar ${file.filename}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={handleAddNewFile}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-dashed border-[color:var(--accent)]/40 px-2.5 py-1 text-xs text-[color:var(--accent)] transition-colors hover:bg-[color:var(--accent)]/10"
                  title="Crear un archivo nuevo"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nuevo archivo
                </button>
                <span className="ml-auto shrink-0 pl-2 text-[11px] text-[color:var(--text-muted)]">
                  {activeLineCount} líneas
                </span>
              </div>
            )}

            {/* Contenido */}
            <div className="relative min-h-0 flex-1">
              {rightIsCode ? (
                <div className="relative h-full overflow-hidden bg-[color:var(--surface-0)]">
                  <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 overflow-hidden border-r border-white/5 bg-[color:var(--surface-1)] text-right font-mono-code text-[13px] leading-6 text-[color:var(--text-muted)]">
                    <div
                      className="px-2 py-3"
                      style={{ transform: `translateY(${-codeScrollTop}px)` }}
                    >
                      {currentFile?.code.split('\n').map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={currentFile?.code || ''}
                    onChange={(e) => {
                      const newCode = e.target.value;
                      setHasContent(true);
                      setFiles((prev) => {
                        const updated = [...prev];
                        if (updated[activeFileIndex]) {
                          updated[activeFileIndex] = { ...updated[activeFileIndex], code: newCode };
                        }
                        return updated;
                      });
                    }}
                    onScroll={(e) => setCodeScrollTop(e.currentTarget.scrollTop)}
                    wrap="off"
                    spellCheck={false}
                    placeholder="// Escribe aquí tu código o pídele a la IA que lo cree"
                    className="absolute inset-0 h-full w-full resize-none overflow-auto whitespace-pre bg-transparent py-3 pl-16 pr-4 font-mono-code text-[13px] leading-6 text-[color:var(--text-primary)] outline-none selection:bg-[color:var(--accent)]/30"
                  />
                </div>
              ) : (
                <>
                  <PreviewFrame
                    srcDoc={compiledPreviewHtml}
                    frameKey={`preview-${previewKey}`}
                    viewport={previewViewport}
                    title="Vista previa"
                  />
                  {!hasContent && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[color:var(--surface-0)] px-6 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[color:var(--surface-2)]">
                        <Eye className="h-6 w-6 text-[color:var(--text-muted)]" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[color:var(--text-primary)]">
                          Aquí verás tu creación
                        </div>
                        <p className="mx-auto mt-1 max-w-[32ch] text-[13px] leading-relaxed text-[color:var(--text-secondary)]">
                          Escribe una orden en el panel de Órdenes y se irá armando en vivo.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setActiveTab('orders');
                          setTimeout(() => commandInputRef.current?.focus(), 50);
                        }}
                        className="rounded-lg border border-[color:var(--accent)]/40 bg-[color:var(--accent)]/15 px-3.5 py-1.5 text-[13px] font-semibold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--accent)]/30 lg:hidden"
                      >
                        Ir a Órdenes
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* ───────── Pantalla completa ───────── */}
      {isFullScreenPreview && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[color:var(--surface-0)]">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-[color:var(--surface-2)] px-3 py-2.5 sm:px-5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400" />
              <span className="truncate text-sm font-bold text-[color:var(--text-primary)]">
                Vista previa a pantalla completa
              </span>
              <span className="hidden rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono-code text-xs text-[color:var(--text-secondary)] md:inline-block">
                {currentFile?.filename || 'index.html'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="hidden sm:block">
                <ViewportSwitch value={previewViewport} onChange={setPreviewViewport} />
              </div>
              <IconButton title="Recargar vista previa" onClick={() => setPreviewKey((k) => k + 1)}>
                <RefreshCw className="h-4 w-4" />
              </IconButton>
              <button
                onClick={() => setIsFullScreenPreview(false)}
                className="flex items-center gap-1.5 rounded-lg border border-[color:var(--accent)]/40 bg-[color:var(--accent)]/20 px-3 py-1.5 text-[13px] font-semibold text-[color:var(--text-primary)] transition-all hover:bg-[color:var(--accent)]/35 active:scale-95"
                title="Salir de pantalla completa (Esc)"
              >
                <Minimize2 className="h-4 w-4" />
                <span>Salir</span>
                <span className="hidden font-mono-code text-[10px] text-[color:var(--text-muted)] md:inline">Esc</span>
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1">
            <PreviewFrame
              srcDoc={compiledPreviewHtml}
              frameKey={`fullscreen-${previewKey}`}
              viewport={previewViewport}
              title="Vista previa a pantalla completa"
            />
          </div>
        </div>
      )}
    </div>
  );
};
