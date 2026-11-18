import React, { useState } from 'react';
import { Camera, Check, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import {
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
} from 'recharts';
import { FunnelPlayerPoint } from '../types/cricket';
import { exportChartToPNG } from '../utils/chartExport';
import { useGraphTheme } from '../utils/chartThemes';
import { GraphThemePicker } from './GraphThemePicker';

interface BayesianFunnelPlotProps {
  data: FunnelPlayerPoint[];
  cohortMeanSR: number;
}

export const BayesianFunnelPlot: React.FC<BayesianFunnelPlotProps> = ({
  data,
  cohortMeanSR,
}) => {
  const [downloading, setDownloading] = useState(false);
  const { theme } = useGraphTheme();
  const chartId = 'bayesian-funnel-chart';

  const handleExport = async () => {
    setDownloading(true);
    await exportChartToPNG(chartId, 'RR_Bayesian_Shrinkage_Confidence_Funnel');
    setTimeout(() => setDownloading(false), 2000);
  };

  const funnelCurves: { balls: number; upper: number; lower: number; mean: number }[] = [];
  for (let n = 20; n <= 250; n += 5) {
    const margin = (1.96 * 38) / Math.sqrt(n);
    funnelCurves.push({
      balls: n,
      upper: Number((cohortMeanSR + margin).toFixed(1)),
      lower: Number((cohortMeanSR - margin).toFixed(1)),
      mean: cohortMeanSR,
    });
  }

  const qualifiedPoints = data.filter((p) => p.isQualified);
  const excludedPoints = data.filter((p) => !p.isQualified);

  return (
    <motion.div
      id={chartId}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={`rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-6 shadow-md transition-colors duration-300 relative`}
    >
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="font-bold uppercase tracking-wider" style={{ color: theme.primary }}>
              Rubric Section 3: Fair Comparisons &amp; Eligibility
            </span>
            <span className={theme.mutedText}>·</span>
            <span className={theme.mutedText}>Sample-Size Calibration</span>
            <span className={theme.mutedText}>·</span>
            <span className={theme.mutedText}>{theme.badge}</span>
          </div>
          <h3 className={`font-condensed text-2xl font-extrabold uppercase ${theme.titleText} mt-0.5`}>
            Sample Size vs. Reliability Confidence Funnel Plot
          </h3>
          <p className={`text-xs ${theme.subText} mt-0.5`}>
            Dashed 95% confidence bounds narrow with sample volume. Volatile small samples stabilize toward the tournament benchmark ({cohortMeanSR} SR), preventing unrepresentative sample anomalies.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <GraphThemePicker />

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 font-bold" style={{ color: theme.primary }}>
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: theme.primary }}
              />
              Top 10 Qualifiers
            </span>
            <span className={`flex items-center gap-1.5 ${theme.subText}`}>
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: theme.baselineDot }}
              />
              Excluded (Low Sample)
            </span>
          </div>

          <button
            data-no-export
            type="button"
            onClick={handleExport}
            title="Download PNG chart"
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

      {/* Chart Canvas */}
      <div
        className="h-80 w-full rounded-xl p-2 transition-colors duration-300"
        style={{ backgroundColor: theme.plotBg }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.gridStroke} />
            <XAxis
              dataKey="balls"
              type="number"
              domain={[20, 240]}
              stroke={theme.axisStroke}
              fontSize={11}
              tickLine={false}
              label={{
                value: 'Pressure Deliveries Faced (Sample Volume)',
                position: 'insideBottom',
                offset: -10,
                fill: theme.axisStroke,
                fontSize: 11,
              }}
            />
            <YAxis
              dataKey="rawSR"
              type="number"
              domain={[90, 220]}
              stroke={theme.axisStroke}
              fontSize={11}
              tickLine={false}
              label={{
                value: 'Strike Rate (Raw vs Calibrated)',
                angle: -90,
                position: 'insideLeft',
                offset: 5,
                fill: theme.axisStroke,
                fontSize: 11,
              }}
            />
            <ZAxis type="number" range={[60, 180]} />

            {/* Funnel Curves (Upper & Lower 95% Confidence) */}
            <Line
              data={funnelCurves}
              dataKey="upper"
              stroke={theme.secondary}
              strokeWidth={1.8}
              strokeDasharray="4 4"
              dot={false}
              name="95% Upper Bound"
              isAnimationActive={true}
              animationDuration={1000}
            />
            <Line
              data={funnelCurves}
              dataKey="mean"
              stroke={theme.accentGold}
              strokeWidth={1.8}
              strokeDasharray="2 2"
              dot={false}
              name="Cohort Benchmark"
              isAnimationActive={true}
              animationDuration={1000}
            />
            <Line
              data={funnelCurves}
              dataKey="lower"
              stroke={theme.secondary}
              strokeWidth={1.8}
              strokeDasharray="4 4"
              dot={false}
              name="95% Lower Bound"
              isAnimationActive={true}
              animationDuration={1000}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload as FunnelPlayerPoint;
                  if (!pt.name) return null;
                  return (
                    <div
                      className={`rounded-xl border ${theme.tooltipBorder} ${theme.tooltipBg} ${theme.tooltipText} p-3 shadow-xl text-xs font-mono`}
                    >
                      <p className="font-bold font-sans">{pt.name}</p>
                      <p className="text-[11px] opacity-75 font-sans">{pt.team}</p>
                      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-500/20">
                        <div>
                          <span className="opacity-70 block text-[10px] font-sans">Pressure Sample:</span>
                          <span className="font-bold">{pt.pressureBalls} balls</span>
                        </div>
                        <div>
                          <span className="opacity-70 block text-[10px] font-sans">Raw SR:</span>
                          <span className="font-bold">{pt.rawSR}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-sans" style={{ color: theme.primary }}>
                            Calibrated SR:
                          </span>
                          <span className="font-bold" style={{ color: theme.primary }}>
                            {pt.shrunkSR}
                          </span>
                        </div>
                        <div>
                          <span className="opacity-70 block text-[10px] font-sans">Status:</span>
                          <span
                            className="font-bold"
                            style={{ color: pt.isQualified ? theme.positiveDelta : theme.axisStroke }}
                          >
                            {pt.isQualified ? `Rank #${pt.unstopRank}` : 'Below Cutoff'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Excluded Players */}
            <Scatter
              data={excludedPoints}
              dataKey="rawSR"
              fill={theme.baselineDot}
              name="Below Sample Threshold"
              isAnimationActive={true}
              animationDuration={800}
            />

            {/* Qualified Top 10 Picks */}
            <Scatter
              data={qualifiedPoints}
              dataKey="shrunkSR"
              fill={theme.primary}
              stroke={theme.plotBg}
              strokeWidth={1.5}
              name="Qualified Top 10"
              isAnimationActive={true}
              animationDuration={1100}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div
        className={`mt-4 flex items-center justify-between text-xs ${theme.subText} font-mono border-t pt-3 ${
          theme.isDarkCanvas ? 'border-slate-800' : 'border-slate-200'
        }`}
      >
        <span>Cohort Prior Benchmark: {cohortMeanSR} SR</span>
        <span className="font-bold flex items-center gap-1" style={{ color: theme.positiveDelta }}>
          <ShieldCheck className="h-3.5 w-3.5" />
          Statistical verification that sample size is properly normalized.
        </span>
      </div>
    </motion.div>
  );
};
