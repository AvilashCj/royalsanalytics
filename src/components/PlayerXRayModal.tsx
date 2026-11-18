import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Flame,
  Users,
  Crown,
  ShieldCheck,
  Zap,
  Swords,
  Crosshair,
} from 'lucide-react';
import { motion } from 'motion/react';
import { BatterRating, BowlerRating, DistributionBoxPlotStats } from '../types/cricket';
import { CricketFieldTelemetry } from './CricketFieldTelemetry';
import { ConsistencyStripPlot } from './ConsistencyStripPlot';
import { PlayerAvatar } from './PlayerAvatar';
import { usePlayerPhotos } from '../utils/playerPhotos';
import { TacticalStrengthVideoPlayer } from './TacticalStrengthVideoPlayer';
import { PressureSimulationLab } from './PressureSimulationLab';
import { ThreeStadiumArena } from './ThreeStadiumArena';
import { DecisionSpeedTrendChart } from './DecisionSpeedTrendChart';

interface PlayerXRayModalProps {
  player: BatterRating | BowlerRating | null;
  playerType: 'batter' | 'bowler';
  allBatters: BatterRating[];
  allBowlers: BowlerRating[];
  onSelectPlayer: (playerId: number, type: 'batter' | 'bowler') => void;
  onClose?: () => void;
  onOpenPhotoManager?: () => void;
  isStandaloneTab?: boolean;
  demoTrigger?: number;
}

export const PlayerXRayModal: React.FC<PlayerXRayModalProps> = ({
  player,
  playerType,
  allBatters,
  allBowlers,
  onSelectPlayer,
  onClose,
  onOpenPhotoManager,
  isStandaloneTab = false,
  demoTrigger = 0,
}) => {
  const [selectedType, setSelectedType] = useState<'batter' | 'bowler'>(playerType);
  const { teamBannerUrl } = usePlayerPhotos();

  useEffect(() => {
    if (demoTrigger > 0) {
      const timer = setTimeout(() => {
        const el = document.getElementById('tactical-strength-video-player');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [demoTrigger]);

  // If no player is selected yet, default to rank 1
  const activePlayer = player || (selectedType === 'batter' ? allBatters[0] : allBowlers[0]);
  const isBatter = 'battingType' in (activePlayer || {});
  const batter = isBatter ? (activePlayer as BatterRating) : null;
  const bowler = !isBatter ? (activePlayer as BowlerRating) : null;

  // Compute distribution stats for ConsistencyStripPlot
  const rawValues = isBatter
    ? (batter?.pressureInningsLog || []).map((m) => m.pressure_sr).filter((v) => v > 0)
    : (bowler?.pressureSpellsLog || []).map((m) => m.pressure_economy).filter((v) => v > 0);

  const sortedValues = rawValues.length > 0
    ? [...rawValues].sort((a, b) => a - b)
    : [isBatter ? (batter?.pressureSR || 140) : (bowler?.pressureEconomy || 8.5)];

  const min = sortedValues[0];
  const max = sortedValues[sortedValues.length - 1];
  const q1 = sortedValues[Math.floor((sortedValues.length - 1) * 0.25)];
  const median = sortedValues[Math.floor((sortedValues.length - 1) * 0.5)];
  const q3 = sortedValues[Math.floor((sortedValues.length - 1) * 0.75)];

  const boxPlotItem: DistributionBoxPlotStats = {
    playerId: activePlayer?.playerId || 1,
    name: activePlayer?.name || 'Player',
    team: activePlayer?.teamName || '',
    rank: activePlayer?.unstopRank || 1,
    min,
    q1,
    median,
    q3,
    max,
    values: sortedValues,
  };

  if (!activePlayer) {
    return (
      <div className="rounded-2xl border border-pink-100 bg-white p-12 text-center shadow-xs">
        <p className="text-slate-500 text-sm">Select a player from the Top 10 or leaderboard to view deep-dive analytics.</p>
      </div>
    );
  }

  return (
    <motion.div
      key={activePlayer.playerId}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`flex flex-col gap-6 ${isStandaloneTab ? 'pb-12' : ''}`}
    >
      {/* Broadcast Player X-Ray Scouting Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0A0E1A] p-6 md:p-8 shadow-xl">
        {/* Subtle Rajasthan Royals Squad Banner & Crest Watermark Backdrop */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {teamBannerUrl && (
            <img
              src={teamBannerUrl}
              alt="Rajasthan Royals Squad Backdrop"
              className="h-full w-full object-cover object-top opacity-20 mix-blend-luminosity scale-105"
              referrerPolicy="no-referrer"
            />
          )}
          <img
            src="/assets/aistudio/image_d9367e45.png"
            alt="RR Crest Watermark"
            className="absolute -right-8 -bottom-10 h-64 w-64 object-contain opacity-[0.07] rotate-6"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0E1A] via-[#0A0E1A]/90 to-[#131A2E]/85" />
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#EA1A85]/20 blur-3xl" />
          <div className="absolute -bottom-24 right-1/4 h-72 w-72 rounded-full bg-[#D4AF37]/15 blur-3xl" />
        </div>

        {/* Top Control Row: Audit Tag + Player Switcher Controls */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/15 px-3 py-1 text-[11px] font-bold tracking-wide text-[#D4AF37]">
              <Crown className="h-3.5 w-3.5 text-[#D4AF37]" />
              {isBatter ? 'Batter X-Ray Scouting Dossier' : 'Bowler X-Ray Scouting Dossier'}
            </span>
            <span className="inline-flex items-center rounded-lg border border-[#EA1A85]/40 bg-[#EA1A85]/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-pink-200">
              {activePlayer.unstopRank <= 10 ? `Official Unstop Rank #${activePlayer.unstopRank}` : `Cohort Rank #${activePlayer.unstopRank}`}
            </span>
            {activePlayer.rankStabilityBadge && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                {activePlayer.rankStabilityBadge}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onOpenPhotoManager && (
              <button
                type="button"
                onClick={onOpenPhotoManager}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-[#EA1A85] hover:border-[#EA1A85] transition-colors cursor-pointer"
              >
                <Users className="h-3.5 w-3.5 text-[#D4AF37]" />
                <span>Player Photos</span>
              </button>
            )}

            <div className="flex items-center gap-1 rounded-xl bg-white/10 p-1 border border-white/15">
              <button
                type="button"
                onClick={() => {
                  setSelectedType('batter');
                  if (allBatters.length > 0) onSelectPlayer(allBatters[0].playerId, 'batter');
                }}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  isBatter ? 'bg-[#EA1A85] text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                Batters
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedType('bowler');
                  if (allBowlers.length > 0) onSelectPlayer(allBowlers[0].playerId, 'bowler');
                }}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  !isBatter ? 'bg-[#EA1A85] text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                Bowlers
              </button>
            </div>

            <select
              value={activePlayer.playerId}
              onChange={(e) => onSelectPlayer(Number(e.target.value), isBatter ? 'batter' : 'bowler')}
              className="rounded-xl border border-white/20 bg-[#131A2E] px-3 py-1.5 text-xs text-white focus:border-[#EA1A85] focus:outline-none cursor-pointer font-medium"
            >
              {(isBatter ? allBatters : allBowlers).map((p) => (
                <option key={p.playerId} value={p.playerId} className="bg-[#0A0E1A] text-white">
                  {p.unstopRank <= 10 ? `#${p.unstopRank} ` : ''}{p.name} ({p.teamName})
                </option>
              ))}
            </select>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/15 bg-white/5 p-1.5 text-slate-300 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Main Broadcast Scouting Profile + 4 Headline Clutch KPI Tiles */}
        <div className="relative z-10 mt-6 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          {/* Left: 110x110px Portrait with Glowing Ring + Identity & Role/Handedness Tags */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <PlayerAvatar
              name={activePlayer.name}
              rank={activePlayer.unstopRank}
              size="xl"
              showRankBadge={true}
              className="shrink-0"
            />

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-[#EA1A85] px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-xs">
                  {activePlayer.teamName}
                </span>

                {isBatter && batter ? (
                  <>
                    <span className="inline-flex items-center rounded-md border border-[#D4AF37]/50 bg-[#D4AF37]/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#D4AF37]">
                      {batter.battingType || 'RHB'}
                    </span>
                    <span className="inline-flex items-center rounded-md border border-white/15 bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-200">
                      {batter.role || 'Top Order'}
                    </span>
                  </>
                ) : bowler ? (
                  <>
                    <span className="inline-flex items-center rounded-md border border-[#D4AF37]/50 bg-[#D4AF37]/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#D4AF37]">
                      {bowler.paceOrSpin || 'Pace'}
                    </span>
                    <span className="inline-flex items-center rounded-md border border-white/15 bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-200">
                      {bowler.bowlingType || 'Right-Arm Fast'}
                    </span>
                  </>
                ) : null}

                {(activePlayer.rrWeaknessFixTag || activePlayer.rrSquadRoleFit) && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-[#EA1A85]/60 bg-[#EA1A85]/25 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-pink-200">
                    <Crosshair className="h-3 w-3 text-[#D4AF37]" />
                    {activePlayer.rrWeaknessFixTag || `RR Role Fit: ${activePlayer.rrSquadRoleFit}`}
                  </span>
                )}

                {activePlayer.estIndiaCapLabel && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-[#D4AF37]/60 bg-[#D4AF37]/20 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-[#D4AF37]">
                    <Clock className="h-3 w-3 text-[#D4AF37]" />
                    {activePlayer.estIndiaCapLabel}
                  </span>
                )}
              </div>

              <h1 className="font-condensed text-3xl sm:text-4xl font-black uppercase tracking-tight text-white mt-2">
                {activePlayer.name}
              </h1>

              <p className="text-xs text-slate-300 mt-1 font-medium">
                {isBatter && batter
                  ? `${batter.pressureBalls} High-Pressure Balls Faced across ${batter.pressureInnings} Crunch Innings`
                  : `${bowler?.pressureBalls} High-Pressure Deliveries Bowled across ${bowler?.pressureSpells} Crunch Spells`}
              </p>

              {/* Impact Sub vs. Starter Pressure Split Badge */}
              {activePlayer.impactSplit && (
                <div className="mt-2.5 inline-flex flex-wrap items-center gap-2 rounded-lg border border-[#D4AF37]/40 bg-[#131A2E]/90 px-3 py-1.5 text-[11px]">
                  <span className="inline-flex items-center gap-1 font-extrabold uppercase tracking-wider text-[#D4AF37]">
                    <Zap className="h-3.5 w-3.5 text-[#EA1A85]" />
                    {activePlayer.impactSplit.badgeLabel}:
                  </span>
                  <span className="font-mono font-bold text-white">
                    {activePlayer.impactSplit.deltaLabel}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    (Impact Sub: {activePlayer.impactSplit.impactSubMatches}m · Starter: {activePlayer.impactSplit.starterMatches}m)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: 4 Headline Clutch KPI Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 xl:min-w-[560px]">
            {/* KPI 1: PRR Rating */}
            <div className="rounded-2xl border border-[#EA1A85]/40 bg-[#EA1A85]/15 backdrop-blur-md p-4">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-pink-300 block">
                PRR Rating
              </span>
              <p className="font-mono text-2xl sm:text-3xl font-black text-white mt-1">
                {activePlayer.reliabilityScore.toFixed(1)}
                <span className="text-xs text-pink-200/70 font-normal ml-0.5">/100</span>
              </p>
              <span className="text-[10px] text-pink-200/80 mt-1 block">
                Sample-calibrated index
              </span>
            </div>

            {isBatter && batter ? (
              <>
                {/* KPI 2: Pressure SR */}
                <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                    Pressure SR
                  </span>
                  <p className="font-mono text-2xl sm:text-3xl font-black text-white mt-1">
                    {batter.pressureSR}
                  </p>
                  <span className={`text-[10px] font-mono font-bold mt-1 block ${batter.srDelta >= 0 ? 'text-emerald-400' : 'text-amber-300'}`}>
                    {batter.srDelta >= 0 ? `+${batter.srDelta}` : batter.srDelta} vs Normal ({batter.normalSR})
                  </span>
                </div>

                {/* KPI 3: Dot Avoidance Rate */}
                <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                    Dot Avoidance
                  </span>
                  <p className="font-mono text-2xl sm:text-3xl font-black text-[#D4AF37] mt-1">
                    {batter.pressureDotAvoidancePct}%
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {batter.pressureBoundaryPct}% Boundary Rate
                  </span>
                </div>

                {/* KPI 4: Cross-Match Consistency */}
                <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                    Consistency
                  </span>
                  <p className="font-mono text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
                    {batter.consistencyScore}
                    <span className="text-xs text-slate-400 font-normal ml-0.5">/100</span>
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {batter.pressureInnings} Crunch Innings
                  </span>
                </div>
              </>
            ) : bowler ? (
              <>
                {/* KPI 2: Pressure Economy */}
                <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                    Pressure Econ
                  </span>
                  <p className="font-mono text-2xl sm:text-3xl font-black text-white mt-1">
                    {bowler.pressureEconomy}
                  </p>
                  <span className={`text-[10px] font-mono font-bold mt-1 block ${bowler.economyDelta >= 0 ? 'text-emerald-400' : 'text-amber-300'}`}>
                    {bowler.economyDelta >= 0 ? `+${bowler.economyDelta}` : bowler.economyDelta} rpo vs Normal ({bowler.normalEconomy})
                  </span>
                </div>

                {/* KPI 3: Pressure Dot Ball % */}
                <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                    Pressure Dot %
                  </span>
                  <p className="font-mono text-2xl sm:text-3xl font-black text-[#D4AF37] mt-1">
                    {bowler.pressureDotPct}%
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {bowler.pressureWickets} Wkts (SR {bowler.pressureWicketSR})
                  </span>
                </div>

                {/* KPI 4: Cross-Spell Consistency */}
                <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                    Consistency
                  </span>
                  <p className="font-mono text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
                    {bowler.consistencyScore}
                    <span className="text-xs text-slate-400 font-normal ml-0.5">/100</span>
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {bowler.pressureSpells} Crunch Spells
                  </span>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Interactive Tactical Strength Video Demonstration Player */}
      <TacticalStrengthVideoPlayer
        player={activePlayer}
        isBatter={isBatter}
        allBatters={allBatters}
        allBowlers={allBowlers}
        onSelectPlayer={onSelectPlayer}
        autoPlayTrigger={demoTrigger}
      />

      {/* Impact Player vs. Starter Pressure Split & Matchup Dominance Matrix (playing_eleven.csv + ball_by_ball.csv) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left 5 Cols: Impact Sub vs. Starter Pressure Split (Joined from playing_eleven.csv) */}
        <div className="xl:col-span-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EA1A85]/10 text-[#EA1A85]">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold tracking-wide text-[#EA1A85] block">
                    Playing XI Tactical Split
                  </span>
                  <h3 className="font-condensed text-lg font-black text-slate-900 leading-tight">
                    Impact Sub vs. Starting XI Pressure Split
                  </h3>
                </div>
              </div>
              {activePlayer.impactSplit && (
                <span className="rounded-md border border-[#EA1A85]/30 bg-pink-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#EA1A85]">
                  {activePlayer.impactSplit.badgeLabel}
                </span>
              )}
            </div>

            {activePlayer.impactSplit ? (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {/* Impact Sub Column */}
                  <div className="rounded-xl border border-pink-200 bg-pink-50/50 p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#EA1A85]">
                        Impact Sub Entry
                      </span>
                      <span className="font-mono text-[10px] font-bold text-slate-500">
                        {activePlayer.impactSplit.impactSubMatches} Matches
                      </span>
                    </div>
                    <p className="font-mono text-2xl font-black text-slate-900 mt-1.5 tabular-nums">
                      {activePlayer.impactSplit.impactSubMatches > 0
                        ? `${activePlayer.impactSplit.impactSubMetric} ${isBatter ? 'SR' : 'Econ'}`
                        : '—'}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 mt-1">
                      {activePlayer.impactSplit.impactSubBalls} Pressure Balls
                    </p>
                  </div>

                  {/* Starting XI Column */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">
                        Named Starter
                      </span>
                      <span className="font-mono text-[10px] font-bold text-slate-500">
                        {activePlayer.impactSplit.starterMatches} Matches
                      </span>
                    </div>
                    <p className="font-mono text-2xl font-black text-slate-900 mt-1.5 tabular-nums">
                      {activePlayer.impactSplit.starterMetric} {isBatter ? 'SR' : 'Econ'}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 mt-1">
                      {activePlayer.impactSplit.starterBalls} Pressure Balls
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-[#D4AF37]/40 bg-[#0A0E1A] px-3.5 py-2.5 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300">
                    Tactical Deployment Verdict
                  </span>
                  <span className="font-mono text-xs font-extrabold text-[#D4AF37]">
                    {activePlayer.impactSplit.deltaLabel}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-4">
                Starter & Impact Player split telemetry available once dataset is loaded.
              </p>
            )}
          </div>

          <p className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100">
            Joined directly from <span className="font-mono font-semibold text-slate-700">playing_eleven.csv</span> substitution flags to evaluate tactical readiness off the bench versus starting XI rhythm.
          </p>
        </div>

        {/* Right 7 Cols: Matchup Dominance Matrix (Left-arm Pace, Right-arm Pace, Wrist Spin, Finger Spin) */}
        <div className="xl:col-span-7 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0A0E1A] text-[#D4AF37]">
                  <Swords className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold tracking-wide text-slate-500 block">
                    4-Archetype Tactical Breakdown
                  </span>
                  <h3 className="font-condensed text-lg font-black text-slate-900 leading-tight">
                    Matchup Dominance Matrix ({isBatter ? 'Pressure SR vs Bowling Style' : 'Pressure Economy vs Pace/Spin Profile'})
                  </h3>
                </div>
              </div>
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-700">
                High-Leverage Splits
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(activePlayer.matchupMatrix || []).map((cell) => {
                const badgeColors =
                  cell.dominanceRating === 'Dominant'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : cell.dominanceRating === 'Advantage'
                    ? 'border-pink-200 bg-pink-50 text-[#EA1A85]'
                    : cell.dominanceRating === 'Vulnerable'
                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                    : 'border-slate-200 bg-slate-50 text-slate-700';

                return (
                  <div
                    key={cell.archetype}
                    className="rounded-xl border border-pink-100 bg-slate-50/60 p-3.5 flex flex-col justify-between hover:border-[#EA1A85]/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-extrabold text-slate-800">
                          {cell.archetype}
                        </span>
                      </div>
                      <span
                        className={`mt-1.5 inline-block rounded border px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${badgeColors}`}
                      >
                        {cell.dominanceRating}
                      </span>

                      <div className="mt-3">
                        <span className="font-mono text-2xl font-black text-slate-900 tabular-nums">
                          {cell.primaryMetric}
                        </span>
                        <span className="text-[10px] font-bold uppercase text-slate-500 ml-1">
                          {isBatter ? 'SR' : 'Econ'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200/80 space-y-1 text-[10px] font-mono text-slate-600">
                      <div className="flex justify-between">
                        <span>Sample:</span>
                        <span className="font-bold text-slate-800">{cell.balls}b</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{isBatter ? 'Boundaries:' : 'Dot Balls:'}</span>
                        <span className="font-bold text-[#EA1A85]">
                          {isBatter ? cell.boundaries : cell.dots}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{isBatter ? 'Dismissals:' : 'Wickets:'}</span>
                        <span className="font-bold text-slate-800">{cell.wicketsOrDismissals}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100">
            Isolates high-pressure performance across all four tactical bowling archetypes: <span className="font-semibold text-slate-700">Left-arm Pace, Right-arm Pace, Wrist Spin, and Finger Spin</span>.
          </p>
        </div>
      </div>

      {/* Recharts Decision Speed Progression Line Chart & Detailed Telemetry Log Table */}
      <DecisionSpeedTrendChart player={activePlayer} isBatter={isBatter} />

      {/* Interactive Three.js 3D Stadium & Pressure Trajectory Arena */}
      <ThreeStadiumArena player={activePlayer} isBatter={isBatter} />

      {/* Interactive Pressure Simulation Lab (Hypothetical Match State Matcher) */}
      <PressureSimulationLab player={activePlayer} isBatter={isBatter} />

      {/* Phase Splits & Discipline Splits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Powerplay */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 tracking-tight">
              <span>Powerplay (Overs 1–6)</span>
              <Clock className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-numeric text-3xl font-bold text-slate-900">
                {isBatter && batter
                  ? `${batter.phaseSplits.powerplay.sr} SR`
                  : `${bowler?.phaseSplits.powerplay.econ} Econ`}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {isBatter && batter
                  ? `${batter.phaseSplits.powerplay.balls}b · ${batter.phaseSplits.powerplay.runs}r`
                  : `${bowler?.phaseSplits.powerplay.balls}b · ${bowler?.phaseSplits.powerplay.wickets}w`}
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '66%' }}
              transition={{ duration: 0.7 }}
              className="bg-[#EA1A85] h-full rounded-full"
            />
          </div>
        </div>

        {/* Middle Overs */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 tracking-tight">
              <span>Middle Overs (Overs 7–15)</span>
              <Clock className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-numeric text-3xl font-bold text-slate-900">
                {isBatter && batter
                  ? `${batter.phaseSplits.middle.sr} SR`
                  : `${bowler?.phaseSplits.middle.econ} Econ`}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {isBatter && batter
                  ? `${batter.phaseSplits.middle.balls}b · ${batter.phaseSplits.middle.runs}r`
                  : `${bowler?.phaseSplits.middle.balls}b · ${bowler?.phaseSplits.middle.wickets}w`}
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '75%' }}
              transition={{ delay: 0.1, duration: 0.7 }}
              className="bg-[#EA1A85] h-full rounded-full"
            />
          </div>
        </div>

        {/* Death Overs */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-[#EA1A85] tracking-tight">
              <span>Death Crunch (Overs 16–20)</span>
              <Flame className="h-3.5 w-3.5 text-[#EA1A85]" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-numeric text-3xl font-bold text-[#EA1A85]">
                {isBatter && batter
                  ? `${batter.phaseSplits.death.sr} SR`
                  : `${bowler?.phaseSplits.death.econ} Econ`}
              </span>
              <span className="text-xs text-slate-600 font-mono">
                {isBatter && batter
                  ? `${batter.phaseSplits.death.balls}b · ${batter.phaseSplits.death.runs}r`
                  : `${bowler?.phaseSplits.death.balls}b · ${bowler?.phaseSplits.death.wickets}w`}
              </span>
            </div>
          </div>
          <div className="w-full bg-pink-100 h-2 rounded-full overflow-hidden mt-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '85%' }}
              transition={{ delay: 0.2, duration: 0.75 }}
              className="bg-[#EA1A85] h-full rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Interactive Wagon-Wheel / Shot-Zone & 22-Yard Pitch-Map Heatmap */}
      <CricketFieldTelemetry player={activePlayer} isBatter={isBatter} />

      {/* Innings-by-Innings Pressure Distribution Strip & Box Plot */}
      <ConsistencyStripPlot
        data={[boxPlotItem]}
        metricLabel={isBatter ? 'Match Pressure Strike Rate' : 'Match Pressure Economy Rate (rpo)'}
        isBowler={!isBatter}
        minScale={isBatter ? 60 : 4.0}
        maxScale={isBatter ? 280 : 13.0}
      />

      {/* Complete Match-by-Match Pressure Log Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-condensed text-xl font-bold text-slate-900">
              Match-by-Match Pressure Audit Log
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Auditable individual match logs under high-stress match states, verifying sustained consistency.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-[#EA1A85]">
            {isBatter ? batter?.pressureInningsLog.length : bowler?.pressureSpellsLog.length} Matches Logged
          </span>
        </div>

        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-pink-100 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Competition</th>
                <th className="py-2.5 px-3">Stage</th>
                <th className="py-2.5 px-3">Opponent</th>
                <th className="py-2.5 px-3 text-right">Pressure Balls</th>
                <th className="py-2.5 px-3 text-right">
                  {isBatter ? 'Pressure Runs' : 'Runs Conceded'}
                </th>
                <th className="py-2.5 px-3 text-right">
                  {isBatter ? 'Pressure SR' : 'Economy'}
                </th>
                <th className="py-2.5 px-3 text-right">
                  {isBatter ? 'Dismissals' : 'Wickets Taken'}
                </th>
                <th className="py-2.5 px-3 text-right">Dot Balls</th>
                <th className="py-2.5 px-3">Match Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-50 font-mono">
              {(isBatter ? batter?.pressureInningsLog : bowler?.pressureSpellsLog)?.map((m, idx) => (
                <tr key={`${m.match_id}-${idx}`} className="hover:bg-pink-50/50 transition-colors">
                  <td className="py-2.5 px-3 text-slate-600">{m.match_date}</td>
                  <td className="py-2.5 px-3 font-sans text-slate-500">{m.comp_name}</td>
                  <td className="py-2.5 px-3 font-sans">
                    {m.is_knockout ? (
                      <span className="text-[10px] font-bold text-[#EA1A85]">
                        {m.stage}
                      </span>
                    ) : (
                      <span className="text-slate-600">{m.stage}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">{m.opponent}</td>
                  <td className="py-2.5 px-3 text-right text-slate-700">{m.pressure_balls}</td>
                  <td className="py-2.5 px-3 text-right text-slate-900 font-bold">
                    {isBatter ? m.pressure_runs : m.pressure_runs_conceded}
                  </td>
                  <td className="py-2.5 px-3 text-right text-[#EA1A85] font-bold">
                    {isBatter ? m.pressure_sr : m.pressure_economy}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-700">
                    {isBatter ? m.pressure_dismissals : m.pressure_wickets_taken}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-500">{m.pressure_dots}</td>
                  <td className="py-2.5 px-3 font-sans text-slate-600 text-[11px] truncate max-w-xs">
                    {m.match_result}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
