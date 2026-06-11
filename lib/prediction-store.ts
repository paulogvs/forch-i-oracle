// FORCH.i ORACLE — Living Prediction Engine
// Bayesian-updating statistical model that improves with each real match result
//
// Architecture:
// 1. Pre-tournament: Static ELO + Power Ratings (baseline)
// 2. During tournament: Auto-updates team strength based on actual vs expected
// 3. Form decay: Recent matches weigh more (exponential decay)
// 4. xG tracking: Expected goals vs actual to identify over/under-performers

import { getTeamEnglishName, ELO_RATINGS } from './teams';
import { POWER_RATINGS } from './teams';

// ═══════════════════════════════════════════════════════════════
// DATA TYPES
// ═══════════════════════════════════════════════════════════════

export interface MatchResult {
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  date: string;
  homeXG?: number;  // Expected goals
  awayXG?: number;
}

interface TeamFormEntry {
  goalsScored: number[];    // Per match
  goalsConceded: number[];  // Per match
  xGFor: number[];         // Expected goals created
  xGAgainst: number[];     // Expected goals conceded
  points: number[];         // 3=win, 1=draw, 0=loss
  opponentElo: number[];    // Elo of opponents
  dates: string[];          // Match dates for decay weighting
}

interface TeamDynamicStats {
  elo: number;
  attackStrength: number;   // Goals scored per match (decay-weighted)
  defenseStrength: number;  // Goals conceded per match (decay-weighted)
  xGDiff: number;           // xG For - xG Against (performance indicator)
  formPoints: number;       // Weighted recent form (0-15 scale, like 5 matches)
  momentum: number;         // -1 to +1 (losing streak to winning streak)
  matchesPlayed: number;
  lastUpdated: string;
}

// ═══════════════════════════════════════════════════════════════
// STATE — In-memory store (server-side only)
// ═══════════════════════════════════════════════════════════════

const teamForms = new Map<string, TeamFormEntry>();
const matchResults: MatchResult[] = [];

// Decay factor: 0.85 means a match from 3 games ago has ~52% weight
const DECAY_FACTOR = 0.85;
const PRIOR_WEIGHT = 3; // How many "prior matches" to blend with actual data

// ═══════════════════════════════════════════════════════════════
// CORE: Add a real match result and update all stats
// ═══════════════════════════════════════════════════════════════

export function addMatchResult(result: MatchResult): void {
  matchResults.push(result);

  // Update home team
  updateTeamForm(result.homeTeam, result.homeGoals, result.awayGoals, result.homeXG ?? result.homeGoals, result.awayXG ?? result.awayGoals, result.date, getTeamEloFallback(result.awayTeam));

  // Update away team
  updateTeamForm(result.awayTeam, result.awayGoals, result.homeGoals, result.awayXG ?? result.awayGoals, result.homeXG ?? result.homeGoals, result.date, getTeamEloFallback(result.homeTeam));
}

function updateTeamForm(
  team: string,
  goalsFor: number,
  goalsAgainst: number,
  xGFor: number,
  xGAgainst: number,
  date: string,
  opponentElo: number
): void {
  let form = teamForms.get(team);
  if (!form) {
    form = {
      goalsScored: [],
      goalsConceded: [],
      xGFor: [],
      xGAgainst: [],
      points: [],
      opponentElo: [],
      dates: [],
    };
    teamForms.set(team, form);
  }

  const pts = goalsFor > goalsAgainst ? 3 : goalsFor === goalsAgainst ? 1 : 0;

  form.goalsScored.push(goalsFor);
  form.goalsConceded.push(goalsAgainst);
  form.xGFor.push(xGFor);
  form.xGAgainst.push(xGAgainst);
  form.points.push(pts);
  form.opponentElo.push(opponentElo);
  form.dates.push(date);
}

// ═══════════════════════════════════════════════════════════════
// CALCULATE: Get dynamic stats for a team
// ═══════════════════════════════════════════════════════════════

export function getDynamicStats(team: string): TeamDynamicStats {
  const baseElo = getTeamEloFallback(team);
  const form = teamForms.get(team);

  if (!form || form.dates.length === 0) {
    // No matches yet — return baseline
    return {
      elo: baseElo,
      attackStrength: 1.2,
      defenseStrength: 1.0,
      xGDiff: 0,
      formPoints: 0,
      momentum: 0,
      matchesPlayed: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  const n = form.dates.length;

  // Exponential decay weights: most recent = 1.0, oldest = DECAY_FACTOR^(n-1)
  const weights = form.dates.map((_, i) => Math.pow(DECAY_FACTOR, n - 1 - i));
  const totalWeight = weights.reduce((s, w) => s + w, 0);

  // Weighted averages
  const attackStrength = weightedAvg(form.goalsScored, weights, totalWeight);
  const defenseStrength = weightedAvg(form.goalsConceded, weights, totalWeight);
  const xGForAvg = weightedAvg(form.xGFor, weights, totalWeight);
  const xGAgainstAvg = weightedAvg(form.xGAgainst, weights, totalWeight);

  // Bayesian blend: combine actual performance with prior (baseline)
  const priorAttack = baseElo > 1900 ? 1.8 : baseElo > 1800 ? 1.3 : 0.9;
  const blendedAttack = bayesianBlend(attackStrength, priorAttack, n, PRIOR_WEIGHT);
  const blendedDefense = bayesianBlend(defenseStrength, 1.0, n, PRIOR_WEIGHT);

  // xG differential (positive = overperforming attack, negative = underperforming)
  const xGDiff = xGForAvg - xGAgainstAvg;

  // Form points (weighted, like last 5 matches worth)
  const recentPoints = form.points.slice(-5);
  const recentWeights = weights.slice(-5);
  const recentTotalWeight = recentWeights.reduce((s, w) => s + w, 1); // +1 for prior
  const formPoints = weightedAvg(recentPoints, recentWeights, recentTotalWeight) * 5;

  // Momentum: recent trend in performance
  const momentum = calculateMomentum(form.points, form.goalsScored, form.goalsConceded);

  // ELO update based on actual results
  const eloUpdate = calculateEloUpdate(form, n);

  return {
    elo: baseElo + eloUpdate,
    attackStrength: Math.max(0.3, blendedAttack),
    defenseStrength: Math.max(0.3, blendedDefense),
    xGDiff,
    formPoints,
    momentum,
    matchesPlayed: n,
    lastUpdated: form.dates[form.dates.length - 1],
  };
}

// ═══════════════════════════════════════════════════════════════
// PREDICTION: Use dynamic stats for match prediction
// ═══════════════════════════════════════════════════════════════

export interface DynamicPrediction {
  homeExpectedGoals: number;
  awayExpectedGoals: number;
  homeWinPct: number;
  drawPct: number;
  awayWinPct: number;
  predictedScore: [number, number];
  confidence: number; // 0-100
  hasRealData: boolean;
}

export function predictMatchDynamic(
  homeTeam: string,
  awayTeam: string,
  homeAdvantage = 1.12
): DynamicPrediction {
  const homeStats = getDynamicStats(homeTeam);
  const awayStats = getDynamicStats(awayTeam);

  const hasRealData = homeStats.matchesPlayed > 0 || awayStats.matchesPlayed > 0;

  // Expected goals using dynamic attack vs defense
  const homeLambda = homeStats.attackStrength * awayStats.defenseStrength * homeAdvantage;
  const awayLambda = awayStats.attackStrength * homeStats.defenseStrength;

  // Elo difference adjustment
  const eloDiff = homeStats.elo - awayStats.elo;
  const eloAdjustment = eloDiff / 400;

  // Adjust lambdas based on Elo
  const adjustedHomeLambda = homeLambda * (1 + eloAdjustment * 0.3);
  const adjustedAwayLambda = awayLambda * (1 - eloAdjustment * 0.3);

  // Momentum adjustment
  const homeMomentumAdj = 1 + homeStats.momentum * 0.15;
  const awayMomentumAdj = 1 + awayStats.momentum * 0.15;

  const finalHomeLambda = Math.max(0.2, adjustedHomeLambda * homeMomentumAdj);
  const finalAwayLambda = Math.max(0.2, adjustedAwayLambda * awayMomentumAdj);

  // Poisson probabilities
  const { homeWin, draw, awayWin } = poissonOutcome(finalHomeLambda, finalAwayLambda);

  // Predicted score (round to nearest integer)
  const predHomeGoals = Math.round(finalHomeLambda);
  const predAwayGoals = Math.round(finalAwayLambda);

  // Confidence: higher when one team clearly dominates
  const maxProb = Math.max(homeWin, draw, awayWin);
  const confidence = Math.min(95, maxProb * 100);

  return {
    homeExpectedGoals: Math.round(finalHomeLambda * 100) / 100,
    awayExpectedGoals: Math.round(finalAwayLambda * 100) / 100,
    homeWinPct: Math.round(homeWin * 1000) / 10,
    drawPct: Math.round(draw * 1000) / 10,
    awayWinPct: Math.round(awayWin * 1000) / 10,
    predictedScore: [predHomeGoals, predAwayGoals],
    confidence: Math.round(confidence),
    hasRealData,
  };
}

// ═══════════════════════════════════════════════════════════════
// BULK: Get all team stats for dashboard
// ═══════════════════════════════════════════════════════════════

export function getAllTeamStats(): Map<string, TeamDynamicStats> {
  const stats = new Map<string, TeamDynamicStats>();
  const allTeams = Object.keys(ELO_RATINGS);
  for (const team of allTeams) {
    stats.set(team, getDynamicStats(team));
  }
  return stats;
}

export function getMatchResults(): MatchResult[] {
  return [...matchResults];
}

export function getResultsCount(): number {
  return matchResults.length;
}

// ═══════════════════════════════════════════════════════════════
// RESET: Clear all data (for testing)
// ═══════════════════════════════════════════════════════════════

export function resetEngine(): void {
  teamForms.clear();
  matchResults.length = 0;
}

// ═══════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════

function getTeamEloFallback(team: string): number {
  const entry = ELO_RATINGS[team];
  if (entry) return entry.elo;
  return 1650;
}

function weightedAvg(values: number[], weights: number[], totalWeight: number): number {
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i] * weights[i];
  }
  return totalWeight > 0 ? sum / totalWeight : 0;
}

function bayesianBlend(actual: number, prior: number, n: number, priorWeight: number): number {
  // Weighted average of actual performance and prior belief
  const actualWeight = n;
  const totalWeight = actualWeight + priorWeight;
  return (actual * actualWeight + prior * priorWeight) / totalWeight;
}

function calculateMomentum(
  points: number[],
  scored: number[],
  conceded: number[]
): number {
  if (points.length < 2) return 0;

  // Look at last 5 matches
  const recent = points.slice(-5);
  if (recent.length === 0) return 0;

  // Trend: are they improving or declining?
  const firstHalf = recent.slice(0, Math.ceil(recent.length / 2));
  const secondHalf = recent.slice(Math.ceil(recent.length / 2));

  const firstAvg = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;

  const trend = (secondAvg - firstAvg) / 3; // Normalize to -1 to 1

  // Combine with current form
  const currentForm = recent[recent.length - 1] / 3; // 0, 0.33, or 1

  return Math.max(-1, Math.min(1, (currentForm * 0.6 + trend * 0.4)));
}

function calculateEloUpdate(form: TeamFormEntry, n: number): number {
  if (n === 0) return 0;

  let eloChange = 0;
  const K = 20; // K-factor

  for (let i = 0; i < form.points.length; i++) {
    const actualPoints = form.points[i]; // 3, 1, or 0
    const opponentElo = form.opponentElo[i];

    // Expected points based on Elo difference
    const eloDiff = 1650 - opponentElo; // Use baseline as team's starting elo
    const expectedWin = 1 / (1 + Math.pow(10, -eloDiff / 400));
    const expectedPoints = expectedWin * 3 + (1 - expectedWin - 0) * 1; // Simplified

    // Actual vs expected
    const actualResult = actualPoints / 3; // 0, 0.33, or 1
    eloChange += K * (actualResult - expectedPoints / 3);
  }

  // Decay older results
  return eloChange / n;
}

function poissonOutcome(lambdaHome: number, lambdaAway: number): {
  homeWin: number; draw: number; awayWin: number;
} {
  let homeWin = 0, draw = 0, awayWin = 0;

  // Score matrix 0-0 to 6-6
  for (let h = 0; h <= 6; h++) {
    for (let a = 0; a <= 6; a++) {
      const prob = poissonPMF(h, lambdaHome) * poissonPMF(a, lambdaAway);
      if (h > a) homeWin += prob;
      else if (h === a) draw += prob;
      else awayWin += prob;
    }
  }

  // Normalize (small probability mass beyond 6 goals)
  const total = homeWin + draw + awayWin;
  return {
    homeWin: homeWin / total,
    draw: draw / total,
    awayWin: awayWin / total,
  };
}

function poissonPMF(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let result = Math.exp(-lambda) * Math.pow(lambda, k);
  let factorial = 1;
  for (let i = 2; i <= k; i++) factorial *= i;
  return result / factorial;
}
