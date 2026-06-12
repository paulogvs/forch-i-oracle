export interface FixtureMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  predictedHome: number;
  predictedAway: number;
  phase: 'group' | 'r32' | 'r16' | 'quarter' | 'semi' | 'final' | 'third';
  group?: string;
  date: string;
  confidence: number;
  xG: { home: number; away: number };
  analysis?: string;
}
