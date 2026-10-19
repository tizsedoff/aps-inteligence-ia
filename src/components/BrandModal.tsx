import React, { useEffect, useRef, useState } from 'react';
import { X, Briefcase, Save, Upload, Trash2, Lock } from 'lucide-react';
import { BrandProfile } from '../types';
import { BRAND_FIELD_MAX, BRAND_LOGO_MAX, EMPTY_BRAND, sanitizeBrand } from '../lib/brand';

interface BrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  brand: BrandProfile | null;
  onSave: (brand: BrandProfile) => Promise<boolean>;
}

type TextKey = Exclude<keyof BrandProfile, 'logo' | 'updatedAt'>;

const FIELDS: { key: TextKey; label: string; hint: string; multiline?: boolean }[] = [
  { key: 'name', label: 'Nombre de la marca', hint: 'Ej: Felichità Helados' },
  { key: 'industry', label: 'Rubro', hint: 'Ej: Heladería artesanal' },
  {
    key: 'productsServices',
    label: 'Productos y servicios',
    hint: 'Qué vendés y con qué categorías',
    multiline: true,
  },
  {
    key: 'targetAudience',
    label: 'Público objetivo',
    hint: 'A quién le vendés (edad, zona, intereses)',
    multiline: true,
  },
  {
    key: 'valueProposition',
    label: 'Propuesta de valor',
    hint: 'Qué problema resolvés y por qué te eligen',
    multiline: true,
  },
  {
    key: 'differentiators',
    label: 'Diferenciadores',
    hint: 'Qué te distingue de la competencia',
    multiline: true,
  },
  {
    key: 'visualIdentity',
    label: 'Identidad visual',
    hint: 'Colores, tipografías, estilo (ej: minimalista, tonos pastel)',
    multiline: true,
  },
  { key: 'contact', label: 'Datos de contacto', hint: 'WhatsApp, Instagram, email, dirección' },
  {
    key: 'tone',
    label: 'Tono de comunicación',
    hint: 'Ej: cercano y divertido / sobrio y profesional',
  },
  {
    key: 'goals',
    label: 'Objetivos comerciales',
    hint: 'Ej: subir ventas online 30% este trimestre',
    multiline: true,
  },
];

export const BrandModal: React.FC<BrandModalProps> = ({ isOpen, onClose, brand, onSave }) => {
  const [form, setForm] = useState<BrandProfile>(brand || EMPTY_BRAND);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'ok' | 'warn' | 'error'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(brand || EMPTY_BRAND);
      setNotice(null);
    }
  }, [isOpen, brand]);

  if (!isOpen) return null;

  const handleLogo = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setNotice({ type: 'error', text: 'El logo debe ser una imagen.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result || '');
      if (data.length > BRAND_LOGO_MAX) {
        setNotice({ type: 'error', text: 'El logo es muy pesado (máx. ~150 KB). Probá con una versión más liviana.' });
        return;
      }
      setNotice(null);
      setForm((f) => ({ ...f, logo: data }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setNotice({ type: 'error', text: 'El nombre de la marca es obligatorio.' });
      return;
    }
    setSaving(true);
    const synced = await onSave(sanitizeBrand(form));
    setSaving(false);
    if (synced) {
      onClose();
    } else {
      setNotice({
        type: 'warn',
        text: 'Se guardó en este dispositivo, pero no pudo sincronizarse con la nube. Reintentá más tarde.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6">
      <div className="fixed inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-white/15 bg-[color:var(--surface-0)]/95 shadow-2xl backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/10">
              <Briefcase className="h-5 w-5 text-[color:var(--accent)]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Mi marca</h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[color:var(--text-secondary)]">
                <Lock className="h-3 w-3 shrink-0" />
                Solo se usa en el espacio MARCA. Nunca se comparte con PERSONAL.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-[color:var(--text-secondary)] transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="mb-1 block text-xs font-semibold text-white">{f.label}</span>
              {f.multiline ? (
                <textarea
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.hint}
                  maxLength={BRAND_FIELD_MAX}
                  rows={2}
                  className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent)]/60 focus:outline-none"
                />
              ) : (
                <input
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.hint}
                  maxLength={f.key === 'name' ? 120 : BRAND_FIELD_MAX}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent)]/60 focus:outline-none"
                />
              )}
            </label>
          ))}

          {/* Logo opcional */}
          <div>
            <span className="mb-1 block text-xs font-semibold text-white">Logo (opcional)</span>
            <div className="flex items-center gap-3">
              {form.logo ? (
                <img
                  src={form.logo}
                  alt="Logo de la marca"
                  className="h-14 w-14 rounded-xl border border-white/10 bg-white/5 object-contain"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-white/20 text-[10px] text-[color:var(--text-muted)]">
                  Sin logo
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white transition-colors hover:bg-white/10"
              >
                <Upload className="h-3.5 w-3.5" />
                Subir logo
              </button>
              {form.logo && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, logo: '' })}
                  className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-[color:var(--text-secondary)] transition-colors hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Quitar
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  handleLogo(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t border-white/10 p-5">
          {notice && (
            <p
              className={`text-xs ${
                notice.type === 'error'
                  ? 'text-red-400'
                  : notice.type === 'warn'
                  ? 'text-amber-300'
                  : 'text-emerald-400'
              }`}
            >
              {notice.text}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs text-[color:var(--text-secondary)] transition-colors hover:bg-white/5 hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl border border-[color:var(--accent)]/40 bg-[color:var(--accent)]/20 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[color:var(--accent)]/30 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Guardando…' : 'Guardar marca'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
