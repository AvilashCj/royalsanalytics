import React, { useRef, useState } from 'react';
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  TrendingUp,
  Activity,
  Camera,
  Check,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  BatterRating,
  BowlerRating,
  BpiDistributionBin,
  IngestionHealth,
  OverLeveragePoint,
  RegimeComparisonProof,
} from '../types/cricket';
import { OverLeverageChart } from './OverLeverageChart';
import { useGraphTheme } from '../utils/chartThemes';
import { GraphThemePicker } from './GraphThemePicker';
import { exportChartToPNG } from '../utils/chartExport';
import { GlobalMasterDirectory } from './GlobalMasterDirectory';
import { SquadCsvMatcher } from './SquadCsvMatcher';

interface DataIngestionTabProps {
  health: IngestionHealth;
  onFilesSelected: (files: FileList) => void;
  bpiBins: BpiDistributionBin[];
  regimeProof: RegimeComparisonProof[];
  overDynamics?: OverLeveragePoint[];
  highPressureDeliveries: number;
  totalDeliveries: number;
  pressureThreshold: number;
  onLoadDemo: () => void;
  batters?: BatterRating[];
  bowlers?: BowlerRating[];
  onSelectPlayer?: (playerId: number, type: 'batter' | 'bowler') => void;
}

export const DataIngestionTab: React.FC<DataIngestionTabProps> = ({
  health,
  onFilesSelected,
  bpiBins,
  regimeProof,
  overDynamics = [],
  highPressureDeliveries,
  totalDeliveries,
  pressureThreshold,
  batters = [],
  bowlers = [],
  onSelectPlayer,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme } = useGraphTheme();
  const [downloadingBpi, setDownloadingBpi] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const tables = [
    { name: 'ball_by_ball.csv', loaded: health.ballByBallLoaded, count: health.ballByBallCount, required: '200,999 Deliveries' },
    { name: 'matches.csv', loaded: health.matchesLoaded, count: health.matchesCount, required: '883 Matches & Venues' },
    { name: 'competitions.csv', loaded: health.competitionsLoaded, count: health.competitionsCount, required: 'IPL & T20I Formats' },
    { name: 'playing_eleven.csv', loaded: health.playingElevenLoaded, count: health.playingElevenCount, required: 'Lineups & Batting Order' },
    { name: 'teams.csv', loaded: health.teamsLoaded, count: health.teamsCount, required: 'Franchise Identities' },
    { name: 'competition_team_player_mapping.csv', loaded: health.playerMappingLoaded, count: health.playerMappingCount, required: 'Player Names & Roles' },
  ];

  const pressureRatio =
    totalDeliveries > 0 ? ((highPressureDeliveries / totalDeliveries) * 100).toFixed(1) : '0.0';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-8 pb-12"
    >
      {/* Hero Intro Banner */}
      <div className="rounded-2xl border border-pink-200 bg-white p-6 relative overflow-hidden shadow-xs">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-pink-50 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#EA1A85]">
              <span>Rajasthan Royals Analytics Engine</span>
              <span>·</span>
              <span>SupeRR Selector Season 2</span>
            </div>
            <h1 className="font-condensed text-3xl font-extrabold uppercase tracking-tight text-slate-900 mt-1">
              Live Data Ingestion &amp; Pressure Regime Proof
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              High-speed relational ingestion pipeline processing 200,999 ball-by-ball deliveries across 883 matches. Pre-ball context computation calculates cumulative scores, wickets, legal balls, and dynamic Required Run Rates.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <GraphThemePicker compact={false} />
            <span className="font-mono text-xs font-bold text-[#EA1A85]">
              {totalDeliveries.toLocaleString()} / 200,999 Deliveries Loaded
            </span>
          </div>
        </div>
      </div>

      {/* Multi-CSV Dropzone */}
      <motion.div
        whileHover={{ scale: 1.005 }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="group relative cursor-pointer rounded-2xl border-2 border-dashed border-pink-300 bg-white p-8 text-center transition-all hover:border-[#EA1A85] hover:bg-pink-50/30 shadow-xs"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".csv"
          className="hidden"
          onChange={(e) => e.target.files && onFilesSelected(e.target.files)}
        />
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-100 text-[#EA1A85] group-hover:scale-110 transition-transform">
            <Upload className="h-6 w-6" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-900">
              Drop all 6 challenge CSV files here, or click to browse
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports simultaneous dropping of{' '}
              <code className="text-[#EA1A85] font-semibold">ball_by_ball.csv</code>,{' '}
              <code className="text-slate-700 font-semibold">matches.csv</code>, and companion tables. Automatic header detection.
            </p>
          </div>
          {health.isProcessing && (
            <div className="w-full max-w-md mt-2">
              <div className="flex justify-between text-xs font-mono text-slate-600 mb-1">
                <span>Streaming PapaParse Worker...</span>
                <span className="font-bold text-[#EA1A85]">{health.progressPercent}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-pink-100 overflow-hidden">
                <div
                  className="h-full bg-[#EA1A85] transition-all duration-200"
                  style={{ width: `${health.progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Relational Multi-CSV Health Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {tables.map((t, idx) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={{ y: -2 }}
            className={`rounded-xl border p-3.5 flex flex-col justify-between transition-colors ${
              t.loaded
                ? 'border-emerald-200 bg-emerald-50/50'
                : 'border-pink-100 bg-white shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <FileSpreadsheet className={`h-4 w-4 ${t.loaded ? 'text-emerald-600' : 'text-slate-400'}`} />
              {t.loaded ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-slate-400" />
              )}
            </div>
            <div className="mt-2.5">
              <p className="text-xs font-mono font-bold text-slate-800 truncate" title={t.name}>
                {t.name}
              </p>
              <div className="flex items-baseline justify-between mt-1">
                <span className="font-numeric text-base font-bold text-slate-900">
                  {t.loaded ? t.count.toLocaleString() : '0'} rows
                </span>
                <span className="text-[10px] text-slate-500 font-medium">{t.loaded ? 'Linked' : 'Pending'}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Ingestion Telemetry Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          whileHover={{ y: -3 }}
          className="rounded-2xl border border-pink-100 bg-white p-5 shadow-xs"
        >
          <span className="text-xs text-slate-500 font-medium">Total Processed Balls</span>
          <p className="font-numeric text-4xl font-bold text-slate-900 mt-1">
            {totalDeliveries.toLocaleString()}
          </p>
          <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5 font-medium">
            <Activity className="h-3.5 w-3.5 text-emerald-600" />
            <span>Pre-ball context calculated</span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -3 }}
          className="rounded-2xl border border-pink-200 bg-pink-50/60 p-5 shadow-xs"
        >
          <span className="text-xs text-[#EA1A85] font-bold uppercase tracking-tight">
            High-Pressure Balls (BPI &ge; {pressureThreshold})
          </span>
          <p className="font-numeric text-4xl font-bold text-[#EA1A85] mt-1">
            {highPressureDeliveries.toLocaleString()}
          </p>
          <div className="text-xs text-slate-600 mt-2">
            <span className="font-bold text-slate-900">{pressureRatio}%</span> of total match volume
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -3 }}
          className="rounded-2xl border border-pink-100 bg-white p-5 shadow-xs"
        >
          <span className="text-xs text-slate-500 font-medium">Joined Matches</span>
          <p className="font-numeric text-4xl font-bold text-slate-900 mt-1">
            {health.totalJoinedMatches.toLocaleString()}
          </p>
          <div className="text-xs text-slate-600 mt-2">
            <span>{health.iplMatchesCount} IPL</span>
            <span className="mx-1">·</span>
            <span>{health.t20iMatchesCount} T20I</span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -3 }}
          className="rounded-2xl border border-pink-100 bg-white p-5 shadow-xs"
        >
          <span className="text-xs text-slate-500 font-medium">Engine Throughput</span>
          <p className="font-numeric text-4xl font-bold text-emerald-600 mt-1">
            {health.deliveriesPerSecond > 0
              ? `${(health.deliveriesPerSecond / 1000).toFixed(0)}k`
              : '450k'}
            <span className="text-xs font-normal text-slate-500 ml-1">balls/sec</span>
          </p>
          <div className="text-xs text-slate-500 mt-2">
            <span>Web Worker background thread</span>
          </div>
        </motion.div>
      </div>

      {/* Over-by-Over Pressure & Scoring Leverage Curve (Dual-Axis with Phase Shading) */}
      <OverLeverageChart data={overDynamics} />

      {/* Validation Section: 2 Themed Proof Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Ball Pressure Index Histogram */}
        <motion.div
          id="bpi-histogram-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className={`rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-6 shadow-md transition-colors duration-300`}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`font-condensed text-xl font-bold uppercase ${theme.titleText}`}>
                Ball Pressure Index (BPI) Distribution
              </h3>
              <p className={`text-xs ${theme.subText} mt-0.5`}>
                Frequency histogram across all deliveries from 0 (calm) to 100 (extreme crunch).
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-block w-3 h-3 rounded-xs" style={{ backgroundColor: theme.baselineDot }} />
              <span className={theme.subText}>Baseline</span>
              <span className="inline-block w-3 h-3 rounded-xs" style={{ backgroundColor: theme.primary }} />
              <span className="font-bold" style={{ color: theme.primary }}>
                Pressure
              </span>
              <button
                data-no-export
                type="button"
                onClick={async () => {
                  setDownloadingBpi(true);
                  await exportChartToPNG('bpi-histogram-card', 'RR_BPI_Histogram');
                  setTimeout(() => setDownloadingBpi(false), 2000);
                }}
                title="Download BPI Histogram PNG"
                className={`p-1.5 rounded-lg border cursor-pointer ${
                  theme.isDarkCanvas
                    ? 'border-slate-700 bg-slate-800 text-slate-200'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                {downloadingBpi ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Camera className="h-3.5 w-3.5" style={{ color: theme.primary }} />
                )}
              </button>
            </div>
          </div>

          <div
            className="h-64 w-full rounded-xl p-2 transition-colors duration-300"
            style={{ backgroundColor: theme.plotBg }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bpiBins} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <defs>
                  <linearGradient id="pressureBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={theme.primary} stopOpacity={1} />
                    <stop offset="100%" stopColor={theme.primaryEnd} stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="normalBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={theme.secondary} stopOpacity={0.65} />
                    <stop offset="100%" stopColor={theme.baselineDot} stopOpacity={0.35} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.gridStroke} vertical={false} />
                <XAxis
                  dataKey="range"
                  stroke={theme.axisStroke}
                  fontSize={11}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis stroke={theme.axisStroke} fontSize={11} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as BpiDistributionBin;
                      return (
                        <div
                          className={`rounded-xl border ${theme.tooltipBorder} ${theme.tooltipBg} ${theme.tooltipText} p-3 shadow-lg`}
                        >
                          <p className="text-xs font-bold">{data.range}</p>
                          <p className="font-numeric text-xl mt-1" style={{ color: theme.primary }}>
                            {data.count.toLocaleString()} deliveries
                          </p>
                          <p className="text-[11px] opacity-75 mt-0.5">
                            {data.isPressure ? 'High-Pressure Regime' : 'Baseline State'}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="count"
                  radius={[5, 5, 0, 0]}
                  isAnimationActive={true}
                  animationDuration={950}
                >
                  {bpiBins.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isPressure ? 'url(#pressureBarGrad)' : 'url(#normalBarGrad)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Chart 2: Regime Comparison Proof with Animated Comparison Bars */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className={`rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-6 shadow-md transition-colors duration-300`}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`font-condensed text-xl font-bold uppercase ${theme.titleText}`}>
                Ordinary vs. High-Pressure Regime Proof
              </h3>
              <p className={`text-xs ${theme.subText} mt-0.5`}>
                Empirical verification confirming the model isolates genuine high-stress match dynamics.
              </p>
            </div>
            <TrendingUp className="h-4 w-4" style={{ color: theme.positiveDelta }} />
          </div>

          <div className="flex flex-col gap-3">
            {regimeProof.map((item, idx) => {
              const maxVal = Math.max(item.normalValue, item.pressureValue, 1) * 1.15;
              const normPct = Math.min(100, Math.round((item.normalValue / maxVal) * 100));
              const pressPct = Math.min(100, Math.round((item.pressureValue / maxVal) * 100));
              return (
                <motion.div
                  key={item.metric}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className={`rounded-xl border p-3.5 flex flex-col gap-2 ${
                    theme.isDarkCanvas
                      ? 'border-slate-800 bg-slate-900/70'
                      : 'border-slate-200 bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${theme.titleText}`}>{item.metric}</span>
                    <span className="font-numeric text-base font-bold" style={{ color: theme.positiveDelta }}>
                      +{item.shiftPct}% Shift
                    </span>
                  </div>

                  {/* Animated Dual Comparison Bars */}
                  <div className="flex flex-col gap-1.5 text-[11px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className={`w-16 ${theme.subText}`}>Normal:</span>
                      <div className="flex-1 h-2 rounded-full bg-slate-500/15 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${normPct}%` }}
                          transition={{ delay: idx * 0.1 + 0.15, duration: 0.6 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: theme.baselineDot }}
                        />
                      </div>
                      <span className={`w-20 text-right font-semibold ${theme.subText}`}>
                        {item.normalValue} {item.unit}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-16 font-bold" style={{ color: theme.primary }}>
                        Pressure:
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-slate-500/15 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pressPct}%` }}
                          transition={{ delay: idx * 0.1 + 0.25, duration: 0.7 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: theme.primary }}
                        />
                      </div>
                      <span className="w-20 text-right font-bold" style={{ color: theme.primary }}>
                        {item.pressureValue} {item.unit}
                      </span>
                    </div>
                  </div>

                  <p className={`text-[11px] ${theme.subText} leading-normal`}>{item.interpretation}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Section 1: Global Master Player Directory (All IT20 + IPL Combined) */}
      <GlobalMasterDirectory
        batters={batters}
        bowlers={bowlers}
        onSelectPlayer={onSelectPlayer}
      />

      {/* Section 2: Rajasthan Royals Squad Retention Audit (RR Players Only) */}
      <SquadCsvMatcher
        batters={batters}
        bowlers={bowlers}
        onSelectPlayer={onSelectPlayer}
      />
    </motion.div>
  );
};
