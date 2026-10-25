import { createClient } from '@supabase/supabase-js';

// Solo claves públicas (publishable): la seguridad real la dan las políticas RLS de la base.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && key);

export const supabase = createClient(url || 'http://localhost:54321', key || 'sin-configurar', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

export const SUPABASE_CONFIG_ERROR =
  'Falta configurar Supabase (VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY).';
