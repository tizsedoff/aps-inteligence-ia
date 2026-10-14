import React, { useState, useEffect } from 'react';

interface ApsLogoProps {
  variant?: 'compact' | 'full' | 'icon';
  className?: string;
  size?: number | string;
  glow?: boolean;
  alt?: string;
}

/**
 * APS Official Logo Component
 * - Uses REAL IMAGE (<img />) passed by the user, strictly without code-drawn SVG recreation.
 * - 'compact' / 'icon': For small spaces (send button replacing the arrow, and hamburger 3-bars).
 * - 'full': For larger spaces (Header, Sidebar brand, Welcome hero, Auth modal).
 * - Seamlessly integrates with dark background (transparent PNG / WebP / SVG).
 * - Reads from localStorage / VisualCustomization or default /logo-compact.png and /logo-large.png.
 */
export const ApsLogo: React.FC<ApsLogoProps> = ({
  variant = 'compact',
  className = '',
  size,
  glow = false,
  alt = 'APS Logo',
}) => {
  const [compactSrc, setCompactSrc] = useState<string>('/logo-compact.png');
  const [largeSrc, setLargeSrc] = useState<string>('/logo-large.png');
  const [imgError, setImgError] = useState<boolean>(false);

  useEffect(() => {
    // Load custom uploaded images if present in localStorage or window state
    const savedCompact = localStorage.getItem('aps_logo_compact');
    if (savedCompact) setCompactSrc(savedCompact);

    const savedLarge = localStorage.getItem('aps_logo_large');
    if (savedLarge) setLargeSrc(savedLarge);

    const handleStorageChange = () => {
      const c = localStorage.getItem('aps_logo_compact');
      if (c) setCompactSrc(c);
      const l = localStorage.getItem('aps_logo_large');
      if (l) setLargeSrc(l);
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

  // COMPACT LOGO: For send arrow and 3 bars
  if (isCompact) {
    return (
      <img
        src={targetSrc}
        alt={alt}
        className={`object-contain transition-all duration-300 select-none ${
          glow ? 'drop-shadow-[0_0_10px_rgba(0,206,201,0.7)]' : 'drop-shadow-sm'
        } ${className}`}
        style={size ? { width: size, height: size } : undefined}
        onError={() => {
          // If png fails, try .svg or .webp
          if (targetSrc.endsWith('.png')) {
            setCompactSrc('/logo-compact.svg');
          } else {
            setImgError(true);
          }
        }}
      />
    );
  }

  // FULL LOGO: For larger spaces (Header, Sidebar, Login)
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <img
        src={largeSrc}
        alt={alt}
        className={`h-9 w-auto max-w-[180px] sm:h-10 sm:max-w-[220px] object-contain transition-all duration-300 ${
          glow ? 'drop-shadow-[0_0_15px_rgba(0,206,201,0.5)]' : 'drop-shadow-md'
        }`}
        style={size ? { height: size } : undefined}
        onError={() => {
          if (largeSrc.endsWith('.png')) {
            setLargeSrc('/logo-large.svg');
          } else {
            setImgError(true);
          }
        }}
      />
    </div>
  );
};
