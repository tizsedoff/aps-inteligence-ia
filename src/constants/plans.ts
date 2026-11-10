import { PlanConfig, PlanId, UserAccount, UserUsage } from '../types';

export const APS_PLANS: Record<PlanId, PlanConfig> = {
  basic: {
    id: 'basic',
    name: 'APS Basic',
    limit: 15,
    monthlyLimit: 15,
    period: 'day',
    price: 0,
    priceLabel: 'Gratis',
    badge: '15 USOS / DÍA',
    description: 'Para probar APS y resolver consultas del día a día.',
    unlocksHardWork: false,
    features: [
      '15 usos por día',
      'Modelos APS Instant y APS Pro',
      'Memoria de conversación continua',
      'APS Hard Work bloqueado',
    ],
  },
  advanced: {
    id: 'advanced',
    name: 'APS Plus',
    limit: 600,
    monthlyLimit: 600,
    period: 'month',
    price: 15,
    priceLabel: 'US$ 15 / mes',
    badge: '600 USOS / MES',
    description: 'Uso diario cómodo y acceso a APS Hard Work y la consola de código.',
    unlocksHardWork: true,
    features: [
      '600 usos por mes (≈ 20 por día)',
      'Desbloquea APS HARD WORK (5 usos por pedido)',
      'Consola de desarrollo CLI',
      'Imágenes: 3 usos cada una',
    ],
  },
  pro: {
    id: 'pro',
    name: 'APS Pro',
    limit: 1200,
    monthlyLimit: 1200,
    period: 'month',
    price: 55,
    priceLabel: 'US$ 55 / mes',
    badge: '1.200 USOS / MES',
    description: 'Para trabajar con APS todos los días: negocio, código y contenido.',
    unlocksHardWork: true,
    features: [
      '1.200 usos por mes (≈ 40 por día)',
      'APS HARD WORK (5 usos por pedido)',
      'Consola CLI y archivos',
      'Imágenes: 3 usos cada una',
    ],
  },
  promax: {
    id: 'promax',
    name: 'APS Max',
    limit: 4000,
    monthlyLimit: 4000,
    period: 'month',
    price: 60,
    priceLabel: 'US$ 60 / mes',
    badge: '4.000 USOS / MES',
    description: 'Para equipos y proyectos intensivos con el máximo volumen.',
    unlocksHardWork: true,
    features: [
      '4.000 usos por mes (≈ 130 por día)',
      'APS HARD WORK (5 usos por pedido)',
      'Consola CLI y archivos',
      'Imágenes: 3 usos cada una',
    ],
  },
};

export const PLANS_LIST: PlanConfig[] = [
  APS_PLANS.basic,
  APS_PLANS.advanced,
  APS_PLANS.pro,
  APS_PLANS.promax,
];

export function getCurrentDayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getUserPlanId(user?: UserAccount | null): PlanId {
  if (!user) return 'basic';
  if (user.plan && APS_PLANS[user.plan]) return user.plan;

  // Backward compatibility with previous membership strings
  const mem = (user.membership || '').toLowerCase();
  if (mem.includes('max') || mem.includes('ultra')) return 'promax';
  if (mem.includes('pro')) return 'pro';
  if (mem.includes('elite') || mem.includes('advanced')) return 'advanced';
  return 'basic';
}

export function getUserPlan(user?: UserAccount | null): PlanConfig {
  const planId = getUserPlanId(user);
  return APS_PLANS[planId] || APS_PLANS.basic;
}

export function getUserCurrentUsage(user?: UserAccount | null): number {
  if (!user || !user.usage) return 0;
  const plan = getUserPlan(user);

  if (plan.period === 'day') {
    const today = getCurrentDayKey();
    if (user.usage.day !== today) return 0;
    return user.usage.dayCount ?? 0;
  } else {
    const thisMonth = getCurrentMonthKey();
    if (user.usage.month !== thisMonth) return 0;
    return user.usage.monthCount ?? user.usage.count ?? 0;
  }
}

// Kept for backward compatibility
export function getUserMonthlyUsage(user?: UserAccount | null): number {
  return getUserCurrentUsage(user);
}

export function getUpdatedUserUsage(user?: UserAccount | null): UserUsage {
  const today = getCurrentDayKey();
  const thisMonth = getCurrentMonthKey();
  const prev = user?.usage;

  const dayCount = prev?.day === today ? (prev.dayCount ?? 0) + 1 : 1;
  const monthCount = prev?.month === thisMonth ? (prev.monthCount ?? prev.count ?? 0) + 1 : 1;

  return {
    day: today,
    dayCount,
    month: thisMonth,
    monthCount,
    count: monthCount,
  };
}

export function canUserAccessHardWork(user?: UserAccount | null): boolean {
  if (!user) return false;
  if (user.isAdmin) return true;
  const plan = getUserPlan(user);
  return plan.unlocksHardWork;
}

export function isUserQuotaExceeded(user?: UserAccount | null): boolean {
  if (!user) return false;
  const plan = getUserPlan(user);
  const currentUsage = getUserCurrentUsage(user);
  return currentUsage >= plan.limit;
}

/** Texto único para "límite alcanzado": qué pasó, cuándo se renueva y cómo seguir ya. */
export function limitReachedMessage(plan: PlanConfig): string {
  const limit = plan.limit.toLocaleString('es-AR');
  return plan.period === 'day'
    ? `Llegaste al límite de hoy de tu plan ${plan.name} (${limit} usos). Se renueva mañana, o pasá a un plan pago para seguir ahora.`
    : `Llegaste al límite de este mes de tu plan ${plan.name} (${limit} usos). Se renueva el mes próximo, o subí de plan para seguir ahora.`;
}
