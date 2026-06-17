// FORCH.i ORACLE — Enhanced Statistical Engine v2
// Improvements over predictor-engine.ts:
// - xG ajustado por competición
// - Momentum con pesos exponenciales
// - Fatiga (días entre partidos)
// - Home advantage realista para WC2026 (host nations + timezone proximity)
// - Impacto de lesiones con peso por rol del jugador
// - H2H ponderado por relevancia temporal

import { getAltitudeFactor } from './venues';
import { computeH2H } from './h2h';

// ═══════════════════════════════════════════════════════════════
// COMPETITION-ADJUSTED xG
// ═══════════════════════════════════════════════════════════════

const COMPETITION_FACTORS: Record<string, number> = {
  'World Cup': 1.0,
  'Euro': 0.95,
  'Copa America': 0.92,
  'UEFA Nations League': 0.88,
  'Friendly': 0.75,
  'WC Qualifiers': 0.85,
  'Gold Cup': 0.82,
  'Asian Cup': 0.80,
  'Africa Cup': 0.83,
  'Confederations Cup': 0.90,
};

/**
 * Calcula xG ajustado por nivel de competición.
 * Los goles en amistosos valen menos que en Mundiales.
 * 
 * @param teamName Nombre del equipo
 * @param rawXG Array de goles/xG por partido con su competición
 * @returns xG promedio ponderado por importancia de competición
 */
export function calculateAdjustedXG(
  teamName: string,
  rawXG: Array<{ goals: number; competition: string; date: string }>
): number {
  if (rawXG.length === 0) return 1.2; // baseline

  // Ordenar por fecha (más reciente primero)
  const sorted = [...rawXG].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Peso temporal: más reciente = más importante
  const timeWeights = [1.2, 1.0, 0.85, 0.7, 0.55, 0.4, 0.3, 0.2];

  let totalWeight = 0;
  let weightedXG = 0;

  for (let i = 0; i < sorted.length; i++) {
    const match = sorted[i];
    const timeW = timeWeights[Math.min(i, timeWeights.length - 1)];
    const compFactor = COMPETITION_FACTORS[match.competition] ?? 0.80;

    const adjustedGoalValue = match.goals * compFactor;
    const combinedWeight = timeW * compFactor;

    weightedXG += adjustedGoalValue * combinedWeight;
    totalWeight += combinedWeight;
  }

  const result = totalWeight > 0 ? weightedXG / totalWeight : 1.2;
  return Math.max(0.3, Math.min(4.0, result));
}

// ═══════════════════════════════════════════════════════════════
// MOMENTUM — Exponential decay weighting
// ═══════════════════════════════════════════════════════════════

export interface MatchResult {
  opponent: string;
  goalsFor: number;
  goalsAgainst: number;
  result: 'W' | 'D' | 'L';
  date: string;
  competition?: string;
}

/**
 * Calcula momentum de un equipo basado en sus últimos partidos.
 * Los partidos más recientes pesan más (decay exponencial).
 * 
 * @param matches Últimos partidos del equipo
 * @returns Momentum score: -1.0 (mala racha) a +1.0 (buena racha)
 */
export function calculateMomentum(matches: MatchResult[]): number {
  if (matches.length === 0) return 0;

  const last5 = matches.slice(-5);

  // Pesos exponenciales: el más reciente cuenta más
  const weights = [0.35, 0.25, 0.20, 0.12, 0.08].slice(0, last5.length);

  // Normalizar pesos
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  const normalizedWeights = weights.map(w => w / totalWeight);

  // Score por partido: W=1, D=0, L=-1, ajustado por goles
  const matchScores = last5.map(m => {
    const baseScore = m.result === 'W' ? 1 : m.result === 'L' ? -1 : 0;
    const goalDiff = m.goalsFor - m.goalsAgainst;
    return baseScore + (goalDiff * 0.1); // bonus por diferencia de goles
  });

  // Momentum ponderado
  let momentum = 0;
  for (let i = 0; i < matchScores.length; i++) {
    momentum += matchScores[i] * normalizedWeights[i];
  }

  return Math.max(-1, Math.min(1, momentum));
}

// ═══════════════════════════════════════════════════════════════
// FATIGA — Días de descanso
// ═══════════════════════════════════════════════════════════════

/**
 * Calcula penalización por fatiga basada en días de descanso.
 * 
 * @param daysSinceLastMatch Días desde el último partido
 * @returns Ajuste al rendimiento: negativo = penalización, positivo = fresco
 */
export function calculateFatigue(daysSinceLastMatch: number): number {
  if (daysSinceLastMatch < 2) return -0.15;  // Muy poco descanso = fatiga severa
  if (daysSinceLastMatch < 3) return -0.12;  // Poco descanso
  if (daysSinceLastMatch < 4) return -0.05;  // Ligeramente cansado
  if (daysSinceLastMatch <= 7) return 0;     // Rango óptimo
  if (daysSinceLastMatch <= 14) return 0.03; // Bien descansado
  return 0.05; // Demasiado tiempo = posible "rusty" pero fresco físicamente
}

// ═══════════════════════════════════════════════════════════════
// HOME ADVANTAGE — WC2026 realista
// ═══════════════════════════════════════════════════════════════

// Países anfitriones de WC2026
const HOST_COUNTRIES = ['Estados Unidos', 'Canadá', 'México'];

// Timezones aproximados de equipos (UTC offset)
const TEAM_TIMEZONES: Record<string, number> = {
  // CONCACAF
  'Estados Unidos': -5, 'Canadá': -5, 'México': -6, 'Panamá': -5,
  'Costa Rica': -6, 'Jamaica': -5, 'Haití': -5, 'Curazao': -4,
  'Honduras': -6, 'Guatemala': -6,
  // Sudamérica
  'Argentina': -3, 'Brasil': -3, 'Colombia': -5, 'Ecuador': -5,
  'Uruguay': -3, 'Paraguay': -4, 'Chile': -4, 'Perú': -5,
  'Venezuela': -4, 'Bolivia': -4,
  // Europa
  'España': 1, 'Francia': 1, 'Alemania': 1, 'Inglaterra': 0,
  'Portugal': 0, 'Países Bajos': 1, 'Bélgica': 1, 'Italia': 1,
  'Croacia': 1, 'Suiza': 1, 'Austria': 1, 'Dinamarca': 1,
  'Suecia': 1, 'Noruega': 1, 'Serbia': 1, 'Turquía': 3,
  'Escocia': 0, 'Chequia': 1, 'Grecia': 2, 'Polonia': 1,
  'Ucrania': 2, 'Hungría': 1, 'Rumanía': 2, 'Irlanda': 0,
  // África
  'Marruecos': 1, 'Senegal': 0, 'Egipto': 2, 'Argelia': 1,
  'Túnez': 1, 'Nigeria': 1, 'Ghana': 0, 'Costa de Marfil': 0,
  'Sudáfrica': 2, 'Cabo Verde': -1, 'RD Congo': 1, 'Camerún': 1,
  // Asia/Oceanía
  'Japón': 9, 'Corea del Sur': 9, 'Australia': 10, 'Irán': 3,
  'Arabia Saudita': 3, 'Irak': 3, 'Uzbekistán': 5, 'Qatar': 3,
  'Jordania': 2, 'Nueva Zelanda': 12, 'India': 5, 'China': 8,
};

/**
 * Calcula ventaja de local realista para WC2026.
 * 
 * Factores:
 * 1. Ser anfitrión (USA/CAN/MEX) = +8%
 * 2. Mismo continente = +3-5%
 * 3. Proximidad timezone = bonus adicional
 * 
 * @param teamCode Código FIFA del equipo
 * @param venueVenue Nombre del estadio
 * @returns Ajuste de probabilidad (0 a 0.15)
 */
export function calculateHomeAdvantage(teamCode: string, venueName: string): number {
  // WC2026 venues están en USA, Canadá y México
  const isHostNation = HOST_COUNTRIES.includes(teamCode);

  if (isHostNation) {
    return 0.08; // +8% para anfitriones
  }

  // Determinar continente del equipo
  const continent = getTeamContinent(teamCode);
  const venueContinent = 'CONCACAF'; // Todos los venues WC2026 están en NA

  if (continent === venueContinent) {
    // Mismo continente = ventaja moderada
    const tzDiff = getTimezoneDiff(teamCode, venueName);
    return Math.max(0, 0.05 - (Math.abs(tzDiff) * 0.01));
  }

  // Continentes diferentes = sin ventaja local
  return 0;
}

function getTeamContinent(code: string): string {
  const concacaf = ['Estados Unidos', 'Canadá', 'México', 'Panamá', 'Costa Rica', 'Jamaica', 'Haití', 'Curazao', 'Honduras', 'Guatemala'];
  const southAmerica = ['Argentina', 'Brasil', 'Colombia', 'Ecuador', 'Uruguay', 'Paraguay', 'Chile', 'Perú', 'Venezuela', 'Bolivia'];
  const europe = ['España', 'Francia', 'Alemania', 'Inglaterra', 'Portugal', 'Países Bajos', 'Bélgica', 'Italia', 'Croacia', 'Suiza', 'Austria', 'Dinamarca', 'Suecia', 'Noruega', 'Serbia', 'Turquía', 'Escocia', 'Chequia', 'Grecia', 'Polonia', 'Ucrania', 'Hungría', 'Rumanía', 'Irlanda'];
  const africa = ['Marruecos', 'Senegal', 'Egipto', 'Argelia', 'Túnez', 'Nigeria', 'Ghana', 'Costa de Marfil', 'Sudáfrica', 'Cabo Verde', 'RD Congo', 'Camerún'];
  const asia = ['Japón', 'Corea del Sur', 'Australia', 'Irán', 'Arabia Saudita', 'Irak', 'Uzbekistán', 'Qatar', 'Jordania', 'Nueva Zelanda'];

  if (concacaf.includes(code)) return 'CONCACAF';
  if (southAmerica.includes(code)) return 'CONMEBOL';
  if (europe.includes(code)) return 'UEFA';
  if (africa.includes(code)) return 'CAF';
  if (asia.includes(code)) return 'AFC';
  return 'OTHER';
}

function getTimezoneDiff(teamCode: string, _venueName: string): number {
  const teamTZ = TEAM_TIMEZONES[teamCode] ?? 0;
  // Promedio de venues WC2026 ≈ UTC-5
  const venueTZ = -5;
  return teamTZ - venueTZ;
}

// ═══════════════════════════════════════════════════════════════
// INJURY IMPACT — Weighted by player role
// ═══════════════════════════════════════════════════════════════

export interface InjuredPlayer {
  name: string;
  position: string; // 'GK', 'DEF', 'MID', 'FWD'
  isStarter: boolean;
  injuryType?: string;
  expectedReturn?: string;
}

/**
 * Calcula impacto de lesiones en el rendimiento del equipo.
 * 
 * Pesos:
 * - Titular lesionado: -5% al rendimiento
 * - Suplente lesionado: -2%
 * - Portero titular: -8%
 * - Goleador titular: -6%
 * 
 * @param injuries Lista de jugadores lesionados
 * @returns Penalización al rendimiento (0 a -0.25)
 */
export function calculateInjuryImpact(injuries: InjuredPlayer[]): number {
  if (!injuries || injuries.length === 0) return 0;

  let impact = 0;

  for (const injury of injuries) {
    if (injury.isStarter) {
      // Titulares lesionados impactan más
      if (injury.position === 'GK') {
        impact += 0.08; // Portero titular = crítico
      } else if (injury.position === 'FWD') {
        impact += 0.06; // Goleador titular
      } else if (injury.position === 'MID') {
        impact += 0.05; // Centrocampista titular
      } else {
        impact += 0.05; // Defensor titular
      }
    } else {
      impact += 0.02; // Suplente
    }
  }

  // Clamp máximo -25% de rendimiento
  return Math.min(impact, 0.25);
}

// ═══════════════════════════════════════════════════════════════
// H2H HISTÓRICO PONDERADO
// ═══════════════════════════════════════════════════════════════

export interface H2HMatch {
  teamAScore: number;
  teamBScore: number;
  date: string;
  competition?: string;
}

/**
 * Calcula factor H2H ponderado por relevancia temporal.
 * Partidos más recientes y de competiciones oficiales pesan más.
 * 
 * @param teamA Nombre del equipo A
 * @param teamB Nombre del equipo B
 * @param h2hMatches Historial de enfrentamientos
 * @returns Factor H2H: 0.85 (teamB domina) a 1.15 (teamA domina)
 */
export function calculateH2HFactorWeighted(
  teamA: string,
  teamB: string,
  h2hMatches: H2HMatch[]
): number {
  if (!h2hMatches || h2hMatches.length < 2) {
    // Sin datos suficientes, usar computeH2H del módulo h2h.ts
    const h2h = computeH2H(teamA, teamB);
    return h2h.factor;
  }

  // Ordenar por fecha (más reciente primero)
  const sorted = [...h2hMatches].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Pesos temporales
  const weights = [1.5, 1.2, 1.0, 0.8, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];

  let teamAWins = 0;
  let teamBWins = 0;
  let totalWeight = 0;

  for (let i = 0; i < sorted.length; i++) {
    const match = sorted[i];
    const w = weights[Math.min(i, weights.length - 1)];

    // Bonus por competición oficial
    const compBonus = match.competition === 'World Cup' ? 1.5 : 1.0;
    const adjustedWeight = w * compBonus;

    if (match.teamAScore > match.teamBScore) {
      teamAWins += adjustedWeight;
    } else if (match.teamBScore > match.teamAScore) {
      teamBWins += adjustedWeight;
    }

    totalWeight += adjustedWeight;
  }

  if (totalWeight === 0) return 1.0;

  const winRate = teamAWins / totalWeight;

  // Mapear win rate a factor: 0.5 → 1.0, 0.75 → 1.15, 0.25 → 0.85
  const factor = 1.0 + (winRate - 0.5) * 0.3;
  return Math.max(0.85, Math.min(1.15, factor));
}

// ═══════════════════════════════════════════════════════════════
// TRAVEL DISTANCE — Fatigue from venue changes
// ═══════════════════════════════════════════════════════════════

// Approximate coordinates of WC2026 venues [lat, lng]
const VENUE_COORDS: Record<string, [number, number]> = {
  'Estadio Azteca': [19.304, -99.138],
  'Estadio Akron': [20.668, -103.458],
  'Estadio BBVA': [25.726, -100.173],
  "Levi's Stadium": [37.403, -121.970],
  'SoFi Stadium': [33.954, -118.339],
  'Hard Rock Stadium': [25.958, -80.239],
  'MetLife Stadium': [40.813, -74.074],
  'AT&T Stadium': [32.747, -97.093],
  'NRG Stadium': [29.685, -95.411],
  'Lumen Field': [47.596, -122.332],
  'Lincoln Financial Field': [39.901, -75.167],
  'Mercedes-Benz Stadium': [33.755, -84.401],
  'Arrowhead Stadium': [39.049, -94.484],
  'Gillette Stadium': [42.091, -71.264],
  'BMO Field': [43.633, -79.418],
  'BC Place': [49.277, -123.112],
};

/**
 * Haversine distance between two venues in km.
 */
function venueDistance(venueA: string, venueB: string): number {
  const a = VENUE_COORDS[venueA];
  const b = VENUE_COORDS[venueB];
  if (!a || !b) return 0;

  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Fatigue penalty from travel distance.
 * > 2000km = significant fatigue, < 500km = negligible.
 */
export function calculateTravelFatigue(
  previousVenue: string | undefined,
  currentVenue: string | undefined
): number {
  if (!previousVenue || !currentVenue) return 0;
  if (previousVenue === currentVenue) return 0;

  const dist = venueDistance(previousVenue, currentVenue);
  if (dist < 500) return 0;
  if (dist < 1500) return -0.03;
  if (dist < 3000) return -0.06;
  return -0.10; // Cross-country or international
}

// ═══════════════════════════════════════════════════════════════
// PREDICTION CONTEXT — Structured data for cron jobs
// ═══════════════════════════════════════════════════════════════

export interface EnhancedPredictionContext {
  teamName: string;
  recentMatches?: MatchResult[];
  injuries?: InjuredPlayer[];
  h2hHistory?: H2HMatch[];
  venue?: string;
  competition?: string;
  daysSinceLastMatch?: number;
}

/**
 * Calcula ajuste compuesto al lambda (goles esperados) basado en
 * todos los factores mejorados.
 * 
 * @param context Contexto del partido
 * @returns Ajuste multiplicativo al lambda (0.7 a 1.3)
 */
export function calculateCompositeAdjustment(
  context: EnhancedPredictionContext
): number {
  let adjustment = 1.0;

  // 1. Momentum
  if (context.recentMatches && context.recentMatches.length > 0) {
    const momentum = calculateMomentum(context.recentMatches);
    adjustment *= (1 + momentum * 0.12); // ±12% máximo
  }

  // 2. Fatiga
  if (context.daysSinceLastMatch !== undefined) {
    const fatigue = calculateFatigue(context.daysSinceLastMatch);
    adjustment *= (1 + fatigue);
  }

  // 3. Home advantage
  if (context.venue) {
    const homeAdv = calculateHomeAdvantage(context.teamName, context.venue);
    adjustment *= (1 + homeAdv);
  }

  // 4. Lesiones
  if (context.injuries && context.injuries.length > 0) {
    const injuryImpact = calculateInjuryImpact(context.injuries);
    adjustment *= (1 - injuryImpact);
  }

  // Note: Altitude and H2H are already applied by the base engine
  // (predictor-engine.ts lines 361-372). Do NOT re-apply here to avoid
  // double-counting these factors.

  return Math.max(0.7, Math.min(1.3, adjustment));
}

// ═══════════════════════════════════════════════════════════════
// COMPETITION STRENGTH — Adjust team rating by competition level
// ═══════════════════════════════════════════════════════════════

/**
 * Ajusta el rating de un equipo según el nivel de competición
 * donde generó sus estadísticas.
 * 
 * @param baseRating Rating base del equipo (Elo-derived)
 * @param competitionSource Competición de origen de las stats
 * @returns Rating ajustado
 */
export function adjustRatingByCompetition(
  baseRating: number,
  competitionSource: string
): number {
  const factor = COMPETITION_FACTORS[competitionSource] ?? 0.85;

  // Si las stats vienen de una competición de bajo nivel, reducir rating
  // Si vienen de Mundial, mantener rating base
  if (factor < 0.9) {
    return Math.round(baseRating * factor);
  }

  return baseRating;
}

// ═══════════════════════════════════════════════════════════════
// FORM ADJUSTMENT — Enhanced version with competition weighting
// ═══════════════════════════════════════════════════════════════

/**
 * Convierte forma reciente en ajuste, ponderando por competición.
 * Una racha de victorias en Mundial vale más que en amistosos.
 * 
 * @param matches Últimos partidos
 * @returns Ajuste numérico (-0.15 a +0.15)
 */
export function enhancedFormAdjustment(matches: MatchResult[]): number {
  if (matches.length === 0) return 0;

  const last5 = matches.slice(-5);
  const weights = [0.5, 0.7, 0.9, 1.0, 1.2].slice(0, last5.length);

  let adjustment = 0;
  let totalWeight = 0;

  for (let i = 0; i < last5.length; i++) {
    const match = last5[i];
    const compFactor = COMPETITION_FACTORS[match.competition ?? 'Friendly'] ?? 0.80;
    const w = weights[i] * compFactor;

    if (match.result === 'W') adjustment += 0.03 * w;
    else if (match.result === 'L') adjustment -= 0.03 * w;

    totalWeight += w;
  }

  if (totalWeight === 0) return 0;
  adjustment = adjustment / (totalWeight / weights.reduce((s, w) => s + w, 0));

  return Math.max(-0.15, Math.min(0.15, adjustment));
}

// ═══════════════════════════════════════════════════════════════
// ENHANCED PREDICTION — Full pipeline integrating all factors
// ═══════════════════════════════════════════════════════════════

import {
  calculateStatisticalPrediction,
  type StatisticalPrediction,
  type RealTeamStats as BaseRealTeamStats,
} from './predictor-engine';

export interface EnhancedPrediction extends StatisticalPrediction {
  // Campos adicionales del motor mejorado
  momentum: number;           // -1.0 a +1.0
  fatigueImpact: number;      // -0.15 a +0.05
  homeAdvantageBonus: number; // 0 a 0.08
  injuryPenalty: number;      // 0 a 0.25
  adjustedXGHome: number;     // xG ajustado por competición
  adjustedXGAway: number;
  dataQualityScore: number;   // 0-100 qué tan completa es la data
}

/**
 * Predicción mejorada que integra todos los factores del nuevo motor.
 * Usa calculateStatisticalPrediction como base y aplica ajustes.
 */
export async function calculateEnhancedPrediction(
  homeTeam: string,
  awayTeam: string,
  homeContext?: EnhancedPredictionContext,
  awayContext?: EnhancedPredictionContext
): Promise<EnhancedPrediction> {
  // 1. Predicción base del motor existente
  const base = await calculateStatisticalPrediction(homeTeam, awayTeam);

  // 2. Calcular ajustes compuestos
  const homeAdjustment = homeContext ? calculateCompositeAdjustment(homeContext) : 1.0;
  const awayAdjustment = awayContext ? calculateCompositeAdjustment(awayContext) : 1.0;

  // 3. Ajustar xG esperado
  const adjustedHomeXG = Math.max(0.2, base.homeExpectedGoals * homeAdjustment);
  const adjustedAwayXG = Math.max(0.2, base.awayExpectedGoals * awayAdjustment);

  // 4. Calcular momentum
  const homeMomentum = homeContext?.recentMatches
    ? calculateMomentum(homeContext.recentMatches)
    : 0;
  const awayMomentum = awayContext?.recentMatches
    ? calculateMomentum(awayContext.recentMatches)
    : 0;

  // 5. Calcular fatiga
  const homeFatigue = homeContext?.daysSinceLastMatch !== undefined
    ? calculateFatigue(homeContext.daysSinceLastMatch)
    : 0;
  const awayFatigue = awayContext?.daysSinceLastMatch !== undefined
    ? calculateFatigue(awayContext.daysSinceLastMatch)
    : 0;

  // 6. Calcular home advantage
  const homeAdv = homeContext?.venue
    ? calculateHomeAdvantage(homeTeam, homeContext.venue)
    : 0;

  // 7. Calcular impacto de lesiones
  const homeInjuryImpact = homeContext?.injuries
    ? calculateInjuryImpact(homeContext.injuries)
    : 0;
  const awayInjuryImpact = awayContext?.injuries
    ? calculateInjuryImpact(awayContext.injuries)
    : 0;

  // 8. Calcular xG ajustado por competición
  const homeAdjXG = homeContext?.recentMatches && homeContext.recentMatches.length > 0
    ? calculateAdjustedXG(homeTeam, homeContext.recentMatches.map(m => ({
        goals: m.goalsFor,
        competition: m.competition ?? 'Friendly',
        date: m.date,
      })))
    : base.homeExpectedGoals;

  const awayAdjXG = awayContext?.recentMatches && awayContext.recentMatches.length > 0
    ? calculateAdjustedXG(awayTeam, awayContext.recentMatches.map(m => ({
        goals: m.goalsFor,
        competition: m.competition ?? 'Friendly',
        date: m.date,
      })))
    : base.awayExpectedGoals;

  // 9. Data quality score (qué tan completa es la información)
  let dataQuality = 30; // Base score (Elo alone)
  if (homeContext?.recentMatches?.length) dataQuality += 15;
  if (awayContext?.recentMatches?.length) dataQuality += 15;
  if (homeContext?.injuries?.length) dataQuality += 10;
  if (awayContext?.injuries?.length) dataQuality += 10;
  if (homeContext?.venue) dataQuality += 10;
  if (homeContext?.h2hHistory?.length) dataQuality += 10;
  dataQuality = Math.min(100, dataQuality);

  return {
    ...base,
    homeExpectedGoals: Math.round(adjustedHomeXG * 100) / 100,
    awayExpectedGoals: Math.round(adjustedAwayXG * 100) / 100,
    momentum: homeMomentum, // Home team momentum (away shown in context)
    fatigueImpact: homeFatigue,
    homeAdvantageBonus: homeAdv,
    injuryPenalty: homeInjuryImpact,
    adjustedXGHome: Math.round(homeAdjXG * 100) / 100,
    adjustedXGAway: Math.round(awayAdjXG * 100) / 100,
    dataQualityScore: dataQuality,
  };
}

// ═══════════════════════════════════════════════════════════════
// DATA QUALITY — Assess how complete our data is
// ═══════════════════════════════════════════════════════════════

export interface DataQualityReport {
  score: number;        // 0-100
  hasRecentForm: boolean;
  hasInjuries: boolean;
  hasH2H: boolean;
  hasVenue: boolean;
  hasCompetitionXG: boolean;
  missingFactors: string[];
}

export function assessDataQuality(
  homeContext?: EnhancedPredictionContext,
  awayContext?: EnhancedPredictionContext
): DataQualityReport {
  const missing: string[] = [];
  let score = 20; // Base: Elo ratings

  const hasForm = !!(homeContext?.recentMatches?.length && awayContext?.recentMatches?.length);
  const hasInj = !!(homeContext?.injuries?.length || awayContext?.injuries?.length);
  const hasH2h = !!(homeContext?.h2hHistory?.length);
  const hasVenue = !!(homeContext?.venue);
  const hasCompXG = !!(homeContext?.recentMatches?.some(m => m.competition !== 'Friendly'));

  if (!hasForm) missing.push('forma reciente');
  else score += 20;

  if (!hasInj) missing.push('lesiones');
  else score += 15;

  if (!hasH2h) missing.push('historial directo');
  else score += 15;

  if (!hasVenue) missing.push('estadio');
  else score += 15;

  if (!hasCompXG) missing.push('xG por competición');
  else score += 15;

  return {
    score: Math.min(100, score),
    hasRecentForm: hasForm,
    hasInjuries: hasInj,
    hasH2H: hasH2h,
    hasVenue,
    hasCompetitionXG: hasCompXG,
    missingFactors: missing,
  };
}
