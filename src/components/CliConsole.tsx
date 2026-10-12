import React, { useState, useRef, useEffect } from 'react';
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
  FolderOpen,
  Cpu,
  CornerDownLeft,
  X,
  Code2,
  Brain,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Helper to construct fully bundled and self-contained preview HTML for multi-file projects
function buildCombinedPreviewHtml(allFiles: CliFile[], activeFile?: CliFile): string {
  const htmlFile =
    allFiles.find((f) => f.filename.endsWith('.html') || f.filename === 'index.html') ||
    (activeFile && activeFile.filename.endsWith('.html') ? activeFile : null);

  if (htmlFile) {
    let combined = htmlFile.code;

    // Collect all CSS files
    const cssFiles = allFiles.filter((f) => f.filename.endsWith('.css'));
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
      (f) => (f.filename.endsWith('.js') || f.filename.endsWith('.ts')) && !f.filename.endsWith('.d.ts')
    );
    if (jsFiles.length > 0) {
      const scriptsBundle = jsFiles
        .map((j) => {
          // Strip basic TS types for browser sandbox
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
    pre { background: #0c1611; border: 1px solid rgba(197, 160, 89, 0.2); padding: 16px; border-radius: 8px; color: #98e6a5; overflow: auto; font-size: 0.8rem; font-family: monospace; }
  </style>
</head>
<body>
  <h2>APS HARD WORK — Vista de Código (${activeFile?.filename || 'archivo'})</h2>
  <p>Para ver una interfaz gráfica en vivo, pídele a la IA una orden como: <em>"Crea un juego de Snake en HTML"</em> o <em>"Haz una calculadora interactiva"</em>.</p>
  <pre>${codeToDisplay.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body>
</html>`;
}

interface CliConsoleProps {
  initialCode?: string;
  initialLang?: string;
}

export const CliConsole: React.FC<CliConsoleProps> = ({
  initialCode,
  initialLang = 'typescript',
}) => {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'terminal' | 'preview'>('editor');
  const [copied, setCopied] = useState(false);

  // Files in workspace
  const [files, setFiles] = useState<CliFile[]>([
    {
      filename: 'main.js',
      language: 'javascript',
      code: `// APS INTELLIGENCE — APS HARD WORK CLI
// Consola de desarrollo y generación de código en tiempo real

class DataProcessor {
  constructor(name = 'Motor APS') {
    this.name = name;
    this.records = [];
  }

  add(item) {
    this.records.push({ item, time: Date.now() });
    console.log(\`[\${this.name}] Registro agregado: \${JSON.stringify(item)}\`);
  }

  summary() {
    console.log(\`[\${this.name}] Total procesados: \${this.records.length} elementos\`);
    return this.records.length;
  }
}

const processor = new DataProcessor('APS Hard Work');
processor.add({ id: 1, metric: 'Latencia Óptima', status: 'OK' });
processor.add({ id: 2, metric: 'Concurrencia', status: '100% Activa' });
processor.summary();
console.log('✔ Consola lista para recibir órdenes. Escribe abajo lo que quieres que cree la IA.');
`,
      description: 'Módulo principal inicial',
    },
  ]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  // Terminal logs
  const [terminalLogs, setTerminalLogs] = useState<
    { type: 'input' | 'stdout' | 'stderr' | 'system' | 'thinking'; text: string; time: string }[]
  >([
    {
      type: 'system',
      text: 'APS HARD WORK — CLI DEVELOPMENT ENGINE v3.8 INICIADO\nEscribe cualquier orden en la consola (ej: "crea un juego de snake", "haz una calculadora", "escribe un algoritmo") y la IA escribirá y compilará el código de inmediato.',
      time: new Date().toLocaleTimeString(),
    },
  ]);

  // Uploaded files in CLI
  const [cliAttachments, setCliAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const terminalBottomRef = useRef<HTMLDivElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs]);

  // When initialCode changes from outside
  useEffect(() => {
    if (initialCode) {
      const existingIdx = files.findIndex((f) => f.filename === 'imported_snippet.ts');
      if (existingIdx !== -1) {
        const updated = [...files];
        updated[existingIdx].code = initialCode;
        setFiles(updated);
        setActiveFileIndex(existingIdx);
      } else {
        setFiles((prev) => [
          ...prev,
          {
            filename: `snippet_${Date.now().toString().slice(-4)}.${initialLang === 'python' ? 'py' : 'ts'}`,
            language: initialLang,
            code: initialCode,
            description: 'Código importado desde la conversación',
          },
        ]);
        setActiveFileIndex(files.length);
      }
      setActiveTab('editor');
    }
  }, [initialCode, initialLang]);

  const addLog = (
    type: 'input' | 'stdout' | 'stderr' | 'system' | 'thinking',
    text: string
  ) => {
    setTerminalLogs((prev) => [
      ...prev,
      { type, text, time: new Date().toLocaleTimeString() },
    ]);
  };

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
    const defaultName = `archivo_${files.length + 1}.js`;
    const newFile: CliFile = {
      filename: defaultName,
      language: 'javascript',
      code: `// ${defaultName}\n// Escribe tu código o pídele a la IA en la consola abajo que lo desarrolle\n`,
      description: 'Nuevo archivo en blanco',
    };
    setFiles((prev) => [...prev, newFile]);
    setActiveFileIndex(files.length);
    setActiveTab('editor');
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

  // Run the current active file in simulated / real JS sandbox
  const executeActiveCode = () => {
    const currentFile = files[activeFileIndex];
    if (!currentFile) return;

    // If it's a web document (HTML), switch to preview automatically!
    if (
      currentFile.code.includes('<!DOCTYPE') ||
      currentFile.code.includes('<html') ||
      currentFile.code.includes('<body') ||
      currentFile.filename.endsWith('.html')
    ) {
      setActiveTab('preview');
      addLog('input', `preview ${currentFile.filename}`);
      addLog('system', `✔ Archivo web interactivo '${currentFile.filename}' renderizado en la pestaña Vista Previa.`);
      return;
    }

    setActiveTab('terminal');
    addLog('input', `run ${currentFile.filename}`);
    addLog('system', `Compilando y ejecutando '${currentFile.filename}' en sandbox virtual...`);

    const startTime = performance.now();

    // Check if it's JS/TS executable in browser
    try {
      const capturedLogs: string[] = [];
      const fakeConsole = {
        log: (...args: any[]) => capturedLogs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
        error: (...args: any[]) => capturedLogs.push('[ERROR] ' + args.map(String).join(' ')),
        warn: (...args: any[]) => capturedLogs.push('[WARN] ' + args.map(String).join(' ')),
        info: (...args: any[]) => capturedLogs.push('[INFO] ' + args.map(String).join(' ')),
      };

      // Strip exports, imports, and TypeScript syntax for browser sandbox execution
      let executable = currentFile.code
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
      addLog(
        'system',
        `✔ Ejecución finalizada en ${elapsed}ms con código de salida 0.`
      );
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
    setIsProcessing(true);

    // Handle internal commands locally
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
    if (rawCmd === 'editor') {
      setActiveTab('editor');
      setIsProcessing(false);
      return;
    }
    if (rawCmd === 'help') {
      addLog(
        'system',
        `Comandos de APS HARD WORK CLI:
  <cualquier orden>          Escribe cualquier orden en lenguaje natural para que la IA escriba código
  run                        Ejecuta el archivo actual en el sandbox de tiempo real
  preview                    Muestra el render interactivo (si es HTML/React)
  editor                     Abre el editor de código con numeración de líneas
  clear                      Limpia la consola`
      );
      setIsProcessing(false);
      return;
    }

    try {
      addLog('thinking', 'Pensamiento extendido: Interpretando orden del usuario y escribiendo código...');

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

        // Add or update generated files
        if (result.generatedFiles && result.generatedFiles.length > 0) {
          const firstNew = result.generatedFiles[0];
          setFiles((prev) => {
            const next = [...prev];
            result.generatedFiles.forEach((newFile) => {
              const idx = next.findIndex((f) => f.filename === newFile.filename);
              if (idx !== -1) {
                next[idx] = newFile;
              } else {
                next.push(newFile);
              }
            });
            return next;
          });

          // If visual web document, switch directly to preview!
          if (
            firstNew.filename.endsWith('.html') ||
            firstNew.code.includes('<!DOCTYPE') ||
            firstNew.code.includes('<html') ||
            firstNew.code.includes('<canvas')
          ) {
            setActiveTab('preview');
            addLog('system', `🚀 Abriendo Vista Previa interactiva para '${firstNew.filename}'...`);
          } else {
            setActiveTab('editor');
            addLog('system', `📝 Archivo '${firstNew.filename}' listo en el Editor de código.`);
          }
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

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-3 md:p-6">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-[#c5a059]/30 bg-[#070d09]/95 shadow-2xl backdrop-blur-2xl">
        {/* Top Liquid Chrome Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-[#c5a059]/20 bg-[#0c1611]/90 px-4 py-2.5 gap-2">
          {/* Left: Engine Badge & File Tabs */}
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-2 pr-2 border-r border-[#c5a059]/20">
              <span className="flex h-2.5 w-2.5 rounded-full bg-[#c5a059] shadow-[0_0_8px_#c5a059]" />
              <span className="font-serif-luxury text-xs font-bold tracking-wider text-[#f4e2b8]">
                APS HARD WORK CLI
              </span>
            </div>

            {/* File Tabs */}
            <div className="flex items-center gap-1.5">
              {files.map((file, idx) => (
                <div
                  key={file.filename}
                  onClick={() => {
                    setActiveFileIndex(idx);
                    setActiveTab('editor');
                  }}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono-code transition-all cursor-pointer ${
                    activeFileIndex === idx
                      ? 'border border-[#c5a059]/40 bg-[#c5a059]/20 text-[#fbf5e8] shadow-sm font-semibold'
                      : 'text-[#8e9c8c] hover:bg-white/5 hover:text-[#d8b66f]'
                  }`}
                >
                  <FileCode className="h-3.5 w-3.5 text-[#c5a059]" />
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
                className="flex items-center gap-1 rounded-lg border border-dashed border-[#c5a059]/30 px-2 py-1 text-[11px] font-mono-code text-[#c5a059] hover:bg-[#c5a059]/10 transition-colors"
                title="Crear nuevo archivo en el workspace"
              >
                <span>+ Nuevo</span>
              </button>
            </div>
          </div>

          {/* Right: View Toggles & Actions */}
          <div className="flex items-center gap-2">
            {/* View switcher */}
            <div className="flex items-center rounded-lg border border-[#c5a059]/20 bg-[#060c08] p-0.5 text-xs">
              <button
                onClick={() => setActiveTab('editor')}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-all ${
                  activeTab === 'editor'
                    ? 'bg-[#c5a059]/20 text-[#f4e2b8] font-medium'
                    : 'text-[#8e9c8c] hover:text-[#f4e2b8]'
                }`}
              >
                <Code2 className="h-3.5 w-3.5" />
                <span>Editor</span>
              </button>
              <button
                onClick={() => setActiveTab('terminal')}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-all ${
                  activeTab === 'terminal'
                    ? 'bg-[#c5a059]/20 text-[#f4e2b8] font-medium'
                    : 'text-[#8e9c8c] hover:text-[#f4e2b8]'
                }`}
              >
                <TerminalIcon className="h-3.5 w-3.5" />
                <span>Consola ({terminalLogs.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-all ${
                  activeTab === 'preview'
                    ? 'bg-[#c5a059]/20 text-[#f4e2b8] font-medium'
                    : 'text-[#8e9c8c] hover:text-[#f4e2b8]'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Vista Previa</span>
              </button>
            </div>

            {/* Run Button */}
            <button
              onClick={executeActiveCode}
              className="flex items-center gap-1.5 rounded-lg border border-[#c5a059]/40 bg-gradient-to-r from-[#c5a059]/30 to-emerald-600/30 px-3 py-1 text-xs font-serif-luxury font-semibold text-[#fbf5e8] shadow-sm hover:brightness-110 active:scale-95 transition-all"
              title="Ejecutar archivo en sandbox de tiempo real"
            >
              <Play className="h-3 w-3 fill-current text-[#f4e2b8]" />
              <span>Ejecutar</span>
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

        {/* Quick Command Suggestions Strip */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-[#c5a059]/10 bg-[#08100c]/70 px-4 py-1.5 text-xs font-mono-code scrollbar-none">
          <span className="text-[10px] text-[#738271] uppercase tracking-wider">Órdenes sugeridas:</span>
          {[
            'Crea un juego de Snake clásico en HTML con Canvas',
            'Crea una calculadora interactiva con historial y diseño elegante',
            'Haz una aplicación de notas con localStorage',
            'Crea un cronómetro interactivo con vueltas',
            'Crea un juego de Pong con IA enemiga',
            'Escribe un algoritmo de QuickSort y BinarySearch',
            'run',
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
          {/* Tab 1: Code Editor View */}
          {activeTab === 'editor' && (
            <div className="flex h-full flex-col overflow-hidden bg-[#050a07]">
              <div className="flex flex-1 overflow-auto p-4 font-mono-code text-xs md:text-sm leading-relaxed text-[#dbe5da]">
                {/* Line numbers column */}
                <div className="select-none pr-4 text-right text-[#455243]">
                  {currentFile?.code.split('\n').map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                {/* Code content */}
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
                  spellCheck={false}
                  className="flex-1 resize-none bg-transparent font-mono-code outline-none text-[#e8f0e6] selection:bg-[#c5a059]/30"
                />
              </div>
            </div>
          )}

          {/* Tab 2: Terminal Logs View */}
          {activeTab === 'terminal' && (
            <div className="flex h-full flex-col overflow-y-auto bg-[#040805] p-4 font-mono-code text-xs leading-relaxed terminal-grid">
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
              {isProcessing && (
                <div className="flex items-center gap-2 text-[#d8b66f] animate-pulse">
                  <Sparkles className="h-3.5 w-3.5 animate-spin" />
                  <span>APS HARD WORK está procesando el flujo de datos...</span>
                </div>
              )}
              <div ref={terminalBottomRef} />
            </div>
          )}

          {/* Tab 3: Live Preview Tab (HTML / React Sandboxed Viewer) */}
          {activeTab === 'preview' && (
            <div className="flex h-full flex-col bg-[#0b1510] overflow-auto">
              <iframe
                title="Preview"
                srcDoc={buildCombinedPreviewHtml(files, currentFile)}
                className="h-full w-full border-none bg-white"
                sandbox="allow-scripts allow-modals"
              />
            </div>
          )}
        </div>

        {/* Bottom CLI Prompt Input Bar */}
        <div className="border-t border-[#c5a059]/25 bg-[#0a140f] p-3">
          {/* Uploaded attachments in CLI */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />

          {cliAttachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {cliAttachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-1.5 rounded-md border border-[#c5a059]/30 bg-[#122218] px-2 py-0.5 text-xs text-[#f4e2b8]"
                >
                  <span className="truncate max-w-[120px]">{att.name}</span>
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

          <div className="flex items-center gap-2 rounded-xl border border-[#c5a059]/30 bg-[#060b08] px-3 py-2 shadow-inner">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg p-1 text-[#8e9c8c] hover:bg-white/10 hover:text-[#d8b66f]"
              title="Adjuntar datos / imágenes para procesar"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            <span className="font-mono-code text-xs font-bold text-[#c5a059]">
              aps@hardwork:~$
            </span>

            <input
              ref={commandInputRef}
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe una orden a la IA (ej: 'crea un juego de snake', 'haz una calculadora', 'agrega X')..."
              className="flex-1 bg-transparent font-mono-code text-xs md:text-sm text-[#f4e2b8] placeholder-[#576954] focus:outline-none"
            />

            <button
              onClick={() => handleExecuteCommand()}
              disabled={isProcessing || !command.trim()}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-mono-code font-semibold transition-all ${
                command.trim() && !isProcessing
                  ? 'border border-[#c5a059]/50 bg-[#c5a059]/30 text-[#fbf5e8] shadow-sm hover:bg-[#c5a059]/50 hover:scale-105 active:scale-95'
                  : 'text-[#485746] cursor-not-allowed'
              }`}
            >
              <CornerDownLeft className="h-3.5 w-3.5" />
              <span>Enviar Orden</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
