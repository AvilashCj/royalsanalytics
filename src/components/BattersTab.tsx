import React, { useState } from 'react';
import {
  Check,
  Search,
  ExternalLink,
  Camera,
  Scale,
  Play,
} from 'lucide-react';
import { AnimatePresence, motion, Variants } from 'motion/react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ZAxis,
  Cell,
} from 'recharts';
import { BatterRating, PressureModelConfig } from '../types/cricket';
import { ClutchDumbbellChart } from './ClutchDumbbellChart';
import { exportChartToPNG } from '../utils/chartExport';
import { useGraphTheme } from '../utils/chartThemes';
import { GraphThemePicker } from './GraphThemePicker';
import { OwnersPodiumShowcase } from './OwnersPodiumShowcase';
import { PlayerAvatar } from './PlayerAvatar';
import { JudgesStressTestBar } from './JudgesStressTestBar';

const tableBodyVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
};

const tableRowVariants: Variants = {
  hidden: { opacity: 0, y: 12, x: -10 },
  visible: {
    opacity: 1,
    y: 0,
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 280,
      damping: 24,
    },
  },
};

interface BattersTabProps {
  batters: BatterRating[];
  onSelectPlayer: (playerId: number, type: 'batter' | 'bowler') => void;
  onWatchStrengthDemo?: (playerId: number, type: 'batter' | 'bowler') => void;
  onOpenCompare?: (playerIds: number[], type: 'batter') => void;
  onOpenPhotoManager?: () => void;
  cohortMeanSR: number;
  config?: PressureModelConfig;
  onConfigChange?: (newConfig: PressureModelConfig) => void;
  recalcTimeMs?: number;
}

export const BattersTab: React.FC<BattersTabProps> = ({
  batters,
  onSelectPlayer,
  onWatchStrengthDemo,
  onOpenCompare,
  onOpenPhotoManager,
  config,
  onConfigChange,
  recalcTimeMs,
}) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'Opener' | 'Middle-Order' | 'Finisher'>('ALL');
  const [handFilter, setHandFilter] = useState<'ALL' | 'RHB' | 'LHB'>('ALL');
  const [downloadingScatter, setDownloadingScatter] = useState(false);
  const { theme } = useGraphTheme();

  // Top 10 Qualifiers (Unstop Rank 1 to 10)
  const top10 = batters
    .filter((b) => b.unstopRank <= 10)
    .sort((a, b) => a.unstopRank - b.unstopRank);

  // Filtered list for the comprehensive table
  const filteredBatters = batters.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.teamName.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || b.role === roleFilter;
    const matchesHand = handFilter === 'ALL' || b.battingType === handFilter;
    return matchesSearch && matchesRole && matchesHand;
  });

  // Scatter plot dataset preparation
  const scatterData = batters
    .filter((b) => b.pressureBalls >= 30)
    .map((b) => ({
      name: b.name,
      team: b.teamName,
      normalSR: b.normalSR,
      pressureSR: b.pressureSR,
      balls: b.pressureBalls,
      score: b.reliabilityScore,
      role: b.role,
      isTop10: b.unstopRank <= 10,
      playerId: b.playerId,
    }));

  // Connected Dumbbell Items (Normal SR vs Pressure SR)
  const dumbbellItems = top10.map((b) => ({
    id: b.playerId,
    rank: b.unstopRank,
    name: b.name,
    team: b.teamName,
    baseline: b.normalSR,
    pressure: b.pressureSR,
    delta: b.srDelta,
    isPositive: b.srDelta >= 0,
    unit: 'SR',
  }));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, layout: { duration: 0.3 } }}
      className="flex flex-col gap-8 pb-12"
    >
      {/* Judge's Stress-Test Mode Bar (Top of Tab 2) */}
      {config && onConfigChange && (
        <JudgesStressTestBar
          config={config}
          onChangeConfig={onConfigChange}
          recalcTimeMs={recalcTimeMs}
        />
      )}

      {/* Tab Header & Quick Copy Bar */}
      <motion.div
        layout
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-pink-200 bg-white p-6 shadow-xs"
      >
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#EA1A85]">
            <span>Challenge Objective 1</span>
            <span>·</span>
            <span>Pressure-Qualified Indian Domestic Shortlist (BPI &ge; 65)</span>
          </div>
          <h1 className="font-condensed text-3xl font-extrabold uppercase tracking-tight text-slate-900 mt-1">
            Top 10 Domestic Batters Under Pressure (BPI &ge; 65)
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Tailored to Rajasthan Royals&apos; IPL 2027 auction strategy: ranked by Pressure Reliability Rating (PRR), Pressure Strike Rate, RR Weakness Fix assignment, and Est. Days to India Cap countdown.
          </p>
        </div>
        {onOpenCompare && (
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            <button
              type="button"
              onClick={() => onOpenCompare(top10.slice(0, 2).map((b) => b.playerId), 'batter')}
              className="flex items-center gap-1.5 rounded-xl border border-pink-200 bg-pink-50/60 px-3.5 py-2.5 text-xs font-bold text-slate-800 hover:bg-pink-100 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Scale className="h-4 w-4 text-[#EA1A85]" />
              Compare Top Batters
            </button>
          </div>
        )}
      </motion.div>

      {/* Owner's Executive Podium Hero Showcase */}
      {top10.length >= 3 && (
        <OwnersPodiumShowcase
          players={top10}
          type="batter"
          onSelectPlayer={onSelectPlayer}
          onOpenPhotoManager={onOpenPhotoManager}
        />
      )}

      {/* Clutch vs. Choke Connected Dumbbell Vector Chart */}
      <ClutchDumbbellChart
        title="Top 10 Domestic Batters: Normal Baseline vs. High-Pressure Strike Rate (BPI ≥ 65)"
        subtitle="Connected horizontal dumbbell vector: Baseline SR vs High-Pressure SR (BPI ≥ 65). Tip labels indicate net clutch acceleration."
        items={dumbbellItems}
        metricLabel="Strike Rate (Runs / 100 Balls)"
        minScale={120}
        maxScale={215}
        isBowler={false}
        onSelectPlayer={(id) => onSelectPlayer(id, 'batter')}
      />

      {/* Unstop Submission Top 10 Ordered Table */}
      <motion.div layout className="rounded-2xl border border-pink-100 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-condensed text-xl font-bold uppercase text-slate-900">
              Top 10 Domestic Batters Under Pressure (BPI &ge; 65) • RR IPL 2027 Shortlist
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Synchronized across Auction Targets, Batters, Player X-Ray, and Executive Report with RR Weakness Fix &amp; Est. India Cap countdowns.
            </p>
          </div>
          <span className="text-xs text-[#EA1A85] font-bold font-mono">10 Pressure-Qualified Batters</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-pink-100 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-3">Rank</th>
                <th className="py-3 px-3">Player Name &amp; Est. India Cap</th>
                <th className="py-3 px-3">State / Team</th>
                <th className="py-3 px-3">RR Weakness Fix &amp; Tactical Fit</th>
                <th className="py-3 px-3 text-right">Pressure Balls</th>
                <th className="py-3 px-3 text-right">Normal SR</th>
                <th className="py-3 px-3 text-right">Pressure SR</th>
                <th className="py-3 px-3 text-right">SR Delta</th>
                <th className="py-3 px-3 text-right">Boundary %</th>
                <th className="py-3 px-3 text-right">PRR Score</th>
                <th className="py-3 px-3 text-center">Strength Demo &amp; Audit</th>
              </tr>
            </thead>
            <motion.tbody
              variants={tableBodyVariants}
              initial="hidden"
              animate="visible"
              className="divide-y divide-pink-50 font-mono"
            >
              {top10.map((b) => (
                <motion.tr
                  layout
                  key={b.playerId}
                  variants={tableRowVariants}
                  whileHover={{ x: 4, backgroundColor: 'rgba(253, 242, 248, 0.7)' }}
                  onClick={() => onSelectPlayer(b.playerId, 'batter')}
                  className="hover:bg-pink-50/50 transition-colors cursor-pointer"
                >
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center justify-center font-numeric text-base w-7 h-7 rounded-lg font-bold ${
                        b.unstopRank === 1
                          ? 'bg-[#EA1A85] text-white shadow-xs'
                          : b.unstopRank <= 3
                          ? 'bg-pink-100 text-[#EA1A85]'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {b.unstopRank}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-sans">
                    <div className="flex items-center gap-2.5">
                      <PlayerAvatar name={b.name} rank={b.unstopRank} size="sm" />
                      <div>
                        <span className="font-bold text-slate-900 block">{b.name}</span>
                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                          {b.estIndiaCapLabel && (
                            <span className="inline-flex items-center rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                              {b.estIndiaCapLabel}
                            </span>
                          )}
                          <span className="text-[10px] font-semibold text-emerald-700">
                            {b.rankStabilityBadge || (b.unstopRank <= 3 ? 'Stable Top-3' : 'BPI ≥ 65')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-sans font-semibold text-slate-700">{b.teamName}</td>
                  <td className="py-3 px-3 font-sans">
                    <span className="font-bold text-[#EA1A85] block">
                      {b.rrWeaknessFixTag || b.rrSquadRoleFit || 'Death-Over Closer'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {b.role} {b.rrSquadRoleFit && b.rrWeaknessFixTag ? `· ${b.rrSquadRoleFit}` : ''}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-slate-700 tabular-nums">{b.pressureBalls}</td>
                  <td className="py-3 px-3 text-right text-slate-500 tabular-nums">{b.normalSR}</td>
                  <td className="py-3 px-3 text-right text-[#EA1A85] font-bold tabular-nums">{b.pressureSR}</td>
                  <td className="py-3 px-3 text-right text-emerald-600 font-bold tabular-nums">
                    {b.srDelta > 0 ? `+${b.srDelta}` : b.srDelta}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-700 tabular-nums">{b.pressureBoundaryPct}%</td>
                  <td className="py-3 px-3 text-right font-numeric text-lg font-bold text-[#EA1A85] tabular-nums">
                    {b.reliabilityScore}
                  </td>
                  <td className="py-3 px-3 text-center font-sans">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          (onWatchStrengthDemo || onSelectPlayer)(b.playerId, 'batter');
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#EA1A85] px-2.5 py-1 text-[10px] font-bold text-white shadow-xs hover:bg-[#d41577] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <Play className="h-2.5 w-2.5 fill-white" />
                        <span>Watch Strength Demo</span>
                      </button>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400 hover:text-[#EA1A85] inline transition-colors" />
                    </div>
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      </motion.div>

      {/* Interactive Baseline vs. Pressure Scatter Plot with Switchable Theme */}
      <motion.div
        id="batters-scatter-matrix"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className={`rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-6 shadow-md transition-colors duration-300 relative`}
      >
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className={`font-condensed text-xl font-bold uppercase ${theme.titleText}`}>
              Baseline SR vs. High-Pressure SR Scatter Matrix
            </h3>
            <p className={`text-xs ${theme.subText} mt-0.5`}>
              Players above the parity diagonal accelerate under pressure; bubble diameter reflects pressure sample size.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            <GraphThemePicker />
            <span className="flex items-center gap-1.5 font-semibold" style={{ color: theme.primary }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.primary }} />
              Top 10 Qualifiers
            </span>
            <span className={`flex items-center gap-1.5 ${theme.subText}`}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.secondary }} />
              Other Batters
            </span>
            <button
              data-no-export
              type="button"
              onClick={async () => {
                setDownloadingScatter(true);
                await exportChartToPNG('batters-scatter-matrix', 'Batters_SR_Scatter_Matrix');
                setTimeout(() => setDownloadingScatter(false), 2000);
              }}
              title="Download Scatter Matrix PNG"
              className={`flex items-center gap-1.5 rounded-xl border p-2 text-xs font-bold transition-colors cursor-pointer ${
                theme.isDarkCanvas
                  ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {downloadingScatter ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Camera className="h-4 w-4" style={{ color: theme.primary }} />
              )}
            </button>
          </div>
        </div>

        <div
          className="h-80 w-full rounded-xl p-2 transition-colors duration-300"
          style={{ backgroundColor: theme.plotBg }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.gridStroke} />
              <XAxis
                type="number"
                dataKey="normalSR"
                name="Normal SR"
                domain={[110, 200]}
                unit=""
                stroke={theme.axisStroke}
                fontSize={11}
                tickLine={false}
                label={{
                  value: 'Normal Baseline Strike Rate (Runs / 100 Balls)',
                  position: 'insideBottom',
                  offset: -10,
                  fill: theme.axisStroke,
                  fontSize: 11,
                }}
              />
              <YAxis
                type="number"
                dataKey="pressureSR"
                name="Pressure SR"
                domain={[120, 220]}
                unit=""
                stroke={theme.axisStroke}
                fontSize={11}
                tickLine={false}
                label={{
                  value: 'High-Pressure Strike Rate (Runs / 100 Balls)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 5,
                  fill: theme.axisStroke,
                  fontSize: 11,
                }}
              />
              <ZAxis type="number" dataKey="balls" range={[60, 450]} name="Pressure Balls" />
              <ReferenceLine
                segment={[
                  { x: 110, y: 110 },
                  { x: 200, y: 200 },
                ]}
                stroke={theme.accentGold}
                strokeDasharray="4 4"
                label={{
                  value: 'Parity Diagonal',
                  fill: theme.accentGold,
                  fontSize: 10,
                  position: 'insideTopLeft',
                }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div
                        className={`rounded-xl border ${theme.tooltipBorder} ${theme.tooltipBg} ${theme.tooltipText} p-3 shadow-lg`}
                      >
                        <p className="text-xs font-bold">{data.name}</p>
                        <p className="text-[11px] opacity-75">
                          {data.team} · {data.role}
                        </p>
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-500/20 text-xs font-mono">
                          <div>
                            <span className="opacity-70 block text-[10px] font-sans">Normal SR:</span>
                            <span className="font-bold">{data.normalSR}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] font-sans" style={{ color: theme.primary }}>
                              Pressure SR:
                            </span>
                            <span className="font-bold" style={{ color: theme.primary }}>
                              {data.pressureSR}
                            </span>
                          </div>
                          <div>
                            <span className="opacity-70 block text-[10px] font-sans">Sample:</span>
                            <span>{data.balls} balls</span>
                          </div>
                          <div>
                            <span className="opacity-70 block text-[10px] font-sans">Reliability:</span>
                            <span className="font-bold" style={{ color: theme.positiveDelta }}>
                              {data.score}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter
                name="Batters"
                data={scatterData}
                onClick={(e: any) => e?.playerId && onSelectPlayer(e.playerId, 'batter')}
                className="cursor-pointer"
                isAnimationActive={true}
                animationDuration={950}
              >
                {scatterData.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={entry.isTop10 ? theme.primary : theme.secondary}
                    fillOpacity={entry.isTop10 ? 0.92 : 0.45}
                    stroke={entry.isTop10 ? theme.accentGold : 'none'}
                    strokeWidth={entry.isTop10 ? 1.5 : 0}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Comprehensive Filterable Batters Leaderboard */}
      <motion.div layout className="rounded-2xl border border-pink-100 bg-white p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-condensed text-xl font-bold uppercase text-slate-900">
              Full Batters Leaderboard &amp; Cohort Analytics
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any row to open the complete Player X-Ray and match-by-match audit log.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search batter or team..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-xl border border-pink-200 bg-pink-50/40 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-[#EA1A85] focus:outline-none w-48"
              />
            </div>

            {/* Role Filter */}
            <div className="flex items-center gap-1 rounded-xl bg-pink-50 p-1 border border-pink-100">
              {(['ALL', 'Opener', 'Middle-Order', 'Finisher'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    roleFilter === r
                      ? 'bg-[#EA1A85] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r === 'ALL' ? 'All Roles' : r}
                </button>
              ))}
            </div>

            {/* Handedness Filter */}
            <div className="flex items-center gap-1 rounded-xl bg-pink-50 p-1 border border-pink-100">
              {(['ALL', 'RHB', 'LHB'] as const).map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHandFilter(h)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    handFilter === h
                      ? 'bg-[#EA1A85] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-pink-100 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3">Player</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3 text-right">Normal SR</th>
                <th className="py-2.5 px-3 text-right">Pressure SR</th>
                <th className="py-2.5 px-3 text-right">SR Delta</th>
                <th className="py-2.5 px-3 text-right">Calibrated SR</th>
                <th className="py-2.5 px-3 text-right">Pressure Balls</th>
                <th className="py-2.5 px-3 text-right">Dot Avoid %</th>
                <th className="py-2.5 px-3 text-right">Consistency</th>
                <th className="py-2.5 px-3 text-right">Reliability Score</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <motion.tbody
              key={`${roleFilter}-${handFilter}-${search}`}
              variants={tableBodyVariants}
              initial="hidden"
              animate="visible"
              className="divide-y divide-pink-50 font-mono"
            >
              <AnimatePresence initial={false}>
                {filteredBatters.map((b) => (
                  <motion.tr
                    layout
                    key={b.playerId}
                    variants={tableRowVariants}
                    exit={{ opacity: 0, x: -12, transition: { duration: 0.15 } }}
                    whileHover={{ x: 4, backgroundColor: 'rgba(253, 242, 248, 0.7)' }}
                    onClick={() => onSelectPlayer(b.playerId, 'batter')}
                    className="hover:bg-pink-50/50 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-3 font-sans">
                      <div className="flex items-center gap-2.5">
                        <PlayerAvatar name={b.name} rank={b.unstopRank <= 10 ? b.unstopRank : undefined} size="sm" />
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{b.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {b.teamName} · {b.battingType}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-600 font-medium">{b.role}</td>
                    <td className="py-2.5 px-3 text-right text-slate-500">{b.normalSR}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#EA1A85]">{b.pressureSR}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">
                      {b.srDelta > 0 ? `+${b.srDelta}` : b.srDelta}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700">{b.shrunkSR}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700">{b.pressureBalls}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700">{b.pressureDotAvoidancePct}%</td>
                    <td className="py-2.5 px-3 text-right text-slate-700">{b.consistencyScore}</td>
                    <td className="py-2.5 px-3 text-right font-numeric text-lg font-bold text-[#EA1A85]">
                      {b.reliabilityScore}
                    </td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            (onWatchStrengthDemo || onSelectPlayer)(b.playerId, 'batter');
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-pink-200 bg-pink-50 px-2.5 py-1 text-[10px] font-bold text-[#EA1A85] hover:bg-[#EA1A85] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <Play className="h-2.5 w-2.5 fill-current" />
                          <span>Watch Strength Demo</span>
                        </button>
                        {b.unstopRank <= 10 ? (
                          <span className="text-[10px] font-bold text-[#EA1A85]">
                            #{b.unstopRank}
                          </span>
                        ) : null}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </motion.tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
};
