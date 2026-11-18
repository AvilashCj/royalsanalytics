import React, { useState } from 'react';
import { Camera, Check, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { DistributionBoxPlotStats } from '../types/cricket';
import { exportChartToPNG } from '../utils/chartExport';
import { useGraphTheme } from '../utils/chartThemes';
import { GraphThemePicker } from './GraphThemePicker';

interface ConsistencyStripPlotProps {
  data: DistributionBoxPlotStats[];
  metricLabel: string;
  minScale?: number;
  maxScale?: number;
  isBowler?: boolean;
}

export const ConsistencyStripPlot: React.FC<ConsistencyStripPlotProps> = ({
  data,
  metricLabel,
  minScale = 80,
  maxScale = 260,
  isBowler = false,
}) => {
  const [downloading, setDownloading] = useState(false);
  const { theme } = useGraphTheme();
  const chartId = `consistency-boxplot-${isBowler ? 'bowlers' : 'batters'}`;

  const handleExport = async () => {
    setDownloading(true);
    await exportChartToPNG(chartId, `${isBowler ? 'Bowlers' : 'Batters'}_Match_Consistency_Distribution`);
    setTimeout(() => setDownloading(false), 2000);
  };

  const getPercent = (val: number) => {
    return Math.max(0, Math.min(100, ((val - minScale) / (maxScale - minScale)) * 100));
  };

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
              Rubric Section 5: Reliability &amp; Match Consistency
            </span>
            <span className={theme.mutedText}>·</span>
            <span className={theme.mutedText}>Innings-by-Innings Spread</span>
            <span className={theme.mutedText}>·</span>
            <span className={theme.mutedText}>{theme.badge}</span>
          </div>
          <h3 className={`font-condensed text-2xl font-extrabold uppercase ${theme.titleText} mt-0.5`}>
            Pressure Consistency Strip &amp; Interquartile Range (IQR) Plot
          </h3>
          <p className={`text-xs ${theme.subText} mt-0.5`}>
            Individual high-pressure appearances plotted alongside Median and 25th–75th percentile box band—proving repeated execution without outlier dependency.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <GraphThemePicker />

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className={`flex items-center gap-1.5 ${theme.subText}`}>
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: theme.secondary }}
              />
              Innings Performance
            </span>
            <span className="flex items-center gap-1.5 font-bold" style={{ color: theme.primary }}>
              <span
                className="w-3 h-2 rounded-xs border"
                style={{
                  backgroundColor: `${theme.primary}25`,
                  borderColor: theme.primary,
                }}
              />
              IQR (25th–75th)
            </span>
            <span className={`flex items-center gap-1.5 font-bold ${theme.titleText}`}>
              <span
                className="w-1 h-3"
                style={{ backgroundColor: theme.accentGold }}
              />
              Median
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

      {/* SVG Canvas for High-DPI Strip & Box Plot */}
      <div
        className="w-full overflow-x-auto rounded-xl p-2 transition-colors duration-300"
        style={{ backgroundColor: theme.plotBg }}
      >
        <svg
          viewBox={`0 0 920 ${data.length * 48 + 45}`}
          className="w-full min-w-[720px] h-auto font-sans"
        >
          {/* Axis Ticks */}
          {[0, 20, 40, 60, 80, 100].map((tickPct) => {
            const val = minScale + ((maxScale - minScale) * tickPct) / 100;
            const x = 240 + (tickPct / 100) * 540;
            return (
              <g key={tickPct}>
                <line
                  x1={x}
                  y1={15}
                  x2={x}
                  y2={data.length * 48 + 15}
                  stroke={theme.gridStroke}
                  strokeDasharray="3 3"
                />
                <text
                  x={x}
                  y={data.length * 48 + 32}
                  fill={theme.axisStroke}
                  fontSize="11"
                  textAnchor="middle"
                  fontFamily="JetBrains Mono"
                >
                  {isBowler ? val.toFixed(1) : Math.round(val)}
                </text>
              </g>
            );
          })}

          {/* Rows */}
          {data.map((item, index) => {
            const y = 30 + index * 48;
            const xQ1 = 240 + (getPercent(item.q1) / 100) * 540;
            const xQ3 = 240 + (getPercent(item.q3) / 100) * 540;
            const xMed = 240 + (getPercent(item.median) / 100) * 540;
            const xMin = 240 + (getPercent(item.min) / 100) * 540;
            const xMax = 240 + (getPercent(item.max) / 100) * 540;

            const boxWidth = Math.max(8, xQ3 - xQ1);

            return (
              <motion.g
                key={item.playerId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.35 }}
              >
                {/* Player Labels */}
                <text
                  x={20}
                  y={y + 4}
                  fill={item.rank <= 3 ? theme.accentGold : theme.primary}
                  fontSize="14"
                  fontWeight="bold"
                  fontFamily="Bebas Neue"
                >
                  #{item.rank}
                </text>
                <text
                  x={50}
                  y={y - 1}
                  fill={theme.isDarkCanvas ? '#F8FAFC' : '#0F172A'}
                  fontSize="13"
                  fontWeight="bold"
                  fontFamily="Plus Jakarta Sans"
                >
                  {item.name}
                </text>
                <text
                  x={50}
                  y={y + 13}
                  fill={theme.axisStroke}
                  fontSize="10"
                  fontFamily="Plus Jakarta Sans"
                >
                  {item.team}
                </text>

                {/* Whiskers (Min to Max) */}
                <motion.line
                  x1={xMin}
                  y1={y}
                  initial={{ x2: xMin }}
                  animate={{ x2: xMax }}
                  transition={{ delay: index * 0.05 + 0.1, duration: 0.5 }}
                  y2={y}
                  stroke={theme.axisStroke}
                  strokeWidth="1.5"
                />
                <line
                  x1={xMin}
                  y1={y - 5}
                  x2={xMin}
                  y2={y + 5}
                  stroke={theme.axisStroke}
                  strokeWidth="1.5"
                />
                <line
                  x1={xMax}
                  y1={y - 5}
                  x2={xMax}
                  y2={y + 5}
                  stroke={theme.axisStroke}
                  strokeWidth="1.5"
                />

                {/* Animated IQR Box Band */}
                <motion.rect
                  x={xQ1}
                  y={y - 10}
                  initial={{ width: 0 }}
                  animate={{ width: boxWidth }}
                  transition={{ delay: index * 0.05 + 0.15, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  height="20"
                  rx="4"
                  fill={`${theme.primary}25`}
                  stroke={theme.primary}
                  strokeWidth="1.5"
                />

                {/* Median Line */}
                <line
                  x1={xMed}
                  y1={y - 12}
                  x2={xMed}
                  y2={y + 12}
                  stroke={theme.accentGold}
                  strokeWidth="3"
                />

                {/* Individual Match Jitter Points */}
                {item.values.map((val, dotIdx) => {
                  const xDot = 240 + (getPercent(val) / 100) * 540;
                  const jitterY = y + ((dotIdx % 5) - 2) * 3;
                  return (
                    <motion.circle
                      key={dotIdx}
                      cx={xDot}
                      cy={jitterY}
                      initial={{ r: 0, opacity: 0 }}
                      animate={{ r: 3.8, opacity: 0.7 }}
                      transition={{ delay: index * 0.04 + dotIdx * 0.02 + 0.2, duration: 0.3 }}
                      fill={theme.secondary}
                      stroke={theme.plotBg}
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Median Value Text Badge */}
                <text
                  x={820}
                  y={y + 4}
                  fill={theme.isDarkCanvas ? '#F8FAFC' : '#0F172A'}
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="JetBrains Mono"
                >
                  Med: {item.median}
                </text>
              </motion.g>
            );
          })}
        </svg>
      </div>

      <div
        className={`mt-4 flex items-center justify-between text-xs ${theme.subText} font-mono border-t pt-3 ${
          theme.isDarkCanvas ? 'border-slate-800' : 'border-slate-200'
        }`}
      >
        <span>Horizontal Axis: {metricLabel}</span>
        <span className="font-bold flex items-center gap-1" style={{ color: theme.positiveDelta }}>
          <ShieldCheck className="h-3.5 w-3.5" />
          Tighter IQR boxes indicate sustained match-to-match reliability.
        </span>
      </div>
    </motion.div>
  );
};
