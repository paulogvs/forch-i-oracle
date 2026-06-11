import { describe, it, expect } from 'vitest';
import {
  calculateBrierScore,
  calculateBrierScoreExactScore,
  isCorrectOutcome,
  isCorrectExactScore,
  deriveOutcome,
  calculateSimulatedROI,
  calculateWeightedConsensus,
  calculateScoreConsensus,
} from '../benchmark-scoring';

describe('benchmark-scoring', () => {
  describe('calculateBrierScore', () => {
    it('perfect prediction has Brier ≈ 0', () => {
      const score = calculateBrierScore('H', 0.9, 'H');
      expect(score).toBeLessThan(0.1);
    });

    it('wrong prediction with high confidence has high Brier', () => {
      const score = calculateBrierScore('H', 0.9, 'A');
      expect(score).toBeGreaterThan(1.0);
    });

    it('uncertain prediction (p=0.33) has moderate Brier regardless of outcome', () => {
      const correct = calculateBrierScore('H', 0.33, 'H');
      const wrong = calculateBrierScore('H', 0.33, 'A');
      // Both should be relatively close since confidence is low
      expect(Math.abs(correct - wrong)).toBeLessThan(0.5);
    });

    it('handles edge case confidence = 0', () => {
      const score = calculateBrierScore('H', 0, 'H');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(isNaN(score)).toBe(false);
    });

    it('handles edge case confidence = 1', () => {
      const score = calculateBrierScore('H', 1, 'A');
      expect(score).toBeCloseTo(2, 0);
    });
  });

  describe('calculateBrierScoreExactScore', () => {
    it('returns 0 when no score probs provided', () => {
      const score = calculateBrierScoreExactScore(undefined, 2, 1);
      expect(score).toBe(0);
    });

    it('returns 0 when score probs is empty object', () => {
      const score = calculateBrierScoreExactScore({}, 2, 1);
      expect(score).toBe(0);
    });

    it('low Brier when predicted score matches actual (normalized)', () => {
      // Probabilities must sum to 1 for meaningful Brier score
      const probs = { '2-1': 0.40, '1-1': 0.30, '1-0': 0.20, '0-0': 0.10 };
      const score = calculateBrierScoreExactScore(probs, 2, 1);
      // (0.4-1)² + (0.3-0)² + (0.2-0)² + (0.1-0)² = 0.36+0.09+0.04+0.01 = 0.50
      expect(score).toBeLessThanOrEqual(0.51);
    });
  });

  describe('isCorrectOutcome', () => {
    it('correct when same', () => {
      expect(isCorrectOutcome('H', 'H')).toBe(true);
      expect(isCorrectOutcome('D', 'D')).toBe(true);
      expect(isCorrectOutcome('A', 'A')).toBe(true);
    });

    it('incorrect when different', () => {
      expect(isCorrectOutcome('H', 'A')).toBe(false);
      expect(isCorrectOutcome('D', 'H')).toBe(false);
    });
  });

  describe('isCorrectExactScore', () => {
    it('correct when both match', () => {
      expect(isCorrectExactScore(2, 1, 2, 1)).toBe(true);
    });

    it('incorrect when either differs', () => {
      expect(isCorrectExactScore(2, 1, 2, 0)).toBe(false);
      expect(isCorrectExactScore(2, 1, 3, 1)).toBe(false);
    });
  });

  describe('deriveOutcome', () => {
    it('home win', () => expect(deriveOutcome(2, 1)).toBe('H'));
    it('draw', () => expect(deriveOutcome(1, 1)).toBe('D'));
    it('away win', () => expect(deriveOutcome(0, 2)).toBe('A'));
  });

  describe('calculateSimulatedROI', () => {
    it('returns 0 for empty predictions', () => {
      expect(calculateSimulatedROI([])).toBe(0);
    });

    it('positive ROI when all correct', () => {
      const roi = calculateSimulatedROI([
        { predictedOutcome: 'H', confidence: 0.6, actualOutcome: 'H' },
        { predictedOutcome: 'A', confidence: 0.7, actualOutcome: 'A' },
      ]);
      expect(roi).toBeGreaterThan(0);
    });

    it('negative ROI when all wrong', () => {
      const roi = calculateSimulatedROI([
        { predictedOutcome: 'H', confidence: 0.6, actualOutcome: 'A' },
        { predictedOutcome: 'A', confidence: 0.7, actualOutcome: 'H' },
      ]);
      expect(roi).toBeLessThan(0);
    });
  });

  describe('calculateWeightedConsensus', () => {
    it('returns D for empty predictions', () => {
      const result = calculateWeightedConsensus([]);
      expect(result.outcome).toBe('D');
      expect(result.confidence).toBe(0);
    });

    it('unanimous picks return high confidence', () => {
      const result = calculateWeightedConsensus([
        { modelId: 'a', predictedOutcome: 'H', confidence: 0.7 },
        { modelId: 'b', predictedOutcome: 'H', confidence: 0.8 },
        { modelId: 'c', predictedOutcome: 'H', confidence: 0.6 },
      ]);
      expect(result.outcome).toBe('H');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('weighted by Brier score when provided', () => {
      const result = calculateWeightedConsensus([
        { modelId: 'good', predictedOutcome: 'H', confidence: 0.7, modelBrierScore: 0.3 },
        { modelId: 'bad', predictedOutcome: 'A', confidence: 0.8, modelBrierScore: 0.8 },
      ]);
      // Good model has lower Brier → higher weight → H should win
      expect(result.outcome).toBe('H');
      expect(result.weights['good']).toBeGreaterThan(result.weights['bad']);
    });

    it('weights sum to 1', () => {
      const result = calculateWeightedConsensus([
        { modelId: 'a', predictedOutcome: 'H', confidence: 0.6 },
        { modelId: 'b', predictedOutcome: 'D', confidence: 0.5 },
      ]);
      const totalWeight = Object.values(result.weights).reduce((s, w) => s + w, 0);
      expect(totalWeight).toBeCloseTo(1.0, 4);
    });
  });

  describe('calculateScoreConsensus', () => {
    it('returns empty for no predictions', () => {
      expect(calculateScoreConsensus([])).toHaveLength(0);
    });

    it('groups same scores together', () => {
      const result = calculateScoreConsensus([
        { predictedHomeScore: 2, predictedAwayScore: 1, modelId: 'a' },
        { predictedHomeScore: 2, predictedAwayScore: 1, modelId: 'b' },
        { predictedHomeScore: 1, predictedAwayScore: 1, modelId: 'c' },
      ]);
      expect(result).toHaveLength(2);
      expect(result[0].score).toBe('2-1');
      expect(result[0].count).toBe(2);
      expect(result[0].probability).toBe(67);
    });

    it('sorted by count descending', () => {
      const result = calculateScoreConsensus([
        { predictedHomeScore: 1, predictedAwayScore: 0, modelId: 'a' },
        { predictedHomeScore: 2, predictedAwayScore: 1, modelId: 'b' },
        { predictedHomeScore: 2, predictedAwayScore: 1, modelId: 'c' },
        { predictedHomeScore: 2, predictedAwayScore: 1, modelId: 'd' },
      ]);
      expect(result[0].count).toBeGreaterThanOrEqual(result[1].count);
    });
  });
});
