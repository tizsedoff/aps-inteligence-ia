import React, { useState } from 'react';
import { UserAccount } from '../types';
import { auth, db } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  X,
  Lock,
  Mail,
  User,
  ShieldCheck,
  LogOut,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  onLogin: (user: UserAccount) => void;
  onLogout: () => void;
  required?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onLogout,
  required = false,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('👑');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const avatarOptions = ['👑', '⚡', '💎', '🦁', '🦅', '🪐', '🛡️', '✨'];

  const ADMIN_EMAIL = 'tizsedoff@gmail.com';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const isAdminUser = cleanEmail === ADMIN_EMAIL;
      const membershipTitle = isAdminUser
        ? 'ADMINISTRADOR SUPREMO'
        : 'APS INTELLIGENCE PRO';

      if (mode === 'register') {
        if (!name.trim()) {
          throw new Error('Por favor ingresa tu nombre o alias');
        }
        if (!cleanEmail || !cleanEmail.includes('@')) {
          throw new Error('Por favor ingresa un correo electrónico válido');
        }
        if (password.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres');
        }

        const credential = await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );
        const firebaseUser = credential.user;

        const userAccount: UserAccount = {
          id: firebaseUser.uid,
          name: name.trim(),
          email: cleanEmail,
          avatar: selectedAvatar,
          membership: membershipTitle,
          isAdmin: isAdminUser,
        };

        // Save to Firestore
        await setDoc(doc(db, 'users', firebaseUser.uid), userAccount);

        onLogin(userAccount);
        onClose();
      } else {
        // Login
        if (!cleanEmail) {
          throw new Error('Por favor ingresa tu correo electrónico');
        }
        if (!password) {
          throw new Error('Por favor ingresa tu contraseña');
        }

        const credential = await signInWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );
        const firebaseUser = credential.user;

        // Fetch user doc from Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        let userAccount: UserAccount;
        if (userDocSnap.exists()) {
          const data = userDocSnap.data() as UserAccount;
          // Ensure correct admin status for tizsedoff@gmail.com
          userAccount = {
            ...data,
            isAdmin: cleanEmail === ADMIN_EMAIL,
            membership:
              cleanEmail === ADMIN_EMAIL
                ? 'ADMINISTRADOR SUPREMO'
                : data.membership || 'APS INTELLIGENCE PRO',
          };
        } else {
          // Fallback if doc doesn't exist yet
          const inferredName = cleanEmail.split('@')[0] || 'Usuario';
          userAccount = {
            id: firebaseUser.uid,
            name: inferredName.charAt(0).toUpperCase() + inferredName.slice(1),
            email: cleanEmail,
            avatar: selectedAvatar,
            membership: membershipTitle,
            isAdmin: isAdminUser,
          };
          await setDoc(userDocRef, userAccount);
        }

        onLogin(userAccount);
        onClose();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err.message || 'Error de autenticación';
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found')) {
        msg = 'Correo o contraseña incorrectos.';
      } else if (msg.includes('auth/email-already-in-use')) {
        msg = 'Este correo ya está registrado. Inicia sesión.';
      } else if (msg.includes('auth/weak-password')) {
        msg = 'La contraseña es muy débil (mínimo 6 caracteres).';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutClick = async () => {
    try {
      await signOut(auth);
      onLogout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        onClick={() => {
          if (!required && currentUser) onClose();
        }}
      />

      {/* Modal Box */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-[#c5a059]/40 bg-[#070d0a]/95 p-6 shadow-2xl backdrop-blur-2xl">
        {/* Close Button (only if not required or user is logged in) && currentUser */}
        {!required && currentUser && (
          <button
            onClick={onClose}
            className="absolute right-5 top-5 rounded-xl p-1.5 text-[#8e9c8c] hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* If user is already logged in: Profile View */}
        {currentUser ? (
          <div className="space-y-6 text-center">
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-[#c5a059]/60 bg-gradient-to-br from-[#1b2b20] to-[#0a140f] text-4xl shadow-xl">
              {currentUser.avatar || '👑'}
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#c5a059]/40 to-emerald-500/20 blur-md -z-10" />
              {currentUser.isAdmin && (
                <div className="absolute -bottom-2 -right-2 rounded-full bg-[#c5a059] p-1 text-[#070c09] shadow-md" title="Administrador Supremo">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              )}
            </div>

            <div>
              <h3 className="font-serif-luxury text-xl font-bold tracking-wider text-[#f4e2b8]">
                {currentUser.name}
              </h3>
              <p className="text-xs font-mono-code text-[#8e9c8c]">{currentUser.email}</p>
            </div>

            <div className="rounded-2xl border border-[#c5a059]/20 bg-[#0e1a14]/90 p-4 text-left space-y-2.5 text-xs">
              <div className="flex justify-between text-[#8e9c8c]">
                <span>Membresía:</span>
                <span className="font-semibold text-[#f4e2b8]">{currentUser.membership}</span>
              </div>
              <div className="flex justify-between text-[#8e9c8c]">
                <span>Rol de Sistema:</span>
                <span className={currentUser.isAdmin ? 'text-amber-400 font-bold font-mono-code' : 'text-emerald-400 font-mono-code'}>
                  {currentUser.isAdmin ? '★ ADMINISTRADOR (tizsedoff@gmail.com)' : 'Usuario Conectado'}
                </span>
              </div>
              <div className="flex justify-between text-[#8e9c8c]">
                <span>Estado de Conexión:</span>
                <span className="text-emerald-400 font-mono-code">Firebase Auth Activo ✔</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleLogoutClick}
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
                  {mode === 'login' ? 'INICIAR SESIÓN (FIREBASE)' : 'REGISTRO DE USUARIO'}
                </h3>
                <p className="text-[11px] text-[#8e9c8c]">
                  {required ? 'Acceso obligatorio para entrar a APS' : 'Autenticación segura requerida'}
                </p>
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
                className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${
                  mode === 'login'
                    ? 'bg-[#16271c] text-[#f4e2b8] shadow border border-[#c5a059]/30'
                    : 'text-[#8e9c8c] hover:text-white'
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
                className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${
                  mode === 'register'
                    ? 'bg-[#16271c] text-[#f4e2b8] shadow border border-[#c5a059]/30'
                    : 'text-[#8e9c8c] hover:text-white'
                }`}
              >
                Crear Cuenta
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-[#8e9c8c] mb-1">
                      Nombre o Alias
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 h-4 w-4 text-[#8e9c8c]" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Tu Nombre"
                        className="w-full rounded-xl border border-[#c5a059]/35 bg-[#0b1410] pl-10 pr-4 py-2.5 text-xs text-[#f4e2b8] placeholder-[#556655] focus:border-[#c5a059] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#8e9c8c] mb-1">
                      Selecciona tu Avatar
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {avatarOptions.map((av) => (
                        <button
                          key={av}
                          type="button"
                          onClick={() => setSelectedAvatar(av)}
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all text-lg ${
                            selectedAvatar === av
                              ? 'border-[#c5a059] bg-[#1d3324] scale-105 shadow-md'
                              : 'border-[#c5a059]/20 bg-[#0b1410] hover:border-[#c5a059]/50'
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
                <label className="block text-[11px] font-medium text-[#8e9c8c] mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[#8e9c8c]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tizsedoff@gmail.com"
                    className="w-full rounded-xl border border-[#c5a059]/35 bg-[#0b1410] pl-10 pr-4 py-2.5 text-xs text-[#f4e2b8] placeholder-[#556655] focus:border-[#c5a059] focus:outline-none"
                  />
                </div>
                {email.trim().toLowerCase() === ADMIN_EMAIL && (
                  <p className="mt-1 text-[10px] text-amber-400 font-mono-code">
                    ★ Reconocido como Administrador Supremo (tizsedoff@gmail.com)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#8e9c8c] mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[#8e9c8c]" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-[#c5a059]/35 bg-[#0b1410] pl-10 pr-4 py-2.5 text-xs text-[#f4e2b8] placeholder-[#556655] focus:border-[#c5a059] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl border border-[#c5a059]/60 bg-gradient-to-r from-[#c5a059] via-[#e2c178] to-[#c5a059] py-3 text-xs font-serif-luxury font-bold text-[#070c09] shadow-lg hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {loading
                  ? 'Conectando con Firebase...'
                  : mode === 'login'
                  ? 'INICIAR SESIÓN'
                  : 'CREAR CUENTA'}
              </button>
            </form>

            <div className="rounded-xl border border-[#c5a059]/15 bg-[#0e1a14]/60 p-3 text-[11px] text-[#8e9c8c] text-center">
              Acceso seguro protegido por Firebase Auth. Cada usuario posee su perfil y membresía exclusiva.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
