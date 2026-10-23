// Canal mutable entre la interfaz y la escena 3D. Se usa un objeto plano (no estado de React)
// para que mover el scroll o el mouse NO re-renderice componentes: la escena lo lee en su
// propio bucle de animación.
export const sceneBus = {
  scrollY: 0, // posición de scroll (px) del panel activo
  velocity: 0, // velocidad de scroll suavizada (px por evento)
  px: 0, // puntero horizontal normalizado (-1..1)
  py: 0, // puntero vertical normalizado (-1..1)
};

let lastTop = 0;

/** Llamar desde el onScroll de cualquier panel con scroll (chat, código, órdenes). */
export function reportScroll(el: HTMLElement) {
  const top = el.scrollTop;
  sceneBus.velocity = sceneBus.velocity * 0.6 + (top - lastTop) * 0.4;
  sceneBus.scrollY = top;
  lastTop = top;
}

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
