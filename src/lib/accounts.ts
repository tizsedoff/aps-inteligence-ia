import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { APS_PLANS } from '../constants/plans';
import type { MemoryItem, PlanId, UserAccount } from '../types';

interface ProfileRow {
  id: string;
  email: string;
  name: string;
  avatar: string;
  plan: PlanId;
  is_admin: boolean;
  custom_instructions: string;
}

interface MemoryRow {
  id: string;
  fact: string;
  category: MemoryItem['category'];
  source: 'user' | 'auto';
  created_at: string;
}

const toMemory = (r: MemoryRow): MemoryItem => ({
  id: r.id,
  fact: r.fact,
  category: r.category,
  source: r.source,
  timestamp: new Date(r.created_at).getTime(),
});

function cachedUsage(userId: string) {
  try {
    const raw = localStorage.getItem('aps_current_user') || sessionStorage.getItem('aps_current_user');
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && parsed.id === userId ? parsed.usage : undefined;
  } catch {
    return undefined;
  }
}

async function readProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase.from('aps_profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return (data as ProfileRow | null) ?? null;
}

/** Arma la cuenta de la app a partir de la sesión de Supabase. */
export async function fetchAccount(authUser: User): Promise<UserAccount> {
  let profile = await readProfile(authUser.id);
  if (!profile) {
    // Cuentas anteriores a APS en el mismo proyecto: se crea su perfil al entrar.
    await supabase.rpc('aps_ensure_profile');
    profile = await readProfile(authUser.id);
  }
  if (!profile) throw new Error('No se pudo cargar tu perfil.');

  const { data: mems } = await supabase
    .from('aps_memories')
    .select('id, fact, category, source, created_at')
    .order('created_at', { ascending: false });

  const planId: PlanId = APS_PLANS[profile.plan] ? profile.plan : 'basic';
  return {
    id: profile.id,
    name: profile.name || 'Usuario',
    email: profile.email,
    avatar: profile.avatar || '',
    isAdmin: profile.is_admin,
    plan: planId,
    membership: profile.is_admin ? 'ADMINISTRADOR SUPREMO' : APS_PLANS[planId].name,
    customInstructions: profile.custom_instructions || '',
    memories: ((mems as MemoryRow[]) || []).map(toMemory),
    usage: cachedUsage(profile.id),
  };
}

export async function updateProfileFields(
  userId: string,
  patch: { name?: string; avatar?: string; customInstructions?: string }
): Promise<boolean> {
  const row: Record<string, string> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.avatar !== undefined) row.avatar = patch.avatar;
  if (patch.customInstructions !== undefined) row.custom_instructions = patch.customInstructions;
  const { error } = await supabase.from('aps_profiles').update(row).eq('id', userId);
  if (error) console.warn('No se pudo guardar el perfil:', error.message);
  return !error;
}

/** Deja en la base exactamente la lista de memorias recibida (agrega, actualiza y borra). */
export async function syncMemories(userId: string, list: MemoryItem[]): Promise<boolean> {
  try {
    const { data: existing, error: e1 } = await supabase.from('aps_memories').select('id');
    if (e1) throw e1;
    const keep = new Set(list.map((m) => m.id));
    const toDelete = ((existing as { id: string }[]) || []).map((r) => r.id).filter((id) => !keep.has(id));
    if (toDelete.length) {
      const { error } = await supabase.from('aps_memories').delete().in('id', toDelete);
      if (error) throw error;
    }
    if (list.length) {
      const rows = list.map((m) => ({
        id: m.id,
        user_id: userId,
        fact: m.fact.slice(0, 500),
        category: m.category,
        source: m.source || 'user',
        created_at: new Date(m.timestamp || Date.now()).toISOString(),
      }));
      const { error } = await supabase.from('aps_memories').upsert(rows);
      if (error) throw error;
    }
    return true;
  } catch (e) {
    console.warn('No se pudieron sincronizar las memorias:', e);
    return false;
  }
}

/** Traduce los errores de Supabase Auth a mensajes comprensibles. */
export function translateAuthError(err: { message?: string; code?: string; status?: number } | null): string {
  const msg = (err?.message || '').toLowerCase();
  const code = err?.code || '';
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials'))
    return 'Correo o contraseña incorrectos.';
  if (code === 'user_already_exists' || msg.includes('already registered'))
    return 'Este correo ya está registrado. Iniciá sesión o usá otro correo.';
  if (code === 'weak_password' || msg.includes('password should be'))
    return 'La contraseña debe tener al menos 6 caracteres.';
  if (code === 'email_not_confirmed') return 'Confirmá tu correo antes de entrar.';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || err?.status === 429)
    return 'Demasiados intentos. Esperá unos minutos y reintentá.';
  if (code === 'signup_disabled') return 'El registro está deshabilitado por ahora.';
  if (code === 'email_address_invalid' || msg.includes('invalid email'))
    return 'El formato del correo no es válido.';
  if (msg.includes('failed to fetch') || msg.includes('network'))
    return 'No hay conexión con el servidor. Revisá tu internet.';
  return err?.message || 'Ocurrió un error. Reintentá.';
}
