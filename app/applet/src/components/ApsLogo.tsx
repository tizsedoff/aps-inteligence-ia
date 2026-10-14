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
 * - Uses REAL IMAGE (<img />) from the user's uploaded files (/logo-compact.png and /logo-large.png).
 * - 'compact' / 'icon': Used for send button and hamburger 3-bars menu.
 * - 'full': Used for Header, Sidebar, Auth modal.
 * - Integrated with background using mix-blend-screen, contrast enhancement, and optional subtle container badge.
 */
export const ApsLogo: React.FC<ApsLogoProps> = ({
  variant = 'compact',
  className = '',
  size,
  glow = false,
  alt = 'APS Intelligence Logo',
}) => {
  const [compactSrc, setCompactSrc] = useState<string>('/logo-compact.png');
  const [largeSrc, setLargeSrc] = useState<string>('/logo-large.png');

  useEffect(() => {
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

  // COMPACT LOGO (Send button & 3-bars hamburger menu)
  if (isCompact) {
    return (
      <div 
        className={`inline-flex items-center justify-center overflow-hidden rounded-md select-none transition-all duration-300 ${
          glow ? 'shadow-[0_0_12px_rgba(0,206,201,0.6)]' : ''
        } ${className}`}
        style={size ? { width: size, height: size } : undefined}
      >
        <img
          src={targetSrc}
          alt={alt}
          className="h-full w-full object-contain mix-blend-screen filter contrast-125 brightness-110 drop-shadow-[0_0_6px_rgba(0,206,201,0.4)] pointer-events-none select-none"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/logo-compact.png';
          }}
        />
      </div>
    );
  }

  // FULL LOGO (Header, Sidebar, Auth modals)
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <img
        src={targetSrc}
        alt={alt}
        className={`h-10 w-auto max-w-[200px] object-contain mix-blend-screen filter contrast-125 brightness-110 transition-all duration-300 ${
          glow ? 'drop-shadow-[0_0_15px_rgba(0,206,201,0.6)]' : 'drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]'
        }`}
        style={size ? { height: size } : undefined}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = '/logo-large.png';
        }}
      />
    </div>
  );
};
