import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  Globe,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { BatterRating, BowlerRating } from '../types/cricket';
import { PlayerAvatar } from './PlayerAvatar';

interface GlobalMasterDirectoryProps {
  batters: BatterRating[];
  bowlers: BowlerRating[];
  onSelectPlayer?: (playerId: number, type: 'batter' | 'bowler') => void;
}

type DirectoryFilterMode = 'ALL' | 'BATTERS' | 'BOWLERS' | 'DUAL_FORMAT';
type SortColumn =
  | 'rank'
  | 'name'
  | 'comp'
  | 'prr'
  | 'balls'
  | 'rate'
  | 'elevation'
  | 'dotBoundary';

interface GlobalMasterEntry {
  key: string;
  playerId: number;
  name: string;
  teamName: string;
  discipline: 'batter' | 'bowler';
  primaryRole: string;
  batRatioPct: number;
  bowlRatioPct: number;
  competitionsPlayed: 'IPL + IT20' | 'IPL Only' | 'IT20 Only';
  prr: number;
  highBpiBalls: number;
  totalBalls: number;
  pressureRate: number;
  pressureRateLabel: string;
  baselineElevation: number;
  baselineElevationLabel: string;
  dotOrBoundaryPct: number;
  dotOrBoundaryLabel: string;
}

function detectCompetitionsPlayed(
  batter?: BatterRating,
  bowler?: BowlerRating
): 'IPL + IT20' | 'IPL Only' | 'IT20 Only' {
  if (
    batter?.competitionsPlayed === 'IPL + IT20' ||
    bowler?.competitionsPlayed === 'IPL + IT20'
  ) {
    return 'IPL + IT20';
  }

  let hasIpl =
    batter?.competitionsPlayed === 'IPL Only' ||
    bowler?.competitionsPlayed === 'IPL Only';
  let hasIt20 =
    batter?.competitionsPlayed === 'IT20 Only' ||
    bowler?.competitionsPlayed === 'IT20 Only';

  const logs = [
    ...(batter?.pressureInningsLog || []),
    ...(bowler?.pressureSpellsLog || []),
  ];
  for (let i = 0; i < logs.length; i++) {
    const c = (logs[i].comp_name || '').toLowerCase();
    if (c.includes('t20i') || c.includes('it20') || c.includes('international') || c.includes('world cup')) {
      hasIt20 = true;
    } else if (c.includes('ipl') || c.includes('indian premier')) {
      hasIpl = true;
    }
  }

  if (hasIpl && hasIt20) return 'IPL + IT20';
  if (hasIt20 && !hasIpl) return 'IT20 Only';
  return 'IPL Only';
}

function computeAccurateBowlerDotPct(
  bw: BowlerRating,
  leagueAvgDotPct: number,
  leagueAvgPressureEcon: number
): number {
  if (bw.pressureDotPct > 0.1) {
    return Number(bw.pressureDotPct.toFixed(1));
  }
  const spellDots = (bw.pressureSpellsLog || []).reduce(
    (acc, m) => acc + (m.pressure_dots || 0),
    0
  );
  if (spellDots > 0 && bw.pressureBalls > 0) {
    return Number(Math.min(68.0, (spellDots / bw.pressureBalls) * 100).toFixed(1));
  }
  const delivDots = (bw.topPressureDeliveries || []).filter(
    (d) => d.isDot || d.runsConceded === 0
  ).length;
  const delivTotal = (bw.topPressureDeliveries || []).length;
  if (delivDots > 0 && delivTotal > 0 && bw.pressureBalls > 0) {
    const sampleDotPct = (delivDots / delivTotal) * 100;
    const econAdjusted =
      leagueAvgDotPct + (leagueAvgPressureEcon - bw.pressureEconomy) * 2.6;
    return Number(
      Math.max(24.0, Math.min(58.0, 0.5 * sampleDotPct + 0.5 * econAdjusted)).toFixed(1)
    );
  }
  if (bw.pressureBalls > 0) {
    const econAdjusted =
      leagueAvgDotPct + (leagueAvgPressureEcon - bw.pressureEconomy) * 2.6;
    return Number(Math.max(24.0, Math.min(58.0, econAdjusted)).toFixed(1));
  }
  return 0;
}

export const GlobalMasterDirectory: React.FC<GlobalMasterDirectoryProps> = ({
  batters,
  bowlers,
  onSelectPlayer,
}) => {
  const [filterMode, setFilterMode] = useState<DirectoryFilterMode>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortCol, setSortCol] = useState<SortColumn>('prr');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Dynamically compute dataset league averages for Bayesian shrinkage
  const datasetBaselines = useMemo(() => {
    let batBalls = 0;
    let batRuns = 0;
    let batWeightedBoundary = 0;
    for (let i = 0; i < batters.length; i++) {
      const b = batters[i];
      if (b.pressureBalls > 0) {
        batBalls += b.pressureBalls;
        batRuns += b.pressureRuns;
        batWeightedBoundary += b.pressureBalls * b.pressureBoundaryPct;
      }
    }

    let bowlBalls = 0;
    let bowlRuns = 0;
    let bowlWeightedDot = 0;
    for (let i = 0; i < bowlers.length; i++) {
      const bw = bowlers[i];
      if (bw.pressureBalls > 0) {
        bowlBalls += bw.pressureBalls;
        bowlRuns += bw.pressureRunsConceded;
        bowlWeightedDot += bw.pressureBalls * bw.pressureDotPct;
      }
    }

    const leagueAvgPressureSR =
      batBalls > 0 ? Number(((batRuns / batBalls) * 100).toFixed(1)) : 138.0;
    const leagueAvgBoundaryPct =
      batBalls > 0 ? Number((batWeightedBoundary / batBalls).toFixed(1)) : 18.5;
    const leagueAvgPressureEcon =
      bowlBalls > 0 ? Number((bowlRuns / (bowlBalls / 6)).toFixed(2)) : 8.8;
    const rawDot = bowlBalls > 0 ? bowlWeightedDot / bowlBalls : 0;
    const leagueAvgDotPct = rawDot > 1.0 ? Number(rawDot.toFixed(1)) : 36.0;

    return {
      leagueAvgPressureSR,
      leagueAvgBoundaryPct,
      leagueAvgPressureEcon,
      leagueAvgDotPct,
    };
  }, [batters, bowlers]);

  // Build master player records across all IPL + IT20 deliveries
  const directoryData = useMemo(() => {
    const batterById = new Map<number, BatterRating>();
    batters.forEach((b) => batterById.set(b.playerId, b));

    const bowlerById = new Map<number, BowlerRating>();
    bowlers.forEach((bw) => bowlerById.set(bw.playerId, bw));

    const allPlayerIds = new Set<number>([
      ...Array.from(batterById.keys()),
      ...Array.from(bowlerById.keys()),
    ]);

    const qualifiedBatterEntries: GlobalMasterEntry[] = [];
    const qualifiedBowlerEntries: GlobalMasterEntry[] = [];
    const unifiedEntries: GlobalMasterEntry[] = [];

    allPlayerIds.forEach((playerId) => {
      const b = batterById.get(playerId);
      const bw = bowlerById.get(playerId);

      const battingBalls = b ? b.totalBalls : 0;
      const highBpiBatBalls = b ? b.pressureBalls : 0;
      const bowlingBalls = bw ? bw.totalBalls : 0;
      const highBpiBowlBalls = bw ? bw.pressureBalls : 0;
      const totalBalls = Math.max(1, battingBalls + bowlingBalls);

      const batRatio = battingBalls / totalBalls;
      const bowlRatio = bowlingBalls / totalBalls;
      const batRatioPct = Math.round(batRatio * 100);
      const bowlRatioPct = 100 - batRatioPct;

      const isBatterQualified =
        b !== undefined &&
        battingBalls >= 40 &&
        highBpiBatBalls >= 20 &&
        batRatio >= 0.25;

      const isBowlerQualified =
        bw !== undefined &&
        bowlingBalls >= 48 &&
        highBpiBowlBalls >= 24 &&
        bowlRatio >= 0.25;

      if (!isBatterQualified && !isBowlerQualified) return;

      const competitionsPlayed = detectCompetitionsPlayed(b, bw);

      let batterEntry: GlobalMasterEntry | null = null;
      if (isBatterQualified && b) {
        const N = b.pressureBalls;
        const PRIOR_WEIGHT = 100;
        const weight = N / (N + PRIOR_WEIGHT);
        const shrunkSR =
          (N * b.pressureSR + PRIOR_WEIGHT * datasetBaselines.leagueAvgPressureSR) /
          (N + PRIOR_WEIGHT);
        const rawElev = b.normalBalls > 0 ? b.pressureSR - b.normalSR : b.srDelta;
        const adjustedElev = Number((weight * rawElev).toFixed(1));
        const shrunkBnd =
          (N * b.pressureBoundaryPct +
            PRIOR_WEIGHT * datasetBaselines.leagueAvgBoundaryPct) /
          (N + PRIOR_WEIGHT);

        const prr = Math.min(
          98.5,
          Math.max(
            42.0,
            Number(
              (
                58.0 +
                (shrunkSR - datasetBaselines.leagueAvgPressureSR) * 0.36 +
                (shrunkBnd - datasetBaselines.leagueAvgBoundaryPct) * 0.42 +
                Math.max(-6, Math.min(8, adjustedElev * 0.18)) +
                weight * 13.5
              ).toFixed(1)
            )
          )
        );

        const primaryRole =
          batRatio >= 0.75
            ? `${b.role} Batter (${batRatioPct}% Bat)`
            : `Batting All-Rounder (${batRatioPct}% Bat)`;

        batterEntry = {
          key: `bat_${playerId}`,
          playerId,
          name: b.name,
          teamName: b.teamName,
          discipline: 'batter',
          primaryRole,
          batRatioPct,
          bowlRatioPct,
          competitionsPlayed,
          prr,
          highBpiBalls: b.pressureBalls,
          totalBalls: b.totalBalls,
          pressureRate: Number(b.pressureSR.toFixed(1)),
          pressureRateLabel: `${b.pressureSR.toFixed(1)} SR`,
          baselineElevation: adjustedElev,
          baselineElevationLabel: `${adjustedElev >= 0 ? '+' : ''}${adjustedElev.toFixed(1)} SR`,
          dotOrBoundaryPct: Number(b.pressureBoundaryPct.toFixed(1)),
          dotOrBoundaryLabel: `${b.pressureBoundaryPct.toFixed(1)}% Bnd`,
        };
        qualifiedBatterEntries.push(batterEntry);
      }

      let bowlerEntry: GlobalMasterEntry | null = null;
      if (isBowlerQualified && bw) {
        const N = bw.pressureBalls;
        const PRIOR_WEIGHT = 90;
        const weight = N / (N + PRIOR_WEIGHT);
        const dotPct = computeAccurateBowlerDotPct(
          bw,
          datasetBaselines.leagueAvgDotPct,
          datasetBaselines.leagueAvgPressureEcon
        );
        const adjustedEcon =
          (N * bw.pressureEconomy +
            PRIOR_WEIGHT * datasetBaselines.leagueAvgPressureEcon) /
          (N + PRIOR_WEIGHT);
        const shrunkDot =
          (N * dotPct + PRIOR_WEIGHT * datasetBaselines.leagueAvgDotPct) /
          (N + PRIOR_WEIGHT);
        const rawElev =
          bw.normalBalls > 0
            ? bw.normalEconomy - bw.pressureEconomy
            : bw.economyDelta;
        const adjustedElev = Number((weight * rawElev).toFixed(2));

        const prr = Math.min(
          98.5,
          Math.max(
            42.0,
            Number(
              (
                56.5 +
                (datasetBaselines.leagueAvgPressureEcon - adjustedEcon) * 9.8 +
                (shrunkDot - datasetBaselines.leagueAvgDotPct) * 0.48 +
                (bw.pressureWickets / (N + 45)) * 155 +
                Math.max(-5, Math.min(6, adjustedElev * 2.0)) +
                weight * 14.0
              ).toFixed(1)
            )
          )
        );

        const primaryRole =
          bowlRatio >= 0.75
            ? `${bw.paceOrSpin} Bowler (${bowlRatioPct}% Bowl)`
            : `Bowling All-Rounder (${bowlRatioPct}% Bowl)`;

        bowlerEntry = {
          key: `bowl_${playerId}`,
          playerId,
          name: bw.name,
          teamName: bw.teamName,
          discipline: 'bowler',
          primaryRole,
          batRatioPct,
          bowlRatioPct,
          competitionsPlayed,
          prr,
          highBpiBalls: bw.pressureBalls,
          totalBalls: bw.totalBalls,
          pressureRate: Number(bw.pressureEconomy.toFixed(2)),
          pressureRateLabel: `${bw.pressureEconomy.toFixed(2)} Econ`,
          baselineElevation: adjustedElev,
          baselineElevationLabel: `${adjustedElev >= 0 ? '+' : ''}${adjustedElev.toFixed(2)} Econ`,
          dotOrBoundaryPct: dotPct,
          dotOrBoundaryLabel: `${dotPct.toFixed(1)}% Dot`,
        };
        qualifiedBowlerEntries.push(bowlerEntry);
      }

      if (batterEntry && bowlerEntry) {
        unifiedEntries.push(
          batterEntry.prr >= bowlerEntry.prr ? batterEntry : bowlerEntry
        );
      } else if (batterEntry) {
        unifiedEntries.push(batterEntry);
      } else if (bowlerEntry) {
        unifiedEntries.push(bowlerEntry);
      }
    });

    return {
      unifiedEntries,
      qualifiedBatterEntries,
      qualifiedBowlerEntries,
      dualFormatCount: unifiedEntries.filter(
        (e) => e.competitionsPlayed === 'IPL + IT20'
      ).length,
    };
  }, [batters, bowlers, datasetBaselines]);

  // Apply filter pill, search bar, and global ranking
  const filteredAndRanked = useMemo(() => {
    let baseList: GlobalMasterEntry[] = [];
    if (filterMode === 'BATTERS') {
      baseList = directoryData.qualifiedBatterEntries;
    } else if (filterMode === 'BOWLERS') {
      baseList = directoryData.qualifiedBowlerEntries;
    } else if (filterMode === 'DUAL_FORMAT') {
      baseList = directoryData.unifiedEntries.filter(
        (e) => e.competitionsPlayed === 'IPL + IT20'
      );
    } else {
      baseList = directoryData.unifiedEntries;
    }

    // Assign Global Rank by PRR descending within active cohort
    const prrSorted = [...baseList].sort((a, b) => b.prr - a.prr);
    const rankedList = prrSorted.map((entry, idx) => ({
      ...entry,
      globalRank: idx + 1,
    }));

    // Filter by search query
    const q = searchQuery.trim().toLowerCase();
    const searched = q
      ? rankedList.filter(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            item.primaryRole.toLowerCase().includes(q) ||
            item.teamName.toLowerCase().includes(q) ||
            item.competitionsPlayed.toLowerCase().includes(q)
        )
      : rankedList;

    // Sort by selected column
    return [...searched].sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case 'rank':
          cmp = a.globalRank - b.globalRank;
          break;
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'comp':
          cmp = a.competitionsPlayed.localeCompare(b.competitionsPlayed);
          break;
        case 'prr':
          cmp = b.prr - a.prr;
          break;
        case 'balls':
          cmp = b.highBpiBalls - a.highBpiBalls;
          break;
        case 'rate':
          cmp = b.pressureRate - a.pressureRate;
          break;
        case 'elevation':
          cmp = b.baselineElevation - a.baselineElevation;
          break;
        case 'dotBoundary':
          cmp = b.dotOrBoundaryPct - a.dotOrBoundaryPct;
          break;
      }
      return sortAsc ? -cmp : cmp;
    });
  }, [directoryData, filterMode, searchQuery, sortCol, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredAndRanked.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredAndRanked.slice(start, start + pageSize);
  }, [filteredAndRanked, safePage, pageSize]);

  const handleSort = (col: SortColumn) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(false);
    }
  };

  const handleDownloadGlobalCsv = () => {
    const header = [
      'Global Rank',
      'Player Name',
      'Primary Role',
      'Competitions Played',
      'Pressure Reliability Rating (PRR)',
      'High-BPI Balls',
      'Pressure Rate',
      'Baseline Elevation',
      'Dot / Boundary %',
    ];
    const rows = filteredAndRanked.map((r) => [
      `#${r.globalRank}`,
      `"${r.name}"`,
      `"${r.primaryRole}"`,
      `"${r.competitionsPlayed}"`,
      r.prr.toFixed(1),
      r.highBpiBalls,
      `"${r.pressureRateLabel}"`,
      `"${r.baselineElevationLabel}"`,
      `"${r.dotOrBoundaryLabel}"`,
    ]);
    const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join(
      '\n'
    );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Global_Master_Player_Directory_IPL_IT20.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section
      id="global-master-directory"
      className="rounded-3xl border border-white/[0.08] bg-[#0A0E1A] p-6 md:p-8 text-white shadow-xl relative overflow-hidden"
    >
      {/* Ambient Accents */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#EA1A85]/12 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[#D4AF37]/10 blur-3xl" />

      {/* Section 1 Header */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#EA1A85]/40 bg-[#EA1A85]/15 px-3 py-1 text-[11px] font-bold tracking-wide text-pink-300">
              <Globe className="h-3.5 w-3.5 text-[#EA1A85]" />
              Section 1 · Global Master Player Directory
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-mono text-slate-300">
              <Layers className="h-3.5 w-3.5 text-[#D4AF37]" />
              {directoryData.unifiedEntries.length} Qualified Players Across All Formats
            </span>
          </div>
          <h2 className="font-condensed text-2xl sm:text-3xl font-extrabold text-white mt-2 tracking-tight">
            Global Master Player Directory (All IT20 + IPL Combined)
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
            Complete multi-competition leaderboard of all qualified players across IPL and
            International T20s, ranked by dataset-adaptive Bayesian Pressure Reliability Rating
            with automated batting/bowling role detection.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleDownloadGlobalCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#D4AF37]/50 bg-[#D4AF37]/15 px-4 py-2.5 text-xs font-bold text-[#D4AF37] hover:bg-[#D4AF37] hover:text-slate-950 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Global Master CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Pills + Search Bar */}
      <div className="relative z-10 mt-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              {
                id: 'ALL' as DirectoryFilterMode,
                label: 'All Players',
                count: directoryData.unifiedEntries.length,
              },
              {
                id: 'BATTERS' as DirectoryFilterMode,
                label: 'Batters Only',
                count: directoryData.qualifiedBatterEntries.length,
              },
              {
                id: 'BOWLERS' as DirectoryFilterMode,
                label: 'Bowlers Only',
                count: directoryData.qualifiedBowlerEntries.length,
              },
              {
                id: 'DUAL_FORMAT' as DirectoryFilterMode,
                label: 'Dual-Format Proven (Both IPL & IT20)',
                count: directoryData.dualFormatCount,
              },
            ] as const
          ).map((pill) => {
            const active = filterMode === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => {
                  setFilterMode(pill.id);
                  setCurrentPage(1);
                }}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? 'bg-[#EA1A85] text-white shadow-sm'
                    : 'border border-white/10 bg-[#111729] text-slate-300 hover:border-white/25 hover:text-white'
                }`}
              >
                <span>{pill.label}</span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono ${
                    active ? 'bg-black/25 text-white' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full xl:w-80">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search any player across IPL & IT20..."
            className="w-full rounded-xl border border-white/15 bg-[#111729] pl-9 pr-3.5 py-2 text-xs text-white placeholder:text-slate-400 focus:border-[#EA1A85] focus:outline-none"
          />
        </div>
      </div>

      {/* Master Paginated Table */}
      <div className="relative z-10 mt-5 rounded-2xl border border-white/[0.08] bg-[#111729]/95 p-4 sm:p-5 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] text-[11px] font-semibold text-slate-400">
                <th
                  onClick={() => handleSort('rank')}
                  className="py-3 px-2.5 cursor-pointer hover:text-white whitespace-nowrap"
                >
                  Global Rank
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="py-3 px-2.5 cursor-pointer hover:text-white whitespace-nowrap"
                >
                  Player Name &amp; Primary Role
                </th>
                <th
                  onClick={() => handleSort('comp')}
                  className="py-3 px-2.5 cursor-pointer hover:text-white whitespace-nowrap"
                >
                  Competitions Played
                </th>
                <th
                  onClick={() => handleSort('prr')}
                  className="py-3 px-2.5 text-right cursor-pointer hover:text-white whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    Pressure Reliability Rating (PRR){' '}
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('balls')}
                  className="py-3 px-2.5 text-right cursor-pointer hover:text-white whitespace-nowrap"
                >
                  High-BPI Balls
                </th>
                <th
                  onClick={() => handleSort('rate')}
                  className="py-3 px-2.5 text-right cursor-pointer hover:text-white whitespace-nowrap"
                >
                  Pressure Rate
                </th>
                <th
                  onClick={() => handleSort('elevation')}
                  className="py-3 px-2.5 text-right cursor-pointer hover:text-white whitespace-nowrap"
                >
                  Baseline Elevation
                </th>
                <th
                  onClick={() => handleSort('dotBoundary')}
                  className="py-3 px-2.5 text-right cursor-pointer hover:text-white whitespace-nowrap"
                >
                  Dot / Boundary %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] font-mono">
              {paginatedRows.map((row) => (
                <tr
                  key={row.key}
                  onClick={() =>
                    onSelectPlayer && onSelectPlayer(row.playerId, row.discipline)
                  }
                  className="hover:bg-white/[0.04] transition-colors cursor-pointer"
                >
                  <td className="py-3 px-2.5 font-bold">
                    <span
                      className={`inline-flex h-6 min-w-7 px-1.5 items-center justify-center rounded-md text-[11px] font-bold ${
                        row.globalRank === 1
                          ? 'bg-[#D4AF37] text-slate-950'
                          : row.globalRank <= 3
                          ? 'bg-[#EA1A85]/25 text-pink-200 border border-[#EA1A85]/40'
                          : row.globalRank <= 10
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30'
                          : 'bg-white/5 text-slate-300'
                      }`}
                    >
                      #{row.globalRank}
                    </span>
                  </td>

                  <td className="py-3 px-2.5 font-sans">
                    <div className="flex items-center gap-2.5">
                      <PlayerAvatar
                        name={row.name}
                        rank={row.globalRank}
                        size="sm"
                        showRankBadge={false}
                      />
                      <div>
                        <span className="font-bold text-white block leading-tight">
                          {row.name}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {row.primaryRole}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-2.5 font-sans">
                    {row.competitionsPlayed === 'IPL + IT20' ? (
                      <span className="inline-flex items-center rounded-md border border-[#D4AF37]/40 bg-[#D4AF37]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#D4AF37] whitespace-nowrap">
                        IPL + IT20
                      </span>
                    ) : row.competitionsPlayed === 'IPL Only' ? (
                      <span className="inline-flex items-center rounded-md border border-pink-400/30 bg-[#EA1A85]/15 px-2.5 py-0.5 text-[10px] font-bold text-pink-300 whitespace-nowrap">
                        IPL Only
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md border border-sky-400/30 bg-sky-500/15 px-2.5 py-0.5 text-[10px] font-bold text-sky-300 whitespace-nowrap">
                        IT20 Only
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-2.5 text-right font-bold text-[#D4AF37] text-sm">
                    {row.prr.toFixed(1)}
                  </td>

                  <td className="py-3 px-2.5 text-right text-slate-200">
                    {row.highBpiBalls}{' '}
                    <span className="text-[10px] text-slate-500">
                      / {row.totalBalls}
                    </span>
                  </td>

                  <td className="py-3 px-2.5 text-right font-bold text-white whitespace-nowrap">
                    {row.pressureRateLabel}
                  </td>

                  <td
                    className={`py-3 px-2.5 text-right font-bold whitespace-nowrap ${
                      row.baselineElevation >= 0
                        ? 'text-emerald-400'
                        : 'text-amber-300'
                    }`}
                  >
                    {row.baselineElevationLabel}
                  </td>

                  <td className="py-3 px-2.5 text-right text-slate-200 whitespace-nowrap">
                    {row.dotOrBoundaryLabel}
                  </td>
                </tr>
              ))}

              {paginatedRows.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 text-center text-slate-400 font-sans"
                  >
                    No qualified players match "{searchQuery}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="mt-4 pt-3 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>
              Showing{' '}
              <strong className="text-white">
                {filteredAndRanked.length === 0
                  ? 0
                  : (safePage - 1) * pageSize + 1}
              </strong>
              –
              <strong className="text-white">
                {Math.min(safePage * pageSize, filteredAndRanked.length)}
              </strong>{' '}
              of <strong className="text-white">{filteredAndRanked.length}</strong>{' '}
              qualified players
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="ml-2 rounded-lg border border-white/15 bg-[#0A0E1A] px-2 py-1 text-xs text-white focus:border-[#EA1A85] focus:outline-none"
            >
              <option value={15}>15 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={250}>All</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>
            <span className="font-mono text-xs text-slate-300 px-2">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-40 cursor-pointer"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
