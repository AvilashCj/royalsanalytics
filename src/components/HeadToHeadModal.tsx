import React, { useState } from 'react';
import { X, Camera, Check, Scale } from 'lucide-react';
import { motion } from 'motion/react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { BatterRating, BowlerRating } from '../types/cricket';
import { exportChartToPNG } from '../utils/chartExport';
import { useGraphTheme } from '../utils/chartThemes';
import { GraphThemePicker } from './GraphThemePicker';

interface HeadToHeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  allBatters: BatterRating[];
  allBowlers: BowlerRating[];
  initialPlayerIds?: number[];
  type?: 'batter' | 'bowler';
}

export const HeadToHeadModal: React.FC<HeadToHeadModalProps> = ({
  isOpen,
  onClose,
  allBatters,
  allBowlers,
  initialPlayerIds = [],
  type = 'batter',
}) => {
  const [playerType, setPlayerType] = useState<'batter' | 'bowler'>(type);
  const [downloading, setDownloading] = useState(false);
  const { theme } = useGraphTheme();

  const playerPool = playerType === 'batter' ? allBatters : allBowlers;

  // Selected player IDs (2 to 3 players)
  const [selectedIds, setSelectedIds] = useState<number[]>(() => {
    if (initialPlayerIds.length >= 2) return initialPlayerIds.slice(0, 3);
    return playerPool.slice(0, 2).map((p) => p.playerId);
  });

  if (!isOpen) return null;

  const handleExport = async () => {
    setDownloading(true);
    await exportChartToPNG('radar-h2h-container', 'RR_Head_to_Head_Comparison_Radar');
    setTimeout(() => setDownloading(false), 2000);
  };

  const selectedPlayers = selectedIds
    .map((id) => playerPool.find((p) => p.playerId === id))
    .filter(Boolean) as (BatterRating | BowlerRating)[];

  // Dynamic theme colors for up to 3 players
  const playerColors = [theme.primary, theme.secondary, theme.tertiary];

  // 6-Axis Radar Data Construction
  const radarAxes = [
    'Pressure Delta',
    'Death Execution',
    'Collapse Recovery',
    'Dot-Ball Control',
    'Match Consistency',
    'Knockout Impact',
  ];

  const radarData = radarAxes.map((axis) => {
    const row: any = { axis };

    selectedPlayers.forEach((p) => {
      const isB = 'battingType' in p;
      const b = isB ? (p as BatterRating) : null;
      const bw = !isB ? (p as BowlerRating) : null;

      let score = 70;
      if (axis === 'Pressure Delta') {
        score = isB && b
          ? Math.min(100, Math.max(30, Math.round(50 + b.srDelta * 2.2)))
          : Math.min(100, Math.max(30, Math.round(50 + (bw?.economyDelta || 0) * 20)));
      } else if (axis === 'Death Execution') {
        score = isB && b
          ? Math.min(100, Math.max(30, Math.round((b.phaseSplits.death.sr / 220) * 100)))
          : Math.min(100, Math.max(30, Math.round((14 - (bw?.phaseSplits.death.econ || 9.5)) * 12)));
      } else if (axis === 'Collapse Recovery') {
        score = Math.min(98, Math.max(40, p.reliabilityScore));
      } else if (axis === 'Dot-Ball Control') {
        score = isB && b
          ? Math.round(b.pressureDotAvoidancePct)
          : Math.round((bw?.pressureDotPct || 40) * 1.8);
      } else if (axis === 'Match Consistency') {
        score = p.consistencyScore;
      } else if (axis === 'Knockout Impact') {
        score = Math.min(98, Math.max(45, Math.round(p.reliabilityScore * 1.04)));
      }

      row[p.name] = score;
    });

    return row;
  });

  const togglePlayer = (id: number) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 2) {
        setSelectedIds(selectedIds.filter((pId) => pId !== id));
      }
    } else {
      if (selectedIds.length < 3) {
        setSelectedIds([...selectedIds, id]);
      } else {
        setSelectedIds([selectedIds[0], selectedIds[1], id]);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={`relative w-full max-w-4xl rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-6 md:p-8 shadow-2xl my-8 transition-colors duration-300`}
      >
        {/* Top Header */}
        <div
          className={`flex flex-wrap items-center justify-between gap-3 pb-4 border-b ${
            theme.isDarkCanvas ? 'border-slate-800' : 'border-pink-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${theme.primary}20`, color: theme.primary }}
            >
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: theme.primary }}>
                <span>War-Room Tactical Matchup</span>
                <span>·</span>
                <span>6-Axis Radar Engine</span>
              </div>
              <h2 className={`font-condensed text-2xl font-extrabold uppercase ${theme.titleText}`}>
                Head-to-Head Pressure Performance Compare
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2" data-no-export>
            <GraphThemePicker />
            <button
              type="button"
              onClick={handleExport}
              title="Download comparison PNG"
              className={`flex items-center gap-1.5 rounded-xl border p-2 text-xs font-bold transition-colors cursor-pointer ${
                theme.isDarkCanvas
                  ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                  : 'border-pink-200 bg-pink-50 text-slate-700 hover:bg-pink-100'
              }`}
            >
              {downloading ? <Check className="h-4 w-4 text-emerald-500" /> : <Camera className="h-4 w-4" style={{ color: theme.primary }} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`rounded-xl border p-2 transition-colors cursor-pointer ${
                theme.isDarkCanvas
                  ? 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'
                  : 'border-pink-100 text-slate-400 hover:bg-pink-50 hover:text-slate-900'
              }`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Player Selector Controls */}
        <div
          className={`flex flex-wrap items-center justify-between gap-3 my-4 p-3 rounded-xl border ${
            theme.isDarkCanvas ? 'bg-slate-900/70 border-slate-800' : 'bg-pink-50/50 border-pink-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${theme.subText} uppercase`}>Discipline:</span>
            <div
              className={`flex items-center gap-1 rounded-lg p-1 border ${
                theme.isDarkCanvas ? 'bg-slate-800 border-slate-700' : 'bg-white border-pink-200'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setPlayerType('batter');
                  setSelectedIds(allBatters.slice(0, 2).map((p) => p.playerId));
                }}
                className={`rounded px-2.5 py-0.5 text-xs font-bold transition-colors cursor-pointer ${
                  playerType === 'batter' ? 'text-white' : theme.subText
                }`}
                style={playerType === 'batter' ? { backgroundColor: theme.primary } : undefined}
              >
                Batters
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlayerType('bowler');
                  setSelectedIds(allBowlers.slice(0, 2).map((p) => p.playerId));
                }}
                className={`rounded px-2.5 py-0.5 text-xs font-bold transition-colors cursor-pointer ${
                  playerType === 'bowler' ? 'text-white' : theme.subText
                }`}
                style={playerType === 'bowler' ? { backgroundColor: theme.primary } : undefined}
              >
                Bowlers
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium">
            <span className={`${theme.mutedText} text-[11px] whitespace-nowrap`}>Select 2–3:</span>
            {playerPool.slice(0, 8).map((p) => {
              const isSelected = selectedIds.includes(p.playerId);
              const colorIdx = selectedIds.indexOf(p.playerId);
              return (
                <button
                  key={p.playerId}
                  type="button"
                  onClick={() => togglePlayer(p.playerId)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                    isSelected
                      ? 'border-transparent text-white shadow-xs'
                      : theme.isDarkCanvas
                      ? 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500'
                      : 'border-pink-200 bg-white text-slate-700 hover:border-pink-400'
                  }`}
                  style={isSelected ? { backgroundColor: playerColors[colorIdx] } : {}}
                >
                  #{p.unstopRank} {p.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Radar Chart Display Area */}
        <div id="radar-h2h-container" className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div
            className="h-80 w-full flex items-center justify-center rounded-xl p-2 transition-colors duration-300"
            style={{ backgroundColor: theme.plotBg }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke={theme.gridStroke} />
                <PolarAngleAxis
                  dataKey="axis"
                  stroke={theme.axisStroke}
                  fontSize={11}
                  tickLine={false}
                  fontFamily="Plus Jakarta Sans"
                />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke={theme.gridStroke} fontSize={10} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div
                          className={`rounded-xl border ${theme.tooltipBorder} ${theme.tooltipBg} ${theme.tooltipText} p-3 shadow-xl text-xs font-mono`}
                        >
                          <p className="font-bold font-sans pb-1 border-b border-slate-500/20">
                            {payload[0].payload.axis}
                          </p>
                          {payload.map((entry, idx) => (
                            <div key={idx} className="flex justify-between gap-4 mt-1">
                              <span style={{ color: entry.color }} className="font-sans font-bold">
                                {entry.name}:
                              </span>
                              <span className="font-bold">{entry.value}/100</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {selectedPlayers.map((p, idx) => (
                  <Radar
                    key={p.playerId}
                    name={p.name}
                    dataKey={p.name}
                    stroke={playerColors[idx]}
                    fill={playerColors[idx]}
                    fillOpacity={0.28}
                    strokeWidth={2.5}
                    isAnimationActive={true}
                    animationDuration={850}
                  />
                ))}
                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'Plus Jakarta Sans', fontWeight: 'bold' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Side Comparison Stat Cards */}
          <div className="flex flex-col gap-3">
            {selectedPlayers.map((p, idx) => {
              const isB = 'battingType' in p;
              const b = isB ? (p as BatterRating) : null;
              const bw = !isB ? (p as BowlerRating) : null;

              return (
                <motion.div
                  key={p.playerId}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className={`p-4 rounded-xl border shadow-xs flex flex-col gap-2 ${
                    theme.isDarkCanvas ? 'bg-slate-900/80' : 'bg-white'
                  }`}
                  style={{ borderColor: playerColors[idx] }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`font-condensed text-xl font-bold uppercase ${theme.titleText}`}>
                        #{p.unstopRank} {p.name}
                      </span>
                      <p className={`text-xs ${theme.subText} font-medium`}>
                        {p.teamName} · {isB ? b?.role : bw?.bowlingType}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className="font-numeric text-3xl font-bold"
                        style={{ color: playerColors[idx] }}
                      >
                        {p.reliabilityScore}
                      </span>
                      <span className={`text-[10px] ${theme.mutedText} block font-mono`}>Reliability</span>
                    </div>
                  </div>

                  <div
                    className={`grid grid-cols-3 gap-2 border-t pt-2 text-xs font-mono ${
                      theme.isDarkCanvas ? 'border-slate-800' : 'border-pink-100'
                    }`}
                  >
                    <div>
                      <span className={`text-[10px] ${theme.mutedText} font-sans block`}>
                        {isB ? 'Pressure SR' : 'Pressure Econ'}
                      </span>
                      <span className={`font-bold ${theme.titleText}`}>
                        {isB ? b?.pressureSR : bw?.pressureEconomy}
                      </span>
                    </div>
                    <div>
                      <span className={`text-[10px] ${theme.mutedText} font-sans block`}>Delta</span>
                      <span className="font-bold" style={{ color: theme.positiveDelta }}>
                        {isB ? `+${b?.srDelta}` : `+${bw?.economyDelta}`}
                      </span>
                    </div>
                    <div>
                      <span className={`text-[10px] ${theme.mutedText} font-sans block`}>Consistency</span>
                      <span className={`font-bold ${theme.titleText}`}>{p.consistencyScore}/100</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
