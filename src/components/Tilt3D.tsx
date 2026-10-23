import React, { useRef } from 'react';
import { prefersReducedMotion } from '../lib/sceneBus';

interface Tilt3DProps {
  children: React.ReactNode;
  max?: number; // grados máximos de inclinación
  className?: string;
}

/** Inclina el contenido en 3D siguiendo al puntero (solo con mouse; en táctil no hace nada). */
export const Tilt3D: React.FC<Tilt3DProps> = ({ children, max = 7, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || prefersReducedMotion()) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transition = 'transform 80ms linear';
    el.style.transform = `perspective(700px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg) translateZ(6px)`;
  };
  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = 'transform 400ms cubic-bezier(.2,.8,.2,1)';
    el.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg) translateZ(0)';
  };

  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={reset} className={className} style={{ willChange: 'transform' }}>
      {children}
    </div>
  );
};
