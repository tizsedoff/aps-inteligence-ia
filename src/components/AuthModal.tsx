import React, { useState, useRef } from 'react';
import { UserAccount, MemoryItem } from '../types';
import { UserAvatar } from './UserAvatar';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
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

const MEMBERSHIP_PLANS = [
  {
    id: 'APS INTELLIGENCE PRO',
    name: 'APS PRO',
    price: '$19 / mes',
    badge: 'ACTIVO ESTÁNDAR',
    description: 'Acceso completo a modelos APS Flash y Co-work estándar.',
    features: ['APS Flash & Standard', 'Chats ilimitados', 'Consola CLI básica'],
  },
  {
    id: 'APS ELITE DEVELOPER',
    name: 'APS ELITE DEV',
    price: '$39 / mes',
    badge: 'RECOMENDADO',
    description: 'Modo código avanzado, CLI extendido, auto-fix y streaming prioritario.',
    features: ['APS Hard Work / CLI', 'Subida de archivos y terminal', 'Prioridad en cola de cálculo'],
  },
  {
    id: 'APS ULTRA REASONING',
    name: 'APS ULTRA',
    price: '$69 / mes',
    badge: 'MÁXIMA POTENCIA',
    description: 'Inferencia de máxima profundidad, auto-reflexión y razonamiento de 128k.',
    features: ['APS Thinking Profundo', 'Modelos Ultra Reasoning', 'Soporte prioritario VIP'],
  },
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !currentUser) return null;

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 3500);
  };

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

  const handlePayMembership = async (planId: string) => {
    setPayingPlan(planId);
    showStatus(`Procesando suscripción a ${planId}...`);

    setTimeout(async () => {
      const updated: UserAccount = {
        ...currentUser,
        membership: planId,
      };
      localStorage.setItem('aps_current_user', JSON.stringify(updated));
      if (onUpdateUser) onUpdateUser(updated);

      try {
        const userRef = doc(db, 'users', currentUser.id);
        await updateDoc(userRef, { membership: planId });
      } catch (e) {
        console.warn('Firestore membership update note:', e);
      }

      setPayingPlan(null);
      showStatus(`¡Membresía ${planId} activada con éxito!`);
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
        className="relative z-10 w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl border border-[#c5a059]/40 bg-[#070d0a]/95 p-4 sm:p-6 shadow-2xl backdrop-blur-2xl liquid-glass-real scrollbar-none"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-[#8e9c8c] hover:bg-white/10 hover:text-white transition-colors"
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
                ? 'bg-gradient-to-r from-[#c5a059] to-[#d8b66f] text-[#070c09] shadow-md'
                : 'text-[#8e9c8c] hover:text-white'
            }`}
          >
            MI PERFIL
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('memory')}
            className={`flex-1 min-w-[120px] rounded-xl py-2 px-2 text-xs font-serif-luxury font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'memory'
                ? 'bg-gradient-to-r from-[#00cec9] to-[#0984e3] text-black shadow-md font-extrabold'
                : 'text-[#8e9c8c] hover:text-white'
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
                ? 'bg-gradient-to-r from-[#c5a059] to-[#d8b66f] text-[#070c09] shadow-md'
                : 'text-[#8e9c8c] hover:text-white'
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
                className="ring-4 ring-[#c5a059]/30"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 rounded-full border border-[#c5a059] bg-[#070d0a] p-2 text-[#f4e2b8] hover:bg-[#c5a059] hover:text-[#070c09] transition-all shadow-lg group"
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
                className="text-xs font-mono-code text-[#c5a059] hover:underline flex items-center justify-center gap-1.5 mx-auto"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Subir nueva foto de perfil</span>
              </button>
            </div>

            {/* Editable Name Section */}
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#c5a059]/30 bg-[#c5a059]/10 px-3 py-0.5 text-[10px] font-mono-code text-[#f4e2b8] mb-1">
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
                    className="flex-1 rounded-xl border border-[#c5a059]/50 bg-[#0c1610] px-3 py-1.5 text-sm font-bold text-[#f4e2b8] outline-none text-center"
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
                    className="rounded-xl border border-white/10 bg-white/5 p-2 text-[#8e9c8c] hover:bg-white/10"
                    title="Cancelar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <h3 className="font-serif-luxury text-xl sm:text-2xl font-bold tracking-wider text-[#f4e2b8]">
                    {currentUser.name}
                  </h3>
                  <button
                    onClick={() => {
                      setNameInput(currentUser.name);
                      setIsEditingName(true);
                    }}
                    className="rounded-lg p-1 text-[#8e9c8c] hover:bg-white/10 hover:text-[#f4e2b8] transition-colors"
                    title="Editar nombre"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <p className="text-xs font-mono-code text-[#8e9c8c]">{currentUser.email}</p>
            </div>

            {/* Account Details Box */}
            <div className="rounded-2xl border border-[#c5a059]/20 bg-[#0e1a14]/90 p-4 text-left space-y-3 text-xs">
              <div className="flex justify-between items-center text-[#8e9c8c]">
                <span>Membresía Actual:</span>
                <span className="font-serif-luxury font-bold text-[#f4e2b8] text-xs flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-[#c5a059]" />
                  {currentUser.membership}
                </span>
              </div>
              <div className="flex justify-between items-center text-[#8e9c8c]">
                <span>Memoria de la IA:</span>
                <button
                  onClick={() => setActiveTab('memory')}
                  className="text-[#00cec9] font-mono-code hover:underline flex items-center gap-1"
                >
                  <Brain className="h-3 w-3" />
                  <span>{memoriesList.length} recuerdos guardados (Ver/Editar)</span>
                </button>
              </div>
              <div className="flex justify-between items-center text-[#8e9c8c]">
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
              <div className="flex justify-between items-center text-[#8e9c8c]">
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
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#00cec9]/40 bg-[#00cec9]/20 py-2.5 text-xs font-bold text-[#00cec9] shadow-md hover:bg-[#00cec9]/30 transition-all"
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
                <Brain className="h-5 w-5 text-[#00cec9]" />
                <h3 className="font-serif-luxury text-base sm:text-lg font-bold text-white tracking-wide">
                  MEMORIA VIVA Y APRENDIZAJE DE LA IA
                </h3>
              </div>
              <p className="text-xs text-[#8e9c8c] leading-relaxed">
                La IA aprende y guarda automáticamente cosas que vas hablando en tus chats (preferencias, proyectos, estilo). También puedes escribirle instrucciones directas o agregar recuerdos manualmente.
              </p>
            </div>

            {/* Direct Custom Instructions Section */}
            <div className="rounded-2xl border border-white/10 bg-[#09120d] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#f4e2b8] flex items-center gap-1.5 font-serif-luxury">
                  <MessageSquare className="h-3.5 w-3.5 text-[#c5a059]" />
                  Instrucciones directas para la IA
                </span>
                <span className="text-[10px] text-[#738271] font-mono-code">
                  Siempre activas
                </span>
              </div>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Ejemplo: 'Háblame de tú', 'Prefiero código en TypeScript estricto', 'Estoy creando una startup de e-commerce', 'No uses introducciones largas'..."
                rows={3}
                className="w-full resize-none rounded-xl border border-white/10 bg-black/60 p-2.5 text-xs text-[#e8f0e6] placeholder-[#576954] focus:border-[#00cec9]/50 focus:outline-none font-sans"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSaveInstructions}
                  disabled={isSavingInstructions}
                  className="flex items-center gap-1.5 rounded-xl border border-[#00cec9]/40 bg-[#00cec9]/25 px-3 py-1.5 text-xs font-bold text-[#fbf5e8] hover:bg-[#00cec9]/40 transition-all shadow-sm"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Guardar Instrucciones</span>
                </button>
              </div>
            </div>

            {/* Add Memory Item Manually */}
            <div className="rounded-2xl border border-white/10 bg-[#09120d] p-3.5 space-y-2.5">
              <span className="text-xs font-bold text-[#f4e2b8] flex items-center gap-1.5 font-serif-luxury">
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
                  className="flex-1 rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-[#e8f0e6] placeholder-[#576954] focus:border-[#00cec9]/50 focus:outline-none"
                />
                <div className="flex gap-1.5">
                  <select
                    value={newMemoryCategory}
                    onChange={(e: any) => setNewMemoryCategory(e.target.value)}
                    className="rounded-xl border border-white/10 bg-black/80 px-2 py-1.5 text-xs text-[#f4e2b8] focus:outline-none"
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
              <div className="flex items-center justify-between text-xs text-[#8e9c8c]">
                <span className="font-serif-luxury font-bold text-[#f4e2b8]">
                  Recuerdos almacenados en tu perfil ({memoriesList.length})
                </span>
                <span className="text-[10px] text-emerald-400 font-mono-code">
                  ✔ Aprendizaje en vivo activo
                </span>
              </div>

              {memoriesList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-xs text-[#738271]">
                  <Brain className="mx-auto h-6 w-6 text-[#738271] mb-2 stroke-1" />
                  <p>Aún no hay recuerdos guardados.</p>
                  <p className="text-[11px] text-[#556353] mt-1">
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
                        <span className="mt-0.5 rounded-md border border-[#00cec9]/30 bg-[#00cec9]/10 px-1.5 py-0.5 text-[9px] font-mono-code text-[#00cec9] shrink-0 uppercase">
                          {mem.category}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs text-[#e8ebe4] leading-snug break-words">
                            {mem.fact}
                          </p>
                          <span className="text-[9px] text-[#576954] font-mono-code">
                            {mem.source === 'auto' ? '✦ Aprendido de la conversación' : 'Manual'} ·{' '}
                            {new Date(mem.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteMemory(mem.id)}
                        className="rounded-lg p-1 text-[#8e9c8c] hover:bg-red-950/50 hover:text-red-400 transition-colors shrink-0"
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
              <p className="text-xs text-[#8e9c8c]">
                Mejora tu nivel para desbloquear límites de tokens más altos, consola de código y razonamiento continuo.
              </p>
            </div>

            <div className="space-y-3">
              {MEMBERSHIP_PLANS.map((plan) => {
                const isCurrent = currentUser.membership === plan.id;
                const isPaying = payingPlan === plan.id;

                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl border p-4 transition-all relative overflow-hidden ${
                      isCurrent
                        ? 'border-[#00cec9] bg-[#00cec9]/15 shadow-lg'
                        : 'border-white/10 bg-black/40 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">
                            {plan.name}
                          </span>
                          <span className="rounded-full border border-[#00cec9]/30 bg-[#00cec9]/10 px-2 py-0.5 text-[9px] font-mono-code text-[#00cec9]">
                            {plan.badge}
                          </span>
                        </div>
                        <p className="text-xs text-[#8e9c8c] mt-1">{plan.description}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm sm:text-base font-bold text-white">
                          {plan.price}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-2 text-[10px] text-[#8e9c8c] font-mono-code">
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
                          className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-gradient-to-r from-[#00cec9] to-[#0984e3] px-4 py-2 text-xs font-bold text-black shadow-md hover:brightness-110 active:scale-95 transition-all"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          <span>{isPaying ? 'Activando...' : `Activar ${plan.name}`}</span>
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
