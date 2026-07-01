// FORCH.i ORACLE — Tournament Simulation Engine v3
// FIFA-official tiebreakers + backtracking third-place assignment
// Client-side multi-simulation for forecast page

import { calculateStatisticalPrediction, loadEloOverrides, clearEloOverrides } from './predictor-engine';
import { WORLD_CUP_TEAMS, ELO_RATINGS } from './teams';
import { ALL_MATCHES } from './matches';
import { getDataLayerAsync } from './data-layer';
import type { EloEntry } from './teams';
import { createRNG, samplePoisson as seededSamplePoisson } from './seeded-rng';

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
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  prediction: string;
  xGHome?: number;
  xGAway?: number;
  extraTime?: boolean;
  penalties?: boolean;
  penHome?: number;
  penAway?: number;
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

export interface RealMatchResult {
  matchId: string;
  homeScore: number;
  awayScore: number;
  winner: string;
}

// ─── FIFA Tiebreakers ─────────────────────────────────────────────────────

/**
 * FIFA World Cup tiebreaker procedure:
 * a) Greater number of points obtained in all group matches
 * b) Goal difference in all group matches
 * c) Greater number of goals scored in all group matches
 * d) Greater number of points obtained in matches between the tied teams
 * e) Goal difference in matches between the tied teams
 * f) Greater number of goals scored in matches between the tied teams
 * g) Fair play conduct (not simulated — skip to h)
 * h) Drawing of lots by FIFA
 *
 * We implement a-d fully, e-f via head-to-head mini-table, and fall back to
 * alphabetical for simulation purposes (代替 lot drawing).
 */
function sortGroupWithFIFATiebreakers(
  teams: GroupTeamStanding[],
  matchResults: { home: string; away: string; homeGoals: number; awayGoals: number }[]
): GroupTeamStanding[] {
  if (teams.length <= 1) return [...teams];

  // Build head-to-head results map
  const h2h = new Map<string, { home: string; away: string; hg: number; ag: number }[]>();
  for (const r of matchResults) {
    const key1 = `${r.home}_${r.away}`;
    const key2 = `${r.away}_${r.home}`;
    if (!h2h.has(r.home)) h2h.set(r.home, []);
    if (!h2h.has(r.away)) h2h.set(r.away, []);
    h2h.get(r.home)!.push({ home: r.home, away: r.away, hg: r.homeGoals, ag: r.awayGoals });
    h2h.get(r.away)!.push({ home: r.away, away: r.home, hg: r.awayGoals, ag: r.homeGoals });
  }

  // Recursive tie resolution
  function resolve(
    candidates: GroupTeamStanding[],
    allResults: { home: string; away: string; homeGoals: number; awayGoals: number }[]
  ): GroupTeamStanding[] {
    if (candidates.length <= 1) return [...candidates];

    // FIFA Order: a) Points -> b) GD -> c) GS
    candidates.sort((a, b) =>
      b.points - a.points ||
      b.goalDiff - a.goalDiff ||
      b.goalsFor - a.goalsFor
    );

    const result: GroupTeamStanding[] = [];
    let i = 0;

    while (i < candidates.length) {
      let j = i + 1;
      while (j < candidates.length &&
             candidates[j].points === candidates[i].points &&
             candidates[j].goalDiff === candidates[i].goalDiff &&
             candidates[j].goalsFor === candidates[i].goalsFor) j++;

      if (j - i === 1) {
        result.push(candidates[i]);
      } else {
        const tied = candidates.slice(i, j);
        result.push(...resolveTieGroup(tied, allResults));
      }
      i = j;
    }

    return result;
  }

  function resolveTieGroup(
    tied: GroupTeamStanding[],
    allResults: { home: string; away: string; homeGoals: number; awayGoals: number }[]
  ): GroupTeamStanding[] {
    if (tied.length <= 1) return [...tied];

    // Step d: head-to-head points among tied teams
    const tiedNames = new Set(tied.map(t => t.name));
    const h2hResults = allResults.filter(
      r => tiedNames.has(r.home) && tiedNames.has(r.away)
    );

    if (h2hResults.length > 0) {
      // Build mini-table from head-to-head only
      const miniTable = new Map<string, { pts: number; gd: number; gf: number }>();
      for (const t of tied) {
        miniTable.set(t.name, { pts: 0, gd: 0, gf: 0 });
      }

      for (const r of h2hResults) {
        const h = miniTable.get(r.home)!;
        const a = miniTable.get(r.away)!;
        h.gf += r.homeGoals;
        h.gd += r.homeGoals - r.awayGoals;
        a.gf += r.awayGoals;
        a.gd += r.awayGoals - r.homeGoals;

        if (r.homeGoals > r.awayGoals) { h.pts += 3; }
        else if (r.homeGoals < r.awayGoals) { a.pts += 3; }
        else { h.pts += 1; a.pts += 1; }
      }

      // Sort by h2h points, then h2h GD, then h2h GF
      const sorted = [...tied].sort((a, b) => {
        const ma = miniTable.get(a.name)!;
        const mb = miniTable.get(b.name)!;
        if (mb.pts !== ma.pts) return mb.pts - ma.pts;
        if (mb.gd !== ma.gd) return mb.gd - ma.gd;
        if (mb.gf !== ma.gf) return mb.gf - ma.gf;
        return 0;
      });

      // Check if still tied after h2h
      const groups: GroupTeamStanding[][] = [];
      let k = 0;
      while (k < sorted.length) {
        let l = k + 1;
        const ma = miniTable.get(sorted[k].name)!;
        while (l < sorted.length) {
          const mb = miniTable.get(sorted[l].name)!;
          if (mb.pts === ma.pts && mb.gd === ma.gd && mb.gf === ma.gf) l++;
          else break;
        }
        if (l - k === 1) {
          groups.push([sorted[k]]);
        } else {
          groups.push(sorted.slice(k, l));
        }
        k = l;
      }

      // If all still tied, fall back to overall stats
      const allStillTied = groups.some(g => g.length > 1);
      if (allStillTied) {
        // Use overall goal difference, then goals scored, then alphabetical
        return [...tied].sort((a, b) => {
          if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
          if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
          return a.name.localeCompare(b.name);
        });
      }

      return groups.flat();
    }

    // No head-to-head results (shouldn't happen in a complete group)
    // Fall back to overall stats
    return [...tied].sort((a, b) => {
      if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.name.localeCompare(b.name);
    });
  }

  return resolve(teams, matchResults);
}

// ─── Backtracking Third-Place Assignment ───────────────────────────────────

/**
 * Constraint-satisfying assignment of qualified third-place teams to bracket slots.
 * Each slot lists which group letters are allowed. Uses backtracking with
 * most-constrained-first ordering for efficiency.
 */
export function assignThirdsBacktracking(
  slotAllowedGroups: string[][],
  qualifiedGroups: string[]
): (string | null)[] {
  const n = slotAllowedGroups.length;
  const used = new Set<string>();
  const out: (string | null)[] = Array(n).fill(null);

  // Most-constrained-first ordering
  const order = slotAllowedGroups
    .map((allowed, i) => ({ i, allowed: allowed.filter(g => qualifiedGroups.includes(g)) }))
    .sort((a, b) => a.allowed.length - b.allowed.length);

  function backtrack(k: number): boolean {
    if (k === n) return true;
    const { i, allowed } = order[k];
    // Skip slots with no viable groups (e.g. I-L slots when no I-L third place is top-8)
    // This lets other slots still get assigned rather than failing the entire bracket.
    if (allowed.length === 0) return backtrack(k + 1);
    for (const g of allowed) {
      if (used.has(g)) continue;
      used.add(g);
      out[i] = g;
      if (backtrack(k + 1)) return true;
      used.delete(g);
      out[i] = null;
    }
    return false;
  }

  backtrack(0);
  return out;
}

// ─── Team Helpers ──────────────────────────────────────────────────────────

function samplePoisson(lambda: number, rng: () => number = Math.random): number {
  return seededSamplePoisson(lambda, rng);
}

function getFlag(name: string): string {
  const t = WORLD_CUP_TEAMS.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return t?.flag || '🏳️';
}

function getTeamCode(name: string): string {
  return WORLD_CUP_TEAMS.find((t) => t.name === name)?.code || name.slice(0, 3).toUpperCase();
}

function getTeamElo(name: string): number {
  return ELO_RATINGS[name]?.elo || 1500;
}

// ─── Match Simulation ─────────────────────────────────────────────────────

/**
 * Simulate a penalty shootout with Elo-based advantage.
 * Base probability is 50/50, adjusted by Elo difference.
 *
 * @param homeElo Home team Elo rating
 * @param awayElo Away team Elo rating
 * @returns Object with winner and penalty scores
 */
function simulatePenalties(
  homeElo: number,
  awayElo: number,
  rng: () => number = Math.random,
): { winner: string; penHome: number; penAway: number } {
  // Elo advantage: every 100 points = ~3% bonus
  const eloDiff = homeElo - awayElo;
  const homeBonus = Math.max(-0.15, Math.min(0.15, eloDiff / 3300));
  const homeProb = 0.5 + homeBonus;

  // Simulate 5 penalties each, then sudden death if needed
  let penHome = 0;
  let penAway = 0;

  // Regular 5 kicks
  for (let i = 0; i < 5; i++) {
    if (rng() < (0.75 + homeBonus * 0.5)) penHome++; // ~75% conversion rate
    if (rng() < (0.75 - homeBonus * 0.5)) penAway++;
  }

  // If still tied, sudden death
  while (penHome === penAway) {
    if (rng() < (0.75 + homeBonus * 0.5)) penHome++;
    if (rng() < (0.75 - homeBonus * 0.5)) penAway++;
  }

  return {
    winner: penHome > penAway ? '' : '', // Will be set by caller
    penHome,
    penAway,
  };
}

/**
 * Simulate extra time (30 minutes) with reduced lambda.
 * Goals in extra time are ~35% of regular time lambda (fatigue + caution).
 *
 * @param homeLambda Regular time home expected goals
 * @param awayLambda Regular time away expected goals
 * @returns Extra time goals for each team
 */
function simulateExtraTime(
  homeLambda: number,
  awayLambda: number,
  rng: () => number = Math.random,
): { homeGoals: number; awayGoals: number } {
  const ET_LAMBDA_FACTOR = 0.35; // ~35% of regular time goals
  return {
    homeGoals: samplePoisson(homeLambda * ET_LAMBDA_FACTOR, rng),
    awayGoals: samplePoisson(awayLambda * ET_LAMBDA_FACTOR, rng),
  };
}

function simulateMatch(
  home: string,
  away: string,
  realResult?: RealMatchResult,
  knockout = false,
  round: string = 'group',
  rng: () => number = Math.random,
): SimulatedMatch {
  if (realResult) {
    return {
      id: realResult.matchId,
      round: 'real',
      roundLabel: 'Resultado Real',
      homeTeam: home,
      awayTeam: away,
      homeFlag: getFlag(home),
      awayFlag: getFlag(away),
      homeScore: realResult.homeScore,
      awayScore: realResult.awayScore,
      winner: realResult.winner,
      isPlayed: true,
      homeWinProb: 100,
      drawProb: 0,
      awayWinProb: 0,
      prediction: `Resultado real: ${home} ${realResult.homeScore}-${realResult.awayScore} ${away}`,
    };
  }

  if (home === 'TBD' || away === 'TBD') {
    return {
      id: '',
      round: 'knockout',
      roundLabel: '',
      homeTeam: home,
      awayTeam: away,
      homeFlag: home.includes('TBD') ? '❓' : getFlag(home),
      awayFlag: away.includes('TBD') ? '❓' : getFlag(away),
      homeScore: 0,
      awayScore: 0,
      winner: 'TBD',
      isPlayed: false,
      homeWinProb: 50,
      drawProb: 25,
      awayWinProb: 25,
      prediction: 'Por definir',
    };
  }

  const stats = calculateStatisticalPrediction(home, away);

  // Stochastic sampling: sample from Poisson distribution using predicted lambdas
  const homeLambda = stats.homeExpectedGoals;
  const awayLambda = stats.awayExpectedGoals;
  const homeScore = samplePoisson(homeLambda, rng);
  const awayScore = samplePoisson(awayLambda, rng);

  let winner: string;
  let extraTime = false;
  let penalties = false;
  let penHome = 0;
  let penAway = 0;
  let finalHomeScore = homeScore;
  let finalAwayScore = awayScore;

  if (homeScore > awayScore) {
    winner = home;
  } else if (awayScore > homeScore) {
    winner = away;
  } else {
    // Draw in knockout → Extra time + penalties
    if (knockout) {
      // Simulate extra time (30 min, reduced lambda)
      const et = simulateExtraTime(homeLambda, awayLambda, rng);
      finalHomeScore = homeScore + et.homeGoals;
      finalAwayScore = awayScore + et.awayGoals;
      extraTime = true;

      if (finalHomeScore > finalAwayScore) {
        winner = home;
      } else if (finalAwayScore > finalHomeScore) {
        winner = away;
      } else {
        // Still tied after extra time → Penalties
        penalties = true;
        const homeElo = getTeamElo(home);
        const awayElo = getTeamElo(away);
        const penResult = simulatePenalties(homeElo, awayElo, rng);
        penHome = penResult.penHome;
        penAway = penResult.penAway;
        winner = penHome > penAway ? home : away;
      }
    } else {
      winner = 'draw';
    }
  }

  return {
    id: '',
    round: 'knockout',
    roundLabel: '',
    homeTeam: home,
    awayTeam: away,
    homeFlag: getFlag(home),
    awayFlag: getFlag(away),
    homeScore: finalHomeScore,
    awayScore: finalAwayScore,
    winner,
    isPlayed: false,
    homeWinProb: stats.homeWin,
    drawProb: stats.draw,
    awayWinProb: stats.awayWin,
    prediction: penalties
      ? `🎯 ${home} ${penHome}-${penAway} ${away} (penales)`
      : extraTime
        ? `⏱️ ${home} ${finalHomeScore}-${finalAwayScore} ${away} (tiempo extra)`
        : `📊 ${home} (${stats.homeWin}%) vs ${away} (${stats.awayWin}%)`,
    xGHome: stats.homeExpectedGoals,
    xGAway: stats.awayExpectedGoals,
    extraTime,
    penalties,
    penHome,
    penAway,
  };
}

// ─── Group Stage ───────────────────────────────────────────────────────────

function getGroups(): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const t of WORLD_CUP_TEAMS) {
    if (t.name.includes('TBD')) continue;
    if (!map[t.group]) map[t.group] = [];
    map[t.group].push(t.name);
  }
  return map;
}

function simulateGroups(
  groups: Record<string, string[]>,
  resultByTeams: Map<string, RealMatchResult>,
  onProgress?: (msg: string) => void,
  rng: () => number = Math.random,
): { standings: Map<string, GroupTeamStanding[]>; matchResults: { home: string; away: string; homeGoals: number; awayGoals: number }[] } {
  const standings = new Map<string, GroupTeamStanding[]>();
  const allMatchResults: { home: string; away: string; homeGoals: number; awayGoals: number }[] = [];

  for (const [letter, teams] of Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))) {
    if (onProgress) onProgress(`Simulando Grupo ${letter}...`);

    const s: GroupTeamStanding[] = teams.map((n) => ({
      name: n, flag: getFlag(n), code: getTeamCode(n),
      played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0,
    }));

    const groupMatchResults: { home: string; away: string; homeGoals: number; awayGoals: number }[] = [];

    const matchups = [];
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matchups.push({ home: teams[i], away: teams[j] });
      }
    }

    for (const match of matchups) {
      const resultKey = `${match.home}_vs_${match.away}`;
      const realResult = resultByTeams.get(resultKey);
      const simResult = simulateMatch(match.home, match.away, realResult, false, 'group', rng);

      const homeIdx = teams.indexOf(match.home);
      const awayIdx = teams.indexOf(match.away);
      const h = s[homeIdx], a = s[awayIdx];

      h.played++; a.played++;
      h.goalsFor += simResult.homeScore; h.goalsAgainst += simResult.awayScore;
      a.goalsFor += simResult.awayScore; a.goalsAgainst += simResult.homeScore;
      h.goalDiff = h.goalsFor - h.goalsAgainst;
      a.goalDiff = a.goalsFor - a.goalsAgainst;

      if (simResult.winner === 'draw') {
        h.drawn++; a.drawn++; h.points += 1; a.points += 1;
      } else if (simResult.winner === match.home) {
        h.won++; a.lost++; h.points += 3;
      } else {
        a.won++; h.lost++; a.points += 3;
      }

      groupMatchResults.push({ home: match.home, away: match.away, homeGoals: simResult.homeScore, awayGoals: simResult.awayScore });
      allMatchResults.push(groupMatchResults[groupMatchResults.length - 1]);
    }

    // FIFA tiebreakers
    const sorted = sortGroupWithFIFATiebreakers(s, groupMatchResults);
    standings.set(letter, sorted);
  }

  return { standings, matchResults: allMatchResults };
}

// ─── Knockout Stage ────────────────────────────────────────────────────────

function simulateKnockout(
  standings: Map<string, GroupTeamStanding[]>,
  matchResults: { home: string; away: string; homeGoals: number; awayGoals: number }[],
  resultByTeams: Map<string, RealMatchResult>,
  onProgress?: (msg: string) => void,
  rng: () => number = Math.random,
): {
  roundOf32: SimulatedMatch[];
  roundOf16: SimulatedMatch[];
  quarters: SimulatedMatch[];
  semis: SimulatedMatch[];
  thirdPlace: SimulatedMatch;
  final: SimulatedMatch;
} {
  const winners = new Map<string, string>();

  // Top 8 terceros lugares con FIFA tiebreakers
  const thirdPlaces: { name: string; pts: number; gd: number; gf: number; group: string }[] = [];
  for (const letter of ['A','B','C','D','E','F','G','H','I','J','K','L']) {
    const teams = standings.get(letter);
    if (teams && teams.length >= 3) {
      thirdPlaces.push({ name: teams[2].name, pts: teams[2].points, gd: teams[2].goalDiff, gf: teams[2].goalsFor, group: letter });
    }
  }
  thirdPlaces.sort((a, b) =>
    b.pts !== a.pts ? b.pts - a.pts :
    b.gd !== a.gd ? b.gd - a.gd :
    b.gf - a.gf
  );
  const top8Third = thirdPlaces.slice(0, 8);
  const qualifiedGroups = top8Third.map(t => t.group);

  // ═══════════════════════════════════════════════════════════════
  // ROUND OF 32 — Backtracking assignment for third places
  // ═══════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════
  // R32 SLOTS — Alineado con FIFA API (bracket real de WC2026)
  // Solo los slots 1st-vs-3rd necesitan backtracking (8 de 16).
  // ═══════════════════════════════════════════════════════════════

  const r32SlotAllowed: string[][] = [
    ['A', 'B', 'C', 'D', 'F'],  // R32-1:  1E vs 3{from A,B,C,D,F}
    ['C', 'D', 'F', 'G', 'H'],  // R32-2:  1I vs 3{from C,D,F,G,H}
    ['C', 'E', 'F', 'H', 'I'],  // R32-7:  1A vs 3{from C,E,F,H,I}
    ['E', 'H', 'I', 'J', 'K'],  // R32-8:  1L vs 3{from E,H,I,J,K}
    ['B', 'E', 'F', 'I', 'J'],  // R32-11: 1D vs 3{from B,E,F,I,J}
    ['A', 'E', 'H', 'I', 'J'],  // R32-12: 1G vs 3{from A,E,H,I,J}
    ['E', 'F', 'G', 'I', 'J'],  // R32-15: 1B vs 3{from E,F,G,I,J}
    ['D', 'E', 'I', 'J', 'L'],  // R32-16: 1K vs 3{from D,E,I,J,L}
  ];

  const thirdSlotGroupLetters: string[] = [
    'E',  // R32-1
    'I',  // R32-2
    'A',  // R32-7
    'L',  // R32-8
    'D',  // R32-11
    'G',  // R32-12
    'B',  // R32-15
    'K',  // R32-16
  ];

  const thirdAssignment = assignThirdsBacktracking(r32SlotAllowed, qualifiedGroups);

  // 16 R32 matchups en orden de cascada FIFA
  const r32Matchups: { home: string; away: string }[] = [
    // Ronda 1: 1E+3rd vs 1I+3rd → R16-1
    { home: '1E', away: thirdAssignment[0] ? `3${thirdAssignment[0]}` : 'TBD' },
    { home: '1I', away: thirdAssignment[1] ? `3${thirdAssignment[1]}` : 'TBD' },
    // Ronda 2: 2A+2B vs 1F+2C → R16-2
    { home: '2A', away: '2B' },
    { home: '1F', away: '2C' },
    // Ronda 3: 1C+2F vs 2E+2I → R16-3
    { home: '1C', away: '2F' },
    { home: '2E', away: '2I' },
    // Ronda 4: 1A+3rd vs 1L+3rd → R16-4
    { home: '1A', away: thirdAssignment[2] ? `3${thirdAssignment[2]}` : 'TBD' },
    { home: '1L', away: thirdAssignment[3] ? `3${thirdAssignment[3]}` : 'TBD' },
    // Ronda 5: 2K+2L vs 1H+2J → R16-5
    { home: '2K', away: '2L' },
    { home: '1H', away: '2J' },
    // Ronda 6: 1D+3rd vs 1G+3rd → R16-6
    { home: '1D', away: thirdAssignment[4] ? `3${thirdAssignment[4]}` : 'TBD' },
    { home: '1G', away: thirdAssignment[5] ? `3${thirdAssignment[5]}` : 'TBD' },
    // Ronda 7: 1J+2H vs 2D+2G → R16-7
    { home: '1J', away: '2H' },
    { home: '2D', away: '2G' },
    // Ronda 8: 1B+3rd vs 1K+3rd → R16-8
    { home: '1B', away: thirdAssignment[6] ? `3${thirdAssignment[6]}` : 'TBD' },
    { home: '1K', away: thirdAssignment[7] ? `3${thirdAssignment[7]}` : 'TBD' },
  ];

  const roundOf32: SimulatedMatch[] = [];

  for (let i = 0; i < r32Matchups.length; i++) {
    const { home, away } = r32Matchups[i];
    let homeTeam: string, awayTeam: string;

    if (home.startsWith('1')) {
      const g = home[1];
      const t = standings.get(g);
      homeTeam = t && t[0] ? t[0].name : 'TBD';
    } else if (home.startsWith('2')) {
      const g = home[1];
      const t = standings.get(g);
      homeTeam = t && t[1] ? t[1].name : 'TBD';
    } else {
      homeTeam = 'TBD';
    }

    if (away.startsWith('3')) {
      const g = away[1];
      const t = standings.get(g);
      awayTeam = t && t[2] ? t[2].name : 'TBD';
    } else if (away.startsWith('2')) {
      const g = away[1];
      const t = standings.get(g);
      awayTeam = t && t[1] ? t[1].name : 'TBD';
    } else {
      awayTeam = 'TBD';
    }

    // Look up real result by team names
    const resultKey = `${homeTeam}_vs_${awayTeam}`;
    const realResult = resultByTeams.get(resultKey);
    const m = simulateMatch(homeTeam, awayTeam, realResult, true, 'R32', rng);
    m.id = `R32-${i + 1}`;
    m.roundLabel = '1/16 Final';
    roundOf32.push(m);
    if (m.winner !== 'TBD') winners.set(`W-R32-${i + 1}`, m.winner);
    if (onProgress && i < 4) onProgress(`1/16: ${m.homeTeam} vs ${m.awayTeam} → ${m.winner}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // ROUND OF 16
  // ═══════════════════════════════════════════════════════════════

  // R16 pairing MUST match static matches.ts R16 entries (consecutive R32 winners).
  // This keeps the simulation bracket aligned with the fixture display and DAG.
  const r16def = [
    'W-R32-1|W-R32-2',    // R16-1
    'W-R32-3|W-R32-4',    // R16-2
    'W-R32-5|W-R32-6',    // R16-3
    'W-R32-7|W-R32-8',    // R16-4
    'W-R32-9|W-R32-10',   // R16-5
    'W-R32-11|W-R32-12',  // R16-6
    'W-R32-13|W-R32-14',  // R16-7
    'W-R32-15|W-R32-16',  // R16-8
  ];
  const roundOf16: SimulatedMatch[] = [];
  for (let i = 0; i < r16def.length; i++) {
    const [h, a] = r16def[i].split('|');
    const home = winners.get(h) || 'TBD';
    const away = winners.get(a) || 'TBD';
    const m = simulateMatch(home, away, resultByTeams.get(`${home}_vs_${away}`), true, 'R16', rng);
    m.id = `R16-${i + 1}`;
    m.roundLabel = 'Octavos de Final';
    roundOf16.push(m);
    if (m.winner !== 'TBD') winners.set(`W-R16-${i + 1}`, m.winner);
    if (onProgress) onProgress(`Octavos: ${m.homeTeam} vs ${m.awayTeam} → ${m.winner}`);
  }

  // Quarter-finals (FIFA cascade: QF-2 = W-R16-5/6, QF-3 = W-R16-3/4 — swap!)
  const qfdef = ['W-R16-1|W-R16-2','W-R16-5|W-R16-6','W-R16-3|W-R16-4','W-R16-7|W-R16-8'];
  const quarters: SimulatedMatch[] = [];
  for (let i = 0; i < qfdef.length; i++) {
    const [h, a] = qfdef[i].split('|');
    const home = winners.get(h) || 'TBD';
    const away = winners.get(a) || 'TBD';
    const m = simulateMatch(home, away, resultByTeams.get(`${home}_vs_${away}`), true, 'QF', rng);
    m.id = `QF-${i + 1}`;
    m.roundLabel = 'Cuartos de Final';
    quarters.push(m);
    if (m.winner !== 'TBD') winners.set(`W-QF-${i + 1}`, m.winner);
    if (onProgress) onProgress(`Cuartos: ${m.homeTeam} vs ${m.awayTeam} → ${m.winner}`);
  }

  // Semi-finals
  const sfdef = ['W-QF-1|W-QF-2','W-QF-3|W-QF-4'];
  const semis: SimulatedMatch[] = [];
  for (let i = 0; i < sfdef.length; i++) {
    const [h, a] = sfdef[i].split('|');
    const home = winners.get(h) || 'TBD';
    const away = winners.get(a) || 'TBD';
    const m = simulateMatch(home, away, resultByTeams.get(`${home}_vs_${away}`), true, 'SF', rng);
    m.id = `SF-${i + 1}`;
    m.roundLabel = 'Semifinales';
    semis.push(m);
    if (m.winner !== 'TBD') winners.set(`W-SF-${i + 1}`, m.winner);
    if (onProgress) onProgress(`Semis: ${m.homeTeam} vs ${m.awayTeam} → ${m.winner}`);
  }

  // Third place
  const losers = semis.map((m) => m.winner === m.homeTeam ? m.awayTeam : m.homeTeam);
  const tpHome = losers[0] || 'TBD';
  const tpAway = losers[1] || 'TBD';
  const thirdPlace = simulateMatch(tpHome, tpAway, resultByTeams.get(`${tpHome}_vs_${tpAway}`), true, 'TP', rng);
  thirdPlace.id = 'TP-1';
  thirdPlace.roundLabel = 'Tercer Puesto';

  // Final
  const finHome = semis[0]?.winner || 'TBD';
  const finAway = semis[1]?.winner || 'TBD';
  const final = simulateMatch(finHome, finAway, resultByTeams.get(`${finHome}_vs_${finAway}`), true, 'F', rng);
  final.id = 'FINAL';
  final.roundLabel = 'La Gran Final';

  return { roundOf32, roundOf16, quarters, semis, thirdPlace, final };
}

// ─── Main Export ───────────────────────────────────────────────────────────

export interface SimulateTournamentOptions {
  realResults?: RealMatchResult[];
  onProgress?: (msg: string) => void;
  /** Seed for deterministic simulation. Same seed → same results. */
  seed?: number;
}

export async function simulateTournament(
  options: SimulateTournamentOptions = {}
): Promise<TournamentBracket> {
  const { realResults = [], onProgress, seed } = options;
  const rng = seed !== undefined ? createRNG(seed) : Math.random;

  const resultsMap = new Map<string, RealMatchResult>();
  for (const r of realResults) {
    resultsMap.set(`${r.matchId}`, r);
  }

  if (onProgress) onProgress('Simulando fase de grupos con motor estadístico real...');

  const groups = getGroups();
  const resultByTeams = new Map<string, RealMatchResult>();
  for (const m of ALL_MATCHES) {
    const r = resultsMap.get(m.id);
    if (r) {
      resultByTeams.set(`${m.homeTeam}_vs_${m.awayTeam}`, r);
    }
  }

  const { standings, matchResults } = simulateGroups(groups, resultByTeams, onProgress, rng);

  const groupStandings: GroupStandings[] = [];
  for (const letter of ['A','B','C','D','E','F','G','H','I','J','K','L']) {
    groupStandings.push({ group: letter, teams: standings.get(letter) || [] });
  }

  if (onProgress) onProgress('Simulando eliminatorias con Poisson + Elo...');
  const knockout = simulateKnockout(standings, matchResults, resultByTeams, onProgress, rng);

  const champion = knockout.final.winner;
  const runnerUp = champion === knockout.final.homeTeam ? knockout.final.awayTeam : knockout.final.homeTeam;
  const thirdTeam = knockout.thirdPlace.winner;
  const fourthTeam = thirdTeam === knockout.thirdPlace.homeTeam ? knockout.thirdPlace.awayTeam : knockout.thirdPlace.homeTeam;

  if (onProgress) onProgress(`🏆 Campeón: ${champion}!`);

  return {
    groups: groupStandings,
    roundOf32: knockout.roundOf32,
    roundOf16: knockout.roundOf16,
    quarters: knockout.quarters,
    semis: knockout.semis,
    thirdPlace: knockout.thirdPlace,
    final: knockout.final,
    champion,
    championFlag: getFlag(champion),
    runnerUp,
    runnerUpFlag: getFlag(runnerUp),
    thirdPlaceTeam: thirdTeam,
    thirdPlaceFlag: getFlag(thirdTeam),
    fourthPlaceTeam: fourthTeam,
    fourthPlaceFlag: getFlag(fourthTeam),
    simulatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════
// MULTI-SIMULATION — Top 8 Champion Probability
// ═══════════════════════════════════════════════════════════════

export interface ChampionProbability {
  team: string;
  flag: string;
  wins: number;
  pct: number;
}

export interface MultiSimResult {
  top8: ChampionProbability[];
  totalSims: number;
  bracket: TournamentBracket;
  // Per-team per-round advancement counts
  roundCounts: {
    r32: Map<string, number>;   // times team appeared in R32
    r16: Map<string, number>;   // times team won R32 (reached R16)
    qf: Map<string, number>;    // times team won R16 (reached QF)
    sf: Map<string, number>;    // times team won QF (reached SF)
    final: Map<string, number>; // times team won SF (reached Final)
    champion: Map<string, number>; // times team won Final
    runnerUp: Map<string, number>; // times team lost Final
    third: Map<string, number>;    // times team won 3rd place match
  };
}

export async function simulateTournamentMulti(
  numSims = 100,
  realResults: RealMatchResult[] = [],
  onProgress?: (msg: string) => void,
  /** Seed for deterministic multi-simulation. Each sim number is appended to the seed for unique but reproducible streams. */
  seed?: number,
): Promise<MultiSimResult> {
  // Load Elo overrides from DB (persistent updates from past match results)
  try {
    const db = await getDataLayerAsync();
    const allTeams = WORLD_CUP_TEAMS.map(t => t.name);
    const overrides = new Map<string, EloEntry>();
    for (const teamName of allTeams) {
      const kvEntry = await db.getKeyValue(`eloOverride:${teamName}`);
      if (kvEntry && typeof kvEntry.value === 'object' && kvEntry.value !== null) {
        const val = kvEntry.value as Partial<EloEntry>;
        const base = ELO_RATINGS[teamName] || { elo: 1500, attack: 1.0, defense: 1.0 };
        overrides.set(teamName, {
          elo: val.elo ?? base.elo,
          attack: val.attack ?? base.attack,
          defense: val.defense ?? base.defense,
        });
      }
    }
    if (overrides.size > 0) {
      loadEloOverrides(overrides);
      if (onProgress) onProgress(`Elo overrides cargados: ${overrides.size} equipos actualizados`);
    }
  } catch {
    // Fallback: use static ELO_RATINGS
  }

  const championCounts = new Map<string, number>();
  let lastBracket: TournamentBracket | null = null;

  // Per-round tracking
  const r32Counts = new Map<string, number>();
  const r16Counts = new Map<string, number>();
  const qfCounts = new Map<string, number>();
  const sfCounts = new Map<string, number>();
  const finalCounts = new Map<string, number>();
  const runnerUpCounts = new Map<string, number>();
  const thirdCounts = new Map<string, number>();

  const resultsMap = new Map<string, RealMatchResult>();
  for (const r of realResults) {
    resultsMap.set(`${r.matchId}`, r);
  }

  if (onProgress) onProgress(`Ejecutando ${numSims} simulaciones...`);

  const groups = getGroups();
  const resultByTeams = new Map<string, RealMatchResult>();
  for (const m of ALL_MATCHES) {
    const r = resultsMap.get(m.id);
    if (r) {
      resultByTeams.set(`${m.homeTeam}_vs_${m.awayTeam}`, r);
    }
  }

  for (let i = 0; i < numSims; i++) {
    if (onProgress && i % 50 === 0) {
      onProgress(`Simulación ${i + 1}/${numSims}...`);
    }

    // Each sim in the batch gets a unique seed (deterministic if base seed is provided)
    const simRng = seed !== undefined ? createRNG(seed + i) : Math.random;

    try {
      const { standings, matchResults } = simulateGroups(groups, resultByTeams, undefined, simRng);
      const knockout = simulateKnockout(standings, matchResults, resultByTeams, undefined, simRng);

      // Track per-round appearances
      for (const m of knockout.roundOf32) {
        if (m.homeTeam !== 'TBD') r32Counts.set(m.homeTeam, (r32Counts.get(m.homeTeam) || 0) + 1);
        if (m.awayTeam !== 'TBD') r32Counts.set(m.awayTeam, (r32Counts.get(m.awayTeam) || 0) + 1);
        if (m.winner && m.winner !== 'TBD') r16Counts.set(m.winner, (r16Counts.get(m.winner) || 0) + 1);
      }
      for (const m of knockout.roundOf16) {
        if (m.winner && m.winner !== 'TBD') qfCounts.set(m.winner, (qfCounts.get(m.winner) || 0) + 1);
      }
      for (const m of knockout.quarters) {
        if (m.winner && m.winner !== 'TBD') sfCounts.set(m.winner, (sfCounts.get(m.winner) || 0) + 1);
      }
      for (const m of knockout.semis) {
        if (m.winner && m.winner !== 'TBD') finalCounts.set(m.winner, (finalCounts.get(m.winner) || 0) + 1);
        const loser = m.winner === m.homeTeam ? m.awayTeam : m.homeTeam;
        if (loser && loser !== 'TBD') {
          // Loser of semi goes to 3rd place
        }
      }
      // Third place
      if (knockout.thirdPlace.winner && knockout.thirdPlace.winner !== 'TBD') {
        thirdCounts.set(knockout.thirdPlace.winner, (thirdCounts.get(knockout.thirdPlace.winner) || 0) + 1);
      }
      // Final
      const champion = knockout.final.winner;
      if (champion && champion !== 'TBD') {
        championCounts.set(champion, (championCounts.get(champion) || 0) + 1);
        const runnerUp = champion === knockout.final.homeTeam ? knockout.final.awayTeam : knockout.final.homeTeam;
        if (runnerUp && runnerUp !== 'TBD') {
          runnerUpCounts.set(runnerUp, (runnerUpCounts.get(runnerUp) || 0) + 1);
        }
      }

      // Track the bracket from the simulation that produced the current champion leader
      const currentLeader = Array.from(championCounts.entries()).sort((a, b) => b[1] - a[1])[0];
      if (champion && champion === currentLeader?.[0]) {
        const groupStandings: GroupStandings[] = [];
        for (const letter of ['A','B','C','D','E','F','G','H','I','J','K','L']) {
          groupStandings.push({ group: letter, teams: standings.get(letter) || [] });
        }
        const runnerUp = champion === knockout.final.homeTeam ? knockout.final.awayTeam : knockout.final.homeTeam;
        const thirdTeam = knockout.thirdPlace.winner;
        const fourthTeam = thirdTeam === knockout.thirdPlace.homeTeam ? knockout.thirdPlace.awayTeam : knockout.thirdPlace.homeTeam;

        lastBracket = {
          groups: groupStandings,
          roundOf32: knockout.roundOf32,
          roundOf16: knockout.roundOf16,
          quarters: knockout.quarters,
          semis: knockout.semis,
          thirdPlace: knockout.thirdPlace,
          final: knockout.final,
          champion,
          championFlag: getFlag(champion),
          runnerUp,
          runnerUpFlag: getFlag(runnerUp),
          thirdPlaceTeam: thirdTeam,
          thirdPlaceFlag: getFlag(thirdTeam),
          fourthPlaceTeam: fourthTeam,
          fourthPlaceFlag: getFlag(fourthTeam),
          simulatedAt: new Date().toISOString(),
        };
      }
    } catch {
      // Skip failed simulations
    }
  }

  const sorted = Array.from(championCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const totalWithChampion = Array.from(championCounts.values()).reduce((s, v) => s + v, 0);

  const top8: ChampionProbability[] = sorted.map(([team, wins]) => ({
    team,
    flag: getFlag(team),
    wins,
    pct: totalWithChampion > 0 ? Math.round((wins / totalWithChampion) * 10000) / 100 : 0,
  }));

  if (!lastBracket) {
    if (onProgress) onProgress('Simulación de respaldo...');
    lastBracket = await simulateTournament({ realResults, onProgress, seed: seed !== undefined ? seed + 999999 : undefined });
  }

  if (onProgress) {
    const leader = top8[0];
    onProgress(`🏆 ${leader?.team || 'N/A'} lidera con ${leader?.pct || 0}%`);
  }

  // Clean up Elo overrides after simulation
  clearEloOverrides();

  return {
    top8,
    totalSims: numSims,
    bracket: lastBracket,
    roundCounts: {
      r32: r32Counts,
      r16: r16Counts,
      qf: qfCounts,
      sf: sfCounts,
      final: finalCounts,
      champion: championCounts,
      runnerUp: runnerUpCounts,
      third: thirdCounts,
    },
  };
}

// ─── Consensus Bracket Builder ──────────────────────────────────────────────
// Builds a "canonical" TournamentBracket from aggregated simulation counts.
// For each slot, the team that appears MOST across all simulations wins that slot.
// This guarantees the bracket is always consistent with the champion probabilities.

function topN(counts: Map<string, number>, n: number): string[] {
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([team]) => team);
}

function makeMatch(
  id: string, round: string, roundLabel: string,
  homeTeam: string, awayTeam: string,
  counts: Map<string, number>, totalSims: number,
): SimulatedMatch {
  const homeWins = counts.get(homeTeam) || 0;
  const awayWins = counts.get(awayTeam) || 0;
  const total = homeWins + awayWins || 1;
  const homeWinProb = Math.round((homeWins / total) * 10000) / 100;
  const awayWinProb = Math.round((awayWins / total) * 10000) / 100;
  const drawProb = 0;
  const winner = homeWins >= awayWins ? homeTeam : awayTeam;
  return {
    id, round, roundLabel,
    homeTeam, awayTeam,
    homeFlag: getFlag(homeTeam), awayFlag: getFlag(awayTeam),
    homeScore: 0, awayScore: 0,
    winner,
    isPlayed: false,
    homeWinProb, drawProb, awayWinProb,
    prediction: `${homeTeam} ${Math.round(homeWinProb)}% | ${awayTeam} ${Math.round(awayWinProb)}%`,
  };
}

export function buildConsensusBracket(
  roundCounts: MultiSimResult['roundCounts'],
  totalSims: number,
  championProbs?: ChampionProbability[],
): TournamentBracket {
  // R32: top 32 teams by r32 appearance count → pair them by bracket slot
  const r32Teams = topN(roundCounts.r32, 32);
  // R16: top 16 teams by r16 count (won R32)
  const r16Teams = topN(roundCounts.r16, 16);
  // QF: top 8 by qf count
  const qfTeams = topN(roundCounts.qf, 8);
  // SF: top 4 by sf count
  const sfTeams = topN(roundCounts.sf, 4);
  // Final: top 2 by final count
  const finalTeams = topN(roundCounts.final, 2);

  const champion = championProbs?.[0]?.team || topN(roundCounts.champion, 1)[0] || 'TBD';
  const runnerUp = topN(roundCounts.runnerUp, 1)[0] || (finalTeams.length >= 2 ? (finalTeams[0] === champion ? finalTeams[1] : finalTeams[0]) : 'TBD');
  const thirdTeam = topN(roundCounts.third, 1)[0] || 'TBD';

  // Build bracket matches using consensus winners
  const roundOf32: SimulatedMatch[] = [];
  for (let i = 0; i < 16; i++) {
    const home = r32Teams[i * 2] || 'TBD';
    const away = r32Teams[i * 2 + 1] || 'TBD';
    roundOf32.push(makeMatch(`R32-${i + 1}`, 'R32', '1/16 Final', home, away, roundCounts.r16, totalSims));
  }

  const roundOf16: SimulatedMatch[] = [];
  for (let i = 0; i < 8; i++) {
    const home = r16Teams[i * 2] || 'TBD';
    const away = r16Teams[i * 2 + 1] || 'TBD';
    roundOf16.push(makeMatch(`R16-${i + 1}`, 'R16', 'Octavos de Final', home, away, roundCounts.qf, totalSims));
  }

  const quarters: SimulatedMatch[] = [];
  for (let i = 0; i < 4; i++) {
    const home = qfTeams[i * 2] || 'TBD';
    const away = qfTeams[i * 2 + 1] || 'TBD';
    quarters.push(makeMatch(`QF-${i + 1}`, 'QF', 'Cuartos de Final', home, away, roundCounts.sf, totalSims));
  }

  const semis: SimulatedMatch[] = [];
  for (let i = 0; i < 2; i++) {
    const home = sfTeams[i * 2] || 'TBD';
    const away = sfTeams[i * 2 + 1] || 'TBD';
    semis.push(makeMatch(`SF-${i + 1}`, 'SF', 'Semifinales', home, away, roundCounts.final, totalSims));
  }

  const thirdPlace = makeMatch('TP-1', 'TP', 'Tercer Puesto',
    topN(roundCounts.third, 2)[0] || 'TBD',
    topN(roundCounts.third, 2)[1] || 'TBD',
    roundCounts.third, totalSims,
  );
  thirdPlace.winner = thirdTeam;

  const final_ = makeMatch('FINAL', 'F', 'La Gran Final',
    finalTeams[0] || 'TBD', finalTeams[1] || 'TBD',
    roundCounts.champion, totalSims,
  );
  final_.winner = champion;

  return {
    groups: [],
    roundOf32, roundOf16, quarters, semis,
    thirdPlace, final: final_,
    champion,
    championFlag: getFlag(champion),
    runnerUp,
    runnerUpFlag: getFlag(runnerUp),
    thirdPlaceTeam: thirdTeam,
    thirdPlaceFlag: getFlag(thirdTeam),
    fourthPlaceTeam: topN(roundCounts.third, 2)[1] || 'TBD',
    fourthPlaceFlag: getFlag(topN(roundCounts.third, 2)[1] || 'TBD'),
    simulatedAt: new Date().toISOString(),
  };
}
