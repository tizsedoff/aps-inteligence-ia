import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CookiePreferences } from '../types';
import { Cookie, X, FileText } from 'lucide-react';
import { LEGAL_DOCS, LEGAL_DOC_BY_ID, LegalTab } from '../constants/legalDocs';
import { BUSINESS, LEGAL_UPDATED_LABEL } from '../constants/business';

interface LegalModalsProps {
  isTermsOpen: boolean;
  onCloseTerms: () => void;
  /** Pestaña que se muestra al abrir desde afuera (por defecto, Términos). */
  initialTab?: LegalTab;
  cookiePrefs: CookiePreferences;
  onUpdateCookiePrefs: (prefs: CookiePreferences) => void;
}

// Claves de personalización visual: solo se guardan si el usuario lo permite.
const PERSONALIZATION_KEYS = ['aps_customization', 'aps_logo_compact', 'aps_logo_large'];

/** Foco dentro del diálogo, cierre con Escape y Tab que no se escapa del diálogo. */
function useDialog(active: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!active) return;
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab' || !ref.current) return;
      const focusable = ref.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [active]);

  return ref;
}

const cardCls =
  'rounded-xl border border-[color:var(--accent)]/20 bg-[color:var(--surface-2)]/60 p-4';
const btnCls =
  'rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition-colors';

export const LegalModals: React.FC<LegalModalsProps> = ({
  isTermsOpen,
  onCloseTerms,
  initialTab,
  cookiePrefs,
  onUpdateCookiePrefs,
}) => {
  const [showCookieSettings, setShowCookieSettings] = useState(false);
  const [tempPrefs, setTempPrefs] = useState<CookiePreferences>(cookiePrefs);
  const [internalOpen, setInternalOpen] = useState(false);
  const [tab, setTab] = useState<LegalTab>('terms');

  const legalOpen = isTermsOpen || internalOpen;

  useEffect(() => {
    if (isTermsOpen) setTab(initialTab ?? 'terms');
  }, [isTermsOpen, initialTab]);

  const closeLegal = useCallback(() => {
    setInternalOpen(false);
    onCloseTerms();
  }, [onCloseTerms]);

  const closeSettings = useCallback(() => setShowCookieSettings(false), []);

  const openLegalTab = (t: LegalTab) => {
    setTab(t);
    setInternalOpen(true);
  };

  const openSettings = () => {
    setTempPrefs({ ...cookiePrefs, performance: false });
    setShowCookieSettings(true);
  };

  const legalRef = useDialog(legalOpen && !showCookieSettings, closeLegal);
  const settingsRef = useDialog(showCookieSettings, closeSettings);

  const save = (personalization: boolean) => {
    const updated: CookiePreferences = {
      accepted: true,
      necessary: true,
      performance: false, // no hay analítica ni medición: nunca se activa
      personalization,
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem('aps_cookies', JSON.stringify(updated));
      if (!personalization) PERSONALIZATION_KEYS.forEach((k) => localStorage.removeItem(k));
    } catch {
      // sin almacenamiento disponible: la elección vale solo para esta sesión
    }
    onUpdateCookiePrefs(updated);
    setShowCookieSettings(false);
  };

  const doc = LEGAL_DOC_BY_ID[tab];

  return (
    <>
      {/* 1. AVISO DE ALMACENAMIENTO: las tres opciones pesan lo mismo */}
      {!cookiePrefs.accepted && (
        <div
          role="region"
          aria-label="Aviso de cookies y almacenamiento"
          className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-4xl"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-[color:var(--accent)]/40 bg-[color:var(--surface-1)]/95 p-4 shadow-2xl backdrop-blur-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[color:var(--accent)]/30 bg-[color:var(--surface-3)]">
                <Cookie className="h-5 w-5 text-[color:var(--accent)]" aria-hidden="true" />
              </div>
              <div className="text-xs">
                <span className="font-serif-luxury font-bold text-[color:var(--accent-soft)] block mb-0.5">
                  Tu privacidad en APS INTELLIGENCE
                </span>
                <p className="text-[color:var(--text-secondary)] leading-relaxed">
                  Guardamos datos en tu navegador para que la app funcione (sesión, chats) y, solo si lo permitís, para recordar tu personalización visual. No usamos publicidad ni analítica de terceros. Más en la{' '}
                  <button
                    type="button"
                    onClick={() => openLegalTab('cookies')}
                    className="text-[color:var(--accent)] underline hover:text-[color:var(--accent-soft)]"
                  >
                    Política de Cookies
                  </button>{' '}
                  y la{' '}
                  <button
                    type="button"
                    onClick={() => openLegalTab('privacy')}
                    className="text-[color:var(--accent)] underline hover:text-[color:var(--accent-soft)]"
                  >
                    Política de Privacidad
                  </button>
                  .
                </p>
              </div>
            </div>

            <div className="flex w-full sm:w-auto flex-wrap items-center justify-end gap-2 shrink-0">
              <button type="button" onClick={openSettings} className={btnCls}>
                Configurar
              </button>
              <button type="button" onClick={() => save(false)} className={btnCls}>
                Solo esenciales
              </button>
              <button type="button" onClick={() => save(true)} className={btnCls}>
                Aceptar todas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. DOCUMENTOS LEGALES (pestañas) */}
      {legalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={closeLegal} aria-hidden="true" />
          <div
            ref={legalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="legal-title"
            tabIndex={-1}
            className="relative z-10 flex h-[85vh] w-full max-w-2xl flex-col rounded-3xl border border-[color:var(--accent)]/30 bg-[color:var(--surface-1)]/95 shadow-2xl backdrop-blur-2xl focus:outline-none"
          >
            <div className="flex items-center justify-between border-b border-[color:var(--accent)]/20 bg-[color:var(--surface-2)]/90 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-[color:var(--accent)]" aria-hidden="true" />
                <h3 id="legal-title" className="font-serif-luxury text-base font-bold text-[color:var(--accent-soft)]">
                  {doc.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeLegal}
                aria-label="Cerrar"
                className="rounded-xl p-1.5 text-[color:var(--text-secondary)] hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div
              role="tablist"
              aria-label="Documentos legales"
              className="flex gap-1 overflow-x-auto border-b border-[color:var(--accent)]/15 px-4 py-2"
            >
              {LEGAL_DOCS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  role="tab"
                  id={`legal-tab-${d.id}`}
                  aria-selected={tab === d.id}
                  aria-controls="legal-panel"
                  onClick={() => setTab(d.id)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    tab === d.id
                      ? 'bg-[color:var(--accent)]/20 text-[color:var(--accent)]'
                      : 'text-[color:var(--text-secondary)] hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <div
              id="legal-panel"
              role="tabpanel"
              aria-labelledby={`legal-tab-${tab}`}
              className="flex-1 overflow-y-auto p-6 space-y-4 text-xs leading-relaxed text-[color:var(--text-secondary)]"
            >
              {doc.sections.map((s) => (
                <section key={s.title} className={cardCls}>
                  <h4 className="font-serif-luxury font-bold text-[color:var(--accent-soft)] mb-1.5">{s.title}</h4>
                  {s.paragraphs?.map((p, i) => (
                    <p key={i} className={i > 0 ? 'mt-2' : ''}>
                      {p}
                    </p>
                  ))}
                  {s.table && (
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full min-w-[420px] border-collapse text-left">
                        <thead>
                          <tr>
                            {s.table.head.map((h) => (
                              <th key={h} scope="col" className="border-b border-white/15 py-1.5 pr-3 font-semibold text-white">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {s.table.rows.map((row) => (
                            <tr key={row[0]}>
                              {row.map((cell, i) => (
                                <td key={i} className="border-b border-white/10 py-1.5 pr-3 align-top">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {s.bullets && (
                    <ul className="mt-2 list-disc space-y-1 pl-4">
                      {s.bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}

              {tab === 'cookies' && (
                <div className={cardCls}>
                  <button type="button" onClick={openSettings} className={btnCls}>
                    Cambiar mis preferencias de cookies
                  </button>
                </div>
              )}

              <div className={cardCls}>
                <h4 className="font-serif-luxury font-bold text-[color:var(--accent-soft)] mb-1.5">Contacto</h4>
                <p>
                  {BUSINESS.name} ·{' '}
                  <a className="text-[color:var(--accent)] underline" href={`mailto:${BUSINESS.email}`}>
                    {BUSINESS.email}
                  </a>{' '}
                  ·{' '}
                  <a className="text-[color:var(--accent)] underline" href={BUSINESS.whatsappUrl} target="_blank" rel="noopener noreferrer">
                    WhatsApp {BUSINESS.whatsappDisplay}
                  </a>{' '}

                </p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[color:var(--accent)]/20 bg-[color:var(--surface-2)]/90 px-6 py-4">
              <span className="text-[11px] text-[color:var(--text-secondary)]">
                Última actualización: {LEGAL_UPDATED_LABEL}
              </span>
              <button
                type="button"
                onClick={closeLegal}
                className="rounded-xl border border-[color:var(--accent)]/50 bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-hover)] px-5 py-2 text-xs font-serif-luxury font-bold text-[color:var(--on-accent)] shadow"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. PREFERENCIAS DE COOKIES (encima de todo) */}
      {showCookieSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={closeSettings} aria-hidden="true" />
          <div
            ref={settingsRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-settings-title"
            tabIndex={-1}
            className="relative z-10 w-full max-w-lg rounded-3xl border border-[color:var(--accent)]/30 bg-[color:var(--surface-1)]/95 p-6 shadow-2xl backdrop-blur-2xl space-y-5 focus:outline-none"
          >
            <div className="flex items-center justify-between border-b border-[color:var(--accent)]/20 pb-3">
              <div className="flex items-center gap-2.5">
                <Cookie className="h-5 w-5 text-[color:var(--accent)]" aria-hidden="true" />
                <h3 id="cookie-settings-title" className="font-serif-luxury text-base font-bold text-[color:var(--accent-soft)]">
                  Preferencias de cookies
                </h3>
              </div>
              <button
                type="button"
                onClick={closeSettings}
                aria-label="Cerrar"
                className="rounded-lg p-1.5 text-[color:var(--text-secondary)] hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between rounded-xl border border-[color:var(--accent)]/20 bg-[color:var(--surface-2)]/70 p-3">
                <div className="pr-4">
                  <span className="font-semibold text-[color:var(--accent-soft)] block">Esenciales</span>
                  <p className="text-[color:var(--text-secondary)]">
                    Sesión, seguridad, historial de chats y funcionamiento básico de la app.
                  </p>
                </div>
                <span className="font-mono-code text-[11px] text-emerald-400 font-semibold shrink-0">Siempre activas</span>
              </div>

              <label
                htmlFor="pref-personalization"
                className="flex cursor-pointer items-center justify-between rounded-xl border border-[color:var(--accent)]/20 bg-[color:var(--surface-2)]/70 p-3"
              >
                <div className="pr-4">
                  <span className="font-semibold text-[color:var(--accent-soft)] block">Personalización visual</span>
                  <p className="text-[color:var(--text-secondary)]">
                    Guarda en tu dispositivo tus colores, fondos y logos personalizados.
                  </p>
                </div>
                <input
                  id="pref-personalization"
                  type="checkbox"
                  checked={tempPrefs.personalization}
                  onChange={(e) => setTempPrefs((p) => ({ ...p, personalization: e.target.checked }))}
                  className="accent-[color:var(--accent)] h-4 w-4 cursor-pointer shrink-0"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-[color:var(--accent)]/15 pt-4">
              <button type="button" onClick={() => save(false)} className={btnCls}>
                Solo esenciales
              </button>
              <button type="button" onClick={() => save(tempPrefs.personalization)} className={btnCls}>
                Guardar preferencias
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
