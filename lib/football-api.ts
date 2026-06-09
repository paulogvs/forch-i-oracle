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
 * Fetch genérico con manejo de errores
 */
async function apiFetch(endpoint: string): Promise<Record<string, unknown> | null> {
  const API_KEY = getApiKey();
  if (!API_KEY) {
    console.warn('[football-api] FOOTBALL_API_KEY no configurada — usando datos genéricos');
    return null;
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'x-apisports-key': API_KEY,
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`[football-api] HTTP ${response.status}: ${body}`);
      return null;
    }

    const data = await response.json();

    // API-Football returns { errors: {...}, results: number, response: [...] }
    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error('[football-api] API errors:', JSON.stringify(data.errors));
      return null;
    }

    return data;
  } catch (error) {
    console.error('[football-api] Fetch error:', error);
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
 * Returns 'W', 'D', 'L' for the queried team specifically.
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

    // Determine if the queried team was home or away
    const homeName = homeTeam?.name as string | undefined;
    const awayName = awayTeam?.name as string | undefined;
    const isQueriedTeamHome = homeName?.toLowerCase() === apiName.toLowerCase();

    // The winner field tells us which side won
    const homeWinner = homeTeam?.winner as boolean | null | undefined;

    if (homeWinner === null || homeWinner === undefined) {
      form.push('D'); // draw
    } else if (isQueriedTeamHome) {
      form.push(homeWinner ? 'W' : 'L');
    } else {
      // Queried team was away — opposite result
      form.push(homeWinner ? 'L' : 'W');
    }
  }
  return form;
}

/**
 * Obtiene enfrentamientos directos con contexto de quién era local/visitante
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
    headToHead: '', // Se llena después con ambos equipos
  };
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
