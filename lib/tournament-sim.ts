// FORCH.i ORACLE — Fast Tournament Simulation Engine
// 100% deterministic — NO external API calls. Never times out.

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
  isPlayed: boolean;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  prediction: string;
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

// ─── Team Power Ratings (FIFA-based, updated WC2026) ──────────────────────

const POWER_RATINGS: Record<string, number> = {
  'Francia': 92, 'Brasil': 91, 'Argentina': 91, 'Inglaterra': 89, 'España': 88,
  'Alemania': 87, 'Portugal': 87, 'Países Bajos': 84, 'Bélgica': 83,
  'Croacia': 82, 'Italia': 82, 'Uruguay': 81, 'Colombia': 80, 'Marruecos': 80,
  'Dinamarca': 77, 'Suiza': 76, 'Austria': 75, 'Senegal': 75, 'México': 74,
  'Estados Unidos': 74, 'Japón': 74, 'Nigeria': 73, 'Corea del Sur': 73,
  'Ecuador': 73, 'Serbia': 72, 'Turquía': 72, 'Irán': 71, 'Escocia': 70,
  'Ucrania': 70, 'Canadá': 70, 'República Checa': 70, 'Hungría': 69,
  'Suecia': 69, 'Noruega': 65, 'Cameroon': 65, 'Camerún': 65,
  'Australia': 68, 'Arabia Saudita': 67, 'Túnez': 67, 'Ghana': 67, 'Egipto': 67,
  'Costa Rica': 65, 'Costa de Marfil': 65, 'Bosnia y Herzegovina': 64,
  'Paraguay': 64, 'Argelia': 64, 'Sudáfrica': 63, 'Qatar': 62, 'Irak': 62,
  'Uzbekistán': 61, 'Jamaica': 60, 'Panamá': 59, 'Jordania': 59,
  'Nueva Zelanda': 57, 'Haití': 56, 'Curazao': 55, 'Cabo Verde': 55,
  'RD Congo': 54,
};

function getPower(name: string): number {
  return POWER_RATINGS[name] || 50;
}

function getFlag(name: string): string {
  const t = WORLD_CUP_TEAMS.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return t?.flag || '🏳️';
}

// ─── Seeded Random ────────────────────────────────────────────────────────

function createRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── Match Simulation ─────────────────────────────────────────────────────

function playMatch(home: string, away: string, rng: () => number, knockout = false) {
  const hPow = getPower(home) + 5; // home advantage
  const aPow = getPower(away);
  const diff = hPow - aPow;

  const homeProb = Math.min(85, Math.max(10, Math.round(50 + diff * 2)));
  const drawProb = Math.round(12 + (1 - Math.abs(diff) / 40) * 15);
  const awayProb = Math.max(0, 100 - homeProb - drawProb);

  const r = rng() * 100;
  let hScore: number, aScore: number, winner: string;

  if (r < homeProb) {
    hScore = Math.floor(rng() * 3) + 1;
    aScore = Math.floor(rng() * 2);
    winner = home;
  } else if (r < homeProb + drawProb) {
    hScore = Math.floor(rng() * 3);
    aScore = hScore;
    winner = 'draw';
  } else {
    aScore = Math.floor(rng() * 3) + 1;
    hScore = Math.floor(rng() * 2);
    winner = away;
  }

  if (knockout && winner === 'draw') {
    // Extra time: slightly favor higher-rated team
    const extraTimeHome = rng() * hPow > rng() * aPow;
    if (extraTimeHome) {
      hScore += Math.floor(rng() * 2) + 1;
      winner = home;
    } else {
      aScore += Math.floor(rng() * 2) + 1;
      winner = away;
    }
  }

  const analysis = `${getFlag(home)} ${home} (${getPower(home)}) vs ${away} ${getFlag(away)} (${getPower(away)}). ${
    winner !== 'draw'
      ? `${winner} gana ${hScore}-${aScore}. `
      : `Empate ${hScore}-${aScore}. `
  }${hPow > aPow + 10 ? 'Diferencia de calidad notable.' : 'Partido parejo.'}`;

  return { hScore, aScore, winner, homeProb, drawProb, awayProb, analysis };
}

// ─── Groups ───────────────────────────────────────────────────────────────

function getGroups(): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const t of WORLD_CUP_TEAMS) {
    if (!map[t.group]) map[t.group] = [];
    map[t.group].push(t.name);
  }
  return map;
}

function simulateGroups(rng: () => number): Map<string, GroupTeamStanding[]> {
  const groups = getGroups();
  const standings = new Map<string, GroupTeamStanding[]>();

  for (const [letter, teams] of Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))) {
    const s: GroupTeamStanding[] = teams.map((n) => ({
      name: n, flag: getFlag(n), code: WORLD_CUP_TEAMS.find((t) => t.name === n)?.code || n.slice(0, 3).toUpperCase(),
      played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0,
    }));

    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const result = playMatch(teams[i], teams[j], rng);
        const h = s[i], a = s[j];
        h.played++; a.played++;
        h.goalsFor += result.hScore; h.goalsAgainst += result.aScore;
        a.goalsFor += result.aScore; a.goalsAgainst += result.hScore;
        h.goalDiff = h.goalsFor - h.goalsAgainst;
        a.goalDiff = a.goalsFor - a.goalsAgainst;
        if (result.winner === 'draw') { h.drawn++; a.drawn++; h.points += 1; a.points += 1; }
        else if (result.winner === teams[i]) { h.won++; a.lost++; h.points += 3; }
        else { a.won++; h.lost++; a.points += 3; }
      }
    }

    s.sort((a, b) => b.points !== a.points ? b.points - a.points : b.goalDiff !== a.goalDiff ? b.goalDiff - a.goalDiff : b.goalsFor - a.goalsFor);
    standings.set(letter, s);
  }
  return standings;
}

// ─── Knockout ─────────────────────────────────────────────────────────────

function mkMatch(id: string, roundLabel: string, home: string, away: string, rng: () => number, knockout = true): SimulatedMatch {
  if (home === 'TBD' || away === 'TBD') {
    return { id, round: 'knockout', roundLabel, homeTeam: home, awayTeam: away, homeFlag: '🏳️', awayFlag: '🏳️', homeScore: 0, awayScore: 0, winner: 'TBD', isPlayed: false, homeWinProb: 50, drawProb: 25, awayWinProb: 25, prediction: 'Por definir' };
  }
  const r = playMatch(home, away, rng, knockout);
  return {
    id, round: 'knockout', roundLabel,
    homeTeam: home, awayTeam: away,
    homeFlag: getFlag(home), awayFlag: getFlag(away),
    homeScore: r.hScore, awayScore: r.aScore,
    winner: r.winner === 'draw' ? (rng() > 0.5 ? home : away) : r.winner,
    isPlayed: false, homeWinProb: r.homeProb, drawProb: r.drawProb, awayWinProb: r.awayProb,
    prediction: r.analysis,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────

export async function simulateTournament(): Promise<TournamentBracket> {
  const SEED = Date.now();
  const rng = createRng(SEED);

  // Phase 1: Groups (instant)
  const standings = simulateGroups(rng);

  const groupStandings: GroupStandings[] = [];
  for (const letter of ['A','B','C','D','E','F','G','H','I','J','K','L']) {
    groupStandings.push({ group: letter, teams: standings.get(letter) || [] });
  }

  // Best 3rd place
  const thirdPlaces: { name: string; pts: number; gd: number; gf: number }[] = [];
  for (const letter of ['A','B','C','D','E','F','G','H','I','J','K','L']) {
    const teams = standings.get(letter);
    if (teams && teams.length >= 3) {
      thirdPlaces.push({ name: teams[2].name, pts: teams[2].points, gd: teams[2].goalDiff, gf: teams[2].goalsFor });
    }
  }
  thirdPlaces.sort((a, b) => b.pts !== a.pts ? b.pts - a.pts : b.gd !== a.gd ? b.gd - a.gd : b.gf - a.gf);

  const winners = new Map<string, string>();

  function resolve(src: string): string {
    if (src.startsWith('W-')) return winners.get(src) || 'TBD';
    const pos = parseInt(src[0]);
    const g = src[1];
    if (pos === 3) return thirdPlaces[0]?.name || 'TBD';
    const t = standings.get(g);
    return t && t[pos - 1] ? t[pos - 1].name : 'TBD';
  }

  // Phase 2: R32 (power ratings)
  const r32def = [
    '1A|3rd','2A|2B','1B|3rd','1C|3rd','2C|2D','1D|3rd','1E|3rd','2E|2F',
    '1F|3rd','1G|3rd','2G|2H','1H|3rd','1I|3rd','2I|2J','1J|3rd','1K|3rd'
  ];
  const roundOf32: SimulatedMatch[] = [];
  for (let i = 0; i < r32def.length; i++) {
    const [h, a] = r32def[i].split('|');
    const m = mkMatch(`R32-${i+1}`, '1/16 Final', resolve(h), resolve(a), rng, false);
    roundOf32.push(m);
    if (m.winner !== 'TBD') winners.set(`W-R32-${i+1}`, m.winner);
  }

  // Phase 3: R16
  const r16def = ['W-R32-1|W-R32-2','W-R32-3|W-R32-4','W-R32-5|W-R32-6','W-R32-7|W-R32-8',
    'W-R32-9|W-R32-10','W-R32-11|W-R32-12','W-R32-13|W-R32-14','W-R32-15|W-R32-16'];
  const roundOf16: SimulatedMatch[] = [];
  for (let i = 0; i < r16def.length; i++) {
    const [h, a] = r16def[i].split('|');
    const m = mkMatch(`R16-${i+1}`, 'Octavos de Final', resolve(h), resolve(a), rng);
    roundOf16.push(m);
    if (m.winner !== 'TBD') winners.set(`W-R16-${i+1}`, m.winner);
  }

  // Phase 4: QF
  const qfdef = ['W-R16-1|W-R16-2','W-R16-3|W-R16-4','W-R16-5|W-R16-6','W-R16-7|W-R16-8'];
  const quarters: SimulatedMatch[] = [];
  for (let i = 0; i < qfdef.length; i++) {
    const [h, a] = qfdef[i].split('|');
    const m = mkMatch(`QF-${i+1}`, 'Cuartos de Final', resolve(h), resolve(a), rng);
    quarters.push(m);
    if (m.winner !== 'TBD') winners.set(`W-QF-${i+1}`, m.winner);
  }

  // Phase 5: SF
  const sfdef = ['W-QF-1|W-QF-2','W-QF-3|W-QF-4'];
  const semis: SimulatedMatch[] = [];
  for (let i = 0; i < sfdef.length; i++) {
    const [h, a] = sfdef[i].split('|');
    const m = mkMatch(`SF-${i+1}`, 'Semifinales', resolve(h), resolve(a), rng);
    semis.push(m);
    if (m.winner !== 'TBD') winners.set(`W-SF-${i+1}`, m.winner);
  }

  // Phase 6: Third place
  const losers = semis.map((m) => m.winner === m.homeTeam ? m.awayTeam : m.homeTeam);
  const thirdPlace = mkMatch('TP-1', 'Tercer Puesto', losers[0] || 'TBD', losers[1] || 'TBD', rng);

  // Phase 7: Final
  const final = mkMatch('FINAL', 'La Gran Final', semis[0]?.winner || 'TBD', semis[1]?.winner || 'TBD', rng);

  const champion = final.winner;
  const runnerUp = champion === final.homeTeam ? final.awayTeam : final.homeTeam;
  const thirdTeam = thirdPlace.winner;
  const fourthTeam = thirdTeam === thirdPlace.homeTeam ? thirdPlace.awayTeam : thirdPlace.homeTeam;

  return {
    groups: groupStandings, roundOf32, roundOf16, quarters, semis,
    thirdPlace, final,
    champion, championFlag: getFlag(champion),
    runnerUp, runnerUpFlag: getFlag(runnerUp),
    thirdPlaceTeam: thirdTeam, thirdPlaceFlag: getFlag(thirdTeam),
    fourthPlaceTeam: fourthTeam, fourthPlaceFlag: getFlag(fourthTeam),
    simulatedAt: new Date().toISOString(),
  };
}
