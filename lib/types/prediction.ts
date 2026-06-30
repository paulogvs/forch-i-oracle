// FORCH.i ORACLE — Shared Prediction type
// Statistical prediction contract (Poisson + Elo + xG + Bayesian ensemble)

export interface Prediction {
  homeWin: number;
  draw: number;
  awayWin: number;
  predictedScoreHome: number;
  predictedScoreAway: number;
  confidence: 'alta' | 'media' | 'baja';
  analysis: string;
  keyFactors: { label: string; homeAdvantage: number; description: string }[];
  homeKeyPlayers: string[];
  awayKeyPlayers: string[];
  homeFormLast5: ('W' | 'D' | 'L')[];
  awayFormLast5: ('W' | 'D' | 'L')[];
  homeAttackStrength: number;
  awayAttackStrength: number;
  homeDefenseStrength: number;
  awayDefenseStrength: number;
  homeMidfieldStrength: number;
  awayMidfieldStrength: number;
  homeExpectedGoals: number;
  awayExpectedGoals: number;
  over25Probability: number;
  bttsProbability: number;
  topScores: { home: number; away: number; probability: number }[];
}
