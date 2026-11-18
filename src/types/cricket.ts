export interface RawDelivery {
  match_id: number;
  innings: number;
  overid: number;
  over_ball_num: number;
  innings_ball_num?: number;
  batting_team_id: number;
  bowling_team_id: number;
  striker_id: number;
  striker_name: string;
  non_striker_id?: number;
  bowler_id: number;
  bowler_name: string;
  batting_type?: string; // 'RHB' | 'LHB'
  bowling_type?: string; // 'Right-arm fast', 'Leg-break', etc.
  batting_order?: number;
  runs: number;
  is_four: number | boolean;
  is_six: number | boolean;
  is_wicket: number | boolean;
  dismissed_player_id?: number;
  dismissal_type?: string;
  extras_type?: string; // 'Wide', 'No Ball', 'Leg Bye', 'Bye', 'Penalty'
  extras1_runs?: number;
  extras_2_runs?: number;
  pace_or_spin?: string; // 'Pace' | 'Spin'
  bowl_speed?: number;
  stroke?: string;
  on_or_off?: string; // 'Off' | 'On' | 'Off-side' | 'On-side'
  over_or_around?: string; // 'Over' | 'Around'
  delivery_style?: string;
  timestamp?: string | number;
  delivery_timestamp?: string | number;
}

export interface BatterShotEvent {
  ballIndex: number;
  over: number;
  ballNum: number;
  runs: number;
  isFour: boolean;
  isSix: boolean;
  stroke: string;
  onOrOff: 'Off-side' | 'On-side' | 'Straight';
  sector: string;
  angleDeg: number;
  distanceRatio: number;
  bpi: number;
  opponent: string;
  matchDate: string;
  bowlerType: string;
  innings?: number;
  wicketsBefore?: number;
  runsNeeded?: number;
  ballsRemaining?: number;
  phase?: 'Powerplay' | 'Middle' | 'Death';
  deliveryTimestamp?: string;
  reactionTimeMs?: number;
}

export interface BowlerDeliveryEvent {
  ballIndex: number;
  over: number;
  ballNum: number;
  runsConceded: number;
  isWicket: boolean;
  isDot: boolean;
  dismissalType: string;
  overOrAround: 'Over' | 'Around';
  deliveryStyle: string;
  lengthZone: string;
  speedKmh: number;
  pitchX: number;
  pitchY: number;
  endX: number;
  bpi: number;
  opponent: string;
  matchDate: string;
  innings?: number;
  wicketsBefore?: number;
  runsNeeded?: number;
  ballsRemaining?: number;
  phase?: 'Powerplay' | 'Middle' | 'Death';
  deliveryTimestamp?: string;
  reactionTimeMs?: number;
}

export interface RawMatch {
  match_id: number;
  comp_id: number;
  match_date: string;
  stage?: string; // 'Group', 'Qualifier 1', 'Eliminator', 'Final', etc.
  venue_id?: number;
  venue_country?: string;
  home_team?: string | number;
  away_team?: string | number;
  first_inn_revised_overs?: number;
  second_inn_revised_overs?: number;
  revised_target?: number;
  knock_out?: number | boolean;
  win_team_id?: number;
  result?: string;
}

export interface RawCompetition {
  comp_id: number;
  comp_name: string;
  match_format: string; // 'T20', 'T20I', etc.
  season: string | number;
}

export interface RawPlayingEleven {
  match_id: number;
  team_id: number;
  player_id: number;
  batting_order?: number;
  is_played?: number | boolean;
  is_captain?: number | boolean;
  is_wk?: number | boolean;
  is_impact?: number | boolean;
  is_impact_off?: number | boolean;
}

export interface RawTeam {
  comp_id?: number;
  team_id: number;
  team_name: string;
}

export interface RawPlayerMapping {
  comp_id?: number;
  comp_name?: string;
  team_id?: number;
  team_name?: string;
  player_id: number;
  player_name: string;
  batting_type?: string;
  bowling_type?: string;
  role?: string;
}

export interface ProcessedDelivery extends RawDelivery {
  ball_total_runs: number;
  is_legal_delivery: boolean;
  score_before_ball: number;
  wickets_before_ball: number;
  legal_balls_bowled: number;
  balls_remaining: number;
  current_run_rate: number;
  target?: number;
  runs_needed?: number;
  required_run_rate?: number;
  bpi: number; // 0-100 Ball Pressure Index
  p_j: number; // 0.0 - 1.0 Continuous Sigmoid Ball Pressure Index
  is_high_pressure: boolean; // P_j >= 0.65
  is_normal_baseline: boolean; // P_j < 0.45
  expected_runs?: number; // E[Runs]
  v_j_batter?: number; // Batter Ball Value
  v_j_bowler?: number; // Bowler Ball Value
  comp_name?: string;
  match_date?: string;
  stage?: string;
  is_knockout?: boolean;
}

export type StressTestPreset = 'unified' | 'strict_ipl' | 'recent_form' | 'playoffs_death';

export interface MatchupArchetypeSplit {
  archetype: 'Left-arm Pace' | 'Right-arm Pace' | 'Wrist Spin' | 'Finger Spin';
  balls: number;
  runs: number;
  wicketsOrDismissals: number;
  dots: number;
  boundaries: number;
  primaryMetric: number; // Pressure SR for batters, Pressure Economy for bowlers
  dominanceRating: 'Dominant' | 'Advantage' | 'Neutral' | 'Vulnerable';
}

export interface ImpactPlayerSplit {
  impactSubMatches: number;
  starterMatches: number;
  impactSubBalls: number;
  starterBalls: number;
  impactSubMetric: number; // SR for batter, Econ for bowler
  starterMetric: number;
  deltaLabel: string;
  badgeLabel: string;
}

export interface SuperOverBallOutcome {
  ballNumber: number; // 1 to 6
  ballLabel: string; // '0.1' to '0.6'
  outcome: '0' | '1' | '2' | '4' | '6' | 'W';
  runs: number;
  isWicket: boolean;
  isBoundary: boolean;
  bowlerStyle: string;
  overOrAround: 'Over' | 'Around';
  speedKmh: number;
  pitchX: number; // -0.4 to 0.4
  pitchY: number; // 0.12 (yorker) to 0.58 (short)
  batterStroke: string;
  shotSide: 'Off-side' | 'On-side' | 'Straight';
  shotAngleDeg: number;
  shotDistanceRatio: number;
  commentary: string;
  isHistoricalHeadToHead: boolean;
}

export interface SuperOverSimResult {
  batterId: number;
  batterName: string;
  batterTeam: string;
  bowlerId: number;
  bowlerName: string;
  bowlerTeam: string;
  targetRuns: number;
  totalRuns: number;
  wicketsLost: number;
  winner: 'batter' | 'bowler';
  winMarginText: string;
  tacticalSummary: string;
  headToHeadBallsFound: number;
  balls: SuperOverBallOutcome[];
}

export interface PressureModelConfig {
  pressureThreshold: number; // default 65
  chaseRRRWeight: number; // slider 0.5 - 2.0
  closeFinishWeight: number; // slider 0.5 - 2.0
  collapseWeight: number; // slider 0.5 - 2.0
  knockoutMultiplier: number; // slider 1.0 - 1.5
  minBatterBalls: number; // default 100
  minBatterInnings: number; // default 8
  minBowlerBalls: number; // default 90
  minBowlerSpells: number; // default 8
  competitionFilter: 'ALL' | 'IPL' | 'T20I';
  seasonMin: number;
  seasonMax: number;
  iplWeight: number; // 1.0 to 1.5 multiplier for IPL vs T20I
  shrinkageK_batter?: number; // default 120
  shrinkageK_bowler?: number; // default 90
  venueParRR?: number; // default 8.5
  stressPreset?: StressTestPreset;
}

export interface MatchInningsPressureRecord {
  match_id: number;
  match_date: string;
  comp_name: string;
  stage: string;
  opponent: string;
  is_knockout: boolean;
  pressure_balls: number;
  pressure_runs: number;
  pressure_dismissals: number;
  pressure_sr: number;
  pressure_wickets_taken: number;
  pressure_runs_conceded: number;
  pressure_economy: number;
  pressure_dots: number;
  match_result: string;
}

export interface BatterRating {
  playerId: number;
  name: string;
  teamName: string;
  battingType: string;
  role: 'Opener' | 'Middle-Order' | 'Finisher';
  rrSquadRoleFit?: string;
  rrWeaknessFixTag?: string;
  estIndiaCapLabel?: string;
  indiaWeaknessFitBadge?: string;
  indiaThreatCategory?: 'THREAT_1_SEAM_BOUNCE' | 'THREAT_2_ALL_ROUNDER' | 'THREAT_3_FAST_BOWLER' | 'THREAT_4_COLLAPSE_RECOVERY';
  rrBottleneckFixedReason?: string;
  teamIndiaVoidReason?: string;
  domesticPressureProof?: string;
  rrImpactFitScore?: number;
  teamIndiaFitScore?: number;
  basePriceLabel?: string;
  rankStabilityBadge?: string;
  competitionsPlayed?: 'IPL + IT20' | 'IPL Only' | 'IT20 Only';
  isRajasthanRoyalsPlayer?: boolean;
  impactSplit?: ImpactPlayerSplit;
  matchupMatrix?: MatchupArchetypeSplit[];
  
  // Volume
  totalBalls: number;
  totalInnings: number;
  pressureBalls: number;
  pressureInnings: number;
  
  // Baselines
  normalRuns: number;
  normalBalls: number;
  normalDismissals: number;
  normalSR: number;
  normalBoundaryPct: number;
  normalDotPct: number;
  
  // Under Pressure
  pressureRuns: number;
  pressureDismissals: number;
  pressureSR: number;
  pressureBoundaryPct: number;
  pressureDotAvoidancePct: number;
  pressureBallsPerDismissal: number;
  
  // Delta Metrics
  srDelta: number; // pressureSR - normalSR
  boundaryDelta: number;
  
  // Bayesian Shrinkage & Consistency
  shrunkSR: number;
  consistencyScore: number; // 0-100 (1 - CV)
  
  // 4-Stage Statistical Formula Breakdown
  pressureWeightedAvg?: number; // sum(P_j * V_j) / sum(P_j) over P_j >= 0.65
  normalAvg?: number; // mean V_j over P_j < 0.45
  baselineDeltaVal?: number; // Pressure_Weighted_Avg - Normal_Avg
  rawClutchScore?: number; // 0.70 * Pressure_Weighted_Avg + 0.30 * Baseline_Delta
  shrunkScore?: number; // (N / (N + k)) * Raw_Clutch + (k / (N + k)) * Cohort_Mean
  consistencyMultiplier?: number; // C_i = 1 / (1 + 0.25 * CV_i)
  prrRating?: number; // Final 0-100 Pressure Reliability Rating

  // Final Score (0 - 100)
  reliabilityScore: number;
  unstopRank: number;
  
  // Splits
  phaseSplits: {
    powerplay: { balls: number; runs: number; sr: number };
    middle: { balls: number; runs: number; sr: number };
    death: { balls: number; runs: number; sr: number };
  };
  paceVsSpin: {
    pace: { balls: number; runs: number; sr: number };
    spin: { balls: number; runs: number; sr: number };
  };
  shotZoneSplits?: {
    offSidePct: number;
    onSidePct: number;
    topStrokes: { stroke: string; runs: number; count: number; sr: number }[];
    vsPaceSR: number;
    vsSpinSR: number;
    dominantPowerZone?: string;
    dominantZoneSR?: number;
    dominantZoneBoundaryPct?: number;
  };
  topPressureShots?: BatterShotEvent[];
  avgPressureReactionMs?: number;
  baselineReactionMs?: number;
  pressureInningsLog: MatchInningsPressureRecord[];
}

export interface BowlerRating {
  playerId: number;
  name: string;
  teamName: string;
  bowlingType: string;
  paceOrSpin: 'Pace' | 'Spin';
  rrSquadRoleFit?: string;
  rrWeaknessFixTag?: string;
  estIndiaCapLabel?: string;
  indiaWeaknessFitBadge?: string;
  indiaThreatCategory?: 'THREAT_1_SEAM_BOUNCE' | 'THREAT_2_ALL_ROUNDER' | 'THREAT_3_FAST_BOWLER' | 'THREAT_4_COLLAPSE_RECOVERY';
  rrBottleneckFixedReason?: string;
  teamIndiaVoidReason?: string;
  domesticPressureProof?: string;
  rrImpactFitScore?: number;
  teamIndiaFitScore?: number;
  basePriceLabel?: string;
  rankStabilityBadge?: string;
  competitionsPlayed?: 'IPL + IT20' | 'IPL Only' | 'IT20 Only';
  isRajasthanRoyalsPlayer?: boolean;
  impactSplit?: ImpactPlayerSplit;
  matchupMatrix?: MatchupArchetypeSplit[];
  
  // Volume
  totalBalls: number;
  totalSpells: number;
  pressureBalls: number;
  pressureSpells: number;
  
  // Baselines
  normalBalls: number;
  normalRunsConceded: number;
  normalWickets: number;
  normalEconomy: number;
  normalDotPct: number;
  normalBoundaryConcededPct: number;
  
  // Under Pressure
  pressureBallsConceded: number;
  pressureRunsConceded: number;
  pressureWickets: number;
  pressureEconomy: number;
  pressureDotPct: number;
  pressureWicketSR: number; // balls per wicket
  pressureBoundaryConcededPct: number;
  
  // Deltas
  economyDelta: number; // normalEconomy - pressureEconomy (positive is better)
  dotDelta: number;
  
  // Bayesian Shrinkage & Consistency
  shrunkEconomy: number;
  consistencyScore: number; // 0-100
  
  // 4-Stage Statistical Formula Breakdown
  pressureWeightedAvg?: number; // sum(P_j * V_j) / sum(P_j) over P_j >= 0.65
  normalAvg?: number; // mean V_j over P_j < 0.45
  baselineDeltaVal?: number; // Pressure_Weighted_Avg - Normal_Avg
  rawClutchScore?: number; // 0.70 * Pressure_Weighted_Avg + 0.30 * Baseline_Delta
  shrunkScore?: number; // (N / (N + k)) * Raw_Clutch + (k / (N + k)) * Cohort_Mean
  consistencyMultiplier?: number; // C_i = 1 / (1 + 0.25 * CV_i)
  prrRating?: number; // Final 0-100 Pressure Reliability Rating

  // Final Score (0 - 100)
  reliabilityScore: number;
  unstopRank: number;
  
  // Splits
  phaseSplits: {
    powerplay: { balls: number; runs: number; econ: number; wickets: number };
    middle: { balls: number; runs: number; econ: number; wickets: number };
    death: { balls: number; runs: number; econ: number; wickets: number };
  };
  deliveryTelemetry?: {
    overWicketPct: number;
    aroundWicketPct: number;
    topStyles: { style: string; balls: number; economy: number; wickets: number }[];
    avgSpeed: number;
    lethalControlChannel?: string;
    lethalChannelEconomy?: number;
    lethalChannelWickets?: number;
  };
  topPressureDeliveries?: BowlerDeliveryEvent[];
  avgPressureReactionMs?: number;
  baselineReactionMs?: number;
  pressureSpellsLog: MatchInningsPressureRecord[];
}

export interface IngestionHealth {
  ballByBallLoaded: boolean;
  ballByBallCount: number;
  matchesLoaded: boolean;
  matchesCount: number;
  competitionsLoaded: boolean;
  competitionsCount: number;
  playingElevenLoaded: boolean;
  playingElevenCount: number;
  teamsLoaded: boolean;
  teamsCount: number;
  playerMappingLoaded: boolean;
  playerMappingCount: number;
  
  totalJoinedMatches: number;
  iplMatchesCount: number;
  t20iMatchesCount: number;
  totalDeliveriesProcessed: number;
  deliveriesPerSecond: number;
  isProcessing: boolean;
  progressPercent: number;
  lastUpdated: string;
}

export interface RegimeComparisonProof {
  metric: string;
  normalValue: number;
  pressureValue: number;
  shiftPct: number;
  unit: string;
  interpretation: string;
}

export interface BpiDistributionBin {
  range: string;
  min: number;
  max: number;
  count: number;
  isPressure: boolean;
}

export interface OverLeveragePoint {
  over: number;
  inn1_bpi: number;
  inn2_bpi: number;
  combined_bpi: number;
  boundary_pct: number;
  wicket_pct: number;
  phase: 'Powerplay' | 'Middle' | 'Death';
}

export interface DistributionBoxPlotStats {
  playerId: number;
  name: string;
  team: string;
  rank: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  values: number[]; // individual innings records for strip plot dots
}

export interface FunnelPlayerPoint {
  playerId: number;
  name: string;
  team: string;
  pressureBalls: number;
  rawSR: number;
  shrunkSR: number;
  rawEconomy: number;
  shrunkEconomy: number;
  isQualified: boolean;
  unstopRank: number;
  upperConfidence: number;
  lowerConfidence: number;
}


