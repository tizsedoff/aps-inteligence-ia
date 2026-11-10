// Recorte del historial que se envía al modelo en cada mensaje. Sin tope, una conversación larga
// (o con imágenes) hace cada respuesta más lenta y más cara, y puede superar el límite del pedido.
export const MAX_HISTORY_MESSAGES = 24; // ≈ 12 intercambios
export const MAX_HISTORY_CHARS = 60_000; // ≈ 15.000 tokens de texto
export const KEEP_ATTACHMENTS_IN_LAST = 2; // los adjuntos viejos ya no se reenvían

interface HistoryMessage {
  role: string;
  content?: string;
  attachments?: any[];
}

export function trimHistory<T extends HistoryMessage>(messages: T[]): T[] {
  if (!Array.isArray(messages)) return [];
  let out = messages.slice(-MAX_HISTORY_MESSAGES);

  // Del más nuevo al más viejo, hasta llenar el presupuesto de texto.
  let chars = 0;
  let start = out.length;
  for (let i = out.length - 1; i >= 0; i--) {
    chars += (out[i].content || '').length;
    if (chars > MAX_HISTORY_CHARS) break;
    start = i;
  }
  out = out.slice(start);

  // El historial debe empezar con un mensaje del usuario.
  while (out.length > 0 && out[0].role !== 'user') out = out.slice(1);

  const cutoff = out.length - KEEP_ATTACHMENTS_IN_LAST;
  return out.map((m, i) => (i < cutoff && m.attachments?.length ? { ...m, attachments: undefined } : m));
}
