import React, { useState, useRef } from 'react';
import { UserAccount } from '../types';
import { auth, db, googleProvider } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
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

const translateFirebaseError = (code: string, message: string): string => {
  switch (code) {
    case 'auth/user-not-found':
      return 'No existe una cuenta registrada con este correo. Si no tienes cuenta, por favor regístrate.';
    case 'auth/wrong-password':
      return 'Contraseña incorrecta. Por favor verifica tu clave de acceso.';
    case 'auth/invalid-credential':
      return 'Credenciales no válidas. Si aún no te has registrado, crea una cuenta nueva; o verifica tu contraseña.';
    case 'auth/email-already-in-use':
      return 'Este correo electrónico ya está registrado en el sistema. Puedes iniciar sesión con tu contraseña o crear una cuenta con otro correo.';
    case 'auth/invalid-email':
      return 'El formato del correo electrónico no es válido (ejemplo: usuario@correo.com).';
    case 'auth/weak-password':
      return 'La contraseña es muy débil. Debe tener al menos 6 caracteres.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos fallidos. Por seguridad, espera unos momentos antes de reintentar.';
    case 'auth/network-request-failed':
      return 'Error de conexión a internet. Revisa tu red e intenta nuevamente.';
    case 'auth/operation-not-allowed':
      return 'El inicio de sesión con correo y contraseña no está habilitado en la consola de Firebase. Puedes usar Google Sign-In.';
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
  const [googleLoading, setGoogleLoading] = useState(false);
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

  const handleGoogleSignIn = async () => {
    setError('');
    setErrorActionType('NONE');
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const gUser = result.user;
      const cleanEmail = (gUser.email || '').toLowerCase();
      const isAdmin = cleanEmail === 'tizsedoff@gmail.com';
      let displayName = gUser.displayName || cleanEmail.split('@')[0] || 'Usuario';
      let userAvatar = gUser.photoURL || '';
      const initialMembership = isAdmin ? 'ADMINISTRADOR SUPREMO' : 'APS PRO';

      try {
        const userRef = doc(db, 'users', gUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data() as Partial<UserAccount>;
          if (data.name) displayName = data.name;
          if (data.avatar) userAvatar = data.avatar;
        } else {
          await setDoc(
            userRef,
            {
              id: gUser.uid,
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
      } catch (e) {
        console.warn('Firestore Google sign-in note:', e);
      }

      const account: UserAccount = {
        id: gUser.uid,
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
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        setError(translateFirebaseError(err?.code || '', err?.message || 'Error al conectar con Google'));
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorActionType('NONE');
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

      // 1. MASTER ADMIN SPECIAL HANDLER (Secret Credentials: tizsedoff@gmail.com / inteligence)
      if (isAdmin) {
        if (password !== 'inteligence') {
          setError('Contraseña incorrecta. Por favor verifica tu clave de acceso.');
          setErrorActionType('WRONG_PASSWORD');
          setLoading(false);
          return;
        }

        // Master credentials verified! Try Firebase Auth, fallback to persistent master UID
        try {
          const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
          firebaseUid = cred.user.uid;
        } catch {
          try {
            const createCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
            firebaseUid = createCred.user.uid;
          } catch {
            firebaseUid = 'admin_tizsedoff';
          }
        }
      } else if (mode === 'login') {
        // 2. STANDARD USER LOGIN
        try {
          const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
          firebaseUid = cred.user.uid;
        } catch (err: any) {
          if (err?.code === 'auth/user-not-found') {
            setError('No existe ninguna cuenta registrada con este correo electrónico.');
            setErrorActionType('SWITCH_TO_REGISTER');
            setLoading(false);
            return;
          } else if (err?.code === 'auth/wrong-password') {
            setError('Contraseña incorrecta. Por favor verifica tu clave de acceso.');
            setErrorActionType('WRONG_PASSWORD');
            setLoading(false);
            return;
          } else if (err?.code === 'auth/invalid-credential') {
            setError('Credenciales no válidas o la cuenta no existe. Si no tienes cuenta, por favor regístrate.');
            setErrorActionType('SWITCH_TO_REGISTER');
            setLoading(false);
            return;
          } else if (err?.code === 'auth/operation-not-allowed') {
            // Check Firestore database records for registered account
            try {
              const usersCol = collection(db, 'users');
              const q = query(usersCol, where('email', '==', cleanEmail));
              const querySnap = await getDocs(q);

              if (querySnap.empty) {
                setError('No existe ninguna cuenta registrada con este correo electrónico. Por favor regístrate en CREAR CUENTA.');
                setErrorActionType('SWITCH_TO_REGISTER');
                setLoading(false);
                return;
              }

              const existingDoc = querySnap.docs[0];
              const userData = existingDoc.data();
              if (userData.password && userData.password !== password) {
                setError('Contraseña incorrecta. Por favor verifica tu clave de acceso.');
                setErrorActionType('WRONG_PASSWORD');
                setLoading(false);
                return;
              }

              firebaseUid = existingDoc.id;
              if (userData.name) displayName = userData.name;
              if (userData.avatar) userAvatar = userData.avatar;
            } catch (fsErr) {
              setError('No se pudo verificar la cuenta. Por favor regístrate o reintenta.');
              setErrorActionType('SWITCH_TO_REGISTER');
              setLoading(false);
              return;
            }
          } else {
            setError(translateFirebaseError(err?.code || '', err?.message || 'Error al iniciar sesión'));
            setErrorActionType('NONE');
            setLoading(false);
            return;
          }
        }
      } else {
        // 3. STANDARD USER REGISTRATION
        // First check Firestore if email already exists
        try {
          const usersCol = collection(db, 'users');
          const q = query(usersCol, where('email', '==', cleanEmail));
          const querySnap = await getDocs(q);

          if (!querySnap.empty) {
            setError('Este correo electrónico ya está registrado en el sistema. Puedes iniciar sesión con tu contraseña o crear una cuenta con un correo diferente.');
            setErrorActionType('EMAIL_ALREADY_REGISTERED');
            setLoading(false);
            return;
          }
        } catch (fsCheckErr) {
          console.warn('Firestore duplicate check note:', fsCheckErr);
        }

        try {
          const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          firebaseUid = cred.user.uid;
        } catch (err: any) {
          if (err?.code === 'auth/email-already-in-use') {
            setError('Este correo electrónico ya está registrado en el sistema. Puedes iniciar sesión con tu contraseña o crear una cuenta con un correo diferente.');
            setErrorActionType('EMAIL_ALREADY_REGISTERED');
            setLoading(false);
            return;
          } else if (err?.code === 'auth/weak-password') {
            setError('La contraseña debe tener al menos 6 caracteres.');
            setErrorActionType('NONE');
            setLoading(false);
            return;
          } else if (err?.code === 'auth/invalid-email') {
            setError('El formato del correo electrónico no es válido.');
            setErrorActionType('NONE');
            setLoading(false);
            return;
          } else if (err?.code === 'auth/operation-not-allowed') {
            // Create directly in Firestore
            firebaseUid = 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
          } else {
            setError(translateFirebaseError(err?.code || '', err?.message || 'Error al registrar la cuenta'));
            setErrorActionType('NONE');
            setLoading(false);
            return;
          }
        }
      }

      if (!firebaseUid) {
        setError('No se pudo verificar la sesión. Por favor reintenta.');
        setLoading(false);
        return;
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
              password: password,
              avatar: userAvatar,
              membership: initialMembership,
              isAdmin,
              createdAt: Date.now(),
            },
            { merge: true }
          );
        }
      } catch (dbErr) {
        console.warn('Firestore sync note:', dbErr);
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
        <ApsLogo variant="full" />

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
            <div className="flex justify-center mb-1">
              <ApsLogo variant="compact" glow className="h-12 w-12" />
            </div>

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
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#00cec9] to-[#0984e3] py-2 px-3 text-xs font-bold text-black shadow-md hover:brightness-110 active:scale-95 transition-all"
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
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#00cec9] to-[#0984e3] py-2 px-3 text-xs font-bold text-black shadow-md hover:brightness-110 active:scale-95 transition-all"
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
                    ref={emailInputRef}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                    className="w-full rounded-xl border border-white/15 bg-black/50 pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 focus:border-[#00cec9] focus:ring-1 focus:ring-[#00cec9] focus:outline-none transition-all shadow-inner"
                  />
                </div>
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
                disabled={loading || googleLoading}
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

              {/* Divider */}
              <div className="relative flex items-center justify-center my-2 pt-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <span className="relative bg-[#09110c] px-3 text-[10px] uppercase font-mono-code text-[#8e9c8c] tracking-widest">
                  o accede con
                </span>
              </div>

              {/* Google Sign-In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full flex items-center justify-center gap-2.5 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 py-3 text-xs font-semibold text-white shadow-md active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {googleLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Continuar con Google</span>
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
