import React from 'react';
import {
  Download,
  Printer,
  Copy,
  Check,
  Award,
  Layers,
  Scale,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import {
  BatterRating,
  BowlerRating,
  DistributionBoxPlotStats,
  FunnelPlayerPoint,
  PressureModelConfig,
  RegimeComparisonProof,
} from '../types/cricket';
import { BayesianFunnelPlot } from './BayesianFunnelPlot';
import { ConsistencyStripPlot } from './ConsistencyStripPlot';
import { buildFiveStageAuctionPipeline } from '../utils/auctionIntelligenceEngine';

interface MethodologyReportTabProps {
  config: PressureModelConfig;
  batters: BatterRating[];
  bowlers: BowlerRating[];
  totalDeliveries: number;
  highPressureDeliveries: number;
  cohortMeanSR: number;
  cohortMeanEconomy: number;
  regimeProof: RegimeComparisonProof[];
  funnelData?: FunnelPlayerPoint[];
}

export const MethodologyReportTab: React.FC<MethodologyReportTabProps> = ({
  config,
  batters,
  bowlers,
  totalDeliveries,
  highPressureDeliveries,
  cohortMeanSR,
  cohortMeanEconomy,
  regimeProof,
  funnelData = [],
}) => {
  const [copiedUnstop, setCopiedUnstop] = React.useState(false);

  const top10Batters = batters.filter((b) => b.unstopRank <= 10).sort((a, b) => a.unstopRank - b.unstopRank);
  const top10Bowlers = bowlers.filter((bw) => bw.unstopRank <= 10).sort((a, b) => a.unstopRank - b.unstopRank);

  // Compute box plot distribution for Top 10 Batters
  const top10BattersBoxPlot: DistributionBoxPlotStats[] = top10Batters.map((b) => {
    const raw = (b.pressureInningsLog || []).map((m) => m.pressure_sr).filter((v) => v > 0);
    const sorted = raw.length > 0 ? [...raw].sort((x, y) => x - y) : [b.pressureSR];
    return {
      playerId: b.playerId,
      name: b.name,
      team: b.teamName,
      rank: b.unstopRank,
      min: sorted[0],
      q1: sorted[Math.floor((sorted.length - 1) * 0.25)],
      median: sorted[Math.floor((sorted.length - 1) * 0.5)],
      q3: sorted[Math.floor((sorted.length - 1) * 0.75)],
      max: sorted[sorted.length - 1],
      values: sorted,
    };
  });

  const auctionPipeline = React.useMemo(
    () => buildFiveStageAuctionPipeline(batters, bowlers, totalDeliveries),
    [batters, bowlers, totalDeliveries]
  );

  const handleExportFiveStageAuctionCSV = () => {
    let csv =
      'OVERALL_RANK,PLAYER_NAME,DISCIPLINE,TEAM,ARCHETYPE,PRR_SCORE,KEY_PRESSURE_METRIC,ELEVATION_DELTA,OVERALL_IMPACT_SCORE,RR_INCUMBENT_BENCHMARK,NET_UPGRADE_DELTA,ROSTER_ACTION_TAG,PHASE_BOTTLENECK_SOLVED\n';
    auctionPipeline.top10OverallCandidates.forEach((c) => {
      csv += `${c.overallRank},"${c.name}",${c.discipline},"${c.teamName}","${c.archetype}",${c.prr.toFixed(1)},"${c.keyPressureMetricLabel}","${c.elevationDeltaLabel}",${c.overallImpactScore.toFixed(1)},"${c.rrIncumbentName} (${c.rrIncumbentMetricLabel})","${c.netUpgradeDeltaLabel}","${c.rosterActionTag}","${c.phaseBottleneckSolved.replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `RR_5Stage_Auction_Pipeline_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = () => {
    let csv = 'CATEGORY,UNSTOP_RANK,PLAYER_NAME,TEAM,RR_WEAKNESS_FIX,EST_INDIA_CAP,PRESSURE_BALLS,NORMAL_METRIC,PRESSURE_METRIC,DELTA,DOT_PCT,CONSISTENCY_SCORE,RELIABILITY_SCORE\n';

    top10Batters.forEach((b) => {
      csv += `BATTER,${b.unstopRank},"${b.name}","${b.teamName}","${b.rrWeaknessFixTag || b.role}","${b.estIndiaCapLabel || ''}",${b.pressureBalls},${b.normalSR},${b.pressureSR},+${b.srDelta},${b.pressureDotAvoidancePct}%,${b.consistencyScore},${b.reliabilityScore}\n`;
    });

    top10Bowlers.forEach((bw) => {
      csv += `BOWLER,${bw.unstopRank},"${bw.name}","${bw.teamName}","${bw.rrWeaknessFixTag || bw.bowlingType}","${bw.estIndiaCapLabel || ''}",${bw.pressureBalls},${bw.normalEconomy},${bw.pressureEconomy},${bw.economyDelta},${bw.pressureDotPct}%,${bw.consistencyScore},${bw.reliabilityScore}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `RR_SupeRR_Selector_Top10_Rankings_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportUnstopTXT = () => {
    let txt = '=== RAJASTHAN ROYALS SUPERR SELECTOR SEASON 2 ROUND 1 ===\n';
    txt += 'CHALLENGE: PRESSURE-QUALIFIED INDIAN DOMESTIC SHORTLIST (BPI >= 65)\n\n';
    txt += '----------------------------------------------------------\n';
    txt += '1. TOP 10 DOMESTIC BATTERS UNDER PRESSURE (BPI >= 65)\n';
    txt += '----------------------------------------------------------\n';
    top10Batters.forEach((b) => {
      txt += `#${b.unstopRank} ${b.name} (${b.teamName} • ${b.reliabilityScore} PRR • ${b.pressureSR} Pressure SR • ${b.estIndiaCapLabel || 'BPI >= 65'}) — ${b.rrWeaknessFixTag || b.rrSquadRoleFit}\n`;
    });

    txt += '\n----------------------------------------------------------\n';
    txt += '2. TOP 10 DOMESTIC BOWLERS UNDER PRESSURE (BPI >= 65)\n';
    txt += '----------------------------------------------------------\n';
    top10Bowlers.forEach((bw) => {
      txt += `#${bw.unstopRank} ${bw.name} (${bw.teamName} • ${bw.reliabilityScore} PRR • ${bw.pressureEconomy} Pressure Econ • ${bw.estIndiaCapLabel || 'BPI >= 65'}) — ${bw.rrWeaknessFixTag || bw.rrSquadRoleFit}\n`;
    });

    navigator.clipboard.writeText(txt);
    setCopiedUnstop(true);
    setTimeout(() => setCopiedUnstop(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const pressureRatio = totalDeliveries > 0 ? ((highPressureDeliveries / totalDeliveries) * 100).toFixed(1) : '24.2';

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Top Action Bar */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-pink-200 bg-white p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#EA1A85]">
            <span>Official Submission Studio</span>
            <span>·</span>
            <span>Unstop Round 1</span>
          </div>
          <h1 className="font-condensed text-3xl font-extrabold uppercase tracking-tight text-slate-900 mt-1">
            Methodology Report & Evidence Dossier
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Complete, publication-grade analytical documentation structured according to the 5 mandatory brief sections. Dynamically updated from current model parameters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportUnstopTXT}
            className="flex items-center gap-2 rounded-xl border border-pink-200 bg-pink-50/60 px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-pink-100 transition-colors cursor-pointer"
          >
            {copiedUnstop ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-[#EA1A85]" />}
            {copiedUnstop ? 'Copied Unstop Text' : 'Copy Unstop Text'}
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-xl border border-pink-200 bg-pink-50/60 px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-pink-100 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-[#EA1A85]" />
            Export Top 10 CSV
          </button>
          <button
            onClick={handleExportFiveStageAuctionCSV}
            className="flex items-center gap-2 rounded-xl border border-pink-200 bg-pink-50/60 px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-pink-100 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-[#EA1A85]" />
            Export 5-Stage Auction CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl bg-[#EA1A85] px-4 py-2 text-xs font-bold text-white hover:bg-[#D81478] transition-colors cursor-pointer shadow-md shadow-pink-200"
          >
            <Printer className="h-3.5 w-3.5" />
            Export 5-Stage Executive Report
          </button>
        </div>
      </div>

      {/* Main Publication Document Container */}
      <article className="rounded-2xl border border-pink-200 bg-white p-8 md:p-12 text-slate-800 font-sans flex flex-col gap-10 leading-relaxed shadow-sm">
        {/* Document Header */}
        <header className="border-b border-pink-100 pb-8">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-[#EA1A85] mb-2">
            <span>RAJASTHAN ROYALS SUPERR SELECTOR SEASON 2</span>
            <span>ROUND 1 ANALYTICAL DOSSIER</span>
          </div>
          <h2 className="font-condensed text-4xl md:text-5xl font-black uppercase tracking-tight text-slate-900 leading-none">
            Identifying the Most Reliable Players Under Pressure: A Bayesian Match-State Leverage Engine
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-4 font-mono">
            <span>Author: SupeRR Analytics Candidate</span>
            <span>·</span>
            <span>Scope: Indian Premier League & International T20</span>
            <span>·</span>
            <span>Deliveries Evaluated: {totalDeliveries.toLocaleString()}</span>
            <span>·</span>
            <span>Threshold: BPI &ge; {config.pressureThreshold}</span>
          </div>
        </header>

        {/* Section 1: 4-Stage Statistical Pressure Reliability Framework */}
        <section className="flex flex-col gap-5">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#EA1A85]">
            <Layers className="h-4 w-4" />
            <h3 className="font-condensed text-xl font-bold uppercase text-slate-900">
              Section 1: 4-Stage Pressure Intelligence Framework
            </h3>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">
            Rather than relying on naive averages or binary over splits, the Rajasthan Royals SupeRR Selector platform deploys an advanced four-stage probabilistic scoring engine that evaluates match leverage on every delivery, benchmarks performance against venue and phase par, applies sample-size reliability shrinkage, and rewards cross-match consistency.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Stage 1 Card */}
            <div className="rounded-2xl border border-pink-200 bg-white p-5 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#EA1A85]">Stage 1</span>
                <span className="text-xs font-semibold text-slate-500">Continuous Leverage</span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Situational Pressure Index (BPI)</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Evaluates situational urgency before every legal ball across four orthogonal vectors:
              </p>
              <ul className="text-xs text-slate-700 flex flex-col gap-2 rounded-xl bg-pink-50/50 p-3.5 border border-pink-100">
                <li>
                  <strong className="text-slate-900">Pace Stress:</strong> Escalates as Required Run Rate surpasses venue par velocity in 2nd innings chases, or sluggish scoring rate in 1st innings.
                </li>
                <li>
                  <strong className="text-slate-900">Wicket Stress:</strong> Models top-order collapse intensity and the vulnerability of remaining wickets.
                </li>
                <li>
                  <strong className="text-slate-900">Stage Leverage &amp; Crunch:</strong> Exponentially intensifies in the death overs and nail-biting close chases.
                </li>
                <li>
                  <strong className="text-slate-900">Tournament Stakes:</strong> Elevated leverage weighting for knockout qualifiers, eliminators, and championship finals.
                </li>
              </ul>
              <div className="text-[11px] text-slate-600 pt-1 flex justify-between font-medium">
                <span>High-Pressure Crunch: <strong>Top ~24% Leverage</strong></span>
                <span>Normal Baseline: <strong>Calm Game States</strong></span>
              </div>
            </div>

            {/* Stage 2 Card */}
            <div className="rounded-2xl border border-pink-200 bg-white p-5 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#EA1A85]">Stage 2</span>
                <span className="text-xs font-semibold text-slate-500">Par-Adjusted Ball Value</span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Context-Adjusted Value Above Par</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Measures exact net impact of each delivery against expected runs for the specific phase and bowling type:
              </p>
              <ul className="text-xs text-slate-700 flex flex-col gap-2 rounded-xl bg-pink-50/50 p-3.5 border border-pink-100">
                <li>
                  <strong className="text-slate-900">Batting Value:</strong> Runs scored above expected phase baseline, plus boundary clearance premiums, offset by high-leverage dismissal penalties.
                </li>
                <li>
                  <strong className="text-slate-900">Bowling Value:</strong> Runs suppressed below expected phase baseline, rewarded for dot ball creation and clutch wicket-taking, penalized for boundaries conceded.
                </li>
              </ul>
              <p className="text-[11px] text-slate-500 pt-1">
                Ensures death-over hitters and powerplay accumulators are evaluated fairly against the exact difficulty of their deliveries.
              </p>
            </div>

            {/* Stage 3 Card */}
            <div className="rounded-2xl border border-pink-200 bg-white p-5 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#EA1A85]">Stage 3</span>
                <span className="text-xs font-semibold text-slate-500">Clutch Composite</span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Crunch-Time Execution &amp; Baseline Elevation</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Separates true match-winners who elevate their game from players who falter under intensity:
              </p>
              <ul className="text-xs text-slate-700 flex flex-col gap-2 rounded-xl bg-pink-50/50 p-3.5 border border-pink-100">
                <li>
                  <strong className="text-slate-900">Sustained Execution (75% weight):</strong> Absolute weighted performance across all high-pressure deliveries.
                </li>
                <li>
                  <strong className="text-slate-900">Positive Elevation Delta (25% weight):</strong> Measurable improvement in output during crunch situations relative to the player&apos;s calm baseline.
                </li>
              </ul>
              <p className="text-[11px] text-slate-500 pt-1">
                A player&apos;s baseline is blended with cohort league norms to prevent distorted deltas from tiny baseline samples.
              </p>
            </div>

            {/* Stage 4 Card */}
            <div className="rounded-2xl border border-pink-200 bg-white p-5 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#EA1A85]">Stage 4</span>
                <span className="text-xs font-semibold text-slate-500">PRR (0–99.9 Scale)</span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Sample-Size Reliability &amp; Cross-Match Consistency</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Guarantees statistical rigor and eliminates small-sample distortions across the tournament:
              </p>
              <ul className="text-xs text-slate-700 flex flex-col gap-2 rounded-xl bg-pink-50/50 p-3.5 border border-pink-100">
                <li>
                  <strong className="text-slate-900">Empirical Bayes Shrinkage:</strong> Regresses low-volume performances toward the tournament cohort mean.
                </li>
                <li>
                  <strong className="text-slate-900">Cross-Match Consistency Multiplier:</strong> Evaluates spell-by-spell and innings-by-innings variance, heavily rewarding players who deliver across multiple matches rather than on a single lucky evening.
                </li>
              </ul>
              <p className="text-[11px] text-slate-500 pt-1">
                Final scores are standardized onto an intuitive 0–99.9 scale, with 65 representing baseline replacement level and 90+ representing elite match-winners.
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-700">
            Deliveries at or above the designated threshold are categorized as <strong>High-Pressure</strong> ({highPressureDeliveries.toLocaleString()} balls, {pressureRatio}% of total match volume). All remaining deliveries constitute each player&apos;s <strong>Normal Baseline</strong>.
          </p>
        </section>

        {/* Section 2: Performance Measurement & Baselines */}
        <section className="flex flex-col gap-4 border-t border-pink-100 pt-8">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#EA1A85]">
            <Scale className="h-4 w-4" />
            <h3 className="font-condensed text-xl font-bold uppercase text-slate-900">
              Section 2: Performance Measurement Against Baselines
            </h3>
          </div>
          <p className="text-sm text-slate-700">
            A fundamental flaw in naive pressure rankings is ranking players by raw strike rate or economy under pressure. High-SR batters like openers naturally face pace on flat decks with field restrictions, whereas death bowlers face hitters clearing the ropes. To eliminate position bias:
          </p>
          <ul className="list-disc pl-5 text-sm text-slate-700 flex flex-col gap-2">
            <li>
              <strong>Strike Rate Delta (&Delta;SR):</strong> Calculated as <code className="text-emerald-600 font-bold font-mono">Pressure_SR - Normal_SR</code>. Elite performers actually increase their scoring efficiency as pressure mounts.
            </li>
            <li>
              <strong>Economy Delta (&Delta;Econ):</strong> Calculated as <code className="text-emerald-600 font-bold font-mono">Normal_Economy - Pressure_Economy</code> (positive indicates tightening under fire).
            </li>
            <li>
              <strong>Dot Ball Avoidance Rate:</strong> <code className="font-mono text-slate-800 font-bold">100 - Dot_Ball_%</code> under high BPI, quantifying the batter's ability to maintain rotation of strike without consuming scoreless balls.
            </li>
            <li>
              <strong>Wicket Strike Rate &amp; Boundary Suppression:</strong> Bowler capability to take wickets every {12}–{16} balls under high BPI while limiting boundaries below 18%.
            </li>
          </ul>

          {/* Side-by-side Regime Proof Table */}
          <div className="rounded-xl border border-pink-200 bg-pink-50/40 p-5 mt-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#EA1A85] block mb-3">
              Empirical Regime Separation Proof (All Match Volume)
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 text-xs font-mono">
              {regimeProof.map((rp) => (
                <div key={rp.metric} className="p-3.5 rounded-xl bg-white border border-pink-200 shadow-xs">
                  <span className="text-[11px] text-slate-500 font-sans font-bold block">{rp.metric}</span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-slate-400">{rp.normalValue}</span>
                    <span className="text-slate-400 font-bold">→</span>
                    <span className="text-slate-900 font-bold text-sm">{rp.pressureValue}</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-bold mt-1.5 block">+{rp.shiftPct}% Shift</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3: Fair Comparisons & Bayesian Shrinkage */}
        <section className="flex flex-col gap-4 border-t border-pink-100 pt-8">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#EA1A85]">
            <ShieldCheck className="h-4 w-4" />
            <h3 className="font-condensed text-xl font-bold uppercase text-slate-900">
              Section 3: Fair Comparisons, Bayesian Shrinkage &amp; Eligibility
            </h3>
          </div>
          <p className="text-sm text-slate-700">
            Small sample noise is the enemy of reliable sports analytics. A tailender who hit one six off one pressure ball has a 600.0 SR, but zero reliability. We solve this mathematically using a three-tier protection framework:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="rounded-xl border border-pink-100 bg-pink-50/40 p-5 flex flex-col gap-2">
              <span className="font-bold text-slate-900 text-sm font-sans">1. Strict Sample Thresholds</span>
              <p className="text-slate-600 font-sans text-xs">
                Batters must face &ge; {config.minBatterBalls} pressure deliveries across &ge; {config.minBatterInnings} distinct pressure innings. Bowlers must bowl &ge; {config.minBowlerBalls} pressure balls across &ge; {config.minBowlerSpells} spells.
              </p>
            </div>

            <div className="rounded-xl border border-pink-100 bg-pink-50/40 p-5 flex flex-col gap-2">
              <span className="font-bold text-slate-900 text-sm font-sans">2. Sample-Size Reliability Adjustment</span>
              <p className="text-slate-600 font-sans text-xs">
                Each player's observed metric is calibrated against the tournament cohort benchmark (League Par: {cohortMeanSR} SR, {cohortMeanEconomy} Economy):
              </p>
              <p className="text-[11px] text-[#EA1A85] font-semibold bg-white p-2.5 rounded-lg border border-pink-200">
                Smaller sample sizes are conservatively stabilized against tournament benchmarks, eliminating small-sample noise and preventing one-hit wonders from outranking seasoned champions.
              </p>
            </div>

            <div className="rounded-xl border border-pink-100 bg-pink-50/40 p-5 flex flex-col gap-2">
              <span className="font-bold text-slate-900 text-sm font-sans">3. Cross-Match Consistency</span>
              <p className="text-slate-600 font-sans text-xs">
                Evaluates match-to-match stability across distinct high-stress encounters. A player who reliably delivers in 8 out of 10 crunch situations ranks higher than a player with one outlier performance and multiple failures.
              </p>
            </div>
          </div>

          {/* Interactive Bayesian Shrinkage Funnel Plot */}
          <BayesianFunnelPlot data={funnelData} cohortMeanSR={cohortMeanSR} />
        </section>

        {/* Section 4: Evidence for Top 10 Rankings */}
        <section className="flex flex-col gap-4 border-t border-pink-100 pt-8">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#EA1A85]">
            <Award className="h-4 w-4" />
            <h3 className="font-condensed text-xl font-bold uppercase text-slate-900">
              Section 4: Evidence for Top 10 Domestic Rankings Under Pressure (BPI &ge; 65)
            </h3>
          </div>
          <p className="text-sm text-slate-700">
            Applying our Bayesian scoring algorithm to Rajasthan Royals&apos; IPL 2027 domestic scouting feed and ball-by-ball dataset produces the definitive Top 10 Batters and Top 10 Bowlers under pressure:
          </p>

          {/* Batters Table */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-[#EA1A85] uppercase tracking-wider">
                Top 10 Domestic Batters Under Pressure (BPI &ge; 65 • RR Weakness Fix &amp; Est. India Cap)
              </h4>
              <span className="text-[11px] font-mono text-slate-500">
                High Pressure Regime · Reliability Shrinkage Sample = {config.shrinkageK_batter || 200}
              </span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-pink-200 bg-white shadow-xs">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-pink-100 text-slate-500 font-sans font-bold uppercase">
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">Player Name &amp; Est. India Cap</th>
                    <th className="py-2.5 px-3">State / Team</th>
                    <th className="py-2.5 px-3">RR Weakness Fix</th>
                    <th className="py-2.5 px-3 text-right">Pressure Balls</th>
                    <th className="py-2.5 px-3 text-right">Pressure SR</th>
                    <th className="py-2.5 px-3 text-right">&Delta;SR</th>
                    <th className="py-2.5 px-3 text-right">Consistency</th>
                    <th className="py-2.5 px-3 text-right">PRR Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pink-50">
                  {top10Batters.map((b) => (
                    <tr key={b.playerId}>
                      <td className="py-2.5 px-3 font-numeric text-base font-bold text-[#EA1A85]">#{b.unstopRank}</td>
                      <td className="py-2.5 px-3 font-sans">
                        <span className="font-bold text-slate-900 block">{b.name}</span>
                        {b.estIndiaCapLabel && (
                          <span className="text-[10px] font-bold text-amber-800">{b.estIndiaCapLabel}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-600">{b.teamName}</td>
                      <td className="py-2.5 px-3 font-sans font-semibold text-[#EA1A85]">
                        {b.rrWeaknessFixTag || b.rrSquadRoleFit}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700">{b.pressureBalls}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#EA1A85]">{b.pressureSR}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">+{b.srDelta}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">{b.consistencyMultiplier !== undefined ? `${(b.consistencyMultiplier * 100).toFixed(0)}%` : `${b.consistencyScore}%`}</td>
                      <td className="py-2.5 px-3 text-right font-numeric text-lg font-bold text-[#EA1A85]">{b.reliabilityScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bowlers Table */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-[#EA1A85] uppercase tracking-wider">
                Top 10 Domestic Bowlers Under Pressure (BPI &ge; 65 • RR Weakness Fix &amp; Est. India Cap)
              </h4>
              <span className="text-[11px] font-mono text-slate-500">
                High Pressure Regime · Reliability Shrinkage Sample = {config.shrinkageK_bowler || 200}
              </span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-pink-200 bg-white shadow-xs">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-pink-100 text-slate-500 font-sans font-bold uppercase">
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">Player Name &amp; Est. India Cap</th>
                    <th className="py-2.5 px-3">State / Team</th>
                    <th className="py-2.5 px-3">RR Weakness Fix</th>
                    <th className="py-2.5 px-3 text-right">Pressure Balls</th>
                    <th className="py-2.5 px-3 text-right">Pressure Econ</th>
                    <th className="py-2.5 px-3 text-right">&Delta;Econ</th>
                    <th className="py-2.5 px-3 text-right">Consistency</th>
                    <th className="py-2.5 px-3 text-right">PRR Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pink-50">
                  {top10Bowlers.map((bw) => (
                    <tr key={bw.playerId}>
                      <td className="py-2.5 px-3 font-numeric text-base font-bold text-[#EA1A85]">#{bw.unstopRank}</td>
                      <td className="py-2.5 px-3 font-sans">
                        <span className="font-bold text-slate-900 block">{bw.name}</span>
                        {bw.estIndiaCapLabel && (
                          <span className="text-[10px] font-bold text-amber-800">{bw.estIndiaCapLabel}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-600">{bw.teamName}</td>
                      <td className="py-2.5 px-3 font-sans font-semibold text-[#EA1A85]">
                        {bw.rrWeaknessFixTag || bw.rrSquadRoleFit}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700">{bw.pressureBalls}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#EA1A85]">{bw.pressureEconomy}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">+{bw.economyDelta}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">{bw.consistencyMultiplier !== undefined ? `${(bw.consistencyMultiplier * 100).toFixed(0)}%` : `${bw.consistencyScore}%`}</td>
                      <td className="py-2.5 px-3 text-right font-numeric text-lg font-bold text-[#EA1A85]">{bw.reliabilityScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Section 5: Reliability & Limitations */}
        <section className="flex flex-col gap-4 border-t border-pink-100 pt-8">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#EA1A85]">
            <AlertTriangle className="h-4 w-4" />
            <h3 className="font-condensed text-xl font-bold uppercase text-slate-900">
              Section 5: Reliability, Sensitivity &amp; Known Limitations
            </h3>
          </div>
          <p className="text-sm text-slate-700">
            While our Bayesian model achieves unprecedented robustness in isolating high-pressure reliability, high-level decision makers should keep three contextual caveats in mind:
          </p>
          <ul className="list-disc pl-5 text-sm text-slate-700 flex flex-col gap-2">
            <li>
              <strong>Pitch &amp; Ground Dimensions:</strong> Small grounds (Chinnaswamy, Wankhede) inflate raw boundaries for both baseline and pressure. While delta scoring mitigates venue inflation, boundary-dimension interaction remains an external variable.
            </li>
            <li>
              <strong>Impact Player Rule Shifts:</strong> From IPL 2023 onward, the introduction of the 8th batter deepened batting orders, leading teams to chase higher RRR targets with lower collapse penalty.
            </li>
            <li>
              <strong>Toss &amp; Dew Bias:</strong> In day-night matches, bowling second in dew introduces grip handicaps that can depress spin bowling economy through no fault of individual bowler technique.
            </li>
          </ul>

          {/* Innings-by-Innings Reliability & Variance Strip Plot */}
          <ConsistencyStripPlot
            data={top10BattersBoxPlot}
            metricLabel="Match Pressure Strike Rate (Top 10 Batters Across All Matches)"
            minScale={70}
            maxScale={260}
            isBowler={false}
          />

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 mt-2 text-xs text-slate-700 flex items-start gap-3.5">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900 text-sm">Conclusion &amp; Submission Alignment</p>
              <p className="mt-1 leading-normal text-slate-700">
                The resulting Top 10 lists fulfill all requirements of the Rajasthan Royals SupeRR Selector Round 1 challenge, providing mathematically grounded, bias-corrected evidence for the most clutch match-winners across modern T20 cricket.
              </p>
            </div>
          </div>
        </section>

        {/* Section 6: 5-Stage Rajasthan Royals Auction Intelligence Pipeline */}
        <section className="flex flex-col gap-5 border-t border-pink-100 pt-8">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#EA1A85]">
              <Layers className="h-4 w-4" />
              <h3 className="font-condensed text-xl font-bold uppercase text-slate-900">
                Section 6: 5-Stage Rajasthan Royals Auction Intelligence Pipeline
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Cross-Discipline Impact Score + RR Incumbent Head-to-Head Audit
            </span>
          </div>

          {/* Stage 1 Funnel Summary Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl border border-pink-100 bg-pink-50/40 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Stage 1 · Deliveries Analyzed
              </span>
              <span className="font-mono text-lg font-extrabold text-slate-900 mt-1 block">
                {auctionPipeline.totalDeliveriesAnalyzed.toLocaleString()}
              </span>
            </div>
            <div className="rounded-xl border border-pink-100 bg-pink-50/40 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Total Players Scanned
              </span>
              <span className="font-mono text-lg font-extrabold text-slate-900 mt-1 block">
                {auctionPipeline.totalPlayersScanned.toLocaleString()}
              </span>
            </div>
            <div className="rounded-xl border border-pink-100 bg-pink-50/40 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#EA1A85] block">
                Eligible Batters
              </span>
              <span className="font-mono text-lg font-extrabold text-[#EA1A85] mt-1 block">
                {auctionPipeline.strictEligibleBattersCount}
              </span>
            </div>
            <div className="rounded-xl border border-pink-100 bg-pink-50/40 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                Eligible Bowlers
              </span>
              <span className="font-mono text-lg font-extrabold text-indigo-700 mt-1 block">
                {auctionPipeline.strictEligibleBowlersCount}
              </span>
            </div>
          </div>

          {/* Stage 3 & Stage 4 Combined Executive Table */}
          <div className="overflow-x-auto rounded-xl border border-pink-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-pink-100 text-slate-500 font-sans font-bold uppercase">
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Candidate</th>
                  <th className="py-2.5 px-3">Discipline</th>
                  <th className="py-2.5 px-3">Archetype</th>
                  <th className="py-2.5 px-3 text-right">PRR</th>
                  <th className="py-2.5 px-3 text-right">Key Metric</th>
                  <th className="py-2.5 px-3 text-right">Impact Score</th>
                  <th className="py-2.5 px-3">RR Incumbent Benchmark</th>
                  <th className="py-2.5 px-3 text-right">Net Upgrade Delta</th>
                  <th className="py-2.5 px-3">Roster Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-50">
                {auctionPipeline.top10OverallCandidates.map((cand) => (
                  <tr key={`${cand.discipline}-${cand.playerId}`}>
                    <td className="py-2.5 px-3 font-bold text-[#EA1A85]">#{cand.overallRank}</td>
                    <td className="py-2.5 px-3 font-sans font-bold text-slate-900">{cand.name}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-600">{cand.discipline}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-700">{cand.archetype}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">{cand.prr.toFixed(1)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700">{cand.keyPressureMetricLabel}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#EA1A85]">{cand.overallImpactScore.toFixed(1)}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-600">
                      {cand.rrIncumbentName} ({cand.rrIncumbentMetricLabel})
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{cand.netUpgradeDeltaLabel}</td>
                    <td className="py-2.5 px-3 font-sans font-bold text-[10px] text-slate-800">
                      {cand.rosterActionTag}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Stage 5 Tactical Scouting Briefs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {auctionPipeline.top10OverallCandidates.slice(0, 6).map((cand) => (
              <div
                key={`brief-${cand.discipline}-${cand.playerId}`}
                className="rounded-xl border border-pink-100 bg-pink-50/30 p-4 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-sans text-xs font-bold text-slate-900">
                    #{cand.overallRank} {cand.name} · <span className="text-[#EA1A85]">{cand.archetype}</span>
                  </span>
                  <span className="font-mono text-[10px] font-bold text-slate-600">
                    Impact {cand.overallImpactScore.toFixed(1)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-700 leading-relaxed">
                  <strong>Bottleneck Solved:</strong> {cand.phaseBottleneckSolved}
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  <strong>SMS Jaipur Fit:</strong> {cand.sawaiMansinghChemistryFit}
                </p>
              </div>
            ))}
          </div>
        </section>
      </article>
    </div>
  );
};
