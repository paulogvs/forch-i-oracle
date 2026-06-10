// FORCH.i ORACLE — Tournament Simulation Engine v2
// Usa el motor estadístico real (Poisson + Elo) para predecir cada partido
// Acepta resultados reales y re-simula el resto del bracket

import { calculateStatisticalPrediction, type StatisticalPrediction } from './predictor-engine';
import { WORLD_CUP_TEAMS } from './teams';

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
  isPlayed: boolean;      // true si ya se jugó (resultado real)
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  prediction: string;
  xGHome?: number;        // Expected goals
  xGAway?: number;
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

/** Resultado real de un partido (input del usuario o API) */
export interface RealMatchResult {
  matchId: string;
  homeScore: number;
  awayScore: number;
  winner: string; // team name or 'draw' (before extra time)
}

// ─── Team Helpers ──────────────────────────────────────────────────────────

function getFlag(name: string): string {
  const t = WORLD_CUP_TEAMS.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return t?.flag || '🏳️';
}

// ─── Match Simulation using Statistical Engine ─────────────────────────────

/**
 * Simula un partido usando el motor estadístico real (Poisson + Elo + xG)
 * Si hay un resultado real, lo usa directamente.
 */
async function simulateMatch(
  home: string,
  away: string,
  realResult?: RealMatchResult,
  knockout = false
): Promise<SimulatedMatch> {
  // Si ya hay resultado real, usarlo
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
      xGHome: undefined,
      xGAway: undefined,
    };
  }

  // Si equipo TBD, retornar pendiente
  if (home === 'TBD' || home.includes('TBD') || away === 'TBD' || away.includes('TBD')) {
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

  // Usar motor estadístico real para predecir
  const stats = await calculateStatisticalPrediction(home, away);

  // Simular marcador basado en Poisson
  const homeScore = stats.predictedScoreHome;
  const awayScore = stats.predictedScoreAway;
  let winner: string;

  if (homeScore > awayScore) winner = home;
  else if (awayScore > homeScore) winner = away;
  else {
    if (knockout) {
      // En eliminatoria, el equipo con mayor probabilidad gana en penales
      winner = stats.homeWin > stats.awayWin ? home : away;
    } else {
      winner = 'draw';
    }
  }

  const analysis = `📊 ${home} (${stats.homeWin}%) vs ${away} (${stats.awayWin}%) | xG: ${stats.homeExpectedGoals}-${stats.awayExpectedGoals}`;

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
    prediction: analysis,
    xGHome: stats.homeExpectedGoals,
    xGAway: stats.awayExpectedGoals,
  };
}

// ─── Group Stage ───────────────────────────────────────────────────────────

function getGroups(): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const t of WORLD_CUP_TEAMS) {
    // Saltar equipos TBD
    if (t.name.includes('TBD')) continue;
    if (!map[t.group]) map[t.group] = [];
    map[t.group].push(t.name);
  }
  return map;
}

async function simulateGroups(
  realResults: Map<string, RealMatchResult>,
  onProgress?: (msg: string) => void
): Promise<Map<string, GroupTeamStanding[]>> {
  const groups = getGroups();
  const standings = new Map<string, GroupTeamStanding[]>();

  for (const [letter, teams] of Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))) {
    if (onProgress) onProgress(`Simulando Grupo ${letter}...`);

    const s: GroupTeamStanding[] = teams.map((n) => ({
      name: n, flag: getFlag(n), code: WORLD_CUP_TEAMS.find((t) => t.name === n)?.code || n.slice(0, 3).toUpperCase(),
      played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0,
    }));

    // Generar matchups del grupo
    const matchups = [];
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matchups.push({ home: teams[i], away: teams[j] });
      }
    }

    // Simular cada partido
    for (const match of matchups) {
      // Buscar resultado real
      const resultKey = `${match.home}_vs_${match.away}`;
      const realResult = realResults.get(resultKey);

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
    }

    // Ordenar por puntos, diferencia de gol, goles a favor
    s.sort((a, b) =>
      b.points !== a.points ? b.points - a.points :
      b.goalDiff !== a.goalDiff ? b.goalDiff - a.goalDiff :
      b.goalsFor - a.goalsFor
    );
    standings.set(letter, s);
  }

  return standings;
}

// ─── Knockout Stage ────────────────────────────────────────────────────────

async function resolveTeam(
  src: string,
  standings: Map<string, GroupTeamStanding[]>,
  thirdPlaces: { name: string; pts: number; gd: number; gf: number }[],
  winners: Map<string, string>
): Promise<string> {
  if (src.startsWith('W-')) return winners.get(src) || 'TBD';

  // Formato: "1A" = 1° del Grupo A, "3rd" = mejor 3°
  const pos = parseInt(src[0]);
  if (pos === 3) return thirdPlaces[0]?.name || 'TBD';

  const g = src[1];
  const t = standings.get(g);
  return t && t[pos - 1] ? t[pos - 1].name : 'TBD';
}

async function simulateKnockout(
  standings: Map<string, GroupTeamStanding[]>,
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

  // Best 3rd place
  const thirdPlaces: { name: string; pts: number; gd: number; gf: number }[] = [];
  for (const letter of ['A','B','C','D','E','F','G','H','I','J','K','L']) {
    const teams = standings.get(letter);
    if (teams && teams.length >= 3) {
      thirdPlaces.push({ name: teams[2].name, pts: teams[2].points, gd: teams[2].goalDiff, gf: teams[2].goalsFor });
    }
  }
  thirdPlaces.sort((a, b) =>
    b.pts !== a.pts ? b.pts - a.pts :
    b.gd !== a.gd ? b.gd - a.gd :
    b.gf - a.gf
  );

  // Round of 32
  const r32def = [
    '1A|3rd','2A|2B','1B|3rd','1C|3rd','2C|2D','1D|3rd','1E|3rd','2E|2F',
    '1F|3rd','1G|3rd','2G|2H','1H|3rd','1I|3rd','2I|2J','1J|3rd','1K|3rd'
  ];
  const roundOf32: SimulatedMatch[] = [];

  for (let i = 0; i < r32def.length; i++) {
    const [h, a] = r32def[i].split('|');
    const home = await resolveTeam(h, standings, thirdPlaces, winners);
    const away = await resolveTeam(a, standings, thirdPlaces, winners);
    const m = await simulateMatch(home, away, undefined, true);
    m.id = `R32-${i + 1}`;
    m.roundLabel = '1/16 Final';
    roundOf32.push(m);
    if (m.winner !== 'TBD') winners.set(`W-R32-${i + 1}`, m.winner);
    if (onProgress) onProgress(`1/16: ${m.homeTeam} vs ${m.awayTeam} → ${m.winner}`);
  }

  // Round of 16
  const r16def = [
    'W-R32-1|W-R32-2','W-R32-3|W-R32-4','W-R32-5|W-R32-6','W-R32-7|W-R32-8',
    'W-R32-9|W-R32-10','W-R32-11|W-R32-12','W-R32-13|W-R32-14','W-R32-15|W-R32-16'
  ];
  const roundOf16: SimulatedMatch[] = [];
  for (let i = 0; i < r16def.length; i++) {
    const [h, a] = r16def[i].split('|');
    const home = await resolveTeam(h, standings, thirdPlaces, winners);
    const away = await resolveTeam(a, standings, thirdPlaces, winners);
    const m = await simulateMatch(home, away, undefined, true);
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
    const home = await resolveTeam(h, standings, thirdPlaces, winners);
    const away = await resolveTeam(a, standings, thirdPlaces, winners);
    const m = await simulateMatch(home, away, undefined, true);
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
    const home = await resolveTeam(h, standings, thirdPlaces, winners);
    const away = await resolveTeam(a, standings, thirdPlaces, winners);
    const m = await simulateMatch(home, away, undefined, true);
    m.id = `SF-${i + 1}`;
    m.roundLabel = 'Semifinales';
    semis.push(m);
    if (m.winner !== 'TBD') winners.set(`W-SF-${i + 1}`, m.winner);
    if (onProgress) onProgress(`Semis: ${m.homeTeam} vs ${m.awayTeam} → ${m.winner}`);
  }

  // Third place
  const losers = semis.map((m) => m.winner === m.homeTeam ? m.awayTeam : m.homeTeam);
  const thirdPlace = await simulateMatch(losers[0] || 'TBD', losers[1] || 'TBD', undefined, true);
  thirdPlace.id = 'TP-1';
  thirdPlace.roundLabel = 'Tercer Puesto';

  // Final
  const final = await simulateMatch(semis[0]?.winner || 'TBD', semis[1]?.winner || 'TBD', undefined, true);
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

  // Convert array to map for faster lookups
  const resultsMap = new Map<string, RealMatchResult>();
  for (const r of realResults) {
    resultsMap.set(`${r.matchId}`, r);
  }

  if (onProgress) onProgress('Simulando fase de grupos con motor estadístico real...');

  // Phase 1: Group Stage
  const standings = await simulateGroups(resultsMap, onProgress);

  const groupStandings: GroupStandings[] = [];
  for (const letter of ['A','B','C','D','E','F','G','H','I','J','K','L']) {
    groupStandings.push({ group: letter, teams: standings.get(letter) || [] });
  }

  // Phase 2: Knockout
  if (onProgress) onProgress('Simulando eliminatorias con Poisson + Elo...');
  const knockout = await simulateKnockout(standings, resultsMap, onProgress);

  // Determine champion
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
  bracket: TournamentBracket; // Última simulación para mostrar bracket
}

/**
 * Ejecuta múltiples simulaciones del torneo y calcula la probabilidad
 * de cada equipo de ser campeón basándose en la frecuencia de victorias.
 *
 * @param numSims Número de simulaciones (default 100)
 * @param realResults Resultados reales para incorporar
 * @param onProgress Callback de progreso
 */
export async function simulateTournamentMulti(
  numSims = 100,
  realResults: RealMatchResult[] = [],
  onProgress?: (msg: string) => void
): Promise<MultiSimResult> {
  const championCounts = new Map<string, number>();
  let lastBracket: TournamentBracket | null = null;

  // Convertir resultados reales una vez
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
      // Re-simular grupos y eliminatorias para cada iteración
      const standings = await simulateGroups(resultsMap);
      const knockout = await simulateKnockout(standings, resultsMap);

      const champion = knockout.final.winner;
      if (champion && champion !== 'TBD') {
        championCounts.set(champion, (championCounts.get(champion) || 0) + 1);
      }

      // Guardar la última simulación para mostrar bracket
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
      // Saltar simulaciones fallidas silenciosamente
    }
  }

  // Construir Top 8
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

  // Asegurar que tenemos un bracket válido
  if (!lastBracket) {
    if (onProgress) onProgress('Simulación de respaldo...');
    lastBracket = await simulateTournament({ realResults, onProgress });
  }

  if (onProgress) {
    const leader = top8[0];
    onProgress(`🏆 ${leader?.team || 'N/A'} lidera con ${leader?.pct || 0}% de probabilidad (${top8.length} equipos en Top 8)`);
  }

  return {
    top8,
    totalSims: numSims,
    bracket: lastBracket,
  };
}
