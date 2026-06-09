// FORCH.i ORACLE — Fast Tournament Simulation Engine
// Uses a single AI call for group standings + Groq predictions for key knockout matches

import { WORLD_CUP_TEAMS } from './teams';
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
  isPlayed: boolean;
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

// ─── Team Power Ratings (deterministic — no API calls needed) ─────────────

// Power rating 0-100 based on FIFA rankings, recent form, historical performance
// Updated for WC2026 context
const POWER_RATINGS: Record<string, number> = {
  // Top tier (85+)
  'Francia': 92, 'Brasil': 91, 'Argentina': 91, 'Inglaterra': 89, 'España': 88,
  'Alemania': 87, 'Portugal': 87,
  // Strong tier (78-84)
  'Países Bajos': 84, 'Bélgica': 83, 'Croacia': 82, 'Italia': 82,
  'Uruguay': 81, 'Colombia': 80, 'Marruecos': 80,
  // Good tier (72-77)
  'Dinamarca': 77, 'Suiza': 76, 'Austria': 75, 'Senegal': 75, 'México': 74,
  'Estados Unidos': 74, 'Japón': 74, 'Nigeria': 73, 'Corea del Sur': 73,
  'Ecuador': 73, 'Serbia': 72, 'Turquía': 72,
  // Decent tier (65-71)
  'Irán': 71, 'Escocia': 70, 'Ucrania': 70, 'Canadá': 70, 'República Checa': 70,
  'Hungría': 69, 'Suecia': 69, 'Cameroon': 69, 'Australia': 68,
  'Arabia Saudita': 67, 'Túnez': 67, 'Ghana': 67, 'Egipto': 67,
  // Lower tier (55-64)
  'Noruega': 65, 'Costa Rica': 65, 'Camerún': 65, 'Costa de Marfil': 65,
  'Bosnia y Herzegovina': 64, 'Paraguay': 64, 'Argelia': 64,
  'Sudáfrica': 63, 'Qatar': 62, 'Irak': 62, 'Uzbekistán': 61,
  // Emerging (50-59)
  'Jamaica': 60, 'Panamá': 59, 'Jordania': 59, 'Nueva Zelanda': 57,
  'Haití': 56, 'Curazao': 55, 'Cabo Verde': 55, 'RD Congo': 54,
};

function getPowerRating(teamName: string): number {
  return POWER_RATINGS[teamName] || 50; // default for unlisted teams
}

function getTeamFlag(name: string): string {
  const team = WORLD_CUP_TEAMS.find((t) => t.name.toLowerCase() === name.toLowerCase());
  return team?.flag || '🏳️';
}

// ─── Seeded Random (deterministic per run) ────────────────────────────────

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const SEED = Date.now();

// ─── Match simulation (uses power ratings — no API call) ──────────────────

function simulateMatch(homeTeam: string, awayTeam: string): { homeScore: number; awayScore: number; winner: string; homeWinProb: number; drawProb: number; awayWinProb: number } {
  const rand = seededRandom(SEED + homeTeam.length * 1000 + awayTeam.length * 100);

  const homePower = getPowerRating(homeTeam) + 5; // home advantage
  const awayPower = getPowerRating(awayTeam);
  const diff = homePower - awayPower;

  // Convert power diff to probabilities (logistic function)
  const homeWinProb = Math.min(90, Math.max(10, Math.round(50 + diff * 2)));
  const drawProb = Math.round(15 + (1 - Math.abs(diff) / 40) * 15);
  const awayWinProb = 100 - homeWinProb - drawProb;

  // Determine winner based on probabilities
  const r = rand() * 100;
  let winner: string;
  let homeScore: number;
  let awayScore: number;

  if (r < homeWinProb) {
    winner = homeTeam;
    homeScore = Math.floor(rand() * 3) + 1;
    awayScore = Math.floor(rand() * 2);
  } else if (r < homeWinProb + drawProb) {
    winner = 'draw';
    homeScore = Math.floor(rand() * 3);
    awayScore = homeScore;
  } else {
    winner = awayTeam;
    awayScore = Math.floor(rand() * 3) + 1;
    homeScore = Math.floor(rand() * 2);
  }

  return { homeScore, awayScore, winner, homeWinProb, drawProb, awayWinProb: Math.max(0, awayWinProb) };
}

// ─── Group Stage ──────────────────────────────────────────────────────────

function getGroups(): string[][] {
  const groupMap: Record<string, string[]> = {};
  for (const team of WORLD_CUP_TEAMS) {
    if (!groupMap[team.group]) groupMap[team.group] = [];
    groupMap[team.group].push(team.name);
  }
  return Object.entries(groupMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, teams]) => teams);
}

function simulateGroupStage(): Map<string, GroupTeamStanding[]> {
  const groups = getGroups();
  const standings = new Map<string, GroupTeamStanding[]>();

  for (const groupTeams of groups) {
    const groupLetter = WORLD_CUP_TEAMS.find((t) => t.name === groupTeams[0])?.group || 'A';

    // Initialize standings
    const groupStandings: GroupTeamStanding[] = groupTeams.map((name) => ({
      name,
      flag: getTeamFlag(name),
      code: WORLD_CUP_TEAMS.find((t) => t.name === name)?.code || name.substring(0, 3).toUpperCase(),
      played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0,
    }));

    // Each team plays every other team once (6 matches per group of 4)
    const matchPairs: [number, number][] = [];
    for (let i = 0; i < groupTeams.length; i++) {
      for (let j = i + 1; j < groupTeams.length; j++) {
        matchPairs.push([i, j]);
      }
    }

    for (const [homeIdx, awayIdx] of matchPairs) {
      const home = groupTeams[homeIdx];
      const away = groupTeams[awayIdx];
      const result = simulateMatch(home, away);

      const homeTeam = groupStandings[homeIdx];
      const awayTeam = groupStandings[awayIdx];

      homeTeam.played++;
      awayTeam.played++;
      homeTeam.goalsFor += result.homeScore;
      homeTeam.goalsAgainst += result.awayScore;
      awayTeam.goalsFor += result.awayScore;
      awayTeam.goalsAgainst += result.homeScore;
      homeTeam.goalDiff = homeTeam.goalsFor - homeTeam.goalsAgainst;
      awayTeam.goalDiff = awayTeam.goalsFor - awayTeam.goalsAgainst;

      if (result.winner === 'draw') {
        homeTeam.drawn++;
        awayTeam.drawn++;
        homeTeam.points += 1;
        awayTeam.points += 1;
      } else if (result.winner === home) {
        homeTeam.won++;
        awayTeam.lost++;
        homeTeam.points += 3;
      } else {
        awayTeam.won++;
        homeTeam.lost++;
        awayTeam.points += 3;
      }
    }

    // Sort by points, goal diff, goals for
    groupStandings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return 0;
    });

    standings.set(groupLetter, groupStandings);
  }

  return standings;
}

// ─── Knockout simulation with Groq for key matches ────────────────────────

async function simulateKnockoutMatch(
  homeTeam: string,
  awayTeam: string,
  roundLabel: string,
  matchId: string,
  useGroq = true
): Promise<SimulatedMatch> {
  if (homeTeam === 'TBD' || awayTeam === 'TBD') {
    return {
      id: matchId, round: 'knockout', roundLabel,
      homeTeam, awayTeam,
      homeFlag: '🏳️', awayFlag: '🏳️',
      homeScore: 0, awayScore: 0, winner: 'TBD', isPlayed: false,
    };
  }

  const cached = getCachedPrediction(homeTeam, awayTeam);

  if (cached && useGroq) {
    return {
      id: matchId, round: 'knockout', roundLabel,
      homeTeam, awayTeam,
      homeFlag: getTeamFlag(homeTeam), awayFlag: getTeamFlag(awayTeam),
      homeScore: cached.predictedScoreHome, awayScore: cached.predictedScoreAway,
      winner: cached.predictedScoreHome > cached.predictedScoreAway ? homeTeam :
              cached.predictedScoreAway > cached.predictedScoreHome ? awayTeam :
              (Math.random() > 0.5 ? homeTeam : awayTeam),
      isPlayed: false,
      homeWinProb: cached.homeWin, drawProb: cached.draw, awayWinProb: cached.awayWin,
      prediction: cached.analysis,
    };
  }

  // Fallback: power rating simulation
  const result = simulateMatch(homeTeam, awayTeam);
  let winner = result.winner === 'draw' ? (Math.random() > 0.5 ? homeTeam : awayTeam) : result.winner;
  let homeScore = result.homeScore;
  let awayScore = result.awayScore;

  // Extra time / penalties for knockout draws
  if (result.winner === 'draw') {
    const winnerScore = Math.floor(Math.random() * 2) + 1;
    const loserScore = Math.floor(Math.random() * 1);
    if (winner === homeTeam) {
      homeScore = winnerScore;
      awayScore = loserScore;
    } else {
      awayScore = winnerScore;
      homeScore = loserScore;
    }
  }

  const homeFlag = getTeamFlag(homeTeam);
  const awayFlag = getTeamFlag(awayTeam);

  return {
    id: matchId, round: 'knockout', roundLabel,
    homeTeam, awayTeam, homeFlag, awayFlag,
    homeScore, awayScore, winner, isPlayed: false,
    homeWinProb: result.homeWinProb,
    drawProb: result.drawProb,
    awayWinProb: result.awayWinProb,
    prediction: `${homeFlag} ${homeTeam} vs ${awayTeam} ${awayFlag}. Predicción basada en análisis de potencia. ${homeTeam} (${getPowerRating(homeTeam)}) vs ${awayTeam} (${getPowerRating(awayTeam)}).`,
  };
}

// ─── Run Groq prediction for a match (parallel-friendly) ──────────────────

async function getGroqPrediction(
  homeTeam: string,
  awayTeam: string,
  roundLabel: string
): Promise<{ homeScore: number; awayScore: number; homeWinProb: number; drawProb: number; awayWinProb: number; analysis: string } | null> {
  const cached = getCachedPrediction(homeTeam, awayTeam);
  if (cached) return { homeScore: cached.predictedScoreHome, awayScore: cached.predictedScoreAway, homeWinProb: cached.homeWin, drawProb: cached.draw, awayWinProb: cached.awayWin, analysis: cached.analysis };

  try {
    const contextData = `Partido de ${roundLabel} del Mundial FIFA 2026. ${homeTeam} vs ${awayTeam}.`;
    const prediction = await getPrediction(homeTeam, awayTeam, contextData, null);
    setCachedPrediction(homeTeam, awayTeam, prediction);
    return {
      homeScore: prediction.predictedScoreHome,
      awayScore: prediction.predictedScoreAway,
      homeWinProb: prediction.homeWin,
      drawProb: prediction.draw,
      awayWinProb: prediction.awayWin,
      analysis: prediction.analysis,
    };
  } catch {
    return null;
  }
}

// ─── Tournament Bracket ───────────────────────────────────────────────────

export async function simulateTournament(): Promise<TournamentBracket> {
  // Phase 1: Simulate group stage (fast — no API calls)
  const standings = simulateGroupStage();

  // Build group standings objects
  const groupStandings: GroupStandings[] = [];
  const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  for (const letter of groupLetters) {
    const teams = standings.get(letter) || [];
    groupStandings.push({ group: letter, teams });
  }

  // Get best 3rd place teams
  const thirdPlaceEntries: { name: string; points: number; goalDiff: number; goalsFor: number; group: string }[] = [];
  for (const letter of groupLetters) {
    const teams = standings.get(letter) || [];
    if (teams.length >= 3) {
      const third = teams[2];
      thirdPlaceEntries.push({ name: third.name, points: third.points, goalDiff: third.goalDiff, goalsFor: third.goalsFor, group: letter });
    }
  }
  thirdPlaceEntries.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    return b.goalsFor - a.goalsFor;
  });

  // Resolve teams from group positions
  const winners = new Map<string, string>();

  function resolveTeam(source: string): string {
    if (source.startsWith('W-')) {
      return winners.get(source) || 'TBD';
    }
    // "1A", "2B", "3rd" (best 3rd)
    const pos = parseInt(source[0]);
    const groupLetter = source[1];
    if (pos === 3) return thirdPlaceEntries[0]?.name || 'TBD';
    const groupTeams = standings.get(groupLetter);
    if (!groupTeams || !groupTeams[pos - 1]) return 'TBD';
    return groupTeams[pos - 1].name;
  }

  // Phase 2: Simulate knockout
  // R32: 12 group winners vs best 8 third-place + 12 runners-up
  // Simplified: we simulate 16 Round of 32 matches (12 1st vs 3rd, 4 2nd vs 2nd)
  const r32Matchups = [
    { id: 'R32-1', homeSource: '1A', awaySource: '3rd' },
    { id: 'R32-2', homeSource: '2A', awaySource: '2B' },
    { id: 'R32-3', homeSource: '1B', awaySource: '3rd' },
    { id: 'R32-4', homeSource: '1C', awaySource: '3rd' },
    { id: 'R32-5', homeSource: '2C', awaySource: '2D' },
    { id: 'R32-6', homeSource: '1D', awaySource: '3rd' },
    { id: 'R32-7', homeSource: '1E', awaySource: '3rd' },
    { id: 'R32-8', homeSource: '2E', awaySource: '2F' },
    { id: 'R32-9', homeSource: '1F', awaySource: '3rd' },
    { id: 'R32-10', homeSource: '1G', awaySource: '3rd' },
    { id: 'R32-11', homeSource: '2G', awaySource: '2H' },
    { id: 'R32-12', homeSource: '1H', awaySource: '3rd' },
    { id: 'R32-13', homeSource: '1I', awaySource: '3rd' },
    { id: 'R32-14', homeSource: '2I', awaySource: '2J' },
    { id: 'R32-15', homeSource: '1J', awaySource: '3rd' },
    { id: 'R32-16', homeSource: '1K', awaySource: '3rd' },
  ];

  const roundOf32: SimulatedMatch[] = [];
  for (const m of r32Matchups) {
    const home = resolveTeam(m.homeSource);
    const away = resolveTeam(m.awaySource);
    const match = await simulateKnockoutMatch(home, away, '1/16 Final', m.id, false);
    roundOf32.push(match);
    if (match.winner !== 'TBD') winners.set(`W-${m.id}`, match.winner);
  }

  // R16: Use Groq for all 8 matches (parallel)
  const r16Matchups = [
    { id: 'R16-1', homeSource: 'W-R32-1', awaySource: 'W-R32-2' },
    { id: 'R16-2', homeSource: 'W-R32-3', awaySource: 'W-R32-4' },
    { id: 'R16-3', homeSource: 'W-R32-5', awaySource: 'W-R32-6' },
    { id: 'R16-4', homeSource: 'W-R32-7', awaySource: 'W-R32-8' },
    { id: 'R16-5', homeSource: 'W-R32-9', awaySource: 'W-R32-10' },
    { id: 'R16-6', homeSource: 'W-R32-11', awaySource: 'W-R32-12' },
    { id: 'R16-7', homeSource: 'W-R32-13', awaySource: 'W-R32-14' },
    { id: 'R16-8', homeSource: 'W-R32-15', awaySource: 'W-R32-16' },
  ];

  // Parallel Groq calls for R16
  const r16Promises = r16Matchups.map(async (m) => {
    const home = resolveTeam(m.homeSource);
    const away = resolveTeam(m.awaySource);
    if (home === 'TBD' || away === 'TBD') return { match: await simulateKnockoutMatch(home, away, 'Octavos de Final', m.id, false), matchup: m };
    const groq = await getGroqPrediction(home, away, 'Octavos de Final');
    if (groq) {
      const homeScore = groq.homeScore;
      const awayScore = groq.awayScore;
      const winner = homeScore > awayScore ? home : awayScore > homeScore ? away : (Math.random() > 0.5 ? home : away);
      const match: SimulatedMatch = {
        id: m.id, round: 'knockout', roundLabel: 'Octavos de Final',
        homeTeam: home, awayTeam: away,
        homeFlag: getTeamFlag(home), awayFlag: getTeamFlag(away),
        homeScore, awayScore, winner, isPlayed: false,
        homeWinProb: groq.homeWinProb, drawProb: groq.drawProb, awayWinProb: groq.awayWinProb,
        prediction: groq.analysis,
      };
      return { match, matchup: m };
    }
    return { match: await simulateKnockoutMatch(home, away, 'Octavos de Final', m.id, false), matchup: m };
  });

  const r16Results = await Promise.all(r16Promises);
  const roundOf16: SimulatedMatch[] = [];
  for (const { match, matchup } of r16Results) {
    roundOf16.push(match);
    if (match.winner !== 'TBD') winners.set(`W-${matchup.id}`, match.winner);
  }

  // Quarters: parallel Groq
  const qfMatchups = [
    { id: 'QF-1', homeSource: 'W-R16-1', awaySource: 'W-R16-2' },
    { id: 'QF-2', homeSource: 'W-R16-3', awaySource: 'W-R16-4' },
    { id: 'QF-3', homeSource: 'W-R16-5', awaySource: 'W-R16-6' },
    { id: 'QF-4', homeSource: 'W-R16-7', awaySource: 'W-R16-8' },
  ];

  const qfPromises = qfMatchups.map(async (m) => {
    const home = resolveTeam(m.homeSource);
    const away = resolveTeam(m.awaySource);
    if (home === 'TBD' || away === 'TBD') return { match: await simulateKnockoutMatch(home, away, 'Cuartos de Final', m.id, false), matchup: m };
    const groq = await getGroqPrediction(home, away, 'Cuartos de Final');
    if (groq) {
      const homeScore = groq.homeScore;
      const awayScore = groq.awayScore;
      const winner = homeScore > awayScore ? home : awayScore > homeScore ? away : (Math.random() > 0.5 ? home : away);
      const match: SimulatedMatch = {
        id: m.id, round: 'knockout', roundLabel: 'Cuartos de Final',
        homeTeam: home, awayTeam: away,
        homeFlag: getTeamFlag(home), awayFlag: getTeamFlag(away),
        homeScore, awayScore, winner, isPlayed: false,
        homeWinProb: groq.homeWinProb, drawProb: groq.drawProb, awayWinProb: groq.awayWinProb,
        prediction: groq.analysis,
      };
      return { match, matchup: m };
    }
    return { match: await simulateKnockoutMatch(home, away, 'Cuartos de Final', m.id, false), matchup: m };
  });

  const qfResults = await Promise.all(qfPromises);
  const quarters: SimulatedMatch[] = [];
  for (const { match, matchup } of qfResults) {
    quarters.push(match);
    if (match.winner !== 'TBD') winners.set(`W-${matchup.id}`, match.winner);
  }

  // Semis: parallel Groq
  const sfMatchups = [
    { id: 'SF-1', homeSource: 'W-QF-1', awaySource: 'W-QF-2' },
    { id: 'SF-2', homeSource: 'W-QF-3', awaySource: 'W-QF-4' },
  ];

  const sfPromises = sfMatchups.map(async (m) => {
    const home = resolveTeam(m.homeSource);
    const away = resolveTeam(m.awaySource);
    if (home === 'TBD' || away === 'TBD') return { match: await simulateKnockoutMatch(home, away, 'Semifinales', m.id, false), matchup: m };
    const groq = await getGroqPrediction(home, away, 'Semifinales');
    if (groq) {
      const homeScore = groq.homeScore;
      const awayScore = groq.awayScore;
      const winner = homeScore > awayScore ? home : awayScore > homeScore ? away : (Math.random() > 0.5 ? home : away);
      const match: SimulatedMatch = {
        id: m.id, round: 'knockout', roundLabel: 'Semifinales',
        homeTeam: home, awayTeam: away,
        homeFlag: getTeamFlag(home), awayFlag: getTeamFlag(away),
        homeScore, awayScore, winner, isPlayed: false,
        homeWinProb: groq.homeWinProb, drawProb: groq.drawProb, awayWinProb: groq.awayWinProb,
        prediction: groq.analysis,
      };
      return { match, matchup: m };
    }
    return { match: await simulateKnockoutMatch(home, away, 'Semifinales', m.id, false), matchup: m };
  });

  const sfResults = await Promise.all(sfPromises);
  const semis: SimulatedMatch[] = [];
  for (const { match, matchup } of sfResults) {
    semis.push(match);
    if (match.winner !== 'TBD') winners.set(`W-${matchup.id}`, match.winner);
  }

  // Third place
  const semiLosers = semis.map((m) => (m.winner === m.homeTeam ? m.awayTeam : m.homeTeam));
  const thirdPlaceMatch = await simulateKnockoutMatch(
    semiLosers[0] || 'TBD', semiLosers[1] || 'TBD',
    'Tercer Puesto', 'TP-1', false
  );

  // Final: Groq prediction
  const finalHome = semis[0]?.winner || 'TBD';
  const finalAway = semis[1]?.winner || 'TBD';
  let final: SimulatedMatch;

  if (finalHome !== 'TBD' && finalAway !== 'TBD') {
    const groq = await getGroqPrediction(finalHome, finalAway, 'La Gran Final');
    if (groq) {
      const homeScore = groq.homeScore;
      const awayScore = groq.awayScore;
      const winner = homeScore > awayScore ? finalHome : awayScore > homeScore ? finalAway : (Math.random() > 0.5 ? finalHome : finalAway);
      final = {
        id: 'FINAL', round: 'knockout', roundLabel: 'La Gran Final',
        homeTeam: finalHome, awayTeam: finalAway,
        homeFlag: getTeamFlag(finalHome), awayFlag: getTeamFlag(finalAway),
        homeScore, awayScore, winner, isPlayed: false,
        homeWinProb: groq.homeWinProb, drawProb: groq.drawProb, awayWinProb: groq.awayWinProb,
        prediction: groq.analysis,
      };
    } else {
      final = await simulateKnockoutMatch(finalHome, finalAway, 'La Gran Final', 'FINAL', false);
    }
  } else {
    final = await simulateKnockoutMatch(finalHome, finalAway, 'La Gran Final', 'FINAL', false);
  }

  const champion = final.winner;
  const runnerUp = final.winner === final.homeTeam ? final.awayTeam : final.homeTeam;
  const thirdPlaceTeam = thirdPlaceMatch.winner;
  const fourthPlaceTeam = thirdPlaceMatch.winner === thirdPlaceMatch.homeTeam ? thirdPlaceMatch.awayTeam : thirdPlaceMatch.homeTeam;

  return {
    groups: groupStandings,
    roundOf32, roundOf16, quarters, semis,
    thirdPlace: thirdPlaceMatch,
    final,
    champion, championFlag: getTeamFlag(champion),
    runnerUp, runnerUpFlag: getTeamFlag(runnerUp),
    thirdPlaceTeam, thirdPlaceFlag: getTeamFlag(thirdPlaceTeam),
    fourthPlaceTeam, fourthPlaceFlag: getTeamFlag(fourthPlaceTeam),
    simulatedAt: new Date().toISOString(),
  };
}
