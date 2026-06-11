import { describe, it, expect } from 'vitest';
import { getDynamicElo } from '../elo-proxy';

describe('elo-proxy', () => {
  describe('getDynamicElo', () => {
    it('returns base values when no context', () => {
      const result = getDynamicElo('Brazil');
      expect(result.elo).toBeGreaterThan(0);
      expect(result.attack).toBeGreaterThan(0);
      expect(result.defense).toBeGreaterThan(0);
    });

    it('returns base values for empty context', () => {
      const base = getDynamicElo('Brazil');
      const withEmpty = getDynamicElo('Brazil', {});
      expect(withEmpty.elo).toBe(base.elo);
      expect(withEmpty.attack).toBe(base.attack);
    });

    it('positive momentum increases Elo', () => {
      const base = getDynamicElo('Brazil');
      const boosted = getDynamicElo('Brazil', { momentum: 0.5 });
      expect(boosted.elo).toBeGreaterThanOrEqual(base.elo);
    });

    it('negative momentum decreases Elo', () => {
      const base = getDynamicElo('Brazil');
      const reduced = getDynamicElo('Brazil', { momentum: -0.5 });
      expect(reduced.elo).toBeLessThanOrEqual(base.elo);
    });

    it('fatigue reduces Elo', () => {
      const base = getDynamicElo('Brazil');
      const tired = getDynamicElo('Brazil', { fatigue: -0.15 });
      expect(tired.elo).toBeLessThan(base.elo);
    });

    it('injuries reduce Elo', () => {
      const base = getDynamicElo('Brazil');
      const injured = getDynamicElo('Brazil', { injuryImpact: -0.25 });
      expect(injured.elo).toBeLessThan(base.elo);
    });

    it('adjustments are clamped to ±10%', () => {
      const base = getDynamicElo('Brazil');
      const extreme = getDynamicElo('Brazil', {
        momentum: 1.0,
        fatigue: 0.05,
        injuryImpact: 0,
      });
      // Max multiplier is 1.10
      expect(extreme.elo).toBeLessThanOrEqual(Math.round(base.elo * 1.10) + 1);
    });

    it('extreme negative is clamped to 90%', () => {
      const base = getDynamicElo('Brazil');
      const extreme = getDynamicElo('Brazil', {
        momentum: -1.0,
        fatigue: -0.15,
        injuryImpact: -0.25,
      });
      // Min multiplier is 0.90
      expect(extreme.elo).toBeGreaterThanOrEqual(Math.round(base.elo * 0.90) - 1);
    });

    it('defense improves when team is boosted (inverse relationship)', () => {
      const base = getDynamicElo('Brazil');
      const boosted = getDynamicElo('Brazil', { momentum: 1.0 });
      // Defense = goals conceded; lower = better. When boosted, defense value decreases.
      expect(boosted.defense).toBeLessThanOrEqual(base.defense);
    });

    it('works for unknown teams (uses defaults)', () => {
      const result = getDynamicElo('UnknownTeam');
      expect(result.elo).toBe(1500);
      expect(result.attack).toBe(0.7);
      expect(result.defense).toBe(1.5);
    });
  });
});
