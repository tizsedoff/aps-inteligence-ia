import React, { useState } from 'react';
import { CookiePreferences } from '../types';
import { Shield, Cookie, X, Check, FileText, ChevronRight } from 'lucide-react';

interface LegalModalsProps {
  isTermsOpen: boolean;
  onCloseTerms: () => void;
  cookiePrefs: CookiePreferences;
  onUpdateCookiePrefs: (prefs: CookiePreferences) => void;
}

export const LegalModals: React.FC<LegalModalsProps> = ({
  isTermsOpen,
  onCloseTerms,
  cookiePrefs,
  onUpdateCookiePrefs,
}) => {
  const [showCookieSettings, setShowCookieSettings] = useState(false);
  const [tempPrefs, setTempPrefs] = useState<CookiePreferences>(cookiePrefs);

  const handleAcceptAll = () => {
    const updated: CookiePreferences = {
      accepted: true,
      necessary: true,
      performance: true,
      personalization: true,
      timestamp: Date.now(),
    };
    localStorage.setItem('aps_cookies', JSON.stringify(updated));
    onUpdateCookiePrefs(updated);
  };

  const handleRejectNonEssential = () => {
    const updated: CookiePreferences = {
      accepted: true,
      necessary: true,
      performance: false,
      personalization: false,
      timestamp: Date.now(),
    };
    localStorage.setItem('aps_cookies', JSON.stringify(updated));
    onUpdateCookiePrefs(updated);
    setShowCookieSettings(false);
  };

  const handleSaveCustom = () => {
    const updated: CookiePreferences = {
      ...tempPrefs,
      accepted: true,
      timestamp: Date.now(),
    };
    localStorage.setItem('aps_cookies', JSON.stringify(updated));
    onUpdateCookiePrefs(updated);
    setShowCookieSettings(false);
  };

  return (
    <>
      {/* 1. COOKIE BANNER (if not accepted yet) */}
      {!cookiePrefs.accepted && (
        <div className="fixed bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-40 mx-auto max-w-4xl max-h-[70vh] overflow-y-auto">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 rounded-2xl border border-[color:var(--accent)]/40 bg-[color:var(--surface-1)]/90 p-4 shadow-2xl backdrop-blur-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[color:var(--accent)]/30 bg-[color:var(--surface-3)] text-[color:var(--accent-soft)]">
                <Cookie className="h-5 w-5 text-[color:var(--accent)]" />
              </div>
              <div className="text-xs">
                <span className="font-serif-luxury font-bold text-[color:var(--accent-soft)] block mb-0.5">
                  Privacidad & Gestión de Cookies en APS INTELLIGENCE
                </span>
                <p className="text-[color:var(--text-secondary)] leading-relaxed">
                  Utilizamos cookies esenciales y de personalización para recordar tus ajustes visuales, temas y sesiones en tu dispositivo. Consulta nuestros{' '}
                  <button
                    onClick={() => {
                      /* open terms */
                    }}
                    className="text-[color:var(--accent)] underline hover:text-[color:var(--accent-soft)]"
                  >
                    Términos y Condiciones
                  </button>.
                </p>
              </div>
            </div>

            <div className="flex w-full sm:w-auto flex-wrap items-center justify-end gap-2 shrink-0">
              <button
                onClick={() => setShowCookieSettings(true)}
                className="rounded-xl border border-[color:var(--accent)]/30 bg-white/5 px-3 py-1.5 text-xs text-[color:var(--text-secondary)] hover:bg-white/10 hover:text-white transition-colors"
              >
                Preferencias
              </button>
              <button
                onClick={handleRejectNonEssential}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[color:var(--text-secondary)] hover:bg-white/10 hover:text-white transition-colors"
              >
                Solo Esenciales
              </button>
              <button
                onClick={handleAcceptAll}
                className="rounded-xl border border-[color:var(--accent)]/50 bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-hover)] px-4 py-1.5 text-xs font-serif-luxury font-bold text-[color:var(--on-accent)] shadow-md hover:brightness-110 transition-all"
              >
                Aceptar Todas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. COOKIE DETAILED SETTINGS MODAL */}
      {showCookieSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setShowCookieSettings(false)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-3xl border border-[color:var(--accent)]/30 bg-[color:var(--surface-1)]/95 p-6 shadow-2xl backdrop-blur-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[color:var(--accent)]/20 pb-3">
              <div className="flex items-center gap-2.5">
                <Cookie className="h-5 w-5 text-[color:var(--accent)]" />
                <h3 className="font-serif-luxury text-base font-bold text-[color:var(--accent-soft)]">
                  Configuración de Cookies
                </h3>
              </div>
              <button
                onClick={() => setShowCookieSettings(false)}
                className="rounded-lg p-1.5 text-[color:var(--text-secondary)] hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Necessary */}
              <div className="flex items-center justify-between rounded-xl border border-[color:var(--accent)]/20 bg-[color:var(--surface-2)]/70 p-3">
                <div>
                  <span className="font-semibold text-[color:var(--accent-soft)] block">Cookies Esenciales</span>
                  <p className="text-[color:var(--text-secondary)]">
                    Necesarias para la autenticación, seguridad y funcionamiento técnico básico.
                  </p>
                </div>
                <span className="font-mono-code text-[11px] text-emerald-400 font-semibold">
                  Siempre Activas
                </span>
              </div>

              {/* Personalization */}
              <div className="flex items-center justify-between rounded-xl border border-[color:var(--accent)]/20 bg-[color:var(--surface-2)]/70 p-3">
                <div className="pr-4">
                  <span className="font-semibold text-[color:var(--accent-soft)] block">Personalización Visual</span>
                  <p className="text-[color:var(--text-secondary)]">
                    Permiten almacenar tus colores, gradientes, wallpapers, globos y efectos de cristal líquido.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={tempPrefs.personalization}
                  onChange={(e) =>
                    setTempPrefs((p) => ({ ...p, personalization: e.target.checked }))
                  }
                  className="accent-[color:var(--accent)] h-4 w-4 cursor-pointer"
                />
              </div>

              {/* Performance */}
              <div className="flex items-center justify-between rounded-xl border border-[color:var(--accent)]/20 bg-[color:var(--surface-2)]/70 p-3">
                <div className="pr-4">
                  <span className="font-semibold text-[color:var(--accent-soft)] block">Rendimiento & Cómputo</span>
                  <p className="text-[color:var(--text-secondary)]">
                    Medición anónima de latencia de modelos APS y rendimiento de ejecución en CLI.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={tempPrefs.performance}
                  onChange={(e) =>
                    setTempPrefs((p) => ({ ...p, performance: e.target.checked }))
                  }
                  className="accent-[color:var(--accent)] h-4 w-4 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-[color:var(--accent)]/15 pt-4">
              <button
                onClick={handleRejectNonEssential}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs text-[color:var(--text-secondary)] hover:bg-white/10 hover:text-white"
              >
                Rechazar Opcionales
              </button>
              <button
                onClick={handleSaveCustom}
                className="rounded-xl border border-[color:var(--accent)]/50 bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-hover)] px-5 py-2 text-xs font-serif-luxury font-bold text-[color:var(--on-accent)] shadow"
              >
                Guardar Preferencias
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. FULL TERMS AND CONDITIONS MODAL */}
      {isTermsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onCloseTerms} />
          <div className="relative z-10 flex h-[85vh] w-full max-w-2xl flex-col rounded-3xl border border-[color:var(--accent)]/30 bg-[color:var(--surface-1)]/95 shadow-2xl backdrop-blur-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[color:var(--accent)]/20 bg-[color:var(--surface-2)]/90 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-[color:var(--accent)]" />
                <h3 className="font-serif-luxury text-base font-bold text-[color:var(--accent-soft)]">
                  TÉRMINOS Y CONDICIONES DEL SERVICIO
                </h3>
              </div>
              <button
                onClick={onCloseTerms}
                className="rounded-xl p-1.5 text-[color:var(--text-secondary)] hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Terms Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs leading-relaxed text-[color:var(--text-secondary)]">
              <div className="rounded-xl border border-[color:var(--accent)]/20 bg-[color:var(--surface-2)]/60 p-4">
                <h4 className="font-serif-luxury font-bold text-[color:var(--accent-soft)] mb-1">
                  1. Aceptación del Servicio APS INTELLIGENCE
                </h4>
                <p>
                  Al acceder y utilizar la plataforma de inteligencia artificial APS INTELLIGENCE, el usuario acepta de forma vinculante los presentes Términos y Condiciones, así como el tratamiento de sus preferencias conforme a las normativas vigentes de protección de datos.
                </p>
              </div>

              <div className="rounded-xl border border-[color:var(--accent)]/20 bg-[color:var(--surface-2)]/60 p-4">
                <h4 className="font-serif-luxury font-bold text-[color:var(--accent-soft)] mb-1">
                  2. Modelos Cognitivos y Uso de Cómputo
                </h4>
                <p>
                  Los modelos APS INSTANT, APS PRO y APS HARD WORK son provistos con fines analíticos, creativos y de ingeniería de software. El usuario se compromete a no emplear el generador de código CLI ni el razonamiento heurístico para actividades perjudiciales, desarrollo de software malicioso ni vulneración de sistemas informáticos.
                </p>
              </div>

              <div className="rounded-xl border border-[color:var(--accent)]/20 bg-[color:var(--surface-2)]/60 p-4">
                <h4 className="font-serif-luxury font-bold text-[color:var(--accent-soft)] mb-1">
                  3. Privacidad y Tratamiento de Archivos e Imágenes
                </h4>
                <p>
                  Los archivos, imágenes y código cargados en la interfaz para su procesamiento en tiempo real son tratados exclusivamente para la inferencia de la sesión solicitada por el usuario, sin almacenamiento no consentido ni venta a terceros.
                </p>
              </div>

              <div className="rounded-xl border border-[color:var(--accent)]/20 bg-[color:var(--surface-2)]/60 p-4">
                <h4 className="font-serif-luxury font-bold text-[color:var(--accent-soft)] mb-1">
                  4. Propiedad Intelectual del Código Generado
                </h4>
                <p>
                  Todo código, artefacto o script producido dentro de la consola CLI de APS HARD WORK es propiedad del usuario que originó el comando, concediendo plena libertad para su compilación, integración o despliegue comercial.
                </p>
              </div>

              <div className="rounded-xl border border-[color:var(--accent)]/20 bg-[color:var(--surface-2)]/60 p-4">
                <h4 className="font-serif-luxury font-bold text-[color:var(--accent-soft)] mb-1">
                  5. Personalización y Almacenamiento Local
                </h4>
                <p>
                  Las configuraciones visuales (fondos, física de liquid glass, colores de globos de texto) se guardan localmente en el dispositivo del usuario para garantizar su soberanía sobre la experiencia visual.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-[color:var(--accent)]/20 bg-[color:var(--surface-2)]/90 px-6 py-4">
              <span className="text-[11px] text-[color:var(--text-secondary)]">Última actualización: 2026 · Versión 3.8</span>
              <button
                onClick={onCloseTerms}
                className="rounded-xl border border-[color:var(--accent)]/50 bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-hover)] px-5 py-2 text-xs font-serif-luxury font-bold text-[color:var(--on-accent)] shadow"
              >
                He Leído y Acepto
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
