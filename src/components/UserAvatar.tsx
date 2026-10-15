import React from 'react';
import { User, Crown } from 'lucide-react';

interface UserAvatarProps {
  avatar?: string;
  name?: string;
  isAdmin?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatar,
  name = '',
  isAdmin = false,
  size = 'md',
  className = '',
}) => {
  const isImage =
    typeof avatar === 'string' &&
    (avatar.startsWith('data:image') ||
      avatar.startsWith('http://') ||
      avatar.startsWith('https://') ||
      avatar.startsWith('blob:'));

  // Initial letters fallback (never emojis)
  const initial = name.trim().charAt(0).toUpperCase() || 'U';

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center rounded-2xl overflow-hidden border border-white/20 bg-gradient-to-br from-[color:var(--surface-4)] to-[color:var(--surface-1)] text-white font-serif-luxury font-bold shadow-md ${sizeClasses[size]} ${className}`}
    >
      {isImage ? (
        <img
          src={avatar}
          alt={name || 'Avatar'}
          className="h-full w-full object-cover rounded-[inherit]"
          onError={(e) => {
            // Fallback to text initials if image fails
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      ) : (
        <span className="select-none tracking-wider">{initial}</span>
      )}

      {isAdmin && (
        <div
          className="absolute -bottom-1 -right-1 rounded-full bg-emerald-400 p-0.5 text-black shadow-md border border-black"
          title="Administrador Supremo"
        >
          <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
        </div>
      )}
    </div>
  );
};
