import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { sceneBus } from '../lib/sceneBus';

// Escena de fondo: geometrías en líneas finas (cian del tema + dorado "old money") y un campo
// de partículas. Minimalista a propósito: poca geometría, sin sombras ni texturas pesadas.
const GOLD = '#c9a96e';
const TARGET_FPS = 45;

interface Props {
  accent: string;
  accent2: string;
}

const circleSprite = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
};

const Scene3DCanvas: React.FC<Props> = ({ accent, accent2 }) => {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      return; // sin WebGL: la app sigue igual, solo sin fondo 3D
    }
    const isSmall = () => host.clientWidth < 768;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall() ? 1.25 : 1.75));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0, 8);

    const rig = new THREE.Group();
    scene.add(rig);

    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(d: T) => {
      disposables.push(d);
      return d;
    };

    // 1) Icosaedro exterior (color del tema)
    const outerGeo = track(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.45, 1)));
    const outerMat = track(new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.28 }));
    const outer = new THREE.LineSegments(outerGeo, outerMat);
    rig.add(outer);

    // 2) Octaedro intermedio (dorado), gira en sentido contrario
    const midGeo = track(new THREE.EdgesGeometry(new THREE.OctahedronGeometry(1.75, 0)));
    const midMat = track(new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.65 }));
    const mid = new THREE.LineSegments(midGeo, midMat);
    rig.add(mid);

    // 3) Núcleo: icosaedro pequeño en líneas (segundo color del tema)
    const coreGeo = track(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.7, 0)));
    const coreMat = track(new THREE.LineBasicMaterial({ color: accent2, transparent: true, opacity: 0.6 }));
    const core = new THREE.LineSegments(coreGeo, coreMat);
    rig.add(core);

    // 4) Partículas en una cáscara esférica: mezcla de dorado y color del tema
    const COUNT = isSmall() ? 260 : 520;
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const cGold = new THREE.Color(GOLD);
    const cAcc = new THREE.Color(accent);
    for (let i = 0; i < COUNT; i++) {
      const r = 3.6 + Math.random() * 6.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.8;
      pos[i * 3 + 2] = r * Math.cos(phi);
      const c = Math.random() < 0.6 ? cGold : cAcc;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    const pGeo = track(new THREE.BufferGeometry());
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const sprite = track(circleSprite());
    const pMat = track(
      new THREE.PointsMaterial({
        size: 0.09,
        map: sprite,
        vertexColors: true,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        sizeAttenuation: true,
      })
    );
    const points = new THREE.Points(pGeo, pMat);
    scene.add(points);

    const resize = () => {
      const w = Math.max(1, host.clientWidth);
      const h = Math.max(1, host.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // En pantallas anchas la figura se corre a la derecha para no competir con el texto
      const wide = w >= 1024;
      rig.position.x = wide ? 3.3 : 0;
      rig.scale.setScalar(wide ? 1 : w >= 768 ? 0.9 : 0.72);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const onPointer = (e: PointerEvent) => {
      sceneBus.px = (e.clientX / window.innerWidth) * 2 - 1;
      sceneBus.py = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    // Estado suavizado (se acerca al objetivo en cada cuadro)
    let rotScroll = 0;
    let swayX = 0;
    let swayY = 0;
    let boost = 0;
    let raf = 0;
    let last = 0;
    let t = 0;
    const minDt = 1000 / TARGET_FPS;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      if (now - last < minDt) return;
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      t += dt;

      // Scroll: gira la figura y desplaza la cámara; la velocidad da un impulso breve
      const targetRot = sceneBus.scrollY * 0.0016;
      rotScroll += (targetRot - rotScroll) * Math.min(1, dt * 4);
      boost += (Math.min(1, Math.abs(sceneBus.velocity) / 60) - boost) * Math.min(1, dt * 6);
      sceneBus.velocity *= 0.9;

      swayX += (sceneBus.px * 0.6 - swayX) * Math.min(1, dt * 2.5);
      swayY += (sceneBus.py * 0.4 - swayY) * Math.min(1, dt * 2.5);

      outer.rotation.y = t * 0.06 + rotScroll;
      outer.rotation.x = t * 0.03 + rotScroll * 0.4;
      mid.rotation.y = -t * 0.1 - rotScroll * 1.4;
      mid.rotation.z = t * 0.05;
      core.rotation.y = t * 0.2 + rotScroll * 2;
      core.rotation.x = t * 0.12;
      const s = 1 + boost * 0.06 + Math.sin(t * 0.8) * 0.01;
      mid.scale.setScalar(s);

      rig.position.y = Math.sin(t * 0.4) * 0.12 - Math.min(2.5, sceneBus.scrollY * 0.0008);
      points.rotation.y = t * 0.012 + rotScroll * 0.35;
      points.rotation.x = rotScroll * 0.15;
      outerMat.opacity = 0.26 + boost * 0.18;
      pMat.opacity = 0.7 + boost * 0.2;

      camera.position.x = swayX;
      camera.position.y = -swayY;
      camera.position.z = 8 - Math.min(1.5, sceneBus.scrollY * 0.0005);
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    const onLost = (e: Event) => e.preventDefault();
    renderer.domElement.addEventListener('webglcontextlost', onLost);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onPointer);
      renderer.domElement.removeEventListener('webglcontextlost', onLost);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [accent, accent2]);

  return <div ref={hostRef} className="h-full w-full" />;
};

export default Scene3DCanvas;
