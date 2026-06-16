// FORCH.i ORACLE — Tournament Simulation Engine v3
// FIFA-official tiebreakers + backtracking third-place assignment
// Client-side multi-simulation for forecast page

import { calculateStatisticalPrediction } from './predictor-engine';
import { WORLD_CUP_TEAMS, ELO_RATINGS } from './teams';
import { ALL_MATCHES } from './matches';

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

    // Step a: points
    candidates.sort((a, b) => b.points - a.points);

    const result: GroupTeamStanding[] = [];
    let i = 0;

    while (i < candidates.length) {
      let j = i + 1;
      while (j < candidates.length && candidates[j].points === candidates[i].points) j++;

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

async function simulateMatch(
  home: string,
  away: string,
  realResult?: RealMatchResult,
  knockout = false
): Promise<SimulatedMatch> {
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

  const stats = await calculateStatisticalPrediction(home, away);
  const homeScore = stats.predictedScoreHome;
  const awayScore = stats.predictedScoreAway;
  let winner: string;

  if (homeScore > awayScore) winner = home;
  else if (awayScore > homeScore) winner = away;
  else {
    if (knockout) {
      // In knockout, higher probability team wins (simulates ET/penalties)
      winner = stats.homeWin > stats.awayWin ? home : away;
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
    homeScore,
    awayScore,
    winner,
    isPlayed: false,
    homeWinProb: stats.homeWin,
    drawProb: stats.draw,
    awayWinProb: stats.awayWin,
    prediction: `📊 ${home} (${stats.homeWin}%) vs ${away} (${stats.awayWin}%)`,
    xGHome: stats.homeExpectedGoals,
    xGAway: stats.awayExpectedGoals,
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

async function simulateGroups(
  realResults: Map<string, RealMatchResult>,
  onProgress?: (msg: string) => void
): Promise<{ standings: Map<string, GroupTeamStanding[]>; matchResults: { home: string; away: string; homeGoals: number; awayGoals: number }[] }> {
  const groups = getGroups();
  const standings = new Map<string, GroupTeamStanding[]>();
  const allMatchResults: { home: string; away: string; homeGoals: number; awayGoals: number }[] = [];

  // Build a lookup by team names: "Argentina_vs_Canada" -> RealMatchResult
  const resultByTeams = new Map<string, RealMatchResult>();
  // Build team-name-based lookup from ALL_MATCHES + realResults
  const { ALL_MATCHES: matches } = await import('./matches');
  for (const m of matches) {
    const r = realResults.get(m.id);
    if (r) {
      resultByTeams.set(`${m.homeTeam}_vs_${m.awayTeam}`, r);
    }
  }

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
      const simResult = await simulateMatch(match.home, match.away, realResult);

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

async function simulateKnockout(
  standings: Map<string, GroupTeamStanding[]>,
  matchResults: { home: string; away: string; homeGoals: number; awayGoals: number }[],
  realResults: Map<string, RealMatchResult>,
  onProgress?: (msg: string) => void
): Promise<{
  roundOf32: SimulatedMatch[];
  roundOf16: SimulatedMatch[];
  quarters: SimulatedMatch[];
  semis: SimulatedMatch[];
  thirdPlace: SimulatedMatch;
  final: SimulatedMatch;
}> {
  const winners = new Map<string, string>();

  // Build team-name-based lookup for knockout real results
  const { ALL_MATCHES: matches } = await import('./matches');
  const resultByTeams = new Map<string, RealMatchResult>();
  for (const m of matches) {
    const r = realResults.get(m.id);
    if (r) {
      resultByTeams.set(`${m.homeTeam}_vs_${m.awayTeam}`, r);
    }
  }

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

  // FIFA 2026 bracket: each R32 slot has allowed third-place groups
  const r32SlotAllowed: string[][] = [
    ['B', 'E', 'F', 'G'],     // 1A vs 3rd
    ['A', 'B', 'C'],           // 1B vs 3rd
    ['A', 'B', 'C', 'D'],      // 1C vs 3rd
    ['D', 'E', 'F'],           // 1D vs 3rd
    ['D', 'E', 'F'],           // 1E vs 3rd
    ['A', 'B', 'C'],           // 1F vs 3rd
    ['C', 'G', 'H'],           // 1G vs 3rd
    ['G', 'H', 'A'],           // 1H vs 3rd
    ['I', 'J', 'K', 'L'],     // 1I vs 3rd
    ['I', 'J', 'K', 'L'],     // 1J vs 3rd
    ['I', 'J', 'K', 'L'],     // 1K vs 3rd
    ['I', 'J', 'K', 'L'],     // 1L vs 3rd
  ];

  const thirdAssignment = assignThirdsBacktracking(r32SlotAllowed, qualifiedGroups);

  // R32 slots: 12 1st-vs-3rd + 4 2nd-vs-2nd
  const r32Matchups: { home: string; away: string }[] = [];

  const groupLetters = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  for (let i = 0; i < 12; i++) {
    const groupLetter = groupLetters[i];
    const thirdGroup = thirdAssignment[i];
    r32Matchups.push({
      home: `1${groupLetter}`,
      away: thirdGroup ? `3${thirdGroup}` : 'TBD',
    });
  }
  // 2nd vs 2nd
  r32Matchups.push({ home: '2A', away: '2B' });
  r32Matchups.push({ home: '2C', away: '2D' });
  r32Matchups.push({ home: '2E', away: '2F' });
  r32Matchups.push({ home: '2G', away: '2H' });

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
    const m = await simulateMatch(homeTeam, awayTeam, realResult, true);
    m.id = `R32-${i + 1}`;
    m.roundLabel = '1/16 Final';
    roundOf32.push(m);
    if (m.winner !== 'TBD') winners.set(`W-R32-${i + 1}`, m.winner);
    if (onProgress && i < 4) onProgress(`1/16: ${m.homeTeam} vs ${m.awayTeam} → ${m.winner}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // ROUND OF 16
  // ═══════════════════════════════════════════════════════════════

  const r16def = [
    'W-R32-1|W-R32-13',
    'W-R32-5|W-R32-14',
    'W-R32-3|W-R32-15',
    'W-R32-7|W-R32-16',
    'W-R32-9|W-R32-12',
    'W-R32-2|W-R32-10',
    'W-R32-6|W-R32-4',
    'W-R32-11|W-R32-8',
  ];
  const roundOf16: SimulatedMatch[] = [];
  for (let i = 0; i < r16def.length; i++) {
    const [h, a] = r16def[i].split('|');
    const home = winners.get(h) || 'TBD';
    const away = winners.get(a) || 'TBD';
    const m = await simulateMatch(home, away, resultByTeams.get(`${home}_vs_${away}`), true);
    m.id = `R16-${i + 1}`;
    m.roundLabel = 'Octavos de Final';
    roundOf16.push(m);
    if (m.winner !== 'TBD') winners.set(`W-R16-${i + 1}`, m.winner);
    if (onProgress) onProgress(`Octavos: ${m.homeTeam} vs ${m.awayTeam} → ${m.winner}`);
  }

  // Quarter-finals
  const qfdef = ['W-R16-1|W-R16-2','W-R16-3|W-R16-4','W-R16-5|W-R16-6','W-R16-7|W-R16-8'];
  const quarters: SimulatedMatch[] = [];
  for (let i = 0; i < qfdef.length; i++) {
    const [h, a] = qfdef[i].split('|');
    const home = winners.get(h) || 'TBD';
    const away = winners.get(a) || 'TBD';
    const m = await simulateMatch(home, away, resultByTeams.get(`${home}_vs_${away}`), true);
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
    const m = await simulateMatch(home, away, resultByTeams.get(`${home}_vs_${away}`), true);
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
  const thirdPlace = await simulateMatch(tpHome, tpAway, resultByTeams.get(`${tpHome}_vs_${tpAway}`), true);
  thirdPlace.id = 'TP-1';
  thirdPlace.roundLabel = 'Tercer Puesto';

  // Final
  const finHome = semis[0]?.winner || 'TBD';
  const finAway = semis[1]?.winner || 'TBD';
  const final = await simulateMatch(finHome, finAway, resultByTeams.get(`${finHome}_vs_${finAway}`), true);
  final.id = 'FINAL';
  final.roundLabel = 'La Gran Final';

  return { roundOf32, roundOf16, quarters, semis, thirdPlace, final };
}

// ─── Main Export ───────────────────────────────────────────────────────────

export interface SimulateTournamentOptions {
  realResults?: RealMatchResult[];
  onProgress?: (msg: string) => void;
}

export async function simulateTournament(
  options: SimulateTournamentOptions = {}
): Promise<TournamentBracket> {
  const { realResults = [], onProgress } = options;

  const resultsMap = new Map<string, RealMatchResult>();
  for (const r of realResults) {
    resultsMap.set(`${r.matchId}`, r);
  }

  if (onProgress) onProgress('Simulando fase de grupos con motor estadístico real...');

  const { standings, matchResults } = await simulateGroups(resultsMap, onProgress);

  const groupStandings: GroupStandings[] = [];
  for (const letter of ['A','B','C','D','E','F','G','H','I','J','K','L']) {
    groupStandings.push({ group: letter, teams: standings.get(letter) || [] });
  }

  if (onProgress) onProgress('Simulando eliminatorias con Poisson + Elo...');
  const knockout = await simulateKnockout(standings, matchResults, resultsMap, onProgress);

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
  onProgress?: (msg: string) => void
): Promise<MultiSimResult> {
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

  for (let i = 0; i < numSims; i++) {
    if (onProgress && i % 10 === 0) {
      onProgress(`Simulación ${i + 1}/${numSims}...`);
    }

    try {
      const { standings, matchResults } = await simulateGroups(resultsMap);
      const knockout = await simulateKnockout(standings, matchResults, resultsMap);

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

      if (i === numSims - 1) {
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
    pct: totalWithChampion > 0 ? Math.round((wins / totalWithChampion) * 1000) / 10 : 0,
  }));

  if (!lastBracket) {
    if (onProgress) onProgress('Simulación de respaldo...');
    lastBracket = await simulateTournament({ realResults, onProgress });
  }

  if (onProgress) {
    const leader = top8[0];
    onProgress(`🏆 ${leader?.team || 'N/A'} lidera con ${leader?.pct || 0}%`);
  }

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
