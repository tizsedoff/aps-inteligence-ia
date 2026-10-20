// Aislamiento del código generado por la IA.
//
// El código generado NUNCA debe correr en el origen de la app: ahí podría leer la sesión
// (localStorage), llamar a Firestore con la cuenta del usuario, etc. Por eso:
//  - la vista previa usa un iframe SIN `allow-same-origin` (origen opaco), y
//  - "run" ejecuta el código en un iframe oculto con la misma restricción.
// Como un origen opaco no puede usar localStorage, se inyecta un reemplazo que guarda los
// datos en la app (en una clave propia, separada de la sesión) para que apps como
// "notas con localStorage" sigan funcionando.

const PREVIEW_STORAGE_KEY = 'aps_preview_storage';
const PREVIEW_STORAGE_MAX_CHARS = 500_000;
export const PREVIEW_STORAGE_MESSAGE = 'aps-preview-storage';

export const PREVIEW_SANDBOX = 'allow-scripts allow-modals allow-forms';

export function loadPreviewStorage(): Record<string, string> {
  try {
    const raw = localStorage.getItem(PREVIEW_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** Valida y guarda lo que manda la vista previa. Devuelve false si se rechaza. */
export function savePreviewStorage(data: unknown): boolean {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (typeof v === 'string') clean[k] = v;
  }
  const serialized = JSON.stringify(clean);
  if (serialized.length > PREVIEW_STORAGE_MAX_CHARS) return false;
  try {
    localStorage.setItem(PREVIEW_STORAGE_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}

// JSON seguro para incrustar dentro de un <script>
const safeJson = (value: unknown) =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

function storageShim(seed: Record<string, string>): string {
  return `<script>(function(){
var seed=${safeJson(seed)};
function make(persist){
  var d=persist?Object.assign({},seed):{};
  function sync(){if(!persist)return;try{parent.postMessage({type:'${PREVIEW_STORAGE_MESSAGE}',data:d},'*');}catch(e){}}
  var api={
    getItem:function(k){k=String(k);return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null;},
    setItem:function(k,v){d[String(k)]=String(v);sync();},
    removeItem:function(k){delete d[String(k)];sync();},
    clear:function(){d={};sync();},
    key:function(i){var ks=Object.keys(d);return i>=0&&i<ks.length?ks[i]:null;}
  };
  Object.defineProperty(api,'length',{get:function(){return Object.keys(d).length;}});
  return api;
}
try{Object.defineProperty(window,'localStorage',{value:make(true),configurable:true});}catch(e){}
try{Object.defineProperty(window,'sessionStorage',{value:make(false),configurable:true});}catch(e){}
})();</script>`;
}

/** Inserta el reemplazo de localStorage lo más arriba posible sin romper el doctype. */
export function injectStorageShim(html: string, seed: Record<string, string>): string {
  const shim = storageShim(seed);
  const head = html.match(/<head[^>]*>/i);
  if (head && head.index !== undefined) {
    const at = head.index + head[0].length;
    return html.slice(0, at) + shim + html.slice(at);
  }
  const root = html.match(/<html[^>]*>/i);
  if (root && root.index !== undefined) {
    const at = root.index + root[0].length;
    return html.slice(0, at) + shim + html.slice(at);
  }
  const doctype = html.match(/<!doctype[^>]*>/i);
  if (doctype && doctype.index !== undefined) {
    const at = doctype.index + doctype[0].length;
    return html.slice(0, at) + shim + html.slice(at);
  }
  return shim + html;
}

export interface SandboxRunResult {
  logs: string[];
  error: string | null;
  ms: number;
  timedOut: boolean;
}

const RUN_TIMEOUT_MS = 5000;
const MAX_LOG_LINES = 500;

/**
 * Ejecuta JavaScript en un iframe oculto de origen opaco y devuelve la consola capturada.
 * Limitación conocida: un bucle síncrono infinito puede congelar la pestaña; el tiempo
 * límite solo cubre código asíncrono que nunca termina.
 */
export function runInSandbox(code: string): Promise<SandboxRunResult> {
  return new Promise((resolve) => {
    const token = `run_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.style.display = 'none';
    iframe.title = 'Ejecución aislada';

    let finished = false;
    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
      iframe.remove();
    };
    const finish = (result: SandboxRunResult) => {
      if (finished) return;
      finished = true;
      cleanup();
      resolve(result);
    };

    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframe.contentWindow) return;
      const d = e.data;
      if (!d || d.type !== 'aps-run-result' || d.token !== token) return;
      finish({
        logs: Array.isArray(d.logs) ? d.logs.slice(0, MAX_LOG_LINES).map(String) : [],
        error: typeof d.error === 'string' ? d.error : null,
        ms: typeof d.ms === 'number' ? d.ms : 0,
        timedOut: false,
      });
    };

    const timer = setTimeout(
      () =>
        finish({
          logs: [],
          error: `Tiempo de ejecución excedido (${RUN_TIMEOUT_MS / 1000}s)`,
          ms: RUN_TIMEOUT_MS,
          timedOut: true,
        }),
      RUN_TIMEOUT_MS
    );
    window.addEventListener('message', onMessage);

    iframe.srcdoc = `<!DOCTYPE html><html><body><script>
var T=${safeJson(token)},CODE=${safeJson(code)},logs=[];
function fmt(a){return Array.prototype.map.call(a,function(x){try{return typeof x==='object'?JSON.stringify(x):String(x);}catch(e){return String(x);}}).join(' ');}
function push(p,a){if(logs.length<${MAX_LOG_LINES})logs.push(p+fmt(a));}
var c={log:function(){push('',arguments);},info:function(){push('[INFO] ',arguments);},warn:function(){push('[WARN] ',arguments);},error:function(){push('[ERROR] ',arguments);}};
var t0=performance.now();
(async function(){
  var err=null;
  try{var AF=Object.getPrototypeOf(async function(){}).constructor;await new AF('console',CODE)(c);}
  catch(e){err=String(e&&e.message?e.message:e);}
  parent.postMessage({type:'aps-run-result',token:T,logs:logs,error:err,ms:performance.now()-t0},'*');
})();
</script></body></html>`;

    document.body.appendChild(iframe);
  });
}
