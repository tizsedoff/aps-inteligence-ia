import { supabase } from './supabase';

/** fetch hacia /api con la sesión de Supabase en la cabecera Authorization. */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (data.session?.access_token) headers.set('Authorization', `Bearer ${data.session.access_token}`);
  return fetch(input, { ...init, headers });
}

/** Mensaje comprensible a partir de una respuesta de error del servidor. */
export async function apiErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.clone().json();
    if (body && typeof body.error === 'string') return body.error;
  } catch {
    /* sin cuerpo JSON */
  }
  if (res.status === 401) return 'Iniciá sesión para continuar.';
  if (res.status === 429) return 'Llegaste al límite de uso de tu plan.';
  return `Error del servidor (${res.status}).`;
}
