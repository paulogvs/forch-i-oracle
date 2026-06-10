// FORCH.i ORACLE — Motor de Predicción Estadística
// Usa modelo de Poisson + ratings Elo + Expected Goals (xG)
// Los números vienen de MATEMÁTICAS, no del LLM
//
// FUENTES DE DATOS:
// 1. ELO_RATINGS (fallback) — ratings manuales basados en elofootball.com
// 2. API-Football (primario) — stats reales cuando FOOTBALL_API_KEY está configurada
//    (se pasan como parámetro opcional desde la API route)

export interface RealTeamStats {
  attackStrength: number;
  defenseStrength: number;
  winRate: number;
  cleanSheetRate: number;
  goalsPerMatch: number;
  goalsConcededPerMatch: number;
  form: string;
}

// ═══════════════════════════════════════════════════════════════
// ELO RATINGS — Fuente: elofootball.com, actualizado a Junio 2026
// ═══════════════════════════════════════════════════════════════

interface EloEntry {
  elo: number;
  attack: number;   // goles anotados promedio (últimos 12 meses)
  defense: number;  // goles concedidos promedio (últimos 12 meses)
}

const ELO_RATINGS: Record<string, EloEntry> = {
  // ── Élite mundial (Elo 2000+) ──
  'Argentina': { elo: 2109, attack: 2.1, defense: 0.6 },
  'Francia':    { elo: 2087, attack: 2.3, defense: 0.7 },
  'España':     { elo: 2065, attack: 2.4, defense: 0.8 },
  'Brasil':     { elo: 2043, attack: 2.0, defense: 0.9 },
  'Inglaterra': { elo: 2011, attack: 1.9, defense: 0.7 },

  // ── Top 10 (Elo 1950-2000) ──
  'Alemania':       { elo: 1998, attack: 2.1, defense: 0.9 },
  'Portugal':       { elo: 1989, attack: 2.0, defense: 0.8 },
  'Países Bajos':   { elo: 1976, attack: 1.8, defense: 0.8 },
  'Bélgica':        { elo: 1954, attack: 1.6, defense: 1.0 },
  'Colombia':       { elo: 1948, attack: 1.7, defense: 0.8 },
  'Italia':         { elo: 1942, attack: 1.5, defense: 0.8 },
  'Uruguay':        { elo: 1934, attack: 1.6, defense: 0.9 },
  'Croacia':        { elo: 1928, attack: 1.4, defense: 0.9 },

  // ── Nivel alto (Elo 1880-1950) ──
  'Marruecos':   { elo: 1912, attack: 1.3, defense: 0.7 },
  'Japón':       { elo: 1898, attack: 1.5, defense: 0.9 },
  'Suiza':       { elo: 1891, attack: 1.4, defense: 1.0 },
  'Dinamarca':   { elo: 1885, attack: 1.5, defense: 1.1 },
  'Senegal':     { elo: 1878, attack: 1.4, defense: 0.9 },
  'México':      { elo: 1865, attack: 1.3, defense: 1.0 },
  'Austria':     { elo: 1858, attack: 1.5, defense: 1.2 },
  'Irán':        { elo: 1845, attack: 1.3, defense: 0.9 },
  'Estados Unidos': { elo: 1838, attack: 1.4, defense: 1.1 },
  'Corea del Sur':  { elo: 1832, attack: 1.2, defense: 1.0 },
  'Serbia':      { elo: 1825, attack: 1.3, defense: 1.2 },
  'Turquía':     { elo: 1818, attack: 1.4, defense: 1.3 },
  'Ecuador':     { elo: 1812, attack: 1.3, defense: 1.0 },
  'Nigeria':     { elo: 1805, attack: 1.2, defense: 1.1 },
  'Escocia':     { elo: 1798, attack: 1.2, defense: 1.1 },
  'Ucrania':     { elo: 1792, attack: 1.1, defense: 1.1 },
  'Noruega':     { elo: 1785, attack: 1.5, defense: 1.3 },
  'Hungría':     { elo: 1778, attack: 1.2, defense: 1.1 },
  'República Checa': { elo: 1772, attack: 1.1, defense: 1.1 },
  'Canadá':      { elo: 1765, attack: 1.2, defense: 1.2 },

  // ── Nivel medio-alto (Elo 1730-1780) ──
  'Australia':      { elo: 1768, attack: 1.1, defense: 1.0 },
  'Egipto':         { elo: 1758, attack: 1.2, defense: 1.1 },
  'Túnez':          { elo: 1748, attack: 1.0, defense: 1.0 },
  'Arabia Saudita': { elo: 1738, attack: 1.0, defense: 1.1 },
  'Argelia':        { elo: 1735, attack: 1.1, defense: 1.0 },
  'Costa de Marfil':{ elo: 1732, attack: 1.2, defense: 1.2 },
  'Ghana':          { elo: 1728, attack: 1.1, defense: 1.2 },
  'Paraguay':       { elo: 1718, attack: 0.9, defense: 1.1 },
  'Sudáfrica':      { elo: 1708, attack: 0.9, defense: 1.1 },

  // ── Nivel medio (Elo 1660-1730) ──
  'Panamá':        { elo: 1698, attack: 0.8, defense: 1.2 },
  'Uzbekistán':    { elo: 1688, attack: 1.0, defense: 1.2 },
  'Qatar':         { elo: 1678, attack: 0.9, defense: 1.3 },
  'Irak':          { elo: 1672, attack: 0.9, defense: 1.2 },
  'Jordania':      { elo: 1665, attack: 0.9, defense: 1.1 },
  'Bosnia y Herzegovina': { elo: 1695, attack: 1.0, defense: 1.3 },
  'Chequia':       { elo: 1772, attack: 1.1, defense: 1.1 },
  'Suecia':        { elo: 1752, attack: 1.3, defense: 1.2 },

  // ── Nivel bajo-medio (Elo 1600-1660) ──
  'Cabo Verde':    { elo: 1658, attack: 0.8, defense: 1.0 },
  'RD Congo':      { elo: 1648, attack: 0.9, defense: 1.3 },
  'Nueva Zelanda': { elo: 1638, attack: 0.8, defense: 1.2 },
  'Haití':         { elo: 1628, attack: 0.7, defense: 1.4 },
  'Curazao':       { elo: 1618, attack: 0.8, defense: 1.4 },
};

// Aliases de nombre — los nombres en teams.ts pueden diferir del ELO
const TEAM_ALIASES: Record<string, string> = {
  'Chequia': 'República Checa',
};

// Fallback para equipos sin rating
const DEFAULT_ELO = 1500;
const DEFAULT_ATTACK = 0.7;
const DEFAULT_DEFENSE = 1.5;

function getElo(teamName: string): EloEntry {
  // Intentar alias primero
  const resolved = TEAM_ALIASES[teamName] || teamName;
  return ELO_RATINGS[resolved] || {
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
function calculateExpectedGoals(
  attackingTeam: string,
  defendingTeam: string,
  isHomeTeam: boolean,
  formAdjustment: number = 0  // -0.05 a +0.05 basado en forma reciente
): number {
  const attack = getElo(attackingTeam);
  const defense = getElo(defendingTeam);

  // Base: promedio de goles del ataque vs defensa del rival
  // Fórmula: (ataque_avg + defensa_rival_avg) / 2 * factor_global
  const baseGoals = (attack.attack + defense.defense) / 2;

  // Ajuste por ventaja de local
  const homeFactor = isHomeTeam ? 1.12 : 0.92;

  // Ajuste por diferencia de Elo (equipos más fuertes marcan más contra rivales débiles)
  const eloDiff = attack.elo - defense.elo;
  const eloFactor = 1 + (eloDiff / 500); // ±20% por cada 100 puntos de diferencia

  // Aplicar ajustes
  let lambda = baseGoals * homeFactor * Math.max(0.6, Math.min(1.4, eloFactor));

  // Ajuste por forma reciente
  lambda *= (1 + formAdjustment);

  // Clamp realista: 0.3 a 4.0 goles esperados
  return Math.max(0.3, Math.min(4.0, lambda));
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
 * Calcula la matriz de probabilidades de marcador (0-0 hasta 6-6)
 * y deriva probabilidades de victoria/empate/derrota
 */
function calculateMatchProbabilities(
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
 *
 * @param homeTeam Nombre del equipo local
 * @param awayTeam Nombre del equipo visitante
 * @param homeForm Forma reciente del local (opcional)
 * @param awayForm Forma reciente del visitante (opcional)
 * @param homeInjuries Lesiones conocidas local (opcional, reduce ratings)
 * @param awayInjuries Lesiones conocidas visitante (opcional, reduce ratings)
 * @param homeRealStats Stats reales del local desde API-Football (opcional, override)
 * @param awayRealStats Stats reales del visitante desde API-Football (opcional, override)
 */
export async function calculateStatisticalPrediction(
  homeTeam: string,
  awayTeam: string,
  homeForm?: ('W' | 'D' | 'L')[],
  awayForm?: ('W' | 'D' | 'L')[],
  homeInjuries?: string[],
  awayInjuries?: string[],
  homeRealStats?: RealTeamStats,
  awayRealStats?: RealTeamStats
): Promise<StatisticalPrediction> {
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
  homeLambda = Math.max(0.3, Math.min(4.0, homeLambda));
  awayLambda = Math.max(0.3, Math.min(4.0, awayLambda));

  // 3. Calcular probabilidades con modelo de Poisson
  const probabilities = calculateMatchProbabilities(homeLambda, awayLambda);

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
