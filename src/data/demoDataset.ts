import { RawCompetition, RawDelivery, RawMatch, RawPlayingEleven, RawPlayerMapping, RawTeam } from '../types/cricket';

export function generateRealisticDemoData(): {
  deliveries: RawDelivery[];
  matches: RawMatch[];
  competitions: RawCompetition[];
  playingEleven: RawPlayingEleven[];
  teams: RawTeam[];
  playerMapping: RawPlayerMapping[];
} {
  const competitions: RawCompetition[] = [
    { comp_id: 1, comp_name: 'Indian Premier League 2024', match_format: 'T20', season: '2024' },
    { comp_id: 2, comp_name: 'Indian Premier League 2023', match_format: 'T20', season: '2023' },
    { comp_id: 3, comp_name: 'Indian Premier League 2022', match_format: 'T20', season: '2022' },
    { comp_id: 4, comp_name: 'ICC Men\'s T20 World Cup 2024', match_format: 'T20I', season: '2024' },
  ];

  const teams: RawTeam[] = [
    { comp_id: 1, team_id: 101, team_name: 'Rajasthan Royals' },
    { comp_id: 1, team_id: 102, team_name: 'Kolkata Knight Riders' },
    { comp_id: 1, team_id: 103, team_name: 'Sunrisers Hyderabad' },
    { comp_id: 1, team_id: 104, team_name: 'Chennai Super Kings' },
    { comp_id: 1, team_id: 105, team_name: 'Royal Challengers Bengaluru' },
    { comp_id: 1, team_id: 106, team_name: 'Mumbai Indians' },
    { comp_id: 1, team_id: 107, team_name: 'Gujarat Titans' },
    { comp_id: 1, team_id: 108, team_name: 'Lucknow Super Giants' },
    { comp_id: 1, team_id: 109, team_name: 'Delhi Capitals' },
    { comp_id: 1, team_id: 110, team_name: 'Punjab Kings' },
    { comp_id: 4, team_id: 201, team_name: 'India' },
    { comp_id: 4, team_id: 202, team_name: 'South Africa' },
    { comp_id: 4, team_id: 203, team_name: 'Australia' },
    { comp_id: 4, team_id: 204, team_name: 'England' },
  ];

  const starBatters = [
    { id: 1001, name: 'Heinrich Klaasen', hand: 'RHB', role: 'Middle-Order' as const, baseSR: 172, pressSR: 198, dotAvoid: 78, teamId: 103, teamName: 'Sunrisers Hyderabad' },
    { id: 1002, name: 'Rinku Singh', hand: 'LHB', role: 'Finisher' as const, baseSR: 154, pressSR: 188, dotAvoid: 82, teamId: 102, teamName: 'Kolkata Knight Riders' },
    { id: 1003, name: 'Nicholas Pooran', hand: 'LHB', role: 'Middle-Order' as const, baseSR: 162, pressSR: 182, dotAvoid: 74, teamId: 108, teamName: 'Lucknow Super Giants' },
    { id: 1004, name: 'Suryakumar Yadav', hand: 'RHB', role: 'Middle-Order' as const, baseSR: 168, pressSR: 179, dotAvoid: 76, teamId: 106, teamName: 'Mumbai Indians' },
    { id: 1005, name: 'Sanju Samson', hand: 'RHB', role: 'Opener' as const, baseSR: 155, pressSR: 168, dotAvoid: 75, teamId: 101, teamName: 'Rajasthan Royals' },
    { id: 1006, name: 'Shimron Hetmyer', hand: 'LHB', role: 'Finisher' as const, baseSR: 152, pressSR: 176, dotAvoid: 72, teamId: 101, teamName: 'Rajasthan Royals' },
    { id: 1007, name: 'Virat Kohli', hand: 'RHB', role: 'Opener' as const, baseSR: 138, pressSR: 158, dotAvoid: 84, teamId: 105, teamName: 'Royal Challengers Bengaluru' },
    { id: 1008, name: 'Andre Russell', hand: 'RHB', role: 'Finisher' as const, baseSR: 175, pressSR: 185, dotAvoid: 65, teamId: 102, teamName: 'Kolkata Knight Riders' },
    { id: 1009, name: 'Jos Buttler', hand: 'RHB', role: 'Opener' as const, baseSR: 151, pressSR: 164, dotAvoid: 74, teamId: 101, teamName: 'Rajasthan Royals' },
    { id: 1010, name: 'Shivam Dube', hand: 'LHB', role: 'Middle-Order' as const, baseSR: 158, pressSR: 166, dotAvoid: 68, teamId: 104, teamName: 'Chennai Super Kings' },
    { id: 1011, name: 'Yashasvi Jaiswal', hand: 'LHB', role: 'Opener' as const, baseSR: 160, pressSR: 155, dotAvoid: 71, teamId: 101, teamName: 'Rajasthan Royals' },
    { id: 1012, name: 'MS Dhoni', hand: 'RHB', role: 'Finisher' as const, baseSR: 142, pressSR: 165, dotAvoid: 79, teamId: 104, teamName: 'Chennai Super Kings' },
    { id: 1013, name: 'David Miller', hand: 'LHB', role: 'Middle-Order' as const, baseSR: 146, pressSR: 162, dotAvoid: 77, teamId: 107, teamName: 'Gujarat Titans' },
    { id: 1014, name: 'Marcus Stoinis', hand: 'RHB', role: 'Middle-Order' as const, baseSR: 148, pressSR: 161, dotAvoid: 70, teamId: 108, teamName: 'Lucknow Super Giants' },
    { id: 1015, name: 'Tim David', hand: 'RHB', role: 'Finisher' as const, baseSR: 166, pressSR: 163, dotAvoid: 64, teamId: 106, teamName: 'Mumbai Indians' },
  ];

  const starBowlers = [
    { id: 2001, name: 'Jasprit Bumrah', type: 'Right-arm fast', paceOrSpin: 'Pace' as const, baseEcon: 6.8, pressEcon: 6.1, dotPct: 48, wicketSR: 13, teamId: 106, teamName: 'Mumbai Indians' },
    { id: 2002, name: 'Rashid Khan', type: 'Leg-break googly', paceOrSpin: 'Spin' as const, baseEcon: 7.2, pressEcon: 6.9, dotPct: 44, wicketSR: 15, teamId: 107, teamName: 'Gujarat Titans' },
    { id: 2003, name: 'Sunil Narine', type: 'Right-arm offbreak', paceOrSpin: 'Spin' as const, baseEcon: 6.9, pressEcon: 6.5, dotPct: 46, wicketSR: 17, teamId: 102, teamName: 'Kolkata Knight Riders' },
    { id: 2004, name: 'Sandeep Sharma', type: 'Right-arm medium-fast', paceOrSpin: 'Pace' as const, baseEcon: 8.1, pressEcon: 7.4, dotPct: 41, wicketSR: 14, teamId: 101, teamName: 'Rajasthan Royals' },
    { id: 2005, name: 'Trent Boult', type: 'Left-arm fast', paceOrSpin: 'Pace' as const, baseEcon: 8.0, pressEcon: 7.8, dotPct: 47, wicketSR: 16, teamId: 101, teamName: 'Rajasthan Royals' },
    { id: 2006, name: 'Pat Cummins', type: 'Right-arm fast', paceOrSpin: 'Pace' as const, baseEcon: 8.6, pressEcon: 8.1, dotPct: 39, wicketSR: 15, teamId: 103, teamName: 'Sunrisers Hyderabad' },
    { id: 2007, name: 'Mitchell Starc', type: 'Left-arm fast', paceOrSpin: 'Pace' as const, baseEcon: 9.2, pressEcon: 8.4, dotPct: 42, wicketSR: 12, teamId: 102, teamName: 'Kolkata Knight Riders' },
    { id: 2008, name: 'Yuzvendra Chahal', type: 'Leg-break', paceOrSpin: 'Spin' as const, baseEcon: 8.2, pressEcon: 7.9, dotPct: 38, wicketSR: 14, teamId: 101, teamName: 'Rajasthan Royals' },
    { id: 2009, name: 'Arshdeep Singh', type: 'Left-arm medium-fast', paceOrSpin: 'Pace' as const, baseEcon: 8.7, pressEcon: 8.2, dotPct: 40, wicketSR: 13, teamId: 110, teamName: 'Punjab Kings' },
    { id: 2010, name: 'Matheesha Pathirana', type: 'Right-arm fast sling', paceOrSpin: 'Pace' as const, baseEcon: 8.4, pressEcon: 7.6, dotPct: 45, wicketSR: 11, teamId: 104, teamName: 'Chennai Super Kings' },
    { id: 2011, name: 'Kuldeep Yadav', type: 'Left-arm wrist spin', paceOrSpin: 'Spin' as const, baseEcon: 7.6, pressEcon: 7.5, dotPct: 43, wicketSR: 16, teamId: 109, teamName: 'Delhi Capitals' },
    { id: 2012, name: 'Avesh Khan', type: 'Right-arm fast', paceOrSpin: 'Pace' as const, baseEcon: 8.9, pressEcon: 8.5, dotPct: 37, wicketSR: 17, teamId: 101, teamName: 'Rajasthan Royals' },
    { id: 2013, name: 'T Natarajan', type: 'Left-arm medium-fast', paceOrSpin: 'Pace' as const, baseEcon: 8.8, pressEcon: 8.3, dotPct: 39, wicketSR: 14, teamId: 103, teamName: 'Sunrisers Hyderabad' },
    { id: 2014, name: 'Mohit Sharma', type: 'Right-arm medium-fast', paceOrSpin: 'Pace' as const, baseEcon: 8.7, pressEcon: 8.6, dotPct: 36, wicketSR: 15, teamId: 107, teamName: 'Gujarat Titans' },
  ];

  const playerMapping: RawPlayerMapping[] = [
    ...starBatters.map(b => ({
      comp_id: 1,
      comp_name: 'Indian Premier League',
      team_id: b.teamId,
      team_name: b.teamName,
      player_id: b.id,
      player_name: b.name,
    })),
    ...starBowlers.map(b => ({
      comp_id: 1,
      comp_name: 'Indian Premier League',
      team_id: b.teamId,
      team_name: b.teamName,
      player_id: b.id,
      player_name: b.name,
    })),
  ];

  // Generate 32 realistic matches across 2022-2024
  const matches: RawMatch[] = [];
  const stages = ['Group', 'Group', 'Group', 'Qualifier 1', 'Eliminator', 'Qualifier 2', 'Final'];

  for (let m = 1; m <= 32; m++) {
    const isKnockout = m >= 25;
    const stage = isKnockout ? stages[2 + (m % 5)] : 'Group';
    const compId = m > 28 ? 4 : (m % 3) + 1;
    const homeTeam = (m % 8) + 101;
    const awayTeam = ((m + 3) % 8) + 101;
    const year = compId === 4 ? 2024 : 2021 + compId;
    const month = compId === 4 ? '06' : '05';
    const day = (m % 28 + 1).toString().padStart(2, '0');

    matches.push({
      match_id: 5000 + m,
      comp_id: compId,
      match_date: `${year}-${month}-${day}`,
      stage,
      venue_id: 10 + (m % 6),
      venue_country: compId === 4 ? 'West Indies' : 'India',
      home_team: homeTeam,
      away_team: awayTeam,
      knock_out: isKnockout ? 1 : 0,
      win_team_id: (m % 2 === 0) ? homeTeam : awayTeam,
      result: (m % 2 === 0) ? 'Won by chasing' : 'Won by defending',
    });
  }

  // Generate playing eleven records
  const playingEleven: RawPlayingEleven[] = [];
  matches.forEach(m => {
    starBatters.slice(0, 8).forEach((b, idx) => {
      playingEleven.push({
        match_id: m.match_id,
        team_id: typeof m.home_team === 'number' ? m.home_team : 101,
        player_id: b.id,
        batting_order: idx + 1,
        is_played: 1,
      });
    });
    starBowlers.slice(0, 6).forEach(b => {
      playingEleven.push({
        match_id: m.match_id,
        team_id: typeof m.away_team === 'number' ? m.away_team : 102,
        player_id: b.id,
        is_played: 1,
      });
    });
  });

  // Generate realistic delivery stream (~3,400 balls with exact cricket physics & pressure scenarios)
  const deliveries: RawDelivery[] = [];

  matches.forEach((m, matchIdx) => {
    // 2 Innings per match
    for (let inn = 1; inn <= 2; inn++) {
      let cumulativeRuns = 0;
      let cumulativeWickets = 0;
      const target = inn === 2 ? 188 : undefined;
      const teamBatting = inn === 1 ? m.home_team : m.away_team;
      const teamBowling = inn === 1 ? m.away_team : m.home_team;

      let currentStrikerIdx = (matchIdx + inn) % starBatters.length;
      let nonStrikerIdx = (currentStrikerIdx + 1) % starBatters.length;

      // 20 Overs
      for (let over = 1; over <= 20; over++) {
        // Change bowler each over
        const bowlerIdx = (matchIdx * 3 + over) % starBowlers.length;
        const bowler = starBowlers[bowlerIdx];

        // 6 balls per over (with occasional extras)
        let legalBallsInOver = 0;
        let ballInOver = 1;

        while (legalBallsInOver < 6) {
          const striker = starBatters[currentStrikerIdx];
          const ballsRemaining = (20 - over) * 6 + (6 - legalBallsInOver);
          const runsNeeded = target ? Math.max(0, target - cumulativeRuns) : 0;
          const rrr = target ? (runsNeeded / Math.max(1, ballsRemaining)) * 6 : 0;

          // Determine pressure scenario
          const isChasePressure = inn === 2 && (rrr >= 10.5 || (ballsRemaining <= 24 && runsNeeded >= 32));
          const isCollapse = cumulativeWickets >= 3 && over <= 7;
          const isDeathHighStakes = over >= 17;
          const isKnockoutLeverage = m.knock_out === 1;
          const isPressureBall = (isChasePressure || isCollapse || isDeathHighStakes) && (Math.random() < 0.85 || isKnockoutLeverage);

          // Ball outcome determination
          let runs = 0;
          let isFour = 0;
          let isSix = 0;
          let isWicket = 0;
          let extrasType: string | undefined = undefined;
          let extrasRuns = 0;

          // Wide / No Ball chance ~4%
          if (Math.random() < 0.04) {
            extrasType = Math.random() < 0.7 ? 'Wide' : 'No Ball';
            extrasRuns = 1;
          } else {
            legalBallsInOver++;
          }

          if (extrasType !== 'Wide') {
            // Striker performance under pressure vs normal
            const targetSR = isPressureBall ? striker.pressSR : striker.baseSR;
            const bowlerSuppression = isPressureBall ? (10 - bowler.pressEcon) / 10 : (10 - bowler.baseEcon) / 10;
            const effectiveProbability = (targetSR / 100) * bowlerSuppression;

            const roll = Math.random();

            // Wicket chance (~4.5%)
            if (roll < 0.045 * (isPressureBall ? 1.4 : 1.0)) {
              isWicket = 1;
              cumulativeWickets++;
              // Bring in next batter
              currentStrikerIdx = (Math.max(currentStrikerIdx, nonStrikerIdx) + 1) % starBatters.length;
            } else if (roll < 0.045 + 0.08 * (effectiveProbability * 0.9)) {
              // Six
              runs = 6;
              isSix = 1;
            } else if (roll < 0.045 + 0.22 * (effectiveProbability * 0.95)) {
              // Four
              runs = 4;
              isFour = 1;
            } else if (roll < 0.045 + 0.40) {
              // Two
              runs = 2;
            } else if (roll < 0.045 + 0.72) {
              // Single
              runs = 1;
              // Rotate strike
              const temp = currentStrikerIdx;
              currentStrikerIdx = nonStrikerIdx;
              nonStrikerIdx = temp;
            } else {
              // Dot ball
              runs = 0;
            }
          }

          cumulativeRuns += runs + extrasRuns;

          deliveries.push({
            match_id: m.match_id,
            innings: inn,
            overid: over,
            over_ball_num: ballInOver,
            innings_ball_num: (over - 1) * 6 + ballInOver,
            batting_team_id: Number(teamBatting) || 101,
            bowling_team_id: Number(teamBowling) || 102,
            striker_id: striker.id,
            striker_name: striker.name,
            non_striker_id: starBatters[nonStrikerIdx].id,
            bowler_id: bowler.id,
            bowler_name: bowler.name,
            batting_type: striker.hand,
            bowling_type: bowler.type,
            batting_order: striker.role === 'Opener' ? 1 : (striker.role === 'Middle-Order' ? 4 : 6),
            runs,
            is_four: isFour,
            is_six: isSix,
            is_wicket: isWicket,
            dismissal_type: isWicket ? (runs === 0 && Math.random() < 0.4 ? 'bowled' : 'caught') : undefined,
            extras_type: extrasType,
            extras1_runs: extrasRuns > 0 ? extrasRuns : undefined,
            pace_or_spin: bowler.paceOrSpin,
            bowl_speed: bowler.paceOrSpin === 'Pace' ? 134 + Math.round(Math.random() * 15) : 88 + Math.round(Math.random() * 10),
            stroke: isSix ? 'Pull / Slog' : (isFour ? 'Cover Drive / Cut' : 'Defensive / Push'),
          });

          ballInOver++;

          // Innings ends if target chased or 10 wickets down
          if (target && cumulativeRuns >= target) break;
          if (cumulativeWickets >= 10) break;
        }

        // Strike rotation at over end
        const temp = currentStrikerIdx;
        currentStrikerIdx = nonStrikerIdx;
        nonStrikerIdx = temp;

        if (target && cumulativeRuns >= target) break;
        if (cumulativeWickets >= 10) break;
      }
    }
  });

  return {
    deliveries,
    matches,
    competitions,
    playingEleven,
    teams,
    playerMapping,
  };
}
