// FORCH.i ORACLE — Fetch de datos de API-Football (gratis: 100 req/día)
import { getTeamEnglishName } from './teams';

const getApiKey = () => process.env.FOOTBALL_API_KEY;
const BASE_URL = 'https://v3.football.api-sports.io';

export interface TeamStats {
  injuries: string[];
  recentForm: string[]; // 'W', 'D', 'L' for the queried team
  headToHead: string;
}

/**
 * Fetch genérico con manejo de errores y TIMEOUT de 5 segundos
 */
async function apiFetch(endpoint: string): Promise<Record<string, unknown> | null> {
  const API_KEY = getApiKey();
  if (!API_KEY) {
    console.warn('[football-api] FOOTBALL_API_KEY no configurada — usando datos genéricos');
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'x-apisports-key': API_KEY,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`[football-api] HTTP ${response.status}: ${body}`);
      return null;
    }

    const data = await response.json();

    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error('[football-api] API errors:', JSON.stringify(data.errors));
      return null;
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[football-api] TIMEOUT (5s) en', endpoint);
    } else {
      console.error('[football-api] Fetch error:', error);
    }
    return null;
  }
}

/**
 * Obtiene lesiones de un equipo (endpoint: /injuries)
 */
async function getInjuries(teamName: string): Promise<string[]> {
  const apiName = getTeamEnglishName(teamName);
  const data = await apiFetch(`/injuries?team=${encodeURIComponent(apiName)}&league=1&season=2025`);

  if (!data?.response) return [];

  const injuries: string[] = [];
  for (const item of (data.response as Record<string, unknown>[]).slice(0, 5)) {
    const player = item.player as Record<string, string> | undefined;
    const reason = item.reason as string | undefined;
    if (player?.name) {
      injuries.push(`${player.name}${reason ? ` (${reason})` : ''}`);
    }
  }
  return injuries;
}

/**
 * Obtiene forma reciente de un equipo (últimos 5 resultados)
 */
async function getRecentForm(teamName: string): Promise<string[]> {
  const apiName = getTeamEnglishName(teamName);
  const data = await apiFetch(`/fixtures?team=${encodeURIComponent(apiName)}&last=5`);

  if (!data?.response) return [];

  const form: string[] = [];
  for (const fixture of (data.response as Record<string, unknown>[]).slice(0, 5)) {
    const fixtureTeams = fixture.teams as Record<string, Record<string, unknown>> | undefined;
    const goals = fixture.goals as Record<string, number | null> | undefined;

    if (!fixtureTeams || !goals) continue;

    const homeTeam = fixtureTeams.home as Record<string, unknown> | undefined;
    const awayTeam = fixtureTeams.away as Record<string, unknown> | undefined;

    const homeName = homeTeam?.name as string | undefined;
    const isQueriedTeamHome = homeName?.toLowerCase() === apiName.toLowerCase();
    const homeWinner = homeTeam?.winner as boolean | null | undefined;

    if (homeWinner === null || homeWinner === undefined) {
      form.push('D');
    } else if (isQueriedTeamHome) {
      form.push(homeWinner ? 'W' : 'L');
    } else {
      form.push(homeWinner ? 'L' : 'W');
    }
  }
  return form;
}

/**
 * Obtiene enfrentamientos directos
 */
async function getHeadToHead(homeTeam: string, awayTeam: string): Promise<string> {
  const homeApi = getTeamEnglishName(homeTeam);
  const awayApi = getTeamEnglishName(awayTeam);
  const data = await apiFetch(`/fixtures/headtohead?h2h=${encodeURIComponent(`${homeApi}-${awayApi}`)}&last=5`);

  if (!data?.response) return 'Sin datos de enfrentamientos directos';

  const results: string[] = [];
  for (const fixture of (data.response as Record<string, unknown>[]).slice(0, 5)) {
    const fixtureTeams = fixture.teams as Record<string, Record<string, unknown>> | undefined;
    const goals = fixture.goals as Record<string, number | null> | undefined;

    if (!fixtureTeams || !goals) continue;

    const homeName = fixtureTeams.home?.name as string | undefined;
    const homeGoals = goals.home;
    const awayGoals = goals.away;

    if (homeName && homeGoals !== null && homeGoals !== undefined && awayGoals !== null && awayGoals !== undefined) {
      results.push(`${homeName} ${homeGoals}-${awayGoals} ${fixtureTeams.away?.name ?? ''}`);
    }
  }
  return results.length > 0 ? `Últimos H2H: ${results.join(' | ')}` : 'Sin enfrentamientos recientes';
}

/**
 * Obtiene datos completos de un equipo
 */
export async function getTeamStats(teamName: string): Promise<TeamStats> {
  const [injuries, recentForm] = await Promise.all([
    getInjuries(teamName),
    getRecentForm(teamName),
  ]);

  return {
    injuries,
    recentForm,
    headToHead: '',
  };
}

/**
 * Obtiene estadísticas REALISTAS de ataque y defensa desde API-Football
 * Endpoint: /teams/statistics → goles anotados/concedidos por partido
 */
export interface RealTeamStats {
  attackStrength: number;   // goles a favor por partido (0-4)
  defenseStrength: number;  // goles en contra por partido (0-4)
  winRate: number;          // % victorias (0-100)
  cleanSheetRate: number;   // % porterías imbatidas
  goalsPerMatch: number;    // promedio goles anotados
  goalsConcededPerMatch: number; // promedio goles concedidos
  form: string;             // últimos 5 partidos como string "WWDLL"
}

export async function getRealTeamStats(
  teamName: string,
  leagueId = 1,
  season = 2025
): Promise<RealTeamStats | null> {
  const apiName = getTeamEnglishName(teamName);
  const data = await apiFetch(
    `/teams/statistics?league=${leagueId}&season=${season}&team=${encodeURIComponent(apiName)}`
  );

  if (!data?.response) return null;

  const response = data.response as Record<string, unknown>;
  const fixtures = response.fixtures as Record<string, unknown> | undefined;
  const goals = response.goals as Record<string, unknown> | undefined;
  const form = response.form as string | undefined;

  if (!fixtures || !goals) return null;

  const played = (fixtures as Record<string, Record<string, number>>).played?.total || 0;
  const wins = (fixtures as Record<string, Record<string, number>>).wins?.total || 0;
  const goalsObj = goals as Record<string, { total: number; average: string }>;
  const goalsFor = goalsObj.for?.total || 0;
  const goalsAgainst = goalsObj.against?.total || 0;

  if (played === 0) return null;

  return {
    attackStrength: goalsFor / played,
    defenseStrength: goalsAgainst / played,
    winRate: Math.round((wins / played) * 100),
    cleanSheetRate: 0,
    goalsPerMatch: goalsFor / played,
    goalsConcededPerMatch: goalsAgainst / played,
    form: form || '',
  };
}

/**
 * Obtiene estadísticas de un equipo buscando en las principales ligas
 */
export async function getComprehensiveTeamStats(
  teamName: string
): Promise<RealTeamStats | null> {
  const leaguesToTry = [
    { id: 39, name: 'Premier League' },
    { id: 140, name: 'La Liga' },
    { id: 78, name: 'Bundesliga' },
    { id: 135, name: 'Serie A' },
    { id: 61, name: 'Ligue 1' },
    { id: 94, name: 'Primeira Liga' },
    { id: 88, name: 'Eredivisie' },
    { id: 203, name: 'Liga MX' },
    { id: 71, name: 'Serie A Brazil' },
    { id: 128, name: 'Liga Argentina' },
    { id: 262, name: 'Liga USA' },
    { id: 1, name: 'World Cup' },
  ];

  for (const league of leaguesToTry) {
    const stats = await getRealTeamStats(teamName, league.id, 2025);
    if (stats && stats.attackStrength > 0) {
      console.log(`[football-api] Stats for ${teamName} from ${league.name}`);
      return stats;
    }
  }

  for (const league of leaguesToTry.slice(0, 8)) {
    const stats = await getRealTeamStats(teamName, league.id, 2024);
    if (stats && stats.attackStrength > 0) {
      return stats;
    }
  }

  return null;
}

/**
 * Obtiene contexto completo para la predicción
 */
export async function getMatchContext(
  homeTeam: string,
  awayTeam: string
): Promise<string> {
  const [homeStats, awayStats, h2h] = await Promise.all([
    getTeamStats(homeTeam),
    getTeamStats(awayTeam),
    getHeadToHead(homeTeam, awayTeam),
  ]);

  const context = `
=== EQUIPO LOCAL: ${homeTeam} ===
Lesiones conocidas: ${homeStats.injuries.length > 0 ? homeStats.injuries.join(', ') : 'Ninguna conocida'}
Forma reciente: ${homeStats.recentForm.length > 0 ? homeStats.recentForm.join('') : 'Sin datos recientes'}

=== EQUIPO VISITANTE: ${awayTeam} ===
Lesiones conocidas: ${awayStats.injuries.length > 0 ? awayStats.injuries.join(', ') : 'Ninguna conocida'}
Forma reciente: ${awayStats.recentForm.length > 0 ? awayStats.recentForm.join('') : 'Sin datos recientes'}

=== ENFRENTAMIENTOS DIRECTOS ===
${h2h}
`;

  return context;
}

// ═══════════════════════════════════════════════════════════════
// FUNCIONES DINÁMICAS — Datos en vivo desde API-Football
// ═══════════════════════════════════════════════════════════════

export interface TeamDetailedStats {
  league?: {
    name: string;
    country: string;
    logo: string;
    season: number;
  };
  form: string;
  fixtures: {
    played: { total: number; home: number; away: number };
    wins: { total: number; home: number; away: number };
    draws: { total: number; home: number; away: number };
    loses: { total: number; home: number; away: number };
  };
  goals: {
    for: { total: number; average: string };
    against: { total: number; average: string };
  };
  biggestStreak: { wins: number; draws: number; loses: number };
  cleanSheet: { total: number };
  failedToScore: { total: number };
}

export async function getTeamDetailedStats(
  teamName: string,
  leagueId = 1,
  season = 2025
): Promise<TeamDetailedStats | null> {
  const apiName = getTeamEnglishName(teamName);
  const data = await apiFetch(
    `/teams/statistics?league=${leagueId}&season=${season}&team=${encodeURIComponent(apiName)}`
  );

  if (!data?.response) return null;
  return data.response as TeamDetailedStats;
}

export interface TopPlayer {
  player: {
    id: number;
    name: string;
    firstname: string;
    lastname: string;
    age: number;
    nationality: string;
    photo: string;
  };
  statistics: Array<{
    team: { name: string; logo: string };
    league: { name: string; country: string; season: number };
    games: { appearances: number; minutes: number };
    goals: { total: number; assists: number; saves?: number };
    cards: { yellow: number; red: number };
  }>;
}

export async function getTopScorers(
  leagueId = 1,
  season = 2025
): Promise<TopPlayer[]> {
  const data = await apiFetch(`/players/topscorers?league=${leagueId}&season=${season}`);

  if (!data?.response) return [];
  return (data.response as TopPlayer[]).slice(0, 20);
}

export interface SquadPlayer {
  id: number;
  name: string;
  age: number;
  number: number;
  position: string;
  photo: string;
}

export async function getTeamSquad(teamName: string): Promise<SquadPlayer[]> {
  const apiName = getTeamEnglishName(teamName);
  const data = await apiFetch(`/players/squads?team=${encodeURIComponent(apiName)}`);

  if (!data?.response) return [];
  return (data.response as Array<{ player: SquadPlayer }>).map(
    (item) => item.player
  ).slice(0, 25);
}

export interface LiveFixture {
  fixture: {
    id: number;
    date: string;
    timestamp: number;
    venue: { name: string; city: string } | null;
    status: { long: string; short: string; elapsed: number | null };
  };
  league: {
    id: number;
    name: string;
    country: string;
    season: number;
    round: string;
  };
  teams: {
    home: { id: number; name: string; logo: string };
    away: { id: number; name: string; logo: string };
  };
  goals: { home: number | null; away: number | null };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
  };
}

export async function getWorldCupFixtures(
  leagueId = 9,
  season = 2026
): Promise<LiveFixture[]> {
  const data = await apiFetch(
    `/fixtures?league=${leagueId}&season=${season}`
  );

  if (!data?.response) return [];
  return data.response as LiveFixture[];
}

export async function searchTeam(query: string): Promise<Array<{
  team: { id: number; name: string; code: string; country: string; logo: string };
  venue: { name: string; city: string; capacity: number } | null;
}>> {
  const data = await apiFetch(`/teams?search=${encodeURIComponent(query)}`);

  if (!data?.response) return [];
  return data.response as Array<{
    team: { id: number; name: string; code: string; country: string; logo: string };
    venue: { name: string; city: string; capacity: number } | null;
  }>;
}
