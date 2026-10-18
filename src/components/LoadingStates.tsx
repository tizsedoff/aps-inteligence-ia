import React, { useEffect, useRef, useState } from 'react';
import { ApsLogo } from './ApsLogo';

/** Segundos transcurridos desde que el componente se monta (se detiene si active=false). */
export function useElapsedSeconds(active: boolean = true): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = Date.now();
    const id = window.setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return seconds;
}

/** Gota líquida que respira: la firma visual de carga de APS. */
export const LiquidOrb: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`aps-orb ${className}`} aria-hidden="true" />
);

const Dots: React.FC = () => (
  <span className="aps-dots" aria-hidden="true">
    <i />
    <i />
    <i />
  </span>
);

const ImagePending: React.FC<{ seconds: number }> = ({ seconds }) => {
  const label =
    seconds >= 45
      ? 'Está tardando más de lo normal. Puedes detenerla y volver a intentarlo.'
      : seconds >= 20
      ? 'Las imágenes pueden tardar hasta un minuto'
      : 'Creando tu imagen';

  return (
    <div role="status" aria-live="polite" className="w-full max-w-[380px]">
      <div className="aps-aurora relative aspect-square w-full rounded-2xl border border-white/15 shadow-xl">
        <div className="aps-sweep-track">
          <span className="aps-sweep" />
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-3 text-sm text-[color:var(--text-secondary)]">
        <span className="flex items-center gap-2 min-w-0">
          <LiquidOrb className="aps-orb-sm" />
          <span className="truncate sm:whitespace-normal">{label}</span>
        </span>
        <span className="font-mono-code text-[11px] text-[color:var(--text-muted)] shrink-0">
          {seconds} s
        </span>
      </div>
    </div>
  );
};

/**
 * Estado de espera del asistente: se muestra desde que se envía el mensaje
 * hasta que llega el primer texto (o la imagen).
 */
export const AssistantPending: React.FC<{ kind?: 'text' | 'image' }> = ({ kind = 'text' }) => {
  const seconds = useElapsedSeconds();

  if (kind === 'image') return <ImagePending seconds={seconds} />;

  const label =
    seconds >= 25
      ? 'Está tardando más de lo normal. Puedes detenerla con el botón de detener.'
      : seconds >= 10
      ? 'Sigue trabajando en tu respuesta'
      : 'Pensando';

  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3 py-1.5">
      <LiquidOrb />
      <span className="text-sm text-[color:var(--text-secondary)]">{label}</span>
      {seconds < 10 && <Dots />}
      {seconds >= 5 && (
        <span className="font-mono-code text-[11px] text-[color:var(--text-muted)]">{seconds} s</span>
      )}
    </div>
  );
};

/** Imagen generada: aparece desde el desenfoque sobre el mismo marco animado del placeholder. */
export const RevealImage: React.FC<{
  src: string;
  alt: string;
  onClick?: () => void;
}> = ({ src, alt, onClick }) => {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, [src]);

  return (
    <div
      className="aps-aurora aps-reveal-wrap relative inline-block overflow-hidden rounded-2xl"
      data-loaded={loaded}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onClick={onClick}
        data-loaded={loaded}
        className="aps-reveal block max-h-[380px] max-w-full cursor-pointer object-contain"
      />
    </div>
  );
};

/** Pantalla de arranque mientras se confirma la sesión (mismo look que el splash de index.html). */
export const BootSplash: React.FC = () => (
  <div
    role="status"
    aria-label="Cargando APS Intelligence"
    className="flex min-h-screen w-screen flex-col items-center justify-center gap-6 bg-[color:var(--surface-0)]"
  >
    <ApsLogo variant="compact" glow className="aps-boot-logo h-16 w-16 object-contain" />
    <span className="aps-boot-bar" aria-hidden="true">
      <span />
    </span>
  </div>
);
