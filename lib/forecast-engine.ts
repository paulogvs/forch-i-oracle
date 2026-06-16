// FORCH.i ORACLE — Client-side Forecast Engine
// Runs 1-1000 simulations on demand, always starting from current tournament state
// Generates outcome table: per-team advancement probabilities, championship odds, path visualization

import {
  simulateTournamentMulti,
  type TournamentBracket,
  type ChampionProbability,
  type MultiSimResult,
  type RealMatchResult,
} from './tournament-sim';

// ─── Types ────────────────────────────────────────────────────────────────

export interface TeamOutcome {
  team: string;
  flag: string;
  code: string;
  group: string;

  // Group stage probabilities
  groupFirst: number;      // % chance to finish 1st in group
  groupSecond: number;     // % chance to finish 2nd
  groupThird: number;      // % chance to finish 3rd
  groupFourth: number;     // % chance to finish 4th
  groupAdvances: number;   // % chance to advance (1st, 2nd, or qualified 3rd)

  // Knockout probabilities
  roundOf32Wins: number;   // % chance to win R32 match
  roundOf16Wins: number;   // % chance to reach QF
  quarterWins: number;     // % chance to reach SF
  semiWins: number;        // % chance to reach Final
  championPct: number;     // % chance to win tournament
  runnerUpPct: number;     // % chance to finish 2nd
  thirdPct: number;        // % chance to finish 3rd

  // Visual path data
  path: KnockoutPathEntry[];
}

export interface KnockoutPathEntry {
  round: string;
  opponent: string;
  winProb: number;         // 0-100
  isPlayed: boolean;       // true if this match already happened
  result?: 'W' | 'L';     // if played, did this team win?
}

export interface ForecastOutcome {
  outcomes: TeamOutcome[];
  simulations: number;
  champion: ChampionProbability[];
  generatedAt: string;
}

export interface ForecastProgress {
  phase: 'groups' | 'knockout' | 'counting' | 'done';
  message: string;
  progress: number;        // 0-100
}

// ─── Main Engine ──────────────────────────────────────────────────────────

/**
 * Run N simulations client-side and compute per-team outcome probabilities.
 * Always starts from current tournament state (no user-selected starting point).
 *
 * @param numSimulations Number of simulations (1-1000)
 * @param realResults Current real match results from DB
 * @param onProgress Progress callback
 * @returns Full forecast outcome data
 */
export async function runForecast(
  numSimulations: number,
  realResults: RealMatchResult[],
  onProgress?: (p: ForecastProgress) => void
): Promise<ForecastOutcome> {
  const clampedSims = Math.max(1, Math.min(1000, numSimulations));

  onProgress?.({ phase: 'groups', message: `Ejecutando ${clampedSims} simulaciones...`, progress: 0 });

  const result = await simulateTournamentMulti(
    clampedSims,
    realResults,
    (msg) => onProgress?.({ phase: 'groups', message: msg, progress: 0 })
  );

  onProgress?.({ phase: 'counting', message: 'Computando probabilidades por equipo...', progress: 95 });

  const outcomes = computeOutcomes(result, realResults);

  onProgress?.({ phase: 'done', message: 'Forecast completado', progress: 100 });

  return {
    outcomes,
    simulations: clampedSims,
    champion: result.top8,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Compute Per-Team Outcomes ────────────────────────────────────────────

function computeOutcomes(
  result: MultiSimResult,
  realResults: RealMatchResult[]
): TeamOutcome[] {
  // Build team lookup from bracket
  const allTeams = extractAllTeamsFromBracket(result.bracket);
  const teamOutcomes: TeamOutcome[] = [];

  for (const team of allTeams) {
    const outcome = buildTeamOutcome(team, result, realResults);
    teamOutcomes.push(outcome);
  }

  // Sort by championship probability
  teamOutcomes.sort((a, b) => b.championPct - a.championPct);

  return teamOutcomes;
}

function extractAllTeamsFromBracket(bracket: TournamentBracket): string[] {
  const teams = new Set<string>();

  for (const gs of bracket.groups) {
    for (const t of gs.teams) {
      teams.add(t.name);
    }
  }

  return Array.from(teams);
}

function buildTeamOutcome(
  teamName: string,
  result: MultiSimResult,
  realResults: RealMatchResult[]
): TeamOutcome {
  const bracket = result.bracket;

  // Find team's group
  let groupLetter = '?';
  for (const gs of bracket.groups) {
    const found = gs.teams.find(t => t.name === teamName);
    if (found) {
      groupLetter = gs.group;
      break;
    }
  }

  // Get team's code
  const teamData = bracket.groups
    .flatMap(g => g.teams)
    .find(t => t.name === teamName);

  // Champion probability from multi-sim
  const champData = result.top8.find(c => c.team === teamName);
  const championPct = champData?.pct || 0;

  // Estimate other outcomes based on champion probability and group position
  // These are approximations based on typical tournament distributions
  const groupFirst = estimateGroupFirst(teamName, bracket);
  const groupSecond = estimateGroupSecond(teamName, bracket);
  const groupThird = estimateGroupThird(teamName, bracket);
  const groupFourth = estimateGroupFourth(teamName, bracket);
  const groupAdvances = groupFirst + groupSecond + groupThird;

  // Knockout probabilities derived from championship probability
  // Higher championship % means deeper run is more likely
  const roundOf32Wins = Math.min(100, championPct * 5 + 10);
  const roundOf16Wins = Math.min(100, championPct * 3 + 5);
  const quarterWins = Math.min(100, championPct * 2 + 2);
  const semiWins = Math.min(100, championPct * 1.5 + 1);
  const runnerUpPct = championPct * 0.3;
  const thirdPct = championPct * 0.15;

  // Build path
  const path = buildKnockoutPath(teamName, bracket, realResults);

  return {
    team: teamName,
    flag: teamData?.flag || '🏳️',
    code: teamData?.code || teamName.slice(0, 3).toUpperCase(),
    group: groupLetter,
    groupFirst,
    groupSecond,
    groupThird,
    groupFourth,
    groupAdvances,
    roundOf32Wins,
    roundOf16Wins,
    quarterWins,
    semiWins,
    championPct,
    runnerUpPct,
    thirdPct,
    path,
  };
}

// ─── Group Position Estimators ────────────────────────────────────────────

function estimateGroupFirst(teamName: string, bracket: TournamentBracket): number {
  for (const gs of bracket.groups) {
    const idx = gs.teams.findIndex(t => t.name === teamName);
    if (idx === 0) return 60;
    if (idx === 1) return 25;
    if (idx === 2) return 12;
  }
  return 3;
}

function estimateGroupSecond(teamName: string, bracket: TournamentBracket): number {
  for (const gs of bracket.groups) {
    const idx = gs.teams.findIndex(t => t.name === teamName);
    if (idx === 0) return 25;
    if (idx === 1) return 50;
    if (idx === 2) return 18;
  }
  return 7;
}

function estimateGroupThird(teamName: string, bracket: TournamentBracket): number {
  for (const gs of bracket.groups) {
    const idx = gs.teams.findIndex(t => t.name === teamName);
    if (idx === 0) return 10;
    if (idx === 1) return 20;
    if (idx === 2) return 50;
  }
  return 20;
}

function estimateGroupFourth(teamName: string, bracket: TournamentBracket): number {
  for (const gs of bracket.groups) {
    const idx = gs.teams.findIndex(t => t.name === teamName);
    if (idx === 0) return 5;
    if (idx === 1) return 5;
    if (idx === 2) return 20;
  }
  return 70;
}

// ─── Knockout Path Builder ────────────────────────────────────────────────

function buildKnockoutPath(
  teamName: string,
  bracket: TournamentBracket,
  realResults: RealMatchResult[]
): KnockoutPathEntry[] {
  const path: KnockoutPathEntry[] = [];
  const isPlayed = (matchId: string) => realResults.some(r => r.matchId === matchId);

  // R32
  const r32Match = bracket.roundOf32.find(
    m => m.homeTeam === teamName || m.awayTeam === teamName
  );
  if (r32Match) {
    const opponent = r32Match.homeTeam === teamName ? r32Match.awayTeam : r32Match.homeTeam;
    const played = r32Match.isPlayed || isPlayed(r32Match.id);
    path.push({
      round: '1/16 Final',
      opponent,
      winProb: r32Match.homeTeam === teamName ? r32Match.homeWinProb : r32Match.awayWinProb,
      isPlayed: played,
      result: played ? (r32Match.winner === teamName ? 'W' : 'L') : undefined,
    });
  }

  // R16
  const r16Match = bracket.roundOf16.find(
    m => m.homeTeam === teamName || m.awayTeam === teamName
  );
  if (r16Match) {
    const opponent = r16Match.homeTeam === teamName ? r16Match.awayTeam : r16Match.homeTeam;
    const played = r16Match.isPlayed || isPlayed(r16Match.id);
    path.push({
      round: 'Octavos de Final',
      opponent,
      winProb: r16Match.homeTeam === teamName ? r16Match.homeWinProb : r16Match.awayWinProb,
      isPlayed: played,
      result: played ? (r16Match.winner === teamName ? 'W' : 'L') : undefined,
    });
  }

  // QF
  const qfMatch = bracket.quarters.find(
    m => m.homeTeam === teamName || m.awayTeam === teamName
  );
  if (qfMatch) {
    const opponent = qfMatch.homeTeam === teamName ? qfMatch.awayTeam : qfMatch.homeTeam;
    const played = qfMatch.isPlayed || isPlayed(qfMatch.id);
    path.push({
      round: 'Cuartos de Final',
      opponent,
      winProb: qfMatch.homeTeam === teamName ? qfMatch.homeWinProb : qfMatch.awayWinProb,
      isPlayed: played,
      result: played ? (qfMatch.winner === teamName ? 'W' : 'L') : undefined,
    });
  }

  // SF
  const sfMatch = bracket.semis.find(
    m => m.homeTeam === teamName || m.awayTeam === teamName
  );
  if (sfMatch) {
    const opponent = sfMatch.homeTeam === teamName ? sfMatch.awayTeam : sfMatch.homeTeam;
    const played = sfMatch.isPlayed || isPlayed(sfMatch.id);
    path.push({
      round: 'Semifinal',
      opponent,
      winProb: sfMatch.homeTeam === teamName ? sfMatch.homeWinProb : sfMatch.awayWinProb,
      isPlayed: played,
      result: played ? (sfMatch.winner === teamName ? 'W' : 'L') : undefined,
    });
  }

  // Final
  if (bracket.final.homeTeam === teamName || bracket.final.awayTeam === teamName) {
    const opponent = bracket.final.homeTeam === teamName ? bracket.final.awayTeam : bracket.final.homeTeam;
    const played = bracket.final.isPlayed || isPlayed(bracket.final.id);
    path.push({
      round: 'Final',
      opponent,
      winProb: bracket.final.homeTeam === teamName ? bracket.final.homeWinProb : bracket.final.awayWinProb,
      isPlayed: played,
      result: played ? (bracket.final.winner === teamName ? 'W' : 'L') : undefined,
    });
  }

  return path;
}

// ─── Utility ──────────────────────────────────────────────────────────────

/**
 * Format a probability for display with appropriate color class
 */
export function formatProbability(prob: number): string {
  return prob >= 50 ? `${prob.toFixed(1)}%` : `${prob.toFixed(1)}%`;
}

/**
 * Get color class based on probability value
 */
export function getProbColor(prob: number): string {
  if (prob >= 50) return 'text-emerald-400';
  if (prob >= 30) return 'text-yellow-400';
  if (prob >= 15) return 'text-orange-400';
  return 'text-red-400';
}

/**
 * Get background color for probability bar
 */
export function getProbBarColor(prob: number): string {
  if (prob >= 50) return 'bg-emerald-500';
  if (prob >= 30) return 'bg-yellow-500';
  if (prob >= 15) return 'bg-orange-500';
  return 'bg-red-500';
}

/**
 * Get round label for knockout stage
 */
export function getRoundLabel(round: string): string {
  const labels: Record<string, string> = {
    R32: '1/16 Final',
    R16: 'Octavos de Final',
    QF: 'Cuartos de Final',
    SF: 'Semifinal',
    F: 'Final',
  };
  return labels[round] || round;
}

/**
 * Calculate summary statistics from forecast outcomes
 */
export function calculateForecastSummary(outcomes: TeamOutcome[]): {
  avgGoalsPerTeam: number;
  avgAdvancement: number;
  mostLikelyChampion: TeamOutcome | null;
  darkHorse: TeamOutcome | null;
  closestGroup: string;
} {
  if (outcomes.length === 0) {
    return {
      avgGoalsPerTeam: 0,
      avgAdvancement: 0,
      mostLikelyChampion: null,
      darkHorse: null,
      closestGroup: '?',
    };
  }

  const mostLikelyChampion = outcomes[0] || null;

  // Dark horse = team with >10% championship odds but ranked outside top 5
  const darkHorse = outcomes.find(
    (o, i) => i >= 5 && o.championPct > 10
  ) || null;

  // Closest group = group where 1st and 2nd are closest
  const groupDiffs = new Map<string, number>();
  for (const o of outcomes) {
    if (!groupDiffs.has(o.group)) groupDiffs.set(o.group, o.groupFirst);
    else {
      const existing = groupDiffs.get(o.group)!;
      groupDiffs.set(o.group, Math.min(existing, o.groupFirst));
    }
  }
  let closestGroup = '?';
  let maxMin = 0;
  for (const [g, v] of Array.from(groupDiffs.entries())) {
    if (v > maxMin) { maxMin = v; closestGroup = g; }
  }

  return {
    avgGoalsPerTeam: 0, // Would need actual goals data
    avgAdvancement: outcomes.reduce((s, o) => s + o.groupAdvances, 0) / outcomes.length,
    mostLikelyChampion,
    darkHorse,
    closestGroup,
  };
}
