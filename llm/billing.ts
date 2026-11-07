// Cobro de suscripciones con Mercado Pago. Queda APAGADO hasta que estén cargadas las 4 variables
// de entorno (ver billingConfig). Sin ellas, /api/billing/checkout responde 503 y no se cobra nada.
//
// Estado de verificación: la lógica propia (precios del lado del servidor, firma del webhook,
// confirmación contra la API, activación del plan) está probada con simulaciones. Los formatos de
// Mercado Pago (cuerpo de /preapproval y encabezado x-signature) están escritos según su
// documentación pública y NO se probaron contra su servidor: hay que probarlos con credenciales de
// prueba antes de habilitar cobros reales.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { Express, Request, Response } from 'express';
import { requireUser } from './auth.ts';

const MP_API = 'https://api.mercadopago.com';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Precios en USD. Son los mismos que src/constants/plans.ts; el cliente nunca decide el monto. */
export const BILLING_PLANS = {
  advanced: { name: 'APS Plus', usd: 15 },
  pro: { name: 'APS Pro', usd: 55 },
  promax: { name: 'APS Max', usd: 60 },
} as const;
export type BillingPlanId = keyof typeof BILLING_PLANS;

export function billingConfig() {
  const accessToken = process.env.MP_ACCESS_TOKEN || '';
  const webhookSecret = process.env.MP_WEBHOOK_SECRET || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const rate = Number(process.env.MP_USD_ARS_RATE || '');
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const publishable = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  const appUrl = (process.env.APS_APP_URL || 'https://aps-inteligence.vercel.app').replace(/\/+$/, '');
  const enabled = !!(accessToken && webhookSecret && serviceKey && url && Number.isFinite(rate) && rate > 0);
  return { enabled, accessToken, webhookSecret, serviceKey, rate, url, publishable, appUrl };
}

/** Monto en pesos a cobrar por mes (entero), con el dólar fijado en MP_USD_ARS_RATE. */
export function priceInArs(plan: BillingPlanId, rate: number): number {
  return Math.round(BILLING_PLANS[plan].usd * rate);
}

/** Valida el encabezado x-signature de Mercado Pago (HMAC-SHA256 del "manifest"). */
export function verifyMpSignature(opts: {
  secret: string;
  signature: string | undefined;
  requestId: string | undefined;
  dataId: string | undefined;
}): boolean {
  const { secret, signature, requestId, dataId } = opts;
  if (!secret || !signature || !dataId) return false;
  const parts = Object.fromEntries(
    signature.split(',').map((p) => {
      const i = p.indexOf('=');
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    })
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;
  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  const manifest = `id:${id};request-id:${requestId ?? ''};ts:${ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function mp(path: string, token: string, init: { method?: string; body?: unknown } = {}) {
  const res = await fetch(`${MP_API}${path}`, {
    method: init.method || 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* sin cuerpo */
  }
  return { ok: res.ok, status: res.status, data };
}

function bearer(req: Request): string {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : '';
}

function userClient(token: string) {
  const c = billingConfig();
  return createClient(c.url, c.publishable, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

function serviceClient() {
  const c = billingConfig();
  return createClient(c.url, c.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Aplica el estado real de una suscripción de Mercado Pago (siempre consultado a su API). */
export async function syncSubscription(preapprovalId: string): Promise<{ ok: boolean; reason?: string }> {
  const c = billingConfig();
  if (!c.enabled) return { ok: false, reason: 'billing_disabled' };
  const r = await mp(`/preapproval/${encodeURIComponent(preapprovalId)}`, c.accessToken);
  if (!r.ok || !r.data) return { ok: false, reason: 'mp_lookup_failed' };

  const [userId, plan] = String(r.data.external_reference || '').split('|');
  if (!UUID_RE.test(userId || '') || !(plan in BILLING_PLANS)) return { ok: false, reason: 'bad_reference' };
  const status = String(r.data.status || '');
  if (!['pending', 'authorized', 'paused', 'cancelled'].includes(status)) return { ok: false, reason: 'unknown_status' };

  // El monto confirmado por Mercado Pago debe ser el que corresponde al plan: nada de planes baratos con precio ajeno.
  const amount = Number(r.data.auto_recurring?.transaction_amount);
  if (status === 'authorized' && amount !== priceInArs(plan as BillingPlanId, c.rate)) {
    // Un cambio del dólar entre el pedido y la confirmación no debe regalar el plan: se tolera hasta ±15%.
    const expected = priceInArs(plan as BillingPlanId, c.rate);
    if (!Number.isFinite(amount) || amount < expected * 0.85) return { ok: false, reason: 'amount_mismatch' };
  }

  const { error } = await serviceClient().rpc('aps_apply_subscription', {
    p_user: userId,
    p_plan: plan,
    p_status: status,
    p_provider_id: String(r.data.id || preapprovalId),
    p_period_end: r.data.next_payment_date || null,
  });
  if (error) return { ok: false, reason: 'db_error' };
  return { ok: true };
}

export function registerBilling(app: Express) {
  // Estado público de pagos + suscripción del usuario.
  app.get('/api/billing/status', requireUser({ cost: 0 }), async (req: Request, res: Response) => {
    const c = billingConfig();
    try {
      const { data } = await userClient(bearer(req))
        .from('aps_subscriptions')
        .select('plan, status, current_period_end')
        .in('status', ['authorized', 'pending'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      res.json({ enabled: c.enabled, subscription: data || null });
    } catch {
      res.json({ enabled: c.enabled, subscription: null });
    }
  });

  // Crea la suscripción en Mercado Pago y devuelve la URL de pago.
  app.post('/api/billing/checkout', requireUser({ cost: 0 }), async (req: Request, res: Response) => {
    const c = billingConfig();
    if (!c.enabled) return res.status(503).json({ error: 'Los pagos todavía no están habilitados.' });

    const plan = req.body?.plan as BillingPlanId;
    if (!plan || !(plan in BILLING_PLANS)) return res.status(400).json({ error: 'Plan inválido.' });

    try {
      const token = bearer(req);
      const client = userClient(token);
      const { data: u } = await client.auth.getUser(token);
      const user = u?.user;
      if (!user?.email) return res.status(401).json({ error: 'Tu sesión venció. Volvé a iniciar sesión.' });

      const { data: active } = await client
        .from('aps_subscriptions')
        .select('id')
        .eq('status', 'authorized')
        .limit(1)
        .maybeSingle();
      if (active) {
        return res.status(409).json({ error: 'Ya tenés una suscripción activa. Cancelala antes de contratar otro plan.' });
      }

      const r = await mp('/preapproval', c.accessToken, {
        method: 'POST',
        body: {
          reason: `${BILLING_PLANS[plan].name} · suscripción mensual`,
          external_reference: `${user.id}|${plan}`,
          payer_email: user.email,
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: priceInArs(plan, c.rate),
            currency_id: 'ARS',
          },
          back_url: `${c.appUrl}/?pago=ok`,
          status: 'pending',
        },
      });
      const url = r.data?.init_point;
      if (!r.ok || typeof url !== 'string') {
        console.error('billing checkout: Mercado Pago respondió', r.status);
        return res.status(502).json({ error: 'No se pudo iniciar el pago. Reintentá en un momento.' });
      }
      return res.json({ url });
    } catch (e) {
      console.error('billing checkout error:', e instanceof Error ? e.message : e);
      return res.status(502).json({ error: 'No se pudo iniciar el pago. Reintentá en un momento.' });
    }
  });

  // Cancela la suscripción activa del usuario.
  app.post('/api/billing/cancel', requireUser({ cost: 0 }), async (req: Request, res: Response) => {
    const c = billingConfig();
    if (!c.enabled) return res.status(503).json({ error: 'Los pagos todavía no están habilitados.' });
    try {
      const { data: sub } = await userClient(bearer(req))
        .from('aps_subscriptions')
        .select('provider_subscription_id')
        .eq('status', 'authorized')
        .limit(1)
        .maybeSingle();
      if (!sub) return res.status(404).json({ error: 'No tenés una suscripción activa.' });

      const r = await mp(`/preapproval/${encodeURIComponent(sub.provider_subscription_id)}`, c.accessToken, {
        method: 'PUT',
        body: { status: 'cancelled' },
      });
      if (!r.ok) return res.status(502).json({ error: 'No se pudo cancelar. Reintentá en un momento.' });
      await syncSubscription(sub.provider_subscription_id);
      return res.json({ ok: true });
    } catch {
      return res.status(502).json({ error: 'No se pudo cancelar. Reintentá en un momento.' });
    }
  });

  // Aviso de Mercado Pago. No se confía en el cuerpo: se valida la firma y se consulta el estado real a su API.
  app.post('/api/billing/webhook', async (req: Request, res: Response) => {
    const c = billingConfig();
    if (!c.enabled) return res.status(503).end();

    const dataId = String(req.query['data.id'] || req.body?.data?.id || '');
    const ok = verifyMpSignature({
      secret: c.webhookSecret,
      signature: req.headers['x-signature'] as string | undefined,
      requestId: req.headers['x-request-id'] as string | undefined,
      dataId: String(req.query['data.id'] || ''),
    });
    if (!ok) return res.status(401).end();

    const type = String(req.query.type || req.body?.type || '');
    if (type === 'subscription_preapproval' && dataId) {
      const r = await syncSubscription(dataId);
      // Si falla algo nuestro, 500 para que Mercado Pago reintente.
      if (!r.ok && ['mp_lookup_failed', 'db_error'].includes(r.reason || '')) return res.status(500).end();
    }
    return res.status(200).end();
  });
}
