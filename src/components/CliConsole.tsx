import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CliFile, CliExecutionResult, Attachment } from '../types';
import {
  Terminal as TerminalIcon,
  Play,
  Download,
  Copy,
  Check,
  Sparkles,
  Paperclip,
  FileCode,
  Eye,
  RefreshCw,
  CornerDownLeft,
  X,
  Code2,
  Brain,
  Maximize2,
  Minimize2,
  Columns,
  Monitor,
  Smartphone,
  ExternalLink,
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
    body { font-family: system-ui, -apple-system, sans-serif; background: #070d09; color: #fbf5e8; padding: 24px; margin: 0; }
    h2 { color: #f4e2b8; border-bottom: 1px solid rgba(197, 160, 89, 0.3); padding-bottom: 10px; font-size: 1.1rem; }
    p { color: #8e9c8c; font-size: 0.85rem; }
    pre { background: #0c1611; border: 1px solid rgba(197, 160, 89, 0.2); padding: 16px; border-radius: 8px; color: #98e6a5; overflow: auto; font-size: 0.8rem; font-family: monospace; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h2>APS HARD WORK — Vista de Código (${activeFile?.filename || 'archivo'})</h2>
  <p>Renderizando código en tiempo real. Escribe o modifica líneas para ver el progreso aquí mismo.</p>
  <pre>${codeToDisplay.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body>
</html>`;
}

interface CliConsoleProps {
  initialCode?: string;
  initialLang?: string;
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
  onStateUpdate,
}) => {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isProcessing, setIsProcessing] = useState(false);

  // Requirement 1: MUST APPEAR DIRECTLY IN CONSOLA ('terminal')
  const [activeTab, setActiveTab] = useState<'terminal' | 'editor' | 'preview'>('terminal');

  // Requirement 2: FULL SCREEN PREVIEW TOGGLE
  const [isFullScreenPreview, setIsFullScreenPreview] = useState(false);
  const [previewViewport, setPreviewViewport] = useState<'full' | 'tablet' | 'mobile'>('full');

  // Requirement 3: SPLIT VIEW FOR LINE-BY-LINE LIVE PROGRESS
  const [isSplitView, setIsSplitView] = useState(false);
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
      background: #050a07;
      color: #fbf5e8;
      font-family: monospace;
      padding: 24px;
      margin: 0;
    }
    h1 { color: #f4e2b8; font-size: 1.2rem; }
    p { color: #8e9c8c; font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>APS HARD WORK — Workspace Activo</h1>
  <p>Consola lista. Escribe cualquier orden en la terminal o crea archivos con la IA.</p>
</body>
</html>`,
      description: 'Documento web principal',
    },
    ]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  // Terminal logs: starts with welcoming prompt
  const [terminalLogs, setTerminalLogs] = useState<
    { type: 'input' | 'stdout' | 'stderr' | 'system' | 'thinking'; text: string; time: string }[]
  >([
    {
      type: 'system',
      text: 'APS HARD WORK — CLI DEVELOPMENT ENGINE v3.8 INICIADO [CONSOLA ACTIVA]\nEscribe cualquier orden en la consola (ej: "crea un juego de snake", "haz una calculadora", "escribe un algoritmo") y la IA escribirá el código línea por línea en tiempo real con sincronización visual en Vista Previa.',
      time: new Date().toLocaleTimeString(),
    },
  ]);

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
    terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs]);

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
      addLog('system', `✔ Snippet importado desde el chat cargado en el espacio de trabajo.`);
      // Keep terminal view as primary per user requirement
      setActiveTab('terminal');
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files;
    if (!uploaded || uploaded.length === 0) return;

    Array.from(uploaded).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || '';
        const att: Attachment = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          type: file.type || 'text/plain',
          size: file.size,
          data: base64,
          mimeType: file.type || 'text/plain',
          previewUrl: file.type.startsWith('image/') ? result : undefined,
        };
        setCliAttachments((prev) => [...prev, att]);
        addLog(
          'system',
          `Archivo cargado en sandbox: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`
        );
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Add a new file to the workspace
  const handleAddNewFile = () => {
    const defaultName = `archivo_${files.length + 1}.html`;
    const newFile: CliFile = {
      filename: defaultName,
      language: 'html',
      code: `<!DOCTYPE html>\n<html>\n<head>\n  <style>body { background: #070d09; color: #fbf5e8; font-family: sans-serif; padding: 20px; }</style>\n</head>\n<body>\n  <h1>Nuevo archivo</h1>\n  <p>Escribe tu código línea por línea para ver el progreso en tiempo real.</p>\n</body>\n</html>\n`,
      description: 'Nuevo archivo en blanco',
    };
    setFiles((prev) => [...prev, newFile]);
    setActiveFileIndex(files.length);
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
        `⚡ Escribiendo '${newFile.filename}' línea por línea (${totalLines} líneas)...`
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
    addLog('system', `✔ 100% de líneas generadas y sincronizadas en la Vista Previa.`);
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

    setActiveTab('terminal');
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
      setIsSplitView((prev) => !prev);
      setIsProcessing(false);
      return;
    }
    if (rawCmd === 'editor') {
      setActiveTab('editor');
      setIsProcessing(false);
      return;
    }
    if (rawCmd === 'help') {
      addLog(
        'system',
        `Comandos de APS HARD WORK CLI:
  <cualquier orden>          Escribe lo que quieres que cree la IA (ej: "juego de snake", "calculadora")
  fullscreen                 Agranda la vista previa a pantalla completa
  split                      Activa/desactiva la vista dividida (Código + Preview en vivo)
  preview                    Muestra el render interactivo en la pestaña Vista Previa
  editor                     Abre el editor de código con numeración de líneas
  run                        Ejecuta el archivo actual en el sandbox
  clear                      Limpia los registros de la consola`
      );
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

  return (
    <div className="flex flex-1 h-full w-full flex-col overflow-hidden p-0 sm:p-1 md:p-2 bg-[#040805]">
      <div className="flex h-full w-full flex-1 flex-col overflow-hidden rounded-none sm:rounded-xl border-0 sm:border border-[#c5a059]/30 bg-[#070d09]/95 shadow-2xl backdrop-blur-2xl">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#c5a059]/20 bg-[#0c1611]/90 px-2.5 sm:px-4 py-2 sm:py-2.5 gap-2">
          {/* Left: Engine Badge & File Tabs */}
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-none pb-0.5 sm:pb-0">
            <div className="flex items-center gap-1.5 sm:gap-2 pr-2 border-r border-[#c5a059]/20 shrink-0">
              <span className="flex h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-[#c5a059] shadow-[0_0_8px_#c5a059]" />
              <span className="font-serif-luxury text-[11px] sm:text-xs font-bold tracking-wider text-[#f4e2b8] whitespace-nowrap">
                <span className="hidden xs:inline sm:inline">APS HARD WORK </span>CLI
              </span>
            </div>

            {/* File Tabs */}
            <div className="flex items-center gap-1.5 shrink-0">
              {files.map((file, idx) => (
                <div
                  key={file.filename}
                  onClick={() => {
                    setActiveFileIndex(idx);
                  }}
                  className={`flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-mono-code transition-all cursor-pointer whitespace-nowrap ${
                    activeFileIndex === idx
                      ? 'border border-[#c5a059]/40 bg-[#c5a059]/20 text-[#fbf5e8] shadow-sm font-semibold'
                      : 'text-[#8e9c8c] hover:bg-white/5 hover:text-[#d8b66f]'
                  }`}
                >
                  <FileCode className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#c5a059]" />
                  <span>{file.filename}</span>
                  {files.length > 1 && (
                    <button
                      onClick={(e) => handleDeleteFile(e, idx)}
                      className="ml-1 text-[#8e9c8c] hover:text-red-400 p-0.5 rounded"
                      title="Eliminar archivo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={handleAddNewFile}
                className="flex items-center gap-1 rounded-lg border border-dashed border-[#c5a059]/30 px-2 py-1 text-[10px] sm:text-[11px] font-mono-code text-[#c5a059] hover:bg-[#c5a059]/10 transition-colors whitespace-nowrap"
                title="Crear nuevo archivo en el workspace"
              >
                <span>+ Nuevo</span>
              </button>
            </div>
          </div>

          {/* Right: View Toggles & Actions */}
          <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2">
            {/* View Switcher: Consola is the First / Default Tab */}
            <div className="flex items-center rounded-lg border border-[#c5a059]/20 bg-[#060c08] p-0.5 text-xs">
              <button
                onClick={() => {
                  setActiveTab('terminal');
                  setIsSplitView(false);
                }}
                className={`flex items-center gap-1 rounded-md px-2 sm:px-2.5 py-1 transition-all ${
                  activeTab === 'terminal' && !isSplitView
                    ? 'bg-[#c5a059]/25 text-[#f4e2b8] font-bold shadow-sm'
                    : 'text-[#8e9c8c] hover:text-[#f4e2b8]'
                }`}
                title="Consola de órdenes de desarrollo"
              >
                <TerminalIcon className="h-3.5 w-3.5 text-[#c5a059]" />
                <span className="text-[11px] sm:text-xs">Consola</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('editor');
                  setIsSplitView(false);
                }}
                className={`flex items-center gap-1 rounded-md px-2 sm:px-2.5 py-1 transition-all ${
                  activeTab === 'editor' && !isSplitView
                    ? 'bg-[#c5a059]/25 text-[#f4e2b8] font-bold shadow-sm'
                    : 'text-[#8e9c8c] hover:text-[#f4e2b8]'
                }`}
                title="Editor de código"
              >
                <Code2 className="h-3.5 w-3.5 text-[#c5a059]" />
                <span className="text-[11px] sm:text-xs">Editor</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('preview');
                  setIsSplitView(false);
                }}
                className={`flex items-center gap-1 rounded-md px-2 sm:px-2.5 py-1 transition-all ${
                  activeTab === 'preview' && !isSplitView
                    ? 'bg-[#c5a059]/25 text-[#f4e2b8] font-bold shadow-sm'
                    : 'text-[#8e9c8c] hover:text-[#f4e2b8]'
                }`}
                title="Vista previa interactiva"
              >
                <Eye className="h-3.5 w-3.5 text-[#c5a059]" />
                <span className="text-[11px] sm:text-xs">
                  <span className="hidden sm:inline">Vista </span>Previa
                </span>
              </button>

              {/* Requirement 3: Split View for Line-by-Line Live Progress */}
              <button
                onClick={() => setIsSplitView((prev) => !prev)}
                className={`flex items-center gap-1 rounded-md px-2 sm:px-2.5 py-1 transition-all border-l border-[#c5a059]/20 ${
                  isSplitView
                    ? 'bg-emerald-500/25 text-emerald-200 font-bold shadow-sm'
                    : 'text-[#8e9c8c] hover:text-[#f4e2b8]'
                }`}
                title="Ver código y vista previa lado a lado para ver el progreso línea por línea"
              >
                <Columns className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[11px] sm:text-xs hidden sm:inline">Dividido</span>
              </button>
            </div>

            {/* Requirement 2: Full Screen Preview Button */}
            <button
              onClick={() => setIsFullScreenPreview(true)}
              className="flex items-center gap-1 sm:gap-1.5 rounded-lg border border-[#c5a059]/40 bg-[#c5a059]/20 px-2.5 sm:px-3 py-1 text-xs font-serif-luxury font-semibold text-[#fbf5e8] shadow-sm hover:bg-[#c5a059]/35 active:scale-95 transition-all"
              title="Agrandar vista previa a pantalla completa"
            >
              <Maximize2 className="h-3 w-3 text-[#f4e2b8]" />
              <span className="text-[11px] sm:text-xs hidden sm:inline">Full Screen</span>
            </button>

            <div className="flex items-center gap-1 sm:gap-1.5">
              {/* Run Button */}
              <button
                onClick={executeActiveCode}
                className="flex items-center gap-1 sm:gap-1.5 rounded-lg border border-[#c5a059]/40 bg-gradient-to-r from-[#c5a059]/30 to-emerald-600/30 px-2 sm:px-2.5 py-1 text-xs font-serif-luxury font-semibold text-[#fbf5e8] shadow-sm hover:brightness-110 active:scale-95 transition-all"
                title="Ejecutar archivo"
              >
                <Play className="h-3 w-3 fill-current text-[#f4e2b8]" />
                <span className="text-[11px] sm:text-xs hidden md:inline">Ejecutar</span>
              </button>

              <button
                onClick={handleCopyCode}
                className="rounded-lg border border-[#c5a059]/20 p-1.5 text-[#8e9c8c] hover:bg-[#c5a059]/10 hover:text-[#f4e2b8] transition-colors"
                title="Copiar código actual"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>

              <button
                onClick={handleDownloadCode}
                className="rounded-lg border border-[#c5a059]/20 p-1.5 text-[#8e9c8c] hover:bg-[#c5a059]/10 hover:text-[#f4e2b8] transition-colors"
                title="Descargar archivo"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Real-time Line-by-Line Progress Indicator if streaming or typing */}
        {lineProgress && (
          <div className="flex items-center justify-between border-b border-[#c5a059]/30 bg-[#0e1c14] px-4 py-1.5 text-xs font-mono-code text-[#98e6a5] animate-pulse">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              <span>
                Transmitiendo línea por línea en <strong>{lineProgress.filename}</strong>:
              </span>
              <span className="font-bold text-[#fbf5e8]">
                Línea {lineProgress.current} de {lineProgress.total} (
                {Math.round((lineProgress.current / lineProgress.total) * 100)}%)
              </span>
            </div>
            <span className="text-[11px] text-[#c5a059]">Sincronizando con Vista Previa...</span>
          </div>
        )}

        {/* Quick Command Suggestions Strip */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-[#c5a059]/10 bg-[#08100c]/70 px-4 py-1.5 text-xs font-mono-code scrollbar-none">
          <span className="text-[10px] text-[#738271] uppercase tracking-wider">Órdenes sugeridas:</span>
          {[
            'Crea un juego de Snake en HTML con Canvas',
            'Haz una calculadora interactiva y elegante',
            'Crea una app de notas con localStorage',
            'Crea un cronómetro interactivo con vueltas',
            'Crea un juego de Pong con IA',
            'run',
            'fullscreen',
            'clear',
          ].map((promptCmd) => (
            <button
              key={promptCmd}
              onClick={() => handleExecuteCommand(promptCmd)}
              className="whitespace-nowrap rounded-md border border-[#c5a059]/15 bg-[#0e1712]/60 px-2 py-0.5 text-[11px] text-[#a7b3a5] hover:border-[#c5a059]/40 hover:text-[#f4e2b8] transition-colors"
            >
              {promptCmd}
            </button>
          ))}
        </div>

        {/* Main Work Area */}
        <div className="relative flex-1 overflow-hidden">
          {/* SPLIT VIEW: Editor on Left, Live Preview on Right (Line-by-line sync) */}
          {isSplitView ? (
            <div className="flex h-full flex-col md:flex-row overflow-hidden">
              {/* Left Pane: Code Editor with Line Numbers */}
              <div className="flex flex-1 flex-col border-b md:border-b-0 md:border-r border-[#c5a059]/20 bg-[#050a07] overflow-hidden">
                <div className="flex items-center justify-between border-b border-[#c5a059]/15 bg-[#0a140f] px-3 py-1 text-[11px] font-mono-code text-[#8e9c8c]">
                  <span>EDITOR — {currentFile?.filename}</span>
                  <span className="text-[#c5a059]">Líneas: {activeLineCount} (Edición en vivo)</span>
                </div>
                <div className="flex flex-1 overflow-auto p-3 font-mono-code text-xs md:text-sm leading-relaxed text-[#dbe5da]">
                  <div className="select-none pr-3 text-right text-[#455243]">
                    {currentFile?.code.split('\n').map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                  <textarea
                    value={currentFile?.code || ''}
                    onChange={(e) => {
                      const newCode = e.target.value;
                      setFiles((prev) => {
                        const updated = [...prev];
                        if (updated[activeFileIndex]) {
                          updated[activeFileIndex].code = newCode;
                        }
                        return updated;
                      });
                    }}
                    placeholder="// Escribe aquí tu código línea por línea..."
                    spellCheck={false}
                    className="flex-1 resize-none bg-transparent font-mono-code outline-none text-[#e8f0e6] selection:bg-[#c5a059]/30"
                  />
                </div>
              </div>

              {/* Right Pane: Live Preview updating line-by-line */}
              <div className="flex flex-1 flex-col bg-[#0b1510] overflow-hidden">
                <div className="flex items-center justify-between border-b border-[#c5a059]/15 bg-[#0a140f] px-3 py-1 text-[11px] font-mono-code text-[#8e9c8c]">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse" />
                    <span className="text-[#f4e2b8] font-bold">VISTA PREVIA EN VIVO</span>
                    <span className="hidden sm:inline text-[#738271]">
                      (Progreso actualizado línea por línea)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewKey((k) => k + 1)}
                      className="p-1 text-[#8e9c8c] hover:text-[#f4e2b8]"
                      title="Refrescar vista previa"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setIsFullScreenPreview(true)}
                      className="flex items-center gap-1 rounded bg-[#c5a059]/20 px-2 py-0.5 text-[10px] font-semibold text-[#f4e2b8] hover:bg-[#c5a059]/40 transition-colors"
                      title="Agrandar a Full Screen"
                    >
                      <Maximize2 className="h-3 w-3" />
                      <span>Full Screen</span>
                    </button>
                  </div>
                </div>
                <div className="flex-1 w-full bg-white relative">
                  <iframe
                    key={`split-preview-${previewKey}`}
                    title="Live Split Preview"
                    srcDoc={compiledPreviewHtml}
                    className="h-full w-full border-none bg-white"
                    sandbox="allow-scripts allow-modals allow-same-origin allow-forms"
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Tab 1: Terminal Logs View (DEFAULT TAB) */}
              {activeTab === 'terminal' && (
                <div className="flex h-full flex-col overflow-y-auto bg-[#040805] p-3 sm:p-4 font-mono-code text-xs leading-relaxed terminal-grid">
                  {terminalLogs.map((log, i) => (
                    <div key={i} className="mb-2">
                      {log.type === 'input' && (
                        <div className="text-[#f4e2b8] font-semibold">{log.text}</div>
                      )}
                      {log.type === 'stdout' && (
                        <div className="whitespace-pre-wrap text-[#98e6a5]">{log.text}</div>
                      )}
                      {log.type === 'stderr' && (
                        <div className="whitespace-pre-wrap text-red-400 font-semibold">{log.text}</div>
                      )}
                      {log.type === 'system' && (
                        <div className="whitespace-pre-wrap text-[#d8b66f]/90 italic">{log.text}</div>
                      )}
                      {log.type === 'thinking' && (
                        <div className="flex items-start gap-1.5 text-[#c5a059] bg-[#c5a059]/10 p-2 rounded border border-[#c5a059]/20">
                          <Brain className="h-4 w-4 shrink-0 text-[#f4e2b8] animate-pulse" />
                          <div className="whitespace-pre-wrap text-[11px]">{log.text}</div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Quick Shortcut Buttons in Terminal after generation */}
                  <div className="my-2 flex flex-wrap items-center gap-2 pt-2 border-t border-[#c5a059]/15">
                    <button
                      onClick={() => setActiveTab('preview')}
                      className="flex items-center gap-1.5 rounded-lg border border-[#c5a059]/30 bg-[#c5a059]/15 px-3 py-1 text-[11px] font-semibold text-[#f4e2b8] hover:bg-[#c5a059]/30 transition-all"
                    >
                      <Eye className="h-3 w-3 text-[#c5a059]" />
                      <span>Abrir Vista Previa</span>
                    </button>
                    <button
                      onClick={() => setIsFullScreenPreview(true)}
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/30 transition-all"
                    >
                      <Maximize2 className="h-3 w-3" />
                      <span>Agrandar a Full Screen</span>
                    </button>
                    <button
                      onClick={() => setIsSplitView(true)}
                      className="flex items-center gap-1.5 rounded-lg border border-[#c5a059]/20 bg-white/5 px-3 py-1 text-[11px] text-[#d8b66f] hover:bg-white/10 transition-all"
                    >
                      <Columns className="h-3 w-3" />
                      <span>Vista Dividida (Línea por línea)</span>
                    </button>
                  </div>

                  {isProcessing && (
                    <div className="flex items-center gap-2 text-[#d8b66f] animate-pulse my-2">
                      <Sparkles className="h-3.5 w-3.5 animate-spin text-[#c5a059]" />
                      <span>APS HARD WORK está procesando el flujo de datos...</span>
                    </div>
                  )}
                  <div ref={terminalBottomRef} />
                </div>
              )}

              {/* Tab 2: Code Editor View */}
              {activeTab === 'editor' && (
                <div className="flex h-full flex-col overflow-hidden bg-[#050a07]">
                  {/* Editor status strip */}
                  <div className="flex items-center justify-between border-b border-[#c5a059]/15 bg-[#0a140f] px-3 py-1.5 text-xs font-mono-code text-[#8e9c8c]">
                    <div className="flex items-center gap-2">
                      <FileCode className="h-3.5 w-3.5 text-[#c5a059]" />
                      <span className="text-[#fbf5e8] font-semibold">{currentFile?.filename}</span>
                      <span className="text-[11px] text-[#738271]">
                        ({activeLineCount} líneas de código)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsSplitView(true)}
                        className="flex items-center gap-1 rounded bg-[#c5a059]/15 px-2 py-0.5 text-[11px] text-[#f4e2b8] hover:bg-[#c5a059]/30 transition-all"
                        title="Dividir pantalla para ver la vista previa al mismo tiempo"
                      >
                        <Columns className="h-3 w-3 text-emerald-400" />
                        <span>Vista Dividida con Preview</span>
                      </button>
                      <button
                        onClick={() => setIsFullScreenPreview(true)}
                        className="flex items-center gap-1 rounded bg-[#c5a059]/15 px-2 py-0.5 text-[11px] text-[#f4e2b8] hover:bg-[#c5a059]/30 transition-all"
                      >
                        <Maximize2 className="h-3 w-3" />
                        <span>Full Screen Preview</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-1 overflow-auto p-4 font-mono-code text-xs md:text-sm leading-relaxed text-[#dbe5da]">
                    {/* Line numbers column */}
                    <div className="select-none pr-4 text-right text-[#455243]">
                      {currentFile?.code.split('\n').map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>
                    {/* Code content with instantaneous live sync */}
                    <textarea
                      value={currentFile?.code || ''}
                      onChange={(e) => {
                        const newCode = e.target.value;
                        setFiles((prev) => {
                          const updated = [...prev];
                          if (updated[activeFileIndex]) {
                            updated[activeFileIndex].code = newCode;
                          }
                          return updated;
                        });
                      }}
                      placeholder="// Escribe aquí tu código línea por línea..."
                      spellCheck={false}
                      className="flex-1 resize-none bg-transparent font-mono-code outline-none text-[#e8f0e6] selection:bg-[#c5a059]/30"
                    />
                  </div>
                </div>
              )}

              {/* Tab 3: Live Preview Tab with Full Screen Button */}
              {activeTab === 'preview' && (
                <div className="flex h-full flex-col bg-[#0b1510] overflow-hidden">
                  <div className="flex items-center justify-between border-b border-[#c5a059]/15 bg-[#0a140f] px-3 py-1.5 text-xs font-mono-code">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
                      <span className="text-[#f4e2b8] font-bold">VISTA PREVIA EN VIVO</span>
                      <span className="text-[#8e9c8c] text-[11px] hidden sm:inline">
                        — Sincronizado en tiempo real
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewKey((k) => k + 1)}
                        className="flex items-center gap-1 rounded bg-white/5 px-2 py-1 text-xs text-[#8e9c8c] hover:text-[#f4e2b8] transition-colors"
                        title="Recargar vista previa"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span className="hidden sm:inline">Recargar</span>
                      </button>

                      {/* Requirement 2: Dedicated Full Screen button inside preview */}
                      <button
                        onClick={() => setIsFullScreenPreview(true)}
                        className="flex items-center gap-1.5 rounded-lg border border-[#c5a059]/40 bg-[#c5a059]/25 px-2.5 py-1 text-xs font-semibold text-[#fbf5e8] hover:bg-[#c5a059]/40 active:scale-95 transition-all shadow-sm"
                        title="Agrandar vista previa a pantalla completa"
                      >
                        <Maximize2 className="h-3.5 w-3.5 text-[#f4e2b8]" />
                        <span>Agrandar a Full Screen</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 w-full bg-white relative">
                    <iframe
                      key={`tab-preview-${previewKey}`}
                      title="Preview"
                      srcDoc={compiledPreviewHtml}
                      className="h-full w-full border-none bg-white"
                      sandbox="allow-scripts allow-modals allow-same-origin allow-forms"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom CLI Prompt Input Bar */}
        <div className="border-t border-[#c5a059]/25 bg-[#0a140f] p-2 sm:p-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {/* Uploaded attachments in CLI */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />

          {cliAttachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5 sm:gap-2">
              {cliAttachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-1.5 rounded-md border border-[#c5a059]/30 bg-[#122218] px-2 py-0.5 text-xs text-[#f4e2b8]"
                >
                  <span className="truncate max-w-[100px] sm:max-w-[120px]">{att.name}</span>
                  <button
                    onClick={() =>
                      setCliAttachments((prev) => prev.filter((a) => a.id !== att.id))
                    }
                    className="text-[#8e9c8c] hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-[#c5a059]/30 bg-[#060b08] px-2.5 sm:px-3 py-1.5 sm:py-2 shadow-inner">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg p-1 text-[#8e9c8c] hover:bg-white/10 hover:text-[#d8b66f]"
              title="Adjuntar datos / imágenes para procesar"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            <span className="font-mono-code text-xs font-bold text-[#c5a059] hidden sm:inline shrink-0">
              aps@hardwork:~$
            </span>
            <span className="font-mono-code text-xs font-bold text-[#c5a059] sm:hidden shrink-0">
              ~$
            </span>

            <input
              ref={commandInputRef}
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Orden a la IA (ej: 'crea un juego de snake', 'calculadora')..."
              className="flex-1 min-w-0 bg-transparent font-mono-code text-xs sm:text-sm text-[#f4e2b8] placeholder-[#576954] focus:outline-none"
            />

            <button
              onClick={() => handleExecuteCommand()}
              disabled={isProcessing || !command.trim()}
              className={`flex items-center gap-1 sm:gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-mono-code font-semibold transition-all shrink-0 ${
                command.trim() && !isProcessing
                  ? 'border border-[#c5a059]/50 bg-[#c5a059]/30 text-[#fbf5e8] shadow-sm hover:bg-[#c5a059]/50 hover:scale-105 active:scale-95'
                  : 'text-[#485746] cursor-not-allowed'
              }`}
            >
              <CornerDownLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Enviar Orden</span>
              <span className="sm:hidden">Enviar</span>
            </button>
          </div>
        </div>
      </div>

      {/* REQUIREMENT 2: FULL SCREEN PREVIEW OVERLAY */}
      {isFullScreenPreview && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#070d09] animate-in fade-in duration-200">
          {/* Full Screen Top Control Bar */}
          <div className="flex items-center justify-between border-b border-[#c5a059]/30 bg-[#0c1611] px-3 sm:px-5 py-2.5 sm:py-3 shadow-2xl">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="flex h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] animate-pulse" />
              <div className="flex flex-col">
                <span className="font-serif-luxury text-xs sm:text-sm font-bold text-[#f4e2b8] tracking-wider">
                  VISTA PREVIA — PANTALLA COMPLETA
                </span>
                <span className="text-[10px] text-[#8e9c8c] hidden xs:block">
                  Progreso sincronizado en tiempo real línea por línea
                </span>
              </div>
              <span className="hidden md:inline-block rounded-md border border-[#c5a059]/30 bg-[#c5a059]/15 px-2 py-0.5 text-xs font-mono-code text-[#fbf5e8]">
                {currentFile?.filename || 'index.html'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Responsive viewport selector */}
              <div className="hidden sm:flex items-center rounded-lg border border-[#c5a059]/20 bg-[#060c08] p-0.5 text-xs mr-2">
                <button
                  onClick={() => setPreviewViewport('full')}
                  className={`flex items-center gap-1 rounded px-2 py-1 transition-colors ${
                    previewViewport === 'full'
                      ? 'bg-[#c5a059]/20 text-[#f4e2b8] font-semibold'
                      : 'text-[#8e9c8c] hover:text-[#f4e2b8]'
                  }`}
                  title="100% Pantalla"
                >
                  <Monitor className="h-3 w-3" />
                  <span className="text-[11px]">100%</span>
                </button>
                <button
                  onClick={() => setPreviewViewport('tablet')}
                  className={`flex items-center gap-1 rounded px-2 py-1 transition-colors ${
                    previewViewport === 'tablet'
                      ? 'bg-[#c5a059]/20 text-[#f4e2b8] font-semibold'
                      : 'text-[#8e9c8c] hover:text-[#f4e2b8]'
                  }`}
                  title="Vista Tablet (768px)"
                >
                  <span className="text-[11px]">Tablet</span>
                </button>
                <button
                  onClick={() => setPreviewViewport('mobile')}
                  className={`flex items-center gap-1 rounded px-2 py-1 transition-colors ${
                    previewViewport === 'mobile'
                      ? 'bg-[#c5a059]/20 text-[#f4e2b8] font-semibold'
                      : 'text-[#8e9c8c] hover:text-[#f4e2b8]'
                  }`}
                  title="Vista Móvil (390px)"
                >
                  <Smartphone className="h-3 w-3" />
                  <span className="text-[11px]">Móvil</span>
                </button>
              </div>

              <button
                onClick={() => setPreviewKey((k) => k + 1)}
                className="flex items-center gap-1.5 rounded-lg border border-[#c5a059]/25 bg-[#122218] px-2.5 sm:px-3 py-1.5 text-xs text-[#f4e2b8] hover:bg-[#c5a059]/20 transition-all"
                title="Recargar vista previa"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Recargar</span>
              </button>

              <button
                onClick={() => setIsFullScreenPreview(false)}
                className="flex items-center gap-1.5 rounded-lg border border-[#c5a059]/40 bg-[#c5a059]/25 px-3 py-1.5 text-xs font-semibold text-[#fbf5e8] hover:bg-[#c5a059]/40 active:scale-95 transition-all shadow-md"
                title="Salir de pantalla completa (Esc)"
              >
                <Minimize2 className="h-4 w-4" />
                <span>
                  Salir <span className="hidden sm:inline">de Full Screen</span>
                  <span className="text-[10px] text-[#8e9c8c] font-mono-code ml-1 hidden md:inline">
                    (Esc)
                  </span>
                </span>
              </button>
            </div>
          </div>

          {/* Full Screen Iframe Container with optional viewport container */}
          <div className="flex-1 w-full bg-[#050a07] flex items-center justify-center p-0 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 bg-white ${
                previewViewport === 'mobile'
                  ? 'w-[390px] shadow-2xl border-x border-[#c5a059]/30 rounded-xl my-4 overflow-hidden'
                  : previewViewport === 'tablet'
                  ? 'w-[768px] shadow-2xl border-x border-[#c5a059]/30 rounded-xl my-4 overflow-hidden'
                  : 'w-full'
              }`}
            >
              <iframe
                key={`fullscreen-preview-${previewKey}`}
                title="Preview Fullscreen"
                srcDoc={compiledPreviewHtml}
                className="h-full w-full border-none bg-white"
                sandbox="allow-scripts allow-modals allow-same-origin allow-forms"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
