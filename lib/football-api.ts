// FORCH.i ORACLE — Fetch de datos de API-Football (gratis: 100 req/día)

const API_KEY = process.env.FOOTBALL_API_KEY;
const BASE_URL = 'https://v3.football.api-sports.io';

// Mapeo de nombres en español a códigos API-Football
const TEAM_NAME_MAP: Record<string, string> = {
  'alemania': 'Germany',
  'francia': 'France',
  'inglaterra': 'England',
  'españa': 'Spain',
  'bélgica': 'Belgium',
  'países bajos': 'Netherlands',
  'portugal': 'Portugal',
  'italia': 'Italy',
  'croacia': 'Croatia',
  'dinamarca': 'Denmark',
  'suiza': 'Switzerland',
  'austria': 'Austria',
  'escocia': 'Scotland',
  'serbia': 'Serbia',
  'ucrania': 'Ukraine',
  'turquía': 'Turkey',
  'república checa': 'Czech Republic',
  'hungría': 'Hungary',
  'argentina': 'Argentina',
  'brasil': 'Brazil',
  'colombia': 'Colombia',
  'uruguay': 'Uruguay',
  'ecuador': 'Ecuador',
  'paraguay': 'Paraguay',
  'méxico': 'Mexico',
  'estados unidos': 'USA',
  'canadá': 'Canada',
  'costa rica': 'Costa Rica',
  'jamaica': 'Jamaica',
  'panamá': 'Panama',
  'marruecos': 'Morocco',
  'senegal': 'Senegal',
  'túnez': 'Tunisia',
  'camerún': 'Cameroon',
  'ghana': 'Ghana',
  'nigeria': 'Nigeria',
  'argelia': 'Algeria',
  'costa de marfil': 'Ivory Coast',
  'japón': 'Japan',
  'corea del sur': 'South Korea',
  'australia': 'Australia',
  'arabia saudita': 'Saudi Arabia',
  'irán': 'Iran',
  'qatar': 'Qatar',
  'irak': 'Iraq',
  'uzbekistán': 'Uzbekistan',
  'nueva zelanda': 'New Zealand',
};

export interface TeamStats {
  injuries: string[];
  recentForm: string[];
  headToHead: string;
}

/**
 * Convierte nombre español a inglés para la API
 */
function toApiName(spanishName: string): string {
  return TEAM_NAME_MAP[spanishName.toLowerCase()] || spanishName;
}

/**
 * Fetch genérico con manejo de errores
 */
async function apiFetch(endpoint: string): Promise<Record<string, unknown> | null> {
  if (!API_KEY) {
    console.warn('FOOTBALL_API_KEY no configurada — usando datos genéricos');
    return null;
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-apisports-key': API_KEY,
      },
    });

    if (!response.ok) {
      console.error(`API-Football error: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching API-Football:', error);
    return null;
  }
}

/**
 * Obtiene lesiones de un equipo (endpoint: /injuries)
 */
async function getInjuries(teamName: string): Promise<string[]> {
  const apiName = toApiName(teamName);
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
 * Obtiene forma reciente de un equipo (últimos resultados)
 */
async function getRecentForm(teamName: string): Promise<string[]> {
  const apiName = toApiName(teamName);
  const data = await apiFetch(`/fixtures?team=${encodeURIComponent(apiName)}&last=5&league=1&season=2025`);

  if (!data?.response) return [];

  const form: string[] = [];
  for (const fixture of (data.response as Record<string, unknown>[]).slice(0, 5)) {
    const teams = fixture.teams as Record<string, Record<string, boolean>> | undefined;
    const goals = fixture.goals as Record<string, number | null> | undefined;
    if (teams?.home?.winner !== undefined && goals) {
      const isHome = teams.home.winner;
      form.push(isHome ? 'W' : 'L');
    }
  }
  return form;
}

/**
 * Obtiene enfrentamientos directos
 */
async function getHeadToHead(homeTeam: string, awayTeam: string): Promise<string> {
  const homeApi = toApiName(homeTeam);
  const awayApi = toApiName(awayTeam);
  const data = await apiFetch(`/fixtures/headtohead?h2h=${encodeURIComponent(`${homeApi}-${awayApi}`)}&last=5`);

  if (!data?.response) return 'Sin datos de enfrentamientos directos';

  const results: string[] = [];
  for (const fixture of (data.response as Record<string, unknown>[]).slice(0, 5)) {
    const teams = fixture.goals as Record<string, number | null> | undefined;
    if (teams) {
      results.push(`${teams.home}-${teams.away}`);
    }
  }
  return results.length > 0 ? `Últimos H2H: ${results.join(', ')}` : 'Sin enfrentamientos recientes';
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
