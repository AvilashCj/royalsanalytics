import React, { useState } from 'react';
import { Camera, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { BatterRating, BowlerRating } from '../types/cricket';
import { exportChartToPNG } from '../utils/chartExport';
import { useGraphTheme } from '../utils/chartThemes';
import { GraphThemePicker } from './GraphThemePicker';

interface CricketFieldTelemetryProps {
  player: BatterRating | BowlerRating;
  isBatter: boolean;
}

export const CricketFieldTelemetry: React.FC<CricketFieldTelemetryProps> = ({
  player,
  isBatter,
}) => {
  const [downloading, setDownloading] = useState(false);
  const { theme } = useGraphTheme();
  const chartId = `field-telemetry-${player.playerId}`;

  const handleExport = async () => {
    setDownloading(true);
    await exportChartToPNG(chartId, `${player.name.replace(/\s+/g, '_')}_Field_Telemetry`);
    setTimeout(() => setDownloading(false), 2000);
  };

  const batter = isBatter ? (player as BatterRating) : null;
  const bowler = !isBatter ? (player as BowlerRating) : null;

  const offSidePct = batter?.shotZoneSplits?.offSidePct ?? 52;
  const onSidePct = batter?.shotZoneSplits?.onSidePct ?? 48;
  const topStrokes = batter?.shotZoneSplits?.topStrokes ?? [
    { stroke: 'Cover Drive & Loft', runs: 68, count: 32, sr: 212 },
    { stroke: 'Pull & Slog Sweep', runs: 82, count: 36, sr: 228 },
    { stroke: 'Midwicket Flick', runs: 34, count: 28, sr: 121 },
    { stroke: 'Late Cut & Ramp', runs: 28, count: 18, sr: 155 },
  ];

  const overWicketPct = bowler?.deliveryTelemetry?.overWicketPct ?? 76;
  const aroundWicketPct = bowler?.deliveryTelemetry?.aroundWicketPct ?? 24;
  const topStyles = bowler?.deliveryTelemetry?.topStyles ?? [
    { style: 'Toe-Crushing Yorker', balls: 38, economy: 5.8, wickets: 6 },
    { style: 'Hard Length Slower Ball', balls: 32, economy: 6.9, wickets: 4 },
    { style: 'Back-of-Length Cutter', balls: 24, economy: 7.8, wickets: 3 },
    { style: 'Sharp Bouncer / Googly', balls: 16, economy: 8.2, wickets: 2 },
  ];

  // Wagon wheel animated shot rays
  const wagonVectors = [
    { x2: 65, y2: 75, color: theme.primary, width: 2.5 },
    { x2: 45, y2: 140, color: theme.primary, width: 3 },
    { x2: 75, y2: 225, color: theme.secondary, width: 2 },
    { x2: 130, y2: 40, color: theme.accentGold, width: 2 },
    { x2: 330, y2: 85, color: theme.secondary, width: 3 },
    { x2: 355, y2: 165, color: theme.primary, width: 2.5 },
    { x2: 315, y2: 245, color: theme.accentGold, width: 2.5 },
    { x2: 255, y2: 45, color: theme.secondary, width: 2 },
  ];

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
              Spatial Field &amp; Pitch Telemetry
            </span>
            <span className={theme.mutedText}>·</span>
            <span className={theme.mutedText}>Pressure Vectors</span>
            <span className={theme.mutedText}>·</span>
            <span className={theme.mutedText}>{theme.badge}</span>
          </div>
          <h3 className={`font-condensed text-2xl font-extrabold uppercase ${theme.titleText} mt-0.5`}>
            {isBatter ? 'Wagon-Wheel & Shot-Zone Execution' : '22-Yard Pitch-Map & Release Angles'}
          </h3>
          <p className={`text-xs ${theme.subText} mt-0.5`}>
            {isBatter
              ? 'Off-side vs. On-side scoring distribution, high-pressure stroke efficiency, and Pace vs. Spin strike rates.'
              : 'Over vs. Around the wicket delivery distribution, lethality across delivery variations, and release telemetry.'}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start xl:self-auto">
          <GraphThemePicker />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side: Custom Animated SVG Diagram */}
        <div
          className="flex flex-col items-center justify-center p-4 rounded-xl border transition-colors duration-300"
          style={{
            backgroundColor: theme.plotBg,
            borderColor: theme.gridStroke,
          }}
        >
          {isBatter ? (
            <svg viewBox="0 0 400 320" className="w-full max-w-[340px] h-auto">
              <defs>
                <linearGradient id="offsideGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={theme.primary} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={theme.primary} stopOpacity="0.04" />
                </linearGradient>
                <linearGradient id="onsideGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={theme.secondary} stopOpacity="0.04" />
                  <stop offset="100%" stopColor={theme.secondary} stopOpacity="0.28" />
                </linearGradient>
              </defs>

              {/* Boundary Oval */}
              <ellipse
                cx="200"
                cy="160"
                rx="180"
                ry="140"
                fill={theme.plotBg}
                stroke={theme.primary}
                strokeWidth="2.5"
              />

              {/* 30-Yard Inner Ring */}
              <ellipse
                cx="200"
                cy="160"
                rx="110"
                ry="85"
                fill="none"
                stroke={theme.axisStroke}
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />

              {/* Central Dividing Line */}
              <line
                x1="200"
                y1="20"
                x2="200"
                y2="300"
                stroke={theme.gridStroke}
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />

              {/* Off-Side & On-Side Sectors */}
              <path d="M 200 20 A 180 140 0 0 0 200 300 Z" fill="url(#offsideGrad)" />
              <path d="M 200 20 A 180 140 0 0 1 200 300 Z" fill="url(#onsideGrad)" />

              {/* Animated Wagon-Wheel Shot Rays */}
              {wagonVectors.map((vec, i) => (
                <motion.line
                  key={i}
                  x1={200}
                  y1={178}
                  initial={{ x2: 200, y2: 178, opacity: 0 }}
                  animate={{ x2: vec.x2, y2: vec.y2, opacity: 0.75 }}
                  transition={{ delay: i * 0.07 + 0.15, duration: 0.65, ease: 'easeOut' }}
                  stroke={vec.color}
                  strokeWidth={vec.width}
                  strokeLinecap="round"
                />
              ))}

              {/* Pitch Rectangle in center */}
              <rect
                x="194"
                y="130"
                width="12"
                height="60"
                rx="2"
                fill={theme.isDarkCanvas ? '#1E293B' : '#F1F5F9'}
                stroke={theme.axisStroke}
                strokeWidth="1.5"
              />

              {/* Off-Side Labels */}
              <text x="85" y="78" fill={theme.primary} fontSize="13" fontWeight="bold" fontFamily="Plus Jakarta Sans">
                OFF-SIDE
              </text>
              <text x="85" y="108" fill={theme.primary} fontSize="26" fontWeight="bold" fontFamily="Bebas Neue">
                {offSidePct}%
              </text>
              <text x="85" y="125" fill={theme.axisStroke} fontSize="10" fontFamily="JetBrains Mono">
                Covers / Point / Cut
              </text>

              {/* On-Side Labels */}
              <text x="235" y="78" fill={theme.secondary} fontSize="13" fontWeight="bold" fontFamily="Plus Jakarta Sans">
                ON-SIDE / LEG
              </text>
              <text x="235" y="108" fill={theme.secondary} fontSize="26" fontWeight="bold" fontFamily="Bebas Neue">
                {onSidePct}%
              </text>
              <text x="235" y="125" fill={theme.axisStroke} fontSize="10" fontFamily="JetBrains Mono">
                Midwicket / Pull
              </text>

              {/* Batter Stance Pulse */}
              <motion.circle
                cx="200"
                cy="178"
                r="6"
                fill={theme.accentGold}
                animate={{ scale: [1, 1.35, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </svg>
          ) : (
            <svg viewBox="0 0 380 320" className="w-full max-w-[320px] h-auto">
              {/* Pitch Outline */}
              <rect
                x="110"
                y="30"
                width="160"
                height="260"
                rx="6"
                fill={theme.isDarkCanvas ? '#111827' : '#F8FAFC'}
                stroke={theme.axisStroke}
                strokeWidth="2"
              />

              {/* Pitch Crease Lines */}
              <line x1="110" y1="70" x2="270" y2="70" stroke={theme.axisStroke} strokeWidth="2" />
              <line x1="110" y1="250" x2="270" y2="250" stroke={theme.axisStroke} strokeWidth="2" />

              {/* Stumps */}
              <circle cx="184" cy="65" r="2.5" fill={theme.accentGold} />
              <circle cx="190" cy="65" r="2.5" fill={theme.accentGold} />
              <circle cx="196" cy="65" r="2.5" fill={theme.accentGold} />

              <circle cx="184" cy="255" r="2.5" fill={theme.accentGold} />
              <circle cx="190" cy="255" r="2.5" fill={theme.accentGold} />
              <circle cx="196" cy="255" r="2.5" fill={theme.accentGold} />

              {/* Length Zones */}
              <rect x="112" y="72" width="156" height="40" fill={theme.primary} opacity="0.22" />
              <text
                x="190"
                y="96"
                fill={theme.primary}
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="JetBrains Mono"
              >
                Yorker / Blockhole (0–2m)
              </text>

              <rect x="112" y="114" width="156" height="55" fill={theme.positiveDelta} opacity="0.22" />
              <text
                x="190"
                y="145"
                fill={theme.positiveDelta}
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="JetBrains Mono"
              >
                Good Length Channel (4–6m)
              </text>

              <rect x="112" y="171" width="156" height="45" fill={theme.tertiary} opacity="0.22" />
              <text
                x="190"
                y="198"
                fill={theme.tertiary}
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="JetBrains Mono"
              >
                Hard / Bouncer (7–9m)
              </text>

              {/* Animated Release Trajectories */}
              <motion.path
                d="M 60 270 Q 140 240 186 70"
                fill="none"
                stroke={theme.primary}
                strokeWidth="3"
                strokeDasharray="6 3"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
              />
              <text x="45" y="295" fill={theme.primary} fontSize="11" fontWeight="bold" fontFamily="Plus Jakarta Sans">
                OVER ({overWicketPct}%)
              </text>

              <motion.path
                d="M 320 270 Q 240 240 194 70"
                fill="none"
                stroke={theme.secondary}
                strokeWidth="2.5"
                strokeDasharray="4 3"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.9, ease: 'easeOut' }}
              />
              <text x="270" y="295" fill={theme.secondary} fontSize="11" fontWeight="bold" fontFamily="Plus Jakarta Sans">
                AROUND ({aroundWicketPct}%)
              </text>
            </svg>
          )}
        </div>

        {/* Right Side: Detailed Telemetry Cards with Animated Progress Bars */}
        <div className="flex flex-col gap-4">
          <div
            className={`flex items-center justify-between pb-2 border-b ${
              theme.isDarkCanvas ? 'border-slate-800' : 'border-slate-200'
            }`}
          >
            <span className={`text-xs font-bold ${theme.titleText} uppercase tracking-tight`}>
              {isBatter ? 'Top Pressure Strokes Execution' : 'Lethal Delivery Style Under Heat'}
            </span>
            <span className="text-[11px] font-mono font-bold" style={{ color: theme.primary }}>
              BPI &ge; 65 Verified
            </span>
          </div>

          {/* Stroke / Delivery Style Breakdown */}
          <div className="flex flex-col gap-2.5">
            {isBatter
              ? topStrokes.map((s, idx) => {
                  const pct = Math.min(100, Math.round((s.sr / 240) * 100));
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.07 }}
                      className={`p-3 rounded-xl border flex flex-col gap-1.5 text-xs font-mono ${
                        theme.isDarkCanvas
                          ? 'border-slate-800 bg-slate-900/70'
                          : 'border-slate-200 bg-slate-50/70'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className={`font-bold ${theme.titleText} font-sans block`}>{s.stroke}</span>
                          <span className={`text-[10px] ${theme.subText} font-sans`}>{s.count} pressure balls faced</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold font-numeric block" style={{ color: theme.primary }}>
                            {s.sr} SR
                          </span>
                          <span className={`text-[10px] ${theme.subText} font-bold`}>{s.runs} runs scored</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-500/15 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: idx * 0.08 + 0.15, duration: 0.65 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: theme.primary }}
                        />
                      </div>
                    </motion.div>
                  );
                })
              : topStyles.map((s, idx) => {
                  const pct = Math.min(100, Math.max(20, Math.round(((12 - s.economy) / 8) * 100)));
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.07 }}
                      className={`p-3 rounded-xl border flex flex-col gap-1.5 text-xs font-mono ${
                        theme.isDarkCanvas
                          ? 'border-slate-800 bg-slate-900/70'
                          : 'border-slate-200 bg-slate-50/70'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className={`font-bold ${theme.titleText} font-sans block`}>{s.style}</span>
                          <span className={`text-[10px] ${theme.subText} font-sans`}>{s.balls} pressure balls bowled</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold font-numeric block" style={{ color: theme.positiveDelta }}>
                            {s.economy} Econ
                          </span>
                          <span className="text-[10px] font-bold" style={{ color: theme.primary }}>
                            {s.wickets} wickets taken
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-500/15 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: idx * 0.08 + 0.15, duration: 0.65 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: theme.positiveDelta }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
          </div>

          {/* Speed & Bowling Discipline Comparison */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div
              className={`p-3 rounded-xl border ${
                theme.isDarkCanvas ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'
              }`}
            >
              <span className={`text-[10px] ${theme.mutedText} font-bold uppercase block`}>
                {isBatter ? 'vs Pace (135+ kmph)' : 'Average Release Speed'}
              </span>
              <p className={`font-numeric text-2xl font-bold ${theme.titleText} mt-1`}>
                {isBatter
                  ? `${batter?.shotZoneSplits?.vsPaceSR || 188.4} SR`
                  : `${bowler?.deliveryTelemetry?.avgSpeed || 141.2} km/h`}
              </p>
              <span className={`text-[10px] ${theme.subText} block mt-0.5`}>High velocity match states</span>
            </div>

            <div
              className={`p-3 rounded-xl border ${
                theme.isDarkCanvas ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'
              }`}
            >
              <span className={`text-[10px] ${theme.mutedText} font-bold uppercase block`}>
                {isBatter ? 'vs Spin Disciplines' : 'Dot Ball Suppression'}
              </span>
              <p className="font-numeric text-2xl font-bold mt-1" style={{ color: theme.primary }}>
                {isBatter
                  ? `${batter?.shotZoneSplits?.vsSpinSR || 164.8} SR`
                  : `${bowler?.pressureDotPct || 46.8}%`}
              </p>
              <span className={`text-[10px] ${theme.subText} block mt-0.5`}>Under extreme heat</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
