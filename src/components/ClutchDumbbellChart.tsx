import React, { useState } from 'react';
import { Camera, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { exportChartToPNG } from '../utils/chartExport';
import { useGraphTheme } from '../utils/chartThemes';
import { GraphThemePicker } from './GraphThemePicker';
import { PlayerAvatar } from './PlayerAvatar';

interface DumbbellPlayerItem {
  id: number;
  rank: number;
  name: string;
  team: string;
  baseline: number;
  pressure: number;
  delta: number;
  isPositive: boolean;
  unit: string;
}

interface ClutchDumbbellChartProps {
  title: string;
  subtitle?: string;
  items: DumbbellPlayerItem[];
  metricLabel: string;
  minScale?: number;
  maxScale?: number;
  isBowler?: boolean;
  onSelectPlayer?: (id: number) => void;
}

export const ClutchDumbbellChart: React.FC<ClutchDumbbellChartProps> = ({
  title,
  subtitle,
  items,
  metricLabel,
  minScale = 100,
  maxScale = 210,
  isBowler = false,
  onSelectPlayer,
}) => {
  const [downloading, setDownloading] = useState(false);
  const { theme } = useGraphTheme();
  const chartId = `clutch-dumbbell-${isBowler ? 'bowlers' : 'batters'}`;

  const handleExport = async () => {
    setDownloading(true);
    await exportChartToPNG(chartId, `${isBowler ? 'Bowlers' : 'Batters'}_Clutch_Dumbbell`);
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
              Clutch Elevation Differential
            </span>
            <span className={theme.mutedText}>·</span>
            <span className={theme.mutedText}>Top 10 Qualifiers</span>
            <span className={theme.mutedText}>·</span>
            <span className={theme.mutedText}>{theme.badge}</span>
          </div>
          <h3 className={`font-condensed text-2xl font-extrabold uppercase ${theme.titleText} mt-0.5`}>
            {title}
          </h3>
          <p className={`text-xs ${theme.subText} mt-0.5`}>{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <GraphThemePicker />

          {/* Legend */}
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className={`flex items-center gap-1.5 ${theme.subText}`}>
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: theme.baselineDot }}
              />
              Normal Baseline
            </span>
            <span className="flex items-center gap-1.5 font-bold" style={{ color: theme.primary }}>
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: theme.primary }}
              />
              High Pressure
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

      {/* SVG Canvas for High-DPI Dumbbell Export */}
      <div
        className="w-full overflow-x-auto rounded-xl p-2 transition-colors duration-300"
        style={{ backgroundColor: theme.plotBg }}
      >
        <svg
          viewBox={`0 0 900 ${items.length * 48 + 40}`}
          className="w-full min-w-[700px] h-auto font-sans"
        >
          {/* Axis Gridlines */}
          {[0, 25, 50, 75, 100].map((tickPct) => {
            const val = minScale + ((maxScale - minScale) * tickPct) / 100;
            const x = 240 + (tickPct / 100) * 520;
            return (
              <g key={tickPct}>
                <line
                  x1={x}
                  y1={15}
                  x2={x}
                  y2={items.length * 48 + 15}
                  stroke={theme.gridStroke}
                  strokeDasharray="3 3"
                />
                <text
                  x={x}
                  y={items.length * 48 + 32}
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
          {items.map((item, index) => {
            const y = 30 + index * 48;
            const xBase = 240 + (getPercent(item.baseline) / 100) * 520;
            const xPress = 240 + (getPercent(item.pressure) / 100) * 520;
            const strokeColor = item.isPositive ? theme.primary : theme.negativeDelta;

            return (
              <motion.g
                key={item.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.35 }}
                onClick={() => onSelectPlayer?.(item.id)}
                className="transition-opacity hover:opacity-85 cursor-pointer"
              >
                {/* Row Hover Track */}
                <rect
                  x={10}
                  y={y - 18}
                  width={880}
                  height={36}
                  rx={8}
                  fill={theme.isDarkCanvas ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.015)'}
                />

                {/* Player Rank, 36x36 Circular Portrait & Wordmark */}
                <text
                  x={16}
                  y={y + 4}
                  fill={item.rank <= 3 ? theme.accentGold : theme.primary}
                  fontSize="15"
                  fontWeight="bold"
                  fontFamily="Bebas Neue"
                >
                  #{item.rank}
                </text>

                <foreignObject x={44} y={y - 18} width={36} height={36}>
                  <div className="w-9 h-9 flex items-center justify-center">
                    <PlayerAvatar name={item.name} rank={item.rank} size="sm" />
                  </div>
                </foreignObject>

                <text
                  x={88}
                  y={y - 1}
                  fill={theme.isDarkCanvas ? '#F8FAFC' : '#0F172A'}
                  fontSize="13"
                  fontWeight="bold"
                  fontFamily="Plus Jakarta Sans"
                >
                  {item.name}
                </text>
                <text
                  x={88}
                  y={y + 13}
                  fill={theme.axisStroke}
                  fontSize="10"
                  fontFamily="Plus Jakarta Sans"
                >
                  {item.team}
                </text>

                {/* Animated Connecting Vector Bar */}
                <motion.line
                  x1={xBase}
                  y1={y}
                  initial={{ x2: xBase }}
                  animate={{ x2: xPress }}
                  transition={{ delay: index * 0.05 + 0.15, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                  y2={y}
                  stroke={strokeColor}
                  strokeWidth="4.5"
                  strokeLinecap="round"
                />

                {/* Baseline Dot */}
                <circle
                  cx={xBase}
                  cy={y}
                  r="5.5"
                  fill={theme.baselineDot}
                  stroke={theme.plotBg}
                  strokeWidth="2"
                />

                {/* Animated Pressure Dot */}
                <motion.circle
                  initial={{ cx: xBase, r: 3 }}
                  animate={{ cx: xPress, r: 7.5 }}
                  transition={{ delay: index * 0.05 + 0.2, duration: 0.65, type: 'spring', stiffness: 120 }}
                  cy={y}
                  fill={strokeColor}
                  stroke={theme.plotBg}
                  strokeWidth="2.5"
                />

                {/* Delta Text Label */}
                <text
                  x={Math.max(xBase, xPress) + 18}
                  y={y + 4}
                  fill={item.isPositive ? theme.positiveDelta : theme.negativeDelta}
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="JetBrains Mono"
                >
                  {item.isPositive ? '+' : ''}
                  {item.delta} {item.unit}
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
        <span>X-Axis: {metricLabel}</span>
        <span className="font-bold" style={{ color: theme.primary }}>
          Accent Dot = Clutch Performance under BPI &ge; 65
        </span>
      </div>
    </motion.div>
  );
};
