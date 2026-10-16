import React, { useState, useRef } from 'react';
import { UserAccount, MemoryItem, PlanId } from '../types';
import { PLANS_LIST, APS_PLANS, getUserPlanId, getCurrentMonthKey } from '../constants/plans';
import { UserAvatar } from './UserAvatar';
import { ApsLogo } from './ApsLogo';
import { auth, db } from '../firebase';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import {
  ShieldCheck,
  LogOut,
  Sparkles,
  Lock,
  Mail,
  User,
  AlertCircle,
  Crown,
  CheckCircle2,
  X,
  CreditCard,
  Upload,
  Camera,
  Check,
  Zap,
  Brain,
  Edit2,
  Trash2,
  Plus,
  Save,
  MessageSquare,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  onLogin: (user: UserAccount) => void;
  onLogout: () => void;
  onUpdateUser?: (updated: UserAccount) => void;
  required?: boolean;
}



export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onLogout,
  onUpdateUser,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'memory' | 'membership'>('profile');
  const [statusMessage, setStatusMessage] = useState('');
  const [payingPlan, setPayingPlan] = useState<string | null>(null);

  // Profile editable fields
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(currentUser?.name || '');

  // Memory & Direct Custom Instructions
  const [customInstructions, setCustomInstructions] = useState(
    currentUser?.customInstructions || ''
  );
  const [newMemoryFact, setNewMemoryFact] = useState('');
  const [newMemoryCategory, setNewMemoryCategory] = useState<
    'preference' | 'personal' | 'project' | 'general'
  >('general');
  const [memoriesList, setMemoriesList] = useState<MemoryItem[]>(
    currentUser?.memories || []
  );
  const [isSavingInstructions, setIsSavingInstructions] = useState(false);

  // Unauthenticated / Modal Login & Register State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 3500);
  };

  const handleModalAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    const cleanEmail = authEmail.trim().toLowerCase();
    const isAdmin = cleanEmail === 'tizsedoff@gmail.com';
    let displayName = authName.trim() || cleanEmail.split('@')[0];
    displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

    try {
      let firebaseUid = '';

      if (isAdmin) {
        if (authPassword !== 'inteligence') {
          setAuthError('Contraseña incorrecta para esta cuenta.');
          setAuthLoading(false);
          return;
        }
        try {
          const cred = await signInWithEmailAndPassword(auth, cleanEmail, authPassword);
          firebaseUid = cred.user.uid;
        } catch {
          try {
            const cred = await createUserWithEmailAndPassword(auth, cleanEmail, authPassword);
            firebaseUid = cred.user.uid;
          } catch {
            firebaseUid = 'admin_tizsedoff';
          }
        }
      } else if (authMode === 'login') {
        try {
          const cred = await signInWithEmailAndPassword(auth, cleanEmail, authPassword);
          firebaseUid = cred.user.uid;
        } catch (err: any) {
          if (err?.code === 'auth/user-not-found') {
            setAuthError('No existe una cuenta registrada con este correo. Por favor cambia a la pestaña CREAR CUENTA para registrarte.');
            setAuthLoading(false);
            return;
          } else if (err?.code === 'auth/wrong-password') {
            setAuthError('Contraseña incorrecta. Por favor verifica tus credenciales.');
            setAuthLoading(false);
            return;
          } else if (err?.code === 'auth/invalid-credential') {
            setAuthError('Credenciales no válidas. Si aún no te has registrado, crea una cuenta nueva; o verifica tu clave.');
            setAuthLoading(false);
            return;
          } else {
            setAuthError(err?.message || 'Error al iniciar sesión.');
            setAuthLoading(false);
            return;
          }
        }
      } else {
        try {
          const cred = await createUserWithEmailAndPassword(auth, cleanEmail, authPassword);
          firebaseUid = cred.user.uid;
        } catch (err: any) {
          if (err?.code === 'auth/email-already-in-use') {
            setAuthError('Este correo electrónico ya está registrado. Selecciona INICIAR SESIÓN con tu clave o usa otro correo.');
            setAuthLoading(false);
            return;
          } else if (err?.code === 'auth/weak-password') {
            setAuthError('La contraseña debe tener al menos 6 caracteres.');
            setAuthLoading(false);
            return;
          } else {
            setAuthError(err?.message || 'Error al registrar la cuenta.');
            setAuthLoading(false);
            return;
          }
        }
      }

      if (!firebaseUid) {
        setAuthError('No se pudo verificar la sesión.');
        setAuthLoading(false);
        return;
      }

      const initialMembership = isAdmin ? 'ADMINISTRADOR SUPREMO' : 'APS PRO';
      let userAvatar = '';

      try {
        const userRef = doc(db, 'users', firebaseUid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data() as Partial<UserAccount>;
          if (data.name) displayName = data.name;
          if (data.avatar) userAvatar = data.avatar;
        } else {
          await setDoc(userRef, {
            id: firebaseUid,
            name: displayName,
            email: cleanEmail,
            membership: initialMembership,
            isAdmin,
            createdAt: Date.now(),
          }, { merge: true });
        }
      } catch (e) {
        console.warn('Firestore doc check:', e);
      }

      const account: UserAccount = {
        id: firebaseUid,
        name: displayName,
        email: cleanEmail,
        avatar: userAvatar,
        membership: initialMembership,
        isAdmin,
      };

      localStorage.setItem('aps_current_user', JSON.stringify(account));
      onLogin(account);
      onClose();
    } catch (err: any) {
      setAuthError(err?.message || 'Error al procesar autenticación.');
    } finally {
      setAuthLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/85 backdrop-blur-xl transition-opacity"
          onClick={onClose}
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative z-10 w-full max-w-md rounded-3xl border border-[color:var(--accent)]/40 bg-[color:var(--surface-0)]/95 p-5 sm:p-7 shadow-2xl backdrop-blur-2xl liquid-glass-real"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-xl p-2 text-[color:var(--text-secondary)] hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="text-center space-y-1 mb-5">
            <div className="flex justify-center mb-1">
              <ApsLogo variant="full" glow size={42} className="mx-auto" />
            </div>
            <h2 className="text-xl font-bold font-serif-luxury text-white">
              {authMode === 'login' ? 'INICIAR SESIÓN' : 'CREAR CUENTA'}
            </h2>
            <p className="text-xs text-[color:var(--text-secondary)]">
              Accede a tus modelos, memoria viva y configuraciones
            </p>
          </div>

          {/* Mode switch */}
          <div className="flex rounded-2xl border border-white/10 bg-black/60 p-1 mb-4">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setAuthError('');
              }}
              className={`flex-1 rounded-xl py-2 text-xs font-serif-luxury font-bold transition-all ${
                authMode === 'login'
                  ? 'bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-2)] text-black shadow-md'
                  : 'text-[color:var(--text-secondary)] hover:text-white'
              }`}
            >
              INICIAR SESIÓN
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setAuthError('');
              }}
              className={`flex-1 rounded-xl py-2 text-xs font-serif-luxury font-bold transition-all ${
                authMode === 'register'
                  ? 'bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-2)] text-black shadow-md'
                  : 'text-[color:var(--text-secondary)] hover:text-white'
              }`}
            >
              CREAR CUENTA
            </button>
          </div>

          {authError && (
            <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/60 p-3 text-xs text-red-200 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <span className="flex-1">{authError}</span>
              </div>
              {authMode === 'register' && authError.includes('INICIAR SESIÓN') && (
                <div className="flex gap-2 pt-1 border-t border-red-500/20">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setAuthError('');
                    }}
                    className="flex-1 rounded-lg bg-[color:var(--accent)] py-1.5 px-2 text-[11px] font-bold text-black hover:bg-[color:var(--accent)]/90 transition-all text-center"
                  >
                    Iniciar Sesión con este correo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthEmail('');
                      setAuthError('');
                    }}
                    className="flex-1 rounded-lg border border-white/20 bg-black/60 py-1.5 px-2 text-[11px] font-semibold text-white hover:bg-white/10 transition-all text-center"
                  >
                    Usar otro correo
                  </button>
                </div>
              )}
              {authMode === 'login' && authError.includes('CREAR CUENTA') && (
                <div className="pt-1 border-t border-red-500/20">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setAuthError('');
                    }}
                    className="w-full rounded-lg bg-[color:var(--accent)] py-1.5 px-2 text-[11px] font-bold text-black hover:bg-[color:var(--accent)]/90 transition-all text-center"
                  >
                    Crear cuenta con este correo
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleModalAuthSubmit} className="space-y-3.5">
            {authMode === 'register' && (
              <div>
                <label className="block text-[10px] font-mono-code text-[color:var(--text-secondary)] uppercase mb-1">Nombre</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-[color:var(--text-secondary)]" />
                  <input
                    type="text"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Tu nombre completo"
                    className="w-full rounded-xl border border-white/15 bg-black/60 pl-9 pr-3 py-2 text-xs text-white placeholder-white/30 focus:border-[color:var(--accent)] outline-none"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-mono-code text-[color:var(--text-secondary)] uppercase mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[color:var(--text-secondary)]" />
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full rounded-xl border border-white/15 bg-black/60 pl-9 pr-3 py-2 text-xs text-white placeholder-white/30 focus:border-[color:var(--accent)] outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono-code text-[color:var(--text-secondary)] uppercase mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[color:var(--text-secondary)]" />
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full rounded-xl border border-white/15 bg-black/60 pl-9 pr-3 py-2 text-xs text-white placeholder-white/30 focus:border-[color:var(--accent)] outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full mt-2 rounded-xl border border-white/20 bg-gradient-to-r from-[color:var(--accent)] via-[color:var(--accent-2)] to-[color:var(--accent-2)] py-2.5 text-xs font-serif-luxury font-bold text-white shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {authLoading ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <span>{authMode === 'login' ? 'Entrar a APS Intelligence' : 'Crear Cuenta y Entrar'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }


  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        const imageResult = reader.result;
        await saveAvatar(imageResult);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveAvatar = async (imgUrl: string) => {
    try {
      const updated: UserAccount = {
        ...currentUser,
        avatar: imgUrl,
      };
      localStorage.setItem('aps_current_user', JSON.stringify(updated));
      if (onUpdateUser) onUpdateUser(updated);

      try {
        const userRef = doc(db, 'users', currentUser.id);
        await updateDoc(userRef, { avatar: imgUrl });
      } catch (e) {
        console.warn('Firestore avatar sync note:', e);
      }

      showStatus('¡Foto de perfil actualizada con éxito!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;

    try {
      const updated: UserAccount = {
        ...currentUser,
        name: trimmed,
      };
      localStorage.setItem('aps_current_user', JSON.stringify(updated));
      if (onUpdateUser) onUpdateUser(updated);

      try {
        const userRef = doc(db, 'users', currentUser.id);
        await updateDoc(userRef, { name: trimmed });
      } catch (e) {
        console.warn('Firestore name sync note:', e);
      }

      setIsEditingName(false);
      showStatus('¡Nombre actualizado correctamente!');
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveInstructions = async () => {
    setIsSavingInstructions(true);
    try {
      const updated: UserAccount = {
        ...currentUser,
        customInstructions: customInstructions.trim(),
      };
      localStorage.setItem('aps_current_user', JSON.stringify(updated));
      if (onUpdateUser) onUpdateUser(updated);

      try {
        const userRef = doc(db, 'users', currentUser.id);
        await updateDoc(userRef, { customInstructions: customInstructions.trim() });
      } catch (e) {
        console.warn('Firestore instructions sync note:', e);
      }

      showStatus('¡Instrucciones de memoria guardadas para la IA!');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingInstructions(false);
    }
  };

  const handleAddMemory = async () => {
    const factText = newMemoryFact.trim();
    if (!factText) return;

    const newMem: MemoryItem = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      fact: factText,
      category: newMemoryCategory,
      source: 'user',
      timestamp: Date.now(),
    };

    const updatedList = [newMem, ...memoriesList];
    setMemoriesList(updatedList);
    setNewMemoryFact('');

    try {
      const updated: UserAccount = {
        ...currentUser,
        memories: updatedList,
      };
      localStorage.setItem('aps_current_user', JSON.stringify(updated));
      if (onUpdateUser) onUpdateUser(updated);

      try {
        const userRef = doc(db, 'users', currentUser.id);
        await updateDoc(userRef, { memories: updatedList });
      } catch (e) {
        console.warn('Firestore memory add sync note:', e);
      }

      showStatus('¡Nuevo recuerdo añadido a la memoria de la IA!');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMemory = async (memId: string) => {
    const updatedList = memoriesList.filter((m) => m.id !== memId);
    setMemoriesList(updatedList);

    try {
      const updated: UserAccount = {
        ...currentUser,
        memories: updatedList,
      };
      localStorage.setItem('aps_current_user', JSON.stringify(updated));
      if (onUpdateUser) onUpdateUser(updated);

      try {
        const userRef = doc(db, 'users', currentUser.id);
        await updateDoc(userRef, { memories: updatedList });
      } catch (e) {
        console.warn('Firestore memory delete sync note:', e);
      }

      showStatus('Recuerdo eliminado de la memoria.');
    } catch (e) {
      console.error(e);
    }
  };

  const handlePayMembership = async (planId: PlanId) => {
    setPayingPlan(planId);
    const targetPlan = APS_PLANS[planId];
    showStatus(`Procesando suscripción simulada a ${targetPlan.name}...`);

    setTimeout(async () => {
      const currentMonth = getCurrentMonthKey();
      const updated: UserAccount = {
        ...currentUser,
        plan: planId,
        membership: targetPlan.name,
        usage: {
          month: currentMonth,
          count: currentUser.usage?.month === currentMonth ? currentUser.usage.count : 0,
        },
      };
      localStorage.setItem('aps_current_user', JSON.stringify(updated));
      if (onUpdateUser) onUpdateUser(updated);

      try {
        const userRef = doc(db, 'users', currentUser.id);
        await updateDoc(userRef, { plan: planId, membership: targetPlan.name });
      } catch (e) {
        console.warn('Firestore membership update note:', e);
      }

      setPayingPlan(null);
      showStatus(`¡Plan ${targetPlan.name} activado con éxito!`);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/85 backdrop-blur-xl transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative z-10 w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl border border-[color:var(--accent)]/40 bg-[color:var(--surface-0)]/95 p-4 sm:p-6 shadow-2xl backdrop-blur-2xl liquid-glass-real scrollbar-none"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-[color:var(--text-secondary)] hover:bg-white/10 hover:text-white transition-colors"
          title="Cerrar modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Tab switchers: Perfil / Memoria IA / Membresías */}
        <div className="flex rounded-2xl border border-white/10 bg-black/60 p-1 mb-5 mr-8 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 min-w-[90px] rounded-xl py-2 px-2 text-xs font-serif-luxury font-bold tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-hover)] text-[color:var(--on-accent)] shadow-md'
                : 'text-[color:var(--text-secondary)] hover:text-white'
            }`}
          >
            MI PERFIL
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('memory')}
            className={`flex-1 min-w-[120px] rounded-xl py-2 px-2 text-xs font-serif-luxury font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'memory'
                ? 'bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-2)] text-black shadow-md font-extrabold'
                : 'text-[color:var(--text-secondary)] hover:text-white'
            }`}
          >
            <Brain className="h-3.5 w-3.5" />
            <span>MEMORIA IA</span>
            {memoriesList.length > 0 && (
              <span className="rounded-full bg-white/20 px-1.5 text-[10px] font-mono-code">
                {memoriesList.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('membership')}
            className={`flex-1 min-w-[110px] rounded-xl py-2 px-2 text-xs font-serif-luxury font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'membership'
                ? 'bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-hover)] text-[color:var(--on-accent)] shadow-md'
                : 'text-[color:var(--text-secondary)] hover:text-white'
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>MEMBRESÍA</span>
          </button>
        </div>

        {/* Status Message Alert */}
        <AnimatePresence>
          {statusMessage && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-200"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{statusMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TAB 1: MI PERFIL (Editar Foto, Nombre, Datos) */}
        {activeTab === 'profile' && (
          <div className="space-y-5 text-center">
            {/* User Avatar with change photo button */}
            <div className="relative mx-auto inline-block">
              <UserAvatar
                avatar={currentUser.avatar}
                name={currentUser.name}
                isAdmin={currentUser.isAdmin}
                size="xl"
                className="ring-4 ring-[color:var(--accent)]/30"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 rounded-full border border-[color:var(--accent)] bg-[color:var(--surface-0)] p-2 text-[color:var(--accent-soft)] hover:bg-[color:var(--accent)] hover:text-[color:var(--on-accent)] transition-all shadow-lg group"
                title="Cambiar foto de perfil desde tus archivos"
              >
                <Camera className="h-4 w-4 group-hover:scale-110 transition-transform" />
              </button>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* Change Profile Photo Button underneath */}
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-mono-code text-[color:var(--accent)] hover:underline flex items-center justify-center gap-1.5 mx-auto"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Subir nueva foto de perfil</span>
              </button>
            </div>

            {/* Editable Name Section */}
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/10 px-3 py-0.5 text-[10px] font-mono-code text-[color:var(--accent-soft)] mb-1">
                <span>{currentUser.isAdmin ? '★ ADMINISTRADOR SUPREMO' : 'USUARIO ACTIVO'}</span>
              </div>

              {isEditingName ? (
                <div className="flex items-center justify-center gap-2 max-w-sm mx-auto">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') setIsEditingName(false);
                    }}
                    placeholder="Tu nombre..."
                    autoFocus
                    className="flex-1 rounded-xl border border-[color:var(--accent)]/50 bg-[color:var(--surface-2)] px-3 py-1.5 text-sm font-bold text-[color:var(--accent-soft)] outline-none text-center"
                  />
                  <button
                    onClick={handleSaveName}
                    className="rounded-xl border border-emerald-500/40 bg-emerald-500/20 p-2 text-emerald-300 hover:bg-emerald-500/30"
                    title="Guardar nombre"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setNameInput(currentUser.name);
                      setIsEditingName(false);
                    }}
                    className="rounded-xl border border-white/10 bg-white/5 p-2 text-[color:var(--text-secondary)] hover:bg-white/10"
                    title="Cancelar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <h3 className="font-serif-luxury text-xl sm:text-2xl font-bold tracking-wider text-[color:var(--accent-soft)]">
                    {currentUser.name}
                  </h3>
                  <button
                    onClick={() => {
                      setNameInput(currentUser.name);
                      setIsEditingName(true);
                    }}
                    className="rounded-lg p-1 text-[color:var(--text-secondary)] hover:bg-white/10 hover:text-[color:var(--accent-soft)] transition-colors"
                    title="Editar nombre"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <p className="text-xs font-mono-code text-[color:var(--text-secondary)]">{currentUser.email}</p>
            </div>

            {/* Account Details Box */}
            <div className="rounded-2xl border border-[color:var(--accent)]/20 bg-[color:var(--surface-2)]/90 p-4 text-left space-y-3 text-xs">
              <div className="flex justify-between items-center text-[color:var(--text-secondary)]">
                <span>Membresía Actual:</span>
                <span className="font-serif-luxury font-bold text-[color:var(--accent-soft)] text-xs flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-[color:var(--accent)]" />
                  {currentUser.membership}
                </span>
              </div>
              <div className="flex justify-between items-center text-[color:var(--text-secondary)]">
                <span>Memoria de la IA:</span>
                <button
                  onClick={() => setActiveTab('memory')}
                  className="text-[color:var(--accent)] font-mono-code hover:underline flex items-center gap-1"
                >
                  <Brain className="h-3 w-3" />
                  <span>{memoriesList.length} recuerdos guardados (Ver/Editar)</span>
                </button>
              </div>
              <div className="flex justify-between items-center text-[color:var(--text-secondary)]">
                <span>Rol en el Sistema:</span>
                <span
                  className={
                    currentUser.isAdmin
                      ? 'text-amber-400 font-bold font-mono-code flex items-center gap-1'
                      : 'text-emerald-400 font-mono-code'
                  }
                >
                  {currentUser.isAdmin ? (
                    <>
                      <Crown className="h-3.5 w-3.5" />
                      <span>ADMINISTRADOR SUPREMO</span>
                    </>
                  ) : (
                    'Usuario Estándar'
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center text-[color:var(--text-secondary)]">
                <span>Base de Datos:</span>
                <span className="text-emerald-400 font-mono-code flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Sincronizado con Firebase</span>
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={onLogout}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-950/40 py-2.5 text-xs font-medium text-red-300 hover:bg-red-900/40 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar Sesión</span>
              </button>

              <button
                onClick={() => setActiveTab('memory')}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[color:var(--accent)]/40 bg-[color:var(--accent)]/20 py-2.5 text-xs font-bold text-[color:var(--accent)] shadow-md hover:bg-[color:var(--accent)]/30 transition-all"
              >
                <Brain className="h-4 w-4" />
                <span>Configurar Memoria</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: MEMORIA DE LA IA (Personalización, Recuerdos y Aprendizaje Continuo) */}
        {activeTab === 'memory' && (
          <div className="space-y-5">
            {/* Header description */}
            <div className="text-left space-y-1 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-[color:var(--accent)]" />
                <h3 className="font-serif-luxury text-base sm:text-lg font-bold text-white tracking-wide">
                  MEMORIA VIVA Y APRENDIZAJE DE LA IA
                </h3>
              </div>
              <p className="text-xs text-[color:var(--text-secondary)] leading-relaxed">
                La IA aprende y guarda automáticamente cosas que vas hablando en tus chats (preferencias, proyectos, estilo). También puedes escribirle instrucciones directas o agregar recuerdos manualmente.
              </p>
            </div>

            {/* Direct Custom Instructions Section */}
            <div className="rounded-2xl border border-white/10 bg-[color:var(--surface-1)] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[color:var(--accent-soft)] flex items-center gap-1.5 font-serif-luxury">
                  <MessageSquare className="h-3.5 w-3.5 text-[color:var(--accent)]" />
                  Instrucciones directas para la IA
                </span>
                <span className="text-[10px] text-[color:var(--text-muted)] font-mono-code">
                  Siempre activas
                </span>
              </div>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Ejemplo: 'Háblame de tú', 'Prefiero código en TypeScript estricto', 'Estoy creando una startup de e-commerce', 'No uses introducciones largas'..."
                rows={3}
                className="w-full resize-none rounded-xl border border-white/10 bg-black/60 p-2.5 text-xs text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-[color:var(--accent)]/50 focus:outline-none font-sans"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSaveInstructions}
                  disabled={isSavingInstructions}
                  className="flex items-center gap-1.5 rounded-xl border border-[color:var(--accent)]/40 bg-[color:var(--accent)]/25 px-3 py-1.5 text-xs font-bold text-[color:var(--text-primary)] hover:bg-[color:var(--accent)]/40 transition-all shadow-sm"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Guardar Instrucciones</span>
                </button>
              </div>
            </div>

            {/* Add Memory Item Manually */}
            <div className="rounded-2xl border border-white/10 bg-[color:var(--surface-1)] p-3.5 space-y-2.5">
              <span className="text-xs font-bold text-[color:var(--accent-soft)] flex items-center gap-1.5 font-serif-luxury">
                <Plus className="h-3.5 w-3.5 text-emerald-400" />
                Agregar dato o preferencia a la memoria
              </span>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newMemoryFact}
                  onChange={(e) => setNewMemoryFact(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddMemory();
                  }}
                  placeholder="Dato que la IA debe recordar (ej: 'Mi framework favorito es React')..."
                  className="flex-1 rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-[color:var(--accent)]/50 focus:outline-none"
                />
                <div className="flex gap-1.5">
                  <select
                    value={newMemoryCategory}
                    onChange={(e: any) => setNewMemoryCategory(e.target.value)}
                    className="rounded-xl border border-white/10 bg-black/80 px-2 py-1.5 text-xs text-[color:var(--accent-soft)] focus:outline-none"
                  >
                    <option value="general">General</option>
                    <option value="preference">Preferencia</option>
                    <option value="project">Proyecto</option>
                    <option value="personal">Personal</option>
                  </select>
                  <button
                    onClick={handleAddMemory}
                    disabled={!newMemoryFact.trim()}
                    className="flex items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-40 transition-all"
                  >
                    <span>Guardar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* List of Stored Memories */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[color:var(--text-secondary)]">
                <span className="font-serif-luxury font-bold text-[color:var(--accent-soft)]">
                  Recuerdos almacenados en tu perfil ({memoriesList.length})
                </span>
                <span className="text-[10px] text-emerald-400 font-mono-code">
                  ✔ Aprendizaje en vivo activo
                </span>
              </div>

              {memoriesList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-xs text-[color:var(--text-muted)]">
                  <Brain className="mx-auto h-6 w-6 text-[color:var(--text-muted)] mb-2 stroke-1" />
                  <p>Aún no hay recuerdos guardados.</p>
                  <p className="text-[11px] text-[color:var(--text-muted)] mt-1">
                    A medida que hables con la IA en el chat, aprenderá tus datos automáticamente, o puedes agregarlos arriba.
                  </p>
                </div>
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1 scrollbar-none">
                  {memoriesList.map((mem) => (
                    <div
                      key={mem.id}
                      className="group flex items-start justify-between gap-2.5 rounded-xl border border-white/10 bg-black/40 p-2.5 hover:border-white/20 transition-all"
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="mt-0.5 rounded-md border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/10 px-1.5 py-0.5 text-[9px] font-mono-code text-[color:var(--accent)] shrink-0 uppercase">
                          {mem.category}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs text-[color:var(--text-primary)] leading-snug break-words">
                            {mem.fact}
                          </p>
                          <span className="text-[9px] text-[color:var(--text-muted)] font-mono-code">
                            {mem.source === 'auto' ? '✦ Aprendido de la conversación' : 'Manual'} ·{' '}
                            {new Date(mem.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteMemory(mem.id)}
                        className="rounded-lg p-1 text-[color:var(--text-secondary)] hover:bg-red-950/50 hover:text-red-400 transition-colors shrink-0"
                        title="Olvidar este recuerdo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MEMBRESÍAS (Pagar / Cambiar Plan) */}
        {activeTab === 'membership' && (
          <div className="space-y-4">
            <div className="text-center space-y-1 mb-2">
              <h3 className="text-base sm:text-lg font-bold tracking-wider text-white">
                PLANES DE MEMBRESÍA APS
              </h3>
              <p className="text-xs text-[color:var(--text-secondary)]">
                Mejora tu nivel para desbloquear límites de tokens más altos, consola de código y razonamiento continuo.
              </p>
            </div>

            <div className="space-y-3">
              {PLANS_LIST.map((plan) => {
                const userPlanId = getUserPlanId(currentUser);
                const isCurrent = userPlanId === plan.id;
                const isPaying = payingPlan === plan.id;

                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl border p-4 transition-all relative overflow-hidden ${
                      isCurrent
                        ? 'border-[color:var(--accent)] bg-[color:var(--accent)]/15 shadow-lg'
                        : 'border-white/10 bg-black/40 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">
                            {plan.name}
                          </span>
                          <span className="rounded-full border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/10 px-2 py-0.5 text-[9px] font-mono-code text-[color:var(--accent)]">
                            {plan.badge}
                          </span>
                        </div>
                        <p className="text-xs text-[color:var(--text-secondary)] mt-1">{plan.description}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm sm:text-base font-bold text-white">
                          {plan.priceLabel}
                        </div>
                        <div className="text-[10px] font-mono-code text-[color:var(--accent)] font-semibold">
                          {plan.limit} mensajes / {plan.period === 'day' ? 'día' : 'mes'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-2 text-[10px] text-[color:var(--text-secondary)] font-mono-code">
                      {plan.features.map((feat, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <Check className="h-3 w-3 text-emerald-400" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex justify-end">
                      {isCurrent ? (
                        <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 font-mono-code">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>PLAN ACTUALMENTE ACTIVO</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handlePayMembership(plan.id)}
                          disabled={isPaying}
                          className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-2)] px-4 py-2 text-xs font-bold text-black shadow-md hover:brightness-110 active:scale-95 transition-all"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          <span>{isPaying ? 'Activando...' : plan.price === 0 ? 'Cambiar a Basic' : `Activar ${plan.name} (${plan.priceLabel})`}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
