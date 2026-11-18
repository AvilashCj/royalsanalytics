import React from 'react';
import { Crown } from 'lucide-react';
import { usePlayerPhotos } from '../utils/playerPhotos';

interface PlayerAvatarProps {
  name: string;
  rank?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showRankBadge?: boolean;
}

export function getPlayerInitials(name: string): string {
  if (!name) return 'RR';
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  name,
  rank,
  size = 'sm',
  className = '',
  showRankBadge = false,
}) => {
  const { getPlayerPhoto } = usePlayerPhotos();
  const photoUrl = getPlayerPhoto(name);
  const initials = getPlayerInitials(name);

  const isRank1 = rank === 1;

  const sizeConfig = {
    sm: {
      box: 'w-9 h-9 min-w-[36px] min-h-[36px]',
      ring: isRank1
        ? 'ring-1.5 ring-[#D4AF37] shadow-2xs'
        : 'ring-1 ring-white/15 shadow-2xs',
      text: 'text-xs',
      crown: false,
      badge: 'w-4 h-4 text-[9px] -bottom-0.5 -right-0.5',
    },
    md: {
      box: 'w-12 h-12 min-w-[48px] min-h-[48px]',
      ring: isRank1
        ? 'ring-2 ring-[#D4AF37] shadow-xs'
        : 'ring-1 ring-white/15 shadow-xs',
      text: 'text-base',
      crown: false,
      badge: 'w-5 h-5 text-[10px] -bottom-0.5 -right-0.5',
    },
    lg: {
      box: 'w-20 h-20 md:w-22 md:h-22 min-w-[80px] min-h-[80px]',
      ring: isRank1
        ? 'ring-2 ring-[#D4AF37] shadow-md'
        : 'ring-1 ring-white/15 shadow-md',
      text: 'text-2xl md:text-3xl',
      crown: isRank1,
      badge: 'w-6 h-6 text-xs -bottom-1 -right-1',
    },
    xl: {
      box: 'w-[108px] h-[108px] min-w-[108px] min-h-[108px]',
      ring: isRank1
        ? 'ring-2 ring-[#D4AF37] shadow-lg'
        : 'ring-1 ring-white/20 shadow-lg',
      text: 'text-3xl',
      crown: isRank1,
      badge: 'w-7 h-7 text-xs -bottom-1 -right-1',
    },
  }[size];

  return (
    <div className={`relative inline-flex items-center justify-center select-none shrink-0 ${className}`}>
      <div
        className={`${sizeConfig.box} ${sizeConfig.ring} relative rounded-full overflow-hidden flex items-center justify-center transition-transform duration-300`}
        style={{
          background: photoUrl
            ? 'radial-gradient(circle at 50% 25%, #1E293B 0%, #0F172A 100%)'
            : isRank1
            ? 'linear-gradient(145deg, #1E1B4B 0%, #0F172A 65%, #3B0764 100%)'
            : 'linear-gradient(145deg, #1E293B 0%, #0F172A 75%, #172554 100%)',
        }}
      >
        {/* Subtle inner hairline rim */}
        <div
          className="absolute inset-[1px] rounded-full pointer-events-none border"
          style={{
            borderColor: isRank1 ? 'rgba(212, 175, 55, 0.45)' : 'rgba(255, 255, 255, 0.12)',
          }}
        />

        {photoUrl ? (
          <img
            src={photoUrl}
            alt={name}
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <>
            {/* Broadcast Scorebug Jersey-Collar Trim */}
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-0 w-full h-full pointer-events-none opacity-85"
              aria-hidden="true"
            >
              {/* Subtle jersey shoulders & V-neck collar */}
              <path
                d="M14 96 C20 76, 34 72, 50 72 C66 72, 80 76, 86 96 Z"
                fill={isRank1 ? 'rgba(212, 175, 55, 0.16)' : 'rgba(234, 26, 133, 0.18)'}
              />
              <path
                d="M35 73 L50 86 L65 73"
                fill="none"
                stroke={isRank1 ? '#D4AF37' : '#EA1A85'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <div className="flex flex-col items-center justify-center leading-none z-10 -mt-1">
              {sizeConfig.crown && (
                <Crown
                  className="h-3 w-3 mb-0.5 text-[#D4AF37]"
                  strokeWidth={2.2}
                />
              )}
              <span
                className={`font-numeric font-bold tracking-wider text-white ${sizeConfig.text}`}
              >
                {initials}
              </span>
            </div>
          </>
        )}
      </div>

      {showRankBadge && rank !== undefined && rank <= 10 && (
        <span
          className={`absolute ${sizeConfig.badge} rounded-full flex items-center justify-center font-numeric font-bold border border-white/90 shadow-2xs ${
            isRank1
              ? 'bg-[#D4AF37] text-slate-950'
              : 'bg-slate-800 text-white'
          }`}
        >
          #{rank}
        </span>
      )}
    </div>
  );
};
