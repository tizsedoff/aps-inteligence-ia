import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LiquidOrb, useElapsedSeconds } from './LoadingStates';

interface ThinkingDrawerProps {
  thinking: string;
  isActive?: boolean;
  durationMs?: number;
}

/**
 * Estado de razonamiento: una línea liviana ("Pensando… 4 s"), sin cajas.
 * Si el modelo envía texto de razonamiento, se puede desplegar; si no, no hay nada que abrir.
 */
export const ThinkingDrawer: React.FC<ThinkingDrawerProps> = ({
  thinking,
  isActive = false,
  durationMs,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const elapsed = useElapsedSeconds(isActive);

  if (!thinking && !isActive) return null;

  const canOpen = !!thinking;
  const label = isActive
    ? 'Pensando'
    : durationMs
    ? `Pensó durante ${durationMs >= 10000 ? Math.round(durationMs / 1000) : (durationMs / 1000).toFixed(1)} s`
    : 'Razonamiento';

  const header = (
    <>
      {isActive ? (
        <LiquidOrb className="aps-orb-sm" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-white/70" aria-hidden="true" />
      )}
      <span
        className={`text-[13px] ${
          isActive ? 'text-white' : 'text-white/80'
        }`}
      >
        {label}
      </span>
      {isActive && (
        <>
          <span className="aps-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          {elapsed >= 3 && (
            <span className="font-mono-code text-[11px] text-white/70">{elapsed} s</span>
          )}
        </>
      )}
      {canOpen && (
        <ChevronRight
          className={`h-3.5 w-3.5 text-white/70 transition-transform ${isOpen ? 'rotate-90' : ''}`}
        />
      )}
    </>
  );

  return (
    <div className={isActive ? 'mb-0.5' : 'mb-3'} role={isActive ? 'status' : undefined} aria-live={isActive ? 'polite' : undefined}>
      {canOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen((o) => !o)}
          aria-expanded={isOpen}
          className="flex items-center gap-2 rounded-lg py-1 pr-2 text-left transition-colors hover:text-white"
        >
          {header}
        </button>
      ) : (
        <div className="flex items-center gap-2 py-1">{header}</div>
      )}

      <AnimatePresence initial={false}>
        {canOpen && isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mt-1.5 max-h-56 overflow-y-auto whitespace-pre-wrap break-words border-l-2 border-white/40 pl-3 text-[12.5px] leading-relaxed text-white/85 scrollbar-thin">
              {thinking}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
