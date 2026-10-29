import React, { useState, useRef } from 'react';
import { UserAccount } from '../types';
import { supabase, supabaseConfigured, SUPABASE_CONFIG_ERROR } from '../lib/supabase';
import { fetchAccount, translateAuthError, updateProfileFields } from '../lib/accounts';
import { ApsLogo } from './ApsLogo';
import {
  Lock,
  Mail,
  User,
  AlertCircle,
  Crown,
  ArrowRight,
  Upload,
  Camera,
  X,
  CheckCircle2,
} from 'lucide-react';
import { motion } from 'motion/react';

interface AuthGatewayProps {
  onLogin: (user: UserAccount) => void;
  onOpenTerms: () => void;
}

export type AuthErrorAction = 'NONE' | 'SWITCH_TO_REGISTER' | 'EMAIL_ALREADY_REGISTERED' | 'WRONG_PASSWORD';

export const AuthGateway: React.FC<AuthGatewayProps> = ({ onLogin, onOpenTerms }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [avatarImage, setAvatarImage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [errorActionType, setErrorActionType] = useState<AuthErrorAction>('NONE');
  const [successNotice, setSuccessNotice] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Mouse coords for specular fluid reflection matching main workspace
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona un archivo de imagen válido.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('La imagen no debe superar los 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarImage(reader.result);
        setError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorActionType('NONE');
    setSuccessNotice('');

    if (!supabaseConfigured) {
      setError(SUPABASE_CONFIG_ERROR);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Por favor ingresa un correo electrónico.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Por favor ingresa un correo electrónico válido (ej: nombre@gmail.com).');
      return;
    }
    if (!password || password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setError('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      setError('Por favor ingresa tu nombre o apodo.');
      return;
    }

    setLoading(true);
    try {
      let authUser = null as Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>['data']['user'];

      if (mode === 'login') {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (err) {
          setError(translateAuthError(err));
          setErrorActionType(err.code === 'invalid_credentials' ? 'WRONG_PASSWORD' : 'NONE');
          return;
        }
        authUser = data.user;
      } else {
        const displayName = name.trim().charAt(0).toUpperCase() + name.trim().slice(1);
        const { data, error: err } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { name: displayName }, emailRedirectTo: window.location.origin },
        });
        if (err) {
          setError(translateAuthError(err));
          setErrorActionType(err.code === 'user_already_exists' ? 'EMAIL_ALREADY_REGISTERED' : 'NONE');
          return;
        }
        // Con confirmación de correo activa, un correo ya registrado vuelve sin identidades.
        if (data.user && (data.user.identities?.length ?? 1) === 0) {
          setError('Este correo ya está registrado. Iniciá sesión o usá otro correo.');
          setErrorActionType('EMAIL_ALREADY_REGISTERED');
          return;
        }
        if (!data.session) {
          setSuccessNotice('Te enviamos un correo para confirmar tu cuenta. Confirmalo y después iniciá sesión.');
          setMode('login');
          return;
        }
        authUser = data.user;
        if (avatarImage && authUser) await updateProfileFields(authUser.id, { avatar: avatarImage });
      }

      if (!authUser) {
        setError('No se pudo verificar la sesión. Por favor reintenta.');
        return;
      }

      const account = await fetchAccount(authUser);
      sessionStorage.removeItem('aps_current_user');
      localStorage.setItem('aps_current_user', JSON.stringify(account));
      onLogin(account);
    } catch (err: any) {
      setError(translateAuthError(err) || 'Error al autenticar en el sistema.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      style={
        {
          '--x': `${mousePos.x}%`,
          '--y': `${mousePos.y}%`,
        } as React.CSSProperties
      }
      className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden bg-[color:var(--surface-0)] text-[color:var(--text-primary)] font-sans selection:bg-[color:var(--accent)]/30 selection:text-white"
    >
      {/* Specular Fluid Ambient Light */}
      <div className="pointer-events-none fixed inset-0 refraction-glow -z-10" />

      {/* Ambient background glows matching main app theme */}
      <div className="pointer-events-none fixed -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-[color:var(--accent)]/20 via-[color:var(--accent-2)]/15 to-transparent blur-3xl -z-10" />
      <div className="pointer-events-none fixed -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-gradient-to-tl from-[color:var(--accent-2)]/20 via-[color:var(--accent-2)]/15 to-transparent blur-3xl -z-10" />
      <div className="pointer-events-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[750px] w-[750px] rounded-full bg-gradient-to-r from-[color:var(--accent)]/10 via-[color:var(--accent-2)]/10 to-[color:var(--accent-2)]/10 blur-[140px] -z-10" />

      {/* Top Header Bar */}
      <header className="relative z-20 flex w-full items-center justify-between px-4 py-3 sm:px-8 border-b border-white/10 backdrop-blur-xl bg-black/40">
        <ApsLogo variant="full" />

        <button
          onClick={onOpenTerms}
          className="text-xs text-[color:var(--text-secondary)] hover:text-white underline underline-offset-4 transition-colors"
        >
          Términos & Privacidad
        </button>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-md sm:max-w-lg space-y-6">
          {/* Headline Title */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-2"
          >
            <div className="flex justify-center mb-1">
              <ApsLogo variant="compact" glow className="h-12 w-12" />
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-wider bg-gradient-to-r from-[color:var(--accent)] via-[color:var(--accent-2)] to-[color:var(--accent-2-soft)] bg-clip-text text-transparent drop-shadow-[0_0_25px_color-mix(in_srgb,var(--accent)_35%,transparent)]">
              APS INTELLIGENCE
            </h1>

            <h2 className="text-base sm:text-2xl font-extrabold italic tracking-wide text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]">
              DIME TU <span className="text-[color:var(--accent)]">IDEA</span> Y LA HACEMOS REALIDAD
            </h2>
          </motion.div>

          {/* Liquid Glass Card Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="liquid-glass-real rounded-3xl p-5 sm:p-7 shadow-2xl bg-[color:var(--surface-1)]/85 border border-white/15 backdrop-blur-2xl"
          >
            {/* Mode Switcher Tabs */}
            <div className="flex rounded-2xl border border-white/10 bg-black/60 p-1 mb-5">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setSuccessNotice('');
                }}
                className={`flex-1 rounded-xl py-2.5 text-xs font-serif-luxury font-bold tracking-wider transition-all duration-200 ${
                  mode === 'login'
                    ? 'bg-gradient-to-r from-[color:var(--accent)] via-[color:var(--accent-2)] to-[color:var(--accent-2)] text-white shadow-lg scale-[1.01]'
                    : 'text-[color:var(--text-secondary)] hover:text-white'
                }`}
              >
                INICIAR SESIÓN
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError('');
                  setSuccessNotice('');
                }}
                className={`flex-1 rounded-xl py-2.5 text-xs font-serif-luxury font-bold tracking-wider transition-all duration-200 ${
                  mode === 'register'
                    ? 'bg-gradient-to-r from-[color:var(--accent)] via-[color:var(--accent-2)] to-[color:var(--accent-2)] text-white shadow-lg scale-[1.01]'
                    : 'text-[color:var(--text-secondary)] hover:text-white'
                }`}
              >
                CREAR CUENTA
              </button>
            </div>

            {/* Error Banner with Smart Actions */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 rounded-2xl border border-red-500/40 bg-red-950/60 p-3.5 text-xs text-red-200 shadow-xl backdrop-blur-md space-y-2.5"
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  <p className="flex-1 font-medium leading-relaxed">{error}</p>
                </div>

                {/* Specific Action when email is already registered during registration */}
                {errorActionType === 'EMAIL_ALREADY_REGISTERED' && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-red-500/20">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setError('');
                        setErrorActionType('NONE');
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-2)] py-2 px-3 text-xs font-bold text-black shadow-md hover:brightness-110 active:scale-95 transition-all"
                    >
                      <span>Iniciar Sesión con este correo</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail('');
                        setError('');
                        setErrorActionType('NONE');
                        setTimeout(() => emailInputRef.current?.focus(), 80);
                      }}
                      className="flex-1 rounded-xl border border-white/20 bg-black/60 py-2 px-3 text-xs font-semibold text-white hover:bg-white/10 active:scale-95 transition-all text-center"
                    >
                      Crear otra cuenta (otro correo)
                    </button>
                  </div>
                )}

                {/* Specific Action when user needs to register during login */}
                {errorActionType === 'SWITCH_TO_REGISTER' && (
                  <div className="pt-2 border-t border-red-500/20">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setError('');
                        setErrorActionType('NONE');
                      }}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-2)] py-2 px-3 text-xs font-bold text-black shadow-md hover:brightness-110 active:scale-95 transition-all"
                    >
                      <span>Crear Cuenta con este correo</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Success Notice */}
            {successNotice && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex items-center gap-2.5 rounded-xl border border-emerald-500/35 bg-emerald-950/40 p-3 text-xs text-emerald-200 shadow-inner"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{successNotice}</span>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  {/* Name Input */}
                  <div>
                    <label className="block text-[11px] font-mono-code font-medium text-[color:var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                      Nombre o Alias
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 h-4 w-4 text-[color:var(--text-secondary)]" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ingresa tu nombre o apodo"
                        className="w-full rounded-xl border border-white/15 bg-black/50 pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 focus:border-[color:var(--accent)] focus:ring-1 focus:ring-[color:var(--accent)] focus:outline-none transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Profile Picture Upload */}
                  <div>
                    <label className="block text-[11px] font-mono-code font-medium text-[color:var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                      Foto de Perfil (Opcional)
                    </label>

                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />

                    <div className="flex items-center gap-3 p-3 rounded-2xl border border-white/10 bg-black/50">
                      {/* Avatar preview */}
                      <div className="relative h-14 w-14 shrink-0 rounded-2xl overflow-hidden border border-white/20 bg-gradient-to-br from-[color:var(--surface-4)] to-[color:var(--surface-1)] flex items-center justify-center shadow-md">
                        {avatarImage ? (
                          <img
                            src={avatarImage}
                            alt="Preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-[color:var(--text-secondary)]">
                            <Camera className="h-5 w-5 text-[color:var(--accent)]" />
                          </div>
                        )}
                        {avatarImage && (
                          <button
                            type="button"
                            onClick={() => setAvatarImage('')}
                            className="absolute top-0.5 right-0.5 rounded-full bg-black/80 p-0.5 text-white/80 hover:text-white"
                            title="Quitar foto"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      <div className="flex-1 space-y-1">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center justify-center gap-1.5 w-full rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 py-2 px-3 text-xs font-semibold text-white transition-all shadow-sm active:scale-95"
                        >
                          <Upload className="h-3.5 w-3.5 text-[color:var(--accent)]" />
                          <span>Subir foto desde tu dispositivo</span>
                        </button>
                        <p className="text-[10px] text-[color:var(--text-secondary)]">
                          JPG, PNG, WebP o foto de cámara
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Email Input */}
              <div>
                <label className="block text-[11px] font-mono-code font-medium text-[color:var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[color:var(--text-secondary)]" />
                  <input
                    ref={emailInputRef}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                    className="w-full rounded-xl border border-white/15 bg-black/50 pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 focus:border-[color:var(--accent)] focus:ring-1 focus:ring-[color:var(--accent)] focus:outline-none transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-[11px] font-mono-code font-medium text-[color:var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[color:var(--text-secondary)]" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full rounded-xl border border-white/15 bg-black/50 pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 focus:border-[color:var(--accent)] focus:ring-1 focus:ring-[color:var(--accent)] focus:outline-none transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Confirm Password (when registering) */}
              {mode === 'register' && (
                <div>
                  <label className="block text-[11px] font-mono-code font-medium text-[color:var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                    Confirmar Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[color:var(--text-secondary)]" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite tu contraseña"
                      className="w-full rounded-xl border border-white/15 bg-black/50 pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 focus:border-[color:var(--accent)] focus:ring-1 focus:ring-[color:var(--accent)] focus:outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>
              )}

              {/* Remember Session & Register Hint */}
              <div className="flex items-center justify-between text-[11px] text-[color:var(--text-secondary)] pt-1">
                <span />

                {mode === 'login' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setError('');
                    }}
                    className="text-[color:var(--accent)] hover:underline"
                  >
                    ¿No tienes cuenta? Regístrate
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError('');
                    }}
                    className="text-[color:var(--accent)] hover:underline"
                  >
                    ¿Ya tienes cuenta? Entrar
                  </button>
                )}
              </div>

              {/* Submit Button with App Signature Gradient */}
              <button
                type="submit"
                disabled={loading}
                className="w-full relative group overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-r from-[color:var(--accent)] via-[color:var(--accent-2)] to-[color:var(--accent-2)] py-3.5 text-xs font-serif-luxury font-bold tracking-wider text-white shadow-xl hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 mt-2"
              >
                <div className="flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>{mode === 'login' ? 'VERIFICANDO CREDENCIALES...' : 'CREANDO TU CUENTA...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{mode === 'login' ? 'ENTRAR A APS INTELLIGENCE' : 'CREAR CUENTA Y ENTRAR'}</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </div>
              </button>
            </form>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 py-4 text-center text-[10px] text-[color:var(--text-secondary)] border-t border-white/5 bg-black/40 backdrop-blur-md">
        <span>© {new Date().getFullYear()} APS INTELLIGENCE · Todos los derechos reservados.</span>
      </footer>
    </div>
  );
};
