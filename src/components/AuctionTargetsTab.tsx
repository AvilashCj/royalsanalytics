import React, { useState, useMemo, useRef } from 'react';
import {
  Target,
  ShieldCheck,
  AlertTriangle,
  Download,
  Upload,
  ArrowUpRight,
  Swords,
  Plus,
  Check,
  CheckCircle2,
  RotateCcw,
  Users,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Filter,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BatterRating, BowlerRating } from '../types/cricket';
import { PlayerAvatar } from './PlayerAvatar';
import {
  buildRRWeaknessDomesticDiagnosis,
  CustomDomesticCsvRow,
  DomesticTargetRecommendation,
  RRWeaknessId,
} from '../utils/auctionIntelligenceEngine';
import {
  buildVeteranToDomesticSuccessionPairs,
  getLifecycleBadgeClasses,
  getPlayerLifecycleProfile,
  LifecycleAgeFilter,
} from '../utils/playerLifecycleEngine';

interface AuctionTargetsTabProps {
  batters: BatterRating[];
  bowlers: BowlerRating[];
  totalDeliveries: number;
  onSelectPlayer: (playerId: number, type: 'batter' | 'bowler') => void;
  onTestInSuperOver: (
    playerId: number,
    discipline: 'batter' | 'bowler'
  ) => void;
}

export const AuctionTargetsTab: React.FC<AuctionTargetsTabProps> = ({
  batters,
  bowlers,
  totalDeliveries,
  onSelectPlayer,
  onTestInSuperOver,
}) => {
  const [customDomesticRows, setCustomDomesticRows] = useState<CustomDomesticCsvRow[]>([]);
  const [uploadedCsvFileName, setUploadedCsvFileName] = useState<string | null>(null);
  const [showFullSquadAudit, setShowFullSquadAudit] = useState<boolean>(true);
  const [activeWeaknessFilter, setActiveWeaknessFilter] = useState<'ALL' | RRWeaknessId>('ALL');
  const [lifecycleAgeFilter, setLifecycleAgeFilter] = useState<LifecycleAgeFilter>('ALL');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const diagnosis = useMemo(
    () => buildRRWeaknessDomesticDiagnosis(batters, bowlers, customDomesticRows),
    [batters, bowlers, customDomesticRows]
  );

  const successionPairs = useMemo(
    () => buildVeteranToDomesticSuccessionPairs(),
    []
  );

  // Default signed targets: 1 per core weakness (Shivam Shukla, Chama Milind, Karan Lal, Anmolpreet Singh)
  const [signedTargetIds, setSignedTargetIds] = useState<string[]>([
    'dom-shivam-shukla',
    'dom-chama-milind',
    'dom-karan-lal',
    'dom-anmolpreet-singh',
  ]);

  const toggleSignTarget = (targetId: string) => {
    setSignedTargetIds((prev) =>
      prev.includes(targetId) ? prev.filter((id) => id !== targetId) : [...prev, targetId]
    );
  };

  const signedTargets = useMemo(
    () => diagnosis.allDomesticTargets.filter((t) => signedTargetIds.includes(t.id)),
    [diagnosis.allDomesticTargets, signedTargetIds]
  );

  // Compute live "Before vs. After Domestic Auction" Squad Simulator metrics
  const simulatorStats = useMemo(() => {
    const signedW1 = signedTargets.filter((t) => t.weaknessId === 'WEAKNESS_1_MIDDLE_SPIN');
    const signedW2 = signedTargets.filter((t) => t.weaknessId === 'WEAKNESS_2_DEATH_PACE');
    const signedW3 = signedTargets.filter((t) => t.weaknessId === 'WEAKNESS_3_MIDDLE_FINISH');
    const signedW4 = signedTargets.filter((t) => t.weaknessId === 'WEAKNESS_4_BENCH_COLLAPSE');

    const rawBoost = signedTargets.reduce((sum, t) => sum + t.teamPrrBoost, 0);
    const afterTeamPrr = Number(
      Math.min(94.8, diagnosis.baselineTeamPressureScore + rawBoost * 0.85).toFixed(1)
    );
    const prrDelta = Number((afterTeamPrr - diagnosis.baselineTeamPressureScore).toFixed(1));

    const afterMiddleSpinRpo = Number(
      Math.max(
        7.35,
        diagnosis.baselineMiddleSpinRpo -
          (signedW1.length > 0 ? 1.45 + (signedW1.length - 1) * 0.35 : 0) -
          (signedW3.some((t) => t.name.toLowerCase().includes('karan lal')) ? 0.25 : 0)
      ).toFixed(2)
    );

    const afterDeathPaceRpo = Number(
      Math.max(
        7.95,
        diagnosis.baselineDeathPaceRpo -
          (signedW2.length > 0 ? 2.65 + Math.min(2, signedW2.length - 1) * 0.55 : 0)
      ).toFixed(2)
    );

    const afterMiddleOrderRpo = Number(
      Math.min(
        11.25,
        diagnosis.baselineMiddleOrderRpo +
          (signedW3.length > 0 ? 1.42 + (signedW3.length - 1) * 0.35 : 0) +
          (signedW4.length > 0 ? 0.22 : 0)
      ).toFixed(2)
    );

    let purseFreedCr = 0;
    if (signedW2.length > 0) purseFreedCr += 6.2;
    if (signedW2.length > 1) purseFreedCr += 1.8;
    if (signedW1.length > 0) purseFreedCr += 2.4;
    if (signedW3.length > 0) purseFreedCr += 1.7;
    if (signedW4.length > 0) purseFreedCr += 1.2;
    const totalBaseCostCr = Number((signedTargets.length * 0.3).toFixed(2));
    const netPurseSavedCr = Number(Math.max(0, purseFreedCr - totalBaseCostCr).toFixed(2));

    const weaknessesResolvedCount =
      (signedW1.length > 0 ? 1 : 0) +
      (signedW2.length > 0 ? 1 : 0) +
      (signedW3.length > 0 ? 1 : 0) +
      (signedW4.length > 0 ? 1 : 0);

    return {
      afterTeamPrr,
      prrDelta,
      afterMiddleSpinRpo,
      afterDeathPaceRpo,
      afterMiddleOrderRpo,
      netPurseSavedCr,
      totalBaseCostCr,
      weaknessesResolvedCount,
      signedW1,
      signedW2,
      signedW3,
      signedW4,
    };
  }, [signedTargets, diagnosis]);

  // Filter RR Squad Audit Rows by Lifecycle Age Filter
  const filteredRRSquadAuditRows = useMemo(() => {
    return diagnosis.rrSquadAuditRows.filter((row) => {
      const profile = getPlayerLifecycleProfile(row.name);
      if (lifecycleAgeFilter === 'RETIREMENT_WATCH_35') {
        return profile.age >= 33; // Highlights Jadeja (38), Shanaka (35), Sandeep (33)
      }
      if (lifecycleAgeFilter === 'DOMESTIC_NEXT_GEN_25') {
        return profile.age <= 25; // Highlights Vaibhav (15), Maphaka (20), Jaiswal (24), Parag (25), Jurel (25)
      }
      return true;
    });
  }, [diagnosis.rrSquadAuditRows, lifecycleAgeFilter]);

  // Parse Custom Domestic CSV (SMAT / Ranji / Vijay Hazare / Duleep Trophy)
  const handleDomesticCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result || '');
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 2) return;

      const headers = lines[0]
        .split(',')
        .map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());

      const parsedRows: CustomDomesticCsvRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i]
          .split(',')
          .map((c) => c.replace(/^"|"$/g, '').trim());
        const rowMap: Record<string, string> = {};
        headers.forEach((h, idx) => {
          rowMap[h] = cols[idx] || '';
        });

        const name =
          rowMap['player_name'] ||
          rowMap['name'] ||
          rowMap['player'] ||
          rowMap['batter'] ||
          rowMap['bowler'] ||
          cols[0];
        if (!name) continue;

        const stateTeam =
          rowMap['state_team'] || rowMap['state'] || rowMap['team'] || 'Indian Domestic';
        const tournament =
          rowMap['tournament'] || rowMap['competition'] || 'SMAT / Ranji';
        const role = rowMap['role'] || rowMap['archetype'] || rowMap['type'] || '';
        const weaknessRaw = (rowMap['weakness_slot'] || rowMap['weakness'] || '').toUpperCase();

        let weaknessId: RRWeaknessId | undefined;
        if (weaknessRaw.includes('1') || weaknessRaw.includes('SPIN')) {
          weaknessId = 'WEAKNESS_1_MIDDLE_SPIN';
        } else if (weaknessRaw.includes('2') || weaknessRaw.includes('DEATH') || weaknessRaw.includes('PACE')) {
          weaknessId = 'WEAKNESS_2_DEATH_PACE';
        } else if (weaknessRaw.includes('3') || weaknessRaw.includes('FINISH') || weaknessRaw.includes('MIDDLE')) {
          weaknessId = 'WEAKNESS_3_MIDDLE_FINISH';
        } else if (weaknessRaw.includes('4') || weaknessRaw.includes('BENCH') || weaknessRaw.includes('KEEP')) {
          weaknessId = 'WEAKNESS_4_BENCH_COLLAPSE';
        }

        parsedRows.push({
          name,
          stateTeam,
          tournament,
          weaknessId,
          role,
          runs: parseFloat(rowMap['runs'] || '0') || undefined,
          strikeRate:
            parseFloat(rowMap['strike_rate'] || rowMap['sr'] || '0') || undefined,
          average: parseFloat(rowMap['average'] || rowMap['avg'] || '0') || undefined,
          wickets: parseFloat(rowMap['wickets'] || rowMap['wkts'] || '0') || undefined,
          economy: parseFloat(rowMap['economy'] || rowMap['econ'] || '0') || undefined,
          basePriceLakhs:
            parseFloat(rowMap['base_price_lakhs'] || rowMap['base_price'] || '30') || 30,
          prr: parseFloat(rowMap['prr'] || rowMap['pressure_rating'] || '0') || undefined,
        });
      }

      if (parsedRows.length > 0) {
        setCustomDomesticRows(parsedRows);
        setUploadedCsvFileName(file.name);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDownloadSampleDomesticCSV = () => {
    const sample = [
      'player_name,state_team,tournament,weakness_slot,role,wickets,economy,runs,strike_rate,average,base_price_lakhs,prr',
      'Karan Lal,Bengal,SMAT & RR Sept 2026 Trials,WEAKNESS_3_MIDDLE_FINISH,Middle-order spin-hitter + 2 overs off-spin,14,7.35,348,174.6,34.80,30,90.6',
      'Abhinav Manohar,Karnataka,SMAT,WEAKNESS_3_MIDDLE_FINISH,Death-overs boundary closer,0,0,362,162.4,45.25,50,89.6',
      'Virat Singh,Jharkhand,SMAT/Ranji,WEAKNESS_3_MIDDLE_FINISH,LHB Indian finisher replacing Hetmyer,0,0,382,169.8,54.80,30,88.9',
      'Ankit Kumar,Haryana,SMAT/Ranji,WEAKNESS_4_BENCH_COLLAPSE,Top-order & spin-hitting anchor,0,0,412,172.3,41.20,30,87.1',
      'Mahipal Lomror,Rajasthan,SMAT/Ranji,WEAKNESS_3_MIDDLE_FINISH,Local Jaipur LHB spin-enforcer,6,7.65,356,156.8,39.55,50,88.9',
      'Anmolpreet Singh,Punjab,SMAT/Vijay Hazare,WEAKNESS_4_BENCH_COLLAPSE,Top-order collapse No. 3 Impact Sub,0,0,418,148.4,46.40,30,88.2',
      'Yashvardhan Dalal,Haryana,SMAT/Ranji,WEAKNESS_3_MIDDLE_FINISH,Middle-overs strike rotator,0,0,328,148.5,41.00,30,86.2',
      'Tushar Raheja,Tamil Nadu,SMAT,WEAKNESS_4_BENCH_COLLAPSE,LHB wicketkeeper-opener cover,0,0,324,158.8,36.00,30,86.4',
      'Kunal Chandela,Uttarakhand,SMAT/Ranji,WEAKNESS_4_BENCH_COLLAPSE,Sticky-pitch top-3 anchor,0,0,345,150.9,38.30,30,85.6',
      'Sanvir Singh,Punjab,SMAT,WEAKNESS_3_MIDDLE_FINISH,Lower-order power finisher + seam,8,8.15,295,164.0,36.85,30,86.5',
      'Shivam Shukla,Madhya Pradesh,SMAT,WEAKNESS_1_MIDDLE_SPIN,Middle-overs mystery spin squeeze,17,6.84,45,132.0,14.58,30,89.4',
      'Chama Milind,Hyderabad,SMAT/Ranji,WEAKNESS_2_DEATH_PACE,Left-arm swing & death cutters,17,7.54,110,142.5,15.80,30,91.2',
      'Raj Limbani,Baroda,SMAT,WEAKNESS_2_DEATH_PACE,Overs 16-20 yorker partner for Jofra Archer,16,7.48,85,138.0,16.40,30,88.7',
      'Ashok Sharma,Rajasthan,SMAT,WEAKNESS_2_DEATH_PACE,Local Jaipur hit-the-deck death pacer,22,7.62,40,128.0,14.90,30,88.4',
      'Yash Raj Punja,RR Pathway,RR Trials & SMAT,WEAKNESS_1_MIDDLE_SPIN,194 cm steep-bounce leg-spin partner for Jadeja,14,7.12,28,125.0,16.20,30,85.2',
      'KM Asif,Kerala,SMAT,WEAKNESS_2_DEATH_PACE,Powerplay & death strike seam,16,7.95,32,124.0,15.40,30,87.0',
      'Simarjeet Singh,Delhi,SMAT,WEAKNESS_2_DEATH_PACE,145+ km/h express pace partner,15,8.12,48,134.0,16.10,50,88.6',
      'Chetan Sakariya,Saurashtra,SMAT/Ranji,WEAKNESS_2_DEATH_PACE,Left-arm slower-ball death specialist,15,8.24,52,126.0,16.50,50,88.1',
      'Saransh Jain,Madhya Pradesh,SMAT/Ranji,WEAKNESS_1_MIDDLE_SPIN,Ravindra Jadeja age-38 spin-AR successor,14,7.45,240,138.5,32.00,30,86.0',
      'Tanush Kotian,Mumbai,SMAT/Ranji,WEAKNESS_1_MIDDLE_SPIN,Match-up off-spinner + crisis batting,13,7.58,265,136.4,35.20,30,84.6',
    ].join('\n');

    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'RR_Domestic_Targets_SMAT_Ranji_Sample.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportDiagnosisCSV = () => {
    let csv =
      'WEAKNESS_NUMBER,RR_WEAKNESS,RR_OBSERVED_GAP,SHORTLIST_RANK,DOMESTIC_TARGET,AGE,LIFECYCLE_STAGE,STATE_TEAM,EST_INDIA_CAP,RR_WEAKNESS_FIX,BASE_PRICE,DOMESTIC_PRR,INCUMBENT_COMPARISON,SIGNED_FOR_2027\n';
    diagnosis.weaknessCards.forEach((w) => {
      w.pairedDomesticTargets.forEach((t) => {
        const isSigned = signedTargetIds.includes(t.id) ? 'YES' : 'NO';
        const lc = getPlayerLifecycleProfile(t.name);
        csv += `${w.weaknessNumber},"${w.title}","${w.rrObservedMetric}",${t.shortlistRank || ''},"${t.name}",${lc.age},"${lc.badgeLabel}","${t.stateTeam}","${t.estIndiaCapLabel || ''}","${t.rrWeaknessFixTag || t.solvesWeaknessBadge}","${t.basePriceLabel}",${t.domesticPrr},"${t.directIncumbentComparison.replace(/"/g, '""')}",${isSigned}\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RR_Weakness_To_Domestic_Targets_2027_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const visibleWeaknessCards = useMemo(() => {
    if (activeWeaknessFilter === 'ALL') return diagnosis.weaknessCards;
    return diagnosis.weaknessCards.filter((w) => w.weaknessId === activeWeaknessFilter);
  }, [diagnosis.weaknessCards, activeWeaknessFilter]);

  const top10DomesticBattersList = useMemo(
    () =>
      diagnosis.allDomesticTargets
        .filter((t) => t.discipline === 'batter')
        .sort((a, b) => (a.shortlistRank || 99) - (b.shortlistRank || 99))
        .slice(0, 10),
    [diagnosis.allDomesticTargets]
  );

  const top10DomesticBowlersList = useMemo(
    () =>
      diagnosis.allDomesticTargets
        .filter((t) => t.discipline === 'bowler')
        .sort((a, b) => (a.shortlistRank || 99) - (b.shortlistRank || 99))
        .slice(0, 10),
    [diagnosis.allDomesticTargets]
  );

  return (
    <div className="flex flex-col gap-6 pb-16">
      {/* =====================================================================
          TOP BAR: LIVE "BEFORE VS. AFTER DOMESTIC AUCTION" SQUAD SIMULATOR
      ===================================================================== */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="bg-[#0A0E1A] text-white px-6 py-5 border-b border-white/10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-[#EA1A85] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                  <Target className="h-3 w-3" />
                  RR Weakness-to-Domestic-Target Diagnosis &amp; Succession Engine
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                  <ShieldCheck className="h-3 w-3" />
                  9 Rival IPL Franchises Excluded ({diagnosis.excludedContractedIplCount} Contracted Players Filtered Out)
                </span>
              </div>
              <h1 className="font-condensed text-2xl md:text-3xl font-extrabold tracking-tight text-white mt-2">
                Rajasthan Royals Squad Gap Audit, Career Lifecycle &amp; Indian Domestic Target Matrix
              </h1>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl">
                Auditing {totalDeliveries.toLocaleString()} ball-by-ball deliveries across RR&apos;s 15-player core against Top-4 Playoff benchmarks, tagging every player&apos;s career lifecycle stage, and pairing each phase weakness and 35+ veteran with the 20 Pressure-Qualified Indian Domestic Shortlist targets (<code className="text-pink-300 font-mono">BPI &ge; 65</code>).
              </p>
            </div>

            {/* Custom Domestic CSV Uploader & Export Controls */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleDomesticCsvUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-xl bg-[#EA1A85] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#D81478] transition-colors cursor-pointer shadow-xs"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload Custom Domestic CSV (SMAT / Ranji / Vijay Hazare)</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadSampleDomesticCSV}
                className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/15 transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-[#D4AF37]" />
                <span>Sample Domestic CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportDiagnosisCSV}
                className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/15 transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-emerald-400" />
                <span>Export Dossier</span>
              </button>
            </div>
          </div>

          {uploadedCsvFileName && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>
                  Custom Domestic Dataset Loaded: <strong>{uploadedCsvFileName}</strong> ({customDomesticRows.length} domestic players merged &amp; re-ranked by PRR)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCustomDomesticRows([]);
                  setUploadedCsvFileName(null);
                }}
                className="flex items-center gap-1 text-[11px] font-bold text-emerald-300 hover:text-white cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                Reset to Default SMAT/Ranji Pool
              </button>
            </div>
          )}
        </div>

        {/* Live Projected RR 2027 Team Pressure Score Meter & Before vs. After Simulator */}
        <div className="p-6 bg-gradient-to-r from-slate-50 via-white to-pink-50/30">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            {/* Left 5 cols: Live Team Pressure Score Meter */}
            <div className="lg:col-span-5 rounded-xl border border-pink-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#EA1A85]">
                  Projected RR 2027 Team Pressure Score
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                  <TrendingUp className="h-3 w-3" />
                  +{simulatorStats.prrDelta} PRR Net Lift ({simulatorStats.weaknessesResolvedCount}/4 Weaknesses Solved)
                </span>
              </div>

              <div className="mt-3 flex items-end justify-between gap-4">
                <div>
                  <span className="text-[11px] text-slate-500 block">Before Domestic Auction</span>
                  <span className="font-mono text-xl font-bold text-slate-500">
                    {diagnosis.baselineTeamPressureScore} <span className="text-xs font-normal">PRR</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-slate-700 block">
                    After Signing {signedTargets.length} Domestic Target{signedTargets.length === 1 ? '' : 's'}
                  </span>
                  <span className="font-mono text-3xl font-black text-[#EA1A85]">
                    {simulatorStats.afterTeamPrr} <span className="text-xs font-bold text-slate-600">PRR</span>
                  </span>
                </div>
              </div>

              {/* Dual Progress Bar */}
              <div className="mt-3 relative h-3.5 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                <div
                  className="absolute inset-y-0 left-0 bg-slate-300 transition-all duration-300"
                  style={{ width: `${diagnosis.baselineTeamPressureScore}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#EA1A85] to-emerald-500 transition-all duration-500"
                  style={{ width: `${simulatorStats.afterTeamPrr}%` }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>RR Baseline: 76.8</span>
                <span>Playoff Cut-Off: 84.5</span>
                <span className="font-bold text-emerald-700">Championship Tier: 89.0+</span>
              </div>
            </div>

            {/* Right 7 cols: Before vs. After Phase Leakage & Purse Comparison */}
            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Overs 7–15 Spin RPO
                </span>
                <div className="mt-1.5 flex items-baseline gap-1.5 font-mono">
                  <span className="text-xs line-through text-rose-500 font-semibold">
                    {diagnosis.baselineMiddleSpinRpo}
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className="text-lg font-extrabold text-emerald-700">
                    {simulatorStats.afterMiddleSpinRpo}
                  </span>
                </div>
                <span className="mt-1 block text-[10px] font-semibold text-slate-600">
                  {simulatorStats.signedW1.length > 0
                    ? `Fixed by ${simulatorStats.signedW1.map((t) => t.name.split(' ')[1] || t.name).join(' + ')}`
                    : 'Sign W#1 Spinner to Fix'}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Non-Archer Death RPO
                </span>
                <div className="mt-1.5 flex items-baseline gap-1.5 font-mono">
                  <span className="text-xs line-through text-rose-500 font-semibold">
                    {diagnosis.baselineDeathPaceRpo}
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className="text-lg font-extrabold text-emerald-700">
                    {simulatorStats.afterDeathPaceRpo}
                  </span>
                </div>
                <span className="mt-1 block text-[10px] font-semibold text-slate-600">
                  {simulatorStats.signedW2.length > 0
                    ? `Fixed by ${simulatorStats.signedW2.map((t) => t.name.split(' ')[1] || t.name).join(' + ')}`
                    : 'Sign W#2 Pacer to Fix'}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Overs 7–14 Bat RPO
                </span>
                <div className="mt-1.5 flex items-baseline gap-1.5 font-mono">
                  <span className="text-xs line-through text-amber-600 font-semibold">
                    {diagnosis.baselineMiddleOrderRpo}
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className="text-lg font-extrabold text-emerald-700">
                    {simulatorStats.afterMiddleOrderRpo}
                  </span>
                </div>
                <span className="mt-1 block text-[10px] font-semibold text-slate-600">
                  {simulatorStats.signedW3.length > 0
                    ? `Boosted by ${simulatorStats.signedW3.map((t) => t.name.split(' ')[0]).join(' + ')}`
                    : 'Sign W#3 Finisher to Fix'}
                </span>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                  Net Auction Purse Freed
                </span>
                <div className="mt-1.5 flex items-baseline gap-1.5 font-mono">
                  <span className="text-lg font-extrabold text-emerald-700">
                    +₹{simulatorStats.netPurseSavedCr} Cr
                  </span>
                </div>
                <span className="mt-1 block text-[10px] font-semibold text-emerald-800">
                  {signedTargets.length} Signed @ ₹{simulatorStats.totalBaseCostCr} Cr Total Base
                </span>
              </div>
            </div>
          </div>

          {/* Signed Domestic Targets Strip + 3-Year Squad Continuity Filter Toggle */}
          <div className="mt-4 pt-3.5 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700">
                Signed IPL 2027 Domestic Targets ({signedTargets.length}):
              </span>
              {signedTargets.length === 0 ? (
                <span className="text-xs text-slate-500 italic">
                  Click &quot;Sign Target for IPL 2027&quot; on any domestic recommendation below to simulate squad impact.
                </span>
              ) : (
                signedTargets.map((t) => {
                  const lc = getPlayerLifecycleProfile(t.name);
                  return (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-pink-200 bg-pink-50/80 px-2.5 py-1 text-xs font-semibold text-slate-900"
                    >
                      <Check className="h-3 w-3 text-[#EA1A85]" />
                      <span>
                        {t.name} ({lc.age})
                      </span>
                      <span className="font-mono text-[10px] font-bold text-[#EA1A85]">
                        ({t.basePriceLabel} • {t.domesticPrr} PRR)
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleSignTarget(t.id)}
                        className="ml-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Remove from signed list"
                      >
                        ×
                      </button>
                    </span>
                  );
                })
              )}
            </div>

            {/* 3-Year Squad Continuity Age Filter Toggle + Audit Drawer Button */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1">
                <Clock className="h-3.5 w-3.5 text-[#EA1A85] ml-1.5 mr-0.5" />
                {[
                  { id: 'ALL', label: 'All Ages' },
                  { id: 'RETIREMENT_WATCH_35', label: 'Retirement Watch (35+)' },
                  { id: 'DOMESTIC_NEXT_GEN_25', label: 'Domestic Next-Gen (≤25)' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLifecycleAgeFilter(opt.id as LifecycleAgeFilter)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                      lifecycleAgeFilter === opt.id
                        ? 'bg-[#EA1A85] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowFullSquadAudit((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Users className="h-3.5 w-3.5 text-[#EA1A85]" />
                <span>
                  {showFullSquadAudit ? 'Hide RR Squad Audit' : 'Show RR Squad Audit'}
                </span>
                {showFullSquadAudit ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Expandable 15-Player Retained RR Squad Dataset Audit Table with Age & Lifecycle Badges */}
          <AnimatePresence>
            {showFullSquadAudit && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 rounded-xl border border-slate-200 bg-white overflow-x-auto">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      Stage 1 Live Dataset &amp; Lifecycle Audit • Rajasthan Royals Squad ({filteredRRSquadAuditRows.length} Shown)
                    </span>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                      <span className="rounded px-2 py-0.5 bg-cyan-50 text-cyan-800 border border-cyan-200">
                        NEXT-GEN BREAKOUT (15–23)
                      </span>
                      <span className="rounded px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200">
                        PRIME WINDOW (24–31)
                      </span>
                      <span className="rounded px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200">
                        VETERAN TRANSITION (34–37)
                      </span>
                      <span className="rounded px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-200">
                        RETIREMENT HORIZON (38+)
                      </span>
                    </div>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 bg-slate-50/50">
                        <th className="py-2 px-3">RR Squad Member &amp; Age</th>
                        <th className="py-2 px-3">Career Lifecycle Stage</th>
                        <th className="py-2 px-3">Tactical Role</th>
                        <th className="py-2 px-3 text-right">High-BPI Balls</th>
                        <th className="py-2 px-3 text-right">Live Pressure Metric</th>
                        <th className="py-2 px-3 text-right">PRR Score</th>
                        <th className="py-2 px-3">Diagnostic Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRRSquadAuditRows.map((row) => {
                        const lc = getPlayerLifecycleProfile(row.name);
                        return (
                          <tr key={row.name} className="hover:bg-slate-50/80">
                            <td className="py-2 px-3 font-bold text-slate-900">
                              {row.name}{' '}
                              <span className="font-mono text-xs text-slate-500">
                                ({lc.age})
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${getLifecycleBadgeClasses(
                                  lc.colorScheme,
                                  false
                                )}`}
                              >
                                {lc.badgeLabel}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-600">{row.role}</td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700">
                              {row.pressureBalls}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                              {row.liveMetricLabel}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-[#EA1A85]">
                              {row.prrScore.toFixed(1)}
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                                  row.statusTag === 'CORE PILLAR'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : row.statusTag === 'CRITICAL LEAKAGE'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : row.statusTag === 'STALL RISK'
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                                }`}
                              >
                                {row.statusTag}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* =====================================================================
          MASTER SHORTLIST OVERVIEW: TOP 10 DOMESTIC BATTERS & TOP 10 DOMESTIC BOWLERS (BPI >= 65)
      ===================================================================== */}
      <section className="rounded-2xl border border-pink-200 bg-white p-6 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-[#EA1A85] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                <Target className="h-3 w-3" />
                Official RR IPL 2027 Domestic Shortlist (BPI &ge; 65)
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-900">
                <Clock className="h-3 w-3" />
                Est. Days to India Cap Countdown Active
              </span>
            </div>
            <h2 className="font-condensed text-2xl font-extrabold text-slate-900 mt-1.5">
              Pressure-Qualified Indian Domestic Shortlist: Top 10 Batters &amp; Top 10 Bowlers (BPI &ge; 65)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5 max-w-3xl">
              Synchronized across <strong className="text-slate-900">Auction Targets</strong>, <strong className="text-slate-900">Batters</strong>, <strong className="text-slate-900">Bowlers</strong>, <strong className="text-slate-900">Player X-Ray</strong>, and <strong className="text-slate-900">Report</strong>. Click any player to open their X-Ray dossier or sign them directly into RR&apos;s 2027 squad simulator.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Left Column: Top 10 Domestic Batters Under Pressure */}
          <div className="rounded-xl border border-pink-100 bg-slate-50/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-condensed text-lg font-extrabold uppercase text-slate-900">
                1. Top 10 Domestic Batters Under Pressure (BPI &ge; 65)
              </h3>
              <span className="text-[11px] font-mono font-bold text-[#EA1A85]">Ranks #1–#10</span>
            </div>
            <div className="divide-y divide-slate-200/70">
              {top10DomesticBattersList.map((t) => {
                const isSigned = signedTargetIds.includes(t.id);
                return (
                  <div
                    key={t.id}
                    className="py-2.5 flex items-center justify-between gap-2 text-xs hover:bg-white/80 px-2 rounded-lg transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center justify-center rounded bg-[#EA1A85] text-white font-mono text-[10px] font-bold px-1.5 py-0.5">
                          #{t.shortlistRank}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            t.matchedDatasetPlayerId &&
                            onSelectPlayer(t.matchedDatasetPlayerId, 'batter')
                          }
                          className="font-bold text-slate-900 hover:text-[#EA1A85] transition-colors cursor-pointer truncate"
                        >
                          {t.name}
                        </button>
                        <span className="text-[11px] text-slate-500 font-medium">
                          ({t.stateTeam})
                        </span>
                        {t.estIndiaCapLabel && (
                          <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.2 text-[10px] font-bold text-amber-900">
                            {t.estIndiaCapLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#EA1A85] font-semibold mt-0.5 truncate">
                        {t.rrWeaknessFixTag}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono">
                      <div className="text-right">
                        <span className="font-bold text-slate-900 block">
                          {t.domesticPrr.toFixed(1)} PRR
                        </span>
                        <span className="text-[10px] text-slate-600 block">
                          {t.keyMetricPrimary}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSignTarget(t.id)}
                        className={`rounded-lg px-2 py-1 text-[10px] font-sans font-bold cursor-pointer transition-colors ${
                          isSigned
                            ? 'bg-emerald-600 text-white'
                            : 'bg-pink-50 border border-pink-200 text-[#EA1A85] hover:bg-[#EA1A85] hover:text-white'
                        }`}
                      >
                        {isSigned ? 'Signed' : '+ Sign'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Top 10 Domestic Bowlers Under Pressure */}
          <div className="rounded-xl border border-pink-100 bg-slate-50/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-condensed text-lg font-extrabold uppercase text-slate-900">
                2. Top 10 Domestic Bowlers Under Pressure (BPI &ge; 65)
              </h3>
              <span className="text-[11px] font-mono font-bold text-[#EA1A85]">Ranks #1–#10</span>
            </div>
            <div className="divide-y divide-slate-200/70">
              {top10DomesticBowlersList.map((t) => {
                const isSigned = signedTargetIds.includes(t.id);
                return (
                  <div
                    key={t.id}
                    className="py-2.5 flex items-center justify-between gap-2 text-xs hover:bg-white/80 px-2 rounded-lg transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center justify-center rounded bg-slate-900 text-[#D4AF37] font-mono text-[10px] font-bold px-1.5 py-0.5">
                          #{t.shortlistRank}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            t.matchedDatasetPlayerId &&
                            onSelectPlayer(t.matchedDatasetPlayerId, 'bowler')
                          }
                          className="font-bold text-slate-900 hover:text-[#EA1A85] transition-colors cursor-pointer truncate"
                        >
                          {t.name}
                        </button>
                        <span className="text-[11px] text-slate-500 font-medium">
                          ({t.stateTeam})
                        </span>
                        {t.estIndiaCapLabel && (
                          <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.2 text-[10px] font-bold text-amber-900">
                            {t.estIndiaCapLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#EA1A85] font-semibold mt-0.5 truncate">
                        {t.rrWeaknessFixTag}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono">
                      <div className="text-right">
                        <span className="font-bold text-slate-900 block">
                          {t.domesticPrr.toFixed(1)} PRR
                        </span>
                        <span className="text-[10px] text-slate-600 block">
                          {t.keyMetricPrimary}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSignTarget(t.id)}
                        className={`rounded-lg px-2 py-1 text-[10px] font-sans font-bold cursor-pointer transition-colors ${
                          isSigned
                            ? 'bg-emerald-600 text-white'
                            : 'bg-pink-50 border border-pink-200 text-[#EA1A85] hover:bg-[#EA1A85] hover:text-white'
                        }`}
                      >
                        {isSigned ? 'Signed' : '+ Sign'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SUCCESSION PLANNING STRIP: VETERAN OUT (35+) → DOMESTIC STAR IN (≤25)
      ===================================================================== */}
      <section className="rounded-2xl border border-pink-200 bg-white p-6 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 border border-rose-200 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-rose-800">
                <Clock className="h-3 w-3" />
                Age &amp; Career Lifecycle Succession Engine
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-cyan-50 border border-cyan-200 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-cyan-800">
                3-Year Franchise Continuity (2027–2029)
              </span>
            </div>
            <h2 className="font-condensed text-2xl font-extrabold text-slate-900 mt-1.5">
              Succession Planning: Veteran Out (35+) &rarr; Domestic Star In (Ages 18–31)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5 max-w-3xl">
              Automatically pairs squad &amp; league veterans entering the 35+ transition/retirement window (such as <strong>Ravindra Jadeja (38)</strong>, <strong>Dasun Shanaka (35)</strong>, <strong>Rohit Sharma (39)</strong>, and <strong>MS Dhoni (45)</strong>) with exact role-matched Indian Domestic Breakout Replacements from SMAT, Ranji Trophy, and Vijay Hazare Trophy.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {successionPairs.map((pair) => (
            <div
              key={pair.id}
              className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col justify-between gap-3"
            >
              {/* Veteran Out Header */}
              <div className="rounded-xl bg-white border border-slate-200 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700">
                      Veteran Transition / Out
                    </span>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${getLifecycleBadgeClasses(
                        pair.veteranColorScheme,
                        false
                      )}`}
                    >
                      {pair.veteranLifecycleBadge}
                    </span>
                  </div>
                  <h3 className="font-condensed text-lg font-extrabold text-slate-900 mt-1">
                    {pair.veteranName}{' '}
                    {!pair.veteranName.includes('(') && (
                      <span className="font-mono text-sm text-rose-700">
                        ({pair.veteranAge})
                      </span>
                    )}
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-600 block">
                    {pair.veteranTeamLabel} &bull; {pair.veteranRole}
                  </span>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <span className="inline-flex items-center rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-[#D4AF37]">
                    {pair.successionUrgencyLabel}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-700 block mt-1">
                    {pair.veteranCurrentMetric}
                  </span>
                </div>
              </div>

              {/* Arrow + Domestic Replacements In */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#EA1A85] px-1">
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span>Paired Indian Domestic Breakout Replacements</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {pair.recommendedSuccessors.map((succ) => {
                    const succLc = getPlayerLifecycleProfile(succ.name, succ.age);
                    const isSigned =
                      succ.targetEngineId && signedTargetIds.includes(succ.targetEngineId);
                    return (
                      <div
                        key={succ.id}
                        className={`rounded-xl border p-3 bg-white flex flex-col justify-between ${
                          isSigned
                            ? 'border-[#EA1A85] ring-1 ring-[#EA1A85]/20'
                            : 'border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${getLifecycleBadgeClasses(
                                succLc.colorScheme,
                                false
                              )}`}
                            >
                              {succLc.badgeLabel}
                            </span>
                            <span className="font-mono text-[11px] font-extrabold text-slate-900">
                              {succ.domesticPrr} PRR
                            </span>
                          </div>

                          <div className="mt-1.5 flex items-baseline justify-between">
                            <h4 className="font-condensed text-base font-extrabold text-slate-900">
                              {succ.name}{' '}
                              <span className="font-mono text-xs text-cyan-700">
                                ({succ.age})
                              </span>
                            </h4>
                            <span className="font-mono text-[10px] font-bold text-emerald-700">
                              {succ.basePriceLabel}
                            </span>
                          </div>

                          <span className="text-[10px] font-bold text-[#EA1A85] block">
                            {succ.stateTeam} &bull; {succ.tournaments}
                          </span>
                          <p className="font-mono text-[11px] font-bold text-slate-800 mt-1">
                            {succ.domesticStatsLine}
                          </p>
                          <p className="text-[10px] text-slate-600 mt-1 leading-snug">
                            {succ.graduationReadiness}
                          </p>
                        </div>

                        {succ.targetEngineId && (
                          <button
                            type="button"
                            onClick={() => toggleSignTarget(succ.targetEngineId!)}
                            className={`mt-2.5 w-full flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition-colors cursor-pointer ${
                              isSigned
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-pink-50 border border-pink-200 text-[#EA1A85] hover:bg-[#EA1A85] hover:text-white'
                            }`}
                          >
                            {isSigned ? (
                              <>
                                <Check className="h-3 w-3" />
                                <span>Signed as 2027 Successor</span>
                              </>
                            ) : (
                              <>
                                <Plus className="h-3 w-3" />
                                <span>Sign Domestic Successor</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================================
          STAGE 1: 4 VISUAL "RR SQUAD WEAKNESS DIAGNOSTIC CARDS" SUMMARY GRID
      ===================================================================== */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#EA1A85]">
              Stage 1 • Live RR Squad Weakness Detector (Computed From Dataset)
            </span>
            <h2 className="font-condensed text-2xl font-extrabold text-slate-900">
              4 Rajasthan Royals Statistical Phase Bottlenecks vs. Top-4 Playoff Benchmarks
            </h2>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400 mr-1" />
            {[
              { id: 'ALL', label: 'All 4 Weaknesses' },
              { id: 'WEAKNESS_1_MIDDLE_SPIN', label: '#1 Middle Spin (9.71 RPO)' },
              { id: 'WEAKNESS_2_DEATH_PACE', label: '#2 Death Pace (11.39–11.96)' },
              { id: 'WEAKNESS_3_MIDDLE_FINISH', label: '#3 Middle Stall (9.07 RPO)' },
              { id: 'WEAKNESS_4_BENCH_COLLAPSE', label: '#4 0-Game Bench' },
            ].map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setActiveWeaknessFilter(pill.id as 'ALL' | RRWeaknessId)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  activeWeaknessFilter === pill.id
                    ? 'bg-[#EA1A85] text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Top Diagnostic Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {diagnosis.weaknessCards.map((card) => {
            const isSelected =
              activeWeaknessFilter === 'ALL' || activeWeaknessFilter === card.weaknessId;
            const resolvedBySigned = card.pairedDomesticTargets.some((t) =>
              signedTargetIds.includes(t.id)
            );
            return (
              <div
                key={card.weaknessId}
                onClick={() =>
                  setActiveWeaknessFilter((prev) =>
                    prev === card.weaknessId ? 'ALL' : card.weaknessId
                  )
                }
                className={`rounded-2xl border p-4 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-pink-300 bg-white shadow-sm'
                    : 'border-slate-200 bg-slate-50/70 opacity-75 hover:opacity-100'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                        card.severityBadge === 'CRITICAL GAP'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : card.severityBadge === 'HIGH PRIORITY'
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      }`}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {card.severityBadge}
                    </span>
                    {resolvedBySigned && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />
                        Target Signed
                      </span>
                    )}
                  </div>

                  <h3 className="font-condensed text-base font-extrabold text-slate-900 mt-2 leading-snug">
                    {card.title}
                  </h3>

                  <div className="mt-2.5 rounded-xl bg-rose-50/70 border border-rose-100 p-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                      Detected RR Dataset Gap
                    </span>
                    <span className="font-mono text-xs font-extrabold text-rose-900 mt-0.5 block">
                      {card.rrObservedMetric}
                    </span>
                    <span className="text-[10px] text-slate-600 mt-0.5 block">
                      Playoff Benchmark: <strong>{card.playoffTop4Benchmark}</strong>
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-600">
                    {card.pairedDomesticTargets.length} Domestic Targets Paired
                  </span>
                  <span className="font-bold text-[#EA1A85]">
                    {card.pairedDomesticTargets.map((t) => t.name.split(' ')[0]).join(', ')} →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          STAGE 2: PAIRED WEAKNESS-TO-DOMESTIC-TARGET RECOMMENDATION SECTIONS
      ===================================================================== */}
      <section className="flex flex-col gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#EA1A85]">
            Stage 2 • Automated Indian Domestic Target Recommendations (Paired to Each Weakness)
          </span>
          <h2 className="font-condensed text-2xl font-extrabold text-slate-900">
            Data-Matched Uncapped &amp; Domestic Targets (SMAT • Ranji Trophy • Vijay Hazare • RR Sept 2026 Trials)
          </h2>
        </div>

        {visibleWeaknessCards.map((weakness) => {
          const filteredTargets = weakness.pairedDomesticTargets.filter((t) => {
            const lc = getPlayerLifecycleProfile(t.name);
            if (lifecycleAgeFilter === 'DOMESTIC_NEXT_GEN_25') {
              return lc.age <= 25;
            }
            return true;
          });

          return (
            <div
              key={`section-${weakness.weaknessId}`}
              className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden"
            >
              {/* Weakness Header Banner */}
              <div className="bg-slate-900 text-white px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                        weakness.severityBadge === 'CRITICAL GAP'
                          ? 'bg-rose-500 text-white'
                          : weakness.severityBadge === 'HIGH PRIORITY'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-indigo-500 text-white'
                      }`}
                    >
                      {weakness.severityBadge}
                    </span>
                    <span className="text-xs font-mono text-pink-300 font-semibold">
                      {weakness.phaseSubtitle}
                    </span>
                  </div>
                  <h3 className="font-condensed text-xl md:text-2xl font-extrabold text-white mt-1">
                    {weakness.title}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-4xl">
                    {weakness.statisticalGapSummary}
                  </p>
                </div>

                {/* Flagged RR Incumbents Box with Age & Career Lifecycle Badge */}
                <div className="flex flex-wrap sm:flex-nowrap gap-2.5 shrink-0">
                  {weakness.flaggedIncumbents.map((inc) => {
                    const incLc = getPlayerLifecycleProfile(inc.name);
                    return (
                      <div
                        key={inc.name}
                        className="rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 min-w-[205px]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300">
                            Flagged Incumbent
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${getLifecycleBadgeClasses(
                              incLc.colorScheme,
                              true
                            )}`}
                          >
                            {incLc.badgeLabel}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-white block mt-1">
                          {inc.name}{' '}
                          <span className="font-mono text-xs text-slate-300">
                            ({incLc.age})
                          </span>
                        </span>
                        <span className="font-mono text-xs font-extrabold text-amber-300 block mt-0.5">
                          {inc.metricLabel}
                        </span>
                        <span className="text-[10px] text-slate-300 block mt-0.5">
                          {inc.contractOrStatus}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Paired Domestic Target Recommendation Cards */}
              <div className="p-6 bg-slate-50/50">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {filteredTargets.map((target: DomesticTargetRecommendation, idx: number) => {
                    const isSigned = signedTargetIds.includes(target.id);
                    const targetLc = getPlayerLifecycleProfile(target.name);
                    return (
                      <div
                        key={target.id}
                        className={`rounded-2xl border p-5 transition-all flex flex-col justify-between bg-white ${
                          isSigned
                            ? 'border-[#EA1A85] ring-2 ring-[#EA1A85]/15 shadow-sm'
                            : 'border-slate-200 hover:border-pink-300 shadow-2xs'
                        }`}
                      >
                        <div>
                          {/* Top Badge Row: Solves RR Weakness Badge + Lifecycle Stage + Est. India Cap + Domestic PRR */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 rounded-lg bg-pink-50 border border-pink-200 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#EA1A85]">
                                <Target className="h-3 w-3" />
                                {target.rrWeaknessFixTag || target.solvesWeaknessBadge}
                              </span>
                              {target.estIndiaCapLabel && (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-900">
                                  <Clock className="h-3 w-3 text-amber-700" />
                                  {target.estIndiaCapLabel}
                                </span>
                              )}
                              <span
                                className={`inline-flex items-center rounded-lg px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide ${getLifecycleBadgeClasses(
                                  targetLc.colorScheme,
                                  false
                                )}`}
                              >
                                {targetLc.badgeLabel}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-xs font-extrabold text-white">
                                {target.domesticPrr.toFixed(1)} PRR
                              </span>
                              <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 font-mono text-xs font-bold text-emerald-800">
                                {target.basePriceLabel}
                              </span>
                            </div>
                          </div>

                          {/* Player Identity & Headline Credential Line */}
                          <div className="mt-4 flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <PlayerAvatar
                                name={target.name}
                                rank={target.shortlistRank}
                                size="md"
                              />
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-[#EA1A85]">
                                    {target.shortlistRank
                                      ? `#${target.shortlistRank} ${target.discipline === 'batter' ? 'Domestic Batter' : 'Domestic Bowler'}`
                                      : `Target #${idx + 1}`}
                                  </span>
                                  <h4 className="font-condensed text-xl font-extrabold text-slate-900">
                                    {target.name}{' '}
                                    <span className="font-mono text-sm font-bold text-slate-500">
                                      (Age {targetLc.age})
                                    </span>
                                  </h4>
                                  {target.isCustomUploaded && (
                                    <span className="rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                                      Custom CSV
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-bold text-slate-700 mt-0.5">
                                  {target.headlineCredentialLine}
                                </p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                  {target.tournaments.map((tourney) => (
                                    <span
                                      key={tourney}
                                      className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700"
                                    >
                                      {tourney}
                                    </span>
                                  ))}
                                  <span className="rounded-md bg-pink-50/70 px-2 py-0.5 text-[10px] font-semibold text-[#EA1A85]">
                                    {target.roleArchetype}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Key Domestic & High-Pressure Metrics Strip */}
                          <div className="mt-4 grid grid-cols-3 gap-2.5 rounded-xl bg-slate-50 p-3 border border-slate-200/80">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                                Primary Output
                              </span>
                              <span className="font-mono text-xs font-extrabold text-slate-900 mt-0.5 block">
                                {target.keyMetricPrimary}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                                Pressure Control
                              </span>
                              <span className="font-mono text-xs font-extrabold text-[#EA1A85] mt-0.5 block">
                                {target.keyMetricSecondary}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                                Phase Impact
                              </span>
                              <span className="font-mono text-xs font-extrabold text-emerald-700 mt-0.5 block">
                                {target.phaseImpactDeltaLabel}
                              </span>
                            </div>
                          </div>

                          {/* Direct Incumbent Upgrade Comparison Box */}
                          <div className="mt-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                              <span>Direct Incumbent Upgrade Comparison</span>
                              <span>+{target.teamPrrBoost} Team PRR Lift</span>
                            </div>
                            <p className="text-xs font-bold text-slate-900 mt-1 leading-snug">
                              {target.directIncumbentComparison}
                            </p>
                            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                              <strong>Sawai Mansingh Fit:</strong> {target.sawaiMansinghTacticalNote}
                            </p>
                          </div>
                        </div>

                        {/* Action Footer: Sign Target for IPL 2027 + X-Ray / Super Over */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => toggleSignTarget(target.id)}
                            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                              isSigned
                                ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                                : 'bg-[#EA1A85] text-white shadow-xs hover:bg-[#D81478]'
                            }`}
                          >
                            {isSigned ? (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                <span>Signed for IPL 2027 (+{target.teamPrrBoost} PRR)</span>
                              </>
                            ) : (
                              <>
                                <Plus className="h-3.5 w-3.5" />
                                <span>Sign Target for IPL 2027</span>
                              </>
                            )}
                          </button>

                          {target.matchedDatasetPlayerId && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  onSelectPlayer(
                                    target.matchedDatasetPlayerId!,
                                    target.discipline
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                              >
                                <span>Player X-Ray</span>
                                <ArrowUpRight className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onTestInSuperOver(
                                    target.matchedDatasetPlayerId!,
                                    target.discipline
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-pink-200 bg-pink-50/70 px-2.5 py-1.5 text-[11px] font-semibold text-[#EA1A85] hover:bg-pink-100 cursor-pointer"
                              >
                                <Swords className="h-3 w-3" />
                                <span>Super Over</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
};
