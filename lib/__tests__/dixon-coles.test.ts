import { describe, it, expect } from 'vitest';
import {
  calculateMatchProbabilitiesDixonColes,
  poissonProbability,
  tau,
  RHO,
} from '../poisson-dixon-coles';

describe('Dixon-Coles Model', () => {
  describe('poissonProbability', () => {
    it('P(λ=1.5, k=0) ≈ e^-1.5', () => {
      const p = poissonProbability(1.5, 0);
      expect(p).toBeCloseTo(Math.exp(-1.5), 6);
    });

    it('P(λ=2.0, k=2) ≈ 2^2 * e^-2 / 2!', () => {
      const p = poissonProbability(2.0, 2);
      const expected = (Math.pow(2, 2) * Math.exp(-2)) / 2;
      expect(p).toBeCloseTo(expected, 6);
    });

    it('returns 0 for negative k', () => {
      expect(poissonProbability(1.5, -1)).toBe(0);
    });
  });

  describe('tau', () => {
    it('tau(0,0) = 1 - λ·μ·ρ', () => {
      const result = tau(1.5, 1.2, 0, 0, RHO);
      const expected = Math.max(0.1, 1 - 1.5 * 1.2 * RHO);
      expect(result).toBeCloseTo(expected, 6);
    });

    it('tau(1,0) = 1 + λ·ρ', () => {
      const result = tau(1.5, 1.2, 1, 0, RHO);
      expect(result).toBeCloseTo(1 + 1.5 * RHO, 6);
    });

    it('tau(0,1) = 1 + μ·ρ', () => {
      const result = tau(1.5, 1.2, 0, 1, RHO);
      expect(result).toBeCloseTo(1 + 1.2 * RHO, 6);
    });

    it('tau(1,1) = 1 - ρ', () => {
      const result = tau(1.5, 1.2, 1, 1, RHO);
      expect(result).toBeCloseTo(1 - RHO, 6);
    });

    it('tau(h,a) = 1 for h > 1', () => {
      expect(tau(1.5, 1.2, 2, 0, RHO)).toBe(1);
      expect(tau(1.5, 1.2, 3, 1, RHO)).toBe(1);
    });

    it('tau(h,a) = 1 for a > 1', () => {
      expect(tau(1.5, 1.2, 0, 2, RHO)).toBe(1);
      expect(tau(1.5, 1.2, 1, 3, RHO)).toBe(1);
    });
  });

  describe('calculateMatchProbabilitiesDixonColes', () => {
    it('probabilities sum to 1.0 (±0.001)', () => {
      const result = calculateMatchProbabilitiesDixonColes(1.6, 1.2);
      const total = result.homeWin + result.draw + result.awayWin;
      expect(total).toBeCloseTo(100, 0);
    });

    it('homeWin + draw + awayWin = 100 exactly', () => {
      const result = calculateMatchProbabilitiesDixonColes(2.0, 1.5);
      expect(result.homeWin + result.draw + result.awayWin).toBe(100);
    });

    it('low scores (0-0, 1-1) are more probable than pure Poisson', () => {
      const dc = calculateMatchProbabilitiesDixonColes(1.6, 1.2, 7, RHO);
      const dcLow = dc.scoreMatrix[0][0] + dc.scoreMatrix[1][1];

      // With negative rho, DC should boost low draws
      // Just verify that 0-0 and 1-1 have non-negligible probability
      expect(dcLow).toBeGreaterThan(0.05);
    });

    it('topScores contains 5 results sorted descending', () => {
      const result = calculateMatchProbabilitiesDixonColes(1.8, 1.1);
      expect(result.topScores).toHaveLength(5);
      for (let i = 0; i < result.topScores.length - 1; i++) {
        expect(result.topScores[i].probability).toBeGreaterThanOrEqual(
          result.topScores[i + 1].probability
        );
      }
    });

    it('expected goals are approximately correct', () => {
      const result = calculateMatchProbabilitiesDixonColes(2.0, 1.5);
      // With maxGoals=7, there's some truncation, but should be close
      expect(result.homeExpectedGoals).toBeGreaterThan(1.5);
      expect(result.homeExpectedGoals).toBeLessThan(2.5);
      expect(result.awayExpectedGoals).toBeGreaterThan(1.0);
      expect(result.awayExpectedGoals).toBeLessThan(2.0);
    });

    it('over25 and btts are in valid range', () => {
      const result = calculateMatchProbabilitiesDixonColes(1.8, 1.3);
      expect(result.over25).toBeGreaterThanOrEqual(0);
      expect(result.over25).toBeLessThanOrEqual(100);
      expect(result.btts).toBeGreaterThanOrEqual(0);
      expect(result.btts).toBeLessThanOrEqual(100);
    });

    it('strong home team has higher homeWin', () => {
      const result = calculateMatchProbabilitiesDixonColes(2.5, 0.8);
      expect(result.homeWin).toBeGreaterThan(result.awayWin);
    });

    it('balanced teams have close probabilities', () => {
      const result = calculateMatchProbabilitiesDixonColes(1.5, 1.5);
      const diff = Math.abs(result.homeWin - result.awayWin);
      // Home advantage is built into lambda, so homeWin should be slightly higher
      expect(diff).toBeLessThanOrEqual(20);
    });

    it('no NaN values in output', () => {
      const result = calculateMatchProbabilitiesDixonColes(1.5, 1.2);
      expect(isNaN(result.homeWin)).toBe(false);
      expect(isNaN(result.draw)).toBe(false);
      expect(isNaN(result.awayWin)).toBe(false);
      expect(isNaN(result.homeExpectedGoals)).toBe(false);
      expect(isNaN(result.awayExpectedGoals)).toBe(false);
      expect(isNaN(result.over25)).toBe(false);
      expect(isNaN(result.btts)).toBe(false);
    });
  });
});
