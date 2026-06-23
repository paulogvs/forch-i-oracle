// FORCH.i ORACLE — Motor de Predicción Estadística
// SINGLE SOURCE OF TRUTH for match predictions.
// Usa modelo de Poisson + ratings Elo + Expected Goals (xG)
// Los números vienen de MATEMÁTICAS, no del LLM
//
// FUENTES DE DATOS:
// 1. ELO_RATINGS (fallback) — importados de teams.ts (fuente única de verdad)
// 2. API-Football (primario) — stats reales cuando FOOTBALL_API_KEY está configurada
//    (se pasan como parámetro opcional desde la API route)
// 3. VENUES — altitud de estadios para ajuste de rendimiento
// 4. H2H — historial head-to-head entre equipos

import { getAltitudeFactor } from './venues';
import { computeH2H } from './h2h';
import { ELO_RATINGS, WORLD_CUP_TEAMS, type EloEntry } from './teams';
import { calculateMatchProbabilitiesDixonColes } from './poisson-dixon-coles';

// ═══════════════════════════════════════════════════════════════
// FATIGUE MODEL — SINGLE SOURCE OF TRUTH
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate rest-day fatigue multiplier.
 * Fewer rest days = more fatigue = lower attack efficiency.
 *
 * @param daysSinceLastMatch Days since team's last match
 * @returns Multiplier: <1 = fatigued, 1 = optimal, >1 = fresher than average
 */
export function calculateFatigueFactor(daysSinceLastMatch: number | undefined): number {
  if (daysSinceLastMatch === undefined || daysSinceLastMatch === null) return 1.0;
  if (daysSinceLastMatch < 2) return 0.82;  // <48h: severe fatigue (-18%)
  if (daysSinceLastMatch < 3) return 0.88;  // 2 days: heavy fatigue (-12%)
  if (daysSinceLastMatch < 4) return 0.94;  // 3 days: moderate fatigue (-6%)
  if (daysSinceLastMatch <= 5) return 1.0;  // 4-5 days: optimal
  if (daysSinceLastMatch <= 7) return 1.02; // 6-7 days: well-rested (+2%)
  return 1.03; // 8+ days: very fresh (but possible rustiness capped at +3%)
}

// ═══════════════════════════════════════════════════════════════
// STAR PLAYER DEPENDENCY — SINGLE SOURCE OF TRUTH
// ═══════════════════════════════════════════════════════════════

/** Star player dependency weights by position */
const STAR_WEIGHTS: Record<string, number> = {
  GK: 0.08,   // Goalkeeper: 8% of team value
  DEF: 0.06,  // Defender: 6%
  MID: 0.10,  // Midfielder: 10%
  FWD: 0.12,  // Forward: 12%
};

/**
 * Calculate attack penalty when star players are missing.
 * Checks if injured players match the team's starPlayers list.
 *
 * @param teamName Team name
 * @param injuredPlayers List of injured player names
 * @returns Penalty factor: 1.0 = no impact, 0.85 = -15% attack
 */
export function calculateStarPlayerPenalty(
  teamName: string,
  injuredPlayers?: string[],
): number {
  if (!injuredPlayers || injuredPlayers.length === 0) return 1.0;

  const team = WORLD_CUP_TEAMS.find(t => t.name === teamName);
  if (!team) return 1.0;

  // Check how many star players are injured
  const starPlayers = team.starPlayers;
  let penalty = 0;

  for (const injured of injuredPlayers) {
    const starIndex = starPlayers.findIndex(sp =>
      sp.toLowerCase().includes(injured.toLowerCase()) ||
      injured.toLowerCase().includes(sp.toLowerCase())
    );
    if (starIndex >= 0) {
      // First star: full weight, second: 70%, third: 40%
      const weights = [1.0, 0.7, 0.4];
      penalty += 0.12 * (weights[starIndex] || 0.3); // 12% per star player
    } else {
      // Non-star player: minimal impact
      penalty += 0.02;
    }
  }

  return Math.max(0.75, 1.0 - penalty); // Minimum 75% of original attack
}

// ═══════════════════════════════════════════════════════════════
// ENGINE CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/** Use Dixon-Coles dependency correction (recommended: true) */
const USE_DIXON_COLES = true;

/**
 * Global calibration factor for lambdas.
 * Adjust so average total goals across all group matches ≈ 2.65.
 * Real World Cup 2022 average: 2.68 goals/match.
 * Calibrated to match realistic international football scoring rates.
 */
const CALIBRATION_FACTOR = 1.15;

/**
 * Set-piece adjustment factor.
 * ~30% of World Cup goals come from set pieces (corners, free kicks, penalties).
 * Teams with strong set-piece takers get a bonus.
 * This is a flat multiplier applied after calibration.
 */
const SET_PIECE_FACTOR = 1.05; // ~5% boost for set-piece goals (corners, free kicks, penalties)

/**
 * Apply global calibration to lambda values.
 * @param homeLambda Raw home expected goals
 * @param awayLambda Raw away expected goals
 * @returns Calibrated lambdas
 */
function applyCalibration(homeLambda: number, awayLambda: number): { home: number; away: number } {
  return {
    home: homeLambda * CALIBRATION_FACTOR,
    away: awayLambda * CALIBRATION_FACTOR,
  };
}

export interface RealTeamStats {
  attackStrength: number;
  defenseStrength: number;
  winRate: number;
  cleanSheetRate: number;
  goalsPerMatch: number;
  goalsConcededPerMatch: number;
  form: string;
}

// Fallback para equipos sin rating
const DEFAULT_ELO = 1500;
const DEFAULT_ATTACK = 0.7;
const DEFAULT_DEFENSE = 1.5;

/** In-memory Elo overrides (loaded from DB before simulation) */
let eloOverrides: Map<string, EloEntry> | null = null;

/** Load Elo overrides from DB into memory. Call before simulation runs. */
export function loadEloOverrides(overrides: Map<string, EloEntry>): void {
  eloOverrides = overrides;
}

/** Clear loaded overrides (call after simulation to reset) */
export function clearEloOverrides(): void {
  eloOverrides = null;
}

/** Get Elo entry for a team. Checks overrides first, then static ELO_RATINGS. */
export function getElo(teamName: string): EloEntry {
  // Check dynamic overrides first (set by match-result pipeline)
  if (eloOverrides?.has(teamName)) {
    return eloOverrides.get(teamName)!;
  }
  return ELO_RATINGS[teamName] || {
    elo: DEFAULT_ELO,
    attack: DEFAULT_ATTACK,
    defense: DEFAULT_DEFENSE,
  };
}

// ═══════════════════════════════════════════════════════════════
// MODELO DE POISSON — Distribución de goles esperados
// ═══════════════════════════════════════════════════════════════

/**
 * Calcula los goles esperados (lambda) para un equipo usando:
 * - Su fuerza de ataque vs la fuerza de defensa del rival
 * - Ventaja de local (+12% al ataque local, -8% al ataque visitante)
 * - Forma reciente (ajuste +/- 5%)
 */
export function calculateExpectedGoals(
  attackingTeam: string,
  defendingTeam: string,
  isHomeTeam: boolean,
  formAdjustment: number = 0  // -0.05 a +0.05 basado en forma reciente
): number {
  const attack = getElo(attackingTeam);
  const defense = getElo(defendingTeam);

  // Base: ponderación sesgada hacia el ataque (65% ataque / 35% defensa)
  // Equipos ofensivos generan lambdas más altos → predicciones más variadas
  const baseGoals = attack.attack * 0.65 + defense.defense * 0.35;

  // Ajuste por ventaja de local
  // Note: homeFactor only applied to the HOME team's attack.
  // Away team attack uses 1.0 (no penalty) — the eloDiff already captures relative strength.
  const homeFactor = isHomeTeam ? 1.12 : 1.0;

  // Ajuste por diferencia de Elo (equipos más fuertes marcan más contra rivales débiles)
  const eloDiff = attack.elo - defense.elo;
  const eloFactor = 1 + (eloDiff / 500); // ±20% por cada 100 puntos de diferencia

  // Aplicar ajustes — eloFactor permite que equipos muy superiores generen goleadas
  let lambda = baseGoals * homeFactor * Math.max(0.5, Math.min(1.8, eloFactor));

  // Ajuste por forma reciente
  lambda *= (1 + formAdjustment);

  // Clamp realista: 0.3 a 6.0 goles esperados (permite goleadas en partidos desiguales)
  return Math.max(0.3, Math.min(6.0, lambda));
}

/**
 * Distribución de Poisson: P(X=k) = (λ^k * e^-λ) / k!
 */
function poissonProbability(lambda: number, k: number): number {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

/**
 * Pure independent Poisson model (legacy, used as fallback when USE_DIXON_COLES=false).
 * Calculates the score probability matrix and derives 1X2, Over 2.5, BTTS.
 */
function calculateMatchProbabilitiesPoisson(
  homeLambda: number,
  awayLambda: number
): {
  homeWin: number;
  draw: number;
  awayWin: number;
  predictedScoreHome: number;
  predictedScoreAway: number;
  scoreMatrix: number[][];
  over25: number;
  btts: number; // both teams to score
} {
  const maxGoals = 7; // calculamos hasta 6 goles
  const scoreMatrix: number[][] = [];

  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;
  let over25 = 0;
  let btts = 0;

  // Calcular matriz de probabilidades
  for (let h = 0; h < maxGoals; h++) {
    scoreMatrix[h] = [];
    for (let a = 0; a < maxGoals; a++) {
      const prob = poissonProbability(homeLambda, h) * poissonProbability(awayLambda, a);
      scoreMatrix[h][a] = prob;

      if (h > a) homeWin += prob;
      else if (h === a) draw += prob;
      else awayWin += prob;

      if (h + a > 2.5) over25 += prob;
      if (h > 0 && a > 0) btts += prob;
    }
  }

  // Marcador más probable
  let maxProb = 0;
  let predictedHome = 0;
  let predictedAway = 0;

  for (let h = 0; h < maxGoals; h++) {
    for (let a = 0; a < maxGoals; a++) {
      if (scoreMatrix[h][a] > maxProb) {
        maxProb = scoreMatrix[h][a];
        predictedHome = h;
        predictedAway = a;
      }
    }
  }

  // Normalizar a porcentajes que sumen 100
  const total = homeWin + draw + awayWin;
  if (total === 0) {
    return {
      homeWin: 33, draw: 34, awayWin: 33,
      predictedScoreHome: 0, predictedScoreAway: 0,
      scoreMatrix, over25: 0, btts: 0,
    };
  }
  const homeWinPct = Math.round((homeWin / total) * 100);
  const drawPct = Math.round((draw / total) * 100);
  const awayWinPct = 100 - homeWinPct - drawPct;

  return {
    homeWin: homeWinPct,
    draw: drawPct,
    awayWin: Math.max(0, awayWinPct),
    predictedScoreHome: predictedHome,
    predictedScoreAway: predictedAway,
    scoreMatrix,
    over25: Math.round(over25 * 100),
    btts: Math.round(btts * 100),
  };
}

// ═══════════════════════════════════════════════════════════════
// CÁLCULO DE STRENGTH RATINGS — Basado en Elo y stats reales
// ═══════════════════════════════════════════════════════════════

/**
 * Convierte Elo rating a un score 0-100
 * Elo 2100+ → 95-100, Elo 1500 → ~40
 */
function eloToScore(elo: number): number {
  // Escala lineal: 1400→30, 2100→95
  const score = ((elo - 1400) / 700) * 65 + 30;
  return Math.round(Math.max(15, Math.min(99, score)));
}

/**
 * Calcula ratings de ataque/defensa/mediocampo 0-100
 * basado en los datos reales de goles del equipo
 */
function calculateTeamStrengths(teamName: string, isHome: boolean) {
  const entry = getElo(teamName);
  const elo = entry.elo;
  const attackRaw = entry.attack;
  const defenseRaw = entry.defense;

  // Attack: basado en goles anotados, escalado
  const attackStrength = Math.round(Math.max(20, Math.min(98, (attackRaw / 3.0) * 100)));

  // Defense: inverso de goles concedidos (menos goles = mejor defensa)
  const defenseStrength = Math.round(Math.max(20, Math.min(98, ((3.0 - defenseRaw) / 3.0) * 100)));

  // Midfield: promedio ponderado de ataque y defensa + factor Elo
  const eloMidfieldComponent = eloToScore(elo);
  const midfieldStrength = Math.round((attackStrength * 0.3 + defenseStrength * 0.3 + eloMidfieldComponent * 0.4));

  // Pequeño boost local
  const homeBoost = isHome ? 3 : 0;

  return {
    attack: Math.min(99, attackStrength + homeBoost),
    defense: Math.min(99, defenseStrength + homeBoost),
    midfield: Math.min(99, midfieldStrength + homeBoost),
  };
}

// ═══════════════════════════════════════════════════════════════
// FORMA RECIENTE — Ajuste cuantitativo
// ═══════════════════════════════════════════════════════════════

/**
 * Convierte forma reciente ['W','D','L','W','W'] en un ajuste numérico
 * W=+0.03, D=0, L=-0.03 → rango -0.15 a +0.15
 */
function formToAdjustment(form: ('W' | 'D' | 'L')[]): number {
  if (!form || form.length === 0) return 0;

  let adjustment = 0;
  const weights = [0.5, 0.7, 0.9, 1.0, 1.2]; // partidos más recientes pesan más

  for (let i = 0; i < form.length; i++) {
    const w = weights[Math.min(i, weights.length - 1)];
    if (form[i] === 'W') adjustment += 0.03 * w;
    else if (form[i] === 'L') adjustment -= 0.03 * w;
    // D = 0
  }

  return Math.max(-0.15, Math.min(0.15, adjustment));
}

// ═══════════════════════════════════════════════════════════════
// INTERFAZ PÚBLICA — Lo que usa la API route
// ═══════════════════════════════════════════════════════════════

export interface StatisticalPrediction {
  // Probabilidades calculadas por Poisson
  homeWin: number;
  draw: number;
  awayWin: number;

  // Marcador más probable
  predictedScoreHome: number;
  predictedScoreAway: number;

  // Estadísticas derivadas
  homeExpectedGoals: number;
  awayExpectedGoals: number;
  over25Probability: number;
  bttsProbability: number;

  // Ratings de equipo 0-100
  homeAttack: number;
  homeDefense: number;
  homeMidfield: number;
  awayAttack: number;
  awayDefense: number;
  awayMidfield: number;

  // Elo ratings
  homeElo: number;
  awayElo: number;

  // Confianza basada en la claridad del resultado
  confidence: 'alta' | 'media' | 'baja';

  // Matriz de probabilidades de marcador
  topScores: { home: number; away: number; probability: number }[];
}

/**
 * Predicción estadística completa basada en modelo de Poisson + Elo
 * SINGLE SOURCE OF TRUTH for all match predictions.
 *
 * @param homeTeam Nombre del equipo local
 * @param awayTeam Nombre del equipo visitante
 * @param homeForm Forma reciente del local (opcional)
 * @param awayForm Forma reciente del visitante (opcional)
 * @param homeInjuries Lesiones conocidas local (opcional, reduce ratings)
 * @param awayInjuries Lesiones conocidas visitante (opcional, reduce ratings)
 * @param homeRealStats Stats reales del local desde API-Football (opcional, override)
 * @param awayRealStats Stats reales del visitante desde API-Football (opcional, override)
 * @param homeDaysRest Días de descanso del local (opcional, para fatiga)
 * @param awayDaysRest Días de descanso del visitante (opcional, para fatiga)
 */
export function calculateStatisticalPrediction(
  homeTeam: string,
  awayTeam: string,
  homeForm?: ('W' | 'D' | 'L')[],
  awayForm?: ('W' | 'D' | 'L')[],
  homeInjuries?: string[],
  awayInjuries?: string[],
  homeRealStats?: RealTeamStats,
  awayRealStats?: RealTeamStats,
  homeDaysRest?: number,
  awayDaysRest?: number,
): StatisticalPrediction {
  // 1. Calcular ajustes por forma
  const homeFormAdj = formToAdjustment(homeForm || []);
  const awayFormAdj = formToAdjustment(awayForm || []);

  // 2. Calcular goles esperados (lambda de Poisson)
  //    Si hay stats reales, usarlos para calcular lambda directamente
  let homeLambda: number, awayLambda: number;

  if (homeRealStats && homeRealStats.goalsPerMatch > 0) {
    // Usar datos reales: goles anotados del local × ventaja local
    homeLambda = homeRealStats.goalsPerMatch * 1.12 * (1 + homeFormAdj);
  } else {
    homeLambda = calculateExpectedGoals(homeTeam, awayTeam, true, homeFormAdj);
  }

  if (awayRealStats && awayRealStats.goalsPerMatch > 0) {
    awayLambda = awayRealStats.goalsPerMatch * 0.92 * (1 + awayFormAdj);
  } else {
    awayLambda = calculateExpectedGoals(awayTeam, homeTeam, false, awayFormAdj);
  }

  // Clamp a valores realistas
  homeLambda = Math.max(0.3, Math.min(6.0, homeLambda));
  awayLambda = Math.max(0.3, Math.min(6.0, awayLambda));

  // 2b. Altitude adjustment (si hay venue disponible)
  // Se aplica como factor adicional al lambda
  const altFactor = getAltitudeFactor(homeTeam, ''); // Default 1.0 sin venue específico
  const altFactorAway = getAltitudeFactor(awayTeam, '');
  homeLambda *= altFactor;
  awayLambda *= altFactorAway;

  // 2c. H2H correlation
  const homeEloEntry = getElo(homeTeam);
  const awayEloEntry = getElo(awayTeam);
  const eloDiff = homeEloEntry.elo - awayEloEntry.elo;
  const h2h = computeH2H(homeTeam, awayTeam, eloDiff);
  homeLambda *= h2h.factor;
  awayLambda *= (2 - h2h.factor); // Invertir para away

  // Clamp again after adjustments
  homeLambda = Math.max(0.3, Math.min(6.0, homeLambda));
  awayLambda = Math.max(0.3, Math.min(6.0, awayLambda));

  // 2d. Apply global calibration factor
  const calibrated = applyCalibration(homeLambda, awayLambda);
  homeLambda = calibrated.home;
  awayLambda = calibrated.away;

  // 2e. Apply set-piece factor (~30% of WC goals from set pieces)
  homeLambda *= SET_PIECE_FACTOR;
  awayLambda *= SET_PIECE_FACTOR;

  // 2f. Fatigue adjustment (rest days between matches)
  const homeFatigue = calculateFatigueFactor(homeDaysRest);
  const awayFatigue = calculateFatigueFactor(awayDaysRest);
  homeLambda *= homeFatigue;
  awayLambda *= awayFatigue;

  // 2g. Star player injury penalty
  const homeStarPenalty = calculateStarPlayerPenalty(homeTeam, homeInjuries);
  const awayStarPenalty = calculateStarPlayerPenalty(awayTeam, awayInjuries);
  homeLambda *= homeStarPenalty;
  awayLambda *= awayStarPenalty;

  // Clamp final
  homeLambda = Math.max(0.3, Math.min(6.0, homeLambda));
  awayLambda = Math.max(0.3, Math.min(6.0, awayLambda));

  // 3. Calcular probabilidades con modelo Dixon-Coles (o Poisson puro)
  const rawProbs = USE_DIXON_COLES
    ? calculateMatchProbabilitiesDixonColes(homeLambda, awayLambda)
    : calculateMatchProbabilitiesPoisson(homeLambda, awayLambda);

  // Normalize 1X2 to integers summing to 100
  const total1X2 = rawProbs.homeWin + rawProbs.draw + rawProbs.awayWin;
  const homeWinPct = Math.round((rawProbs.homeWin / total1X2) * 100);
  const drawPct = Math.round((rawProbs.draw / total1X2) * 100);
  const awayWinPct = 100 - homeWinPct - drawPct;

  const probabilities = {
    homeWin: homeWinPct,
    draw: drawPct,
    awayWin: Math.max(0, awayWinPct),
    predictedScoreHome: rawProbs.predictedScoreHome,
    predictedScoreAway: rawProbs.predictedScoreAway,
    scoreMatrix: rawProbs.scoreMatrix,
    over25: rawProbs.over25,
    btts: rawProbs.btts,
  };

  // 4. Calcular strength ratings
  const homeStrengths = calculateTeamStrengths(homeTeam, true);
  const awayStrengths = calculateTeamStrengths(awayTeam, false);

  // 4b. Override con stats reales si están disponibles
  if (homeRealStats) {
    homeStrengths.attack = Math.round(Math.max(20, Math.min(98, (homeRealStats.goalsPerMatch / 3.0) * 100)));
    homeStrengths.defense = Math.round(Math.max(20, Math.min(98, ((3.0 - homeRealStats.goalsConcededPerMatch) / 3.0) * 100)));
  }
  if (awayRealStats) {
    awayStrengths.attack = Math.round(Math.max(20, Math.min(98, (awayRealStats.goalsPerMatch / 3.0) * 100)));
    awayStrengths.defense = Math.round(Math.max(20, Math.min(98, ((3.0 - awayRealStats.goalsConcededPerMatch) / 3.0) * 100)));
  }

  // 5. Ajustar ratings por lesiones (cada lesión importante reduce ~2 puntos)
  const injuryPenalty = (injuries?: string[]) => {
    if (!injuries || injuries.length === 0) return 0;
    return Math.min(injuries.length * 2, 10); // máx -10 por lesiones
  };

  homeStrengths.attack = Math.max(10, homeStrengths.attack - injuryPenalty(homeInjuries));
  homeStrengths.midfield = Math.max(10, homeStrengths.midfield - Math.round(injuryPenalty(homeInjuries) * 0.5));
  awayStrengths.attack = Math.max(10, awayStrengths.attack - injuryPenalty(awayInjuries));
  awayStrengths.midfield = Math.max(10, awayStrengths.midfield - Math.round(injuryPenalty(awayInjuries) * 0.5));

  // 6. Determinar confianza basada en la diferencia de probabilidades
  const maxProb = Math.max(probabilities.homeWin, probabilities.draw, probabilities.awayWin);
  const confidence: 'alta' | 'media' | 'baja' =
    maxProb >= 55 ? 'alta' :
    maxProb >= 40 ? 'media' : 'baja';

  // 7. Extraer top 5 marcadores más probables
  const topScores: { home: number; away: number; probability: number }[] = [];
  for (let h = 0; h < 7; h++) {
    for (let a = 0; a < 7; a++) {
      topScores.push({ home: h, away: a, probability: Math.round(probabilities.scoreMatrix[h][a] * 1000) / 10 });
    }
  }
  topScores.sort((a, b) => b.probability - a.probability);

  // 8. Elo ratings
  const homeElo = getElo(homeTeam).elo;
  const awayElo = getElo(awayTeam).elo;

  return {
    homeWin: probabilities.homeWin,
    draw: probabilities.draw,
    awayWin: probabilities.awayWin,
    predictedScoreHome: probabilities.predictedScoreHome,
    predictedScoreAway: probabilities.predictedScoreAway,
    homeExpectedGoals: Math.round(homeLambda * 100) / 100,
    awayExpectedGoals: Math.round(awayLambda * 100) / 100,
    over25Probability: probabilities.over25,
    bttsProbability: probabilities.btts,
    homeAttack: homeStrengths.attack,
    homeDefense: homeStrengths.defense,
    homeMidfield: homeStrengths.midfield,
    awayAttack: awayStrengths.attack,
    awayDefense: awayStrengths.defense,
    awayMidfield: awayStrengths.midfield,
    homeElo,
    awayElo,
    confidence,
    topScores: topScores.slice(0, 5),
  };
}

/**
 * Calcula el factor clave que más influye en el resultado
 */
export function getKeyFactors(
  prediction: StatisticalPrediction,
  homeTeam: string,
  awayTeam: string,
  homeForm?: ('W' | 'D' | 'L')[],
  awayForm?: ('W' | 'D' | 'L')[],
  homeInjuries?: string[],
  awayInjuries?: string[]
): Array<{ label: string; homeAdvantage: number; description: string }> {
  const factors: Array<{ label: string; homeAdvantage: number; description: string }> = [];

  // Factor 1: Forma reciente
  const homeFormScore = (homeForm || []).filter(r => r === 'W').length;
  const awayFormScore = (awayForm || []).filter(r => r === 'W').length;
  const formDiff = homeFormScore - awayFormScore;
  const formAdvantage = Math.max(-10, Math.min(10, formDiff * 3));

  factors.push({
    label: 'Forma reciente',
    homeAdvantage: formAdvantage,
    description: homeFormScore > awayFormScore
      ? `${homeTeam} con mejor racha (${homeFormScore}V vs ${awayFormScore}V)`
      : awayFormScore > homeFormScore
        ? `${awayTeam} con mejor racha (${awayFormScore}V vs ${homeFormScore}V)`
        : 'Forma similar entre ambos',
  });

  // Factor 2: Diferencia de Elo / calidad del plantel
  const eloDiff = prediction.homeElo - prediction.awayElo;
  const eloAdvantage = Math.max(-10, Math.min(10, Math.round(eloDiff / 30)));

  factors.push({
    label: 'Calidad del plantel',
    homeAdvantage: eloAdvantage,
    description: eloDiff > 50
      ? `${homeTeam} superior en rating Elo (+${eloDiff})`
      : eloDiff < -50
        ? `${awayTeam} superior en rating Elo (+${Math.abs(eloDiff)})`
        : 'Equipos de nivel similar',
  });

  // Factor 3: Historial directo (placeholder — se llena con datos reales si disponibles)
  factors.push({
    label: 'Historial directo',
    homeAdvantage: 0,
    description: 'Sin enfrentamientos recientes registrados',
  });

  // Factor 4: Ventaja de local
  const homeAdvantage = prediction.homeWin > prediction.awayWin ? 4 :
    prediction.homeWin > prediction.awayWin + 10 ? 6 : 2;

  factors.push({
    label: 'Ventaja de local',
    homeAdvantage: homeAdvantage,
    description: `Factor local en ${homeTeam} (+${homeAdvantage}% en probabilidad)`,
  });

  // Factor 5: Lesiones (si hay)
  if ((homeInjuries && homeInjuries.length > 0) || (awayInjuries && awayInjuries.length > 0)) {
    const hInj = homeInjuries?.length || 0;
    const aInj = awayInjuries?.length || 0;
    factors.push({
      label: 'Lesiones y ausencias',
      homeAdvantage: aInj > hInj ? 5 : hInj > aInj ? -5 : 0,
      description: `${homeTeam}: ${hInj} bajas | ${awayTeam}: ${aInj} bajas`,
    });
  }

  // Factor 6: Ataque vs Defensa
  const attackDiff = prediction.homeAttack - prediction.awayDefense;
  factors.push({
    label: 'Ataque vs Defensa',
    homeAdvantage: Math.max(-10, Math.min(10, Math.round(attackDiff / 5))),
    description: attackDiff > 10
      ? `El ataque de ${homeTeam} supera la defensa de ${awayTeam}`
      : attackDiff < -10
        ? `La defensa de ${awayTeam} neutraliza el ataque de ${homeTeam}`
        : 'Equilibrio entre ataque y defensa',
  });

  return factors.slice(0, 4);
}
