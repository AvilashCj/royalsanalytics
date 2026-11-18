import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Shuffle,
  Download,
  Trophy,
  Zap,
  Search,
  Crown,
  Flame,
  Swords,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BatterRating,
  BowlerRating,
  SuperOverBallOutcome,
  SuperOverSimResult,
} from '../types/cricket';
import { PlayerAvatar } from './PlayerAvatar';

interface SuperOverBattleSimulatorProps {
  batters: BatterRating[];
  bowlers: BowlerRating[];
  workerRef?: React.MutableRefObject<Worker | null>;
  initialBatterId?: number | null;
  initialBowlerId?: number | null;
}

function buildFallbackDuel(
  batter: BatterRating,
  bowler: BowlerRating,
  targetRuns: number,
  seed: number
): SuperOverSimResult {
  const dominantStrokes = batter.shotZoneSplits?.topStrokes?.map((s) => s.stroke) || [
    'Cover Drive',
    'Power Pull',
    'Lofted Extra Cover Drive',
    'Whipped Midwicket Flick',
  ];
  const dominantSide: 'Off-side' | 'On-side' =
    (batter.shotZoneSplits?.offSidePct ?? 54) >= 50 ? 'Off-side' : 'On-side';

  const dominantStyles = bowler.deliveryTelemetry?.topStyles?.map((s) => s.style) || [
    'Yorker / Blockhole',
    'Hard Length Slower Ball',
    'Back-of-Length Cutter',
  ];
  const dominantOA: 'Over' | 'Around' =
    (bowler.deliveryTelemetry?.overWicketPct ?? 70) >= 50 ? 'Over' : 'Around';
  const baseSpeed =
    bowler.deliveryTelemetry?.avgSpeed || (bowler.paceOrSpin === 'Spin' ? 92.4 : 142.0);

  const batAdvantage =
    (batter.reliabilityScore - bowler.reliabilityScore) * 0.45 +
    (batter.pressureBoundaryPct - 21) * 0.6 -
    (bowler.pressureDotPct - 40) * 0.5;

  const balls: SuperOverBallOutcome[] = [];
  let totalRuns = 0;
  let wicketsLost = 0;

  for (let bNum = 1; bNum <= 6; bNum++) {
    const ballLabel = `0.${bNum}`;
    const bowlerStyle =
      dominantStyles[(bNum - 1 + seed) % dominantStyles.length] || 'Blockhole Yorker';
    const overOrAround: 'Over' | 'Around' = dominantOA;
    const speedKmh = Number(
      (baseSpeed + (((bNum * 13 + seed) % 9) - 4) * 0.6).toFixed(1)
    );
    const batterStroke =
      dominantStrokes[(bNum + seed) % dominantStrokes.length] || 'Lofted Cover Drive';
    const shotSide: 'Off-side' | 'On-side' | 'Straight' =
      bNum % 3 === 0
        ? dominantSide === 'Off-side'
          ? 'On-side'
          : 'Off-side'
        : dominantSide;

    const roll =
      ((bNum * 37 + seed * 19 + batter.playerId * 11 + bowler.playerId * 7) % 100) +
      batAdvantage;

    let outcome: SuperOverBallOutcome['outcome'] = '1';
    let runs = 1;
    let isWicket = false;

    if (roll < 12 && wicketsLost === 0 && bNum >= 3) {
      outcome = 'W';
      runs = 0;
      isWicket = true;
    } else if (roll < 36) {
      outcome = '0';
      runs = 0;
    } else if (roll < 62) {
      outcome = '1';
      runs = 1;
    } else if (roll < 74) {
      outcome = '2';
      runs = 2;
    } else if (roll < 89) {
      outcome = '4';
      runs = 4;
    } else {
      outcome = '6';
      runs = 6;
    }

    totalRuns += runs;
    if (isWicket) wicketsLost++;

    const styleLower = bowlerStyle.toLowerCase();
    const pitchY =
      styleLower.includes('yorker') || styleLower.includes('full')
        ? 0.14 + (bNum % 3) * 0.02
        : styleLower.includes('short') || styleLower.includes('bouncer')
        ? 0.54
        : 0.34;
    const pitchX = (((bNum * 17 + seed) % 16) - 8) / 28;

    const baseAngle = shotSide === 'Off-side' ? -52 : 56;
    const shotAngleDeg = baseAngle + (((bNum * 23 + seed) % 28) - 14);
    const shotDistanceRatio =
      runs === 6 ? 1.04 : runs === 4 ? 0.93 : runs === 2 ? 0.68 : runs === 1 ? 0.45 : 0.18;

    const commentary = isWicket
      ? `Ball ${ballLabel}: ${bowler.name} unleashes a ${speedKmh} km/h ${bowlerStyle} from ${overOrAround.toLowerCase()} the wicket — ${batter.name} mistimes the ${batterStroke} and Stumps Shatter! WICKET!`
      : runs === 6
      ? `Ball ${ballLabel}: ${bowler.name} bowls a ${speedKmh} km/h ${bowlerStyle}, but ${batter.name} launches a towering ${batterStroke} into the ${shotSide} stands for a MASSIVE SIX!`
      : runs === 4
      ? `Ball ${ballLabel}: ${batter.name} reads the ${speedKmh} km/h ${bowlerStyle} early and threads a scorching ${batterStroke} through the ${shotSide} gap for FOUR!`
      : runs === 0
      ? `Ball ${ballLabel}: Clinical execution! ${bowler.name} lands a ${speedKmh} km/h ${bowlerStyle} right in the channel — ${batter.name} is beaten for a crucial DOT BALL.`
      : `Ball ${ballLabel}: ${bowler.name} hits the channel at ${speedKmh} km/h (${bowlerStyle}) — ${batter.name} works a ${batterStroke} to the ${shotSide} sweeper for ${runs} run${runs > 1 ? 's' : ''}.`;

    balls.push({
      ballNumber: bNum,
      ballLabel,
      outcome,
      runs,
      isWicket,
      isBoundary: runs === 4 || runs === 6,
      bowlerStyle,
      overOrAround,
      speedKmh,
      pitchX,
      pitchY,
      batterStroke,
      shotSide,
      shotAngleDeg,
      shotDistanceRatio,
      commentary,
      isHistoricalHeadToHead: false,
    });
  }

  const batterWon = totalRuns >= targetRuns && wicketsLost < 2;
  const winner: 'batter' | 'bowler' = batterWon ? 'batter' : 'bowler';
  const winMarginText = batterWon
    ? `${batter.name} chased down the ${targetRuns}-run target (${totalRuns}/${wicketsLost} in 6 balls)!`
    : `${bowler.name} defended the ${targetRuns}-run target, restricting ${batter.name} to ${totalRuns}/${wicketsLost}!`;

  const tacticalSummary = batterWon
    ? `${batter.name}'s signature ${batter.shotZoneSplits?.dominantPowerZone || 'Power Arc'} (${batter.pressureSR} Pressure SR) overpowered ${bowler.name}'s ${bowler.deliveryTelemetry?.lethalControlChannel || 'death channel'} with decisive boundary acceleration.`
    : `${bowler.name}'s lethal ${bowler.deliveryTelemetry?.lethalControlChannel || 'Over the Wicket Yorker & Slower Ball'} (${bowler.pressureEconomy} Pressure Econ, ${bowler.pressureDotPct}% Dots) suffocated ${batter.name}'s scoring arc under crunch leverage.`;

  return {
    batterId: batter.playerId,
    batterName: batter.name,
    batterTeam: batter.teamName,
    bowlerId: bowler.playerId,
    bowlerName: bowler.name,
    bowlerTeam: bowler.teamName,
    targetRuns,
    totalRuns,
    wicketsLost,
    winner,
    winMarginText,
    tacticalSummary,
    headToHeadBallsFound: 0,
    balls,
  };
}

export const SuperOverBattleSimulator: React.FC<SuperOverBattleSimulatorProps> = ({
  batters,
  bowlers,
  workerRef,
  initialBatterId,
  initialBowlerId,
}) => {
  const topBatters = useMemo(
    () =>
      batters
        .filter((b) => b.unstopRank <= 10)
        .sort((a, b) => a.unstopRank - b.unstopRank),
    [batters]
  );

  const topBowlers = useMemo(
    () =>
      bowlers
        .filter((bw) => bw.unstopRank <= 10)
        .sort((a, b) => a.unstopRank - b.unstopRank),
    [bowlers]
  );

  const [batterSearch, setBatterSearch] = useState('');
  const [bowlerSearch, setBowlerSearch] = useState('');
  const [selectedBatterId, setSelectedBatterId] = useState<number>(
    initialBatterId || topBatters[0]?.playerId || batters[0]?.playerId || 1
  );
  const [selectedBowlerId, setSelectedBowlerId] = useState<number>(
    initialBowlerId || topBowlers[0]?.playerId || bowlers[0]?.playerId || 1
  );
  const [targetRuns, setTargetRuns] = useState<number>(12);
  const [duelSeed, setDuelSeed] = useState<number>(101);
  const [simResult, setSimResult] = useState<SuperOverSimResult | null>(null);

  useEffect(() => {
    if (initialBatterId) {
      setSelectedBatterId(initialBatterId);
    }
  }, [initialBatterId]);

  useEffect(() => {
    if (initialBowlerId) {
      setSelectedBowlerId(initialBowlerId);
    }
  }, [initialBowlerId]);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2>(1);
  const [activeBallIdx, setActiveBallIdx] = useState<number>(0); // 0 to 5
  const [ballProgress, setBallProgress] = useState<number>(0); // 0.0 to 1.0 within active ball
  const [isDuelFinished, setIsDuelFinished] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const selectedBatter = useMemo(
    () =>
      batters.find((b) => b.playerId === selectedBatterId) ||
      topBatters[0] ||
      batters[0],
    [batters, topBatters, selectedBatterId]
  );

  const selectedBowler = useMemo(
    () =>
      bowlers.find((bw) => bw.playerId === selectedBowlerId) ||
      topBowlers[0] ||
      bowlers[0],
    [bowlers, topBowlers, selectedBowlerId]
  );

  const filteredBatters = useMemo(() => {
    const q = batterSearch.trim().toLowerCase();
    if (!q) return batters;
    return batters.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.teamName.toLowerCase().includes(q)
    );
  }, [batters, batterSearch]);

  const filteredBowlers = useMemo(() => {
    const q = bowlerSearch.trim().toLowerCase();
    if (!q) return bowlers;
    return bowlers.filter(
      (bw) =>
        bw.name.toLowerCase().includes(q) ||
        bw.teamName.toLowerCase().includes(q)
    );
  }, [bowlers, bowlerSearch]);

  // Trigger simulation in Web Worker + immediate fallback
  const triggerSimulation = useCallback(
    (bId: number, bwId: number, tRuns: number, seedVal: number) => {
      const batObj = batters.find((b) => b.playerId === bId) || batters[0];
      const bowlObj = bowlers.find((bw) => bw.playerId === bwId) || bowlers[0];
      if (!batObj || !bowlObj) return;

      const immediate = buildFallbackDuel(batObj, bowlObj, tRuns, seedVal);
      setSimResult(immediate);
      setActiveBallIdx(0);
      setBallProgress(0);
      setIsDuelFinished(false);
      setIsPlaying(true);

      if (workerRef?.current) {
        workerRef.current.postMessage({
          type: 'SIMULATE_SUPER_OVER',
          payload: {
            batterId: bId,
            bowlerId: bwId,
            targetRuns: tRuns,
            seed: seedVal,
          },
        });
      }
    },
    [batters, bowlers, workerRef]
  );

  // Listen for SUPER_OVER_RESULT from worker if available
  useEffect(() => {
    const worker = workerRef?.current;
    if (!worker) return;

    const handleWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SUPER_OVER_RESULT' && event.data.payload) {
        setSimResult(event.data.payload as SuperOverSimResult);
      }
    };

    worker.addEventListener('message', handleWorkerMessage);
    return () => {
      worker.removeEventListener('message', handleWorkerMessage);
    };
  }, [workerRef]);

  // Run initial simulation when component mounts or players change
  useEffect(() => {
    if (selectedBatter && selectedBowler) {
      triggerSimulation(
        selectedBatter.playerId,
        selectedBowler.playerId,
        targetRuns,
        duelSeed
      );
    }
  }, [selectedBatter?.playerId, selectedBowler?.playerId, targetRuns, duelSeed, triggerSimulation]);

  // Auto-advance 6-ball animation loop
  useEffect(() => {
    if (!isPlaying || !simResult || isDuelFinished) return;

    let rafId: number;
    let lastTime = performance.now();
    const ballDurationMs = 2100 / playbackSpeed;

    const step = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;

      setBallProgress((prev) => {
        const next = prev + dt / ballDurationMs;
        if (next >= 1) {
          setActiveBallIdx((currIdx) => {
            if (currIdx >= simResult.balls.length - 1) {
              setIsDuelFinished(true);
              setIsPlaying(false);
              if (recorderRef.current && recorderRef.current.state === 'recording') {
                recorderRef.current.stop();
              }
              return currIdx;
            }
            return currIdx + 1;
          });
          return 0;
        }
        return next;
      });

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, playbackSpeed, simResult, isDuelFinished]);

  // Render 16:9 Broadcast Stadium Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !simResult || !selectedBatter || !selectedBowler) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // 1. Obsidian Night Stadium Backdrop (#090D16)
    const bgGrad = ctx.createRadialGradient(
      W * 0.5,
      H * 0.52,
      40,
      W * 0.5,
      H * 0.52,
      W * 0.62
    );
    bgGrad.addColorStop(0, '#101B2E');
    bgGrad.addColorStop(0.55, '#0B1220');
    bgGrad.addColorStop(1, '#090D16');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    const centerX = W * 0.5;
    const centerY = H * 0.53;
    const boundaryRx = W * 0.36;
    const boundaryRy = H * 0.38;

    // 2. Glowing Stadium Turf Mowing Rings
    for (let r = 1; r <= 4; r++) {
      ctx.beginPath();
      ctx.ellipse(
        centerX,
        centerY,
        boundaryRx * (r / 4),
        boundaryRy * (r / 4),
        0,
        0,
        Math.PI * 2
      );
      ctx.strokeStyle =
        r === 4 ? 'rgba(234, 26, 133, 0.55)' : 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = r === 4 ? 2.5 : 1;
      ctx.stroke();
    }

    // 30-Yard Inner Circle (dashed gold)
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.ellipse(
      centerX,
      centerY,
      boundaryRx * 0.52,
      boundaryRy * 0.52,
      0,
      0,
      Math.PI * 2
    );
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // 3. Batter's Dominant Power Zone (Pulsing Royal Gold Field Sector)
    const isOffSideDominant =
      (selectedBatter.shotZoneSplits?.offSidePct ?? 55) >= 50;
    const pulseAlpha = 0.16 + 0.08 * Math.sin(ballProgress * Math.PI * 2);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 26);
    const startAngle = isOffSideDominant ? -Math.PI * 0.85 : -Math.PI * 0.15;
    const endAngle = isOffSideDominant ? -Math.PI * 0.15 : Math.PI * 0.55;
    ctx.ellipse(
      centerX,
      centerY,
      boundaryRx * 0.98,
      boundaryRy * 0.98,
      0,
      startAngle,
      endAngle
    );
    ctx.closePath();
    const zoneGrad = ctx.createRadialGradient(
      centerX,
      centerY,
      10,
      centerX,
      centerY,
      boundaryRx
    );
    zoneGrad.addColorStop(0, `rgba(212, 175, 55, ${pulseAlpha * 0.5})`);
    zoneGrad.addColorStop(1, `rgba(212, 175, 55, ${pulseAlpha})`);
    ctx.fillStyle = zoneGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Label for Batter's Strongest Scoring Zone
    ctx.save();
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#D4AF37';
    const zoneLabelX = isOffSideDominant ? centerX - boundaryRx * 0.62 : centerX + boundaryRx * 0.25;
    ctx.fillText(
      `BATTER POWER ARC: ${(selectedBatter.shotZoneSplits?.dominantPowerZone || 'OFF-SIDE POWER ARC').toUpperCase()}`,
      zoneLabelX,
      centerY - boundaryRy * 0.68
    );
    ctx.restore();

    // 4. Central 22-Yard Pitch Strip & Bowler's Lethal Control Target Zone
    const pitchW = 34;
    const pitchH = 128;
    const pitchLeft = centerX - pitchW / 2;
    const pitchTop = centerY - pitchH / 2;

    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1.5;
    ctx.fillRect(pitchLeft, pitchTop, pitchW, pitchH);
    ctx.strokeRect(pitchLeft, pitchTop, pitchW, pitchH);

    // Crease lines
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.moveTo(pitchLeft - 4, pitchTop + 14);
    ctx.lineTo(pitchLeft + pitchW + 4, pitchTop + 14);
    ctx.moveTo(pitchLeft - 4, pitchTop + pitchH - 14);
    ctx.lineTo(pitchLeft + pitchW + 4, pitchTop + pitchH - 14);
    ctx.stroke();

    // Pulsing Royal Pink Bowler Target Channel Box on Pitch
    const targetBoxY = pitchTop + 26;
    ctx.save();
    ctx.fillStyle = `rgba(234, 26, 133, ${0.28 + 0.14 * Math.cos(ballProgress * Math.PI * 2)})`;
    ctx.strokeStyle = '#EA1A85';
    ctx.lineWidth = 1.8;
    ctx.fillRect(pitchLeft + 4, targetBoxY, pitchW - 8, 26);
    ctx.strokeRect(pitchLeft + 4, targetBoxY, pitchW - 8, 26);
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#FDA4AF';
    ctx.fillText(
      `BOWLER TARGET: ${(selectedBowler.deliveryTelemetry?.lethalControlChannel || 'BLOCKHOLE YORKER').toUpperCase()}`,
      centerX + 26,
      targetBoxY + 16
    );
    ctx.restore();

    // 5. Draw Previous Completed Balls (Ghost Trails)
    for (let idx = 0; idx < activeBallIdx; idx++) {
      const pastBall = simResult.balls[idx];
      if (!pastBall) continue;
      const rad = ((pastBall.shotAngleDeg - 90) * Math.PI) / 180;
      const endX = centerX + Math.cos(rad) * boundaryRx * pastBall.shotDistanceRatio;
      const endY =
        pitchTop + 16 + Math.sin(rad) * boundaryRy * pastBall.shotDistanceRatio;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, pitchTop + 16);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle =
        pastBall.outcome === '6'
          ? 'rgba(212, 175, 55, 0.28)'
          : pastBall.outcome === '4'
          ? 'rgba(234, 26, 133, 0.28)'
          : 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // 6. Animate Current Active Delivery (Release -> Pitch Bounce -> Shot / Stump Shatter)
    const currentBall = simResult.balls[activeBallIdx];
    if (currentBall) {
      const releasePhase = Math.min(1, ballProgress / 0.42); // 0.0 -> 0.42 is bowler delivery to batter crease
      const shotPhase = Math.max(0, (ballProgress - 0.42) / 0.58); // 0.42 -> 1.0 is shot trajectory or wicket burst

      const bowlerStartX =
        centerX + (currentBall.overOrAround === 'Over' ? -10 : 10);
      const bowlerStartY = pitchTop + pitchH - 12;
      const bounceX = centerX + currentBall.pitchX * (pitchW * 0.8);
      const bounceY =
        pitchTop + 14 + currentBall.pitchY * (pitchH - 28);
      const strikerX = centerX;
      const strikerY = pitchTop + 14;

      // Draw bowler delivery path
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(bowlerStartX, bowlerStartY);
      if (releasePhase < 0.65) {
        const p = releasePhase / 0.65;
        const currX = bowlerStartX + (bounceX - bowlerStartX) * p;
        const currY = bowlerStartY + (bounceY - bowlerStartY) * p;
        ctx.lineTo(currX, currY);
      } else {
        ctx.lineTo(bounceX, bounceY);
        const p2 = (releasePhase - 0.65) / 0.35;
        const currX = bounceX + (strikerX - bounceX) * p2;
        const currY = bounceY + (strikerY - bounceY) * p2;
        ctx.lineTo(currX, currY);
      }
      ctx.strokeStyle = '#EA1A85';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Pitch bounce ring
      if (releasePhase >= 0.65) {
        ctx.beginPath();
        ctx.arc(bounceX, bounceY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#D4AF37';
        ctx.fill();
      }
      ctx.restore();

      // After ball reaches batter (shotPhase > 0)
      if (shotPhase > 0) {
        if (currentBall.isWicket) {
          // Stump-shatter red/gold explosion burst
          const burstRadius = 12 + shotPhase * 42;
          ctx.save();
          ctx.beginPath();
          ctx.arc(strikerX, strikerY, burstRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(239, 68, 68, ${1 - shotPhase * 0.7})`;
          ctx.lineWidth = 4;
          ctx.stroke();

          ctx.font = '900 22px sans-serif';
          ctx.fillStyle = '#EF4444';
          ctx.textAlign = 'center';
          ctx.fillText('WICKET! STUMPS SHATTERED!', centerX, strikerY - 26);
          ctx.restore();
        } else if (currentBall.runs > 0) {
          const rad = ((currentBall.shotAngleDeg - 90) * Math.PI) / 180;
          const targetX =
            centerX +
            Math.cos(rad) * boundaryRx * currentBall.shotDistanceRatio;
          const targetY =
            strikerY +
            Math.sin(rad) * boundaryRy * currentBall.shotDistanceRatio;

          const currShotX = strikerX + (targetX - strikerX) * shotPhase;
          const currShotY = strikerY + (targetY - strikerY) * shotPhase;

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(strikerX, strikerY);
          if (currentBall.runs === 6) {
            // High gold parabolic arc for SIX
            const midX = (strikerX + currShotX) / 2;
            const midY = (strikerY + currShotY) / 2 - 48 * Math.sin(shotPhase * Math.PI);
            ctx.quadraticCurveTo(midX, midY, currShotX, currShotY);
            ctx.strokeStyle = '#D4AF37';
            ctx.lineWidth = 4;
          } else {
            ctx.lineTo(currShotX, currShotY);
            ctx.strokeStyle =
              currentBall.runs === 4 ? '#EA1A85' : '#38BDF8';
            ctx.lineWidth = currentBall.runs === 4 ? 3.5 : 2.5;
          }
          ctx.stroke();

          // Glowing ball head
          ctx.beginPath();
          ctx.arc(currShotX, currShotY, 6, 0, Math.PI * 2);
          ctx.fillStyle =
            currentBall.runs === 6
              ? '#D4AF37'
              : currentBall.runs === 4
              ? '#EA1A85'
              : '#38BDF8';
          ctx.fill();

          // Boundary shockwave for 4 or 6
          if (currentBall.isBoundary && shotPhase > 0.8) {
            const waveR = (shotPhase - 0.8) * 160;
            ctx.beginPath();
            ctx.arc(targetX, targetY, Math.max(4, waveR), 0, Math.PI * 2);
            ctx.strokeStyle =
              currentBall.runs === 6 ? '#D4AF37' : '#EA1A85';
            ctx.lineWidth = 2.5;
            ctx.stroke();
          }
          ctx.restore();
        } else {
          // Dot ball callout
          ctx.save();
          ctx.font = '900 18px monospace';
          ctx.fillStyle = '#38BDF8';
          ctx.textAlign = 'center';
          ctx.fillText('DOT BALL SQUEEZE!', centerX, strikerY - 22);
          ctx.restore();
        }
      }

      // 7. Broadcast Top HUD Bar on Canvas
      ctx.save();
      ctx.fillStyle = 'rgba(10, 14, 26, 0.86)';
      ctx.fillRect(20, 16, W - 40, 54);
      ctx.strokeStyle = 'rgba(234, 26, 133, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(20, 16, W - 40, 54);

      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = '#EA1A85';
      ctx.fillText(
        `BATTER: ${selectedBatter.name.toUpperCase()} (PRR ${selectedBatter.reliabilityScore})`,
        36,
        38
      );
      ctx.font = '11px monospace';
      ctx.fillStyle = '#E2E8F0';
      ctx.fillText(
        `Stroke: ${currentBall.batterStroke} · ${currentBall.shotSide}`,
        36,
        56
      );

      ctx.textAlign = 'right';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = '#D4AF37';
      ctx.fillText(
        `BOWLER: ${selectedBowler.name.toUpperCase()} (PRR ${selectedBowler.reliabilityScore})`,
        W - 36,
        38
      );
      ctx.font = '11px monospace';
      ctx.fillStyle = '#E2E8F0';
      ctx.fillText(
        `${currentBall.overOrAround} Wicket · ${currentBall.bowlerStyle} · ${currentBall.speedKmh} km/h`,
        W - 36,
        56
      );

      // Center Ball & Outcome Callout
      ctx.textAlign = 'center';
      ctx.font = '900 18px monospace';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(
        `BALL ${currentBall.ballLabel} — ${
          currentBall.isWicket
            ? 'WICKET!'
            : currentBall.runs === 6
            ? 'SIX RUNS!'
            : currentBall.runs === 4
            ? 'FOUR RUNS!'
            : `${currentBall.runs} RUN${currentBall.runs === 1 ? '' : 'S'}`
        }`,
        W * 0.5,
        48
      );
      ctx.restore();
    }
  }, [
    simResult,
    activeBallIdx,
    ballProgress,
    selectedBatter,
    selectedBowler,
  ]);

  // Randomize Top-10 Clash handler
  const handleRandomizeTop10Clash = () => {
    const bPool = topBatters.length > 0 ? topBatters : batters.slice(0, 10);
    const bwPool = topBowlers.length > 0 ? topBowlers : bowlers.slice(0, 10);
    if (bPool.length === 0 || bwPool.length === 0) return;

    const randomBatter = bPool[Math.floor(Math.random() * bPool.length)];
    const randomBowler = bwPool[Math.floor(Math.random() * bwPool.length)];
    const newSeed = Math.floor(Math.random() * 9000) + 100;

    setSelectedBatterId(randomBatter.playerId);
    setSelectedBowlerId(randomBowler.playerId);
    setDuelSeed(newSeed);
  };

  const handleStartDuel = () => {
    const newSeed = duelSeed + 1;
    setDuelSeed(newSeed);
    if (selectedBatter && selectedBowler) {
      triggerSimulation(
        selectedBatter.playerId,
        selectedBowler.playerId,
        targetRuns,
        newSeed
      );
    }
  };

  const handleReplayDuel = () => {
    setActiveBallIdx(0);
    setBallProgress(0);
    setIsDuelFinished(false);
    setIsPlaying(true);
  };

  const handleRecordAndDownloadWebm = () => {
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
        a.download = `RR_SuperOver_${selectedBatter?.name.replace(/\s+/g, '_')}_vs_${selectedBowler?.name.replace(/\s+/g, '_')}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsRecording(false);
      };

      recorderRef.current = recorder;
      setIsRecording(true);
      recorder.start();

      // Replay from Ball 0.1 so the entire 6-ball duel is captured
      setActiveBallIdx(0);
      setBallProgress(0);
      setIsDuelFinished(false);
      setIsPlaying(true);
    } catch (err) {
      console.error('Recording failed:', err);
      setIsRecording(false);
    }
  };

  // Running scorecard up to activeBallIdx
  const visibleBalls = simResult ? simResult.balls.slice(0, activeBallIdx + 1) : [];
  const liveRunsScored = visibleBalls.reduce((acc, b) => acc + b.runs, 0);
  const liveWicketsLost = visibleBalls.reduce((acc, b) => acc + (b.isWicket ? 1 : 0), 0);
  const currentBallObj = simResult?.balls[activeBallIdx];

  const batterStrengthSummary = useMemo(() => {
    if (!selectedBatter) return '';
    const zone =
      selectedBatter.shotZoneSplits?.dominantPowerZone || 'Off-Side Power Arc';
    const topStr =
      selectedBatter.shotZoneSplits?.topStrokes
        ?.slice(0, 2)
        .map((s) => s.stroke)
        .join(' & ') || 'Cover Drive & Pull';
    return `Strongest Zone: ${zone} — ${selectedBatter.pressureSR} Pressure SR | Top Stroke: ${topStr}`;
  }, [selectedBatter]);

  const bowlerStrengthSummary = useMemo(() => {
    if (!selectedBowler) return '';
    const weapon =
      selectedBowler.deliveryTelemetry?.lethalControlChannel ||
      'Over the Wicket Yorker & Slower Ball';
    return `Strongest Weapon: ${weapon} — ${selectedBowler.pressureEconomy} Pressure Econ | ${selectedBowler.pressureDotPct}% Dots`;
  }, [selectedBowler]);

  if (!selectedBatter || !selectedBowler) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Top Broadcast Title Banner */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0A0E1A] p-6 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#D4AF37]">
              <Swords className="h-4 w-4 text-[#EA1A85]" />
              <span>6-Ball Super Over Simulator</span>
              <span className="text-white/25">·</span>
              <span className="text-slate-300">Powered by ball_by_ball.csv High-Pressure Profiles</span>
            </div>
            <h1 className="font-condensed text-3xl md:text-4xl font-bold tracking-tight text-white mt-1">
              Head-to-Head Super Over Matchup Arena
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Par Target Selector */}
            <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs">
              <span className="text-slate-300 font-medium">Target:</span>
              {[10, 12, 15, 18].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTargetRuns(t)}
                  className={`rounded-lg px-2 py-0.5 font-mono font-bold transition-colors cursor-pointer ${
                    targetRuns === t
                      ? 'bg-[#D4AF37] text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {t}r
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleRandomizeTop10Clash}
              className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/[0.12] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Shuffle className="h-3.5 w-3.5 text-[#D4AF37]" />
              <span>Randomize Top-10 Clash</span>
            </button>

            <button
              type="button"
              onClick={handleStartDuel}
              className="flex items-center gap-1.5 rounded-xl bg-[#EA1A85] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#d41577] transition-all cursor-pointer whitespace-nowrap"
            >
              <Zap className="h-3.5 w-3.5 text-[#D4AF37]" />
              <span>Start 6-Ball Video Duel</span>
            </button>
          </div>
        </div>

        {/* Split VS Selection Header */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-11 gap-5 items-stretch">
          {/* Left Corner: Batter Selector */}
          <div className="lg:col-span-5 rounded-2xl border border-white/[0.08] bg-[#111728] p-6 flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-semibold text-[#EA1A85]">
                  Striker Selection
                </span>
                <span className="font-mono text-xs font-semibold text-slate-300 tabular-nums">
                  {selectedBatter.unstopRank <= 10
                    ? `Rank #${selectedBatter.unstopRank}`
                    : `PRR ${selectedBatter.reliabilityScore}`}
                </span>
              </div>

              {/* Search + Dropdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={batterSearch}
                    onChange={(e) => setBatterSearch(e.target.value)}
                    placeholder="Filter batter..."
                    className="w-full rounded-xl border border-white/10 bg-[#0A0E1A] pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:border-[#EA1A85] focus:outline-none"
                  />
                </div>
                <select
                  value={selectedBatter.playerId}
                  onChange={(e) => setSelectedBatterId(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-[#0A0E1A] px-3 py-1.5 text-xs font-semibold text-white focus:border-[#EA1A85] focus:outline-none cursor-pointer"
                >
                  {filteredBatters.map((b) => (
                    <option key={b.playerId} value={b.playerId} className="bg-[#0A0E1A]">
                      {b.unstopRank <= 10 ? `#${b.unstopRank} ` : ''}
                      {b.name} ({b.teamName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Batter Portrait + PRR */}
              <div className="flex items-center gap-4">
                <PlayerAvatar
                  name={selectedBatter.name}
                  rank={selectedBatter.unstopRank <= 10 ? selectedBatter.unstopRank : undefined}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="font-condensed text-2xl font-bold text-white truncate">
                    {selectedBatter.name}
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">
                    {selectedBatter.teamName} · {selectedBatter.role} · {selectedBatter.battingType}
                  </p>
                  <div className="mt-2.5 flex items-baseline gap-4 font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">
                        Reliability
                      </span>
                      <span className="text-2xl font-bold text-[#EA1A85] tabular-nums">
                        {selectedBatter.reliabilityScore}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">
                        Pressure SR
                      </span>
                      <span className="text-lg font-bold text-white tabular-nums">
                        {selectedBatter.pressureSR}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">
                        Boundary %
                      </span>
                      <span className="text-lg font-bold text-[#D4AF37] tabular-nums">
                        {selectedBatter.pressureBoundaryPct}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/[0.08] bg-[#0A0E1A] p-3 text-xs text-slate-200">
              <Flame className="inline h-3.5 w-3.5 text-[#EA1A85] mr-1.5" />
              <span className="font-medium">{batterStrengthSummary}</span>
            </div>
          </div>

          {/* Center VS Badge */}
          <div className="lg:col-span-1 flex flex-col items-center justify-center py-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-[#111728] font-condensed text-xl font-bold text-white shadow-md">
              VS
            </div>
            <span className="mt-2 font-mono text-[10px] text-slate-400 text-center">
              6 Balls
            </span>
          </div>

          {/* Right Corner: Bowler Selector */}
          <div className="lg:col-span-5 rounded-2xl border border-white/[0.08] bg-[#111728] p-6 flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-semibold text-[#D4AF37]">
                  Bowler Selection
                </span>
                <span className="font-mono text-xs font-semibold text-slate-300 tabular-nums">
                  {selectedBowler.unstopRank <= 10
                    ? `Rank #${selectedBowler.unstopRank}`
                    : `PRR ${selectedBowler.reliabilityScore}`}
                </span>
              </div>

              {/* Search + Dropdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={bowlerSearch}
                    onChange={(e) => setBowlerSearch(e.target.value)}
                    placeholder="Filter bowler..."
                    className="w-full rounded-xl border border-white/10 bg-[#0A0E1A] pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
                <select
                  value={selectedBowler.playerId}
                  onChange={(e) => setSelectedBowlerId(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-[#0A0E1A] px-3 py-1.5 text-xs font-semibold text-white focus:border-[#D4AF37] focus:outline-none cursor-pointer"
                >
                  {filteredBowlers.map((bw) => (
                    <option key={bw.playerId} value={bw.playerId} className="bg-[#0A0E1A]">
                      {bw.unstopRank <= 10 ? `#${bw.unstopRank} ` : ''}
                      {bw.name} ({bw.teamName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Bowler Portrait + PRR */}
              <div className="flex items-center gap-4">
                <PlayerAvatar
                  name={selectedBowler.name}
                  rank={selectedBowler.unstopRank <= 10 ? selectedBowler.unstopRank : undefined}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="font-condensed text-2xl font-bold text-white truncate">
                    {selectedBowler.name}
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">
                    {selectedBowler.teamName} · {selectedBowler.paceOrSpin} · {selectedBowler.bowlingType}
                  </p>
                  <div className="mt-2.5 flex items-baseline gap-4 font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">
                        Reliability
                      </span>
                      <span className="text-2xl font-bold text-[#D4AF37] tabular-nums">
                        {selectedBowler.reliabilityScore}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">
                        Pressure Econ
                      </span>
                      <span className="text-lg font-bold text-white tabular-nums">
                        {selectedBowler.pressureEconomy}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">
                        Dot Ball %
                      </span>
                      <span className="text-lg font-bold text-emerald-400 tabular-nums">
                        {selectedBowler.pressureDotPct}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/[0.08] bg-[#0A0E1A] p-3 text-xs text-slate-200">
              <Crown className="inline h-3.5 w-3.5 text-[#D4AF37] mr-1.5" />
              <span className="font-medium">{bowlerStrengthSummary}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 16:9 Night-Stadium Broadcast Canvas & Live 6-Ball Scorecard */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#090D16] p-6 text-white shadow-xl">
        {/* Live Broadcast Scorecard Strip */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#111827] px-5 py-3.5">
          <div className="flex items-center gap-6 font-mono">
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">
                Super Over Score
              </span>
              <span className="text-2xl font-bold text-white tabular-nums">
                {liveRunsScored}/{liveWicketsLost}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">
                Par Target
              </span>
              <span className="text-2xl font-bold text-[#D4AF37] tabular-nums">
                {targetRuns} Runs
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">
                Match Equation
              </span>
              <span className="text-sm font-semibold text-pink-300 tabular-nums">
                {Math.max(0, targetRuns - liveRunsScored)} needed off{' '}
                {Math.max(0, 6 - (activeBallIdx + (ballProgress > 0.9 ? 1 : 0)))} balls
              </span>
            </div>
          </div>

          {/* 6-Ball Over Ticker (0.1 to 0.6) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 mr-1">Over Ticker:</span>
            {simResult?.balls.map((b, idx) => {
              const isRevealed = idx <= activeBallIdx;
              const isCurrent = idx === activeBallIdx;
              return (
                <button
                  key={b.ballLabel}
                  type="button"
                  onClick={() => {
                    setActiveBallIdx(idx);
                    setBallProgress(0.85);
                    setIsPlaying(false);
                  }}
                  className={`flex flex-col items-center justify-center rounded-xl border px-2.5 py-1 font-mono transition-all cursor-pointer ${
                    !isRevealed
                      ? 'border-white/[0.08] bg-white/[0.03] text-slate-500'
                      : b.isWicket
                      ? 'border-red-500/60 bg-red-500/20 text-red-300 font-bold'
                      : b.runs === 6
                      ? 'border-[#D4AF37]/60 bg-[#D4AF37]/20 text-[#D4AF37] font-bold'
                      : b.runs === 4
                      ? 'border-[#EA1A85]/60 bg-[#EA1A85]/20 text-pink-200 font-bold'
                      : 'border-white/15 bg-white/10 text-slate-200 font-semibold'
                  } ${isCurrent ? 'ring-1.5 ring-[#D4AF37]' : ''}`}
                >
                  <span className="text-[9px] opacity-75">{b.ballLabel}</span>
                  <span className="text-xs">{isRevealed ? b.outcome : '•'}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Widescreen 16:9 Canvas */}
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/[0.08] bg-[#090D16]">
          <canvas
            ref={canvasRef}
            width={1120}
            height={630}
            className="h-full w-full object-contain"
          />
        </div>

        {/* Live Ball-by-Ball Commentary Callout */}
        {currentBallObj && (
          <div className="mt-4 rounded-xl border border-white/[0.08] bg-[#111827] px-4 py-3 text-xs text-slate-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="rounded-lg bg-[#EA1A85] px-2.5 py-1 font-mono text-xs font-bold text-white">
                {currentBallObj.ballLabel}
              </span>
              <p className="font-medium leading-relaxed">{currentBallObj.commentary}</p>
            </div>
            <span className="font-mono text-[11px] text-[#D4AF37] shrink-0">
              {currentBallObj.speedKmh} km/h
            </span>
          </div>
        )}

        {/* Video Controls & .webm Export Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (isDuelFinished) {
                  handleReplayDuel();
                } else {
                  setIsPlaying((p) => !p);
                }
              }}
              className="flex items-center gap-1.5 rounded-xl bg-[#EA1A85] px-4 py-2 text-xs font-semibold text-white hover:bg-[#d41577] transition-colors cursor-pointer"
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span>{isPlaying ? 'Pause' : isDuelFinished ? 'Play Again' : 'Play'}</span>
            </button>

            <button
              type="button"
              onClick={handleReplayDuel}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 text-[#D4AF37]" />
              <span>Replay Duel</span>
            </button>

            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
              {([1, 2] as const).map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`rounded-lg px-2.5 py-1 font-mono text-xs font-bold transition-colors cursor-pointer ${
                    playbackSpeed === spd
                      ? 'bg-[#D4AF37] text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleRecordAndDownloadWebm}
            disabled={isRecording}
            className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-[#D4AF37] hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>
              {isRecording ? 'Recording 6-Ball Duel (.webm)...' : 'Download Duel Video (.webm)'}
            </span>
          </button>
        </div>
      </div>

      {/* Final Winner Reveal Card */}
      <AnimatePresence>
        {simResult && (isDuelFinished || activeBallIdx === 5) && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            className="rounded-2xl border border-white/[0.08] bg-[#0A0E1A] p-6 md:p-8 text-white shadow-2xl"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#D4AF37] text-slate-950 shadow-md">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#D4AF37]">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>Super Over Result</span>
                  </div>
                  <h2 className="font-condensed text-3xl font-bold text-white mt-1">
                    {simResult.winner === 'batter'
                      ? `${simResult.batterName} Wins for Batting Unit`
                      : `${simResult.bowlerName} Wins for Bowling Unit`}
                  </h2>
                  <p className="text-sm font-semibold text-pink-200 mt-1">
                    {simResult.winMarginText}
                  </p>
                  <p className="text-xs text-slate-300 mt-2 max-w-3xl leading-relaxed">
                    {simResult.tacticalSummary}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleReplayDuel}
                  className="flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/15 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4 text-[#D4AF37]" />
                  <span>Replay Duel</span>
                </button>
                <button
                  type="button"
                  onClick={handleStartDuel}
                  className="flex items-center gap-1.5 rounded-xl bg-[#EA1A85] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#d41577] transition-colors cursor-pointer"
                >
                  <Zap className="h-4 w-4 text-[#D4AF37]" />
                  <span>Simulate Rematch</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
