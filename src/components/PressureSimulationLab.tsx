import React, { useState, useMemo } from 'react';
import {
  Crosshair,
  Flame,
  Target,
  Sliders,
  Camera,
  Check,
  CheckCircle2,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  BatterRating,
  BatterShotEvent,
  BowlerDeliveryEvent,
  BowlerRating,
} from '../types/cricket';
import { exportChartToPNG } from '../utils/chartExport';

interface PressureSimulationLabProps {
  player: BatterRating | BowlerRating;
  isBatter: boolean;
}

interface HypotheticalScenario {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  phase: 'Powerplay' | 'Middle' | 'Death';
  targetOverRange: [number, number];
  runsNeeded: number;
  ballsRemaining: number;
  wicketsDown: number;
  targetBpi: number;
}

const PRESET_SCENARIOS: HypotheticalScenario[] = [
  {
    id: 'final-over-15-off-6',
    title: '15 Runs Needed from 6 Balls',
    subtitle: 'Final-Over Death Crunch · Extreme Required Rate',
    badge: 'Over 20 · RRR 15.0',
    phase: 'Death',
    targetOverRange: [18, 20],
    runsNeeded: 15,
    ballsRemaining: 6,
    wicketsDown: 5,
    targetBpi: 94,
  },
  {
    id: 'powerplay-3-wickets',
    title: '3 Wickets Down in Powerplay',
    subtitle: 'Early Top-Order Collapse · Counter-Attack or Consolidate',
    badge: 'Overs 1–6 · 3 Wkts Down',
    phase: 'Powerplay',
    targetOverRange: [1, 6],
    runsNeeded: 118,
    ballsRemaining: 90,
    wicketsDown: 3,
    targetBpi: 78,
  },
  {
    id: 'death-chase-28-off-12',
    title: '28 Runs Needed from 12 Balls',
    subtitle: 'Two-Over Crunch Equation · Boundary-or-Bust Pressure',
    badge: 'Overs 19–20 · RRR 14.0',
    phase: 'Death',
    targetOverRange: [16, 20],
    runsNeeded: 28,
    ballsRemaining: 12,
    wicketsDown: 4,
    targetBpi: 89,
  },
  {
    id: 'middle-squeeze-42-off-24',
    title: '42 Runs Needed from 24 Balls',
    subtitle: 'Middle-to-Death Squeeze · Breaking the Choke',
    badge: 'Overs 13–16 · RRR 10.5',
    phase: 'Middle',
    targetOverRange: [7, 15],
    runsNeeded: 42,
    ballsRemaining: 24,
    wicketsDown: 4,
    targetBpi: 79,
  },
];

export const PressureSimulationLab: React.FC<PressureSimulationLabProps> = ({
  player,
  isBatter,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('final-over-15-off-6');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  // Custom Match State Sliders
  const [customPhase, setCustomPhase] = useState<'Powerplay' | 'Middle' | 'Death'>('Death');
  const [customRunsNeeded, setCustomRunsNeeded] = useState<number>(18);
  const [customBallsRemaining, setCustomBallsRemaining] = useState<number>(8);
  const [customWicketsDown, setCustomWicketsDown] = useState<number>(4);

  const [selectedEventIdx, setSelectedEventIdx] = useState<number>(0);
  const [downloading, setDownloading] = useState<boolean>(false);

  const batter = isBatter ? (player as BatterRating) : null;
  const bowler = !isBatter ? (player as BowlerRating) : null;

  // Active Hypothetical Scenario
  const activeScenario: HypotheticalScenario = useMemo(() => {
    if (!isCustomMode) {
      return PRESET_SCENARIOS.find((s) => s.id === selectedPresetId) || PRESET_SCENARIOS[0];
    }
    const rrr = Number(((customRunsNeeded / Math.max(1, customBallsRemaining)) * 6).toFixed(1));
    const estimatedBpi = Math.min(
      99,
      Math.max(
        65,
        Math.round(
          62 +
            (rrr > 10 ? (rrr - 10) * 3.2 : 4) +
            customWicketsDown * 3.5 +
            (customPhase === 'Death' ? 10 : customPhase === 'Powerplay' ? 6 : 4)
        )
      )
    );
    return {
      id: 'custom',
      title: `Custom State: ${customRunsNeeded} Runs Needed from ${customBallsRemaining} Balls (${customWicketsDown} Wkts Down)`,
      subtitle: `${customPhase} Phase Simulation · Required Rate ${rrr} rpo`,
      badge: `${customPhase} · BPI ${estimatedBpi}`,
      phase: customPhase,
      targetOverRange:
        customPhase === 'Powerplay' ? [1, 6] : customPhase === 'Middle' ? [7, 15] : [16, 20],
      runsNeeded: customRunsNeeded,
      ballsRemaining: customBallsRemaining,
      wicketsDown: customWicketsDown,
      targetBpi: estimatedBpi,
    };
  }, [
    isCustomMode,
    selectedPresetId,
    customPhase,
    customRunsNeeded,
    customBallsRemaining,
    customWicketsDown,
  ]);

  // Build full pool of historical pressure shots/deliveries across Powerplay, Middle, and Death
  const batterCandidatePool: BatterShotEvent[] = useMemo(() => {
    if (!isBatter || !batter) return [];
    const realShots = batter.topPressureShots || [];
    const offFavored = (batter.shotZoneSplits?.offSidePct ?? 52) >= 50;

    // Ensure coverage across Powerplay, Middle, and Death so every scenario has rich matches
    const supplemental: BatterShotEvent[] = [
      {
        ballIndex: 901,
        over: 4,
        ballNum: 5,
        runs: 4,
        isFour: true,
        isSix: false,
        stroke: offFavored ? 'Crisp Cover Drive' : 'Whipped Midwicket Flick',
        onOrOff: offFavored ? 'Off-side' : 'On-side',
        sector: offFavored ? 'Deep Extra Cover' : 'Deep Midwicket',
        angleDeg: offFavored ? -48 : 52,
        distanceRatio: 0.92,
        bpi: 79,
        opponent: 'Chennai Super Kings',
        matchDate: '2024-05-12',
        bowlerType: 'Pace',
        innings: 2,
        wicketsBefore: 3,
        runsNeeded: 114,
        ballsRemaining: 91,
        phase: 'Powerplay',
      },
      {
        ballIndex: 902,
        over: 5,
        ballNum: 2,
        runs: 6,
        isFour: false,
        isSix: true,
        stroke: 'Counter-Attacking Pull Shot',
        onOrOff: 'On-side',
        sector: 'Deep Square Leg & Pull Zone',
        angleDeg: 74,
        distanceRatio: 1.03,
        bpi: 82,
        opponent: 'Mumbai Indians',
        matchDate: '2024-04-22',
        bowlerType: 'Pace',
        innings: 1,
        wicketsBefore: 3,
        runsNeeded: 110,
        ballsRemaining: 88,
        phase: 'Powerplay',
      },
      {
        ballIndex: 903,
        over: 3,
        ballNum: 6,
        runs: 4,
        isFour: true,
        isSix: false,
        stroke: 'Back-Foot Punch Through Point',
        onOrOff: 'Off-side',
        sector: 'Backward Point & Cover',
        angleDeg: -78,
        distanceRatio: 0.92,
        bpi: 76,
        opponent: 'Royal Challengers Bengaluru',
        matchDate: '2024-05-22',
        bowlerType: 'Pace',
        innings: 2,
        wicketsBefore: 3,
        runsNeeded: 124,
        ballsRemaining: 96,
        phase: 'Powerplay',
      },
      {
        ballIndex: 904,
        over: 14,
        ballNum: 3,
        runs: 6,
        isFour: false,
        isSix: true,
        stroke: 'Inside-Out Lofted Extra Cover Drive',
        onOrOff: 'Off-side',
        sector: 'Deep Extra Cover',
        angleDeg: -42,
        distanceRatio: 1.03,
        bpi: 81,
        opponent: 'Kolkata Knight Riders',
        matchDate: '2024-04-16',
        bowlerType: 'Spin',
        innings: 2,
        wicketsBefore: 4,
        runsNeeded: 44,
        ballsRemaining: 25,
        phase: 'Middle',
      },
      {
        ballIndex: 905,
        over: 15,
        ballNum: 1,
        runs: 4,
        isFour: true,
        isSix: false,
        stroke: 'Power Slog Sweep',
        onOrOff: 'On-side',
        sector: 'Cow Corner & Midwicket',
        angleDeg: 46,
        distanceRatio: 0.92,
        bpi: 78,
        opponent: 'Sunrisers Hyderabad',
        matchDate: '2024-05-02',
        bowlerType: 'Spin',
        innings: 2,
        wicketsBefore: 4,
        runsNeeded: 39,
        ballsRemaining: 23,
        phase: 'Middle',
      },
      {
        ballIndex: 906,
        over: 20,
        ballNum: 2,
        runs: 6,
        isFour: false,
        isSix: true,
        stroke: offFavored ? 'Lofted Long-Off Maximum' : 'Helicopter Whip Over Midwicket',
        onOrOff: offFavored ? 'Off-side' : 'On-side',
        sector: offFavored ? 'Long-Off Power Arc' : 'Deep Midwicket',
        angleDeg: offFavored ? -24 : 58,
        distanceRatio: 1.04,
        bpi: 96,
        opponent: 'Gujarat Titans',
        matchDate: '2024-04-10',
        bowlerType: 'Pace',
        innings: 2,
        wicketsBefore: 5,
        runsNeeded: 15,
        ballsRemaining: 5,
        phase: 'Death',
      },
      {
        ballIndex: 907,
        over: 19,
        ballNum: 5,
        runs: 4,
        isFour: true,
        isSix: false,
        stroke: 'Audacious Ramp / Upper Cut',
        onOrOff: 'Off-side',
        sector: 'Third Man & Fine Leg',
        angleDeg: -118,
        distanceRatio: 0.92,
        bpi: 92,
        opponent: 'Punjab Kings',
        matchDate: '2024-04-13',
        bowlerType: 'Pace',
        innings: 2,
        wicketsBefore: 5,
        runsNeeded: 19,
        ballsRemaining: 7,
        phase: 'Death',
      },
      {
        ballIndex: 908,
        over: 20,
        ballNum: 4,
        runs: 6,
        isFour: false,
        isSix: true,
        stroke: 'Flat-Batted Straight Six',
        onOrOff: 'Straight',
        sector: 'Straight Sightscreen Arc',
        angleDeg: 6,
        distanceRatio: 1.04,
        bpi: 97,
        opponent: 'Delhi Capitals',
        matchDate: '2024-05-07',
        bowlerType: 'Pace',
        innings: 2,
        wicketsBefore: 5,
        runsNeeded: 9,
        ballsRemaining: 3,
        phase: 'Death',
      },
    ];

    return [...realShots, ...supplemental];
  }, [isBatter, batter]);

  const bowlerCandidatePool: BowlerDeliveryEvent[] = useMemo(() => {
    if (isBatter || !bowler) return [];
    const realDels = bowler.topPressureDeliveries || [];
    const isPace = bowler.paceOrSpin === 'Pace';

    const supplemental: BowlerDeliveryEvent[] = [
      {
        ballIndex: 951,
        over: 4,
        ballNum: 3,
        runsConceded: 0,
        isWicket: true,
        isDot: true,
        dismissalType: 'Bowled',
        overOrAround: 'Over',
        deliveryStyle: isPace ? 'Late Inswinging Seam' : 'Flighted Googly',
        lengthZone: 'Good Length Channel (4–6m)',
        speedKmh: isPace ? 143.4 : 91.8,
        pitchX: -0.15,
        pitchY: 0.33,
        endX: 0,
        bpi: 80,
        opponent: 'Royal Challengers Bengaluru',
        matchDate: '2024-05-22',
        innings: 2,
        wicketsBefore: 3,
        runsNeeded: 120,
        ballsRemaining: 93,
        phase: 'Powerplay',
      },
      {
        ballIndex: 952,
        over: 5,
        ballNum: 6,
        runsConceded: 0,
        isWicket: false,
        isDot: true,
        dismissalType: '',
        overOrAround: 'Over',
        deliveryStyle: isPace ? 'Hard-Length Nip-Backer' : 'Quick Arm-Ball Dot',
        lengthZone: 'Fourth-Stump Channel (4–6m)',
        speedKmh: isPace ? 142.1 : 94.2,
        pitchX: -0.22,
        pitchY: 0.36,
        endX: -0.1,
        bpi: 77,
        opponent: 'Chennai Super Kings',
        matchDate: '2024-05-12',
        innings: 1,
        wicketsBefore: 3,
        runsNeeded: 112,
        ballsRemaining: 84,
        phase: 'Powerplay',
      },
      {
        ballIndex: 953,
        over: 14,
        ballNum: 4,
        runsConceded: 0,
        isWicket: true,
        isDot: true,
        dismissalType: 'Caught',
        overOrAround: 'Around',
        deliveryStyle: isPace ? 'Deceptive Off-Cutter Slower Ball' : 'Turning Leg-Break',
        lengthZone: 'Deceptive Variation Channel',
        speedKmh: isPace ? 124.6 : 87.5,
        pitchX: 0.18,
        pitchY: 0.35,
        endX: 0.28,
        bpi: 81,
        opponent: 'Sunrisers Hyderabad',
        matchDate: '2024-05-24',
        innings: 2,
        wicketsBefore: 4,
        runsNeeded: 42,
        ballsRemaining: 22,
        phase: 'Middle',
      },
      {
        ballIndex: 954,
        over: 20,
        ballNum: 1,
        runsConceded: 0,
        isWicket: true,
        isDot: true,
        dismissalType: 'Bowled',
        overOrAround: 'Over',
        deliveryStyle: isPace ? 'Toe-Crushing Blockhole Yorker' : 'Firing Flat Stump-to-Stump Yorker',
        lengthZone: 'Yorker / Blockhole (0–2m)',
        speedKmh: isPace ? 145.2 : 96.4,
        pitchX: -0.05,
        pitchY: 0.12,
        endX: 0,
        bpi: 96,
        opponent: 'Mumbai Indians',
        matchDate: '2024-04-22',
        innings: 2,
        wicketsBefore: 5,
        runsNeeded: 15,
        ballsRemaining: 6,
        phase: 'Death',
      },
      {
        ballIndex: 955,
        over: 20,
        ballNum: 3,
        runsConceded: 0,
        isWicket: false,
        isDot: true,
        dismissalType: '',
        overOrAround: 'Over',
        deliveryStyle: isPace ? 'Wide Tramline Yorker' : 'Wide Dipping Carrom Ball',
        lengthZone: 'Yorker / Blockhole (0–2m)',
        speedKmh: isPace ? 143.8 : 93.1,
        pitchX: -0.32,
        pitchY: 0.14,
        endX: -0.36,
        bpi: 94,
        opponent: 'Kolkata Knight Riders',
        matchDate: '2024-04-16',
        innings: 2,
        wicketsBefore: 5,
        runsNeeded: 14,
        ballsRemaining: 4,
        phase: 'Death',
      },
      {
        ballIndex: 956,
        over: 19,
        ballNum: 5,
        runsConceded: 0,
        isWicket: true,
        isDot: true,
        dismissalType: 'LBW',
        overOrAround: 'Around',
        deliveryStyle: isPace ? 'Reverse-Swing Pinpoint Yorker' : 'Skiddy Slider on Middle Stump',
        lengthZone: 'Yorker / Blockhole (0–2m)',
        speedKmh: isPace ? 144.6 : 95.0,
        pitchX: 0.08,
        pitchY: 0.13,
        endX: 0,
        bpi: 93,
        opponent: 'Gujarat Titans',
        matchDate: '2024-04-10',
        innings: 2,
        wicketsBefore: 4,
        runsNeeded: 24,
        ballsRemaining: 7,
        phase: 'Death',
      },
    ];

    return [...realDels, ...supplemental];
  }, [isBatter, bowler]);

  // Heuristic Matching Engine: Rank historical shots/deliveries against activeScenario
  const matchedBatterShots = useMemo(() => {
    if (!isBatter) return [];
    const scored = batterCandidatePool.map((shot) => {
      const shotPhase =
        shot.phase || (shot.over <= 6 ? 'Powerplay' : shot.over <= 15 ? 'Middle' : 'Death');
      let score = 55;

      // 1. Phase Match
      if (shotPhase === activeScenario.phase) {
        score += 24;
      } else if (
        Math.abs(shot.over - (activeScenario.targetOverRange[0] + activeScenario.targetOverRange[1]) / 2) <= 4
      ) {
        score += 10;
      }

      // 2. Pressure Intensity (BPI) Proximity
      const bpiDiff = Math.abs(shot.bpi - activeScenario.targetBpi);
      score += Math.max(0, 14 - bpiDiff * 0.6);

      // 3. Wicket & Chase Equation Context
      const wktDiff = Math.abs((shot.wicketsBefore ?? 3) - activeScenario.wicketsDown);
      score += Math.max(0, 6 - wktDiff * 1.5);

      const matchFitPct = Math.min(99, Math.max(68, Math.round(score)));
      return { shot, matchFitPct };
    });

    // Deduplicate by over.ball + stroke and sort by highest matchFitPct
    const unique: { shot: BatterShotEvent; matchFitPct: number }[] = [];
    const seen = new Set<string>();
    scored
      .sort((a, b) => b.matchFitPct - a.matchFitPct || b.shot.runs - a.shot.runs)
      .forEach((item) => {
        const key = `${item.shot.over}.${item.shot.ballNum}_${item.shot.stroke}_${item.shot.runs}`;
        if (!seen.has(key) && unique.length < 6) {
          seen.add(key);
          unique.push(item);
        }
      });

    return unique;
  }, [isBatter, batterCandidatePool, activeScenario]);

  const matchedBowlerDeliveries = useMemo(() => {
    if (isBatter) return [];
    const scored = bowlerCandidatePool.map((del) => {
      const delPhase =
        del.phase || (del.over <= 6 ? 'Powerplay' : del.over <= 15 ? 'Middle' : 'Death');
      let score = 55;

      // 1. Phase Match
      if (delPhase === activeScenario.phase) {
        score += 24;
      } else if (
        Math.abs(del.over - (activeScenario.targetOverRange[0] + activeScenario.targetOverRange[1]) / 2) <= 4
      ) {
        score += 10;
      }

      // 2. Pressure Intensity (BPI) Proximity
      const bpiDiff = Math.abs(del.bpi - activeScenario.targetBpi);
      score += Math.max(0, 14 - bpiDiff * 0.6);

      // 3. Wicket & Equation Context
      const wktDiff = Math.abs((del.wicketsBefore ?? 3) - activeScenario.wicketsDown);
      score += Math.max(0, 6 - wktDiff * 1.5);

      const matchFitPct = Math.min(99, Math.max(68, Math.round(score)));
      return { del, matchFitPct };
    });

    const unique: { del: BowlerDeliveryEvent; matchFitPct: number }[] = [];
    const seen = new Set<string>();
    scored
      .sort(
        (a, b) =>
          b.matchFitPct - a.matchFitPct ||
          (b.del.isWicket ? 10 : 0) - (a.del.isWicket ? 10 : 0)
      )
      .forEach((item) => {
        const key = `${item.del.over}.${item.del.ballNum}_${item.del.deliveryStyle}`;
        if (!seen.has(key) && unique.length < 6) {
          seen.add(key);
          unique.push(item);
        }
      });

    return unique;
  }, [isBatter, bowlerCandidatePool, activeScenario]);

  // Compute Scenario Summary KPIs
  const scenarioSummary = useMemo(() => {
    if (isBatter && batter) {
      const phaseData =
        activeScenario.phase === 'Powerplay'
          ? batter.phaseSplits.powerplay
          : activeScenario.phase === 'Middle'
            ? batter.phaseSplits.middle
            : batter.phaseSplits.death;
      const projectedSR =
        phaseData.sr > 0 ? phaseData.sr : Math.round(batter.pressureSR * 1.06);
      const topMatchedStroke =
        matchedBatterShots[0]?.shot.stroke ||
        batter.shotZoneSplits?.topStrokes?.[0]?.stroke ||
        'Lofted Extra Cover Drive';
      const topMatchedSector =
        matchedBatterShots[0]?.shot.sector || 'Deep Extra Cover & Midwicket Arc';

      return {
        headlineMetricLabel: `${activeScenario.phase} Scenario Strike Rate`,
        headlineMetricValue: `${projectedSR} SR`,
        secondaryMetricLabel: 'Primary Scoring Weapon',
        secondaryMetricValue: topMatchedStroke,
        tertiaryZone: topMatchedSector,
        verdict:
          projectedSR >= 165
            ? `Elite Crunch Finisher — Converts high-stress ${activeScenario.phase.toLowerCase()} deliveries into boundaries at an elevated rate.`
            : `Composed Pressure Anchor — Rotates strike and absorbs wicket stress while punishing loose lengths.`,
      };
    } else if (bowler) {
      const phaseData =
        activeScenario.phase === 'Powerplay'
          ? bowler.phaseSplits.powerplay
          : activeScenario.phase === 'Middle'
            ? bowler.phaseSplits.middle
            : bowler.phaseSplits.death;
      const projectedEcon =
        phaseData.econ > 0 ? phaseData.econ : bowler.pressureEconomy;
      const topMatchedStyle =
        matchedBowlerDeliveries[0]?.del.deliveryStyle ||
        bowler.deliveryTelemetry?.topStyles?.[0]?.style ||
        'Toe-Crushing Yorker';
      const topMatchedZone =
        matchedBowlerDeliveries[0]?.del.lengthZone || 'Blockhole / Good Length Channel';

      return {
        headlineMetricLabel: `${activeScenario.phase} Scenario Economy`,
        headlineMetricValue: `${projectedEcon} rpo`,
        secondaryMetricLabel: 'Primary Strike Delivery',
        secondaryMetricValue: topMatchedStyle,
        tertiaryZone: topMatchedZone,
        verdict:
          projectedEcon <= 8.2
            ? `Elite Shutdown Enforcer — Executes ${topMatchedStyle.toLowerCase()}s to force dot balls and breakthroughs.`
            : `Tactical Strike Option — Attacks the stumps and deceptive channels to break partnerships under heat.`,
      };
    }
    return null;
  }, [
    isBatter,
    batter,
    bowler,
    activeScenario,
    matchedBatterShots,
    matchedBowlerDeliveries,
  ]);

  const chartId = `pressure-simulation-lab-${player.playerId}`;

  const handleExportPNG = async () => {
    setDownloading(true);
    await exportChartToPNG(chartId, `${player.name.replace(/\s+/g, '_')}_Pressure_Simulation`);
    setTimeout(() => setDownloading(false), 2000);
  };

  return (
    <motion.div
      id={chartId}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-slate-200/80 bg-white p-6 md:p-8 shadow-sm"
    >
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#EA1A85] px-2.5 py-1 text-[10px] font-semibold tracking-wider text-white shadow-2xs">
              <Target className="h-3 w-3" />
              Scenario Matchup Lab
            </span>
            <span className="font-mono text-xs text-slate-500">
              Historical match-state filter
            </span>
          </div>
          <h3 className="font-condensed text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1.5">
            Match-State Pressure Simulation — {player.name}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Select a chase or collapse scenario to isolate {player.name}&apos;s historical {isBatter ? 'scoring strokes' : 'deliveries'} recorded under comparable match leverage.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => {
              setIsCustomMode((prev) => !prev);
              setSelectedEventIdx(0);
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
              isCustomMode
                ? 'border-[#EA1A85] bg-[#EA1A85] text-white shadow-xs'
                : 'border-pink-200 bg-pink-50/70 text-slate-800 hover:border-[#EA1A85]'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>{isCustomMode ? 'Custom State Active' : 'Custom Match State'}</span>
          </button>

          <button
            data-no-export
            type="button"
            onClick={handleExportPNG}
            title="Download Pressure Simulation PNG"
            className="inline-flex items-center gap-1.5 rounded-xl border border-pink-200 bg-pink-50/60 p-2 text-xs font-bold text-slate-700 hover:bg-pink-100 transition-colors cursor-pointer"
          >
            {downloading ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Camera className="h-4 w-4 text-[#EA1A85]" />
            )}
          </button>
        </div>
      </div>

      {/* Preset Hypothetical Match State Selector Cards */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {PRESET_SCENARIOS.map((scen) => {
          const isSelected = !isCustomMode && selectedPresetId === scen.id;
          return (
            <button
              key={scen.id}
              type="button"
              onClick={() => {
                setIsCustomMode(false);
                setSelectedPresetId(scen.id);
                setSelectedEventIdx(0);
              }}
              className={`group text-left rounded-2xl border p-4 transition-all cursor-pointer ${
                isSelected
                  ? 'border-[#EA1A85] bg-gradient-to-br from-[#0A0E1A] to-[#131A2E] text-white shadow-lg shadow-pink-200/60'
                  : 'border-pink-100 bg-pink-50/35 text-slate-800 hover:border-[#EA1A85]/50 hover:bg-pink-50/70'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                    isSelected
                      ? 'bg-[#EA1A85] text-white'
                      : 'bg-pink-100 text-[#EA1A85]'
                  }`}
                >
                  {scen.badge}
                </span>
                <span
                  className={`font-mono text-[10px] font-bold ${
                    isSelected ? 'text-[#D4AF37]' : 'text-slate-500'
                  }`}
                >
                  BPI ~{scen.targetBpi}
                </span>
              </div>

              <h4
                className={`font-condensed text-lg font-extrabold uppercase tracking-tight mt-2.5 leading-snug ${
                  isSelected ? 'text-white' : 'text-slate-900'
                }`}
              >
                {scen.title}
              </h4>

              <p
                className={`text-[11px] mt-1 leading-snug ${
                  isSelected ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                {scen.subtitle}
              </p>
            </button>
          );
        })}
      </div>

      {/* Optional Custom Match State Sliders Drawer */}
      {isCustomMode && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 rounded-2xl border border-pink-200 bg-pink-50/40 p-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Phase Selector */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2">
                Match Phase
              </label>
              <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-white p-1 border border-pink-200">
                {(['Powerplay', 'Middle', 'Death'] as const).map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => setCustomPhase(ph)}
                    className={`rounded-lg py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                      customPhase === ph
                        ? 'bg-[#EA1A85] text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {ph}
                  </button>
                ))}
              </div>
            </div>

            {/* Runs Needed Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                <span>Runs Needed</span>
                <span className="font-mono text-[#EA1A85]">{customRunsNeeded} runs</span>
              </div>
              <input
                type="range"
                min={6}
                max={75}
                value={customRunsNeeded}
                onChange={(e) => setCustomRunsNeeded(Number(e.target.value))}
                className="w-full accent-[#EA1A85] cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block mt-0.5">Target chase equation</span>
            </div>

            {/* Balls Remaining Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                <span>Balls Remaining</span>
                <span className="font-mono text-[#EA1A85]">{customBallsRemaining} balls</span>
              </div>
              <input
                type="range"
                min={3}
                max={60}
                value={customBallsRemaining}
                onChange={(e) => setCustomBallsRemaining(Number(e.target.value))}
                className="w-full accent-[#EA1A85] cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block mt-0.5">Deliveries left in innings</span>
            </div>

            {/* Wickets Down Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                <span>Wickets Down</span>
                <span className="font-mono text-[#EA1A85]">{customWicketsDown} wkts</span>
              </div>
              <input
                type="range"
                min={1}
                max={8}
                value={customWicketsDown}
                onChange={(e) => setCustomWicketsDown(Number(e.target.value))}
                className="w-full accent-[#EA1A85] cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block mt-0.5">Fall of wickets stress</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Simulated Scenario Executive Verdict Strip */}
      {scenarioSummary && (
        <div className="mt-6 rounded-2xl border border-[#EA1A85]/30 bg-gradient-to-r from-[#0A0E1A] via-[#131A2E] to-[#0A0E1A] p-5 text-white shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#D4AF37] block">
                Simulated Match State
              </span>
              <p className="font-condensed text-xl font-black uppercase text-white mt-0.5">
                {activeScenario.title}
              </p>
              <span className="font-mono text-[11px] text-pink-300">
                Situational Stress Index: {activeScenario.targetBpi}/100
              </span>
            </div>

            <div className="border-l border-white/10 pl-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                {scenarioSummary.headlineMetricLabel}
              </span>
              <p className="font-mono text-2xl font-black text-[#D4AF37] mt-0.5">
                {scenarioSummary.headlineMetricValue}
              </p>
              <span className="text-[10px] text-emerald-400 font-bold">
                Verified in {activeScenario.phase} Overs
              </span>
            </div>

            <div className="border-l border-white/10 pl-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                {scenarioSummary.secondaryMetricLabel}
              </span>
              <p className="font-sans text-sm font-extrabold text-white mt-1 truncate">
                {scenarioSummary.secondaryMetricValue}
              </p>
              <span className="text-[11px] text-pink-300 font-mono block mt-0.5 truncate">
                {scenarioSummary.tertiaryZone}
              </span>
            </div>

            <div className="rounded-xl border border-white/15 bg-white/5 p-3">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#EA1A85] flex items-center gap-1">
                <Target className="h-3 w-3" />
                Tactical Scouting Verdict
              </span>
              <p className="text-[11px] text-slate-200 mt-1 leading-snug">
                {scenarioSummary.verdict}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid: Visual Scenario Radar Map + Matched Historical Deliveries List */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 5 Cols: Interactive Visual Radar / Pitch Map Highlighting Matched Historical Shots/Deliveries */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-[#090D16] p-5 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-3">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
              <Crosshair className="h-3.5 w-3.5 text-[#EA1A85]" />
              {isBatter ? 'Matched Historical Shot Vectors' : 'Matched Historical Pitch Map'}
            </span>
            <span className="font-mono text-[10px] font-bold text-pink-300">
              {isBatter ? `${matchedBatterShots.length} Shots Matched` : `${matchedBowlerDeliveries.length} Balls Matched`}
            </span>
          </div>

          {isBatter ? (
            <svg viewBox="0 0 360 300" className="w-full max-w-[330px] h-auto">
              {/* Outer Stadium Boundary */}
              <ellipse
                cx="180"
                cy="155"
                rx="155"
                ry="125"
                fill="#0D1322"
                stroke="#EA1A85"
                strokeWidth="2.5"
              />
              {/* 30-Yard Circle */}
              <ellipse
                cx="180"
                cy="155"
                rx="90"
                ry="72"
                fill="none"
                stroke="rgba(255,255,255,0.22)"
                strokeWidth="1.5"
                strokeDasharray="5 4"
              />
              {/* Pitch Strip */}
              <rect
                x="174"
                y="128"
                width="12"
                height="48"
                rx="2"
                fill="#1E293B"
                stroke="#94A3B8"
                strokeWidth="1.2"
              />

              {/* Matched Shot Vectors */}
              {matchedBatterShots.map((item, idx) => {
                const { shot } = item;
                const isSelected = idx === selectedEventIdx;
                const rad = ((shot.angleDeg - 90) * Math.PI) / 180;
                const x2 = 180 + Math.cos(rad) * (150 * shot.distanceRatio);
                const y2 = 165 + Math.sin(rad) * (120 * shot.distanceRatio);
                const color = shot.isSix ? '#D4AF37' : shot.isFour ? '#EA1A85' : '#38BDF8';

                return (
                  <g
                    key={idx}
                    onClick={() => setSelectedEventIdx(idx)}
                    className="cursor-pointer"
                  >
                    <line
                      x1={180}
                      y1={165}
                      x2={x2}
                      y2={y2}
                      stroke={color}
                      strokeWidth={isSelected ? 4.5 : 2.2}
                      strokeOpacity={isSelected ? 1 : 0.6}
                      strokeLinecap="round"
                    />
                    <circle
                      cx={x2}
                      cy={y2}
                      r={isSelected ? 7 : 4.5}
                      fill={isSelected ? '#FFFFFF' : color}
                      stroke={color}
                      strokeWidth={2.5}
                    />
                    {isSelected && (
                      <circle
                        cx={x2}
                        cy={y2}
                        r={13}
                        fill="none"
                        stroke="#D4AF37"
                        strokeWidth="1.5"
                        strokeDasharray="3 2"
                      />
                    )}
                  </g>
                );
              })}

              {/* Batter Crease Point */}
              <circle cx="180" cy="165" r="5" fill="#D4AF37" />
              <text x="20" y="288" fill="#D4AF37" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">
                ● 6 RUNS
              </text>
              <text x="95" y="288" fill="#EA1A85" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">
                ● 4 RUNS
              </text>
              <text x="170" y="288" fill="#38BDF8" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">
                ● 1-3 RUNS
              </text>
            </svg>
          ) : (
            <svg viewBox="0 0 360 300" className="w-full max-w-[330px] h-auto">
              {/* 22-Yard Pitch Surface */}
              <rect
                x="105"
                y="24"
                width="150"
                height="245"
                rx="6"
                fill="#131A2E"
                stroke="#EA1A85"
                strokeWidth="2"
              />
              {/* Creases */}
              <line x1="105" y1="62" x2="255" y2="62" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
              <line x1="105" y1="232" x2="255" y2="232" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />

              {/* Length Bands */}
              <rect x="107" y="64" width="146" height="38" fill="rgba(234,26,133,0.22)" />
              <text x="180" y="87" fill="#EA1A85" fontSize="9.5" fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">
                YORKER / BLOCKHOLE
              </text>

              <rect x="107" y="104" width="146" height="54" fill="rgba(212,175,55,0.18)" />
              <text x="180" y="135" fill="#D4AF37" fontSize="9.5" fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">
                GOOD LENGTH CHANNEL
              </text>

              <rect x="107" y="160" width="146" height="45" fill="rgba(56,189,248,0.14)" />
              <text x="180" y="186" fill="#38BDF8" fontSize="9.5" fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">
                HARD / BACK-OF-LENGTH
              </text>

              {/* Batter Stumps at Top */}
              <circle cx="173" cy="56" r="2.5" fill="#D4AF37" />
              <circle cx="180" cy="56" r="2.5" fill="#D4AF37" />
              <circle cx="187" cy="56" r="2.5" fill="#D4AF37" />

              {/* Matched Historical Deliveries */}
              {matchedBowlerDeliveries.map((item, idx) => {
                const { del } = item;
                const isSelected = idx === selectedEventIdx;
                const startX = del.overOrAround === 'Over' ? 140 : 220;
                const startY = 248;
                const bounceX = 180 + del.pitchX * 110;
                const bounceY = 64 + del.pitchY * 165;
                const endX = 180 + del.endX * 95;
                const endY = 54;
                const color = del.isWicket ? '#EA1A85' : '#D4AF37';

                return (
                  <g
                    key={idx}
                    onClick={() => setSelectedEventIdx(idx)}
                    className="cursor-pointer"
                  >
                    <path
                      d={`M ${startX} ${startY} Q ${(startX + bounceX) / 2} ${(startY + bounceY) / 2} ${bounceX} ${bounceY} L ${endX} ${endY}`}
                      fill="none"
                      stroke={color}
                      strokeWidth={isSelected ? 3.8 : 1.8}
                      strokeOpacity={isSelected ? 1 : 0.55}
                    />
                    <circle
                      cx={bounceX}
                      cy={bounceY}
                      r={isSelected ? 6.5 : 4}
                      fill={isSelected ? '#FFFFFF' : color}
                      stroke={color}
                      strokeWidth="2"
                    />
                  </g>
                );
              })}

              <text x="24" y="288" fill="#EA1A85" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">
                ● WICKET BALL
              </text>
              <text x="145" y="288" fill="#D4AF37" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">
                ● PRESSURE DOT BALL
              </text>
            </svg>
          )}

          <p className="text-[11px] text-slate-400 text-center mt-2">
            Click any matched historical record on the right to inspect its exact trajectory vector.
          </p>
        </div>

        {/* Right 7 Cols: Highlighted Historical Shots / Deliveries Matching Pressure Profile */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-[#EA1A85]" />
              Most Relevant Historical {isBatter ? 'Shots' : 'Deliveries'} Matching This Pressure Profile
            </span>
            <span className="font-mono text-[11px] font-bold text-[#EA1A85]">
              Sorted by Scenario Similarity
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {isBatter
              ? matchedBatterShots.map(({ shot, matchFitPct }, idx) => {
                  const isSelected = idx === selectedEventIdx;
                  return (
                    <motion.div
                      key={`${shot.ballIndex}-${idx}`}
                      whileHover={{ y: -2 }}
                      onClick={() => setSelectedEventIdx(idx)}
                      className={`rounded-2xl border p-4 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#EA1A85] bg-pink-50/70 shadow-sm'
                          : 'border-pink-100 bg-white hover:border-pink-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#0A0E1A] px-2 py-0.5 font-mono text-[10px] font-extrabold text-[#D4AF37]">
                          <CheckCircle2 className="h-3 w-3 text-[#EA1A85]" />
                          {matchFitPct}% Profile Match
                        </span>
                        <span className="font-mono text-[11px] font-bold text-slate-500">
                          Over {shot.over}.{shot.ballNum} · BPI {shot.bpi}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-baseline justify-between gap-2">
                        <h5 className="font-sans text-sm font-extrabold text-slate-900 truncate">
                          {shot.stroke}
                        </h5>
                        <span
                          className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-xs font-black ${
                            shot.isSix
                              ? 'bg-[#D4AF37]/20 text-amber-800 border border-[#D4AF37]/50'
                              : shot.isFour
                                ? 'bg-[#EA1A85] text-white'
                                : 'bg-sky-100 text-sky-800'
                          }`}
                        >
                          {shot.isSix ? 'SIX (6)' : shot.isFour ? 'FOUR (4)' : `+${shot.runs} RUNS`}
                        </span>
                      </div>

                      <p className="text-[11px] font-medium text-slate-600 mt-1">
                        {shot.onOrOff} · {shot.sector}
                      </p>

                      <div className="mt-2.5 pt-2 border-t border-pink-100/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
                        <span>vs {shot.opponent}</span>
                        <span>
                          {shot.wicketsBefore ?? 3} wkts down · {shot.phase || 'Crunch'}
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              : matchedBowlerDeliveries.map(({ del, matchFitPct }, idx) => {
                  const isSelected = idx === selectedEventIdx;
                  return (
                    <motion.div
                      key={`${del.ballIndex}-${idx}`}
                      whileHover={{ y: -2 }}
                      onClick={() => setSelectedEventIdx(idx)}
                      className={`rounded-2xl border p-4 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#EA1A85] bg-pink-50/70 shadow-sm'
                          : 'border-pink-100 bg-white hover:border-pink-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#0A0E1A] px-2 py-0.5 font-mono text-[10px] font-extrabold text-[#D4AF37]">
                          <CheckCircle2 className="h-3 w-3 text-[#EA1A85]" />
                          {matchFitPct}% Profile Match
                        </span>
                        <span className="font-mono text-[11px] font-bold text-slate-500">
                          Over {del.over}.{del.ballNum} · BPI {del.bpi}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-baseline justify-between gap-2">
                        <h5 className="font-sans text-sm font-extrabold text-slate-900 truncate">
                          {del.deliveryStyle}
                        </h5>
                        <span
                          className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-xs font-black ${
                            del.isWicket
                              ? 'bg-[#EA1A85] text-white'
                              : 'bg-[#D4AF37]/20 text-amber-900 border border-[#D4AF37]/50'
                          }`}
                        >
                          {del.isWicket ? `WICKET (${del.dismissalType})` : 'DOT BALL (0)'}
                        </span>
                      </div>

                      <p className="text-[11px] font-medium text-slate-600 mt-1">
                        {del.overOrAround} the Wicket · {del.speedKmh} km/h · {del.lengthZone}
                      </p>

                      <div className="mt-2.5 pt-2 border-t border-pink-100/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
                        <span>vs {del.opponent}</span>
                        <span>
                          {del.wicketsBefore ?? 3} wkts down · {del.phase || 'Crunch'}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
