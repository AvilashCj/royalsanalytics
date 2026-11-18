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
import { BowlerRating, PressureModelConfig } from '../types/cricket';
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

interface BowlersTabProps {
  bowlers: BowlerRating[];
  onSelectPlayer: (playerId: number, type: 'batter' | 'bowler') => void;
  onWatchStrengthDemo?: (playerId: number, type: 'batter' | 'bowler') => void;
  onOpenCompare?: (playerIds: number[], type: 'bowler') => void;
  onOpenPhotoManager?: () => void;
  cohortMeanEconomy: number;
  config?: PressureModelConfig;
  onConfigChange?: (newConfig: PressureModelConfig) => void;
  recalcTimeMs?: number;
}

export const BowlersTab: React.FC<BowlersTabProps> = ({
  bowlers,
  onSelectPlayer,
  onWatchStrengthDemo,
  onOpenCompare,
  onOpenPhotoManager,
  config,
  onConfigChange,
  recalcTimeMs,
}) => {
  const [search, setSearch] = useState('');
  const [paceSpinFilter, setPaceSpinFilter] = useState<'ALL' | 'Pace' | 'Spin'>('ALL');
  const [downloadingScatter, setDownloadingScatter] = useState(false);
  const { theme } = useGraphTheme();

  // Top 10 Qualifiers (Unstop Rank 1 to 10)
  const top10 = bowlers
    .filter((bw) => bw.unstopRank <= 10)
    .sort((a, b) => a.unstopRank - b.unstopRank);

  // Filtered bowlers list
  const filteredBowlers = bowlers.filter((bw) => {
    const matchesSearch =
      bw.name.toLowerCase().includes(search.toLowerCase()) ||
      bw.teamName.toLowerCase().includes(search.toLowerCase()) ||
      bw.bowlingType.toLowerCase().includes(search.toLowerCase());
    const matchesPaceSpin = paceSpinFilter === 'ALL' || bw.paceOrSpin === paceSpinFilter;
    return matchesSearch && matchesPaceSpin;
  });

  // Scatter plot data
  const scatterData = bowlers
    .filter((bw) => bw.pressureBalls >= 30)
    .map((bw) => ({
      name: bw.name,
      team: bw.teamName,
      normalEcon: bw.normalEconomy,
      pressureEcon: bw.pressureEconomy,
      balls: bw.pressureBalls,
      score: bw.reliabilityScore,
      paceOrSpin: bw.paceOrSpin,
      bowlingType: bw.bowlingType,
      isTop10: bw.unstopRank <= 10,
      playerId: bw.playerId,
    }));

  // Connected Dumbbell Items (Normal Economy vs Pressure Economy)
  const dumbbellItems = top10.map((bw) => ({
    id: bw.playerId,
    rank: bw.unstopRank,
    name: bw.name,
    team: bw.teamName,
    baseline: bw.normalEconomy,
    pressure: bw.pressureEconomy,
    delta: bw.economyDelta,
    isPositive: bw.economyDelta >= 0,
    unit: 'rpo',
  }));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, layout: { duration: 0.3 } }}
      className="flex flex-col gap-8 pb-12"
    >
      {/* Judge's Stress-Test Mode Bar (Top of Tab 3) */}
      {config && onConfigChange && (
        <JudgesStressTestBar
          config={config}
          onChangeConfig={onConfigChange}
          recalcTimeMs={recalcTimeMs}
        />
      )}

      {/* Header & Quick Action */}
      <motion.div
        layout
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-pink-200 bg-white p-6 shadow-xs"
      >
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#EA1A85]">
            <span>Challenge Objective 2</span>
            <span>·</span>
            <span>Pressure-Qualified Indian Domestic Shortlist (BPI &ge; 65)</span>
          </div>
          <h1 className="font-condensed text-3xl font-extrabold uppercase tracking-tight text-slate-900 mt-1">
            Top 10 Domestic Bowlers Under Pressure (BPI &ge; 65)
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Tailored to Rajasthan Royals&apos; IPL 2027 auction strategy: ranked by Pressure Reliability Rating (PRR), Pressure Economy, RR Weakness Fix assignment, and Est. Days to India Cap countdown.
          </p>
        </div>
        {onOpenCompare && (
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            <button
              type="button"
              onClick={() => onOpenCompare(top10.slice(0, 2).map((bw) => bw.playerId), 'bowler')}
              className="flex items-center gap-1.5 rounded-xl border border-pink-200 bg-pink-50/60 px-3.5 py-2.5 text-xs font-bold text-slate-800 hover:bg-pink-100 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Scale className="h-4 w-4 text-[#EA1A85]" />
              Compare Top Bowlers
            </button>
          </div>
        )}
      </motion.div>

      {/* Owner's Executive Podium Hero Showcase */}
      {top10.length >= 3 && (
        <OwnersPodiumShowcase
          players={top10}
          type="bowler"
          onSelectPlayer={onSelectPlayer}
          onOpenPhotoManager={onOpenPhotoManager}
        />
      )}

      {/* Connected Dumbbell Chart (Normal vs. High-Pressure Economy) */}
      <ClutchDumbbellChart
        title="Top 10 Domestic Bowlers: Clutch vs. Choke Economy Dumbbell (Normal vs Pressure)"
        subtitle="Connected horizontal dumbbell vector: Baseline Economy vs Pressure Economy (BPI ≥ 65). Lower economy under pressure indicates elite death & middle-overs control."
        items={dumbbellItems}
        metricLabel="Economy Rate (Runs per Over)"
        isBowler={true}
        minScale={5.0}
        maxScale={11.5}
        onSelectPlayer={(id: number) => onSelectPlayer(id, 'bowler')}
      />

      {/* Unstop Submission Top 10 Ordered Table */}
      <motion.div layout className="rounded-2xl border border-pink-100 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-condensed text-xl font-bold uppercase text-slate-900">
              Top 10 Domestic Bowlers Under Pressure (BPI &ge; 65) • RR IPL 2027 Shortlist
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Synchronized across Auction Targets, Bowlers, Player X-Ray, and Executive Report with RR Weakness Fix &amp; Est. India Cap countdowns.
            </p>
          </div>
          <span className="text-xs text-[#EA1A85] font-bold font-mono">10 Pressure-Qualified Bowlers</span>
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
                <th className="py-3 px-3 text-right">Normal Econ</th>
                <th className="py-3 px-3 text-right">Pressure Econ</th>
                <th className="py-3 px-3 text-right">Econ Delta</th>
                <th className="py-3 px-3 text-right">Dot Ball %</th>
                <th className="py-3 px-3 text-right">Wickets</th>
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
              {top10.map((bw) => (
                <motion.tr
                  layout
                  key={bw.playerId}
                  variants={tableRowVariants}
                  whileHover={{ x: 4, backgroundColor: 'rgba(253, 242, 248, 0.7)' }}
                  onClick={() => onSelectPlayer(bw.playerId, 'bowler')}
                  className="hover:bg-pink-50/50 transition-colors cursor-pointer"
                >
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center justify-center font-numeric text-base w-7 h-7 rounded-lg font-bold ${
                        bw.unstopRank === 1
                          ? 'bg-[#EA1A85] text-white shadow-xs'
                          : bw.unstopRank <= 3
                          ? 'bg-pink-100 text-[#EA1A85]'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {bw.unstopRank}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-sans">
                    <div className="flex items-center gap-2.5">
                      <PlayerAvatar name={bw.name} rank={bw.unstopRank} size="sm" />
                      <div>
                        <span className="font-bold text-slate-900 block">{bw.name}</span>
                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                          {bw.estIndiaCapLabel && (
                            <span className="inline-flex items-center rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                              {bw.estIndiaCapLabel}
                            </span>
                          )}
                          <span className="text-[10px] font-semibold text-emerald-700">
                            {bw.rankStabilityBadge || (bw.unstopRank <= 3 ? 'Stable Top-3' : 'BPI ≥ 65')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-sans font-semibold text-slate-700">{bw.teamName}</td>
                  <td className="py-3 px-3 font-sans">
                    <span className="font-bold text-[#EA1A85] block">
                      {bw.rrWeaknessFixTag || bw.rrSquadRoleFit || 'Death-Over Yorker Closer'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {bw.paceOrSpin} {bw.rrSquadRoleFit && bw.rrWeaknessFixTag ? `· ${bw.rrSquadRoleFit}` : ''}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-slate-700 tabular-nums">{bw.pressureBalls}</td>
                  <td className="py-3 px-3 text-right text-slate-500 tabular-nums">{bw.normalEconomy}</td>
                  <td className="py-3 px-3 text-right text-[#EA1A85] font-bold tabular-nums">{bw.pressureEconomy}</td>
                  <td className="py-3 px-3 text-right text-emerald-600 font-bold tabular-nums">
                    {bw.economyDelta > 0 ? `+${bw.economyDelta}` : bw.economyDelta}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-700 tabular-nums">{bw.pressureDotPct}%</td>
                  <td className="py-3 px-3 text-right text-slate-700 tabular-nums">{bw.pressureWickets}</td>
                  <td className="py-3 px-3 text-right font-numeric text-lg font-bold text-[#EA1A85] tabular-nums">
                    {bw.reliabilityScore}
                  </td>
                  <td className="py-3 px-3 text-center font-sans">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          (onWatchStrengthDemo || onSelectPlayer)(bw.playerId, 'bowler');
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

      {/* Interactive Baseline vs. Pressure Economy Scatter Plot with Switchable Theme */}
      <motion.div
        id="bowlers-scatter-matrix"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className={`rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-6 shadow-md transition-colors duration-300 relative`}
      >
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className={`font-condensed text-xl font-bold uppercase ${theme.titleText}`}>
              Baseline vs. High-Pressure Economy Scatter Matrix
            </h3>
            <p className={`text-xs ${theme.subText} mt-0.5`}>
              Bowlers below the parity diagonal restrict scoring tighter under pressure than in normal match states.
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
              Other Bowlers
            </span>
            <button
              data-no-export
              type="button"
              onClick={async () => {
                setDownloadingScatter(true);
                await exportChartToPNG('bowlers-scatter-matrix', 'Bowlers_Scatter_Matrix');
                setTimeout(() => setDownloadingScatter(false), 2000);
              }}
              title="Download PNG chart"
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
                dataKey="normalEcon"
                name="Normal Economy"
                domain={[5.5, 11.5]}
                unit=""
                stroke={theme.axisStroke}
                fontSize={11}
                tickLine={false}
                label={{
                  value: 'Normal Baseline Economy Rate (Runs / Over)',
                  position: 'insideBottom',
                  offset: -10,
                  fill: theme.axisStroke,
                  fontSize: 11,
                }}
              />
              <YAxis
                type="number"
                dataKey="pressureEcon"
                name="Pressure Economy"
                domain={[5.0, 12.0]}
                unit=""
                stroke={theme.axisStroke}
                fontSize={11}
                tickLine={false}
                label={{
                  value: 'High-Pressure Economy Rate (Runs / Over)',
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
                  { x: 5.5, y: 5.5 },
                  { x: 11.5, y: 11.5 },
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
                          {data.team} · {data.bowlingType}
                        </p>
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-500/20 text-xs font-mono">
                          <div>
                            <span className="opacity-70 block text-[10px] font-sans">Normal Econ:</span>
                            <span className="font-bold">{data.normalEcon}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] font-sans" style={{ color: theme.primary }}>
                              Pressure Econ:
                            </span>
                            <span className="font-bold" style={{ color: theme.primary }}>
                              {data.pressureEcon}
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
                name="Bowlers"
                data={scatterData}
                onClick={(e: any) => e?.playerId && onSelectPlayer(e.playerId, 'bowler')}
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

      {/* Comprehensive Filterable Bowlers Leaderboard */}
      <motion.div layout className="rounded-2xl border border-pink-100 bg-white p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-condensed text-xl font-bold uppercase text-slate-900">
              Full Bowlers Leaderboard &amp; Cohort Analytics
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any row to open the complete Player X-Ray and match-by-match audit log.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search bowler or team..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-xl border border-pink-200 bg-pink-50/40 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-[#EA1A85] focus:outline-none w-48"
              />
            </div>

            <div className="flex items-center gap-1 rounded-xl bg-pink-50 p-1 border border-pink-100">
              {(['ALL', 'Pace', 'Spin'] as const).map((ps) => (
                <button
                  key={ps}
                  type="button"
                  onClick={() => setPaceSpinFilter(ps)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    paceSpinFilter === ps
                      ? 'bg-[#EA1A85] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {ps === 'ALL' ? 'All Disciplines' : ps}
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
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3 text-right">Normal Econ</th>
                <th className="py-2.5 px-3 text-right">Pressure Econ</th>
                <th className="py-2.5 px-3 text-right">Econ Delta</th>
                <th className="py-2.5 px-3 text-right">Calibrated Econ</th>
                <th className="py-2.5 px-3 text-right">Pressure Balls</th>
                <th className="py-2.5 px-3 text-right">Dot Ball %</th>
                <th className="py-2.5 px-3 text-right">Wickets</th>
                <th className="py-2.5 px-3 text-right">Reliability Score</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <motion.tbody
              key={`${paceSpinFilter}-${search}`}
              variants={tableBodyVariants}
              initial="hidden"
              animate="visible"
              className="divide-y divide-pink-50 font-mono"
            >
              <AnimatePresence initial={false}>
                {filteredBowlers.map((bw) => (
                  <motion.tr
                    layout
                    key={bw.playerId}
                    variants={tableRowVariants}
                    exit={{ opacity: 0, x: -12, transition: { duration: 0.15 } }}
                    whileHover={{ x: 4, backgroundColor: 'rgba(253, 242, 248, 0.7)' }}
                    onClick={() => onSelectPlayer(bw.playerId, 'bowler')}
                    className="hover:bg-pink-50/50 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-3 font-sans">
                      <div className="flex items-center gap-2.5">
                        <PlayerAvatar name={bw.name} rank={bw.unstopRank <= 10 ? bw.unstopRank : undefined} size="sm" />
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{bw.name}</p>
                          <p className="text-[11px] text-slate-500">{bw.teamName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-600 font-medium">{bw.bowlingType}</td>
                    <td className="py-2.5 px-3 text-right text-slate-500">{bw.normalEconomy}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#EA1A85]">{bw.pressureEconomy}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">
                      {bw.economyDelta > 0 ? `+${bw.economyDelta}` : bw.economyDelta}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700">{bw.shrunkEconomy}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700">{bw.pressureBalls}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700">{bw.pressureDotPct}%</td>
                    <td className="py-2.5 px-3 text-right text-slate-700">{bw.pressureWickets}</td>
                    <td className="py-2.5 px-3 text-right font-numeric text-lg font-bold text-[#EA1A85]">
                      {bw.reliabilityScore}
                    </td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            (onWatchStrengthDemo || onSelectPlayer)(bw.playerId, 'bowler');
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-pink-200 bg-pink-50 px-2.5 py-1 text-[10px] font-bold text-[#EA1A85] hover:bg-[#EA1A85] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <Play className="h-2.5 w-2.5 fill-current" />
                          <span>Watch Strength Demo</span>
                        </button>
                        {bw.unstopRank <= 10 ? (
                          <span className="text-[10px] font-bold text-[#EA1A85]">
                            #{bw.unstopRank}
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
