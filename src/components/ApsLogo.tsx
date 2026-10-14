import React from 'react';

interface ApsLogoProps {
  variant?: 'compact' | 'full' | 'icon';
  className?: string;
  size?: number | string;
  glow?: boolean;
}

/**
 * APS INTELLIGENCE Logo Component
 * - 'compact' / 'icon': Used for small spaces like the send button (replacing the arrow)
 *   and the hamburger menu (replacing the 3 bars). Integrates seamlessly with backgrounds.
 * - 'full': Used for wider spaces (Header, Sidebar, Auth Gateway, Welcome Hero).
 */
export const ApsLogo: React.FC<ApsLogoProps> = ({
  variant = 'compact',
  className = '',
  size,
  glow = false,
}) => {
  // COMPACT LOGO (Icon/Emblem for send button & 3 bars menu)
  if (variant === 'compact' || variant === 'icon') {
    return (
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`transition-all duration-300 ${glow ? 'drop-shadow-[0_0_8px_rgba(0,206,201,0.6)]' : ''} ${className}`}
        style={size ? { width: size, height: size } : undefined}
      >
        <defs>
          <linearGradient id="apsCompactGrad" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00cec9" />
            <stop offset="50%" stopColor="#0984e3" />
            <stop offset="100%" stopColor="#a29bfe" />
          </linearGradient>
          <linearGradient id="apsGoldGrad" x1="6" y1="6" x2="26" y2="26" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f4e2b8" />
            <stop offset="100%" stopColor="#c5a059" />
          </linearGradient>
        </defs>

        {/* Outer stylized faceted hexagon / diamond crystal */}
        <path
          d="M16 2.5L28.5 9.5V22.5L16 29.5L3.5 22.5V9.5L16 2.5Z"
          stroke="url(#apsCompactGrad)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-90"
        />

        {/* Inner dynamic upward apex / chevron symbolizing intelligence & ascension (ideal for send arrow) */}
        <path
          d="M16 7L23 18.5H18.5V24.5H13.5V18.5H9L16 7Z"
          fill="url(#apsCompactGrad)"
          className="drop-shadow-sm"
        />

        {/* Precision core golden spark */}
        <circle cx="16" cy="14" r="1.5" fill="url(#apsGoldGrad)" />
      </svg>
    );
  }

  // FULL LOGO (Large spaces: Header, Sidebar, Auth, Hero)
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Brand Icon Crest */}
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 drop-shadow-[0_0_15px_rgba(0,206,201,0.45)]"
      >
        <defs>
          <linearGradient id="apsFullGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00cec9" />
            <stop offset="50%" stopColor="#0984e3" />
            <stop offset="100%" stopColor="#6c5ce7" />
          </linearGradient>
          <linearGradient id="apsFullGold" x1="10" y1="8" x2="30" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f7e7ce" />
            <stop offset="100%" stopColor="#c5a059" />
          </linearGradient>
          <radialGradient id="apsInnerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0,206,201,0.25)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#apsInnerGlow)" />
        <rect
          x="2"
          y="2"
          width="36"
          height="36"
          rx="10"
          stroke="url(#apsFullGrad)"
          strokeWidth="1.75"
          className="opacity-80"
        />

        {/* Central Geometric Stylized Monogram */}
        <path
          d="M20 7.5L30 24.5H23.5V31.5H16.5V24.5H10L20 7.5Z"
          fill="url(#apsFullGrad)"
        />
        {/* Diamond Core */}
        <polygon points="20,12 23,19 20,23 17,19" fill="url(#apsFullGold)" />
      </svg>

      {/* Typography */}
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1.5">
          <span className="font-serif-luxury text-base sm:text-lg font-extrabold tracking-[0.2em] bg-gradient-to-r from-white via-[#e8ebe4] to-[#f4e2b8] bg-clip-text text-transparent">
            APS
          </span>
          <span className="text-[9px] font-mono-code font-bold tracking-widest text-[#00cec9] px-1.5 py-0.5 rounded border border-[#00cec9]/30 bg-[#00cec9]/10">
            INTELLIGENCE
          </span>
        </div>
        <span className="text-[9px] font-mono-code text-[#8e9c8c] tracking-widest uppercase">
          Autonomous Neural System
        </span>
      </div>
    </div>
  );
};
