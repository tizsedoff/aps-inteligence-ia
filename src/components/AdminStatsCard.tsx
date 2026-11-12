import React, { useEffect, useState } from 'react';
import { Users, RefreshCw } from 'lucide-react';
import { fetchAdminStats, AdminStats } from '../lib/accounts';

const PLAN_LABEL: Record<string, string> = { basic: 'Basic', advanced: 'Plus', pro: 'Pro', promax: 'Max' };

/** Números de la plataforma, solo para administradores (la base de datos rechaza a cualquier otro). */
export const AdminStatsCard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const s = await fetchAdminStats();
    setStats(s);
    setFailed(!s);
    setLoading(false);
  };
  useEffect(() => {
    void load();
  }, []);

  const n = (v: number) => v.toLocaleString('es-AR');

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-left">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-300">
          <Users className="h-4 w-4" />
          <span>Usuarios de APS</span>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Actualizar números"
          className="rounded-lg p-1 text-amber-300/80 hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {failed && <p className="text-xs text-amber-200/80">No se pudieron leer los números. Probá actualizar.</p>}

      {stats && (
        <>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold leading-none text-white">{n(stats.total_users)}</span>
            <span className="pb-0.5 text-xs text-[color:var(--text-secondary)]">usuarios registrados</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] text-[color:var(--text-secondary)]">
            <div className="rounded-lg bg-black/30 py-2">
              <div className="text-base font-bold text-white">{n(stats.new_24h)}</div>nuevos 24 h
            </div>
            <div className="rounded-lg bg-black/30 py-2">
              <div className="text-base font-bold text-white">{n(stats.new_7d)}</div>nuevos 7 d
            </div>
            <div className="rounded-lg bg-black/30 py-2">
              <div className="text-base font-bold text-white">{n(stats.active_24h)}</div>activos 24 h
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[color:var(--text-secondary)]">
            {Object.entries(stats.by_plan).map(([plan, count]) => (
              <span key={plan}>
                {PLAN_LABEL[plan] || plan}: <b className="text-white">{n(count)}</b>
              </span>
            ))}
          </div>
          <div className="mt-2 text-[11px] text-[color:var(--text-secondary)]">
            Usos de hoy en toda la plataforma:{' '}
            <b className="text-white">
              {n(stats.global_used_today)}
              {stats.global_cap > 0 ? ` / ${n(stats.global_cap)}` : ''}
            </b>
            {stats.global_cap === 0 && ' (sin tope)'}
          </div>
        </>
      )}
    </div>
  );
};
