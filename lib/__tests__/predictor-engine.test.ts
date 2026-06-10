import { describe, it, expect } from 'vitest';
import { calculateStatisticalPrediction, getKeyFactors } from '../predictor-engine';

describe('predictor-engine', () => {
  describe('calculateStatisticalPrediction', () => {
    it('should return valid prediction for elite vs mid-tier team', async () => {
      const result = await calculateStatisticalPrediction('Francia', 'México');

      // Francia should be heavily favored
      expect(result.homeWin).toBeGreaterThan(result.awayWin);
      expect(result.homeWin).toBeGreaterThanOrEqual(45);
      expect(result.homeElo).toBeGreaterThan(result.awayElo);

      // Probabilities should sum to 100
      expect(result.homeWin + result.draw + result.awayWin).toBe(100);

      // Expected goals should be realistic
      expect(result.homeExpectedGoals).toBeGreaterThan(0.5);
      expect(result.awayExpectedGoals).toBeGreaterThan(0.3);
    });

    it('should return close prediction for evenly matched teams', async () => {
      const result = await calculateStatisticalPrediction('Argentina', 'Francia');

      // Should be relatively close (within 25% — home advantage matters)
      const diff = Math.abs(result.homeWin - result.awayWin);
      expect(diff).toBeLessThanOrEqual(25);

      // Probabilities should sum to 100
      expect(result.homeWin + result.draw + result.awayWin).toBe(100);
    });

    it('should apply home advantage correctly', async () => {
      const homeResult = await calculateStatisticalPrediction('México', 'Japón');
      const awayResult = await calculateStatisticalPrediction('Japón', 'México');

      // When Mexico is home, they should have higher win probability than when away
      expect(homeResult.homeWin).toBeGreaterThan(awayResult.awayWin);
    });

    it('should produce realistic score predictions', async () => {
      const result = await calculateStatisticalPrediction('Brasil', 'Haití');

      // Score should be realistic (not 6-6)
      expect(result.predictedScoreHome).toBeLessThanOrEqual(4);
      expect(result.predictedScoreAway).toBeLessThanOrEqual(3);
      expect(result.predictedScoreHome).toBeGreaterThan(result.predictedScoreAway);
    });

    it('should return strength ratings in valid range', async () => {
      const result = await calculateStatisticalPrediction('España', 'Argentina');

      expect(result.homeAttack).toBeGreaterThanOrEqual(15);
      expect(result.homeAttack).toBeLessThanOrEqual(99);
      expect(result.awayDefense).toBeGreaterThanOrEqual(15);
      expect(result.awayDefense).toBeLessThanOrEqual(99);
      expect(result.homeMidfield).toBeGreaterThanOrEqual(15);
      expect(result.awayMidfield).toBeGreaterThanOrEqual(15);
    });

    it('should determine confidence based on probability spread', async () => {
      // Big mismatch → alta confidence
      const mismatch = await calculateStatisticalPrediction('Francia', 'Haití');
      expect(mismatch.confidence).toBe('alta');

      // Close match → media or baja
      const close = await calculateStatisticalPrediction('Portugal', 'Países Bajos');
      expect(['media', 'baja'].includes(close.confidence)).toBe(true);
    });

    it('should return top 5 most likely scores', async () => {
      const result = await calculateStatisticalPrediction('Inglaterra', 'Croacia');

      expect(result.topScores).toHaveLength(5);
      // Should be sorted by probability descending
      for (let i = 0; i < result.topScores.length - 1; i++) {
        expect(result.topScores[i].probability).toBeGreaterThanOrEqual(
          result.topScores[i + 1].probability
        );
      }
    });

    it('should handle unknown teams with default ratings', async () => {
      const result = await calculateStatisticalPrediction('Equipo Desconocido', 'México');

      // Known team should be favored
      expect(result.awayWin).toBeGreaterThan(result.homeWin);
      expect(result.homeWin + result.draw + result.awayWin).toBe(100);
    });
  });

  describe('getKeyFactors', () => {
    it('should return 4 key factors', async () => {
      const stats = await calculateStatisticalPrediction('Brasil', 'Argentina');
      const factors = getKeyFactors(stats, 'Brasil', 'Argentina');

      expect(factors.length).toBeGreaterThanOrEqual(3);
      expect(factors.length).toBeLessThanOrEqual(5);

      // Each factor should have label, homeAdvantage, description
      for (const factor of factors) {
        expect(factor.label).toBeTruthy();
        expect(typeof factor.homeAdvantage).toBe('number');
        expect(factor.homeAdvantage).toBeGreaterThanOrEqual(-10);
        expect(factor.homeAdvantage).toBeLessThanOrEqual(10);
        expect(factor.description).toBeTruthy();
      }
    });
  });
});
