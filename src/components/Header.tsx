import React, { useState } from 'react';
import { ApsModelId, InteractionMode, VisualCustomization, UserAccount } from '../types';
import { UserAvatar } from './UserAvatar';
import { ApsLogo } from './ApsLogo';
import {
  MessageSquare,
  Palette,
  ChevronDown,
  Zap,
  Shield,
  Flame,
  FileText,
  PlusCircle,
  Code2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  currentModel: ApsModelId;
  onSelectModel: (model: ApsModelId) => void;
  interactionMode?: InteractionMode;
  onSelectInteractionMode?: (mode: InteractionMode) => void;
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

  return (
    <header className="relative z-30 flex flex-col w-full border-b border-white/10 backdrop-blur-xl bg-black/40">
      {/* Top Row: Hamburger, Model Selector, CODIGO / CHAT switcher, User */}
      <div className="flex w-full items-center justify-between px-2 sm:px-4 py-2 sm:py-2.5 md:px-8 gap-1.5 sm:gap-3">
        {/* LEFT: Hamburger + MODELO APS... Card */}
        <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
          {/* Hamburger / Menu Button replaced with Compact APS Logo as instructed */}
          <button
            onClick={onOpenSidebar}
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 hover:border-[color:var(--accent)]/40 hover:shadow-[0_0_15px_color-mix(in_srgb,var(--accent)_30%,transparent)] transition-all shadow-md active:scale-95 group p-1.5 shrink-0"
            title="Abrir menú APS"
          >
            <ApsLogo
              variant="compact"
              glow
              className="h-full w-full object-contain group-hover:scale-110 transition-transform duration-200"
            />
          </button>

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
                  className="absolute left-0 top-full mt-2 w-64 sm:w-72 overflow-hidden rounded-2xl border border-[color:var(--accent)]/30 bg-[color:var(--surface-1)]/95 p-2 shadow-2xl backdrop-blur-2xl z-50"
                >
                  <div className="p-2 border-b border-white/10 text-[10px] font-mono-code uppercase tracking-wider text-[color:var(--accent)]">
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
                            ? 'border border-[color:var(--accent)]/40 bg-[color:var(--accent)]/25 text-[color:var(--text-primary)]'
                            : 'text-[color:var(--text-secondary)] hover:bg-white/5 hover:text-[color:var(--accent-soft)]'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-[color:var(--accent)] mt-0.5" />
                        <div>
                          <span className="font-serif-luxury text-xs font-bold block text-[color:var(--accent-soft)]">
                            {m.label}
                          </span>
                          <span className="text-[10px] text-[color:var(--text-secondary)] block">{m.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* CENTER: Full APS Logo on larger screens + Solo CODIGO o CHAT Selector */}
        <div className="flex items-center gap-4">
          <div className="hidden xl:flex items-center">
            <ApsLogo variant="full" glow size={34} />
          </div>
          <div className="flex items-center rounded-2xl border border-white/20 bg-black/70 p-1 shadow-2xl backdrop-blur-2xl shrink-0">
          <button
            onClick={() => onSelectView('chat')}
            className={`flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-5 py-1.5 text-xs sm:text-sm font-serif-luxury font-bold tracking-wider transition-all duration-300 ${
              activeView === 'chat'
                ? 'bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-2)] text-black shadow-lg shadow-cyan-500/20 scale-105'
                : 'text-[color:var(--text-secondary)] hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>CHAT</span>
          </button>

          <button
            onClick={() => {
              onSelectView('cli');
              onSelectModel('APS HARD WORK');
              if (onSelectInteractionMode) {
                onSelectInteractionMode('code');
              }
            }}
            className={`flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-5 py-1.5 text-xs sm:text-sm font-serif-luxury font-bold tracking-wider transition-all duration-300 ${
              activeView === 'cli'
                ? 'bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-2)] text-black shadow-lg shadow-cyan-500/20 scale-105'
                : 'text-[color:var(--text-secondary)] hover:text-white hover:bg-white/5'
            }`}
          >
            <Code2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>CODIGO</span>
          </button>
        </div>
      </div>

        {/* RIGHT: Actions, Studio Customizer, Terms & User Avatar */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* New Session Button */}
          <button
            onClick={onNewChat}
            className="hidden lg:flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-[color:var(--accent-soft)] hover:bg-white/15 transition-all shadow-sm"
            title="Nueva conversación limpia"
          >
            <PlusCircle className="h-3.5 w-3.5 text-[color:var(--accent)]" />
            <span>Nueva</span>
          </button>

          {/* Visual Customization Studio Button */}
          <button
            onClick={onOpenCustomizer}
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-[color:var(--accent)]/40 bg-[color:var(--accent)]/15 text-[color:var(--accent-soft)] hover:bg-[color:var(--accent)]/30 hover:scale-105 transition-all shadow-md active:scale-95"
            title="Personalizar cualquier aspecto visual"
          >
            <Palette className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[color:var(--accent)]" />
          </button>

          {/* Terms & Conditions quick button */}
          <button
            onClick={onOpenTerms}
            className="hidden md:flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-[color:var(--text-secondary)] hover:bg-white/10 hover:text-white transition-all shadow-sm"
            title="Términos y condiciones + Cookies"
          >
            <FileText className="h-4 w-4" />
          </button>

          {/* User Circular Profile Avatar */}
          <button
            onClick={onOpenAuth}
            className="group relative flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-[color:var(--surface-4)] to-[color:var(--surface-1)] text-white shadow-xl transition-transform hover:scale-105 active:scale-95"
            title={currentUser ? `Perfil: ${currentUser.name}` : 'Iniciar Sesión / Registro'}
          >
            <UserAvatar
              avatar={currentUser?.avatar}
              name={currentUser?.name}
              isAdmin={currentUser?.isAdmin}
              size="sm"
            />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full border-2 border-black bg-emerald-400" />
          </button>
        </div>
      </div>
    </header>
  );
};
