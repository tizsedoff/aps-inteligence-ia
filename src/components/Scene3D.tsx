import React, { Suspense } from 'react';
import { hasWebGL, prefersReducedMotion } from '../lib/sceneBus';

// Three.js pesa bastante: se descarga solo cuando el fondo 3D está activo y el navegador lo soporta.
const Scene3DCanvas = React.lazy(() => import('./Scene3DCanvas'));

interface Scene3DProps {
  enabled: boolean;
  accent: string;
  accent2: string;
}

export const Scene3D: React.FC<Scene3DProps> = ({ enabled, accent, accent2 }) => {
  const [supported] = React.useState(() => hasWebGL() && !prefersReducedMotion());
  if (!enabled || !supported) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-90">
      <Suspense fallback={null}>
        <Scene3DCanvas accent={accent} accent2={accent2} />
      </Suspense>
      {/* Viñeta suave: oscurece los bordes para que la escena no compita con el contenido */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 60% 45%, transparent 35%, rgba(0,0,0,0.55) 100%)' }}
      />
    </div>
  );
};
