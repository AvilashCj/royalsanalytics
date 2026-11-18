import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Video,
  Repeat,
  CheckCircle2,
  FastForward,
  Radio,
  Tv,
  Crosshair,
  Zap,
  Layers,
} from 'lucide-react';
import {
  BatterRating,
  BatterShotEvent,
  BowlerDeliveryEvent,
  BowlerRating,
} from '../types/cricket';
import { EliteTacticalOverlay } from './EliteTacticalOverlay';

interface TacticalStrengthVideoPlayerProps {
  player: BatterRating | BowlerRating;
  isBatter: boolean;
  allBatters: BatterRating[];
  allBowlers: BowlerRating[];
  onSelectPlayer: (playerId: number, type: 'batter' | 'bowler') => void;
  autoPlayTrigger?: number;
}

export const TacticalStrengthVideoPlayer: React.FC<TacticalStrengthVideoPlayerProps> = ({
  player,
  isBatter,
  allBatters,
  allBowlers,
  onSelectPlayer,
  autoPlayTrigger = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2>(1);
  const [autoCycleTop10, setAutoCycleTop10] = useState<boolean>(false);
  const [showEliteOverlay, setShowEliteOverlay] = useState<boolean>(true);
  const [currentBallIdx, setCurrentBallIdx] = useState<number>(0);
  const [ballProgress, setBallProgress] = useState<number>(0); // 0.0 -> 1.0 within current ball
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedComplete, setRecordedComplete] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const batter = isBatter ? (player as BatterRating) : null;
  const bowler = !isBatter ? (player as BowlerRating) : null;

  // Build deterministic fallback 15 high-pressure events if dataset has fewer than 15
  const batterShots: BatterShotEvent[] = useMemo(() => {
    if (!isBatter || !batter) return [];
    if (batter.topPressureShots && batter.topPressureShots.length >= 6) {
      return batter.topPressureShots.slice(0, 15);
    }
    const offFavored = (batter.shotZoneSplits?.offSidePct ?? 52) >= 50;
    const strokesOff = ['Extra Cover Lofted Drive', 'Crisp Cover Drive', 'Square Cut', 'Upper Cut Six', 'Straight Lofted Drive'];
    const strokesOn = ['Power Pull Shot', 'Deep Midwicket Slog Sweep', 'Whipped Flick', 'Cow Corner Maximum', 'Fine Leg Scoop'];
    const generated: BatterShotEvent[] = [];
    for (let idx = 0; idx < 15; idx++) {
      const useOff = offFavored ? idx % 3 !== 0 : idx % 3 === 0;
      const isSix = idx % 3 === 0;
      const isFour = !isSix && idx % 2 === 1;
      const runs = isSix ? 6 : isFour ? 4 : 2;
      const stroke = useOff ? strokesOff[idx % strokesOff.length] : strokesOn[idx % strokesOn.length];
      const baseAngle = useOff ? -55 - ((idx * 19) % 50) + 15 : 55 + ((idx * 19) % 55) - 15;
      generated.push({
        ballIndex: idx + 1,
        over: 15 + (idx % 5),
        ballNum: (idx % 6) + 1,
        runs,
        isFour,
        isSix,
        stroke,
        onOrOff: useOff ? 'Off-side' : 'On-side',
        sector: useOff ? 'Deep Extra Cover & Point' : 'Deep Midwicket & Pull Arc',
        angleDeg: baseAngle,
        distanceRatio: isSix ? 1.03 : isFour ? 0.92 : 0.65,
        bpi: 74 + ((idx * 7) % 24),
        opponent: 'IPL Crunch Match',
        matchDate: '2024',
        bowlerType: idx % 2 === 0 ? 'Pace' : 'Spin',
      });
    }
    return generated;
  }, [isBatter, batter]);

  const bowlerDeliveries: BowlerDeliveryEvent[] = useMemo(() => {
    if (isBatter || !bowler) return [];
    if (bowler.topPressureDeliveries && bowler.topPressureDeliveries.length >= 6) {
      return bowler.topPressureDeliveries.slice(0, 15);
    }
    const isPace = bowler.paceOrSpin === 'Pace';
    const overFavored = (bowler.deliveryTelemetry?.overWicketPct ?? 75) >= 50;
    const styles = isPace
      ? ['Toe-Crushing Yorker', 'Hard Length Slower Ball', 'Off-Cutter Blockhole', 'Sharp Seam Inswinger', 'Heavy Back-of-Length']
      : ['Deceptive Googly', 'Flighted Top-Spinner', 'Quick Carrom Ball', 'Arm Ball Skiddy Length', 'Turning Leg-Break'];
    const generated: BowlerDeliveryEvent[] = [];
    for (let idx = 0; idx < 15; idx++) {
      const isWicket = idx % 3 === 0;
      const isDot = !isWicket;
      const style = styles[idx % styles.length];
      const isYorker = style.toLowerCase().includes('yorker') || style.toLowerCase().includes('blockhole');
      const pitchY = isYorker ? 0.13 : 0.34 + ((idx % 4) * 0.04);
      const pitchX = (((idx * 11) % 16) - 8) / 30;
      generated.push({
        ballIndex: idx + 1,
        over: 16 + (idx % 4),
        ballNum: (idx % 6) + 1,
        runsConceded: 0,
        isWicket,
        isDot,
        dismissalType: isWicket ? (idx % 2 === 0 ? 'Bowled' : 'LBW') : '',
        overOrAround: overFavored ? (idx % 4 === 0 ? 'Around' : 'Over') : (idx % 4 === 0 ? 'Over' : 'Around'),
        deliveryStyle: style,
        lengthZone: isYorker ? 'Yorker / Blockhole (0–2m)' : 'Good Length Control Channel (4–6m)',
        speedKmh: isPace ? Number((141.5 + (idx % 7) - 2).toFixed(1)) : Number((91.4 + (idx % 5) - 2).toFixed(1)),
        pitchX,
        pitchY,
        endX: isWicket ? 0 : pitchX * 0.5,
        bpi: 76 + ((idx * 5) % 22),
        opponent: 'IPL Crunch Spell',
        matchDate: '2024',
      });
    }
    return generated;
  }, [isBatter, bowler]);

  const totalEvents = isBatter ? batterShots.length : bowlerDeliveries.length;

  // Reset and play when player or autoPlayTrigger changes
  useEffect(() => {
    setCurrentBallIdx(0);
    setBallProgress(0);
    if (autoPlayTrigger > 0) {
      setIsPlaying(true);
    }
  }, [player.playerId, autoPlayTrigger]);

  // Auto-Cycle Top 10 Players timer (4 seconds per player highlight reel)
  useEffect(() => {
    if (!autoCycleTop10) return;
    setIsPlaying(true);
    const list = (isBatter ? allBatters : allBowlers)
      .filter((p) => p.unstopRank >= 1 && p.unstopRank <= 10)
      .sort((a, b) => a.unstopRank - b.unstopRank);
    if (list.length === 0) return;

    const timer = setInterval(() => {
      const currentIdx = list.findIndex((p) => p.playerId === player.playerId);
      const nextIdx = (currentIdx + 1) % list.length;
      onSelectPlayer(list[nextIdx].playerId, isBatter ? 'batter' : 'bowler');
    }, 4000);

    return () => clearInterval(timer);
  }, [autoCycleTop10, isBatter, allBatters, allBowlers, player.playerId, onSelectPlayer]);

  // Main Animation Loop
  useEffect(() => {
    if (!isPlaying || totalEvents === 0) return;

    let animId: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Each ball takes ~1.15s at 1x speed (or 0.58s at 2x speed, or faster in Auto-Cycle mode)
      const ballDuration = autoCycleTop10 ? 0.45 : 1.15 / playbackSpeed;

      setBallProgress((prev) => {
        const next = prev + dt / ballDuration;
        if (next >= 1) {
          setCurrentBallIdx((bIdx) => {
            if (bIdx + 1 >= totalEvents) {
              // If recording, stop recording at the end of the 15-ball reel
              if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
              }
              return 0; // loop seamlessly
            }
            return bIdx + 1;
          });
          return 0;
        }
        return next;
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, playbackSpeed, totalEvents, autoCycleTop10]);

  // Draw Frame on HTML5 Canvas
  const drawBroadcastFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width; // 1280
    const H = canvas.height; // 720

    // 1. Background Obsidian Night Stadium (#090D16)
    ctx.fillStyle = '#090D16';
    ctx.fillRect(0, 0, W, H);

    // Subtle Stadium Spotlight Radial Glow
    const bgGrad = ctx.createRadialGradient(W * 0.5, H * 0.54, 40, W * 0.5, H * 0.54, W * 0.6);
    bgGrad.addColorStop(0, 'rgba(19, 26, 46, 0.95)');
    bgGrad.addColorStop(0.6, 'rgba(10, 14, 26, 0.98)');
    bgGrad.addColorStop(1, '#090D16');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Top Broadcast Header Bar on Canvas
    ctx.fillStyle = 'rgba(19, 26, 46, 0.92)';
    ctx.fillRect(0, 0, W, 68);
    ctx.fillStyle = '#EA1A85';
    ctx.fillRect(0, 66, W, 2.5);

    // RR Pink Tag Box
    ctx.fillStyle = '#EA1A85';
    ctx.beginPath();
    ctx.roundRect(24, 14, 180, 40, 8);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('RAJASTHAN ROYALS', 40, 32);
    ctx.fillStyle = '#FFE4F2';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillText('TACTICAL STRENGTH CAM', 40, 47);

    // Player Name & Rank in Canvas Header
    ctx.fillStyle = '#D4AF37';
    ctx.font = '800 13px "JetBrains Mono", monospace';
    const rankLabel = player.unstopRank <= 10 ? `OFFICIAL RANK #${player.unstopRank}` : 'COHORT QUALIFIER';
    ctx.fillText(`${rankLabel} · ${player.teamName.toUpperCase()}`, 224, 29);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(player.name.toUpperCase(), 224, 53);

    // Right Header PRR Rating Badge
    ctx.fillStyle = 'rgba(212, 175, 55, 0.16)';
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(W - 250, 12, 226, 44, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#D4AF37';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillText('PRESSURE RELIABILITY RATING', W - 234, 29);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 18px "JetBrains Mono", monospace';
    ctx.fillText(`${player.reliabilityScore.toFixed(1)} / 100`, W - 234, 49);

    if (isBatter && batter) {
      // =========================================================================
      // BATTER DEMO MODE: Top-Down 3D-Perspective Stadium Wagon-Wheel Replay
      // =========================================================================
      const cx = W * 0.44;
      const cy = H * 0.56;
      const rx = 350;
      const ry = 245;

      // Turf Mowing Stripes (Concentric Ellipses)
      for (let r = 1; r <= 5; r++) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, (rx * r) / 5, (ry * r) / 5, 0, 0, Math.PI * 2);
        ctx.fillStyle = r % 2 === 0 ? 'rgba(16, 185, 129, 0.045)' : 'rgba(6, 95, 70, 0.07)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Outer Glowing Boundary Rope
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.strokeStyle = '#EA1A85';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#EA1A85';
      ctx.shadowBlur = 16;
      ctx.stroke();
      ctx.restore();

      // 30-Yard Inner Circle (Dashed)
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 0.56, ry * 0.56, 0, 0, Math.PI * 2);
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.restore();

      // Highlight Batter's Dominant Power Zone as a Pulsing Royal Gold (#D4AF37) Heatmap Sector
      const offPct = batter.shotZoneSplits?.offSidePct ?? 54;
      const onPct = batter.shotZoneSplits?.onSidePct ?? 46;
      const isOffDominant = offPct >= onPct;
      const pulseAlpha = 0.18 + 0.08 * Math.sin(performance.now() / 220);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      // In canvas: -PI/2 is straight up (Long-Off/Long-On). Left half (PI/2 to 3*PI/2) is Off-side for RHB
      const startAngle = isOffDominant ? -Math.PI * 0.92 : -Math.PI * 0.42;
      const endAngle = isOffDominant ? -Math.PI * 0.58 : -Math.PI * 0.08;
      ctx.ellipse(cx, cy, rx, ry, 0, startAngle, endAngle, false);
      ctx.closePath();

      const sectorGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, rx);
      sectorGrad.addColorStop(0, 'rgba(212, 175, 55, 0.04)');
      sectorGrad.addColorStop(0.65, `rgba(212, 175, 55, ${pulseAlpha})`);
      sectorGrad.addColorStop(1, 'rgba(234, 26, 133, 0.32)');
      ctx.fillStyle = sectorGrad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.65)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Off-Side vs On-Side Field Labels
      ctx.fillStyle = isOffDominant ? '#D4AF37' : 'rgba(148, 163, 184, 0.75)';
      ctx.font = '800 13px "JetBrains Mono", monospace';
      ctx.fillText(`OFF-SIDE ARC (${offPct}%)`, cx - rx + 28, cy - ry + 34);

      ctx.fillStyle = !isOffDominant ? '#D4AF37' : 'rgba(148, 163, 184, 0.75)';
      ctx.fillText(`ON-SIDE ARC (${onPct}%)`, cx + rx - 195, cy - ry + 34);

      // 22-Yard Pitch Strip at Center
      const creaseX = cx;
      const creaseY = cy + 22;
      ctx.fillStyle = '#1E293B';
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cx - 11, cy - 36, 22, 72, 3);
      ctx.fill();
      ctx.stroke();

      // Draw Completed Shots (0 .. currentBallIdx - 1) + Active Shot (currentBallIdx)
      let cumulativeRuns = 0;
      for (let i = 0; i <= currentBallIdx && i < batterShots.length; i++) {
        const shot = batterShots[i];
        const isCurrent = i === currentBallIdx;
        const prog = isCurrent ? Math.min(1, ballProgress * 1.25) : 1;
        if (!isCurrent || prog > 0.2) {
          cumulativeRuns += shot.runs;
        }

        // Convert angleDeg (where 0 is straight up -90 deg in canvas)
        const rad = ((shot.angleDeg - 90) * Math.PI) / 180;
        const targetX = creaseX + Math.cos(rad) * (rx * shot.distanceRatio);
        const targetY = creaseY + Math.sin(rad) * (ry * shot.distanceRatio);

        const curX = creaseX + (targetX - creaseX) * prog;
        const curY = creaseY + (targetY - creaseY) * prog;

        const shotColor = shot.isSix ? '#D4AF37' : shot.isFour ? '#EA1A85' : '#38BDF8';

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(creaseX, creaseY);

        if (shot.isSix) {
          // 3D Lofted Arcing Trajectory for Sixes
          const midX = (creaseX + curX) / 2;
          const midY = (creaseY + curY) / 2 - 48 * Math.sin(prog * Math.PI * 0.5);
          ctx.quadraticCurveTo(midX, midY, curX, curY);
        } else {
          ctx.lineTo(curX, curY);
        }

        ctx.strokeStyle = shotColor;
        ctx.lineWidth = isCurrent ? 4.5 : 2.2;
        ctx.globalAlpha = isCurrent ? 1 : 0.48;
        if (isCurrent) {
          ctx.shadowColor = shotColor;
          ctx.shadowBlur = 16;
        }
        ctx.stroke();

        // Glowing Ball Head & Boundary Shockwave
        ctx.beginPath();
        ctx.arc(curX, curY, isCurrent ? 6.5 : 4, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = shotColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        if (isCurrent && shot.isSix && prog >= 0.88) {
          const shockRadius = 10 + (ballProgress - 0.7) * 90;
          ctx.beginPath();
          ctx.arc(targetX, targetY, Math.max(8, shockRadius), 0, Math.PI * 2);
          ctx.strokeStyle = '#D4AF37';
          ctx.lineWidth = 2.5;
          ctx.globalAlpha = Math.max(0, 1 - (ballProgress - 0.7) * 3);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Batter Crease Beacon
      ctx.fillStyle = '#D4AF37';
      ctx.beginPath();
      ctx.arc(creaseX, creaseY, 6, 0, Math.PI * 2);
      ctx.fill();

      // Right-Side Live Tactical Telemetry HUD Panel
      const activeShot = batterShots[currentBallIdx] || batterShots[0];
      const hudX = W - 390;
      const hudY = 92;
      const hudW = 366;

      // Card 1: Dominant Power Zone Card
      ctx.fillStyle = 'rgba(19, 26, 46, 0.92)';
      ctx.strokeStyle = 'rgba(234, 26, 133, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(hudX, hudY, hudW, 132, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#EA1A85';
      ctx.font = '800 11px "JetBrains Mono", monospace';
      ctx.fillText('DOMINANT POWER ZONE (HIGH BPI)', hudX + 18, hudY + 26);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 16px "Plus Jakarta Sans", sans-serif';
      const domZoneText = batter.shotZoneSplits?.dominantPowerZone || 'Off-Side Extra Cover Arc';
      ctx.fillText(domZoneText.slice(0, 34), hudX + 18, hudY + 52);

      ctx.fillStyle = '#D4AF37';
      ctx.font = '800 28px "JetBrains Mono", monospace';
      ctx.fillText(`${batter.pressureSR} SR`, hudX + 18, hudY + 92);

      ctx.fillStyle = '#34D399';
      ctx.font = '700 13px "JetBrains Mono", monospace';
      ctx.fillText(
        `+${batter.srDelta >= 0 ? batter.srDelta : 0} Elevation · ${batter.pressureBoundaryPct}% Boundary`,
        hudX + 18,
        hudY + 115
      );

      // Card 2: Current Shot Live Callout
      if (activeShot) {
        const card2Y = hudY + 148;
        ctx.fillStyle = 'rgba(19, 26, 46, 0.92)';
        ctx.strokeStyle = activeShot.isSix ? '#D4AF37' : '#EA1A85';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(hudX, card2Y, hudW, 175, 14);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#94A3B8';
        ctx.font = '700 11px "JetBrains Mono", monospace';
        ctx.fillText(
          `SHOT #${currentBallIdx + 1} OF ${batterShots.length} · OVER ${activeShot.over}.${activeShot.ballNum} · BPI ${activeShot.bpi}`,
          hudX + 18,
          card2Y + 26
        );

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '800 20px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(activeShot.stroke.toUpperCase(), hudX + 18, card2Y + 58);

        ctx.fillStyle = '#38BDF8';
        ctx.font = '700 12px "JetBrains Mono", monospace';
        ctx.fillText(`${activeShot.onOrOff.toUpperCase()} · ${activeShot.sector}`, hudX + 18, card2Y + 82);

        // Outcome Pill
        const pillColor = activeShot.isSix ? '#D4AF37' : activeShot.isFour ? '#EA1A85' : '#0284C7';
        ctx.fillStyle = pillColor;
        ctx.beginPath();
        ctx.roundRect(hudX + 18, card2Y + 100, 175, 36, 8);
        ctx.fill();

        ctx.fillStyle = activeShot.isSix ? '#090D16' : '#FFFFFF';
        ctx.font = '900 15px "JetBrains Mono", monospace';
        const outcomeText = activeShot.isSix
          ? 'MAXIMUM 6 RUNS!'
          : activeShot.isFour
            ? 'BOUNDARY 4 RUNS!'
            : `+${activeShot.runs} RUNS SCORED`;
        ctx.fillText(outcomeText, hudX + 30, card2Y + 123);

        ctx.fillStyle = '#CBD5E1';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.fillText(`vs ${activeShot.opponent} (${activeShot.bowlerType})`, hudX + 18, card2Y + 158);
      }

      // Card 3: Cumulative Reel Telemetry
      const card3Y = hudY + 340;
      ctx.fillStyle = 'rgba(19, 26, 46, 0.92)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(hudX, card3Y, hudW, 118, 14);
      ctx.fill();
      ctx.stroke();

      const ballsSoFar = currentBallIdx + 1;
      const liveReelSR = Math.round((cumulativeRuns / Math.max(1, ballsSoFar)) * 100);
      ctx.fillStyle = '#94A3B8';
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.fillText('HIGHLIGHT REEL CUMULATIVE IMPACT', hudX + 18, card3Y + 26);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 26px "JetBrains Mono", monospace';
      ctx.fillText(`${cumulativeRuns} RUNS (${ballsSoFar} BALLS)`, hudX + 18, card3Y + 62);

      ctx.fillStyle = '#D4AF37';
      ctx.font = '700 13px "JetBrains Mono", monospace';
      ctx.fillText(`Highlight Sequence SR: ${liveReelSR}.0 · Dot Avoidance: ${batter.pressureDotAvoidancePct}%`, hudX + 18, card3Y + 94);

      // Legend at Bottom Left
      ctx.fillStyle = '#D4AF37';
      ctx.beginPath();
      ctx.arc(42, H - 36, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#E2E8F0';
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.fillText('6 RUNS (ARCING MAXIMUM)', 56, H - 32);

      ctx.fillStyle = '#EA1A85';
      ctx.beginPath();
      ctx.arc(255, H - 36, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#E2E8F0';
      ctx.fillText('4 RUNS (BOUNDARY)', 269, H - 32);

      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(430, H - 36, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#E2E8F0';
      ctx.fillText('1-3 RUNS (ROTATION)', 444, H - 32);
    } else if (bowler) {
      // =========================================================================
      // BOWLER DEMO MODE: 3D-Perspective 22-Yard Pitch & Stump-Cam Trajectory
      // =========================================================================
      const pitchCenterX = W * 0.42;
      const pitchTopY = 128; // Batter's Stumps (Far End)
      const pitchBottomY = 635; // Bowler's Release Crease (Near End)
      const topHalfW = 92;
      const bottomHalfW = 215;

      // 3D Trapezoid 22-Yard Pitch Surface
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pitchCenterX - topHalfW, pitchTopY);
      ctx.lineTo(pitchCenterX + topHalfW, pitchTopY);
      ctx.lineTo(pitchCenterX + bottomHalfW, pitchBottomY);
      ctx.lineTo(pitchCenterX - bottomHalfW, pitchBottomY);
      ctx.closePath();

      const pitchGrad = ctx.createLinearGradient(0, pitchTopY, 0, pitchBottomY);
      pitchGrad.addColorStop(0, '#1E293B');
      pitchGrad.addColorStop(0.5, '#172033');
      pitchGrad.addColorStop(1, '#0F172A');
      ctx.fillStyle = pitchGrad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(234, 26, 133, 0.55)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();

      // Helper to map normalized pitch coords (x in [-1, 1], y in [0 (top/batter), 1 (bottom/bowler)])
      const mapPitchPoint = (normX: number, normY: number) => {
        const y = pitchTopY + normY * (pitchBottomY - pitchTopY);
        const halfW = topHalfW + normY * (bottomHalfW - topHalfW);
        const x = pitchCenterX + normX * halfW;
        return { x, y, halfW };
      };

      // Draw Pitch Length Zones (Yorker, Good Length, Short)
      const drawLengthBand = (yStart: number, yEnd: number, color: string, label: string, isHighlighted: boolean) => {
        const p1 = mapPitchPoint(-0.96, yStart);
        const p2 = mapPitchPoint(0.96, yStart);
        const p3 = mapPitchPoint(0.96, yEnd);
        const p4 = mapPitchPoint(-0.96, yEnd);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        if (isHighlighted) {
          ctx.strokeStyle = '#D4AF37';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.fillStyle = isHighlighted ? '#D4AF37' : 'rgba(226, 232, 240, 0.7)';
        ctx.font = '700 11px "JetBrains Mono", monospace';
        ctx.fillText(label, pitchCenterX - 78, (p1.y + p4.y) / 2 + 4);
        ctx.restore();
      };

      const lethalChannel = bowler.deliveryTelemetry?.lethalControlChannel || 'Over the Wicket · Blockhole Yorker';
      const isYorkerDominant = lethalChannel.toLowerCase().includes('yorker');

      drawLengthBand(0.06, 0.20, 'rgba(234, 26, 133, 0.25)', 'YORKER / BLOCKHOLE (0-2m)', isYorkerDominant);
      drawLengthBand(0.24, 0.46, 'rgba(212, 175, 55, 0.22)', 'LETHAL GOOD LENGTH (4-6m)', !isYorkerDominant);
      drawLengthBand(0.50, 0.70, 'rgba(56, 189, 248, 0.14)', 'HARD / BACK-OF-LENGTH (7-9m)', false);

      // Draw Glowing Target Box on Pitch
      const pulse = 0.4 + 0.25 * Math.sin(performance.now() / 180);
      const targetBandY = isYorkerDominant ? 0.13 : 0.34;
      const tPt = mapPitchPoint(0, targetBandY);
      ctx.save();
      ctx.strokeStyle = `rgba(212, 175, 55, ${pulse + 0.3})`;
      ctx.fillStyle = `rgba(234, 26, 133, ${pulse * 0.45})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(tPt.x - 42, tPt.y - 16, 84, 32, 6);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Draw Batter's Stumps at Top (Far End)
      const activeDel = bowlerDeliveries[currentBallIdx] || bowlerDeliveries[0];
      const isStumpHit = activeDel && activeDel.isWicket && ballProgress >= 0.82;

      for (let s = -1; s <= 1; s++) {
        const sx = pitchCenterX + s * 11;
        const sy = pitchTopY;
        const tilt = isStumpHit ? s * (ballProgress - 0.8) * 65 : 0;
        ctx.save();
        ctx.strokeStyle = isStumpHit ? '#EA1A85' : '#D4AF37';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + tilt, sy - 38);
        ctx.stroke();
        ctx.restore();
      }

      // Replay Previous + Current Deliveries
      let wicketsInReel = 0;
      let dotsInReel = 0;
      for (let i = 0; i <= currentBallIdx && i < bowlerDeliveries.length; i++) {
        const del = bowlerDeliveries[i];
        const isCurrent = i === currentBallIdx;
        const prog = isCurrent ? Math.min(1, ballProgress * 1.2) : 1;

        if (del.isWicket) wicketsInReel++;
        if (del.isDot) dotsInReel++;

        // Release point (Over the wicket = left of center for RHB bowler, Around = right of center)
        const releaseNormX = del.overOrAround === 'Over' ? -0.48 : 0.48;
        const releasePt = mapPitchPoint(releaseNormX, 0.95);
        const bouncePt = mapPitchPoint(del.pitchX, del.pitchY);
        const finishPt = mapPitchPoint(del.endX, 0.02);

        const trailColor = del.isWicket ? '#EA1A85' : del.isDot ? '#D4AF37' : '#38BDF8';

        ctx.save();
        ctx.strokeStyle = trailColor;
        ctx.lineWidth = isCurrent ? 4.5 : 2;
        ctx.globalAlpha = isCurrent ? 1 : 0.42;
        if (isCurrent) {
          ctx.shadowColor = trailColor;
          ctx.shadowBlur = 16;
        }

        // First segment: Release -> Pitch Bounce (prog 0 .. 0.65)
        const p1Prog = Math.min(1, prog / 0.65);
        const cur1X = releasePt.x + (bouncePt.x - releasePt.x) * p1Prog;
        const cur1Y = releasePt.y + (bouncePt.y - releasePt.y) * p1Prog;

        ctx.beginPath();
        ctx.moveTo(releasePt.x, releasePt.y);
        ctx.quadraticCurveTo(
          (releasePt.x + cur1X) / 2,
          (releasePt.y + cur1Y) / 2 - 28 * p1Prog,
          cur1X,
          cur1Y
        );
        ctx.stroke();

        // Pitch Bounce Ring
        if (prog >= 0.65) {
          ctx.beginPath();
          ctx.arc(bouncePt.x, bouncePt.y, isCurrent ? 7 : 4, 0, Math.PI * 2);
          ctx.fillStyle = trailColor;
          ctx.fill();

          // Second segment: Pitch Bounce -> Stumps/Crease (prog 0.65 .. 1.0)
          const p2Prog = Math.min(1, (prog - 0.65) / 0.35);
          const cur2X = bouncePt.x + (finishPt.x - bouncePt.x) * p2Prog;
          const cur2Y = bouncePt.y + (finishPt.y - bouncePt.y) * p2Prog;

          ctx.beginPath();
          ctx.moveTo(bouncePt.x, bouncePt.y);
          ctx.lineTo(cur2X, cur2Y);
          ctx.stroke();

          // Ball Head
          ctx.beginPath();
          ctx.arc(cur2X, cur2Y, isCurrent ? 6.5 : 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
        } else {
          // Ball Head in flight before bounce
          ctx.beginPath();
          ctx.arc(cur1X, cur1Y, isCurrent ? 6.5 : 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
        }

        // Wicket Shatter Impact Burst
        if (isCurrent && del.isWicket && prog >= 0.85) {
          ctx.beginPath();
          ctx.arc(finishPt.x, finishPt.y - 12, 26 * (prog - 0.75) * 4, 0, Math.PI * 2);
          ctx.strokeStyle = '#EA1A85';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        ctx.restore();
      }

      // Release Angle Labels at Bottom of Pitch
      const overPct = bowler.deliveryTelemetry?.overWicketPct ?? 74;
      const aroundPct = bowler.deliveryTelemetry?.aroundWicketPct ?? 26;
      ctx.fillStyle = '#EA1A85';
      ctx.font = '800 13px "JetBrains Mono", monospace';
      ctx.fillText(`OVER THE WICKET (${overPct}%)`, pitchCenterX - bottomHalfW - 10, pitchBottomY + 28);

      ctx.fillStyle = '#38BDF8';
      ctx.fillText(`AROUND THE WICKET (${aroundPct}%)`, pitchCenterX + bottomHalfW - 185, pitchBottomY + 28);

      // Right-Side Live Bowler Telemetry HUD Panel
      const hudX = W - 390;
      const hudY = 92;
      const hudW = 366;

      // Card 1: Lethal Control Channel
      ctx.fillStyle = 'rgba(19, 26, 46, 0.92)';
      ctx.strokeStyle = 'rgba(234, 26, 133, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(hudX, hudY, hudW, 132, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#EA1A85';
      ctx.font = '800 11px "JetBrains Mono", monospace';
      ctx.fillText('LETHAL CONTROL CHANNEL (HIGH BPI)', hudX + 18, hudY + 26);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(lethalChannel.slice(0, 36), hudX + 18, hudY + 52);

      ctx.fillStyle = '#D4AF37';
      ctx.font = '800 28px "JetBrains Mono", monospace';
      ctx.fillText(`${bowler.pressureEconomy} ECON`, hudX + 18, hudY + 92);

      ctx.fillStyle = '#34D399';
      ctx.font = '700 13px "JetBrains Mono", monospace';
      ctx.fillText(
        `${bowler.pressureDotPct}% Dot Rate · ${bowler.pressureWickets} Pressure Wkts`,
        hudX + 18,
        hudY + 115
      );

      // Card 2: Current Delivery Speed Gun & Impact Callout
      if (activeDel) {
        const card2Y = hudY + 148;
        ctx.fillStyle = 'rgba(19, 26, 46, 0.92)';
        ctx.strokeStyle = activeDel.isWicket ? '#EA1A85' : '#D4AF37';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(hudX, card2Y, hudW, 175, 14);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#94A3B8';
        ctx.font = '700 11px "JetBrains Mono", monospace';
        ctx.fillText(
          `BALL #${currentBallIdx + 1} OF ${bowlerDeliveries.length} · OVER ${activeDel.over}.${activeDel.ballNum} · BPI ${activeDel.bpi}`,
          hudX + 18,
          card2Y + 26
        );

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '800 19px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(activeDel.deliveryStyle.toUpperCase(), hudX + 18, card2Y + 56);

        ctx.fillStyle = '#38BDF8';
        ctx.font = '700 12px "JetBrains Mono", monospace';
        ctx.fillText(
          `${activeDel.overOrAround.toUpperCase()} THE WICKET · ${activeDel.speedKmh} KM/H`,
          hudX + 18,
          card2Y + 80
        );

        // Flashing Outcome Badge
        const badgeColor = activeDel.isWicket ? '#EA1A85' : '#D4AF37';
        ctx.fillStyle = badgeColor;
        ctx.beginPath();
        ctx.roundRect(hudX + 18, card2Y + 98, 205, 36, 8);
        ctx.fill();

        ctx.fillStyle = activeDel.isWicket ? '#FFFFFF' : '#090D16';
        ctx.font = '900 15px "JetBrains Mono", monospace';
        ctx.fillText(
          activeDel.isWicket ? `WICKET! (${activeDel.dismissalType.toUpperCase()})` : 'PRESSURE DOT BALL!',
          hudX + 30,
          card2Y + 121
        );

        ctx.fillStyle = '#CBD5E1';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.fillText(`vs ${activeDel.opponent} · ${activeDel.lengthZone}`, hudX + 18, card2Y + 156);
      }

      // Card 3: Cumulative Spell Reel Impact
      const card3Y = hudY + 340;
      ctx.fillStyle = 'rgba(19, 26, 46, 0.92)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(hudX, card3Y, hudW, 118, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#94A3B8';
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.fillText('SPELL REEL CUMULATIVE EXECUTION', hudX + 18, card3Y + 26);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 24px "JetBrains Mono", monospace';
      ctx.fillText(`${wicketsInReel} WKTS · ${dotsInReel} DOTS (${currentBallIdx + 1} BALLS)`, hudX + 18, card3Y + 62);

      ctx.fillStyle = '#D4AF37';
      ctx.font = '700 13px "JetBrains Mono", monospace';
      ctx.fillText(
        `Avg Release Speed: ${bowler.deliveryTelemetry?.avgSpeed || 141.2} km/h · Consistency: ${bowler.consistencyScore}/100`,
        hudX + 18,
        card3Y + 94
      );
    }
  }, [
    player,
    isBatter,
    batter,
    bowler,
    batterShots,
    bowlerDeliveries,
    currentBallIdx,
    ballProgress,
  ]);

  useEffect(() => {
    drawBroadcastFrame();
  }, [drawBroadcastFrame]);

  // Record & Download Video (.webm) using canvas.captureStream() + MediaRecorder
  const handleRecordWebM = () => {
    const canvas = canvasRef.current;
    if (!canvas || isRecording) return;

    try {
      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${player.name.replace(/\s+/g, '_')}_Tactical_Strength_Demo.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsRecording(false);
        setRecordedComplete(true);
        setTimeout(() => setRecordedComplete(false), 3500);
      };

      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setCurrentBallIdx(0);
      setBallProgress(0);
      setIsPlaying(true);
      recorder.start();
    } catch (err) {
      console.error('WebM capture error:', err);
      setIsRecording(false);
    }
  };

  return (
    <div
      id="tactical-strength-video-player"
      className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#090D16] shadow-xl"
    >
      {/* Top Broadcast Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] bg-[#111827] p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-[#EA1A85]">
            <Tv className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-[#EA1A85] px-2 py-0.5 text-[10px] font-semibold tracking-wider text-white">
                <Radio className="h-3 w-3 animate-pulse" />
                 Replay Engine
              </span>
              <span className="font-mono text-xs text-slate-400">
                High-pressure delivery sequence from ball_by_ball.csv
              </span>
            </div>
            <h3 className="font-condensed text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5">
              Tactical Strength Replay — {player.name}
            </h3>
          </div>
        </div>

        {/* Elite Tactical Overlay Toggle, Auto-Play Top 10 Toggle & Record .webm Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowEliteOverlay((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
              showEliteOverlay
                ? 'border-[#D4AF37]/50 bg-[#D4AF37]/15 text-[#D4AF37]'
                : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span>
              Tactical Overlay: {showEliteOverlay ? 'On' : 'Off'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAutoCycleTop10((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
              autoCycleTop10
                ? 'border-[#D4AF37] bg-[#D4AF37] text-[#090D16] shadow-xs'
                : 'border-white/10 bg-white/5 text-slate-200 hover:border-white/25 hover:text-white'
            }`}
          >
            <Repeat className="h-3.5 w-3.5" />
            <span>{autoCycleTop10 ? 'Auto-Play Top 10 (On)' : 'Auto-Play Top 10'}</span>
          </button>

          <button
            type="button"
            onClick={handleRecordWebM}
            disabled={isRecording}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
              isRecording
                ? 'border-rose-500 bg-rose-600 text-white animate-pulse'
                : recordedComplete
                  ? 'border-emerald-500 bg-emerald-600 text-white'
                  : 'border-[#EA1A85] bg-[#EA1A85] text-white hover:bg-[#d41577] shadow-md shadow-[#EA1A85]/30'
            }`}
          >
            {recordedComplete ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Saved .webm Video!</span>
              </>
            ) : (
              <>
                <Video className="h-4 w-4" />
                <span>
                  {isRecording
                    ? `Recording Ball ${currentBallIdx + 1}/${totalEvents}...`
                    : 'Record & Download Video (.webm)'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 16:9 Widescreen HTML5 Broadcast Canvas + Unobstructed Royal Gold Pressure Heat Zone */}
      <div className="relative aspect-video w-full bg-[#090D16]">
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="h-full w-full object-contain"
        />
        <EliteTacticalOverlay
          enabled={showEliteOverlay}
          player={player}
          isBatter={isBatter}
          batterShots={batterShots}
          bowlerDeliveries={bowlerDeliveries}
          currentBallIdx={currentBallIdx}
          mode="canvas-heatzone"
        />
      </div>

      {/* Bottom Broadcast Video Scrub Bar & Transport Controls */}
      <div className="flex flex-col gap-3 border-t border-white/10 bg-[#131A2E] px-6 py-4">
        {/* Interactive 15-Ball Sequence Timeline Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {Array.from({ length: totalEvents }).map((_, idx) => {
            const isActive = idx === currentBallIdx;
            const isPast = idx < currentBallIdx;
            const label = isBatter
              ? `${batterShots[idx]?.runs || 4}r`
              : bowlerDeliveries[idx]?.isWicket
                ? 'W'
                : '•';
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setCurrentBallIdx(idx);
                  setBallProgress(0);
                }}
                className={`flex-1 min-w-[38px] rounded-lg py-1.5 font-mono text-[11px] font-bold transition-all cursor-pointer border ${
                  isActive
                    ? 'border-[#D4AF37] bg-[#EA1A85] text-white scale-105 shadow-xs'
                    : isPast
                      ? 'border-[#EA1A85]/40 bg-[#EA1A85]/20 text-pink-200'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                #{idx + 1} ({label})
              </button>
            );
          })}
        </div>

        {/* Transport Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#EA1A85] px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#d41577] transition-colors cursor-pointer"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-white" />}
              <span>{isPlaying ? 'Pause' : 'Play Demo'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentBallIdx(0);
                setBallProgress(0);
                setIsPlaying(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 text-[#D4AF37]" />
              <span>Replay</span>
            </button>

            {/* Playback Speed 1x / 2x */}
            <button
              type="button"
              onClick={() => setPlaybackSpeed((s) => (s === 1 ? 2 : 1))}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 font-mono text-xs font-bold text-[#D4AF37] hover:bg-white/10 transition-colors cursor-pointer"
            >
              <FastForward className="h-3.5 w-3.5" />
              <span>Speed: {playbackSpeed}x</span>
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-300 font-mono">
            <span className="inline-flex items-center gap-1.5">
              <Crosshair className="h-3.5 w-3.5 text-[#EA1A85]" />
              {isBatter
                ? `Dominant Zone: ${batter?.shotZoneSplits?.dominantPowerZone || 'Off-Side Power Arc'}`
                : `Lethal Channel: ${bowler?.deliveryTelemetry?.lethalControlChannel || 'Over the Wicket · Yorker'}`}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[#D4AF37] font-bold">
              <Zap className="h-3.5 w-3.5" />
              Ball {currentBallIdx + 1} / {totalEvents}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
