import React, { useState, useEffect } from 'react';
import compactDefault from '../assets/images/logo-compact.png';
import largeDefault from '../assets/images/logo-large.png';

interface ApsLogoProps {
  variant?: 'compact' | 'full' | 'icon';
  className?: string;
  size?: number | string;
  glow?: boolean;
  alt?: string;
}

/**
 * APS Official Logo Component
 * - Uses the EXACT images provided by the user (compact emblem and full logo with typography).
 * - 'compact' / 'icon': For small spaces (send button replacing the arrow, and hamburger 3-bars).
 * - 'full': For larger spaces (Header brand, Sidebar, Welcome hero, Auth modal).
 * - Transparent PNG cleanly integrated with dark glass backgrounds.
 */
export const ApsLogo: React.FC<ApsLogoProps> = ({
  variant = 'compact',
  className = '',
  size,
  glow = false,
  alt = 'APS Logo',
}) => {
  const [compactSrc, setCompactSrc] = useState<string>(compactDefault);
  const [largeSrc, setLargeSrc] = useState<string>(largeDefault);

  useEffect(() => {
    // Check if user uploaded a custom logo via Visual Customizer
    const savedCompact = localStorage.getItem('aps_logo_compact');
    if (savedCompact && savedCompact.startsWith('data:image')) {
      setCompactSrc(savedCompact);
    }

    const savedLarge = localStorage.getItem('aps_logo_large');
    if (savedLarge && savedLarge.startsWith('data:image')) {
      setLargeSrc(savedLarge);
    }

    const handleStorageChange = () => {
      const c = localStorage.getItem('aps_logo_compact');
      if (c && c.startsWith('data:image')) setCompactSrc(c);
      else setCompactSrc(compactDefault);

      const l = localStorage.getItem('aps_logo_large');
      if (l && l.startsWith('data:image')) setLargeSrc(l);
      else setLargeSrc(largeDefault);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('aps-logo-updated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('aps-logo-updated', handleStorageChange);
    };
  }, []);

  const isCompact = variant === 'compact' || variant === 'icon';
  const targetSrc = isCompact ? compactSrc : largeSrc;

  // COMPACT LOGO: For send arrow, 3-bars hamburger menu, small indicators
  if (isCompact) {
    // Si el llamador define su propio tamaño (h-12, w-16, size-8...), no forzamos h-full/w-full:
    // ambas clases competían y ganaba h-full, agrandando el logo hasta ocupar media pantalla.
    const hasOwnSize = /(^|\s)(h|w|size)-/.test(className);
    return (
      <img
        src={targetSrc}
        alt={alt}
        className={`object-contain select-none transition-all duration-300 ${
          size || hasOwnSize ? '' : 'h-full w-full max-h-full max-w-full'
        } ${
          glow ? 'drop-shadow-[0_0_12px_rgba(0,190,255,0.65)]' : 'drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]'
        } ${className}`}
        style={size ? { width: size, height: size } : undefined}
        loading="eager"
      />
    );
  }

  // FULL LOGO: For larger spaces (Header, Sidebar brand, Welcome screen, Auth modals)
  return (
    <div className={`inline-flex items-center justify-center select-none ${className}`}>
      <img
        src={targetSrc}
        alt={alt}
        className={`w-auto object-contain transition-all duration-300 ${
          size ? 'max-w-none' : 'h-9 max-w-[200px] sm:h-11 sm:max-w-[260px]'
        } ${
          glow ? 'drop-shadow-[0_0_18px_rgba(0,190,255,0.5)]' : 'drop-shadow-[0_3px_12px_rgba(0,0,0,0.7)]'
        }`}
        style={size ? { height: size } : undefined}
        loading="eager"
      />
    </div>
  );
};
