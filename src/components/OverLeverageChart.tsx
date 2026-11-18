import React, { useState } from 'react';
import { Camera, Check, Info } from 'lucide-react';
import { motion } from 'motion/react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import { OverLeveragePoint } from '../types/cricket';
import { exportChartToPNG } from '../utils/chartExport';
import { useGraphTheme } from '../utils/chartThemes';
import { GraphThemePicker } from './GraphThemePicker';

interface OverLeverageChartProps {
  data: OverLeveragePoint[];
}

export const OverLeverageChart: React.FC<OverLeverageChartProps> = ({ data }) => {
  const [inningsView, setInningsView] = useState<'combined' | 'inn1' | 'inn2'>('combined');
  const [downloading, setDownloading] = useState(false);
  const { theme } = useGraphTheme();

  const handleExport = async () => {
    setDownloading(true);
    await exportChartToPNG('over-leverage-chart-container', 'RR_Match_Pressure_Curve');
    setTimeout(() => setDownloading(false), 2000);
  };

  const chartId = 'over-leverage-chart-container';

  return (
    <motion.div
      id={chartId}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={`rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-6 shadow-md transition-colors duration-300 relative`}
    >
      {/* Chart Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="font-bold uppercase tracking-wider" style={{ color: theme.primary }}>
              Real-Time Match Dynamics
            </span>
            <span className={theme.mutedText}>·</span>
            <span className={theme.mutedText}>Overs 1 to 20</span>
            <span className={theme.mutedText}>·</span>
            <span className={theme.mutedText}>{theme.badge}</span>
          </div>
          <h3 className={`font-condensed text-2xl font-extrabold uppercase ${theme.titleText} mt-0.5`}>
            Over-by-Over Pressure &amp; Scoring Leverage Curve
          </h3>
          <p className={`text-xs ${theme.subText} mt-0.5`}>
            Dual-axis trajectory tracking Ball Pressure Index (BPI) alongside Boundary % and Wicket Fall spikes across match phases.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <GraphThemePicker />

          {/* Innings Segmented Toggle */}
          <div
            data-no-export
            className={`flex items-center gap-1 rounded-xl p-1 border ${
              theme.isDarkCanvas ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}
          >
            {(['combined', 'inn2', 'inn1'] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setInningsView(view)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  inningsView === view
                    ? 'text-white shadow-xs'
                    : theme.isDarkCanvas
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                style={inningsView === view ? { backgroundColor: theme.primary } : undefined}
              >
                {view === 'combined' ? 'All Innings' : view === 'inn2' ? '2nd Inn Chase' : '1st Inn Setting'}
              </button>
            ))}
          </div>

          {/* Download PNG Camera Button */}
          <button
            data-no-export
            type="button"
            onClick={handleExport}
            title="Download high-resolution chart PNG"
            className={`flex items-center gap-1.5 rounded-xl border p-2 text-xs font-bold transition-colors cursor-pointer ${
              theme.isDarkCanvas
                ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {downloading ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              <Camera className="h-4 w-4" style={{ color: theme.primary }} />
            )}
          </button>
        </div>
      </div>

      {/* Phase Legends */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 text-xs mb-3 font-mono border-b pb-3 ${
          theme.isDarkCanvas ? 'border-slate-800' : 'border-slate-200'
        }`}
      >
        <div className={`flex items-center gap-4 ${theme.subText}`}>
          <span className="flex items-center gap-1.5 font-medium">
            <span
              className="w-3 h-3 rounded-xs border"
              style={{ backgroundColor: theme.phaseBands.powerplay, borderColor: theme.primary }}
            />
            Powerplay (Overs 1–6)
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span
              className="w-3 h-3 rounded-xs border"
              style={{ backgroundColor: theme.phaseBands.middle, borderColor: theme.axisStroke }}
            />
            Middle (Overs 7–15)
          </span>
          <span className="flex items-center gap-1.5 font-bold" style={{ color: theme.primary }}>
            <span
              className="w-3 h-3 rounded-xs border"
              style={{ backgroundColor: theme.phaseBands.death, borderColor: theme.primary }}
            />
            Death Crunch (Overs 16–20)
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-sans">
          <span className="flex items-center gap-1.5 font-bold" style={{ color: theme.primary }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.primary }} />
            BPI Leverage (0–100)
          </span>
          <span className="flex items-center gap-1.5 font-bold" style={{ color: theme.secondary }}>
            <span className="w-3 h-0.5 inline-block" style={{ backgroundColor: theme.secondary }} />
            Boundary %
          </span>
          <span className="flex items-center gap-1.5 font-bold" style={{ color: theme.tertiary }}>
            <span className="w-3 h-0.5 inline-block" style={{ backgroundColor: theme.tertiary }} />
            Wicket %
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div
        className="h-80 w-full rounded-xl p-2 transition-colors duration-300"
        style={{ backgroundColor: theme.plotBg }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 15, right: 25, bottom: 20, left: 10 }}>
            <defs>
              <linearGradient id="dynamicBpiGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={theme.primary} stopOpacity={0.55} />
                <stop offset="50%" stopColor={theme.primaryEnd} stopOpacity={0.22} />
                <stop offset="95%" stopColor={theme.primary} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.gridStroke} />

            {/* Phase Shading Bands */}
            <ReferenceArea x1={1} x2={6} fill={theme.phaseBands.powerplay} fillOpacity={0.45} />
            <ReferenceArea x1={7} x2={15} fill={theme.phaseBands.middle} fillOpacity={0.35} />
            <ReferenceArea x1={16} x2={20} fill={theme.phaseBands.death} fillOpacity={0.55} />

            <XAxis
              dataKey="over"
              stroke={theme.axisStroke}
              fontSize={11}
              tickLine={false}
              label={{
                value: 'Match Over Number (1 to 20)',
                position: 'insideBottom',
                offset: -10,
                fill: theme.axisStroke,
                fontSize: 11,
              }}
            />
            <YAxis
              yAxisId="bpi"
              domain={[0, 100]}
              stroke={theme.primary}
              fontSize={11}
              tickLine={false}
              label={{
                value: 'Ball Pressure Index (BPI)',
                angle: -90,
                position: 'insideLeft',
                offset: 5,
                fill: theme.primary,
                fontSize: 11,
                fontWeight: 'bold',
              }}
            />
            <YAxis
              yAxisId="pct"
              orientation="right"
              domain={[0, 35]}
              stroke={theme.secondary}
              fontSize={11}
              tickLine={false}
              unit="%"
              label={{
                value: 'Boundary / Wicket Rate (%)',
                angle: 90,
                position: 'insideRight',
                offset: 5,
                fill: theme.secondary,
                fontSize: 11,
                fontWeight: 'bold',
              }}
            />

            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload as OverLeveragePoint;
                  return (
                    <div
                      className={`rounded-xl border ${theme.tooltipBorder} ${theme.tooltipBg} ${theme.tooltipText} p-3.5 shadow-xl text-xs font-mono`}
                    >
                      <div className="flex items-center justify-between gap-4 pb-1.5 border-b border-slate-500/20 font-sans">
                        <span className="font-bold">Over {label} ({pt.phase})</span>
                        <span className="text-[10px] font-bold" style={{ color: theme.primary }}>
                          {inningsView === 'inn2' ? '2nd Inn Chase' : inningsView === 'inn1' ? '1st Inn Setting' : 'All Innings'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 mt-2">
                        <div>
                          <span className="text-[10px] opacity-70 font-sans block">Avg Pressure:</span>
                          <span className="text-base font-bold" style={{ color: theme.primary }}>
                            {inningsView === 'inn2' ? pt.inn2_bpi : inningsView === 'inn1' ? pt.inn1_bpi : pt.combined_bpi} BPI
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] opacity-70 font-sans block">Boundary Rate:</span>
                          <span className="text-base font-bold" style={{ color: theme.secondary }}>
                            {pt.boundary_pct}%
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] opacity-70 font-sans block">Wicket Rate:</span>
                          <span className="text-sm font-bold" style={{ color: theme.tertiary }}>
                            {pt.wicket_pct}%
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] opacity-70 font-sans block">Phase Shift:</span>
                          <span className="text-sm font-bold">
                            {pt.over >= 16 ? '+58% Crunch' : pt.over <= 6 ? 'Powerplay Attack' : 'Consolidation'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            <Area
              yAxisId="bpi"
              type="monotone"
              dataKey={inningsView === 'inn2' ? 'inn2_bpi' : inningsView === 'inn1' ? 'inn1_bpi' : 'combined_bpi'}
              stroke={theme.primary}
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#dynamicBpiGlow)"
              name="Pressure BPI"
              isAnimationActive={true}
              animationDuration={900}
            />

            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="boundary_pct"
              stroke={theme.secondary}
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: theme.secondary }}
              activeDot={{ r: 6 }}
              name="Boundary %"
              isAnimationActive={true}
              animationDuration={1100}
            />

            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="wicket_pct"
              stroke={theme.tertiary}
              strokeWidth={2.5}
              strokeDasharray="4 4"
              dot={{ r: 3.5, fill: theme.tertiary }}
              activeDot={{ r: 6 }}
              name="Wicket %"
              isAnimationActive={true}
              animationDuration={1300}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className={`mt-3 flex items-center gap-2 text-[11px] ${theme.subText}`}>
        <Info className="h-3.5 w-3.5 shrink-0" style={{ color: theme.primary }} />
        <span>
          Notice the exponential surge in Death Overs (16–20) where Required Run Rate compression drives BPI above the 65+ threshold.
        </span>
      </div>
    </motion.div>
  );
};
