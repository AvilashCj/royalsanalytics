import React, { useState, useMemo, useRef } from 'react';
import {
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Users,
  ShieldCheck,
  AlertTriangle,
  ArrowUpDown,
  FileSpreadsheet,
  Search,
  Clock,
  ArrowRight,
} from 'lucide-react';
import Papa from 'papaparse';
import { BatterRating, BowlerRating } from '../types/cricket';
import { PlayerAvatar } from './PlayerAvatar';
import {
  buildVeteranToDomesticSuccessionPairs,
  getLifecycleBadgeClasses,
  getPlayerLifecycleProfile,
  LifecycleAgeFilter,
} from '../utils/playerLifecycleEngine';

export interface UploadedSquadPlayer {
  rawName: string;
  role?: string;
  retentionStatus?: string;
  ageOrBirthDate?: string;
}

interface SquadCsvMatcherProps {
  batters: BatterRating[];
  bowlers: BowlerRating[];
  onSelectPlayer?: (playerId: number, type: 'batter' | 'bowler') => void;
}

export const RR_2026_PRESET_SQUAD: UploadedSquadPlayer[] = [
  { rawName: 'Vaibhav Sooryavanshi', role: 'Opener', retentionStatus: 'Retained' },
  { rawName: 'Yashasvi Jaiswal', role: 'Opener', retentionStatus: 'Retained Core' },
  { rawName: 'Riyan Parag', role: 'Middle-Order', retentionStatus: 'Retained Core' },
  { rawName: 'Dhruv Jurel', role: 'Wicketkeeper Batter', retentionStatus: 'Retained Core' },
  { rawName: 'Shimron Hetmyer', role: 'Finisher', retentionStatus: 'Retained Core' },
  { rawName: 'Donovan Ferreira', role: 'Finisher / WK', retentionStatus: 'Squad' },
  { rawName: 'Ravindra Jadeja', role: 'All-Rounder', retentionStatus: 'Marquee' },
  { rawName: 'Shubham Dubey', role: 'Middle-Order Finisher', retentionStatus: 'Squad' },
  { rawName: 'Lhuan-dre Pretorius', role: 'Top-Order Batter', retentionStatus: 'Squad' },
  { rawName: 'Dasun Shanaka', role: 'All-Rounder', retentionStatus: 'Squad' },
  { rawName: 'Jofra Archer', role: 'Pace Spearhead', retentionStatus: 'Marquee' },
  { rawName: 'Ravi Bishnoi', role: 'Wrist Spinner', retentionStatus: 'Marquee' },
  { rawName: 'Nandre Burger', role: 'Left-Arm Pace', retentionStatus: 'Squad' },
  { rawName: 'Sandeep Sharma', role: 'Swing & Death Bowler', retentionStatus: 'Retained Core' },
  { rawName: 'Tushar Deshpande', role: 'Pace Bowler', retentionStatus: 'Squad' },
  { rawName: 'Kwena Maphaka', role: 'Left-Arm Express', retentionStatus: 'Squad' },
  { rawName: 'Adam Milne', role: 'Express Pace', retentionStatus: 'Squad' },
  { rawName: 'Kuldeep Sen', role: 'Fast Bowler', retentionStatus: 'Squad' },
  { rawName: 'Vignesh Puthur', role: 'Wrist Spinner', retentionStatus: 'Squad' },
  { rawName: 'Yudhvir Singh', role: 'Pace All-Rounder', retentionStatus: 'Squad' },
  { rawName: 'Sushant Mishra', role: 'Left-Arm Pace', retentionStatus: 'Squad' },
  { rawName: 'Brijesh Sharma', role: 'Pace Bowler', retentionStatus: 'Squad' },
  { rawName: 'Emanjot Chahal', role: 'Spin All-Rounder', retentionStatus: 'Squad' },
];

// Universal string normalization for any cricket roster
function normalizeName(str: string): string {
  return str
    .toLowerCase()
    .replace(/['’`._-]/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Phonetic vowel normalization for transliteration variants (e.g., oo -> u, ee -> i, aa -> a)
function phoneticNormalize(token: string): string {
  return token
    .toLowerCase()
    .replace(/oo/g, 'u')
    .replace(/ee/g, 'i')
    .replace(/aa/g, 'a')
    .replace(/ey\b/g, 'e');
}

// Compute Levenshtein edit distance between two tokens
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

interface ParsedNameTokens {
  normFull: string;
  tokens: string[];
  surname: string;
  givenJoined: string;
  firstLetter: string;
  compoundInitials: string;
  isInitialFormat: boolean;
}

// Parse any player name into given-name tokens, initials, and surname without hardcoded dictionaries
function parsePlayerName(raw: string): ParsedNameTokens {
  const trimmed = raw.trim();
  const rawParts = trimmed.split(/\s+/).filter(Boolean);
  const firstRawPart = rawParts[0] || '';
  const isRawInitial =
    /^[A-Z]{1,3}\.?$/.test(firstRawPart) ||
    firstRawPart.replace(/[^a-zA-Z]/g, '').length <= 2;

  const normFull = normalizeName(trimmed);
  const tokens = normFull.split(' ').filter(Boolean);

  if (tokens.length === 0) {
    return {
      normFull: '',
      tokens: [],
      surname: '',
      givenJoined: '',
      firstLetter: '',
      compoundInitials: '',
      isInitialFormat: false,
    };
  }

  if (tokens.length === 1) {
    return {
      normFull,
      tokens,
      surname: tokens[0],
      givenJoined: '',
      firstLetter: tokens[0][0] || '',
      compoundInitials: tokens[0][0] || '',
      isInitialFormat: false,
    };
  }

  const surname = tokens[tokens.length - 1];
  const givenTokens = tokens.slice(0, tokens.length - 1);
  const givenJoined = givenTokens.join('');
  const firstLetter = givenTokens[0][0] || '';
  const compoundInitials = givenTokens.map((t) => t[0]).join('');
  const isInitialFormat =
    isRawInitial || (givenTokens.length === 1 && givenTokens[0].length <= 2);

  return {
    normFull,
    tokens,
    surname,
    givenJoined,
    firstLetter,
    compoundInitials,
    isInitialFormat,
  };
}

// Check if two surname tokens match (exact, phonetic transliteration, or 1-char edit distance on long surnames)
function doSurnamesMatch(surA: string, surB: string): { matched: boolean; exact: boolean } {
  if (!surA || !surB) return { matched: false, exact: false };
  if (surA === surB) return { matched: true, exact: true };

  const phonA = phoneticNormalize(surA);
  const phonB = phoneticNormalize(surB);
  if (phonA === phonB && phonA.length >= 4) {
    return { matched: true, exact: true };
  }

  if (surA.length >= 6 && surB.length >= 6 && editDistance(surA, surB) <= 1) {
    return { matched: true, exact: false };
  }

  return { matched: false, exact: false };
}

// Universal Fuzzy Name Resolver: matches exact full names, FirstInitial LastName, multi-initials, and Levenshtein similarity
function scorePlayerNameMatch(uploadedRaw: string, candidateRaw: string): number {
  const up = parsePlayerName(uploadedRaw);
  const cand = parsePlayerName(candidateRaw);

  if (!up.normFull || !cand.normFull) return 0;
  if (up.normFull === cand.normFull) return 100;
  if (phoneticNormalize(up.normFull) === phoneticNormalize(cand.normFull)) return 99;

  // Check primary surname match (and optional 3-token patronymic/middle-surname alignment)
  let surnameCheck = doSurnamesMatch(up.surname, cand.surname);
  if (!surnameCheck.matched) {
    // Handle cases where one side includes a 3rd trailing suffix token (e.g., "First Surname Suffix" vs "First Surname")
    if (up.tokens.length >= 3 && cand.tokens.length === 2) {
      surnameCheck = doSurnamesMatch(up.tokens[1], cand.surname);
    } else if (cand.tokens.length >= 3 && up.tokens.length === 2) {
      surnameCheck = doSurnamesMatch(cand.tokens[1], up.surname);
    }
  }

  if (!surnameCheck.matched) return 0;

  // Single-word name match
  if (up.tokens.length === 1 || cand.tokens.length === 1) {
    return up.surname.length >= 6 ? 86 : 0;
  }

  // Case 1: Both names provide full given names (neither is an initial abbreviation)
  if (!up.isInitialFormat && !cand.isInitialFormat) {
    if (up.givenJoined === cand.givenJoined) {
      return surnameCheck.exact ? 98 : 94;
    }
    if (phoneticNormalize(up.givenJoined) === phoneticNormalize(cand.givenJoined)) {
      return surnameCheck.exact ? 97 : 93;
    }
    if (
      up.givenJoined.length >= 5 &&
      cand.givenJoined.length >= 5 &&
      editDistance(up.givenJoined, cand.givenJoined) <= 1
    ) {
      return surnameCheck.exact ? 94 : 90;
    }
    // Check first given token match when one player has a middle name (e.g., "Yudhvir Singh" vs "Yudhvir Singh Charak")
    if (up.tokens[0].length >= 4 && up.tokens[0] === cand.tokens[0]) {
      return 95;
    }
    return 0;
  }

  // Case 2: At least one side uses initial abbreviation(s) (e.g. "J Archer", "JC Archer", "RA Jadeja", "TU Deshpande", "L Pretorius", "LD Pretorius", "YBK Jaiswal")
  const initSide = up.isInitialFormat ? up : cand;
  const fullSide = up.isInitialFormat ? cand : up;
  const initStr = initSide.givenJoined;

  if (!initStr || !fullSide.firstLetter) return 0;

  // Compound hyphen/multi-word initials match (e.g., "ld" matches "lhuan dre")
  if (initStr.length >= 2 && initStr === fullSide.compoundInitials) {
    return surnameCheck.exact ? 96 : 91;
  }

  // Prefix abbreviation match (e.g., "tu" matches "tushar", "ra" matches "ravindra")
  if (initStr.length >= 2 && fullSide.givenJoined.startsWith(initStr)) {
    return surnameCheck.exact ? 95 : 90;
  }

  // First initial match (e.g., "j" or "jc" matches "jofra", "r" matches "ravi", "n" matches "nandre", "ybk" matches "yashasvi")
  if (initStr[0] === fullSide.firstLetter) {
    // Require exact surname match when matching purely via initial(s) to avoid cross-surname collisions
    if (!surnameCheck.exact) return 0;
    return initStr.length === 1 ? 92 : 91;
  }

  return 0;
}

// Compute accurate Dot Ball % across all CSV schemas
function computeBowlerDotBallPct(
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
    const econAdjusted = leagueAvgDotPct + (leagueAvgPressureEcon - bw.pressureEconomy) * 2.6;
    const blended = 0.5 * sampleDotPct + 0.5 * econAdjusted;
    return Number(Math.max(24.0, Math.min(58.0, blended)).toFixed(1));
  }
  if (bw.pressureBalls > 0) {
    const econAdjusted = leagueAvgDotPct + (leagueAvgPressureEcon - bw.pressureEconomy) * 2.6;
    return Number(Math.max(24.0, Math.min(58.0, econAdjusted)).toFixed(1));
  }
  return 0;
}

interface DatasetLeagueAverages {
  leagueAvgPressureSR: number;
  leagueAvgPressureEcon: number;
  leagueAvgBoundaryPct: number;
  leagueAvgDotPct: number;
}

// Compute dataset-adaptive Empirical Bayes Batter metrics (priorWeight = 100 balls)
function computeDatasetAdaptiveBatterMetrics(
  b: BatterRating,
  league: DatasetLeagueAverages
) {
  const N = b.pressureBalls;
  const PRIOR_WEIGHT = 100;
  const weight = N / (N + PRIOR_WEIGHT);

  const shrunkSR =
    (N * b.pressureSR + PRIOR_WEIGHT * league.leagueAvgPressureSR) / (N + PRIOR_WEIGHT);
  const rawElevation = b.normalBalls > 0 ? b.pressureSR - b.normalSR : b.srDelta;
  const adjustedElevation = weight * rawElevation;

  const shrunkBoundaryPct =
    (N * b.pressureBoundaryPct + PRIOR_WEIGHT * league.leagueAvgBoundaryPct) /
    (N + PRIOR_WEIGHT);

  const srAdvantage = (shrunkSR - league.leagueAvgPressureSR) * 0.36;
  const bndAdvantage = (shrunkBoundaryPct - league.leagueAvgBoundaryPct) * 0.42;
  const elevationAdvantage = Math.max(-6, Math.min(8, adjustedElevation * 0.18));
  const volumeConfidenceBonus = weight * 13.5;

  const calibratedPrr = Math.min(
    98.5,
    Math.max(
      42.0,
      Number(
        (
          58.0 +
          srAdvantage +
          bndAdvantage +
          elevationAdvantage +
          volumeConfidenceBonus
        ).toFixed(1)
      )
    )
  );

  return {
    shrunkSR: Number(shrunkSR.toFixed(1)),
    adjustedElevation: Number(adjustedElevation.toFixed(1)),
    calibratedPrr,
  };
}

// Compute dataset-adaptive Empirical Bayes Bowler metrics (priorWeight = 90 balls)
function computeDatasetAdaptiveBowlerMetrics(
  bw: BowlerRating,
  league: DatasetLeagueAverages
) {
  const N = bw.pressureBalls;
  const PRIOR_WEIGHT = 90;
  const weight = N / (N + PRIOR_WEIGHT);

  const dotPct = computeBowlerDotBallPct(
    bw,
    league.leagueAvgDotPct,
    league.leagueAvgPressureEcon
  );
  const adjustedEcon =
    (N * bw.pressureEconomy + PRIOR_WEIGHT * league.leagueAvgPressureEcon) /
    (N + PRIOR_WEIGHT);
  const shrunkDotPct =
    (N * dotPct + PRIOR_WEIGHT * league.leagueAvgDotPct) / (N + PRIOR_WEIGHT);

  const rawElevation =
    bw.normalBalls > 0 ? bw.normalEconomy - bw.pressureEconomy : bw.economyDelta;
  const adjustedElevation = weight * rawElevation;

  const econAdvantage = (league.leagueAvgPressureEcon - adjustedEcon) * 9.8;
  const dotAdvantage = (shrunkDotPct - league.leagueAvgDotPct) * 0.48;
  const wktComponent = (bw.pressureWickets / (N + 45)) * 155;
  const elevationAdvantage = Math.max(-5, Math.min(6, adjustedElevation * 2.0));
  const volumeConfidenceBonus = weight * 14.0;

  const calibratedPrr = Math.min(
    98.5,
    Math.max(
      42.0,
      Number(
        (
          56.5 +
          econAdvantage +
          dotAdvantage +
          wktComponent +
          elevationAdvantage +
          volumeConfidenceBonus
        ).toFixed(1)
      )
    )
  );

  return {
    dotPct,
    adjustedEcon: Number(adjustedEcon.toFixed(2)),
    adjustedElevation: Number(adjustedElevation.toFixed(2)),
    calibratedPrr,
  };
}

// Compute median of numeric array
function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

type BatterSortField =
  | 'rank'
  | 'name'
  | 'prr'
  | 'balls'
  | 'sr'
  | 'delta'
  | 'boundary'
  | 'verdict';
type BowlerSortField =
  | 'rank'
  | 'name'
  | 'prr'
  | 'balls'
  | 'econ'
  | 'delta'
  | 'dot'
  | 'verdict';

export const SquadCsvMatcher: React.FC<SquadCsvMatcherProps> = ({
  batters,
  bowlers,
  onSelectPlayer,
}) => {
  const [uploadedSquad, setUploadedSquad] =
    useState<UploadedSquadPlayer[]>(RR_2026_PRESET_SQUAD);
  const [isCustomCsv, setIsCustomCsv] = useState<boolean>(false);
  const [sourceLabel, setSourceLabel] = useState<string>(
    'Auto-Detected RR (teams.csv / playing_eleven.csv) + Official RR Squad'
  );
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [lifecycleAgeFilter, setLifecycleAgeFilter] =
    useState<LifecycleAgeFilter>('ALL');
  const [batterSortField, setBatterSortField] = useState<BatterSortField>('prr');
  const [batterSortAsc, setBatterSortAsc] = useState<boolean>(false);
  const [bowlerSortField, setBowlerSortField] = useState<BowlerSortField>('prr');
  const [bowlerSortAsc, setBowlerSortAsc] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const successionPairs = useMemo(
    () => buildVeteranToDomesticSuccessionPairs(),
    []
  );

  // Merge auto-detected RR players from teams.csv / playing_eleven.csv when in default RR mode
  const effectiveSquad = useMemo<UploadedSquadPlayer[]>(() => {
    if (isCustomCsv) {
      return uploadedSquad;
    }
    const merged: UploadedSquadPlayer[] = [...uploadedSquad];

    const isAlreadyInList = (candidateName: string) =>
      merged.some((p) => scorePlayerNameMatch(p.rawName, candidateName) >= 86);

    batters.forEach((b) => {
      if (
        (b.isRajasthanRoyalsPlayer ||
          /rajasthan|royals|\brr\b/i.test(b.teamName)) &&
        !isAlreadyInList(b.name)
      ) {
        merged.push({
          rawName: b.name,
          role: b.role,
          retentionStatus: 'Auto-Detected (teams.csv / playing_eleven.csv)',
        });
      }
    });

    bowlers.forEach((bw) => {
      if (
        (bw.isRajasthanRoyalsPlayer ||
          /rajasthan|royals|\brr\b/i.test(bw.teamName)) &&
        !isAlreadyInList(bw.name)
      ) {
        merged.push({
          rawName: bw.name,
          role: bw.bowlingType,
          retentionStatus: 'Auto-Detected (teams.csv / playing_eleven.csv)',
        });
      }
    });

    return merged;
  }, [uploadedSquad, isCustomCsv, batters, bowlers]);

  // Dynamically compute dataset-wide league averages from the loaded CSVs
  const datasetLeagueAverages = useMemo<DatasetLeagueAverages>(() => {
    let totalBatPressureBalls = 0;
    let totalBatPressureRuns = 0;
    let totalBatWeightedBoundary = 0;

    for (let i = 0; i < batters.length; i++) {
      const b = batters[i];
      if (b.pressureBalls > 0) {
        totalBatPressureBalls += b.pressureBalls;
        totalBatPressureRuns += b.pressureRuns;
        totalBatWeightedBoundary += b.pressureBalls * b.pressureBoundaryPct;
      }
    }

    let totalBowlPressureBalls = 0;
    let totalBowlPressureRuns = 0;
    let totalBowlWeightedDot = 0;

    for (let i = 0; i < bowlers.length; i++) {
      const bw = bowlers[i];
      if (bw.pressureBalls > 0) {
        totalBowlPressureBalls += bw.pressureBalls;
        totalBowlPressureRuns += bw.pressureRunsConceded;
        totalBowlWeightedDot += bw.pressureBalls * bw.pressureDotPct;
      }
    }

    const leagueAvgPressureSR =
      totalBatPressureBalls > 0
        ? Number(((totalBatPressureRuns / totalBatPressureBalls) * 100).toFixed(1))
        : 138.0;

    const leagueAvgBoundaryPct =
      totalBatPressureBalls > 0
        ? Number((totalBatWeightedBoundary / totalBatPressureBalls).toFixed(1))
        : 18.5;

    const leagueAvgPressureEcon =
      totalBowlPressureBalls > 0
        ? Number((totalBowlPressureRuns / (totalBowlPressureBalls / 6)).toFixed(2))
        : 8.8;

    const rawDatasetDotPct =
      totalBowlPressureBalls > 0
        ? totalBowlWeightedDot / totalBowlPressureBalls
        : 0;
    const leagueAvgDotPct =
      rawDatasetDotPct > 1.0 ? Number(rawDatasetDotPct.toFixed(1)) : 36.0;

    return {
      leagueAvgPressureSR,
      leagueAvgPressureEcon,
      leagueAvgBoundaryPct,
      leagueAvgDotPct,
    };
  }, [batters, bowlers]);

  // Parse uploaded CSV file flexibly
  const handleFileUpload = (file: File) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data || [];
        if (rows.length === 0) return;

        const headers = Object.keys(rows[0] || {});
        const nameCol =
          headers.find((h) =>
            /^(player_name|name|striker|striker_name|bowler|bowler_name|player|full_name|cricketer)$/i.test(
              h.trim()
            )
          ) ||
          headers.find((h) => /name|player|striker|bowler/i.test(h)) ||
          headers[0];

        const roleCol = headers.find((h) => /role|type|skill|position/i.test(h));
        const statusCol = headers.find((h) =>
          /retention|status|category|tag/i.test(h)
        );
        const ageCol = headers.find((h) =>
          /age|birth|dob|born|year/i.test(h)
        );

        const extracted: UploadedSquadPlayer[] = [];
        const seen = new Set<string>();

        rows.forEach((row) => {
          const val = String(row[nameCol] || '').trim();
          if (!val || /^(player_name|name|striker|player)$/i.test(val)) return;
          const normKey = normalizeName(val);
          if (!normKey || seen.has(normKey)) return;
          seen.add(normKey);

          extracted.push({
            rawName: val,
            role: roleCol ? String(row[roleCol] || '').trim() : undefined,
            retentionStatus: statusCol
              ? String(row[statusCol] || '').trim()
              : undefined,
            ageOrBirthDate: ageCol
              ? String(row[ageCol] || '').trim()
              : undefined,
          });
        });

        if (extracted.length > 0) {
          setUploadedSquad(extracted);
          setIsCustomCsv(true);
          setSourceLabel(`${file.name} (${extracted.length} Players)`);
        }
      },
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Match uploaded squad names and apply 100% dynamic role & sample-size qualification + Bayesian shrinkage
  const matchAnalysis = useMemo(() => {
    // Fast lookup maps by playerId to cross-reference total batting & bowling balls for any matched player
    const batterById = new Map<number, BatterRating>();
    batters.forEach((b) => batterById.set(b.playerId, b));

    const bowlerById = new Map<number, BowlerRating>();
    bowlers.forEach((bw) => bowlerById.set(bw.playerId, bw));

    const matchedBatterMap = new Map<
      number,
      {
        batter: BatterRating;
        uploaded: UploadedSquadPlayer;
        score: number;
        calibratedPrr: number;
        shrunkSR: number;
        adjustedElevation: number;
      }
    >();

    const matchedBowlerMap = new Map<
      number,
      {
        bowler: BowlerRating;
        uploaded: UploadedSquadPlayer;
        score: number;
        calibratedPrr: number;
        dotPct: number;
        adjustedEcon: number;
        adjustedElevation: number;
      }
    >();

    const matchedUploadedNames: {
      uploadedName: string;
      matchedDatasetName: string;
      hasBatting: boolean;
      hasBowling: boolean;
    }[] = [];
    const unmatchedNames: string[] = [];

    effectiveSquad.forEach((upPlayer) => {
      // Find best matching batter in loaded dataset
      let bestBatter: BatterRating | null = null;
      let bestBatterScore = 0;

      for (let i = 0; i < batters.length; i++) {
        const sc = scorePlayerNameMatch(upPlayer.rawName, batters[i].name);
        if (
          sc > bestBatterScore ||
          (sc === bestBatterScore &&
            sc >= 86 &&
            batters[i].totalBalls > (bestBatter?.totalBalls || 0))
        ) {
          bestBatterScore = sc;
          bestBatter = batters[i];
        }
      }

      // Find best matching bowler in loaded dataset
      let bestBowler: BowlerRating | null = null;
      let bestBowlerScore = 0;

      for (let i = 0; i < bowlers.length; i++) {
        const sc = scorePlayerNameMatch(upPlayer.rawName, bowlers[i].name);
        if (
          sc > bestBowlerScore ||
          (sc === bestBowlerScore &&
            sc >= 86 &&
            bowlers[i].totalBalls > (bestBowler?.totalBalls || 0))
        ) {
          bestBowlerScore = sc;
          bestBowler = bowlers[i];
        }
      }

      const isBatterMatched = bestBatter !== null && bestBatterScore >= 86;
      const isBowlerMatched = bestBowler !== null && bestBowlerScore >= 86;

      // Cross-reference player's total battingBalls & bowlingBalls across the entire dataset
      const resolvedBatter =
        (isBatterMatched ? bestBatter : null) ||
        (isBowlerMatched && bestBowler
          ? batterById.get(bestBowler.playerId) || null
          : null);
      const resolvedBowler =
        (isBowlerMatched ? bestBowler : null) ||
        (isBatterMatched && bestBatter
          ? bowlerById.get(bestBatter.playerId) || null
          : null);

      const battingBalls = resolvedBatter ? resolvedBatter.totalBalls : 0;
      const highBpiBatBalls = resolvedBatter ? resolvedBatter.pressureBalls : 0;
      const bowlingBalls = resolvedBowler ? resolvedBowler.totalBalls : 0;
      const highBpiBowlBalls = resolvedBowler ? resolvedBowler.pressureBalls : 0;
      const totalCareerBalls = Math.max(1, battingBalls + bowlingBalls);

      // 1. Dynamic Batters Table Eligibility:
      // battingBalls >= 40 AND highBpiBatBalls >= 20 AND battingBalls / (battingBalls + bowlingBalls) >= 0.25
      const qualifiesAsBatter =
        resolvedBatter !== null &&
        battingBalls >= 40 &&
        highBpiBatBalls >= 20 &&
        battingBalls / totalCareerBalls >= 0.25;

      if (qualifiesAsBatter && resolvedBatter) {
        const existing = matchedBatterMap.get(resolvedBatter.playerId);
        const batMetrics = computeDatasetAdaptiveBatterMetrics(
          resolvedBatter,
          datasetLeagueAverages
        );
        if (!existing || bestBatterScore > existing.score) {
          matchedBatterMap.set(resolvedBatter.playerId, {
            batter: {
              ...resolvedBatter,
              name: upPlayer.rawName,
              srDelta: batMetrics.adjustedElevation,
              shrunkSR: batMetrics.shrunkSR,
              reliabilityScore: batMetrics.calibratedPrr,
            },
            uploaded: upPlayer,
            score: bestBatterScore,
            calibratedPrr: batMetrics.calibratedPrr,
            shrunkSR: batMetrics.shrunkSR,
            adjustedElevation: batMetrics.adjustedElevation,
          });
        }
      }

      // 2. Dynamic Bowlers Table Eligibility:
      // bowlingBalls >= 48 (8 overs) AND highBpiBowlBalls >= 24 AND bowlingBalls / (battingBalls + bowlingBalls) >= 0.25
      const qualifiesAsBowler =
        resolvedBowler !== null &&
        bowlingBalls >= 48 &&
        highBpiBowlBalls >= 24 &&
        bowlingBalls / totalCareerBalls >= 0.25;

      if (qualifiesAsBowler && resolvedBowler) {
        const existing = matchedBowlerMap.get(resolvedBowler.playerId);
        const bowlMetrics = computeDatasetAdaptiveBowlerMetrics(
          resolvedBowler,
          datasetLeagueAverages
        );
        if (!existing || bestBowlerScore > existing.score) {
          matchedBowlerMap.set(resolvedBowler.playerId, {
            bowler: {
              ...resolvedBowler,
              name: upPlayer.rawName,
              pressureDotPct: bowlMetrics.dotPct,
              shrunkEconomy: bowlMetrics.adjustedEcon,
              economyDelta: bowlMetrics.adjustedElevation,
              reliabilityScore: bowlMetrics.calibratedPrr,
            },
            uploaded: upPlayer,
            score: bestBowlerScore,
            calibratedPrr: bowlMetrics.calibratedPrr,
            dotPct: bowlMetrics.dotPct,
            adjustedEcon: bowlMetrics.adjustedEcon,
            adjustedElevation: bowlMetrics.adjustedElevation,
          });
        }
      }

      if (isBatterMatched || isBowlerMatched) {
        matchedUploadedNames.push({
          uploadedName: upPlayer.rawName,
          matchedDatasetName:
            bestBowler?.name || bestBatter?.name || upPlayer.rawName,
          hasBatting: qualifiesAsBatter,
          hasBowling: qualifiesAsBowler,
        });
      } else {
        unmatchedNames.push(upPlayer.rawName);
      }
    });

    // Rank Top 10 Qualified Squad Batters & compute dynamic median-based Auction Verdict
    const rankedBatters = Array.from(matchedBatterMap.values())
      .sort((a, b) => b.calibratedPrr - a.calibratedPrr)
      .slice(0, 10);

    const medianSquadBatPRR = computeMedian(
      rankedBatters.map((item) => item.calibratedPrr)
    );
    const batTopHalfCutoff = Math.ceil(rankedBatters.length / 2);

    const baseBatters = rankedBatters.map((item, idx) => {
      const isRetainCore =
        idx < batTopHalfCutoff &&
        item.calibratedPrr >= medianSquadBatPRR &&
        item.adjustedElevation >= -2.0;

      return {
        squadRank: idx + 1,
        batter: item.batter,
        uploaded: item.uploaded,
        verdict: isRetainCore
          ? ('RETAIN CORE' as const)
          : ('FIND BACKUP / AUCTION RE-BUY' as const),
      };
    });

    // Rank Top 10 Qualified Squad Bowlers & compute dynamic median-based Auction Verdict
    const rankedBowlers = Array.from(matchedBowlerMap.values())
      .sort((a, b) => b.calibratedPrr - a.calibratedPrr)
      .slice(0, 10);

    const medianSquadBowlPRR = computeMedian(
      rankedBowlers.map((item) => item.calibratedPrr)
    );
    const bowlTopHalfCutoff = Math.ceil(rankedBowlers.length / 2);

    const baseBowlers = rankedBowlers.map((item, idx) => {
      const isRetainCore =
        idx < bowlTopHalfCutoff &&
        item.calibratedPrr >= medianSquadBowlPRR &&
        item.adjustedEcon <= datasetLeagueAverages.leagueAvgPressureEcon;

      return {
        squadRank: idx + 1,
        bowler: item.bowler,
        uploaded: item.uploaded,
        verdict: isRetainCore
          ? ('RETAIN CORE' as const)
          : ('FIND BACKUP / AUCTION RE-BUY' as const),
      };
    });

    return {
      matchedCount: matchedUploadedNames.length,
      totalUploaded: effectiveSquad.length,
      matchedUploadedNames,
      unmatchedNames,
      medianSquadBatPRR,
      medianSquadBowlPRR,
      topBatters: baseBatters,
      topBowlers: baseBowlers,
    };
  }, [effectiveSquad, batters, bowlers, datasetLeagueAverages]);

  // Apply interactive sorting, search filter & career lifecycle age filter to Top 10 Batters
  const sortedBatters = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    const list = matchAnalysis.topBatters.filter((item) => {
      const matchesSearch =
        !q ||
        item.batter.name.toLowerCase().includes(q) ||
        item.uploaded.rawName.toLowerCase().includes(q);
      if (!matchesSearch) return false;

      const lc = getPlayerLifecycleProfile(
        item.uploaded.rawName || item.batter.name,
        item.uploaded.ageOrBirthDate
      );
      if (lifecycleAgeFilter === 'RETIREMENT_WATCH_35') {
        return lc.age >= 33;
      }
      if (lifecycleAgeFilter === 'DOMESTIC_NEXT_GEN_25') {
        return lc.age <= 25;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      let cmp = 0;
      switch (batterSortField) {
        case 'rank':
          cmp = a.squadRank - b.squadRank;
          break;
        case 'name':
          cmp = a.batter.name.localeCompare(b.batter.name);
          break;
        case 'prr':
          cmp = b.batter.reliabilityScore - a.batter.reliabilityScore;
          break;
        case 'balls':
          cmp = b.batter.pressureBalls - a.batter.pressureBalls;
          break;
        case 'sr':
          cmp = b.batter.pressureSR - a.batter.pressureSR;
          break;
        case 'delta':
          cmp = b.batter.srDelta - a.batter.srDelta;
          break;
        case 'boundary':
          cmp = b.batter.pressureBoundaryPct - a.batter.pressureBoundaryPct;
          break;
        case 'verdict':
          cmp = a.verdict.localeCompare(b.verdict);
          break;
      }
      return batterSortAsc ? -cmp : cmp;
    });
  }, [
    matchAnalysis.topBatters,
    batterSortField,
    batterSortAsc,
    searchFilter,
    lifecycleAgeFilter,
  ]);

  // Apply interactive sorting, search filter & career lifecycle age filter to Top 10 Bowlers
  const sortedBowlers = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    const list = matchAnalysis.topBowlers.filter((item) => {
      const matchesSearch =
        !q ||
        item.bowler.name.toLowerCase().includes(q) ||
        item.uploaded.rawName.toLowerCase().includes(q);
      if (!matchesSearch) return false;

      const lc = getPlayerLifecycleProfile(
        item.uploaded.rawName || item.bowler.name,
        item.uploaded.ageOrBirthDate
      );
      if (lifecycleAgeFilter === 'RETIREMENT_WATCH_35') {
        return lc.age >= 33;
      }
      if (lifecycleAgeFilter === 'DOMESTIC_NEXT_GEN_25') {
        return lc.age <= 25;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      let cmp = 0;
      switch (bowlerSortField) {
        case 'rank':
          cmp = a.squadRank - b.squadRank;
          break;
        case 'name':
          cmp = a.bowler.name.localeCompare(b.bowler.name);
          break;
        case 'prr':
          cmp = b.bowler.reliabilityScore - a.bowler.reliabilityScore;
          break;
        case 'balls':
          cmp = b.bowler.pressureBalls - a.bowler.pressureBalls;
          break;
        case 'econ':
          cmp = a.bowler.pressureEconomy - b.bowler.pressureEconomy;
          break;
        case 'delta':
          cmp = b.bowler.economyDelta - a.bowler.economyDelta;
          break;
        case 'dot':
          cmp = b.bowler.pressureDotPct - a.bowler.pressureDotPct;
          break;
        case 'verdict':
          cmp = a.verdict.localeCompare(b.verdict);
          break;
      }
      return bowlerSortAsc ? -cmp : cmp;
    });
  }, [
    matchAnalysis.topBowlers,
    bowlerSortField,
    bowlerSortAsc,
    searchFilter,
    lifecycleAgeFilter,
  ]);

  const handleBatterSort = (field: BatterSortField) => {
    if (batterSortField === field) {
      setBatterSortAsc(!batterSortAsc);
    } else {
      setBatterSortField(field);
      setBatterSortAsc(false);
    }
  };

  const handleBowlerSort = (field: BowlerSortField) => {
    if (bowlerSortField === field) {
      setBowlerSortAsc(!bowlerSortAsc);
    } else {
      setBowlerSortField(field);
      setBowlerSortAsc(false);
    }
  };

  // Download sample RR 2026 Squad CSV
  const handleDownloadSampleCsv = () => {
    const rows = [
      ['player_name', 'role', 'retention_status'],
      ...RR_2026_PRESET_SQUAD.map((p) => [
        p.rawName,
        p.role || 'Squad',
        p.retentionStatus || 'Active',
      ]),
    ];
    const csvContent = rows
      .map((r) => r.map((v) => `"${v}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rr_2026_squad_sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Matched Top 10 Batters & Bowlers Tables (.csv)
  const handleExportMatchedTablesCsv = () => {
    const lines: string[] = [];
    lines.push('TABLE 1: TOP 10 MATCHED BATTERS UNDER PRESSURE');
    lines.push(
      [
        'Rank',
        'Player Name',
        'Uploaded Name',
        'Pressure Reliability (PRR)',
        'High-BPI Balls',
        'Pressure Strike Rate',
        'Baseline Elevation (+SR)',
        'Boundary %',
        'Auction Verdict',
      ].join(',')
    );

    sortedBatters.forEach((item) => {
      const b = item.batter;
      lines.push(
        [
          `#${item.squadRank}`,
          `"${b.name}"`,
          `"${item.uploaded.rawName}"`,
          b.reliabilityScore.toFixed(1),
          b.pressureBalls,
          b.pressureSR.toFixed(1),
          `${b.srDelta >= 0 ? '+' : ''}${b.srDelta.toFixed(1)}`,
          `${b.pressureBoundaryPct.toFixed(1)}%`,
          `"${item.verdict}"`,
        ].join(',')
      );
    });

    lines.push('');
    lines.push('TABLE 2: TOP 10 MATCHED BOWLERS UNDER PRESSURE');
    lines.push(
      [
        'Rank',
        'Player Name',
        'Uploaded Name',
        'Pressure Reliability (PRR)',
        'High-BPI Balls',
        'Pressure Economy',
        'Baseline Elevation (+Econ)',
        'Dot Ball %',
        'Auction Verdict',
      ].join(',')
    );

    sortedBowlers.forEach((item) => {
      const bw = item.bowler;
      lines.push(
        [
          `#${item.squadRank}`,
          `"${bw.name}"`,
          `"${item.uploaded.rawName}"`,
          bw.reliabilityScore.toFixed(1),
          bw.pressureBalls,
          bw.pressureEconomy.toFixed(2),
          `${bw.economyDelta >= 0 ? '+' : ''}${bw.economyDelta.toFixed(2)}`,
          `${bw.pressureDotPct.toFixed(1)}%`,
          `"${item.verdict}"`,
        ].join(',')
      );
    });

    const blob = new Blob([lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'RR_Matched_Top10_Pressure_Tables.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section
      id="squad-csv-matcher"
      className="rounded-3xl border border-white/[0.08] bg-[#0A0E1A] p-6 md:p-8 text-white shadow-xl relative overflow-hidden"
    >
      {/* Subtle Ambient Accent */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#EA1A85]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#D4AF37]/10 blur-3xl" />

      {/* Section Header & Match-Status Badge */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/15 px-3 py-1 text-[11px] font-bold tracking-wide text-[#D4AF37]">
              <Users className="h-3.5 w-3.5 text-[#D4AF37]" />
              Section 2 · Rajasthan Royals Squad Retention Audit (RR Players Only)
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-[11px] font-bold text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              Matched {matchAnalysis.matchedCount} of {matchAnalysis.totalUploaded}{' '}
              RR squad players in dataset
            </span>
          </div>
          <h2 className="font-condensed text-2xl sm:text-3xl font-extrabold text-white mt-2 tracking-tight">
            Rajasthan Royals &bull; IPL 2027 Squad Retention Audit
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
            Filters strictly to Rajasthan Royals squad players (auto-detected from{' '}
            <code className="text-[#D4AF37] font-mono">teams.csv</code> &amp;{' '}
            <code className="text-[#D4AF37] font-mono">playing_eleven.csv</code> plus custom{' '}
            <code className="text-pink-300 font-mono">rr_squad.csv</code> uploads) with strict
            role volume qualification and dataset-adaptive Bayesian shrinkage.
          </p>
        </div>

        {/* Preset & Sample Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setUploadedSquad(RR_2026_PRESET_SQUAD);
              setIsCustomCsv(false);
              setSourceLabel(
                'Auto-Detected RR (teams.csv / playing_eleven.csv) + Official RR Squad'
              );
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#EA1A85] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#D81478] transition-colors cursor-pointer"
          >
            <ShieldCheck className="h-4 w-4 text-[#D4AF37]" />
            <span>Load Official RR Squad Preset</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadSampleCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/15 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span>Download Sample CSV</span>
          </button>
        </div>
      </div>

      {/* 1. Flexible Player-Name CSV Uploader Dropzone + Active Roster Summary */}
      <div className="relative z-10 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Dropzone Card */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="lg:col-span-5 group cursor-pointer rounded-2xl border border-dashed border-white/25 bg-[#111729]/90 p-6 flex flex-col items-center justify-center text-center hover:border-[#EA1A85] hover:bg-[#151D34] transition-all"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
                e.target.value = '';
              }
            }}
          />
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EA1A85]/20 text-[#EA1A85] group-hover:scale-105 transition-transform">
            <Upload className="h-5 w-5" />
          </div>
          <p className="text-sm font-bold text-white mt-3">
            Upload Custom Squad / Retention CSV
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Drop any season or league squad CSV here or click to browse. Supports universal initial,
            hyphenated, and surname resolution across any ball-by-ball dataset.
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-mono text-slate-300">
            <FileSpreadsheet className="h-3.5 w-3.5 text-[#D4AF37]" />
            Active Roster: {sourceLabel}
          </span>
        </div>

        {/* Fuzzy Match Audit & Unmatched List */}
        <div className="lg:col-span-7 rounded-2xl border border-white/[0.08] bg-[#111729]/90 p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
              <div>
                <span className="text-[11px] font-bold tracking-wide text-[#D4AF37] block">
                  Universal Name Resolution &amp; Dataset Baselines
                </span>
                <h3 className="font-condensed text-lg font-bold text-white">
                  Roster Coverage &amp; Unmatched Player Audit
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-slate-300">
                  Dataset Mean: {datasetLeagueAverages.leagueAvgPressureSR.toFixed(1)} SR ·{' '}
                  {datasetLeagueAverages.leagueAvgPressureEcon.toFixed(2)} Econ
                </span>
                <span className="rounded-lg bg-emerald-500/15 border border-emerald-400/30 px-2.5 py-1 text-emerald-300 font-bold">
                  {matchAnalysis.matchedCount} Matched
                </span>
                <span className="rounded-lg bg-amber-500/15 border border-amber-400/30 px-2.5 py-1 text-amber-300 font-bold">
                  {matchAnalysis.unmatchedNames.length} Unmatched
                </span>
              </div>
            </div>

            {/* Matched Pills Preview */}
            <div className="mt-3">
              <p className="text-xs text-slate-400 mb-2">
                Matched squad players resolved against{' '}
                <code className="text-slate-200 font-mono">ball_by_ball.csv</code>{' '}
                (with Age &amp; Career Stage):
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {matchAnalysis.matchedUploadedNames.map((m) => {
                  const lc = getPlayerLifecycleProfile(m.uploadedName);
                  return (
                    <span
                      key={m.uploadedName}
                      className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[11px] text-slate-200"
                      title={`Uploaded: ${m.uploadedName} (${lc.age}) • ${lc.badgeLabel}`}
                    >
                      <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                      <span className="font-medium">
                        {m.uploadedName} ({lc.age})
                      </span>
                      <span
                        className={`rounded px-1 py-0.2 text-[9px] font-bold ${getLifecycleBadgeClasses(
                          lc.colorScheme,
                          true
                        )}`}
                      >
                        {lc.stageId === 'NEXT_GEN'
                          ? 'NEXT-GEN'
                          : lc.stageId === 'PRIME_WINDOW'
                          ? 'PRIME'
                          : lc.stageId === 'VETERAN_TRANSITION'
                          ? 'VETERAN'
                          : '38+ HORIZON'}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Unmatched Names Alert (if any) */}
          <div className="mt-4 pt-3 border-t border-white/[0.08]">
            {matchAnalysis.unmatchedNames.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  Unmatched in current dataset ({matchAnalysis.unmatchedNames.length}):
                </span>
                {matchAnalysis.unmatchedNames.map((name) => (
                  <span
                    key={name}
                    className="rounded-md border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-mono text-amber-200"
                  >
                    {name}
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-emerald-300 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>
                  All {matchAnalysis.totalUploaded} uploaded players matched in the dataset.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar Above Tables: Search Filter + 3-Year Squad Continuity Age Filter + Export */}
      <div className="relative z-10 mt-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter matched squad players..."
              className="w-full rounded-xl border border-white/15 bg-[#111729] pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-400 focus:border-[#EA1A85] focus:outline-none"
            />
          </div>

          {/* 3-Year Continuity Lifecycle Toggle */}
          <div className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-[#111729] p-1">
            <Clock className="h-3.5 w-3.5 text-[#D4AF37] ml-1.5 mr-0.5" />
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
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-400">
            Dataset-Adaptive Bayesian Prior Applied · Click any column header to sort
          </span>
          <button
            type="button"
            onClick={handleExportMatchedTablesCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#D4AF37]/50 bg-[#D4AF37]/15 px-4 py-2 text-xs font-bold text-[#D4AF37] hover:bg-[#D4AF37] hover:text-slate-950 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Matched Top 10 Tables (.csv)</span>
          </button>
        </div>
      </div>

      {/* 3. Side-by-Side Ranked Tables: Table A (RR Batters to Retain) & Table B (RR Bowlers to Retain) */}
      <div className="relative z-10 mt-4 grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Table A — RR Batters to Retain */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#111729]/95 p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-white/[0.08]">
              <div>
                <span className="text-[11px] font-bold tracking-wide text-[#EA1A85] block">
                  Table A · Min 40 Bat Balls &amp; &ge;25% Role Share · Squad Median PRR{' '}
                  {matchAnalysis.medianSquadBatPRR.toFixed(1)}
                </span>
                <h3 className="font-condensed text-xl font-bold text-white">
                  Table A — RR Batters to Retain
                </h3>
              </div>
              <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-mono font-bold text-slate-300">
                {sortedBatters.length} Qualified
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[11px] font-semibold text-slate-400">
                    <th
                      onClick={() => handleBatterSort('rank')}
                      className="py-2.5 px-2 cursor-pointer hover:text-white whitespace-nowrap"
                    >
                      Rank
                    </th>
                    <th
                      onClick={() => handleBatterSort('name')}
                      className="py-2.5 px-2 cursor-pointer hover:text-white whitespace-nowrap"
                    >
                      Player &amp; Age Stage
                    </th>
                    <th
                      onClick={() => handleBatterSort('prr')}
                      className="py-2.5 px-2 text-right cursor-pointer hover:text-white whitespace-nowrap"
                    >
                      <span className="inline-flex items-center gap-0.5">
                        PRR <ArrowUpDown className="h-3 w-3 opacity-60" />
                      </span>
                    </th>
                    <th
                      onClick={() => handleBatterSort('balls')}
                      className="py-2.5 px-2 text-right cursor-pointer hover:text-white whitespace-nowrap"
                    >
                      High-BPI Balls
                    </th>
                    <th
                      onClick={() => handleBatterSort('sr')}
                      className="py-2.5 px-2 text-right cursor-pointer hover:text-white whitespace-nowrap"
                    >
                      Pressure SR
                    </th>
                    <th
                      onClick={() => handleBatterSort('delta')}
                      className="py-2.5 px-2 text-right cursor-pointer hover:text-white whitespace-nowrap"
                    >
                      +SR Elevation
                    </th>
                    <th
                      onClick={() => handleBatterSort('boundary')}
                      className="py-2.5 px-2 text-right cursor-pointer hover:text-white whitespace-nowrap"
                    >
                      Boundary %
                    </th>
                    <th
                      onClick={() => handleBatterSort('verdict')}
                      className="py-2.5 px-2 text-right cursor-pointer hover:text-white whitespace-nowrap"
                    >
                      Auction Verdict
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] font-mono">
                  {sortedBatters.map((item) => {
                    const b = item.batter;
                    const lc = getPlayerLifecycleProfile(
                      item.uploaded.rawName || b.name,
                      item.uploaded.ageOrBirthDate
                    );
                    return (
                      <tr
                        key={b.playerId}
                        onClick={() =>
                          onSelectPlayer && onSelectPlayer(b.playerId, 'batter')
                        }
                        className="hover:bg-white/[0.04] transition-colors cursor-pointer"
                      >
                        <td className="py-2.5 px-2 font-bold">
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold ${
                              item.squadRank === 1
                                ? 'bg-[#D4AF37] text-slate-950'
                                : item.squadRank <= 3
                                ? 'bg-[#EA1A85]/25 text-pink-200 border border-[#EA1A85]/40'
                                : 'bg-white/5 text-slate-300'
                            }`}
                          >
                            #{item.squadRank}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 font-sans">
                          <div className="flex items-center gap-2">
                            <PlayerAvatar
                              name={b.name}
                              rank={item.squadRank}
                              size="sm"
                              showRankBadge={false}
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white leading-tight">
                                  {b.name}
                                </span>
                                <span className="font-mono text-[11px] text-slate-400">
                                  ({lc.age})
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-slate-400">
                                  {item.uploaded.role || b.role}
                                </span>
                                <span
                                  className={`rounded px-1.5 py-0.2 text-[9px] font-extrabold uppercase ${getLifecycleBadgeClasses(
                                    lc.colorScheme,
                                    true
                                  )}`}
                                >
                                  {lc.badgeLabel}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right font-bold text-[#D4AF37]">
                          {b.reliabilityScore.toFixed(1)}
                        </td>
                        <td className="py-2.5 px-2 text-right text-slate-300">
                          {b.pressureBalls}
                        </td>
                        <td className="py-2.5 px-2 text-right font-bold text-white">
                          {b.pressureSR.toFixed(1)}
                        </td>
                        <td
                          className={`py-2.5 px-2 text-right font-bold ${
                            b.srDelta >= 0 ? 'text-emerald-400' : 'text-amber-300'
                          }`}
                        >
                          {b.srDelta >= 0
                            ? `+${b.srDelta.toFixed(1)}`
                            : b.srDelta.toFixed(1)}
                        </td>
                        <td className="py-2.5 px-2 text-right text-slate-200">
                          {b.pressureBoundaryPct.toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-2 text-right font-sans">
                          {item.verdict === 'RETAIN CORE' ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-[#D4AF37]/60 bg-[#D4AF37]/20 px-2 py-0.5 text-[10px] font-bold text-[#D4AF37] whitespace-nowrap">
                              <ShieldCheck className="h-3 w-3 text-[#D4AF37]" />
                              RETAIN CORE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300 whitespace-nowrap">
                              <AlertTriangle className="h-3 w-3 text-amber-400" />
                              FIND BACKUP / AUCTION RE-BUY
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Table B — RR Bowlers to Retain */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#111729]/95 p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-white/[0.08]">
              <div>
                <span className="text-[11px] font-bold tracking-wide text-[#D4AF37] block">
                  Table B · Min 48 Bowl Balls &amp; &ge;25% Role Share · Squad Median PRR{' '}
                  {matchAnalysis.medianSquadBowlPRR.toFixed(1)}
                </span>
                <h3 className="font-condensed text-xl font-bold text-white">
                  Table B — RR Bowlers to Retain
                </h3>
              </div>
              <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-mono font-bold text-slate-300">
                {sortedBowlers.length} Qualified
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[11px] font-semibold text-slate-400">
                    <th
                      onClick={() => handleBowlerSort('rank')}
                      className="py-2.5 px-2 cursor-pointer hover:text-white whitespace-nowrap"
                    >
                      Rank
                    </th>
                    <th
                      onClick={() => handleBowlerSort('name')}
                      className="py-2.5 px-2 cursor-pointer hover:text-white whitespace-nowrap"
                    >
                      Player &amp; Age Stage
                    </th>
                    <th
                      onClick={() => handleBowlerSort('prr')}
                      className="py-2.5 px-2 text-right cursor-pointer hover:text-white whitespace-nowrap"
                    >
                      <span className="inline-flex items-center gap-0.5">
                        PRR <ArrowUpDown className="h-3 w-3 opacity-60" />
                      </span>
                    </th>
                    <th
                      onClick={() => handleBowlerSort('balls')}
                      className="py-2.5 px-2 text-right cursor-pointer hover:text-white whitespace-nowrap"
                    >
                      High-BPI Balls
                    </th>
                    <th
                      onClick={() => handleBowlerSort('econ')}
                      className="py-2.5 px-2 text-right cursor-pointer hover:text-white whitespace-nowrap"
                    >
                      Pressure Econ
                    </th>
                    <th
                      onClick={() => handleBowlerSort('delta')}
                      className="py-2.5 px-2 text-right cursor-pointer hover:text-white whitespace-nowrap"
                    >
                      +Econ Elevation
                    </th>
                    <th
                      onClick={() => handleBowlerSort('dot')}
                      className="py-2.5 px-2 text-right cursor-pointer hover:text-white whitespace-nowrap"
                    >
                      Dot Ball %
                    </th>
                    <th
                      onClick={() => handleBowlerSort('verdict')}
                      className="py-2.5 px-2 text-right cursor-pointer hover:text-white whitespace-nowrap"
                    >
                      Auction Verdict
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] font-mono">
                  {sortedBowlers.map((item) => {
                    const bw = item.bowler;
                    const lc = getPlayerLifecycleProfile(
                      item.uploaded.rawName || bw.name,
                      item.uploaded.ageOrBirthDate
                    );
                    return (
                      <tr
                        key={bw.playerId}
                        onClick={() =>
                          onSelectPlayer && onSelectPlayer(bw.playerId, 'bowler')
                        }
                        className="hover:bg-white/[0.04] transition-colors cursor-pointer"
                      >
                        <td className="py-2.5 px-2 font-bold">
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold ${
                              item.squadRank === 1
                                ? 'bg-[#D4AF37] text-slate-950'
                                : item.squadRank <= 3
                                ? 'bg-[#EA1A85]/25 text-pink-200 border border-[#EA1A85]/40'
                                : 'bg-white/5 text-slate-300'
                            }`}
                          >
                            #{item.squadRank}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 font-sans">
                          <div className="flex items-center gap-2">
                            <PlayerAvatar
                              name={bw.name}
                              rank={item.squadRank}
                              size="sm"
                              showRankBadge={false}
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white leading-tight">
                                  {bw.name}
                                </span>
                                <span className="font-mono text-[11px] text-slate-400">
                                  ({lc.age})
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-slate-400">
                                  {item.uploaded.role || bw.bowlingType}
                                </span>
                                <span
                                  className={`rounded px-1.5 py-0.2 text-[9px] font-extrabold uppercase ${getLifecycleBadgeClasses(
                                    lc.colorScheme,
                                    true
                                  )}`}
                                >
                                  {lc.badgeLabel}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right font-bold text-[#D4AF37]">
                          {bw.reliabilityScore.toFixed(1)}
                        </td>
                        <td className="py-2.5 px-2 text-right text-slate-300">
                          {bw.pressureBalls}
                        </td>
                        <td className="py-2.5 px-2 text-right font-bold text-white">
                          {bw.pressureEconomy.toFixed(2)}
                        </td>
                        <td
                          className={`py-2.5 px-2 text-right font-bold ${
                            bw.economyDelta >= 0 ? 'text-emerald-400' : 'text-amber-300'
                          }`}
                        >
                          {bw.economyDelta >= 0
                            ? `+${bw.economyDelta.toFixed(2)}`
                            : bw.economyDelta.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-2 text-right text-slate-200">
                          {bw.pressureDotPct.toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-2 text-right font-sans">
                          {item.verdict === 'RETAIN CORE' ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-[#D4AF37]/60 bg-[#D4AF37]/20 px-2 py-0.5 text-[10px] font-bold text-[#D4AF37] whitespace-nowrap">
                              <ShieldCheck className="h-3 w-3 text-[#D4AF37]" />
                              RETAIN CORE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300 whitespace-nowrap">
                              <AlertTriangle className="h-3 w-3 text-amber-400" />
                              FIND BACKUP / AUCTION RE-BUY
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Succession Planning: Veteran Out (35+) -> Domestic Star In (Ages 18-25) Card Strip */}
      <div className="relative z-10 mt-6 rounded-2xl border border-white/[0.1] bg-[#111729]/95 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/20 border border-rose-400/40 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-rose-200">
                <Clock className="h-3 w-3" />
                Age &amp; Career Lifecycle Succession Engine
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/15 border border-cyan-400/40 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-cyan-300">
                Veteran Out (35+) &rarr; Domestic Star In (Ages 18–25)
              </span>
            </div>
            <h3 className="font-condensed text-2xl font-extrabold text-white mt-1.5">
              Succession Planning: Veteran Out &rarr; Domestic Star In
            </h3>
            <p className="text-xs text-slate-300 mt-0.5 max-w-3xl">
              Automatically pairs squad &amp; league veterans aged 35+ (such as <strong>Ravindra Jadeja (38)</strong>, <strong>Dasun Shanaka (35)</strong>, <strong>Rohit Sharma (39)</strong>, and <strong>MS Dhoni (45)</strong>) with exact tactical-role Indian Domestic Breakout Replacements (Ages 18–25) from SMAT, Ranji Trophy, and Vijay Hazare Trophy.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {successionPairs.map((pair) => (
            <div
              key={pair.id}
              className="rounded-xl border border-white/10 bg-[#0A0E1A]/80 p-4 flex flex-col gap-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/[0.08]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300">
                      Veteran Out
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${getLifecycleBadgeClasses(
                        pair.veteranColorScheme,
                        true
                      )}`}
                    >
                      {pair.veteranLifecycleBadge}
                    </span>
                  </div>
                  <h4 className="font-condensed text-lg font-extrabold text-white mt-0.5">
                    {pair.veteranName}{' '}
                    {!pair.veteranName.includes('(') && (
                      <span className="font-mono text-xs text-rose-300">
                        ({pair.veteranAge})
                      </span>
                    )}
                  </h4>
                  <span className="text-[11px] text-slate-400 block">
                    {pair.veteranTeamLabel}
                  </span>
                </div>
                <div className="text-right">
                  <span className="rounded bg-[#D4AF37]/20 border border-[#D4AF37]/40 px-2 py-0.5 text-[10px] font-bold text-[#D4AF37] block">
                    {pair.successionUrgencyLabel}
                  </span>
                  <span className="font-mono text-[11px] text-slate-300 mt-1 block">
                    {pair.veteranCurrentMetric}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                <ArrowRight className="h-3.5 w-3.5 text-[#EA1A85]" />
                <span>Recommended Indian Domestic Replacements (Ages 18–25)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {pair.recommendedSuccessors.map((succ) => {
                  const succLc = getPlayerLifecycleProfile(succ.name, succ.age);
                  return (
                    <div
                      key={succ.id}
                      className="rounded-lg border border-white/10 bg-white/[0.04] p-3 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${getLifecycleBadgeClasses(
                              succLc.colorScheme,
                              true
                            )}`}
                          >
                            {succLc.badgeLabel}
                          </span>
                          <span className="font-mono text-[11px] font-bold text-[#D4AF37]">
                            {succ.domesticPrr} PRR
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-baseline justify-between">
                          <span className="font-condensed text-base font-bold text-white">
                            {succ.name}{' '}
                            <span className="font-mono text-xs text-cyan-300">
                              ({succ.age})
                            </span>
                          </span>
                          <span className="font-mono text-[10px] font-bold text-emerald-300">
                            {succ.basePriceLabel}
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-pink-300 block">
                          {succ.stateTeam} &bull; {succ.tournaments}
                        </span>
                        <span className="font-mono text-[11px] text-slate-200 mt-1 block">
                          {succ.domesticStatsLine}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                          {succ.graduationReadiness}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
