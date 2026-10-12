import React, { useState } from 'react';
import { UserAccount } from '../types';
import {
  X,
  User,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  LogOut,
  Camera,
  Check,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  onLogin: (user: UserAccount) => void;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onLogout,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('👑');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const avatarOptions = ['👑', '⚡', '💎', '🦁', '🦅', '🪐', '🛡️', '✨'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (!name.trim()) {
        setError('Por favor ingresa tu nombre o alias');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setError('Por favor ingresa un correo electrónico válido');
        return;
      }
      if (password.length < 4) {
        setError('La contraseña debe tener al menos 4 caracteres');
        return;
      }

      const newUser: UserAccount = {
        id: `usr_${Date.now()}`,
        name: name.trim(),
        email: email.trim(),
        avatar: selectedAvatar,
      };

      localStorage.setItem('aps_user', JSON.stringify(newUser));
      onLogin(newUser);
      onClose();
    } else {
      // Login
      if (!email.trim()) {
        setError('Por favor ingresa tu correo');
        return;
      }
      if (!password) {
        setError('Por favor ingresa tu contraseña');
        return;
      }

      // Check existing or create session
      const savedUserStr = localStorage.getItem('aps_user');
      let user: UserAccount;
      if (savedUserStr) {
        user = JSON.parse(savedUserStr);
      } else {
        const inferredName = email.split('@')[0] || 'Usuario';
        user = {
          id: `usr_${Date.now()}`,
          name: inferredName.charAt(0).toUpperCase() + inferredName.slice(1),
          email: email.trim(),
          avatar: selectedAvatar,
        };
        localStorage.setItem('aps_user', JSON.stringify(user));
      }

      onLogin(user);
      onClose();
    }
  };

  const handleGuestQuickStart = (guestName = 'Tiziano') => {
    const guest: UserAccount = {
      id: `guest_${Date.now()}`,
      name: guestName,
      email: `${guestName.toLowerCase()}@aps.intelligence`,
      avatar: '👑',
    };
    localStorage.setItem('aps_user', JSON.stringify(guest));
    onLogin(guest);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-[#c5a059]/30 bg-[#09110c]/95 p-6 shadow-2xl backdrop-blur-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-xl p-1.5 text-[#8e9c8c] hover:bg-white/10 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* If user is already logged in: Profile View */}
        {currentUser ? (
          <div className="space-y-6 text-center">
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-[#c5a059]/50 bg-gradient-to-br from-[#1b2b20] to-[#0a140f] text-4xl shadow-xl">
              {currentUser.avatar || '👑'}
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#c5a059]/30 to-emerald-500/20 blur-md -z-10" />
            </div>

            <div>
              <h3 className="font-serif-luxury text-xl font-bold tracking-wider text-[#f4e2b8]">
                {currentUser.name}
              </h3>
              <p className="text-xs font-mono-code text-[#8e9c8c]">{currentUser.email}</p>
            </div>

            <div className="rounded-2xl border border-[#c5a059]/20 bg-[#0e1a14]/80 p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between text-[#8e9c8c]">
                <span>Membresía:</span>
                <span className="font-semibold text-[#f4e2b8]">APS INTELLIGENCE PRO</span>
              </div>
              <div className="flex justify-between text-[#8e9c8c]">
                <span>Sesión activa:</span>
                <span className="text-emerald-400 font-mono-code">Autenticado ✔</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  onLogout();
                  localStorage.removeItem('aps_user');
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-950/30 py-2.5 text-xs font-medium text-red-300 hover:bg-red-900/40 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar Sesión</span>
              </button>

              <button
                onClick={onClose}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#c5a059]/50 bg-gradient-to-r from-[#c5a059] to-[#d8b66f] py-2.5 text-xs font-serif-luxury font-bold text-[#070c09] shadow-md hover:brightness-110 transition-all"
              >
                <span>Continuar</span>
              </button>
            </div>
          </div>
        ) : (
          /* Form for Login / Register */
          <div className="space-y-5">
            {/* Logo Badge */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#c5a059]/40 bg-[#16271c] font-serif-luxury text-xs font-bold text-[#f4e2b8] shadow">
                APS
              </div>
              <div>
                <h3 className="font-serif-luxury text-base font-bold tracking-wider text-[#f4e2b8]">
                  {mode === 'login' ? 'INICIAR SESIÓN' : 'CREAR CUENTA'}
                </h3>
                <p className="text-[11px] text-[#8e9c8c]">APS INTELLIGENCE · Acceso Seguro</p>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex rounded-xl border border-[#c5a059]/20 bg-[#070c09] p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
                className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
                  mode === 'login'
                    ? 'border border-[#c5a059]/40 bg-[#c5a059]/25 text-[#fbf5e8] font-bold shadow'
                    : 'text-[#8e9c8c] hover:text-[#d8b66f]'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError('');
                }}
                className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
                  mode === 'register'
                    ? 'border border-[#c5a059]/40 bg-[#c5a059]/25 text-[#fbf5e8] font-bold shadow'
                    : 'text-[#8e9c8c] hover:text-[#d8b66f]'
                }`}
              >
                Registrarse
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-2.5 text-xs text-red-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="text-xs text-[#a7b3a5] block mb-1">Nombre o Alias</label>
                    <div className="relative flex items-center">
                      <User className="absolute left-3 h-4 w-4 text-[#8e9c8c]" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ej. Tiziano"
                        className="w-full rounded-xl border border-[#c5a059]/25 bg-[#0e1913] py-2 pl-9 pr-3 text-xs text-[#f4e2b8] placeholder-[#576654] focus:border-[#c5a059] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-[#a7b3a5] block mb-1">Selecciona tu Avatar</label>
                    <div className="flex gap-1.5 overflow-x-auto py-1">
                      {avatarOptions.map((av) => (
                        <button
                          key={av}
                          type="button"
                          onClick={() => setSelectedAvatar(av)}
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-base transition-transform ${
                            selectedAvatar === av
                              ? 'border-[#c5a059] bg-[#c5a059]/30 scale-110 shadow'
                              : 'border-white/10 bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          {av}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-xs text-[#a7b3a5] block mb-1">Correo Electrónico</label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3 h-4 w-4 text-[#8e9c8c]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="w-full rounded-xl border border-[#c5a059]/25 bg-[#0e1913] py-2 pl-9 pr-3 text-xs text-[#f4e2b8] placeholder-[#576654] focus:border-[#c5a059] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-[#a7b3a5] block mb-1">Contraseña</label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3 h-4 w-4 text-[#8e9c8c]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-[#c5a059]/25 bg-[#0e1913] py-2 pl-9 pr-3 text-xs text-[#f4e2b8] placeholder-[#576654] focus:border-[#c5a059] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#c5a059]/50 bg-gradient-to-r from-[#c5a059] to-[#d8b66f] py-2.5 text-xs font-serif-luxury font-bold text-[#070c09] shadow-lg hover:brightness-110 transition-all active:scale-95"
              >
                <span>{mode === 'login' ? 'Ingresar a APS' : 'Registrar Cuenta'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {/* Quick Guest / Demo Option */}
            <div className="border-t border-white/10 pt-3 text-center">
              <button
                type="button"
                onClick={() => handleGuestQuickStart('Tiziano')}
                className="text-xs text-[#c5a059] hover:underline"
              >
                O continuar como usuario rápido (Tiziano)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
