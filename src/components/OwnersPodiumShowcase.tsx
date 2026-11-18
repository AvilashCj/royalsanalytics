import React from 'react';
import { Crown, Award, TrendingUp, ArrowUpRight, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { BatterRating, BowlerRating } from '../types/cricket';
import { PlayerAvatar } from './PlayerAvatar';
import { usePlayerPhotos } from '../utils/playerPhotos';

interface OwnersPodiumShowcaseProps {
  players: (BatterRating | BowlerRating)[];
  type: 'batter' | 'bowler';
  onSelectPlayer: (playerId: number, type: 'batter' | 'bowler') => void;
  onOpenPhotoManager?: () => void;
}

export const OwnersPodiumShowcase: React.FC<OwnersPodiumShowcaseProps> = ({
  players,
  type,
  onSelectPlayer,
  onOpenPhotoManager,
}) => {
  const { teamBannerUrl } = usePlayerPhotos();

  if (players.length < 3) return null;

  const rank1 = players[0];
  const rank2 = players[1];
  const rank3 = players[2];

  // Order for visual podium: [#2 Silver Left, #1 Gold Elevated Center, #3 Bronze Right]
  const podiumOrder = [
    { player: rank2, position: 2, delay: 0.1 },
    { player: rank1, position: 1, delay: 0.02 },
    { player: rank3, position: 3, delay: 0.18 },
  ];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-white/[0.08] bg-[#0A0E1A] relative overflow-hidden p-6 md:p-8 shadow-xl"
    >
      {/* Background Rajasthan Royals Squad Banner with Editorial Dark Gradient Overlay */}
      <img
        src={teamBannerUrl}
        alt="Rajasthan Royals Squad Backdrop"
        className="absolute inset-0 w-full h-full object-cover object-center opacity-20 pointer-events-none scale-105"
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 0%, rgba(19, 26, 46, 0.85) 0%, rgba(10, 14, 26, 0.94) 60%, rgba(9, 13, 22, 0.98) 100%)',
        }}
      />

      {/* Top Showcase Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-7">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Crown className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span>Franchise Podium</span>
            <span className="text-white/25">·</span>
            <span className="text-pink-300">
              {type === 'batter' ? 'Top 3 Clutch Batters' : 'Top 3 Clutch Bowlers'}
            </span>
          </div>
          <h2 className="font-condensed text-2xl md:text-3xl font-bold tracking-tight text-white mt-0.5">
            {type === 'batter'
              ? 'High-Pressure Batting Leaders'
              : 'High-Pressure Bowling Leaders'}
          </h2>
        </div>

        {onOpenPhotoManager && (
          <button
            type="button"
            onClick={onOpenPhotoManager}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/10 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <ImageIcon className="h-3.5 w-3.5 text-[#D4AF37]" />
            Manage Portraits
          </button>
        )}
      </div>

      {/* 3 Editorial Broadcast Podium Cards */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {podiumOrder.map(({ player, position, delay }) => {
          const isGold = position === 1;
          const isBatter = 'battingType' in player;
          const batter = isBatter ? (player as BatterRating) : null;
          const bowler = !isBatter ? (player as BowlerRating) : null;

          const primaryMetricLabel = isBatter ? 'Pressure SR' : 'Pressure Econ';
          const primaryMetricValue = isBatter
            ? `${batter?.pressureSR}`
            : `${bowler?.pressureEconomy}`;

          const deltaValue = isBatter ? batter?.srDelta || 0 : bowler?.economyDelta || 0;
          const deltaFormatted = `${deltaValue > 0 ? '+' : ''}${deltaValue} ${
            isBatter ? 'SR' : 'rpo'
          }`;

          const subRoleText = isBatter
            ? `${batter?.role} · ${batter?.battingType}`
            : `${bowler?.paceOrSpin} · ${bowler?.bowlingType}`;

          return (
            <motion.div
              key={player.playerId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: isGold ? -6 : 0 }}
              transition={{ delay, duration: 0.45, type: 'spring', stiffness: 130 }}
              whileHover={{ y: isGold ? -10 : -4 }}
              onClick={() => onSelectPlayer(player.playerId, type)}
              className={`group relative cursor-pointer rounded-2xl p-6 backdrop-blur-xl transition-all flex flex-col justify-between overflow-hidden border border-white/[0.08] ${
                isGold
                  ? 'bg-gradient-to-b from-[#171E36]/95 to-[#0E1324]/95 shadow-xl'
                  : 'bg-[#111729]/90 hover:bg-[#151C32]/95 shadow-md'
              }`}
            >
              {/* Top Corner Rank & Role Accent */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center justify-center rounded-lg px-2.5 py-0.5 font-numeric text-base font-bold tracking-wider ${
                      isGold
                        ? 'bg-[#D4AF37] text-slate-950'
                        : 'bg-white/10 text-white border border-white/10'
                    }`}
                  >
                    #{position}
                  </span>
                  <span className="text-xs font-semibold text-slate-300 truncate max-w-[140px]">
                    {player.teamName}
                  </span>
                </div>

                {isGold ? (
                  <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#D4AF37]">
                    <Crown className="h-3.5 w-3.5 text-[#D4AF37]" />
                    <span>Rank #1 Pick</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                    <Award className="h-3.5 w-3.5 text-slate-400" />
                    <span>Podium Qualifier</span>
                  </div>
                )}
              </div>

              {/* Center Split: Left Portrait + Right Identity & PRR Rating */}
              <div className="flex items-center gap-4 my-1">
                <PlayerAvatar
                  name={player.name}
                  rank={position}
                  size="lg"
                  showRankBadge={false}
                />

                <div className="min-w-0 flex-1">
                  <h3 className="font-condensed text-2xl font-bold text-white leading-tight truncate group-hover:text-[#D4AF37] transition-colors">
                    {player.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">
                    {subRoleText}
                  </p>

                  {/* RR Squad Role Fit, Weakness Fix Tag & Est. India Cap Countdown */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
                    <span className="text-pink-300 font-semibold">
                      {player.rrWeaknessFixTag || player.rrSquadRoleFit || (isBatter ? 'Death-Over Closer' : 'Death-Over Yorker Closer')}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
                    {player.estIndiaCapLabel && (
                      <span className="rounded bg-[#D4AF37]/20 border border-[#D4AF37]/40 px-1.5 py-0.5 text-[#D4AF37]">
                        {player.estIndiaCapLabel}
                      </span>
                    )}
                    <span className="text-emerald-400">
                      {player.rankStabilityBadge || 'Stable Top-3'}
                    </span>
                  </div>

                  {/* PRR Rating Display */}
                  <div className="mt-2.5 flex items-baseline gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block">
                        Pressure Reliability
                      </span>
                      <span
                        className={`font-numeric text-4xl font-bold leading-none tabular-nums ${
                          isGold ? 'text-[#D4AF37]' : 'text-white'
                        }`}
                      >
                        {player.reliabilityScore}
                      </span>
                      <span className="text-xs font-mono text-slate-500 ml-0.5">/100</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Animated Reliability Progress Bar */}
              <div className="mt-4 h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${player.reliabilityScore}%` }}
                  transition={{ delay: delay + 0.2, duration: 0.85 }}
                  className={`h-full rounded-full ${
                    isGold ? 'bg-[#D4AF37]' : 'bg-[#EA1A85]'
                  }`}
                />
              </div>

              {/* Bottom 3-Column Broadcast Telemetry Strip */}
              <div className="grid grid-cols-3 gap-2 border-t border-white/[0.08] pt-3.5 mt-4 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">
                    {primaryMetricLabel}
                  </span>
                  <span className="text-white font-bold text-sm md:text-base tabular-nums">
                    {primaryMetricValue}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">
                    Vs Baseline
                  </span>
                  <span className="text-emerald-400 font-bold text-sm md:text-base inline-flex items-center gap-0.5 tabular-nums">
                    <TrendingUp className="h-3 w-3 shrink-0" />
                    {deltaFormatted}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-sans">
                    Scouting File
                  </span>
                  <span
                    className={`font-sans font-semibold text-xs inline-flex items-center gap-0.5 ${
                      isGold ? 'text-[#D4AF37]' : 'text-[#EA1A85]'
                    }`}
                  >
                    Open X-Ray
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Ranks #4–#10 Rajasthan Royals Tactical Role Fit Cards */}
      {players.length > 3 && (
        <div className="relative z-10 mt-6 border-t border-white/[0.08] pt-4">
          <div className="flex items-center justify-between mb-3 text-xs text-slate-300">
            <span className="font-semibold text-white">
              Ranks #4–#10 · Rajasthan Royals Weakness Fix &amp; Est. India Cap Countdown
            </span>
            <span className="text-[11px] text-slate-400">
              Select any player to open their X-Ray dossier
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
            {players.slice(3, 10).map((p) => {
              const isBat = 'battingType' in p;
              return (
                <button
                  key={p.playerId}
                  type="button"
                  onClick={() => onSelectPlayer(p.playerId, type)}
                  className="text-left rounded-xl border border-white/[0.08] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.07] p-3 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span className="font-bold text-white">#{p.unstopRank}</span>
                    <span className="text-[#D4AF37] truncate ml-1">
                      {p.estIndiaCapLabel ? p.estIndiaCapLabel.replace('Est. India Cap: ', 'Cap: ') : (p.rankStabilityBadge || 'BPI ≥ 65')}
                    </span>
                  </div>
                  <p className="font-semibold text-xs text-white truncate mt-1">{p.name}</p>
                  <p className="text-[10px] text-pink-300 truncate mt-0.5 font-medium">
                    {p.rrWeaknessFixTag || p.rrSquadRoleFit || (isBat ? 'Collapse Stabilizer' : 'Middle-Over Spin Squeeze')}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
};
