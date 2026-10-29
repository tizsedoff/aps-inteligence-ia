import { PlanConfig, PlanId, UserAccount, UserUsage } from '../types';

export const APS_PLANS: Record<PlanId, PlanConfig> = {
  basic: {
    id: 'basic',
    name: 'APS Basic',
    limit: 50,
    monthlyLimit: 50,
    period: 'day',
    price: 0,
    priceLabel: 'Gratis',
    badge: '50 MSGS / DÍA',
    description: 'Para consultas diarias y uso personal continuo con modelos estándar.',
    unlocksHardWork: false,
    features: [
      '50 mensajes / día',
      'Modelos APS Instant y APS Pro',
      'Memoria de conversación continua',
      'APS Hard Work bloqueado',
    ],
  },
  advanced: {
    id: 'advanced',
    name: 'APS Advanced',
    limit: 25,
    monthlyLimit: 25,
    period: 'month',
    price: 25,
    priceLabel: '$25 / mes',
    badge: 'DESBLOQUEA HARD WORK',
    description: 'Desbloquea el motor de razonamiento APS HARD WORK y desarrollo de software.',
    unlocksHardWork: true,
    features: [
      '25 mensajes / mes',
      'Desbloquea APS HARD WORK',
      'Consola de desarrollo CLI con sandbox',
      'Pensamiento extendido profundo',
    ],
  },
  pro: {
    id: 'pro',
    name: 'APS Pro',
    limit: 50,
    monthlyLimit: 50,
    period: 'month',
    price: 50,
    priceLabel: '$50 / mes',
    badge: '50 MSGS / MES',
    description: 'Mayor cuota de ejecución, todos los modelos y máxima velocidad.',
    unlocksHardWork: true,
    features: [
      '50 mensajes / mes',
      'Todos los modelos desbloqueados',
      'Consola CLI y soporte de archivos',
      'Prioridad de cálculo en horas pico',
    ],
  },
  promax: {
    id: 'promax',
    name: 'APS Pro Max',
    limit: 120,
    monthlyLimit: 120,
    period: 'month',
    price: 120,
    priceLabel: '$120 / mes',
    badge: '120 MSGS / MES · VIP',
    description: 'Máximo límite de peticiones y prioridad VIP para ingenieros y proyectos intensivos.',
    unlocksHardWork: true,
    features: [
      '120 mensajes / mes',
      'Acceso total ilimitado a APS Hard Work',
      'Capacidad máxima de procesamiento',
      'Inferencia prioritaria sin demoras',
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
