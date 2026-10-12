import React, { useState } from 'react';
import { ApsModelId, InteractionMode, VisualCustomization, UserAccount } from '../types';
import {
  Menu,
  MessageSquare,
  Terminal,
  User,
  Palette,
  Sparkles,
  ChevronDown,
  Zap,
  Shield,
  Flame,
  FileText,
  PlusCircle,
  Code2,
  Smile,
  Briefcase,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  currentModel: ApsModelId;
  onSelectModel: (model: ApsModelId) => void;
  interactionMode: InteractionMode;
  onSelectInteractionMode: (mode: InteractionMode) => void;
  activeView: 'chat' | 'cli';
  onSelectView: (view: 'chat' | 'cli') => void;
  customization: VisualCustomization;
  currentUser: UserAccount | null;
  onOpenAuth: () => void;
  onOpenCustomizer: () => void;
  onOpenTerms: () => void;
  onOpenSidebar: () => void;
  onNewChat: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentModel,
  onSelectModel,
  interactionMode,
  onSelectInteractionMode,
  activeView,
  onSelectView,
  customization,
  currentUser,
  onOpenAuth,
  onOpenCustomizer,
  onOpenTerms,
  onOpenSidebar,
  onNewChat,
}) => {
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  const models: { id: ApsModelId; label: string; desc: string; icon: any }[] = [
    {
      id: 'APS INSTANT',
      label: 'APS INSTANT',
      desc: 'Flash Lite · Latencia ultrabaja y síntesis inmediata',
      icon: Zap,
    },
    {
      id: 'APS PRO',
      label: 'APS PRO',
      desc: 'Flash · Multimodal equilibrado y profundo',
      icon: Shield,
    },
    {
      id: 'APS HARD WORK',
      label: 'APS HARD WORK',
      desc: 'Pro · Razonamiento deductivo y código de producción',
      icon: Flame,
    },
  ];

  const modes: { id: InteractionMode; label: string; shortLabel: string; icon: any }[] = [
    { id: 'code', label: 'Modo Código', shortLabel: 'Código', icon: Code2 },
    { id: 'teens', label: 'Modo Adolescentes', shortLabel: 'Adolescentes', icon: Smile },
    { id: 'adults', label: 'Modo Adultos', shortLabel: 'Adultos', icon: Briefcase },
  ];

  return (
    <header className="relative z-30 flex flex-col w-full border-b border-white/10 backdrop-blur-xl bg-black/40">
      {/* Top Row: Hamburger, Model Selector, Chat/Co-work, User */}
      <div className="flex w-full items-center justify-between px-2 sm:px-4 py-2 sm:py-2.5 md:px-8 gap-1.5 sm:gap-3">
        {/* LEFT: Hamburger + MODELO APS... Card */}
        <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
          {/* Hamburger Menu & Chats Recientes Pill */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={onOpenSidebar}
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-[#fbf5e8] hover:bg-white/15 hover:border-white/30 transition-all shadow-md active:scale-95"
              title="Abrir panel lateral de chats recientes"
            >
              <Menu className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </button>

            <button
              onClick={onOpenSidebar}
              className="hidden md:inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-mono-code font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #a29bfe 0%, #6c5ce7 50%, #e84393 100%)',
              }}
              title="Ver historial de conversaciones"
            >
              <MessageSquare className="h-3 w-3" />
              <span>CHATS RECIENTES</span>
            </button>
          </div>

          {/* Big Rounded 'MODELO APS...' Card */}
          <div className="relative">
            <button
              onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
              className="group flex items-center gap-1.5 sm:gap-3 rounded-xl sm:rounded-2xl px-2.5 py-1 sm:px-4 sm:py-2 text-left shadow-2xl transition-all duration-300 hover:brightness-110 active:scale-95 border border-white/20"
              style={{
                background: customization.modelSelectorGradient,
              }}
            >
              <div className="flex flex-col">
                <span className="font-serif-luxury text-[8px] sm:text-[10px] font-bold tracking-widest text-emerald-200 uppercase">
                  MODELO
                </span>
                <span className="font-serif-luxury text-xs sm:text-base font-extrabold tracking-wider text-white drop-shadow-md whitespace-nowrap">
                  {currentModel}
                </span>
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 sm:h-4 sm:w-4 text-white transition-transform duration-200 shrink-0 ${
                  modelDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Model Selector Dropdown */}
            <AnimatePresence>
              {modelDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.18 }}
                  className="absolute left-0 top-full mt-2 w-64 sm:w-72 overflow-hidden rounded-2xl border border-[#c5a059]/30 bg-[#09110c]/95 p-2 shadow-2xl backdrop-blur-2xl z-50"
                >
                  <div className="p-2 border-b border-white/10 text-[10px] font-mono-code uppercase tracking-wider text-[#c5a059]">
                    Seleccionar Inteligencia APS
                  </div>
                  {models.map((m) => {
                    const Icon = m.icon;
                    const isSelected = currentModel === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          onSelectModel(m.id);
                          setModelDropdownOpen(false);
                        }}
                        className={`flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition-all ${
                          isSelected
                            ? 'border border-[#c5a059]/40 bg-[#c5a059]/25 text-[#fbf5e8]'
                            : 'text-[#8e9c8c] hover:bg-white/5 hover:text-[#f4e2b8]'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-[#c5a059] mt-0.5" />
                        <div>
                          <span className="font-serif-luxury text-xs font-bold block text-[#f4e2b8]">
                            {m.label}
                          </span>
                          <span className="text-[10px] text-[#8e9c8c] block">{m.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* CENTER: CHAT | CO-WORK Pill Tab Switcher */}
        <div className="flex items-center rounded-full border border-white/20 bg-black/60 p-0.5 sm:p-1 shadow-inner backdrop-blur-xl shrink-0">
          <button
            onClick={() => onSelectView('chat')}
            className={`flex items-center gap-1 sm:gap-1.5 rounded-full px-2.5 sm:px-5 py-1 sm:py-1.5 text-[11px] sm:text-xs font-serif-luxury font-bold tracking-wider transition-all duration-300 ${
              activeView === 'chat'
                ? 'bg-gradient-to-r from-[#d4af37] to-[#e67e22] text-[#070c09] shadow-lg scale-105'
                : 'text-[#8e9c8c] hover:text-white'
            }`}
          >
            <MessageSquare className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>CHAT</span>
          </button>

          <button
            onClick={() => {
              onSelectView('cli');
              if (currentModel !== 'APS HARD WORK') {
                onSelectModel('APS HARD WORK');
              }
            }}
            className={`flex items-center gap-1 sm:gap-1.5 rounded-full px-2.5 sm:px-5 py-1 sm:py-1.5 text-[11px] sm:text-xs font-serif-luxury font-bold tracking-wider transition-all duration-300 ${
              activeView === 'cli'
                ? 'bg-gradient-to-r from-[#d4af37] to-[#e67e22] text-[#070c09] shadow-lg scale-105'
                : 'text-[#8e9c8c] hover:text-white'
            }`}
          >
            <Terminal className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="hidden xs:inline sm:inline">CO-WORK</span>
            <span className="xs:hidden sm:hidden">CLI</span>
          </button>
        </div>

        {/* RIGHT: Actions, Studio Customizer, Terms & User Avatar */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* New Session Button */}
          <button
            onClick={onNewChat}
            className="hidden lg:flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-[#f4e2b8] hover:bg-white/15 transition-all shadow-sm"
            title="Nueva conversación limpia"
          >
            <PlusCircle className="h-3.5 w-3.5 text-[#c5a059]" />
            <span>Nueva</span>
          </button>

          {/* Visual Customization Studio Button */}
          <button
            onClick={onOpenCustomizer}
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-[#c5a059]/40 bg-[#c5a059]/15 text-[#f4e2b8] hover:bg-[#c5a059]/30 hover:scale-105 transition-all shadow-md active:scale-95"
            title="Personalizar cualquier aspecto visual"
          >
            <Palette className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#c5a059]" />
          </button>

          {/* Terms & Conditions quick button */}
          <button
            onClick={onOpenTerms}
            className="hidden md:flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-[#8e9c8c] hover:bg-white/10 hover:text-white transition-all shadow-sm"
            title="Términos y condiciones + Cookies"
          >
            <FileText className="h-4 w-4" />
          </button>

          {/* User Circular Profile Avatar */}
          <button
            onClick={onOpenAuth}
            className="group relative flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full border-2 border-white/40 bg-gradient-to-br from-[#2c3e50] to-[#000000] text-white shadow-xl transition-transform hover:scale-105 active:scale-95"
            title={currentUser ? `Perfil: ${currentUser.name}` : 'Iniciar Sesión / Registro'}
          >
            {currentUser?.avatar ? (
              <span className="text-base sm:text-xl">{currentUser.avatar}</span>
            ) : (
              <User className="h-4 w-4 sm:h-5 sm:w-5 text-white/90" />
            )}
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full border-2 border-black bg-emerald-400" />
          </button>
        </div>
      </div>

      {/* Sub-Header Bar: 3 INTERACTION MODES (Código, Adolescentes, Adultos) */}
      <div className="flex items-center justify-between border-t border-white/10 bg-black/50 px-2 sm:px-4 py-1.5 md:px-8 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 sm:gap-2 mx-auto sm:mx-0">
          <span className="text-[10px] font-mono-code uppercase tracking-wider text-[#a7b3a5] mr-1 hidden sm:inline">
            Modo de Interacción:
          </span>
          <div className="flex items-center rounded-xl border border-white/15 bg-black/60 p-0.5 shadow-sm">
            {modes.map((m) => {
              const Icon = m.icon;
              const isActive = interactionMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => onSelectInteractionMode(m.id)}
                  className={`flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#00cec9] to-[#0984e3] text-black shadow-md scale-105'
                      : 'text-[#8e9c8c] hover:text-white'
                  }`}
                  title={`Cambiar a ${m.label}`}
                >
                  <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="hidden sm:inline">{m.label}</span>
                  <span className="sm:hidden">{m.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Small Active Mode Summary Badge on desktop */}
        <div className="hidden lg:flex text-[11px] font-mono-code text-[#00cec9] items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#00cec9] animate-pulse" />
          <span>
            {interactionMode === 'code'
              ? 'Enfocado en Software Engineering'
              : interactionMode === 'teens'
              ? 'Tono Joven, Empático & Dinámico'
              : 'Tono Profesional, Ejecutivo & Maduro'}
          </span>
        </div>
      </div>
    </header>
  );
};
