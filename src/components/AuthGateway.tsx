import React, { useState, useRef } from 'react';
import { UserAccount } from '../types';
import { auth, db } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
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

const translateFirebaseError = (code: string, message: string): string => {
  switch (code) {
    case 'auth/user-not-found':
      return 'No existe una cuenta registrada con este correo. Por favor haz clic en "CREAR CUENTA" para registrarte.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'La contraseña o el correo ingresado no coinciden. Verifica tus datos o crea una cuenta si no tienes una.';
    case 'auth/email-already-in-use':
      return 'Este correo electrónico ya está registrado. Por favor selecciona "INICIAR SESIÓN" e ingresa con tu contraseña.';
    case 'auth/invalid-email':
      return 'El formato del correo electrónico no es válido (ejemplo: usuario@correo.com).';
    case 'auth/weak-password':
      return 'La contraseña es muy débil. Debe tener al menos 6 caracteres.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos fallidos. Por seguridad, espera unos momentos antes de reintentar.';
    case 'auth/network-request-failed':
      return 'Error de conexión a internet. Revisa tu red e intenta nuevamente.';
    case 'auth/operation-not-allowed':
      return 'El inicio de sesión con correo y contraseña no está habilitado en Firebase.';
    default:
      return message || 'Ocurrió un error al procesar tu solicitud.';
  }
};

export const AuthGateway: React.FC<AuthGatewayProps> = ({ onLogin, onOpenTerms }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [avatarImage, setAvatarImage] = useState<string>('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successNotice, setSuccessNotice] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mouse coords for specular fluid reflection matching main workspace
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  const isMasterAdmin = email.trim().toLowerCase() === 'tizsedoff@gmail.com';

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
    setSuccessNotice('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Por favor ingresa un correo electrónico.');
      return;
    }

    // Email format validation
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
      const isAdmin = cleanEmail === 'tizsedoff@gmail.com';
      let displayName = name.trim() || cleanEmail.split('@')[0];
      displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

      const initialMembership = isAdmin ? 'ADMINISTRADOR SUPREMO' : 'APS PRO';
      let userAvatar = avatarImage || '';

      let firebaseUid = '';

      if (mode === 'login') {
        // Authenticate existing user with real Firebase Auth
        try {
          const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
          firebaseUid = cred.user.uid;
        } catch (err: any) {
          const friendlyMsg = translateFirebaseError(err?.code || '', err?.message || '');
          setError(friendlyMsg);
          setLoading(false);
          return;
        }
      } else {
        // Register new user with real Firebase Auth
        try {
          const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          firebaseUid = cred.user.uid;
        } catch (err: any) {
          const friendlyMsg = translateFirebaseError(err?.code || '', err?.message || '');
          setError(friendlyMsg);
          setLoading(false);
          return;
        }
      }

      // Fetch or persist user in Firestore
      try {
        const userRef = doc(db, 'users', firebaseUid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data() as Partial<UserAccount>;
          if (data.name) displayName = data.name;
          if (data.avatar) userAvatar = data.avatar;
        } else {
          await setDoc(
            userRef,
            {
              id: firebaseUid,
              name: displayName,
              email: cleanEmail,
              avatar: userAvatar,
              membership: initialMembership,
              isAdmin,
              createdAt: Date.now(),
            },
            { merge: true }
          );
        }
      } catch (dbErr) {
        console.warn('Firestore sync notice:', dbErr);
      }

      const account: UserAccount = {
        id: firebaseUid,
        name: displayName,
        email: cleanEmail,
        avatar: userAvatar,
        membership: initialMembership,
        isAdmin,
      };

      if (rememberMe) {
        localStorage.setItem('aps_current_user', JSON.stringify(account));
      } else {
        sessionStorage.setItem('aps_current_user', JSON.stringify(account));
      }

      onLogin(account);
    } catch (err: any) {
      setError(err?.message || 'Error al autenticar en el sistema.');
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
      className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden bg-[#040705] text-[#e8ebe4] font-sans selection:bg-[#00cec9]/30 selection:text-white"
    >
      {/* Specular Fluid Ambient Light */}
      <div className="pointer-events-none fixed inset-0 refraction-glow -z-10" />

      {/* Ambient background glows matching main app theme */}
      <div className="pointer-events-none fixed -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-[#00cec9]/20 via-[#0984e3]/15 to-transparent blur-3xl -z-10" />
      <div className="pointer-events-none fixed -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-gradient-to-tl from-[#6c5ce7]/20 via-[#0984e3]/15 to-transparent blur-3xl -z-10" />
      <div className="pointer-events-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[750px] w-[750px] rounded-full bg-gradient-to-r from-[#00cec9]/10 via-[#0984e3]/10 to-[#6c5ce7]/10 blur-[140px] -z-10" />

      {/* Top Header Bar */}
      <header className="relative z-20 flex w-full items-center justify-between px-4 py-3 sm:px-8 border-b border-white/10 backdrop-blur-xl bg-black/40">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-white/20 bg-gradient-to-br from-[#1b2b20] to-[#0a140f] font-serif-luxury text-xs sm:text-sm font-bold text-white shadow-lg shadow-[#00cec9]/10">
            APS
          </div>
          <div className="flex flex-col">
            <span className="font-serif-luxury text-xs sm:text-sm font-bold tracking-widest text-white">
              APS INTELLIGENCE
            </span>
            <span className="text-[9px] sm:text-[10px] font-mono-code text-[#8e9c8c] tracking-wider uppercase">
              SISTEMA DE MODELOS DE ALTA INFERENCIA
            </span>
          </div>
        </div>

        <button
          onClick={onOpenTerms}
          className="text-xs text-[#8e9c8c] hover:text-white underline underline-offset-4 transition-colors"
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
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-wider bg-gradient-to-r from-[#00cec9] via-[#0984e3] to-[#a29bfe] bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(0,206,201,0.35)]">
              APS INTELLIGENCE
            </h1>

            <h2 className="text-base sm:text-2xl font-extrabold italic tracking-wide text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]">
              DIME TU <span className="text-[#00cec9]">IDEA</span> Y LA HACEMOS REALIDAD
            </h2>
          </motion.div>

          {/* Liquid Glass Card Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="liquid-glass-real rounded-3xl p-5 sm:p-7 shadow-2xl bg-[#09110c]/85 border border-white/15 backdrop-blur-2xl"
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
                    ? 'bg-gradient-to-r from-[#00cec9] via-[#0984e3] to-[#6c5ce7] text-white shadow-lg scale-[1.01]'
                    : 'text-[#8e9c8c] hover:text-white'
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
                    ? 'bg-gradient-to-r from-[#00cec9] via-[#0984e3] to-[#6c5ce7] text-white shadow-lg scale-[1.01]'
                    : 'text-[#8e9c8c] hover:text-white'
                }`}
              >
                CREAR CUENTA
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-500/35 bg-red-950/40 p-3 text-xs text-red-200 shadow-inner"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p>{error}</p>
                  {mode === 'login' && error.includes('CREAR CUENTA') && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setError('');
                      }}
                      className="text-[#00cec9] underline font-semibold hover:text-white block"
                    >
                      Haz clic aquí para Registrarte ahora
                    </button>
                  )}
                  {mode === 'register' && error.includes('INICIAR SESIÓN') && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setError('');
                      }}
                      className="text-[#00cec9] underline font-semibold hover:text-white block"
                    >
                      Haz clic aquí para Iniciar Sesión
                    </button>
                  )}
                </div>
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
                    <label className="block text-[11px] font-mono-code font-medium text-[#8e9c8c] mb-1.5 uppercase tracking-wider">
                      Nombre o Alias
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 h-4 w-4 text-[#8e9c8c]" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ingresa tu nombre o apodo"
                        className="w-full rounded-xl border border-white/15 bg-black/50 pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 focus:border-[#00cec9] focus:ring-1 focus:ring-[#00cec9] focus:outline-none transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Profile Picture Upload */}
                  <div>
                    <label className="block text-[11px] font-mono-code font-medium text-[#8e9c8c] mb-1.5 uppercase tracking-wider">
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
                      <div className="relative h-14 w-14 shrink-0 rounded-2xl overflow-hidden border border-white/20 bg-gradient-to-br from-[#1b2b20] to-[#0a140f] flex items-center justify-center shadow-md">
                        {avatarImage ? (
                          <img
                            src={avatarImage}
                            alt="Preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-[#8e9c8c]">
                            <Camera className="h-5 w-5 text-[#00cec9]" />
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
                          <Upload className="h-3.5 w-3.5 text-[#00cec9]" />
                          <span>Subir foto desde tu dispositivo</span>
                        </button>
                        <p className="text-[10px] text-[#8e9c8c]">
                          JPG, PNG, WebP o foto de cámara
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Email Input */}
              <div>
                <label className="block text-[11px] font-mono-code font-medium text-[#8e9c8c] mb-1.5 uppercase tracking-wider">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[#8e9c8c]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                    className="w-full rounded-xl border border-white/15 bg-black/50 pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 focus:border-[#00cec9] focus:ring-1 focus:ring-[#00cec9] focus:outline-none transition-all shadow-inner"
                  />
                </div>

                {/* Master Admin Live Recognition Badge */}
                {isMasterAdmin && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-3 py-1.5 text-[11px] font-mono-code text-emerald-300 shadow-md"
                  >
                    <Crown className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>★ ADMINISTRADOR SUPREMO (Tiziano · Control Total de Sistema)</span>
                  </motion.div>
                )}
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-[11px] font-mono-code font-medium text-[#8e9c8c] mb-1.5 uppercase tracking-wider">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[#8e9c8c]" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full rounded-xl border border-white/15 bg-black/50 pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 focus:border-[#00cec9] focus:ring-1 focus:ring-[#00cec9] focus:outline-none transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Confirm Password (when registering) */}
              {mode === 'register' && (
                <div>
                  <label className="block text-[11px] font-mono-code font-medium text-[#8e9c8c] mb-1.5 uppercase tracking-wider">
                    Confirmar Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[#8e9c8c]" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite tu contraseña"
                      className="w-full rounded-xl border border-white/15 bg-black/50 pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 focus:border-[#00cec9] focus:ring-1 focus:ring-[#00cec9] focus:outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>
              )}

              {/* Remember Session & Register Hint */}
              <div className="flex items-center justify-between text-[11px] text-[#8e9c8c] pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-white/30 bg-black/60 text-[#00cec9] focus:ring-0"
                  />
                  <span>Mantener sesión iniciada</span>
                </label>

                {mode === 'login' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setError('');
                    }}
                    className="text-[#00cec9] hover:underline"
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
                    className="text-[#00cec9] hover:underline"
                  >
                    ¿Ya tienes cuenta? Entrar
                  </button>
                )}
              </div>

              {/* Submit Button with App Signature Gradient */}
              <button
                type="submit"
                disabled={loading}
                className="w-full relative group overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-r from-[#00cec9] via-[#0984e3] to-[#6c5ce7] py-3.5 text-xs font-serif-luxury font-bold tracking-wider text-white shadow-xl hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 mt-2"
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
      <footer className="relative z-20 py-4 text-center text-[10px] text-[#8e9c8c] border-t border-white/5 bg-black/40 backdrop-blur-md">
        <span>© {new Date().getFullYear()} APS INTELLIGENCE · Todos los derechos reservados.</span>
      </footer>
    </div>
  );
};
