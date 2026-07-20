import { describe, it, expect } from 'vitest';
import {
  calculateEnhancedPrediction,
  calculateMomentum,
  calculateAdjustedXG,
  calculateCompositeAdjustment,
  calculateFatigue,
  calculateHomeAdvantage,
  calculateInjuryImpact,
  calculateH2HFactorWeighted,
  calculateTravelFatigue,
  enhancedFormAdjustment,
  adjustRatingByCompetition,
  assessDataQuality,
  type MatchResult,
  type EnhancedPredictionContext,
  type InjuredPlayer,
  type H2HMatch,
} from '../enhanced-engine';

// ═══════════════════════════════════════════════════════════════
// HELPERS — Reusable test data
// ═══════════════════════════════════════════════════════════════

function makeMatch(overrides: Partial<MatchResult> & { result: 'W' | 'D' | 'L' }): MatchResult {
  return {
    opponent: 'Rival',
    goalsFor: 2,
    goalsAgainst: 1,
    date: '2026-01-01',
    competition: 'World Cup',
    ...overrides,
  };
}

function makeWins(count: number): MatchResult[] {
  return Array.from({ length: count }, (_, i) =>
    makeMatch({
      result: 'W',
      goalsFor: 2,
      goalsAgainst: 0,
      date: `2026-06-${String(i + 1).padStart(2, '0')}`,
    })
  );
}

function makeLosses(count: number): MatchResult[] {
  return Array.from({ length: count }, (_, i) =>
    makeMatch({
      result: 'L',
      goalsFor: 0,
      goalsAgainst: 2,
      date: `2026-06-${String(i + 1).padStart(2, '0')}`,
    })
  );
}

function makeInjury(overrides: Partial<InjuredPlayer> = {}): InjuredPlayer {
  return {
    name: 'Jugador Test',
    position: 'FWD',
    isStarter: true,
    ...overrides,
  };
}

function makeH2H(overrides: Partial<H2HMatch> = {}): H2HMatch {
  return {
    teamAScore: 2,
    teamBScore: 1,
    date: '2025-06-01',
    competition: 'World Cup',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// 1. calculateEnhancedPrediction — Main prediction
// ═══════════════════════════════════════════════════════════════

describe('calculateEnhancedPrediction', () => {
  it('returns valid prediction without context (defaults)', () => {
    const result = calculateEnhancedPrediction('Argentina', 'Francia');

    expect(result.homeWin + result.draw + result.awayWin).toBe(100);
    expect(result.homeWin).toBeGreaterThanOrEqual(0);
    expect(result.awayWin).toBeGreaterThanOrEqual(0);
    expect(result.draw).toBeGreaterThanOrEqual(0);
    expect(result.momentum).toBe(0);
    expect(result.fatigueImpact).toBe(0);
    expect(result.homeAdvantageBonus).toBe(0);
    expect(result.injuryPenalty).toBe(0);
    expect(result.adjustedXGHome).toBeGreaterThan(0);
    expect(result.adjustedXGAway).toBeGreaterThan(0);
    expect(result.dataQualityScore).toBeGreaterThanOrEqual(0);
    expect(result.dataQualityScore).toBeLessThanOrEqual(100);
  });

  it('has no NaN values in any field', () => {
    const result = calculateEnhancedPrediction('Brasil', 'Argentina');

    expect(Number.isNaN(result.homeWin)).toBe(false);
    expect(Number.isNaN(result.draw)).toBe(false);
    expect(Number.isNaN(result.awayWin)).toBe(false);
    expect(Number.isNaN(result.homeExpectedGoals)).toBe(false);
    expect(Number.isNaN(result.awayExpectedGoals)).toBe(false);
    expect(Number.isNaN(result.momentum)).toBe(false);
    expect(Number.isNaN(result.fatigueImpact)).toBe(false);
    expect(Number.isNaN(result.homeAdvantageBonus)).toBe(false);
    expect(Number.isNaN(result.injuryPenalty)).toBe(false);
    expect(Number.isNaN(result.adjustedXGHome)).toBe(false);
    expect(Number.isNaN(result.adjustedXGAway)).toBe(false);
    expect(Number.isNaN(result.dataQualityScore)).toBe(false);
    expect(Number.isNaN(result.homeElo)).toBe(false);
    expect(Number.isNaN(result.awayElo)).toBe(false);
  });

  it('returns prediction extending StatisticalPrediction', () => {
    const result = calculateEnhancedPrediction('España', 'México');

    // Base StatisticalPrediction fields present
    expect(typeof result.homeWin).toBe('number');
    expect(typeof result.draw).toBe('number');
    expect(typeof result.awayWin).toBe('number');
    expect(typeof result.predictedScoreHome).toBe('number');
    expect(typeof result.predictedScoreAway).toBe('number');
    expect(typeof result.homeExpectedGoals).toBe('number');
    expect(typeof result.awayExpectedGoals).toBe('number');
    expect(typeof result.over25Probability).toBe('number');
    expect(typeof result.bttsProbability).toBe('number');
    expect(typeof result.homeAttack).toBe('number');
    expect(typeof result.homeDefense).toBe('number');
    expect(typeof result.awayAttack).toBe('number');
    expect(typeof result.awayDefense).toBe('number');
    expect(typeof result.homeElo).toBe('number');
    expect(typeof result.awayElo).toBe('number');
    expect(typeof result.confidence).toBe('string');
    expect(Array.isArray(result.topScores)).toBe(true);

    // Enhanced fields present
    expect(typeof result.momentum).toBe('number');
    expect(typeof result.fatigueImpact).toBe('number');
    expect(typeof result.homeAdvantageBonus).toBe('number');
    expect(typeof result.injuryPenalty).toBe('number');
    expect(typeof result.adjustedXGHome).toBe('number');
    expect(typeof result.adjustedXGAway).toBe('number');
    expect(typeof result.dataQualityScore).toBe('number');
  });

  it('has momentum in range [-1.0, +1.0]', () => {
    const result = calculateEnhancedPrediction('Argentina', 'Brasil');
    expect(result.momentum).toBeGreaterThanOrEqual(-1.0);
    expect(result.momentum).toBeLessThanOrEqual(1.0);
  });

  it('has fatigueImpact in range [-0.15, +0.05]', () => {
    const result = calculateEnhancedPrediction('Argentina', 'Francia');
    expect(result.fatigueImpact).toBeGreaterThanOrEqual(-0.15);
    expect(result.fatigueImpact).toBeLessThanOrEqual(0.05);
  });

  it('has homeAdvantageBonus in range [0, 0.08]', () => {
    const result = calculateEnhancedPrediction('Argentina', 'Francia');
    expect(result.homeAdvantageBonus).toBeGreaterThanOrEqual(0);
    expect(result.homeAdvantageBonus).toBeLessThanOrEqual(0.08);
  });

  it('has injuryPenalty in range [0, 0.25]', () => {
    const result = calculateEnhancedPrediction('Argentina', 'Francia');
    expect(result.injuryPenalty).toBeGreaterThanOrEqual(0);
    expect(result.injuryPenalty).toBeLessThanOrEqual(0.25);
  });

  it('has adjustedXGHome and adjustedXGAway > 0', () => {
    const result = calculateEnhancedPrediction('Brasil', 'Alemania');
    expect(result.adjustedXGHome).toBeGreaterThan(0);
    expect(result.adjustedXGAway).toBeGreaterThan(0);
  });

  it('has dataQualityScore in range [0, 100]', () => {
    const result = calculateEnhancedPrediction('Argentina', 'Francia');
    expect(result.dataQualityScore).toBeGreaterThanOrEqual(0);
    expect(result.dataQualityScore).toBeLessThanOrEqual(100);
  });

  it('produces realistic score predictions (0-5 range)', () => {
    const result = calculateEnhancedPrediction('Brasil', 'Haití');
    expect(result.predictedScoreHome).toBeGreaterThanOrEqual(0);
    expect(result.predictedScoreHome).toBeLessThanOrEqual(5);
    expect(result.predictedScoreAway).toBeGreaterThanOrEqual(0);
    expect(result.predictedScoreAway).toBeLessThanOrEqual(5);
  });

  it('handles full context with recentMatches, injuries, and venue', () => {
    const homeContext: EnhancedPredictionContext = {
      teamName: 'México',
      recentMatches: makeWins(5),
      injuries: [makeInjury({ name: 'Santiago Giménez', position: 'FWD', isStarter: true })],
      venue: 'Estadio Azteca',
      daysSinceLastMatch: 5,
    };
    const awayContext: EnhancedPredictionContext = {
      teamName: 'Francia',
      recentMatches: makeLosses(3),
      injuries: [],
      daysSinceLastMatch: 3,
    };

    const result = calculateEnhancedPrediction('México', 'Francia', homeContext, awayContext);

    expect(result.homeWin + result.draw + result.awayWin).toBe(100);
    expect(result.homeWin).toBeGreaterThan(0);
    expect(result.awayWin).toBeGreaterThan(0);
    expect(result.momentum).toBeGreaterThan(0);
    expect(result.homeAdvantageBonus).toBe(0.08);
    expect(result.injuryPenalty).toBeGreaterThan(0);
    expect(result.dataQualityScore).toBeGreaterThanOrEqual(65);
  });

  it('gives Mexico host nation advantage when venue provided', () => {
    const withVenue = calculateEnhancedPrediction('México', 'Japón', {
      teamName: 'México',
      venue: 'Estadio Azteca',
    });
    const withoutVenue = calculateEnhancedPrediction('México', 'Japón');

    expect(withVenue.homeAdvantageBonus).toBe(0.08);
    expect(withoutVenue.homeAdvantageBonus).toBe(0);
  });

  it('gives USA host nation advantage', () => {
    const result = calculateEnhancedPrediction('Estados Unidos', 'Japón', {
      teamName: 'Estados Unidos',
      venue: 'MetLife Stadium',
    });
    expect(result.homeAdvantageBonus).toBe(0.08);
  });

  it('gives Canada host nation advantage', () => {
    const result = calculateEnhancedPrediction('Canadá', 'Suiza', {
      teamName: 'Canadá',
      venue: 'BC Place',
    });
    expect(result.homeAdvantageBonus).toBe(0.08);
  });

  it('gives zero home advantage for non-host nations at WC2026 venues', () => {
    const result = calculateEnhancedPrediction('Japón', 'Corea del Sur', {
      teamName: 'Japón',
      venue: 'MetLife Stadium',
    });
    expect(result.homeAdvantageBonus).toBe(0);
  });

  it('increases dataQualityScore with more context provided', () => {
    const bare = calculateEnhancedPrediction('Argentina', 'Francia');

    const full = calculateEnhancedPrediction('Argentina', 'Francia', {
      teamName: 'Argentina',
      recentMatches: makeWins(5),
      injuries: [makeInjury()],
      venue: 'Estadio Azteca',
      h2hHistory: [makeH2H(), makeH2H()],
    }, {
      teamName: 'Francia',
      recentMatches: makeWins(3),
      injuries: [makeInjury()],
    });

    expect(full.dataQualityScore).toBeGreaterThan(bare.dataQualityScore);
  });

  it('handles unknown teams gracefully', () => {
    const result = calculateEnhancedPrediction('Equipo Fake', 'Argentina');
    expect(result.homeWin + result.draw + result.awayWin).toBe(100);
    expect(Number.isNaN(result.homeWin)).toBe(false);
    expect(Number.isNaN(result.awayWin)).toBe(false);
  });

  it('handles both teams unknown', () => {
    const result = calculateEnhancedPrediction('Alpha', 'Beta');
    expect(result.homeWin + result.draw + result.awayWin).toBe(100);
    expect(Number.isNaN(result.homeWin)).toBe(false);
  });

  it('home team with strong winning streak gets higher homeWin than baseline', () => {
    const baseline = calculateEnhancedPrediction('Argentina', 'Francia');
    const boosted = calculateEnhancedPrediction('Argentina', 'Francia', {
      teamName: 'Argentina',
      recentMatches: makeWins(5),
    });

    expect(boosted.homeWin).toBeGreaterThanOrEqual(baseline.homeWin);
  });

  it('away team with losing streak increases home advantage', () => {
    const baseline = calculateEnhancedPrediction('Argentina', 'Francia');
    const boosted = calculateEnhancedPrediction('Argentina', 'Francia', undefined, {
      teamName: 'Francia',
      recentMatches: makeLosses(5),
    });

    expect(boosted.awayWin).toBeLessThanOrEqual(baseline.awayWin);
  });

  it('injury to starter reduces expected goals', () => {
    const clean = calculateEnhancedPrediction('Argentina', 'Francia', {
      teamName: 'Argentina',
    });
    const injured = calculateEnhancedPrediction('Argentina', 'Francia', {
      teamName: 'Argentina',
      injuries: [
        makeInjury({ name: 'Lionel Messi', position: 'FWD', isStarter: true }),
        makeInjury({ name: 'Julián Álvarez', position: 'FWD', isStarter: true }),
      ],
    });

    expect(injured.injuryPenalty).toBeGreaterThan(clean.injuryPenalty);
    expect(injured.adjustedXGHome).toBeLessThanOrEqual(clean.adjustedXGHome);
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. calculateMomentum
// ═══════════════════════════════════════════════════════════════

describe('calculateMomentum', () => {
  it('returns 0 for empty matches', () => {
    expect(calculateMomentum([])).toBe(0);
  });

  it('returns positive momentum for all wins', () => {
    const momentum = calculateMomentum(makeWins(5));
    expect(momentum).toBeGreaterThan(0);
    expect(momentum).toBeLessThanOrEqual(1.0);
  });

  it('returns negative momentum for all losses', () => {
    const momentum = calculateMomentum(makeLosses(5));
    expect(momentum).toBeLessThan(0);
    expect(momentum).toBeGreaterThanOrEqual(-1.0);
  });

  it('returns near zero for mixed results', () => {
    const mixed: MatchResult[] = [
      makeMatch({ result: 'W', goalsFor: 2, goalsAgainst: 1 }),
      makeMatch({ result: 'L', goalsFor: 0, goalsAgainst: 2 }),
      makeMatch({ result: 'W', goalsFor: 1, goalsAgainst: 0 }),
      makeMatch({ result: 'L', goalsFor: 0, goalsAgainst: 1 }),
    ];
    const momentum = calculateMomentum(mixed);
    expect(Math.abs(momentum)).toBeLessThan(0.5);
  });

  it('weights recent matches more heavily', () => {
    const recentWinsFirst: MatchResult[] = [
      makeMatch({ result: 'W', goalsFor: 3, goalsAgainst: 0, date: '2026-06-05' }),
      makeMatch({ result: 'W', goalsFor: 2, goalsAgainst: 0, date: '2026-06-03' }),
      makeMatch({ result: 'L', goalsFor: 0, goalsAgainst: 2, date: '2026-06-01' }),
      makeMatch({ result: 'L', goalsFor: 0, goalsAgainst: 1, date: '2026-05-29' }),
    ];
    const lossesFirst: MatchResult[] = [
      makeMatch({ result: 'L', goalsFor: 0, goalsAgainst: 2, date: '2026-06-05' }),
      makeMatch({ result: 'L', goalsFor: 0, goalsAgainst: 1, date: '2026-06-03' }),
      makeMatch({ result: 'W', goalsFor: 3, goalsAgainst: 0, date: '2026-06-01' }),
      makeMatch({ result: 'W', goalsFor: 2, goalsAgainst: 0, date: '2026-05-29' }),
    ];

    const recentWinsMomentum = calculateMomentum(recentWinsFirst);
    const lossesFirstMomentum = calculateMomentum(lossesFirst);

    expect(recentWinsMomentum).toBeGreaterThan(lossesFirstMomentum);
  });

  it('is bounded between -1.0 and 1.0 for extreme inputs', () => {
    const hugeWins = makeWins(20);
    const hugeLosses = makeLosses(20);
    expect(calculateMomentum(hugeWins)).toBeLessThanOrEqual(1.0);
    expect(calculateMomentum(hugeLosses)).toBeGreaterThanOrEqual(-1.0);
  });

  it('uses only last 5 matches', () => {
    const fiveWins = makeWins(5);
    const tenWins = makeWins(10);
    expect(calculateMomentum(fiveWins)).toBe(calculateMomentum(tenWins));
  });

  it('big goal difference adds bonus', () => {
    const bigWins: MatchResult[] = [
      makeMatch({ result: 'W', goalsFor: 5, goalsAgainst: 0, date: '2026-06-05' }),
      makeMatch({ result: 'W', goalsFor: 4, goalsAgainst: 0, date: '2026-06-03' }),
      makeMatch({ result: 'D', goalsFor: 1, goalsAgainst: 1, date: '2026-06-01' }),
    ];
    const narrowWins: MatchResult[] = [
      makeMatch({ result: 'W', goalsFor: 1, goalsAgainst: 0, date: '2026-06-05' }),
      makeMatch({ result: 'W', goalsFor: 1, goalsAgainst: 0, date: '2026-06-03' }),
      makeMatch({ result: 'D', goalsFor: 1, goalsAgainst: 1, date: '2026-06-01' }),
    ];
    const bigWin = calculateMomentum(bigWins);
    const narrowWin = calculateMomentum(narrowWins);
    expect(bigWin).toBeGreaterThan(narrowWin);
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. calculateAdjustedXG — Competition-adjusted xG
// ═══════════════════════════════════════════════════════════════

describe('calculateAdjustedXG', () => {
  it('returns baseline 1.2 for empty data', () => {
    expect(calculateAdjustedXG('Argentina', [])).toBe(1.2);
  });

  it('returns positive number for valid data', () => {
    const result = calculateAdjustedXG('Brasil', [
      { goals: 2, competition: 'World Cup', date: '2026-03-01' },
      { goals: 1, competition: 'World Cup', date: '2026-02-01' },
    ]);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeGreaterThanOrEqual(0.3);
    expect(result).toBeLessThanOrEqual(4.0);
  });

  it('weights World Cup higher than Friendlies', () => {
    const wcGoals = [
      { goals: 2, competition: 'World Cup', date: '2026-03-01' },
      { goals: 2, competition: 'World Cup', date: '2026-02-01' },
    ];
    const friendlyGoals = [
      { goals: 2, competition: 'Friendly', date: '2026-03-01' },
      { goals: 2, competition: 'Friendly', date: '2026-02-01' },
    ];
    const wcXG = calculateAdjustedXG('Argentina', wcGoals);
    const friendlyXG = calculateAdjustedXG('Argentina', friendlyGoals);
    expect(wcXG).toBeGreaterThanOrEqual(friendlyXG);
  });

  it('weights Copa America between World Cup and Friendly', () => {
    const wcGoals = [
      { goals: 2, competition: 'World Cup', date: '2026-03-01' },
    ];
    const copaGoals = [
      { goals: 2, competition: 'Copa America', date: '2026-03-01' },
    ];
    const friendlyGoals = [
      { goals: 2, competition: 'Friendly', date: '2026-03-01' },
    ];
    const wcXG = calculateAdjustedXG('Brasil', wcGoals);
    const copaXG = calculateAdjustedXG('Brasil', copaGoals);
    const friendlyXG = calculateAdjustedXG('Brasil', friendlyGoals);

    expect(wcXG).toBeGreaterThanOrEqual(copaXG);
    expect(copaXG).toBeGreaterThanOrEqual(friendlyXG);
  });

  it('weights recent matches higher than older ones', () => {
    const recentFirst = calculateAdjustedXG('Argentina', [
      { goals: 3, competition: 'World Cup', date: '2026-06-10' },
      { goals: 0, competition: 'World Cup', date: '2026-01-01' },
    ]);
    const oldFirst = calculateAdjustedXG('Argentina', [
      { goals: 0, competition: 'World Cup', date: '2026-06-10' },
      { goals: 3, competition: 'World Cup', date: '2026-01-01' },
    ]);

    expect(recentFirst).toBeGreaterThan(oldFirst);
  });

  it('clamps result between 0.3 and 4.0', () => {
    const manyGoals = Array.from({ length: 10 }, (_, i) => ({
      goals: 8,
      competition: 'World Cup' as string,
      date: `2026-03-${String(i + 1).padStart(2, '0')}`,
    }));
    const result = calculateAdjustedXG('Brasil', manyGoals);
    expect(result).toBeGreaterThanOrEqual(0.3);
    expect(result).toBeLessThanOrEqual(4.0);
  });

  it('handles single match', () => {
    const result = calculateAdjustedXG('Argentina', [
      { goals: 2, competition: 'World Cup', date: '2026-06-01' },
    ]);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeGreaterThanOrEqual(0.3);
    expect(result).toBeLessThanOrEqual(4.0);
  });

  it('treats unknown competition as 0.80 default', () => {
    const result = calculateAdjustedXG('Argentina', [
      { goals: 2, competition: 'Unknown League', date: '2026-06-01' },
    ]);
    expect(result).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. calculateCompositeAdjustment
// ═══════════════════════════════════════════════════════════════

describe('calculateCompositeAdjustment', () => {
  it('returns 1.0 for empty context', () => {
    const result = calculateCompositeAdjustment({ teamName: 'Argentina' });
    expect(result).toBe(1.0);
  });

  it('returns multiplier between 0.6 and 1.4', () => {
    const result = calculateCompositeAdjustment({ teamName: 'Argentina' });
    expect(result).toBeGreaterThanOrEqual(0.6);
    expect(result).toBeLessThanOrEqual(1.4);
  });

  it('positive momentum increases multiplier', () => {
    const baseline = calculateCompositeAdjustment({ teamName: 'Argentina' });
    const withMomentum = calculateCompositeAdjustment({
      teamName: 'Argentina',
      recentMatches: makeWins(5),
    });
    expect(withMomentum).toBeGreaterThan(baseline);
  });

  it('negative momentum decreases multiplier', () => {
    const baseline = calculateCompositeAdjustment({ teamName: 'Argentina' });
    const withMomentum = calculateCompositeAdjustment({
      teamName: 'Argentina',
      recentMatches: makeLosses(5),
    });
    expect(withMomentum).toBeLessThan(baseline);
  });

  it('more rest days improve multiplier (within fatigue range)', () => {
    const tired = calculateCompositeAdjustment({
      teamName: 'Argentina',
      daysSinceLastMatch: 1,
    });
    const fresh = calculateCompositeAdjustment({
      teamName: 'Argentina',
      daysSinceLastMatch: 6,
    });
    expect(fresh).toBeGreaterThan(tired);
  });

  it('optimal rest (4-7 days) returns baseline', () => {
    const result = calculateCompositeAdjustment({
      teamName: 'Argentina',
      daysSinceLastMatch: 5,
    });
    expect(result).toBeCloseTo(1.0, 1);
  });

  it('host nation venue increases multiplier', () => {
    const noVenue = calculateCompositeAdjustment({ teamName: 'México' });
    const withVenue = calculateCompositeAdjustment({
      teamName: 'México',
      venue: 'Estadio Azteca',
    });
    expect(withVenue).toBeGreaterThan(noVenue);
  });

  it('injuries decrease multiplier', () => {
    const clean = calculateCompositeAdjustment({ teamName: 'Argentina' });
    const injured = calculateCompositeAdjustment({
      teamName: 'Argentina',
      injuries: [
        makeInjury({ position: 'GK', isStarter: true }),
        makeInjury({ position: 'FWD', isStarter: true }),
      ],
    });
    expect(injured).toBeLessThan(clean);
  });

  it('combines all factors multiplicatively', () => {
    const allPositive: EnhancedPredictionContext = {
      teamName: 'México',
      recentMatches: makeWins(5),
      daysSinceLastMatch: 6,
      venue: 'Estadio Azteca',
    };
    const allNegative: EnhancedPredictionContext = {
      teamName: 'México',
      recentMatches: makeLosses(5),
      daysSinceLastMatch: 1,
      injuries: [makeInjury({ position: 'GK', isStarter: true })],
    };
    const positive = calculateCompositeAdjustment(allPositive);
    const negative = calculateCompositeAdjustment(allNegative);

    expect(positive).toBeGreaterThan(1.0);
    expect(negative).toBeLessThan(1.0);
    expect(positive).toBeGreaterThan(negative);
  });

  it('is clamped to [0.6, 1.4] even with extreme inputs', () => {
    const extreme: EnhancedPredictionContext = {
      teamName: 'México',
      recentMatches: makeWins(5),
      daysSinceLastMatch: 15,
      venue: 'Estadio Azteca',
    };
    const result = calculateCompositeAdjustment(extreme);
    expect(result).toBeGreaterThanOrEqual(0.6);
    expect(result).toBeLessThanOrEqual(1.4);
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. calculateFatigue
// ═══════════════════════════════════════════════════════════════

describe('calculateFatigue', () => {
  it('returns severe fatigue (-0.15) for <2 days', () => {
    expect(calculateFatigue(1)).toBe(-0.15);
    expect(calculateFatigue(0)).toBe(-0.15);
  });

  it('returns -0.12 for 2 days rest', () => {
    expect(calculateFatigue(2)).toBe(-0.12);
  });

  it('returns -0.05 for 3 days rest', () => {
    expect(calculateFatigue(3)).toBe(-0.05);
  });

  it('returns 0 for 4-7 days (optimal range)', () => {
    expect(calculateFatigue(4)).toBe(0);
    expect(calculateFatigue(5)).toBe(0);
    expect(calculateFatigue(6)).toBe(0);
    expect(calculateFatigue(7)).toBe(0);
  });

  it('returns +0.03 for 8-14 days (well-rested)', () => {
    expect(calculateFatigue(8)).toBe(0.03);
    expect(calculateFatigue(14)).toBe(0.03);
  });

  it('returns +0.05 for 15+ days (very fresh)', () => {
    expect(calculateFatigue(15)).toBe(0.05);
    expect(calculateFatigue(30)).toBe(0.05);
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. calculateHomeAdvantage
// ═══════════════════════════════════════════════════════════════

describe('calculateHomeAdvantage', () => {
  it('returns 0.08 for host nations', () => {
    expect(calculateHomeAdvantage('México', 'Estadio Azteca')).toBe(0.08);
    expect(calculateHomeAdvantage('Estados Unidos', 'MetLife Stadium')).toBe(0.08);
    expect(calculateHomeAdvantage('Canadá', 'BC Place')).toBe(0.08);
  });

  it('returns 0 for non-CONCACAF team at WC2026 venue', () => {
    expect(calculateHomeAdvantage('Japón', 'MetLife Stadium')).toBe(0);
    expect(calculateHomeAdvantage('Alemania', 'SoFi Stadium')).toBe(0);
  });

  it('returns non-negative for all inputs', () => {
    const result = calculateHomeAdvantage('Francia', 'Estadio Azteca');
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('South American teams get modest advantage (same continent proximity)', () => {
    const result = calculateHomeAdvantage('Argentina', 'Estadio Azteca');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(0.05);
  });
});

// ═══════════════════════════════════════════════════════════════
// 7. calculateInjuryImpact
// ═══════════════════════════════════════════════════════════════

describe('calculateInjuryImpact', () => {
  it('returns 0 for empty injuries', () => {
    expect(calculateInjuryImpact([])).toBe(0);
  });

  it('returns 0 for undefined injuries', () => {
    expect(calculateInjuryImpact(undefined as unknown as InjuredPlayer[])).toBe(0);
  });

  it('goalkeeper starter injury is most impactful (0.08)', () => {
    const impact = calculateInjuryImpact([
      makeInjury({ position: 'GK', isStarter: true }),
    ]);
    expect(impact).toBe(0.08);
  });

  it('forward starter injury is second most impactful (0.06)', () => {
    const impact = calculateInjuryImpact([
      makeInjury({ position: 'FWD', isStarter: true }),
    ]);
    expect(impact).toBe(0.06);
  });

  it('midfielder starter injury (0.05)', () => {
    const impact = calculateInjuryImpact([
      makeInjury({ position: 'MID', isStarter: true }),
    ]);
    expect(impact).toBe(0.05);
  });

  it('defender starter injury (0.05)', () => {
    const impact = calculateInjuryImpact([
      makeInjury({ position: 'DEF', isStarter: true }),
    ]);
    expect(impact).toBe(0.05);
  });

  it('substitute injury is less impactful (0.02)', () => {
    const impact = calculateInjuryImpact([
      makeInjury({ isStarter: false }),
    ]);
    expect(impact).toBe(0.02);
  });

  it('accumulates injury impact across multiple players', () => {
    const impact = calculateInjuryImpact([
      makeInjury({ position: 'GK', isStarter: true }),
      makeInjury({ position: 'FWD', isStarter: true }),
      makeInjury({ position: 'MID', isStarter: true }),
    ]);
    expect(impact).toBeGreaterThan(0.1);
  });

  it('is clamped to max 0.25', () => {
    const manyInjuries = Array.from({ length: 10 }, () =>
      makeInjury({ position: 'GK', isStarter: true })
    );
    const impact = calculateInjuryImpact(manyInjuries);
    expect(impact).toBeLessThanOrEqual(0.25);
  });

  it('mix of starters and substitutes', () => {
    const impact = calculateInjuryImpact([
      makeInjury({ position: 'GK', isStarter: true }),
      makeInjury({ position: 'FWD', isStarter: false }),
    ]);
    expect(impact).toBeCloseTo(0.10, 2);
  });
});

// ═══════════════════════════════════════════════════════════════
// 8. calculateH2HFactorWeighted
// ═══════════════════════════════════════════════════════════════

describe('calculateH2HFactorWeighted', () => {
  it('falls back to computeH2H with fewer than 2 matches', () => {
    const factor = calculateH2HFactorWeighted('Argentina', 'Francia', [makeH2H()]);
    expect(typeof factor).toBe('number');
    expect(factor).toBeGreaterThanOrEqual(0.80);
    expect(factor).toBeLessThanOrEqual(1.20);
  });

  it('returns factor favoring teamA when teamA dominates history', () => {
    const factor = calculateH2HFactorWeighted('Argentina', 'Francia', [
      makeH2H({ teamAScore: 3, teamBScore: 0, date: '2026-03-01' }),
      makeH2H({ teamAScore: 2, teamBScore: 0, date: '2026-02-01' }),
      makeH2H({ teamAScore: 1, teamBScore: 0, date: '2026-01-01' }),
    ]);
    expect(factor).toBeGreaterThan(1.0);
  });

  it('returns factor favoring teamB when teamB dominates history', () => {
    const factor = calculateH2HFactorWeighted('Argentina', 'Francia', [
      makeH2H({ teamAScore: 0, teamBScore: 3, date: '2026-03-01' }),
      makeH2H({ teamAScore: 0, teamBScore: 2, date: '2026-02-01' }),
      makeH2H({ teamAScore: 0, teamBScore: 1, date: '2026-01-01' }),
    ]);
    expect(factor).toBeLessThan(1.0);
  });

  it('weights recent matches more heavily', () => {
    const recentWin = calculateH2HFactorWeighted('Argentina', 'Francia', [
      makeH2H({ teamAScore: 3, teamBScore: 0, date: '2026-06-01' }),
      makeH2H({ teamAScore: 0, teamBScore: 3, date: '2025-01-01' }),
    ]);
    const recentLoss = calculateH2HFactorWeighted('Argentina', 'Francia', [
      makeH2H({ teamAScore: 0, teamBScore: 3, date: '2026-06-01' }),
      makeH2H({ teamAScore: 3, teamBScore: 0, date: '2025-01-01' }),
    ]);

    expect(recentWin).toBeGreaterThan(recentLoss);
  });

  it('World Cup matches get bonus weight', () => {
    const wcMatch = calculateH2HFactorWeighted('Argentina', 'Francia', [
      makeH2H({ teamAScore: 2, teamBScore: 1, competition: 'World Cup', date: '2026-06-01' }),
      makeH2H({ teamAScore: 1, teamBScore: 2, competition: 'Friendly', date: '2026-05-01' }),
    ]);
    expect(wcMatch).toBeGreaterThan(1.0);
  });

  it('clamps factor between 0.80 and 1.20', () => {
    const factor = calculateH2HFactorWeighted('Argentina', 'Francia', [
      makeH2H({ teamAScore: 10, teamBScore: 0, date: '2026-06-01' }),
      makeH2H({ teamAScore: 10, teamBScore: 0, date: '2026-05-01' }),
      makeH2H({ teamAScore: 10, teamBScore: 0, date: '2026-04-01' }),
    ]);
    expect(factor).toBeGreaterThanOrEqual(0.80);
    expect(factor).toBeLessThanOrEqual(1.20);
  });

  it('returns 0.8 when all draws (no wins for either side)', () => {
    const factor = calculateH2HFactorWeighted('Argentina', 'Francia', [
      makeH2H({ teamAScore: 1, teamBScore: 1, date: '2026-06-01' }),
      makeH2H({ teamAScore: 2, teamBScore: 2, date: '2026-05-01' }),
      makeH2H({ teamAScore: 0, teamBScore: 0, date: '2026-04-01' }),
    ]);
    expect(factor).toBeCloseTo(0.8, 1);
  });
});

// ═══════════════════════════════════════════════════════════════
// 9. calculateTravelFatigue
// ═══════════════════════════════════════════════════════════════

describe('calculateTravelFatigue', () => {
  it('returns 0 when no previous venue', () => {
    expect(calculateTravelFatigue(undefined, 'MetLife Stadium')).toBe(0);
  });

  it('returns 0 when no current venue', () => {
    expect(calculateTravelFatigue('MetLife Stadium', undefined)).toBe(0);
  });

  it('returns 0 for same venue', () => {
    expect(calculateTravelFatigue('MetLife Stadium', 'MetLife Stadium')).toBe(0);
  });

  it('returns 0 for short distances (<500km)', () => {
    expect(calculateTravelFatigue('MetLife Stadium', 'Gillette Stadium')).toBe(0);
  });

  it('returns -0.03 for medium distances (500-1500km)', () => {
    expect(calculateTravelFatigue('Arrowhead Stadium', 'NRG Stadium')).toBe(-0.03);
  });

  it('returns -0.06 for large distances (1500-3000km)', () => {
    expect(calculateTravelFatigue('NRG Stadium', 'MetLife Stadium')).toBe(-0.06);
  });

  it('returns -0.10 for very long distances (>3000km)', () => {
    expect(calculateTravelFatigue('MetLife Stadium', 'BC Place')).toBe(-0.10);
  });

  it('returns 0 for unknown venues', () => {
    expect(calculateTravelFatigue('Stadium Unknown', 'MetLife Stadium')).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 10. enhancedFormAdjustment
// ═══════════════════════════════════════════════════════════════

describe('enhancedFormAdjustment', () => {
  it('returns 0 for empty matches', () => {
    expect(enhancedFormAdjustment([])).toBe(0);
  });

  it('returns positive for winning streak', () => {
    const result = enhancedFormAdjustment(makeWins(5));
    expect(result).toBeGreaterThan(0);
  });

  it('returns negative for losing streak', () => {
    const result = enhancedFormAdjustment(makeLosses(5));
    expect(result).toBeLessThan(0);
  });

  it('weights World Cup matches higher than friendlies', () => {
    const wcWins = enhancedFormAdjustment([
      makeMatch({ result: 'W', competition: 'World Cup' }),
      makeMatch({ result: 'W', competition: 'World Cup' }),
    ]);
    const friendlyWins = enhancedFormAdjustment([
      makeMatch({ result: 'W', competition: 'Friendly' }),
      makeMatch({ result: 'W', competition: 'Friendly' }),
    ]);
    expect(wcWins).toBeGreaterThanOrEqual(friendlyWins);
  });

  it('clamps between -0.15 and +0.15', () => {
    const result = enhancedFormAdjustment(makeWins(10));
    expect(result).toBeGreaterThanOrEqual(-0.15);
    expect(result).toBeLessThanOrEqual(0.15);
  });
});

// ═══════════════════════════════════════════════════════════════
// 11. adjustRatingByCompetition
// ═══════════════════════════════════════════════════════════════

describe('adjustRatingByCompetition', () => {
  it('returns base rating for World Cup', () => {
    expect(adjustRatingByCompetition(1800, 'World Cup')).toBe(1800);
  });

  it('returns base rating for Euro', () => {
    expect(adjustRatingByCompetition(1800, 'Euro')).toBe(1800);
  });

  it('reduces rating for low-level competitions', () => {
    const adjusted = adjustRatingByCompetition(1800, 'Friendly');
    expect(adjusted).toBeLessThan(1800);
  });

  it('reduces rating for Gold Cup', () => {
    const adjusted = adjustRatingByCompetition(1800, 'Gold Cup');
    expect(adjusted).toBeLessThan(1800);
  });

  it('treats unknown competition as 0.85', () => {
    const adjusted = adjustRatingByCompetition(1800, 'Unknown');
    expect(adjusted).toBeLessThan(1800);
  });
});

// ═══════════════════════════════════════════════════════════════
// 12. assessDataQuality
// ═══════════════════════════════════════════════════════════════

describe('assessDataQuality', () => {
  it('returns low score with no context', () => {
    const report = assessDataQuality();
    expect(report.score).toBeGreaterThanOrEqual(20);
    expect(report.score).toBeLessThanOrEqual(30);
    expect(report.hasRecentForm).toBe(false);
    expect(report.hasInjuries).toBe(false);
    expect(report.hasH2H).toBe(false);
    expect(report.hasVenue).toBe(false);
    expect(report.missingFactors.length).toBeGreaterThan(0);
  });

  it('returns high score with full context', () => {
    const report = assessDataQuality(
      {
        teamName: 'Argentina',
        recentMatches: makeWins(5),
        injuries: [makeInjury()],
        venue: 'Estadio Azteca',
        h2hHistory: [makeH2H()],
      },
      {
        teamName: 'Francia',
        recentMatches: makeWins(3),
      }
    );
    expect(report.score).toBeGreaterThanOrEqual(80);
    expect(report.hasRecentForm).toBe(true);
    expect(report.hasInjuries).toBe(true);
    expect(report.hasH2H).toBe(true);
    expect(report.hasVenue).toBe(true);
  });

  it('detects competition xG data', () => {
    const report = assessDataQuality({
      teamName: 'Argentina',
      recentMatches: [
        makeMatch({ result: 'W', competition: 'World Cup' }),
      ],
    });
    expect(report.hasCompetitionXG).toBe(true);
  });

  it('flags missing factors', () => {
    const report = assessDataQuality();
    expect(report.missingFactors).toContain('forma reciente');
    expect(report.missingFactors).toContain('lesiones');
    expect(report.missingFactors).toContain('historial directo');
    expect(report.missingFactors).toContain('estadio');
  });

  it('clamps score to max 100', () => {
    const report = assessDataQuality(
      {
        teamName: 'Argentina',
        recentMatches: makeWins(5),
        injuries: [makeInjury()],
        venue: 'Estadio Azteca',
        h2hHistory: [makeH2H()],
      },
      {
        teamName: 'Francia',
        recentMatches: makeWins(5),
        injuries: [makeInjury()],
      }
    );
    expect(report.score).toBeLessThanOrEqual(100);
  });
});

// ═══════════════════════════════════════════════════════════════
// 13. INTEGRATION — End-to-end scenarios
// ═══════════════════════════════════════════════════════════════

describe('integration scenarios', () => {
  it('Argentina vs Mexico at Estadio Azteca (WC opener)', () => {
    const homeContext: EnhancedPredictionContext = {
      teamName: 'México',
      recentMatches: [
        makeMatch({ result: 'W', goalsFor: 2, goalsAgainst: 1, competition: 'Friendly' }),
        makeMatch({ result: 'D', goalsFor: 1, goalsAgainst: 1, competition: 'Friendly' }),
        makeMatch({ result: 'W', goalsFor: 3, goalsAgainst: 0, competition: 'Gold Cup' }),
      ],
      venue: 'Estadio Azteca',
      daysSinceLastMatch: 5,
    };
    const awayContext: EnhancedPredictionContext = {
      teamName: 'Argentina',
      recentMatches: [
        makeMatch({ result: 'W', goalsFor: 2, goalsAgainst: 0, competition: 'Copa America' }),
        makeMatch({ result: 'W', goalsFor: 1, goalsAgainst: 0, competition: 'Copa America' }),
        makeMatch({ result: 'W', goalsFor: 3, goalsAgainst: 1, competition: 'Friendly' }),
      ],
      daysSinceLastMatch: 6,
    };

    const result = calculateEnhancedPrediction('México', 'Argentina', homeContext, awayContext);

    expect(result.homeWin + result.draw + result.awayWin).toBe(100);
    expect(result.homeAdvantageBonus).toBe(0.08);
    expect(result.momentum).toBeGreaterThan(0);
    expect(result.dataQualityScore).toBeGreaterThanOrEqual(50);
    expect(Number.isNaN(result.homeExpectedGoals)).toBe(false);
  });

  it('Brazil vs France semifinal with injuries', () => {
    const homeContext: EnhancedPredictionContext = {
      teamName: 'Brasil',
      recentMatches: makeWins(4),
      injuries: [
        makeInjury({ name: 'Neymar', position: 'FWD', isStarter: true }),
      ],
      daysSinceLastMatch: 5,
    };
    const awayContext: EnhancedPredictionContext = {
      teamName: 'Francia',
      recentMatches: [
        makeMatch({ result: 'W', goalsFor: 2, goalsAgainst: 0 }),
        makeMatch({ result: 'W', goalsFor: 1, goalsAgainst: 0 }),
        makeMatch({ result: 'D', goalsFor: 1, goalsAgainst: 1 }),
      ],
      injuries: [
        makeInjury({ name: 'Karim Benzema', position: 'FWD', isStarter: true }),
      ],
      daysSinceLastMatch: 7,
    };

    const result = calculateEnhancedPrediction('Brasil', 'Francia', homeContext, awayContext);

    expect(result.homeWin + result.draw + result.awayWin).toBe(100);
    expect(result.injuryPenalty).toBeGreaterThan(0);
    expect(result.homeExpectedGoals).toBeGreaterThan(0);
    expect(result.awayExpectedGoals).toBeGreaterThan(0);
  });

  it('USA vs Japan — USA gets host advantage applied', () => {
    const result = calculateEnhancedPrediction('Estados Unidos', 'Japón', {
      teamName: 'Estados Unidos',
      venue: 'MetLife Stadium',
      recentMatches: [
        makeMatch({ result: 'W', goalsFor: 2, goalsAgainst: 0 }),
        makeMatch({ result: 'W', goalsFor: 1, goalsAgainst: 0 }),
      ],
      daysSinceLastMatch: 5,
    });

    expect(result.homeAdvantageBonus).toBe(0.08);
    expect(result.homeWin + result.draw + result.awayWin).toBe(100);
    expect(result.homeWin).toBeGreaterThan(20);
  });

  it('all predictions across multiple matchups sum to 100', () => {
    const matchups: [string, string][] = [
      ['Argentina', 'Brasil'],
      ['Francia', 'Alemania'],
      ['España', 'México'],
      ['Japón', 'Corea del Sur'],
      ['Inglaterra', 'Italia'],
    ];

    for (const [home, away] of matchups) {
      const result = calculateEnhancedPrediction(home, away);
      expect(result.homeWin + result.draw + result.awayWin).toBe(100);
    }
  });

  it('consistency: same inputs produce same outputs', () => {
    const ctx: EnhancedPredictionContext = {
      teamName: 'Argentina',
      recentMatches: makeWins(3),
      daysSinceLastMatch: 5,
    };
    const r1 = calculateEnhancedPrediction('Argentina', 'Brasil', ctx);
    const r2 = calculateEnhancedPrediction('Argentina', 'Brasil', ctx);

    expect(r1.homeWin).toBe(r2.homeWin);
    expect(r1.draw).toBe(r2.draw);
    expect(r1.awayWin).toBe(r2.awayWin);
    expect(r1.homeExpectedGoals).toBe(r2.homeExpectedGoals);
    expect(r1.momentum).toBe(r2.momentum);
  });
});
