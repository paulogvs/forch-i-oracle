// FORCH.i ORACLE — Tournament Simulation Engine
// Simulates the entire WC2026 bracket based on real data + AI predictions

import { matches, getMatchesByGroup, getMatchById, getTeamFlag, type Match } from './matches';
import { getTeamByName, getTeamEnglishName, WORLD_CUP_TEAMS } from './teams';
import { getPrediction } from './gemini';
import { getCachedPrediction, setCachedPrediction } from './cache';

// ─── Data Structures ──────────────────────────────────────────────────────

export interface GroupTeamStanding {
  name: string;
  flag: string;
  code: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

export interface SimulatedMatch {
  id: string;
  round: string;
  roundLabel: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  homeScore: number;
  awayScore: number;
  winner: string;
  isPlayed: boolean; // real match already played
  homeWinProb?: number;
  drawProb?: number;
  awayWinProb?: number;
  prediction?: string;
}

export interface GroupStandings {
  group: string;
  teams: GroupTeamStanding[];
}

export interface TournamentBracket {
  groups: GroupStandings[];
  roundOf32: SimulatedMatch[];
  roundOf16: SimulatedMatch[];
  quarters: SimulatedMatch[];
  semis: SimulatedMatch[];
  thirdPlace: SimulatedMatch;
  final: SimulatedMatch;
  champion: string;
  championFlag: string;
  runnerUp: string;
  runnerUpFlag: string;
  thirdPlaceTeam: string;
  thirdPlaceFlag: string;
  fourthPlaceTeam: string;
  fourthPlaceFlag: string;
  simulatedAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────

const MATCH_DURATION_MINUTES = 110; // 90 + 20 buffer
const NOW = new Date();

function isMatchPlayed(match: Match): boolean {
  const matchDate = new Date(`${match.date}T${match.time}:00Z`);
  return NOW.getTime() > matchDate.getTime() + MATCH_DURATION_MINUTES * 60 * 1000;
}

function getTeamFlagFn(name: string): string {
  const team = getTeamByName(name);
  return team?.flag || '🏳️';
}

// ─── Group Stage Simulation ───────────────────────────────────────────────

async function simulateGroupMatch(match: Match): Promise<{ homeScore: number; awayScore: number; winner: string }> {
  const played = isMatchPlayed(match);

  if (played) {
    // TODO: In production, fetch real result from API-Football
    // For now, simulate since we don't have real results yet
  }

  // Check cache first
  const cached = getCachedPrediction(match.homeTeam, match.awayTeam);
  if (cached) {
    const homeScore = cached.predictedScoreHome;
    const awayScore = cached.predictedScoreAway;
    if (homeScore > awayScore) return { homeScore, awayScore, winner: match.homeTeam };
    if (awayScore > homeScore) return { homeScore, awayScore, winner: match.awayTeam };
    return { homeScore, awayScore, winner: 'draw' };
  }

  // Get prediction
  try {
    const contextData = `Partido de fase de grupos del Mundial FIFA 2026. ${match.homeTeam} vs ${match.awayTeam}.`;
    const prediction = await getPrediction(match.homeTeam, match.awayTeam, contextData, {
      id: match.id,
      group: match.group,
      matchday: match.matchday,
      date: match.date,
      time: match.time,
      venue: match.venue,
      city: match.city,
    });

    setCachedPrediction(match.homeTeam, match.awayTeam, prediction);

    const homeScore = prediction.predictedScoreHome;
    const awayScore = prediction.predictedScoreAway;
    if (homeScore > awayScore) return { homeScore, awayScore, winner: match.homeTeam };
    if (awayScore > homeScore) return { homeScore, awayScore, winner: match.awayTeam };
    return { homeScore, awayScore, winner: 'draw' };
  } catch {
    // Fallback: random result
    const homeScore = Math.floor(Math.random() * 3);
    const awayScore = Math.floor(Math.random() * 3);
    if (homeScore > awayScore) return { homeScore, awayScore, winner: match.homeTeam };
    if (awayScore > homeScore) return { homeScore, awayScore, winner: match.awayTeam };
    return { homeScore, awayScore, winner: 'draw' };
  }
}

function initializeGroupStandings(): Map<string, GroupTeamStanding[]> {
  const standings = new Map<string, GroupTeamStanding[]>();
  for (const group of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']) {
    const teams = WORLD_CUP_TEAMS.filter((t) => t.group === group);
    standings.set(group, teams.map((t) => ({
      name: t.name,
      flag: t.flag,
      code: t.code,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
    })));
  }
  return standings;
}

function updateStandings(
  standings: Map<string, GroupTeamStanding[]>,
  group: string,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
  winner: string
) {
  const groupStandings = standings.get(group);
  if (!groupStandings) return;

  const home = groupStandings.find((t) => t.name === homeTeam);
  const away = groupStandings.find((t) => t.name === awayTeam);
  if (!home || !away) return;

  home.played++;
  away.played++;
  home.goalsFor += homeScore;
  home.goalsAgainst += awayScore;
  away.goalsFor += awayScore;
  away.goalsAgainst += homeScore;
  home.goalDiff = home.goalsFor - home.goalsAgainst;
  away.goalDiff = away.goalsFor - away.goalsAgainst;

  if (winner === 'draw') {
    home.drawn++;
    away.drawn++;
    home.points += 1;
    away.points += 1;
  } else if (winner === homeTeam) {
    home.won++;
    away.lost++;
    home.points += 3;
  } else {
    away.won++;
    home.lost++;
    away.points += 3;
  }
}

function sortGroupStandings(standings: GroupTeamStanding[]): GroupTeamStanding[] {
  return [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return 0;
  });
}

async function simulateGroupStage(): Promise<Map<string, GroupTeamStanding[]>> {
  const standings = initializeGroupStandings();

  // Process matches group by group, matchday by matchday
  for (const group of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']) {
    const groupMatches = getMatchesByGroup(group).sort((a, b) => a.matchday - b.matchday);

    for (const match of groupMatches) {
      const result = await simulateGroupMatch(match);
      updateStandings(standings, group, match.homeTeam, match.awayTeam, result.homeScore, result.awayScore, result.winner);
    }
  }

  return standings;
}

// ─── Knockout Bracket Logic ───────────────────────────────────────────────

interface KnockoutMatchDef {
  id: string;
  round: string;
  roundLabel: string;
  homeSource: string; // e.g., "1A", "2B", "3ACD" (best 3rd from A/C/D), "W-R32-1"
  awaySource: string;
}

// FIFA WC2026 Round of 32 matchups
// Format: 12 group winners vs 8 best 3rd + 12 runners-up play each other
// The exact matchups depend on which groups have the best 3rd place teams.
// For simplicity, we use the standard bracket mapping.
const R32_MATCHUPS: KnockoutMatchDef[] = [
  // Matchups: 1st place vs 3rd place (from specific groups)
  { id: 'R32-1', round: 'round-32', roundLabel: '1/16 Final', homeSource: '1A', awaySource: '3CDE' },
  { id: 'R32-2', round: 'round-32', roundLabel: '1/16 Final', homeSource: '2A', awaySource: '2B' },
  { id: 'R32-3', round: 'round-32', roundLabel: '1/16 Final', homeSource: '1B', awaySource: '3ABC' },
  { id: 'R32-4', round: 'round-32', roundLabel: '1/16 Final', homeSource: '1C', awaySource: '3ABF' },
  { id: 'R32-5', round: 'round-32', roundLabel: '1/16 Final', homeSource: '2C', awaySource: '2D' },
  { id: 'R32-6', round: 'round-32', roundLabel: '1/16 Final', homeSource: '1D', awaySource: '3BCE' },
  { id: 'R32-7', round: 'round-32', roundLabel: '1/16 Final', homeSource: '1E', awaySource: '3ABF' },
  { id: 'R32-8', round: 'round-32', roundLabel: '1/16 Final', homeSource: '2E', awaySource: '2F' },
  { id: 'R32-9', round: 'round-32', roundLabel: '1/16 Final', homeSource: '1F', awaySource: '3CDE' },
  { id: 'R32-10', round: 'round-32', roundLabel: '1/16 Final', homeSource: '1G', awaySource: '3ABC' },
  { id: 'R32-11', round: 'round-32', roundLabel: '1/16 Final', homeSource: '2G', awaySource: '2H' },
  { id: 'R32-12', round: 'round-32', roundLabel: '1/16 Final', homeSource: '1H', awaySource: '3ABF' },
  { id: 'R32-13', round: 'round-32', roundLabel: '1/16 Final', homeSource: '1I', awaySource: '3CDE' },
  { id: 'R32-14', round: 'round-32', roundLabel: '1/16 Final', homeSource: '2I', awaySource: '2J' },
  { id: 'R32-15', round: 'round-32', roundLabel: '1/16 Final', homeSource: '1J', awaySource: '3ABC' },
  { id: 'R32-16', round: 'round-32', roundLabel: '1/16 Final', homeSource: '1K', awaySource: '3CDE' },
  // Note: With 48 teams, the exact bracket varies. This is a simplified version.
];

const R16_MATCHUPS: KnockoutMatchDef[] = [
  { id: 'R16-1', round: 'round-16', roundLabel: 'Octavos de Final', homeSource: 'W-R32-1', awaySource: 'W-R32-2' },
  { id: 'R16-2', round: 'round-16', roundLabel: 'Octavos de Final', homeSource: 'W-R32-3', awaySource: 'W-R32-4' },
  { id: 'R16-3', round: 'round-16', roundLabel: 'Octavos de Final', homeSource: 'W-R32-5', awaySource: 'W-R32-6' },
  { id: 'R16-4', round: 'round-16', roundLabel: 'Octavos de Final', homeSource: 'W-R32-7', awaySource: 'W-R32-8' },
  { id: 'R16-5', round: 'round-16', roundLabel: 'Octavos de Final', homeSource: 'W-R32-9', awaySource: 'W-R32-10' },
  { id: 'R16-6', round: 'round-16', roundLabel: 'Octavos de Final', homeSource: 'W-R32-11', awaySource: 'W-R32-12' },
  { id: 'R16-7', round: 'round-16', roundLabel: 'Octavos de Final', homeSource: 'W-R32-13', awaySource: 'W-R32-14' },
  { id: 'R16-8', round: 'round-16', roundLabel: 'Octavos de Final', homeSource: 'W-R32-15', awaySource: 'W-R32-16' },
];

const QUARTER_MATCHUPS: KnockoutMatchDef[] = [
  { id: 'QF-1', round: 'quarter', roundLabel: 'Cuartos de Final', homeSource: 'W-R16-1', awaySource: 'W-R16-2' },
  { id: 'QF-2', round: 'quarter', roundLabel: 'Cuartos de Final', homeSource: 'W-R16-3', awaySource: 'W-R16-4' },
  { id: 'QF-3', round: 'quarter', roundLabel: 'Cuartos de Final', homeSource: 'W-R16-5', awaySource: 'W-R16-6' },
  { id: 'QF-4', round: 'quarter', roundLabel: 'Cuartos de Final', homeSource: 'W-R16-7', awaySource: 'W-R16-8' },
];

const SEMI_MATCHUPS: KnockoutMatchDef[] = [
  { id: 'SF-1', round: 'semi', roundLabel: 'Semifinales', homeSource: 'W-QF-1', awaySource: 'W-QF-2' },
  { id: 'SF-2', round: 'semi', roundLabel: 'Semifinales', homeSource: 'W-QF-3', awaySource: 'W-QF-4' },
];

// ─── Resolve team from source ─────────────────────────────────────────────

function resolveTeam(
  source: string,
  standings: Map<string, GroupTeamStanding[]>,
  winners: Map<string, string>,
  thirdPlaceTeams: string[]
): string {
  // Check if it's a knockout winner reference
  if (source.startsWith('W-')) {
    return winners.get(source) || 'TBD';
  }

  // Group position: "1A", "2B", "3CDE"
  const position = parseInt(source[0]);
  const groupLetter = source[1];

  if (position === 3) {
    // 3rd place teams — return from the list of best 3rd
    return thirdPlaceTeams[0] || 'TBD';
  }

  const groupStandings = standings.get(groupLetter);
  if (!groupStandings) return 'TBD';

  const team = groupStandings[position - 1];
  return team?.name || 'TBD';
}

function getBestThirdPlaceTeams(standings: Map<string, GroupTeamStanding[]>): string[] {
  const thirdPlaces: { name: string; points: number; goalDiff: number; goalsFor: number; group: string }[] = [];

  const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  for (const group of groupLetters) {
    const teams = standings.get(group);
    if (!teams) continue;
    const sorted = sortGroupStandings(teams);
    if (sorted.length >= 3) {
      const third = sorted[2];
      thirdPlaces.push({
        name: third.name,
        points: third.points,
        goalDiff: third.goalDiff,
        goalsFor: third.goalsFor,
        group,
      });
    }
  }

  // Sort by points, then goal diff, then goals for
  thirdPlaces.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    return b.goalsFor - a.goalsFor;
  });

  return thirdPlaces.slice(0, 8).map((t) => t.name);
}

// ─── Simulate knockout match ──────────────────────────────────────────────

async function simulateKnockoutMatch(
  homeTeam: string,
  awayTeam: string,
  roundLabel: string,
  matchId: string
): Promise<SimulatedMatch> {
  if (homeTeam === 'TBD' || awayTeam === 'TBD') {
    return {
      id: matchId,
      round: 'knockout',
      roundLabel,
      homeTeam,
      awayTeam,
      homeFlag: '🏳️',
      awayFlag: '🏳️',
      homeScore: 0,
      awayScore: 0,
      winner: 'TBD',
      isPlayed: false,
    };
  }

  const played = false; // Knockout matches are in the future

  const cached = getCachedPrediction(homeTeam, awayTeam);
  let homeScore: number;
  let awayScore: number;
  let homeWinProb = 50;
  let drawProb = 25;
  let awayWinProb = 25;
  let predictionText = '';

  if (cached) {
    homeScore = cached.predictedScoreHome;
    awayScore = cached.predictedScoreAway;
    homeWinProb = cached.homeWin;
    drawProb = cached.draw;
    awayWinProb = cached.awayWin;
    predictionText = cached.analysis;
  } else {
    try {
      const contextData = `Partido de ${roundLabel} del Mundial FIFA 2026. ${homeTeam} vs ${awayTeam}.`;
      const prediction = await getPrediction(homeTeam, awayTeam, contextData, null);
      setCachedPrediction(homeTeam, awayTeam, prediction);

      homeScore = prediction.predictedScoreHome;
      awayScore = prediction.predictedScoreAway;
      homeWinProb = prediction.homeWin;
      drawProb = prediction.draw;
      awayWinProb = prediction.awayWin;
      predictionText = prediction.analysis;
    } catch {
      homeScore = Math.floor(Math.random() * 3);
      awayScore = Math.floor(Math.random() * 3);
    }
  }

  // In knockout, if draw, add extra time / penalties
  let winner: string;
  if (homeScore > awayScore) {
    winner = homeTeam;
  } else if (awayScore > homeScore) {
    winner = awayTeam;
  } else {
    // Simulate penalties — random winner
    winner = Math.random() > 0.5 ? homeTeam : awayTeam;
    predictionText += ` (Empate, ${winner} gana en penales)`;
  }

  return {
    id: matchId,
    round: 'knockout',
    roundLabel,
    homeTeam,
    awayTeam,
    homeFlag: getTeamFlagFn(homeTeam),
    awayFlag: getTeamFlagFn(awayTeam),
    homeScore,
    awayScore,
    winner,
    isPlayed: played,
    homeWinProb,
    drawProb,
    awayWinProb,
    prediction: predictionText,
  };
}

// ─── Main Simulation ──────────────────────────────────────────────────────

export async function simulateTournament(): Promise<TournamentBracket> {
  // 1. Simulate group stage
  const standings = await simulateGroupStage();

  // 2. Get group standings objects
  const groupStandings: GroupStandings[] = [];
  for (const group of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']) {
    const teams = standings.get(group) || [];
    groupStandings.push({
      group,
      teams: sortGroupStandings(teams),
    });
  }

  // 3. Get best 3rd place teams
  const thirdPlaceTeams = getBestThirdPlaceTeams(standings);

  // 4. Simulate Round of 32
  const winners = new Map<string, string>();
  const roundOf32: SimulatedMatch[] = [];

  for (const matchup of R32_MATCHUPS) {
    const homeTeam = resolveTeam(matchup.homeSource, standings, winners, thirdPlaceTeams);
    const awayTeam = resolveTeam(matchup.awaySource, standings, winners, thirdPlaceTeams);

    const match = await simulateKnockoutMatch(homeTeam, awayTeam, matchup.roundLabel, matchup.id);
    roundOf32.push(match);

    if (match.winner !== 'TBD') {
      winners.set(`W-${matchup.id}`, match.winner);
    }
  }

  // 5. Simulate Round of 16
  const roundOf16: SimulatedMatch[] = [];
  for (const matchup of R16_MATCHUPS) {
    const homeTeam = resolveTeam(matchup.homeSource, standings, winners, thirdPlaceTeams);
    const awayTeam = resolveTeam(matchup.awaySource, standings, winners, thirdPlaceTeams);

    const match = await simulateKnockoutMatch(homeTeam, awayTeam, matchup.roundLabel, matchup.id);
    roundOf16.push(match);

    if (match.winner !== 'TBD') {
      winners.set(`W-${matchup.id}`, match.winner);
    }
  }

  // 6. Simulate Quarter-finals
  const quarters: SimulatedMatch[] = [];
  for (const matchup of QUARTER_MATCHUPS) {
    const homeTeam = resolveTeam(matchup.homeSource, standings, winners, thirdPlaceTeams);
    const awayTeam = resolveTeam(matchup.awaySource, standings, winners, thirdPlaceTeams);

    const match = await simulateKnockoutMatch(homeTeam, awayTeam, matchup.roundLabel, matchup.id);
    quarters.push(match);

    if (match.winner !== 'TBD') {
      winners.set(`W-${matchup.id}`, match.winner);
    }
  }

  // 7. Simulate Semi-finals
  const semis: SimulatedMatch[] = [];
  for (const matchup of SEMI_MATCHUPS) {
    const homeTeam = resolveTeam(matchup.homeSource, standings, winners, thirdPlaceTeams);
    const awayTeam = resolveTeam(matchup.awaySource, standings, winners, thirdPlaceTeams);

    const match = await simulateKnockoutMatch(homeTeam, awayTeam, matchup.roundLabel, matchup.id);
    semis.push(match);

    if (match.winner !== 'TBD') {
      winners.set(`W-${matchup.id}`, match.winner);
    }
  }

  // 8. Third place match
  const semiLosers = semis.map((m) => (m.winner === m.homeTeam ? m.awayTeam : m.homeTeam));
  const thirdPlaceMatch = await simulateKnockoutMatch(
    semiLosers[0] || 'TBD',
    semiLosers[1] || 'TBD',
    'Tercer Puesto',
    'TP-1'
  );

  // 9. Final
  const final = await simulateKnockoutMatch(
    semis[0]?.winner || 'TBD',
    semis[1]?.winner || 'TBD',
    'La Gran Final',
    'FINAL'
  );

  const champion = final.winner;
  const runnerUp = final.winner === final.homeTeam ? final.awayTeam : final.homeTeam;
  const thirdPlaceTeam = thirdPlaceMatch.winner;
  const fourthPlaceTeam = thirdPlaceMatch.winner === thirdPlaceMatch.homeTeam
    ? thirdPlaceMatch.awayTeam
    : thirdPlaceMatch.homeTeam;

  return {
    groups: groupStandings,
    roundOf32,
    roundOf16,
    quarters,
    semis,
    thirdPlace: thirdPlaceMatch,
    final,
    champion,
    championFlag: getTeamFlagFn(champion),
    runnerUp,
    runnerUpFlag: getTeamFlagFn(runnerUp),
    thirdPlaceTeam,
    thirdPlaceFlag: getTeamFlagFn(thirdPlaceTeam),
    fourthPlaceTeam,
    fourthPlaceFlag: getTeamFlagFn(fourthPlaceTeam),
    simulatedAt: new Date().toISOString(),
  };
}
