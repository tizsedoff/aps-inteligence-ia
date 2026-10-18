import React, { useState } from 'react';
import { Brain, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LiquidOrb, useElapsedSeconds } from './LoadingStates';

interface ThinkingDrawerProps {
  thinking: string;
  isActive?: boolean;
  durationMs?: number;
}

export const ThinkingDrawer: React.FC<ThinkingDrawerProps> = ({
  thinking,
  isActive = false,
  durationMs,
}) => {
  const [isOpen, setIsOpen] = useState(isActive);
  const elapsed = useElapsedSeconds(isActive);

  if (!thinking && !isActive) return null;

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-[color:var(--accent)]/25 bg-[color:var(--surface-1)]/70 shadow-lg backdrop-blur-xl">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-medium text-[color:var(--accent)] transition-all hover:bg-[color:var(--accent)]/10"
      >
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-5 w-5 items-center justify-center">
            {isActive ? (
              <LiquidOrb className="aps-orb-sm" />
            ) : (
              <Brain className="h-4 w-4 text-[color:var(--accent)]" />
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-serif-luxury text-[color:var(--accent-soft)] font-semibold text-xs sm:text-[13px]">
              Pensamiento extendido
            </span>
            <span className="hidden sm:inline text-[color:var(--text-secondary)] text-[11px]">
              {isActive ? 'Razonando en profundidad' : 'Análisis completado'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isActive ? (
            <div className="flex items-center gap-1 text-[11px] font-mono-code text-[color:var(--text-secondary)]">
              <Clock className="h-3 w-3 text-[color:var(--accent)]" />
              <span>{elapsed} s</span>
            </div>
          ) : durationMs ? (
            <div className="flex items-center gap-1 text-[11px] font-mono-code text-[color:var(--text-secondary)]">
              <Clock className="h-3 w-3 text-[color:var(--accent)]" />
              <span>{(durationMs / 1000).toFixed(1)} s</span>
            </div>
          ) : null}
          {isOpen ? (
            <ChevronUp className="h-3.5 w-3.5 text-[color:var(--accent)]" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-[color:var(--accent)]" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="border-t border-[color:var(--accent)]/15 bg-[color:var(--surface-0)]/80 p-4 font-mono-code text-xs leading-relaxed text-[color:var(--text-secondary)]"
          >
            {isActive && (
              <div className="mb-3 flex items-center gap-2 text-[11px] text-[color:var(--accent-hover)]">
                <span>Explorando posibilidades y armando la respuesta</span>
                <span className="aps-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            )}
            <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-[color:var(--surface-1)]/60 p-3 border border-[color:var(--accent)]/10 scrollbar-thin">
              {thinking || 'Iniciando hilo de razonamiento lógico...'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
