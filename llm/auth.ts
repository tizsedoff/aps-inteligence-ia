// Protección de los endpoints de IA: cada pedido debe venir de un usuario verificado por
// Supabase, respetar su plan y descontar del límite de uso. Falla cerrado: si algo no se
// puede verificar, el pedido se rechaza (nunca se deja pasar "por las dudas").
import { createClient } from '@supabase/supabase-js';
import type { NextFunction, Request, Response } from 'express';

export interface ApsAuth {
  userId: string;
  plan: string;
  isAdmin: boolean;
  used: number;
  limit: number | null;
  period: 'day' | 'month' | null;
}

export interface RequireUserOptions {
  /** Cuánto descuenta del límite este pedido (0 = solo exige sesión). */
  cost: number;
  /** 'model': exige plan superior solo si piden APS HARD WORK; 'always': siempre. */
  hardWork?: 'model' | 'always';
}

function config() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    key: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function requireUser(opts: RequireUserOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { url, key } = config();
    if (!url || !key) {
      return res.status(503).json({ error: 'El servidor todavía no está configurado. Reintentá más tarde.' });
    }

    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) {
      return res.status(401).json({ error: 'Iniciá sesión para usar APS.' });
    }

    try {
      const client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      });

      const { data: userData, error: userErr } = await client.auth.getUser(token);
      if (userErr || !userData?.user) {
        return res.status(401).json({ error: 'Tu sesión venció. Volvé a iniciar sesión.' });
      }
      const userId = userData.user.id;

      const { data: profile, error: profErr } = await client
        .from('aps_profiles')
        .select('plan, is_admin')
        .eq('id', userId)
        .maybeSingle();
      if (profErr) {
        return res.status(503).json({ error: 'No se pudo verificar tu cuenta. Reintentá en un momento.' });
      }
      const plan = profile?.plan || 'basic';
      const isAdmin = profile?.is_admin === true;

      const needsHardWork =
        opts.hardWork === 'always' || (opts.hardWork === 'model' && req.body?.model === 'APS HARD WORK');
      if (needsHardWork && !isAdmin && plan === 'basic') {
        return res.status(403).json({ error: 'APS Hard Work requiere un plan superior al básico.' });
      }

      let used = 0;
      let limit: number | null = null;
      let period: ApsAuth['period'] = null;
      if (opts.cost > 0) {
        const { data, error } = await client.rpc('aps_consume_usage', { cost: opts.cost });
        if (error || !data) {
          return res.status(503).json({ error: 'No se pudo verificar tu uso. Reintentá en un momento.' });
        }
        used = data.used ?? 0;
        limit = data.limit ?? null;
        period = data.period ?? null;
        if (data.allowed !== true) {
          const when = period === 'day' ? 'de hoy' : 'de este mes';
          return res.status(429).json({
            error: `Llegaste al límite ${when} de tu plan (${limit} usos). ${
              period === 'day' ? 'Se renueva mañana.' : 'Se renueva el mes próximo.'
            }`,
          });
        }
      }

      (req as Request & { aps?: ApsAuth }).aps = { userId, plan, isAdmin, used, limit, period };
      return next();
    } catch (e) {
      console.error('requireUser error:', e instanceof Error ? e.message : e);
      return res.status(503).json({ error: 'No se pudo verificar tu sesión. Reintentá en un momento.' });
    }
  };
}
