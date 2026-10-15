import React from 'react';
import { ApsModelId, UserAccount } from '../types';
import { ApsLogo } from './ApsLogo';
import {
  MessageSquare,
  Trash2,
  PlusCircle,
  Palette,
  FileText,
  Cookie,
  User,
  Zap,
  Shield,
  Flame,
  X,
  LogOut,
  Brain,
} from 'lucide-react';

interface SessionItem {
  id: string;
  title: string;
  timestamp: number;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SessionItem[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onNewChat: () => void;
  currentModel: ApsModelId;
  onSelectModel: (model: ApsModelId) => void;
  currentUser: UserAccount | null;
  onOpenAuth: () => void;
  onOpenCustomizer: () => void;
  onOpenTerms: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onNewChat,
  currentModel,
  onSelectModel,
  currentUser,
  onOpenAuth,
  onOpenCustomizer,
  onOpenTerms,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative z-10 flex h-full w-84 max-w-[85vw] flex-col border-r border-white/15 bg-[color:var(--surface-0)]/95 p-5 shadow-2xl backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <ApsLogo variant="full" />
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-[color:var(--text-secondary)] hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <button
          onClick={() => {
            onNewChat();
            onClose();
          }}
          className="my-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 py-2.5 text-xs font-semibold text-[color:var(--accent-soft)] hover:bg-white/15 transition-all shadow-sm"
        >
          <PlusCircle className="h-4 w-4 text-[color:var(--accent)]" />
          <span>Nueva Conversación</span>
        </button>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          <span className="text-[10px] font-mono-code uppercase tracking-wider text-[color:var(--accent)] block mb-1">
            Historial de Ideas
          </span>

          {sessions.length === 0 ? (
            <div className="py-8 text-center text-xs text-[color:var(--text-muted)]">
              No hay conversaciones guardadas.
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-all ${
                  s.id === currentSessionId
                    ? 'border border-[color:var(--accent)]/40 bg-[color:var(--accent)]/15 text-white font-semibold shadow-sm'
                    : 'text-[color:var(--text-secondary)] hover:bg-white/5 hover:text-white'
                }`}
              >
                <button
                  onClick={() => {
                    onSelectSession(s.id);
                    onClose();
                  }}
                  className="flex flex-1 items-center gap-2.5 truncate text-left"
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 text-[color:var(--accent)]" />
                  <span className="truncate">{s.title || 'Idea sin título'}</span>
                </button>
                <button
                  onClick={() => onDeleteSession(s.id)}
                  className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-[color:var(--text-secondary)] hover:text-red-400 active:scale-95 transition-opacity"
                  title="Eliminar conversación"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Quick Tools & Settings Footer */}
        <div className="border-t border-white/10 pt-4 space-y-2">
          {/* User profile button */}
          <button
            onClick={() => {
              onOpenAuth();
              onClose();
            }}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-sm">
                {currentUser?.avatar || <User className="h-3.5 w-3.5" />}
              </div>
              <div className="text-left">
                <span className="font-semibold block truncate max-w-[130px]">
                  {currentUser?.name || 'Iniciar Sesión'}
                </span>
                <span className="text-[10px] text-[color:var(--text-secondary)] block">
                  {currentUser ? 'Cuenta Activa' : 'Acceso & Registro'}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono-code text-[color:var(--accent)]">Ver</span>
          </button>

          {/* Customizer Studio */}
          <button
            onClick={() => {
              onOpenCustomizer();
              onClose();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white hover:bg-white/10 transition-colors"
          >
            <Palette className="h-4 w-4 text-[color:var(--accent)]" />
            <span>Personalizar Estilo Visual</span>
          </button>

          {/* Terms & Cookies */}
          <button
            onClick={() => {
              onOpenTerms();
              onClose();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white hover:bg-white/10 transition-colors"
          >
            <FileText className="h-4 w-4 text-[color:var(--accent)]" />
            <span>Términos, Privacidad & Cookies</span>
          </button>
        </div>
      </div>
    </div>
  );
};
