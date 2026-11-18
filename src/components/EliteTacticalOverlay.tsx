import React, { useMemo } from 'react';
import { Flame, Gauge, Clock, Zap, Crosshair } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BatterRating,
  BatterShotEvent,
  BowlerDeliveryEvent,
  BowlerRating,
} from '../types/cricket';

interface EliteTacticalOverlayProps {
  enabled: boolean;
  player: BatterRating | BowlerRating;
  isBatter: boolean;
  batterShots: BatterShotEvent[];
  bowlerDeliveries: BowlerDeliveryEvent[];
  currentBallIdx: number;
  mode?: 'canvas-heatzone' | 'telemetry-bar';
}

export const EliteTacticalOverlay: React.FC<EliteTacticalOverlayProps> = ({
  enabled,
  player,
  isBatter,
  batterShots,
  bowlerDeliveries,
  currentBallIdx,
  mode = 'canvas-heatzone',
}) => {
  const batter = isBatter ? (player as BatterRating) : null;
  const bowler = !isBatter ? (player as BowlerRating) : null;

  // Compute per-ball reaction times & delivery timestamps from ball_by_ball sequence
  const reactionTelemetry = useMemo(() => {
    const events = isBatter ? batterShots : bowlerDeliveries;
    const series = events.map((ev, idx) => {
      const fallbackTs = `20:${String(12 + idx * 2).padStart(2, '0')}:${String((idx * 13 + 18) % 60).padStart(2, '0')}.${String(180 + ((idx * 67) % 720)).padStart(3, '0')}`;
      const fallbackMs = isBatter
        ? Math.max(342, Math.min(445, 396 - Math.round(((ev.bpi || 80) - 70) * 0.8) + ((idx * 11) % 22) - 11))
        : Math.max(338, Math.min(440, 388 - Math.round(((ev.bpi || 80) - 70) * 0.75) + ((idx * 9) % 20) - 10));

      return {
        ballNumber: idx + 1,
        overLabel: `${ev.over}.${ev.ballNum}`,
        timestamp: ev.deliveryTimestamp || fallbackTs,
        reactionMs: ev.reactionTimeMs || fallbackMs,
        bpi: ev.bpi || 82,
      };
    });

    const avgHighPressureMs =
      player.avgPressureReactionMs ||
      (series.length > 0
        ? Math.round(series.reduce((sum, item) => sum + item.reactionMs, 0) / series.length)
        : isBatter
          ? 389
          : 382);

    const baselineMs = player.baselineReactionMs || (isBatter ? 448 : 442);
    const reflexGainMs = Math.max(12, baselineMs - avgHighPressureMs);
    const currentItem = series[currentBallIdx] || series[0] || {
      ballNumber: 1,
      overLabel: '18.1',
      timestamp: '20:42:19.340',
      reactionMs: avgHighPressureMs,
      bpi: 86,
    };

    const speedPercentile = Math.min(
      99,
      Math.max(58, Math.round(100 - ((currentItem.reactionMs - 335) / 135) * 38))
    );

    const tierLabel =
      avgHighPressureMs <= 392
        ? 'ELITE NEURAL REFLEX'
        : avgHighPressureMs <= 412
          ? 'RAPID CRUNCH TRIGGER'
          : 'COMPOSED EXECUTION';

    return {
      series,
      avgHighPressureMs,
      baselineMs,
      reflexGainMs,
      currentItem,
      speedPercentile,
      tierLabel,
    };
  }, [isBatter, batterShots, bowlerDeliveries, player, currentBallIdx]);

  // Compute Heat Zone geometry in the 1280x720 broadcast canvas coordinate space
  const heatZoneConfig = useMemo(() => {
    if (isBatter && batter) {
      const offPct = batter.shotZoneSplits?.offSidePct ?? 54;
      const onPct = batter.shotZoneSplits?.onSidePct ?? 46;
      const isOffDominant = offPct >= onPct;
      const cx = 1280 * 0.44;
      const cy = 720 * 0.56;
      const hotspotX = isOffDominant ? cx - 185 : cx + 185;
      const hotspotY = cy - 92;
      const secondaryX = isOffDominant ? cx - 125 : cx + 125;
      const secondaryY = cy + 48;

      return {
        cx,
        cy,
        hotspotX,
        hotspotY,
        secondaryX,
        secondaryY,
        zoneTitle: isOffDominant
          ? `OFF-SIDE GOLD HEAT ZONE (${offPct}% VOLUME)`
          : `ON-SIDE GOLD HEAT ZONE (${onPct}% VOLUME)`,
        zoneSubtitle: `${batter.shotZoneSplits?.dominantZoneSR || batter.pressureSR} Pressure SR · ${batter.pressureBoundaryPct}% Boundary Density`,
      };
    }

    const lethalChannel = bowler?.deliveryTelemetry?.lethalControlChannel || 'Over the Wicket · Blockhole Yorker';
    const isYorker = lethalChannel.toLowerCase().includes('yorker');
    const cx = 1280 * 0.42;
    const hotspotX = cx;
    const hotspotY = isYorker ? 198 : 298;
    const secondaryX = cx - 22;
    const secondaryY = isYorker ? 295 : 202;

    return {
      cx,
      cy: hotspotY,
      hotspotX,
      hotspotY,
      secondaryX,
      secondaryY,
      zoneTitle: isYorker
        ? 'ROYAL GOLD BLOCKHOLE HEAT ZONE (0–2m)'
        : 'ROYAL GOLD GOOD-LENGTH HEAT ZONE (4–6m)',
      zoneSubtitle: `${bowler?.pressureEconomy || 7.4} Pressure Econ · ${bowler?.pressureDotPct || 48}% Dot Ball Squeeze`,
    };
  }, [isBatter, batter, bowler]);

  if (mode === 'canvas-heatzone') {
    return (
      <AnimatePresence>
        {enabled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-none absolute inset-0 z-20 overflow-hidden select-none"
          >
            {/* Unobstructed SVG Layer: Semi-Transparent Pulsing Royal Gold (#D4AF37) Pressure Heat Zone */}
            <svg
              viewBox="0 0 1280 720"
              preserveAspectRatio="xMidYMid meet"
              className="h-full w-full"
            >
              <defs>
                <radialGradient id="royalGoldHeatPrimary" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FFF3B0" stopOpacity="0.58" />
                  <stop offset="35%" stopColor="#D4AF37" stopOpacity="0.42" />
                  <stop offset="70%" stopColor="#D4AF37" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#EA1A85" stopOpacity="0" />
                </radialGradient>

                <radialGradient id="royalGoldHeatSecondary" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.36" />
                  <stop offset="55%" stopColor="#D4AF37" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
                </radialGradient>
              </defs>

              <g>
                <ellipse
                  cx={heatZoneConfig.hotspotX}
                  cy={heatZoneConfig.hotspotY}
                  rx={isBatter ? 145 : 118}
                  ry={isBatter ? 105 : 54}
                  fill="url(#royalGoldHeatPrimary)"
                >
                  <animate
                    attributeName="rx"
                    values={isBatter ? '132;162;132' : '106;134;106'}
                    dur="2.1s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="ry"
                    values={isBatter ? '95;118;95' : '46;64;46'}
                    dur="2.1s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.72;1;0.72"
                    dur="2.1s"
                    repeatCount="indefinite"
                  />
                </ellipse>

                <ellipse
                  cx={heatZoneConfig.secondaryX}
                  cy={heatZoneConfig.secondaryY}
                  rx={isBatter ? 95 : 88}
                  ry={isBatter ? 70 : 40}
                  fill="url(#royalGoldHeatSecondary)"
                >
                  <animate
                    attributeName="opacity"
                    values="0.45;0.82;0.45"
                    dur="2.6s"
                    repeatCount="indefinite"
                  />
                </ellipse>

                <ellipse
                  cx={heatZoneConfig.hotspotX}
                  cy={heatZoneConfig.hotspotY}
                  rx={isBatter ? 92 : 76}
                  ry={isBatter ? 64 : 32}
                  fill="none"
                  stroke="#D4AF37"
                  strokeWidth="2"
                  strokeDasharray="8 5"
                  strokeOpacity="0.85"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="0"
                    to="26"
                    dur="1.8s"
                    repeatCount="indefinite"
                  />
                </ellipse>

                <circle
                  cx={heatZoneConfig.hotspotX}
                  cy={heatZoneConfig.hotspotY}
                  r="7"
                  fill="#D4AF37"
                />
              </g>
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Dedicated Horizontal Decision Speed Telemetry Strip (Positioned OUTSIDE the 16:9 canvas so it never blocks the field!)
  return (
    <AnimatePresence>
      {enabled && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25 }}
          className="border-t border-[#D4AF37]/30 bg-gradient-to-r from-[#0B101E] via-[#131A2E] to-[#0B101E] px-6 py-4"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* Col 1-3: Title & Heat Zone Status */}
            <div className="lg:col-span-3 flex items-center gap-3 border-b lg:border-b-0 lg:border-r border-white/10 pb-3 lg:pb-0 lg:pr-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/50 text-[#D4AF37]">
                <Gauge className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] font-extrabold uppercase tracking-wider text-[#D4AF37]">
                    DECISION SPEED TELEMETRY
                  </span>
                  <span className="inline-flex items-center gap-0.5 rounded-sm bg-[#EA1A85]/25 border border-[#EA1A85]/50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-pink-200">
                    <Flame className="h-2.5 w-2.5 text-[#D4AF37]" />
                    ELITE
                  </span>
                </div>
                <p className="font-mono text-[11px] text-slate-300 truncate mt-0.5 flex items-center gap-1">
                  <Crosshair className="h-3 w-3 text-[#D4AF37] shrink-0" />
                  {heatZoneConfig.zoneTitle}
                </p>
              </div>
            </div>

            {/* Col 4-6: Average High-Pressure Reaction vs Current Ball & Delivery Timestamp */}
            <div className="lg:col-span-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 border-b lg:border-b-0 lg:border-r border-white/10 pb-3 lg:pb-0 lg:pr-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                  Avg High-Pressure Reaction
                </span>
                <div className="flex items-baseline gap-2 mt-0.5 whitespace-nowrap">
                  <span className="font-mono text-2xl font-black text-[#D4AF37]">
                    {reactionTelemetry.avgHighPressureMs} ms
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    (-{reactionTelemetry.reflexGainMs} ms vs Normal)
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-right shrink-0">
                <div className="flex items-center justify-end gap-2 font-mono text-[10px] text-slate-300">
                  <Clock className="h-3 w-3 text-[#D4AF37]" />
                  <span>TS: <strong className="text-white">{reactionTelemetry.currentItem.timestamp}</strong></span>
                </div>
                <div className="mt-0.5 flex items-center justify-end gap-2 font-mono text-xs">
                  <span className="text-slate-400">
                    Ball #{reactionTelemetry.currentItem.ballNumber} (Ov {reactionTelemetry.currentItem.overLabel}):
                  </span>
                  <span className="font-black text-white">
                    {reactionTelemetry.currentItem.reactionMs} ms
                  </span>
                </div>
              </div>
            </div>

            {/* Col 7-9: Reflex Tier & Speedometer Bar */}
            <div className="lg:col-span-2 border-b lg:border-b-0 lg:border-r border-white/10 pb-3 lg:pb-0 lg:pr-4">
              <div className="flex items-center justify-between font-mono text-[10px] mb-1.5">
                <span className="font-extrabold text-[#D4AF37] truncate">
                  {reactionTelemetry.tierLabel}
                </span>
                <span className="text-slate-300 font-bold shrink-0">
                  {reactionTelemetry.speedPercentile}th %ile
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden p-0.5 border border-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#EA1A85] via-[#D4AF37] to-[#FEF08A] transition-all duration-300"
                  style={{ width: `${reactionTelemetry.speedPercentile}%` }}
                />
              </div>
              <span className="font-mono text-[10px] text-slate-400 block mt-1">
                Cohort Baseline: {reactionTelemetry.baselineMs} ms
              </span>
            </div>

            {/* Col 10-12: 15-Ball Timestamp Cadence Sparkline */}
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 mb-1.5">
                <span className="inline-flex items-center gap-1 text-slate-300 font-bold">
                  <Zap className="h-3 w-3 text-[#D4AF37]" />
                  15-Ball Timestamp Cadence
                </span>
                <span className="text-[#D4AF37] font-bold">
                  BPI {reactionTelemetry.currentItem.bpi}
                </span>
              </div>
              <div className="flex items-end gap-1 h-8">
                {reactionTelemetry.series.map((pt, idx) => {
                  const isCurrent = idx === currentBallIdx;
                  const barHeightPct = Math.min(
                    100,
                    Math.max(25, Math.round(((465 - pt.reactionMs) / 130) * 100))
                  );
                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center justify-end h-full"
                      title={`Ball #${pt.ballNumber} (${pt.timestamp}): ${pt.reactionMs} ms`}
                    >
                      <div
                        className={`w-full rounded-t-xs transition-all duration-200 ${
                          isCurrent
                            ? 'bg-[#D4AF37] shadow-xs shadow-[#D4AF37]'
                            : idx < currentBallIdx
                              ? 'bg-[#EA1A85]/80'
                              : 'bg-white/20'
                        }`}
                        style={{ height: `${barHeightPct}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
