import React, { useState } from 'react';
import { Brain, ChevronDown, ChevronUp, Sparkles, Clock, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

  if (!thinking && !isActive) return null;

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-[#c5a059]/25 bg-[#0a140f]/70 shadow-lg backdrop-blur-xl">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-medium text-[#c5a059] transition-all hover:bg-[#c5a059]/10"
      >
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-5 w-5 items-center justify-center">
            {isActive ? (
              <>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c5a059]/40 opacity-75" />
                <Brain className="relative h-4 w-4 text-[#d8b66f] animate-pulse" />
              </>
            ) : (
              <Brain className="h-4 w-4 text-[#c5a059]" />
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-serif-luxury tracking-wider text-[#f4e2b8] font-semibold">
              PENSAMIENTO EXTENDIDO
            </span>
            <span className="text-[#a7b3a5] font-mono-code text-[11px]">
              {isActive ? '· Razonando en profundidad...' : '· Análisis completado'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {durationMs && (
            <div className="flex items-center gap-1 text-[11px] font-mono-code text-[#a7b3a5]">
              <Clock className="h-3 w-3 text-[#c5a059]" />
              <span>{(durationMs / 1000).toFixed(1)}s</span>
            </div>
          )}
          {isOpen ? (
            <ChevronUp className="h-3.5 w-3.5 text-[#c5a059]" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-[#c5a059]" />
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
            className="border-t border-[#c5a059]/15 bg-[#060b08]/80 p-4 font-mono-code text-xs leading-relaxed text-[#c2ccbf]"
          >
            {isActive && (
              <div className="mb-3 flex items-center gap-2 text-[11px] text-[#d8b66f]">
                <Sparkles className="h-3.5 w-3.5 animate-spin" />
                <span>Explorando hipótesis deductivas y sintetizando soluciones...</span>
              </div>
            )}
            <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-[#0a120d]/60 p-3 border border-[#c5a059]/10 scrollbar-thin">
              {thinking || 'Iniciando hilo de razonamiento lógico...'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
