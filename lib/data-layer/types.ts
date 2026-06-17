// FORCH.i ORACLE — Data Layer Types
// Shared types used by all data layer implementations

// ═══════════════════════════════════════════════════════════════
// TEAMS
// ═══════════════════════════════════════════════════════════════

export interface DBTeam {
  id: string;
  fifaCode: string;
  name: string;
  groupChar: string;
  confederation: string;
  eloRating: number;
  powerRatings: { attack: number; defense: number; midfield: number };
  createdAt: string;
  updatedAt: string;
}

// ═══════════════════════════════════════════════════════════════
// MATCHES
// ═══════════════════════════════════════════════════════════════

export type MatchRound = 'group' | 'R32' | 'R16' | 'QF' | 'SF' | 'F';
export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'cancelled';

export interface DBMatch {
  id: string;
  matchNumber?: number;
  groupChar?: string;
  round: MatchRound;
  homeTeamId: string;
  awayTeamId: string;
  matchDate?: string;
  matchTime?: string;
  venue?: string;
  city?: string;
  status: MatchStatus;
  scoreHome?: number;
  scoreAway?: number;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════
// PREDICTIONS
// ═══════════════════════════════════════════════════════════════

export interface DBMatchPrediction {
  id: string;
  matchId: string;
  homeWin: number;
  draw: number;
  awayWin: number;
  mostLikelyScore: string;  // "2-1"
  expectedGoalsHome: number;
  expectedGoalsAway: number;
  over25Probability: number;
  bttsProbability: number;
  keyFactors: unknown[];    // JSON array
  confidence: 'alta' | 'media' | 'baja';
  dataQualityScore: number; // 0-100
  modelVersion: string;
  predictedAt: string;
  // Additional fields from enhanced engine
  momentum?: number;
  fatigueImpact?: number;
  homeAdvantageBonus?: number;
  injuryPenalty?: number;
  homeAttack?: number;
  homeDefense?: number;
  homeMidfield?: number;
  awayAttack?: number;
  awayDefense?: number;
  awayMidfield?: number;
  homeElo?: number;
  awayElo?: number;
  topScores?: { home: number; away: number; probability: number }[];
  // Groq analysis (stored alongside prediction for convenience)
  analysis?: string;
  homeKeyPlayers?: string[];
  awayKeyPlayers?: string[];
}

// ═══════════════════════════════════════════════════════════════
// TEAM FORM / DYNAMIC STATS
// ═══════════════════════════════════════════════════════════════

export interface DBTeamForm {
  id: string;
  teamId: string;
  last5: Array<{ result: 'W' | 'D' | 'L'; opponent: string; goalsFor: number; goalsAgainst: number; date: string; competition?: string }>;
  xgFor: number;
  xgAgainst: number;
  momentum: number;        // -1.0 to +1.0
  matchesPlayed: number;
  eloDynamic?: number;     // Dynamic Elo (updated after each match)
  updatedAt: string;
}

// ═══════════════════════════════════════════════════════════════
// TOURNAMENT PROBABILITIES
// ═══════════════════════════════════════════════════════════════

export interface DBTournamentProbs {
  id: string;
  teamId: string;
  championProb: number;     // percentage
  semifinalistProb?: number;
  runnerUpProb?: number;
  simulationsCount: number;
  totalSimulations: number;
  calculatedAt: string;
}

// ═══════════════════════════════════════════════════════════════
// REAL MATCH RESULT (submitted post-match)
// ═══════════════════════════════════════════════════════════════

export interface RealMatchResultInput {
  matchId: string;
  homeScore: number;
  awayScore: number;
  winner: string;
}

// ═══════════════════════════════════════════════════════════════
// SIMULATION BATCH METADATA
// ═══════════════════════════════════════════════════════════════

export interface SimulationBatch {
  id: string;
  totalSims: number;
  completedSims: number;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
}

// ═══════════════════════════════════════════════════════════════
// ACCURACY METRICS
// ═══════════════════════════════════════════════════════════════

export interface DBAccuracyMetric {
  id: string;
  matchId: string;
  predictedHomeWin: number;
  predictedDraw: number;
  predictedAwayWin: number;
  actualResult: 'home' | 'draw' | 'away';
  predictedCorrect: boolean;
  brierScore: number;
  logLoss: number;
  modelVersion: string;
  evaluatedAt: string;
}

// ═══════════════════════════════════════════════════════════════
// CRON JOB STATUS
// ═══════════════════════════════════════════════════════════════

export interface CronJobStatus {
  jobName: string;
  lastRun: string;
  status: 'success' | 'failed' | 'running' | 'never_run';
  durationMs?: number;
  recordsProcessed?: number;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════
// KEY-VALUE STORE (for consensus bracket, etc.)
// ═══════════════════════════════════════════════════════════════

export interface DBKeyValue {
  key: string;
  value: unknown;
  updatedAt: string;
}
