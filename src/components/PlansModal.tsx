import React, { useState } from 'react';
import { UserAccount, PlanId } from '../types';
import {
  APS_PLANS,
  PLANS_LIST,
  getUserPlanId,
  getUserPlan,
  getUserCurrentUsage,
  getCurrentMonthKey,
  getCurrentDayKey,
} from '../constants/plans';
import {
  Sparkles,
  Check,
  CheckCircle2,
  X,
  CreditCard,
  Zap,
  Flame,
  Shield,
  Crown,
  AlertCircle,
  Loader2,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

interface PlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  noticeMessage?: string;
  onUpdateUser: (updated: UserAccount) => void;
}

export const PlansModal: React.FC<PlansModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  noticeMessage,
  onUpdateUser,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [paymentsNotice, setPaymentsNotice] = useState('');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardHolder, setCardHolder] = useState(currentUser?.name || 'Cliente APS');

  if (!isOpen) return null;

  const currentPlanId = getUserPlanId(currentUser);
  const currentPlan = getUserPlan(currentUser);
  const currentUsage = getUserCurrentUsage(currentUser);

  // El plan lo asigna solo el servidor. Mientras no haya pagos reales, solo un administrador puede
  // "comprar" en modo simulado (rpc aps_simulate_purchase, que rechaza a cualquier otro usuario).
  const handleStartCheckout = (planId: PlanId) => {
    if (planId === currentPlanId) return;
    if (!currentUser?.isAdmin) {
      setPaymentsNotice('Los pagos todavía no están habilitados. Cuando lo estén, tu plan se activará automáticamente al confirmar el pago.');
      return;
    }
    setPaymentsNotice('');
    setPaymentSuccess(null);
    setSelectedPlanId(planId);
  };

  const handleConfirmSimulatedPayment = async () => {
    if (!selectedPlanId || !currentUser) return;
    setIsProcessingPayment(true);
    setPaymentsNotice('');
    try {
      const { error } = await supabase.rpc('aps_simulate_purchase', { p_plan: selectedPlanId });
      if (error) throw error;
      const planId = selectedPlanId;
      onUpdateUser({ ...currentUser, plan: planId });
      setPaymentSuccess(APS_PLANS[planId].name);
      window.setTimeout(() => {
        setSelectedPlanId(null);
        setPaymentSuccess(null);
      }, 2500);
    } catch {
      setPaymentsNotice('No se pudo completar la compra simulada. Probá de nuevo.');
      setSelectedPlanId(null);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl border border-[color:var(--accent)]/30 bg-[color:var(--surface-0)] p-4 sm:p-7 shadow-2xl scrollbar-thin text-[color:var(--text-primary)]"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl border border-white/10 bg-white/5 p-2 text-[color:var(--text-secondary)] hover:bg-white/10 hover:text-white transition-colors"
          title="Cerrar modal"
          aria-label="Cerrar modal"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/10 px-3 py-1 text-xs font-mono-code text-[color:var(--accent)]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>SUSCRIPCIÓN Y LÍMITES MENSUALES</span>
          </div>
          <h2 className="font-serif-luxury text-xl sm:text-3xl font-extrabold tracking-wider text-white">
            PLANES DE ACCESO APS
          </h2>
          <p className="text-xs sm:text-sm text-[color:var(--text-secondary)] max-w-xl mx-auto">
            Elige el plan acorde a tu volumen de mensajes mensual. Para desbloquear el modelo{' '}
            <strong className="text-[color:var(--accent)]">APS HARD WORK</strong> y la consola de desarrollo,
            se requiere como mínimo el plan <strong className="text-[color:var(--accent)]">ADVANCED</strong>.
          </p>

          {/* Current Status Badge */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <div className="rounded-xl border border-white/10 bg-[color:var(--surface-1)] px-3 py-1.5 text-xs">
              <span className="text-[color:var(--text-muted)]">Plan actual: </span>
              <strong className="text-[color:var(--accent)]">{currentPlan.name}</strong>
            </div>
            <div className="rounded-xl border border-white/10 bg-[color:var(--surface-1)] px-3 py-1.5 text-xs">
              <span className="text-[color:var(--text-muted)]">
                {currentPlan.period === 'day' ? 'Consumo hoy: ' : 'Consumo este mes: '}
              </span>
              <strong className={currentUsage >= currentPlan.limit ? 'text-amber-400' : 'text-emerald-400'}>
                {`${currentUsage} / ${currentPlan.limit} mensajes`}
              </strong>
            </div>
          </div>
        </div>

        {paymentsNotice && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3.5 text-xs text-[color:var(--text-primary)]">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-300 mt-0.5" />
            <p className="text-[color:var(--text-secondary)] leading-relaxed">{paymentsNotice}</p>
          </div>
        )}

        {/* Alert / Notice if triggered by Hard Work or Quota limit */}
        {noticeMessage && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[color:var(--accent)]/40 bg-[color:var(--accent)]/15 p-3.5 text-xs text-[color:var(--text-primary)]">
            <AlertCircle className="h-5 w-5 shrink-0 text-[color:var(--accent)] mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block text-white font-serif-luxury">Aviso de Requisito de Plan:</span>
              <p className="text-[color:var(--text-secondary)] leading-relaxed">{noticeMessage}</p>
            </div>
          </div>
        )}

        {/* SIMULATED CHECKOUT STEP OVERLAY / DRAWER */}
        <AnimatePresence>
          {selectedPlanId && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden rounded-2xl border border-[color:var(--accent)]/50 bg-[color:var(--surface-2)] p-4 sm:p-6 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-[color:var(--accent)]" />
                  <h3 className="font-serif-luxury text-base sm:text-lg font-bold text-white">
                    Pasarela de Pago Simulada · {APS_PLANS[selectedPlanId].name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedPlanId(null)}
                  className="rounded-lg p-1 text-[color:var(--text-muted)] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {paymentSuccess ? (
                <div className="py-6 text-center space-y-2">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto animate-bounce" />
                  <h4 className="font-serif-luxury text-lg font-bold text-white">
                    ¡Pago Simulado Confirmado con Éxito!
                  </h4>
                  <p className="text-xs text-[color:var(--text-secondary)]">
                    Tu cuenta ha sido actualizada al plan <strong>{paymentSuccess}</strong>. Se ha desbloqueado tu cuota de mensajes y capacidades correspondientes.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[color:var(--surface-1)] p-3 text-xs">
                    <div>
                      <span className="text-[color:var(--text-muted)] block">
                        {APS_PLANS[selectedPlanId].period === 'day' ? 'Límite de uso:' : 'Suscripción mensual:'}
                      </span>
                      <strong className="text-white text-sm sm:text-base font-serif-luxury">
                        {APS_PLANS[selectedPlanId].name} · {APS_PLANS[selectedPlanId].limit} mensajes / {APS_PLANS[selectedPlanId].period === 'day' ? 'día' : 'mes'}
                      </strong>
                    </div>
                    <div className="text-right">
                      <span className="text-[color:var(--text-muted)] block">Total simulado:</span>
                      <strong className="text-[color:var(--accent)] text-base sm:text-lg">
                        {APS_PLANS[selectedPlanId].priceLabel}
                      </strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[11px] font-mono-code text-[color:var(--text-secondary)] block mb-1">
                        Tarjeta de prueba (Simulada)
                      </label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/50 p-2.5 font-mono-code text-xs text-white outline-none focus:border-[color:var(--accent)]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono-code text-[color:var(--text-secondary)] block mb-1">
                        Titular
                      </label>
                      <input
                        type="text"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/50 p-2.5 text-xs text-white outline-none focus:border-[color:var(--accent)]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono-code text-[color:var(--text-muted)]">
                    <Shield className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>Modo Sandbox de desarrollo: No se realizará ningún débito ni cobro real.</span>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => setSelectedPlanId(null)}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-[color:var(--text-secondary)] hover:bg-white/10 hover:text-white transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleConfirmSimulatedPayment}
                      disabled={isProcessingPayment}
                      className="flex items-center gap-2 rounded-xl border border-white/20 bg-gradient-to-r from-[color:var(--accent)] via-[color:var(--accent-2)] to-[color:var(--accent)] px-5 py-2.5 text-xs font-bold text-black shadow-lg hover:brightness-110 active:scale-95 transition-all"
                    >
                      {isProcessingPayment ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Procesando pago simulado...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4" />
                          <span>Confirmar Pago Simulado ({APS_PLANS[selectedPlanId].priceLabel})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4 PLANS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS_LIST.map((plan) => {
            const isCurrent = currentPlanId === plan.id;
            const isTargetSelected = selectedPlanId === plan.id;
            const unlocksHardWork = plan.unlocksHardWork;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-2xl border p-4 sm:p-5 transition-all ${
                  isCurrent
                    ? 'border-[color:var(--accent)] bg-[color:var(--accent)]/15 shadow-xl shadow-[color:var(--accent)]/10 ring-1 ring-[color:var(--accent)]/40'
                    : isTargetSelected
                    ? 'border-[color:var(--accent)] bg-[color:var(--surface-1)]'
                    : 'border-white/10 bg-[color:var(--surface-1)] hover:border-white/25 hover:bg-[color:var(--surface-2)]'
                }`}
              >
                {/* Plan Badge */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-serif-luxury text-base font-bold text-white">
                      {plan.name}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-mono-code font-bold uppercase ${
                        unlocksHardWork
                          ? 'border border-[color:var(--accent)]/40 bg-[color:var(--accent)]/20 text-[color:var(--accent)]'
                          : 'border border-white/10 bg-white/5 text-[color:var(--text-muted)]'
                      }`}
                    >
                      {plan.badge}
                    </span>
                  </div>

                  {/* Price */}
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-extrabold text-white font-serif-luxury">
                        {plan.price === 0 ? 'Gratis' : `$${plan.price}`}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-xs font-mono-code text-[color:var(--text-muted)]">
                          / mes
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono-code text-[color:var(--accent)] font-semibold mt-0.5">
                      {plan.limit} mensajes / {plan.period === 'day' ? 'día' : 'mes'}
                    </div>
                  </div>

                  <p className="text-xs text-[color:var(--text-secondary)] min-h-[34px] leading-relaxed">
                    {plan.description}
                  </p>

                  {/* Hard Work Indicator */}
                  <div
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                      unlocksHardWork
                        ? 'border border-emerald-500/30 bg-emerald-950/30 text-emerald-300'
                        : 'border border-red-500/20 bg-red-950/20 text-red-300'
                    }`}
                  >
                    {unlocksHardWork ? (
                      <>
                        <Flame className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span>APS Hard Work Desbloqueado</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-3.5 w-3.5 text-red-400 shrink-0" />
                        <span>APS Hard Work Bloqueado</span>
                      </>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="space-y-2 pt-2 border-t border-white/5 text-xs text-[color:var(--text-secondary)]">
                    {plan.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 shrink-0 text-[color:var(--accent)] mt-0.5" />
                        <span className="leading-snug">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Action Button */}
                <div className="pt-5 mt-4 border-t border-white/10">
                  {isCurrent ? (
                    <div className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-emerald-400 font-mono-code">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>PLAN ACTIVO</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStartCheckout(plan.id)}
                      className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 text-xs font-bold transition-all shadow-md active:scale-95 ${
                        plan.id === 'advanced'
                          ? 'border border-[color:var(--accent)]/50 bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-2)] text-black hover:brightness-110'
                          : 'border border-white/20 bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {plan.price === 0 ? (
                        <span>Cambiar a Basic</span>
                      ) : (
                        <>
                          <Zap className="h-3.5 w-3.5" />
                          <span>Activar ({plan.priceLabel})</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-[11px] text-[color:var(--text-muted)] font-mono-code">
          <span>APS Basic renueva 50 mensajes cada día. Los planes avanzados renuevan mensualmente.</span>
          <span className="text-[color:var(--accent)]">
            {currentUser?.isAdmin ? 'Modo simulado (solo administradores) · sin cobro real' : 'Pagos próximamente · APS INTELLIGENCE'}
          </span>
        </div>
      </motion.div>
    </div>
  );
};
