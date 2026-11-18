export type CareerLifecycleStageId =
  | 'NEXT_GEN'
  | 'PRIME_WINDOW'
  | 'VETERAN_TRANSITION'
  | 'RETIREMENT_HORIZON';

export type LifecycleAgeFilter = 'ALL' | 'RETIREMENT_WATCH_35' | 'DOMESTIC_NEXT_GEN_25';

export interface PlayerLifecycleProfile {
  age: number;
  birthYear: number;
  stageId: CareerLifecycleStageId;
  badgeLabel:
    | 'NEXT-GEN BREAKOUT (15–23)'
    | 'PRIME WINDOW (24–31)'
    | 'VETERAN TRANSITION (34–37)'
    | 'RETIREMENT HORIZON (38+)';
  colorScheme: 'cyan' | 'green' | 'amber' | 'coral';
  isRetirementWatch: boolean; // Age >= 35
  isDomesticNextGen: boolean; // Age <= 25
  horizonSummary: string;
}

export interface DomesticSuccessorCandidate {
  id: string;
  targetEngineId?: string; // Maps to AuctionTargetsTab signedTargetIds
  name: string;
  age: number;
  stateTeam: string;
  tournaments: string;
  roleMatchLabel: string;
  domesticStatsLine: string;
  domesticPrr: number;
  basePriceLabel: string;
  graduationReadiness: string;
}

export interface VeteranSuccessionPair {
  id: string;
  veteranName: string;
  veteranAge: number;
  veteranTeamLabel: string;
  isRRSquadMember: boolean;
  veteranRole: string;
  veteranLifecycleBadge: PlayerLifecycleProfile['badgeLabel'];
  veteranColorScheme: PlayerLifecycleProfile['colorScheme'];
  veteranCurrentMetric: string;
  successionUrgencyLabel: string;
  transitionTimeline: string;
  recommendedSuccessors: DomesticSuccessorCandidate[];
}

function normalizeLifecycleName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’`._-]/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\bsooryavanshi\b/g, 'suryavanshi')
    .replace(/\s+/g, ' ')
    .trim();
}

// Built-in calibrated ages for IPL 2026/2027 cycle & Indian Domestic stars
const KNOWN_PLAYER_AGES: Record<string, number> = {
  // Rajasthan Royals Core & Extended Squad
  'vaibhav suryavanshi': 15,
  'v suryavanshi': 15,
  'yashasvi jaiswal': 24,
  'ybk jaiswal': 24,
  'y jaiswal': 24,
  'riyan parag': 25,
  'r parag': 25,
  'dhruv jurel': 25,
  'dc jurel': 25,
  'shimron hetmyer': 29,
  'so hetmyer': 29,
  'donovan ferreira': 28,
  'd ferreira': 28,
  'ravindra jadeja': 38,
  'ra jadeja': 38,
  'r jadeja': 38,
  'shubham dubey': 31,
  's dubey': 31,
  'lhuandre pretorius': 20,
  'lhuan dre pretorius': 20,
  'ld pretorius': 20,
  'dasun shanaka': 35,
  'md shanaka': 35,
  'jofra archer': 31,
  'jc archer': 31,
  'j archer': 31,
  'ravi bishnoi': 26,
  'r bishnoi': 26,
  'nandre burger': 31,
  'n burger': 31,
  'sandeep sharma': 33,
  'tushar deshpande': 31,
  'tu deshpande': 31,
  'kwena maphaka': 20,
  'kt maphaka': 20,
  'adam milne': 34,
  'af milne': 34,
  'kuldeep sen': 29,
  'kr sen': 29,
  'vignesh puthur': 24,
  'v puthur': 24,
  'yudhvir singh': 28,
  'yudhvir singh charak': 28,
  'sushant mishra': 25,
  'brijesh sharma': 24,
  'emanjot chahal': 22,
  'sam curran': 28,
  'sm curran': 28,
  'sanju samson': 31,
  'sv samson': 31,

  // League Veteran Benchmarks (34+ & 38+)
  'rohit sharma': 39,
  'rg sharma': 39,
  'ms dhoni': 45,
  'virat kohli': 38,
  'v kohli': 38,
  'ravichandran ashwin': 39,
  'r ashwin': 39,
  'faf du plessis': 41,
  'f du plessis': 41,
  'sunil narine': 38,
  'sp narine': 38,
  'andre russell': 38,
  'ad russell': 38,
  'mohit sharma': 37,
  'mm sharma': 37,
  'bhuvneshwar kumar': 36,
  'b kumar': 36,
  'mohammed shami': 36,
  'md shami': 36,
  'ajinkya rahane': 38,
  'am rahane': 38,
  'manish pandey': 37,
  'mk pandey': 37,
  'karn sharma': 38,
  'kv sharma': 38,
  'ishant sharma': 37,
  'i sharma': 37,
  'moeen ali': 39,
  'mm ali': 39,
  'david miller': 37,
  'da miller': 37,
  'marcus stoinis': 37,
  'mp stoinis': 37,
  'glenn maxwell': 37,
  'gj maxwell': 37,
  'mitchell starc': 36,
  'ma starc': 36,
  'trent boult': 37,
  'ta boult': 37,
  'jos buttler': 36,
  'jc buttler': 36,
  'yuzvendra chahal': 36,
  'ys chahal': 36,
  'harshal patel': 35,
  'hv patel': 35,
  'suryakumar yadav': 35,
  'sa yadav': 35,
  'kl rahul': 34,
  'hardik pandya': 33,
  'hh pandya': 33,
  'jasprit bumrah': 32,
  'jj bumrah': 32,
  'axar patel': 32,
  'ar patel': 32,
  'rashid khan': 28,
  'shubman gill': 27,
  'rinku singh': 28,
  'abhishek sharma': 25,
  'tilak varma': 23,
  'nitish kumar reddy': 23,
  'tristan stubbs': 25,
  'matheesha pathirana': 23,
  'harshit rana': 24,
  'mayank yadav': 24,

  // Indian Domestic Breakout Stars (SMAT / Ranji / Vijay Hazare / Duleep)
  'shivam shukla': 23,
  'yash raj punja': 20,
  'raj limbani': 21,
  'auqib dar': 24,
  'karan lal': 24,
  'virat singh': 25,
  'anmolpreet singh': 25,
  'tushar raheja': 23,
  'ankit kumar': 24,
  'chama milind': 30,
};

export function resolvePlayerAge(
  playerName: string,
  csvAgeOrBirthDate?: string | number
): number {
  if (csvAgeOrBirthDate !== undefined && csvAgeOrBirthDate !== null && csvAgeOrBirthDate !== '') {
    if (typeof csvAgeOrBirthDate === 'number' && csvAgeOrBirthDate >= 14 && csvAgeOrBirthDate <= 55) {
      return Math.round(csvAgeOrBirthDate);
    }
    const strVal = String(csvAgeOrBirthDate).trim();
    const numericVal = Number(strVal);
    if (!Number.isNaN(numericVal)) {
      if (numericVal >= 14 && numericVal <= 55) return Math.round(numericVal);
      if (numericVal >= 1975 && numericVal <= 2013) return 2026 - Math.round(numericVal);
    }
    const yearMatch = strVal.match(/\b(19[7-9]\d|200\d|201[0-2])\b/);
    if (yearMatch) {
      return 2026 - parseInt(yearMatch[1], 10);
    }
  }

  const norm = normalizeLifecycleName(playerName);
  if (KNOWN_PLAYER_AGES[norm] !== undefined) {
    return KNOWN_PLAYER_AGES[norm];
  }

  // Fallback by matching surname + first initial against known dictionary
  const tokens = norm.split(' ').filter(Boolean);
  if (tokens.length >= 2) {
    const surname = tokens[tokens.length - 1];
    const firstInit = tokens[0][0];
    for (const [k, ageVal] of Object.entries(KNOWN_PLAYER_AGES)) {
      const kParts = k.split(' ');
      if (
        kParts.length >= 2 &&
        kParts[kParts.length - 1] === surname &&
        kParts[0][0] === firstInit &&
        !['sharma', 'singh', 'kumar', 'patel'].includes(surname)
      ) {
        return ageVal;
      }
    }
  }

  // Deterministic realistic fallback age (24–29) based on name hash if unknown player in custom CSV
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = (hash * 31 + norm.charCodeAt(i)) % 997;
  }
  return 23 + (hash % 8);
}

export function getPlayerLifecycleProfile(
  playerName: string,
  csvAgeOrBirthDate?: string | number
): PlayerLifecycleProfile {
  const age = resolvePlayerAge(playerName, csvAgeOrBirthDate);
  const birthYear = 2026 - age;

  if (age <= 23) {
    return {
      age,
      birthYear,
      stageId: 'NEXT_GEN',
      badgeLabel: 'NEXT-GEN BREAKOUT (15–23)',
      colorScheme: 'cyan',
      isRetirementWatch: false,
      isDomesticNextGen: true,
      horizonSummary: '8–12 Year Franchise Runway',
    };
  }

  if (age <= 33) {
    return {
      age,
      birthYear,
      stageId: 'PRIME_WINDOW',
      badgeLabel: 'PRIME WINDOW (24–31)',
      colorScheme: 'green',
      isRetirementWatch: false,
      isDomesticNextGen: age <= 25,
      horizonSummary: age <= 25 ? 'Entering Peak Window (Next-Gen ≤25)' : 'Peak T20 Execution Window',
    };
  }

  if (age <= 37) {
    return {
      age,
      birthYear,
      stageId: 'VETERAN_TRANSITION',
      badgeLabel: 'VETERAN TRANSITION (34–37)',
      colorScheme: 'amber',
      isRetirementWatch: age >= 35,
      isDomesticNextGen: false,
      horizonSummary: '1–2 Season Transition Window • Groom Domestic Successor',
    };
  }

  return {
    age,
    birthYear,
    stageId: 'RETIREMENT_HORIZON',
    badgeLabel: 'RETIREMENT HORIZON (38+)',
    colorScheme: 'coral',
    isRetirementWatch: true,
    isDomesticNextGen: false,
    horizonSummary: 'Immediate Succession Horizon • Pair With U-25 Domestic Star',
  };
}

export function getLifecycleBadgeClasses(
  colorScheme: PlayerLifecycleProfile['colorScheme'],
  darkSurface: boolean = false
): string {
  if (darkSurface) {
    switch (colorScheme) {
      case 'cyan':
        return 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/40';
      case 'green':
        return 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/40';
      case 'amber':
        return 'bg-amber-500/15 text-amber-300 border border-amber-400/40';
      case 'coral':
        return 'bg-rose-500/20 text-rose-200 border border-rose-400/50';
    }
  }
  switch (colorScheme) {
    case 'cyan':
      return 'bg-cyan-50 text-cyan-800 border border-cyan-200';
    case 'green':
      return 'bg-emerald-50 text-emerald-800 border border-emerald-200';
    case 'amber':
      return 'bg-amber-50 text-amber-900 border border-amber-200';
    case 'coral':
      return 'bg-rose-50 text-rose-800 border border-rose-200';
  }
}

export function buildVeteranToDomesticSuccessionPairs(): VeteranSuccessionPair[] {
  return [
    {
      id: 'succ-jadeja-38',
      veteranName: 'Ravindra Jadeja',
      veteranAge: 38,
      veteranTeamLabel: 'Rajasthan Royals • Marquee Spin All-Rounder',
      isRRSquadMember: true,
      veteranRole: 'Middle-Overs Spin All-Rounder & Lower-Order Finisher (Overs 7–20)',
      veteranLifecycleBadge: 'RETIREMENT HORIZON (38+)',
      veteranColorScheme: 'coral',
      veteranCurrentMetric: '8.62 Pressure Econ • Entering Age-38 Final Cycle',
      successionUrgencyLabel: 'CRITICAL 2027–2028 SUCCESSION',
      transitionTimeline: 'Immediate Understudy & 2027 Phase-In',
      recommendedSuccessors: [
        {
          id: 'succ-cand-karan-lal',
          targetEngineId: 'dom-karan-lal',
          name: 'Karan Lal',
          age: 24,
          stateTeam: 'Bengal',
          tournaments: 'SMAT • RR Sept 2026 Trials • Ranji Trophy',
          roleMatchLabel: 'Spin-Bowling All-Rounder + Explosive Finisher',
          domesticStatsLine: '20-ball 50 at RR Sept 2026 Trials + 14 wkts @ 16.92 avg (174.6 SR)',
          domesticPrr: 90.6,
          basePriceLabel: '₹30L Base',
          graduationReadiness: 'Ready to share Overs 7–14 spin load & No. 6/7 finishing duties alongside Jadeja in 2027.',
        },
        {
          id: 'succ-cand-saransh-jain',
          targetEngineId: 'dom-saransh-jain',
          name: 'Saransh Jain',
          age: 31,
          stateTeam: 'Madhya Pradesh',
          tournaments: 'SMAT • Ranji Trophy • Duleep Trophy',
          roleMatchLabel: 'Ravindra Jadeja Age-38 Spin-AR Successor',
          domesticStatsLine: '86.0 PRR • 7.45 Middle Econ • Est. India Cap: 240 Days',
          domesticPrr: 86.0,
          basePriceLabel: '₹30L Base',
          graduationReadiness: 'Fixes Weakness #1 — Direct spin-bowling all-rounder successor for Age-38 Ravindra Jadeja.',
        },
      ],
    },
    {
      id: 'succ-shanaka-35',
      veteranName: 'Dasun Shanaka (35) & Shimron Hetmyer',
      veteranAge: 35,
      veteranTeamLabel: 'Rajasthan Royals • Middle/Lower-Order Finisher Cohort',
      isRRSquadMember: true,
      veteranRole: 'Middle-Order Finisher & Seam Utility (Overs 7–20)',
      veteranLifecycleBadge: 'VETERAN TRANSITION (34–37)',
      veteranColorScheme: 'amber',
      veteranCurrentMetric: '9.07 RPO Middle Stall • Overseas Slot Bottleneck',
      successionUrgencyLabel: 'DIRECT DOMESTIC GRADUATION',
      transitionTimeline: 'Replace in IPL 2027 Starting XI',
      recommendedSuccessors: [
        {
          id: 'succ-cand-virat-singh',
          targetEngineId: 'dom-virat-singh',
          name: 'Virat Singh',
          age: 25,
          stateTeam: 'Jharkhand',
          tournaments: 'SMAT • Ranji Trophy • Vijay Hazare',
          roleMatchLabel: 'LHB Indian Finisher Replacing Hetmyer (Overs 7–20)',
          domesticStatsLine: '88.9 PRR • 169.8 Pressure SR • Est. India Cap: 210 Days',
          domesticPrr: 88.9,
          basePriceLabel: '₹30L Base',
          graduationReadiness: 'Fixes Weakness #3 — LHB Indian finisher replacing Hetmyer while freeing an overseas slot.',
        },
        {
          id: 'succ-cand-mahipal-lomror',
          targetEngineId: 'dom-mahipal-lomror',
          name: 'Mahipal Lomror',
          age: 26,
          stateTeam: 'Rajasthan',
          tournaments: 'SMAT • Ranji Trophy • IPL Proven',
          roleMatchLabel: 'Local Jaipur LHB Spin-Enforcer',
          domesticStatsLine: '88.9 PRR • 156.8 Pressure SR • Est. India Cap: 49 Days',
          domesticPrr: 88.9,
          basePriceLabel: '₹50L Base',
          graduationReadiness: 'Fixes Weakness #3 — Homegrown Rajasthan LHB middle-order enforcer built for Sawai Mansingh dimensions.',
        },
      ],
    },
    {
      id: 'succ-milne-sandeep-pace',
      veteranName: 'Adam Milne (34) & Sandeep Sharma (33)',
      veteranAge: 34,
      veteranTeamLabel: 'Rajasthan Royals • Senior Seam Cohort',
      isRRSquadMember: true,
      veteranRole: 'Powerplay Swing & Death-Overs Pace Support (Overs 1–6 & 16–20)',
      veteranLifecycleBadge: 'VETERAN TRANSITION (34–37)',
      veteranColorScheme: 'amber',
      veteranCurrentMetric: '11.39 Non-Archer Death RPO • High Fast-Bowling Wear',
      successionUrgencyLabel: 'FAST-BOWLING PIPELINE RENEWAL',
      transitionTimeline: '2027 Rotational Starter → 2028 Lead Indian Seamer',
      recommendedSuccessors: [
        {
          id: 'succ-cand-raj-limbani',
          targetEngineId: 'dom-raj-limbani',
          name: 'Raj Limbani',
          age: 21,
          stateTeam: 'Baroda',
          tournaments: 'SMAT • Ranji Trophy • Vijay Hazare',
          roleMatchLabel: 'Overs 16–20 Yorker Partner for Jofra Archer',
          domesticStatsLine: '88.7 PRR • 7.48 Death Econ • Est. India Cap: 210 Days',
          domesticPrr: 88.7,
          basePriceLabel: '₹30L Base',
          graduationReadiness: 'Fixes Weakness #2 — At age 21, mirrors Sandeep Sharma’s swing while nailing 142 km/h death yorkers.',
        },
        {
          id: 'succ-cand-ashok-sharma',
          targetEngineId: 'dom-ashok-sharma',
          name: 'Ashok Sharma',
          age: 23,
          stateTeam: 'Rajasthan',
          tournaments: 'SMAT • Rajasthan Domestic • RR Trials',
          roleMatchLabel: 'Local Jaipur Hit-the-Deck Death Pacer',
          domesticStatsLine: '88.4 PRR • 22 SMAT Wkts (7.62 Econ) • Est. India Cap: 210 Days',
          domesticPrr: 88.4,
          basePriceLabel: '₹30L Base',
          graduationReadiness: 'Fixes Weakness #2 — 22-wicket SMAT strike bowler who knows Sawai Mansingh pitch lengths intimately.',
        },
      ],
    },
    {
      id: 'succ-rohit-dhoni-benchmark',
      veteranName: 'Rohit Sharma (39) & MS Dhoni (45)',
      veteranAge: 39,
      veteranTeamLabel: 'League Benchmark • Top-Order & Wicketkeeper Finisher Archetypes',
      isRRSquadMember: false,
      veteranRole: 'High-Impact Top-Order Anchor & Clutch Keeper-Finisher',
      veteranLifecycleBadge: 'RETIREMENT HORIZON (38+)',
      veteranColorScheme: 'coral',
      veteranCurrentMetric: 'Age 39–45 League Transition Benchmark',
      successionUrgencyLabel: '3-YEAR DOMESTIC GRADUATION BENCHMARK',
      transitionTimeline: 'Next-Gen Indian Core (Ages 20–25)',
      recommendedSuccessors: [
        {
          id: 'succ-cand-ankit-kumar',
          targetEngineId: 'dom-ankit-kumar',
          name: 'Ankit Kumar',
          age: 24,
          stateTeam: 'Haryana',
          tournaments: 'SMAT • Ranji Trophy • Vijay Hazare',
          roleMatchLabel: 'Top-Order & Spin-Hitting Anchor',
          domesticStatsLine: '87.1 PRR • 172.3 Pressure SR • Est. India Cap: 210 Days',
          domesticPrr: 87.1,
          basePriceLabel: '₹30L Base',
          graduationReadiness: 'Fixes Weakness #4 — High-ceiling Indian top-order batter built to graduate into a 400+ run starter.',
        },
        {
          id: 'succ-cand-tushar-raheja',
          targetEngineId: 'dom-tushar-raheja',
          name: 'Tushar Raheja',
          age: 23,
          stateTeam: 'Tamil Nadu',
          tournaments: 'SMAT • Vijay Hazare',
          roleMatchLabel: 'LHB Wicketkeeper-Opener Cover',
          domesticStatsLine: '86.4 PRR • 158.8 Chase SR • Est. India Cap: 365 Days',
          domesticPrr: 86.4,
          basePriceLabel: '₹30L Base',
          graduationReadiness: 'Fixes Weakness #4 — Next-gen Indian keeper-opener providing 10-year squad continuity behind Dhruv Jurel.',
        },
      ],
    },
  ];
}
