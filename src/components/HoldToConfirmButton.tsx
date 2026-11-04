import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';

interface HoldToConfirmButtonProps {
  label: string;
  busyLabel: string;
  onConfirm: () => void;
  busy?: boolean;
  disabled?: boolean;
  /** Cuánto hay que mantener presionado, en milisegundos. */
  holdMs?: number;
}

const RADIUS = 14;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Botón de "presionar y mantener": una ruedita muestra el progreso y confirma al completarse. */
export const HoldToConfirmButton: React.FC<HoldToConfirmButtonProps> = ({
  label,
  busyLabel,
  onConfirm,
  busy = false,
  disabled = false,
  holdMs = 1500,
}) => {
  const [progress, setProgress] = useState(0);
  const frame = useRef<number | null>(null);
  const start = useRef<number | null>(null);
  const fired = useRef(false);
  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;

  const cancel = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    start.current = null;
    if (!fired.current) setProgress(0);
  }, []);

  const tick = useCallback(
    (now: number) => {
      if (start.current === null) return;
      const p = Math.min(1, (now - start.current) / holdMs);
      setProgress(p);
      if (p >= 1) {
        fired.current = true;
        frame.current = null;
        start.current = null;
        onConfirmRef.current();
        return;
      }
      frame.current = requestAnimationFrame(tick);
    },
    [holdMs]
  );

  const begin = useCallback(() => {
    if (disabled || busy || start.current !== null) return;
    fired.current = false;
    start.current = performance.now();
    frame.current = requestAnimationFrame(tick);
  }, [disabled, busy, tick]);

  // Cuando termina el procesamiento (o falla), la rueda vuelve a cero.
  useEffect(() => {
    if (!busy) {
      fired.current = false;
      setProgress(0);
    }
  }, [busy]);

  useEffect(() => cancel, [cancel]);

  const dash = CIRCUMFERENCE * (1 - progress);
  const done = progress >= 1;

  return (
    <button
      type="button"
      disabled={disabled || busy}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        begin();
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
          e.preventDefault();
          begin();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === ' ' || e.key === 'Enter') cancel();
      }}
      onContextMenu={(e) => e.preventDefault()}
      style={{ touchAction: 'none', WebkitTouchCallout: 'none', userSelect: 'none' }}
      className="relative flex items-center gap-2.5 overflow-hidden rounded-xl border border-white/20 bg-gradient-to-r from-[color:var(--accent)] via-[color:var(--accent-2)] to-[color:var(--accent)] py-2 pl-3 pr-5 text-xs font-bold text-black shadow-lg transition-all hover:brightness-110 disabled:opacity-70"
    >
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
          <circle cx="18" cy="18" r={RADIUS} fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="3" />
          <circle
            cx="18"
            cy="18"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dash}
          />
        </svg>
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : done ? (
          <Check className="h-4 w-4" />
        ) : (
          <span className="text-[10px] font-mono-code">{Math.round(progress * 100)}%</span>
        )}
      </span>
      <span>{busy ? busyLabel : progress > 0 ? 'Mantené presionado…' : label}</span>
    </button>
  );
};
