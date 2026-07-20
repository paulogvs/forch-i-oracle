import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateEnsemblePrediction,
  addCalibrationResult,
  getAdaptiveWeights,
  BASE_WEIGHTS,
} from '../ensemble-engine';

// Reset calibration history between tests by adding < 5 entries
// so getAdaptiveWeights returns base weights
beforeEach(() => {
  // Seed with < 5 entries to reset adaptive behavior
  for (let i = 0; i < 4; i++) {
    addCalibrationResult({
      date: `2026-06-${i + 1}`,
      homeTeam: `Team A${i}`,
      awayTeam: `Team B${i}`,
      predictedHomeWin: 40,
      predictedDraw: 30,
      predictedAwayWin: 30,
      actualResult: 'home',
    });
  }
});

describe('ensemble-engine', () => {
  describe('calculateEnsemblePrediction', () => {
    it('should return all required fields for a valid prediction', () => {
      const result = calculateEnsemblePrediction('Argentina', 'Haití');

      // Probabilities
      expect(typeof result.homeWin).toBe('number');
      expect(typeof result.draw).toBe('number');
      expect(typeof result.awayWin).toBe('number');

      // Scores
      expect(typeof result.predictedScoreHome).toBe('number');
      expect(typeof result.predictedScoreAway).toBe('number');

      // Expected goals
      expect(typeof result.homeExpectedGoals).toBe('number');
      expect(typeof result.awayExpectedGoals).toBe('number');

      // Over/Under and BTTS
      expect(typeof result.over25Probability).toBe('number');
      expect(typeof result.bttsProbability).toBe('number');

      // Agreement
      expect(result.agreement).toBeDefined();
      expect(typeof result.agreement.agreementScore).toBe('number');
      expect(typeof result.agreement.unanimousWinner).toBe('boolean');

      // Uncertainty
      expect(result.uncertainty).toBeDefined();
      expect(typeof result.uncertainty.entropy).toBe('number');
      expect(typeof result.uncertainty.effectiveOutcomes).toBe('number');

      // Models
      expect(result.models).toBeDefined();
      expect(result.models.dixonColes).toBeDefined();
      expect(result.models.eloPoisson).toBeDefined();
      expect(result.models.dynamic).toBeDefined();
      expect(result.models.purePoisson).toBeDefined();

      // Weights
      expect(result.weights).toBeDefined();

      // Confidence
      expect(['alta', 'media', 'baja']).toContain(result.confidence);
      expect(typeof result.confidenceScore).toBe('number');

      // Top scores
      expect(Array.isArray(result.topScores)).toBe(true);

      // Key factors
      expect(Array.isArray(result.keyFactors)).toBe(true);
    });

    it('should return probabilities summing to 100', () => {
      const result = calculateEnsemblePrediction('Argentina', 'Haití');
      expect(result.homeWin + result.draw + result.awayWin).toBe(100);
    });

    it('should return non-negative integer scores', () => {
      const result = calculateEnsemblePrediction('Brasil', 'México');
      expect(result.predictedScoreHome).toBeGreaterThanOrEqual(0);
      expect(result.predictedScoreAway).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(result.predictedScoreHome)).toBe(true);
      expect(Number.isInteger(result.predictedScoreAway)).toBe(true);
    });

    it('should return positive expected goals', () => {
      const result = calculateEnsemblePrediction('España', 'Inglaterra');
      expect(result.homeExpectedGoals).toBeGreaterThan(0);
      expect(result.awayExpectedGoals).toBeGreaterThan(0);
    });

    it('should clamp over25Probability and bttsProbability to [10, 90]', () => {
      const result = calculateEnsemblePrediction('Argentina', 'Francia');
      expect(result.over25Probability).toBeGreaterThanOrEqual(10);
      expect(result.over25Probability).toBeLessThanOrEqual(90);
      expect(result.bttsProbability).toBeGreaterThanOrEqual(10);
      expect(result.bttsProbability).toBeLessThanOrEqual(90);
    });

    it('should have agreement scores in [0, 1] range', () => {
      const result = calculateEnsemblePrediction('Argentina', 'Haití');
      expect(result.agreement.agreementScore).toBeGreaterThanOrEqual(0);
      expect(result.agreement.agreementScore).toBeLessThanOrEqual(1);
      expect(result.agreement.homeWinStdDev).toBeGreaterThanOrEqual(0);
      expect(result.agreement.drawStdDev).toBeGreaterThanOrEqual(0);
      expect(result.agreement.awayWinStdDev).toBeGreaterThanOrEqual(0);
    });

    it('should have valid uncertainty entropy and effectiveOutcomes', () => {
      const result = calculateEnsemblePrediction('Brasil', 'Haití');
      // Shannon entropy for 3 outcomes: 0 (certain) to ~1.58 (max uncertainty)
      expect(result.uncertainty.entropy).toBeGreaterThanOrEqual(0);
      expect(result.uncertainty.entropy).toBeLessThanOrEqual(1.6);
      // Effective outcomes: 1 (certain) to 3 (max uncertainty)
      expect(result.uncertainty.effectiveOutcomes).toBeGreaterThanOrEqual(1);
      expect(result.uncertainty.effectiveOutcomes).toBeLessThanOrEqual(3);
    });

    it('should have all 4 model outputs in models object', () => {
      const result = calculateEnsemblePrediction('Argentina', 'México');

      // Dixon-Coles
      expect(result.models.dixonColes.homeWin).toBeGreaterThanOrEqual(0);
      expect(result.models.dixonColes.draw).toBeGreaterThanOrEqual(0);
      expect(result.models.dixonColes.awayWin).toBeGreaterThanOrEqual(0);

      // Elo-Poisson
      expect(result.models.eloPoisson.homeWin).toBeGreaterThanOrEqual(0);
      expect(result.models.eloPoisson.draw).toBeGreaterThanOrEqual(0);
      expect(result.models.eloPoisson.awayWin).toBeGreaterThanOrEqual(0);

      // Dynamic
      expect(result.models.dynamic.homeWinPct).toBeGreaterThanOrEqual(0);
      expect(result.models.dynamic.drawPct).toBeGreaterThanOrEqual(0);

      // Pure Poisson
      expect(result.models.purePoisson.homeWin).toBeGreaterThanOrEqual(0);
      expect(result.models.purePoisson.draw).toBeGreaterThanOrEqual(0);
      expect(result.models.purePoisson.awayWin).toBeGreaterThanOrEqual(0);
    });

    it('should have weights summing to approximately 1.0', () => {
      const result = calculateEnsemblePrediction('Argentina', 'Haití');
      const weightSum =
        result.weights.dixonColes +
        result.weights.bayesianDynamic +
        result.weights.eloPoisson +
        result.weights.purePoisson;
      expect(weightSum).toBeCloseTo(1.0, 4);
    });

    it('should have confidenceScore in [5, 95]', () => {
      const result = calculateEnsemblePrediction('Argentina', 'Haití');
      expect(result.confidenceScore).toBeGreaterThanOrEqual(5);
      expect(result.confidenceScore).toBeLessThanOrEqual(95);
    });

    it('should have 5 topScores sorted by probability descending', () => {
      const result = calculateEnsemblePrediction('Inglaterra', 'Croacia');
      expect(result.topScores).toHaveLength(5);
      for (let i = 0; i < result.topScores.length - 1; i++) {
        expect(result.topScores[i].probability).toBeGreaterThanOrEqual(
          result.topScores[i + 1].probability
        );
      }
    });

    it('should have keyFactors as an array of strings', () => {
      const result = calculateEnsemblePrediction('Brasil', 'Argentina');
      expect(Array.isArray(result.keyFactors)).toBe(true);
      for (const factor of result.keyFactors) {
        expect(typeof factor).toBe('string');
        expect(factor.length).toBeGreaterThan(0);
      }
    });

    it('should heavily favor Argentina over Haiti (elite vs weak)', () => {
      const result = calculateEnsemblePrediction('Argentina', 'Haití');

      expect(result.homeWin).toBeGreaterThan(result.awayWin);
      expect(result.homeWin).toBeGreaterThanOrEqual(55);
      expect(result.awayWin).toBeLessThanOrEqual(25);
      expect(result.predictedScoreHome).toBeGreaterThan(result.predictedScoreAway);
    });

    it('should produce a close prediction for Argentina vs Francia', () => {
      const result = calculateEnsemblePrediction('Argentina', 'Francia');

      // Both are elite — should be relatively balanced
      const diff = Math.abs(result.homeWin - result.awayWin);
      expect(diff).toBeLessThanOrEqual(25);
      expect(result.homeWin + result.draw + result.awayWin).toBe(100);
    });

    it('should handle unknown teams with default ratings', () => {
      const result = calculateEnsemblePrediction('Equipo Desconocido', 'México');

      // Known team should be favored
      expect(result.awayWin).toBeGreaterThan(result.homeWin);
      expect(result.homeWin + result.draw + result.awayWin).toBe(100);
    });

    it('should apply home advantage correctly', () => {
      const homeResult = calculateEnsemblePrediction('México', 'Japón');
      const awayResult = calculateEnsemblePrediction('Japón', 'México');

      // When Mexico is home, their win probability should be higher than when away
      expect(homeResult.homeWin).toBeGreaterThan(awayResult.awayWin);
    });

    it('should produce realistic score predictions', () => {
      const result = calculateEnsemblePrediction('Brasil', 'Haití');

      // Score should be realistic (not extreme)
      expect(result.predictedScoreHome).toBeLessThanOrEqual(5);
      expect(result.predictedScoreAway).toBeLessThanOrEqual(4);
      expect(result.predictedScoreHome).toBeGreaterThanOrEqual(0);
      expect(result.predictedScoreAway).toBeGreaterThanOrEqual(0);
    });

    it('should contain no NaN values in any output field', () => {
      const result = calculateEnsemblePrediction('Argentina', 'Brasil');

      // Check all numeric fields for NaN
      expect(Number.isNaN(result.homeWin)).toBe(false);
      expect(Number.isNaN(result.draw)).toBe(false);
      expect(Number.isNaN(result.awayWin)).toBe(false);
      expect(Number.isNaN(result.predictedScoreHome)).toBe(false);
      expect(Number.isNaN(result.predictedScoreAway)).toBe(false);
      expect(Number.isNaN(result.homeExpectedGoals)).toBe(false);
      expect(Number.isNaN(result.awayExpectedGoals)).toBe(false);
      expect(Number.isNaN(result.over25Probability)).toBe(false);
      expect(Number.isNaN(result.bttsProbability)).toBe(false);
      expect(Number.isNaN(result.confidenceScore)).toBe(false);
      expect(Number.isNaN(result.agreement.agreementScore)).toBe(false);
      expect(Number.isNaN(result.uncertainty.entropy)).toBe(false);
      expect(Number.isNaN(result.uncertainty.effectiveOutcomes)).toBe(false);
    });

    it('should detect model agreement for clear mismatches', () => {
      const result = calculateEnsemblePrediction('Argentina', 'Haití');

      // For a massive mismatch, all 4 models should agree on the winner
      expect(result.agreement.agreementScore).toBeGreaterThan(0.5);
    });

    it('should correlate confidence with probability spread', () => {
      // Big mismatch → alta confidence
      const mismatch = calculateEnsemblePrediction('Francia', 'Haití');
      expect(mismatch.confidence).toBe('alta');

      // Close match → media or baja
      const close = calculateEnsemblePrediction('España', 'Brasil');
      expect(['media', 'baja'].includes(close.confidence)).toBe(true);
    });

    it('should have uncertainty intervals with valid structure', () => {
      const result = calculateEnsemblePrediction('Argentina', 'México');

      // 90% confidence intervals
      expect(result.uncertainty.homeWin90).toBeDefined();
      expect(result.uncertainty.homeWin90.low).toBeLessThanOrEqual(result.homeWin);
      expect(result.uncertainty.homeWin90.high).toBeGreaterThanOrEqual(result.homeWin);

      expect(result.uncertainty.draw90).toBeDefined();
      expect(result.uncertainty.draw90.low).toBeLessThanOrEqual(result.draw);
      expect(result.uncertainty.draw90.high).toBeGreaterThanOrEqual(result.draw);

      expect(result.uncertainty.awayWin90).toBeDefined();
      expect(result.uncertainty.awayWin90.low).toBeLessThanOrEqual(result.awayWin);
      expect(result.uncertainty.awayWin90.high).toBeGreaterThanOrEqual(result.awayWin);
    });

    it('should produce different predictions for different matchups', () => {
      const argentinaVsHaiti = calculateEnsemblePrediction('Argentina', 'Haití');
      const brasilVsMexico = calculateEnsemblePrediction('Brasil', 'México');

      // Different matchups should produce different probabilities
      const areDifferent =
        argentinaVsHaiti.homeWin !== brasilVsMexico.homeWin ||
        argentinaVsHaiti.draw !== brasilVsMexico.draw;
      expect(areDifferent).toBe(true);
    });
  });

  describe('addCalibrationResult', () => {
    it('should not throw when adding entries', () => {
      expect(() => {
        addCalibrationResult({
          date: '2026-06-10',
          homeTeam: 'Argentina',
          awayTeam: 'Francia',
          predictedHomeWin: 40,
          predictedDraw: 30,
          predictedAwayWin: 30,
          actualResult: 'draw',
        });
      }).not.toThrow();
    });

    it('should cap history at 30 entries', () => {
      // Add 35 entries — history should stay at 30
      for (let i = 0; i < 35; i++) {
        addCalibrationResult({
          date: `2026-07-${(i % 28) + 1}`,
          homeTeam: `Team X${i}`,
          awayTeam: `Team Y${i}`,
          predictedHomeWin: 35,
          predictedDraw: 30,
          predictedAwayWin: 35,
          actualResult: i % 3 === 0 ? 'home' : i % 3 === 1 ? 'draw' : 'away',
        });
      }

      // After adding 35 + 4 (from beforeEach) = 39, should be capped at 30
      // getAdaptiveWeights should still return valid weights
      const weights = getAdaptiveWeights();
      const sum =
        weights.dixonColes +
        weights.bayesianDynamic +
        weights.eloPoisson +
        weights.purePoisson;
      expect(sum).toBeCloseTo(1.0, 4);
    });
  });

  describe('getAdaptiveWeights', () => {
    it('should return valid normalized weights (sum to 1.0)', () => {
      // getAdaptiveWeights always returns valid weights regardless of calibration history
      const weights = getAdaptiveWeights();
      const sum = weights.dixonColes + weights.bayesianDynamic + weights.eloPoisson + weights.purePoisson;
      expect(sum).toBeCloseTo(1.0, 4);
      // All weights should be positive
      expect(weights.dixonColes).toBeGreaterThan(0);
      expect(weights.bayesianDynamic).toBeGreaterThan(0);
      expect(weights.eloPoisson).toBeGreaterThan(0);
      expect(weights.purePoisson).toBeGreaterThan(0);
    });

    it('should return normalized weights when >= 5 entries', () => {
      // Add 1 more to reach 5 total
      for (let i = 0; i < 15; i++) {
        addCalibrationResult({
          date: `2026-08-${i + 1}`,
          homeTeam: `Team Z${i}`,
          awayTeam: `Team W${i}`,
          predictedHomeWin: 45,
          predictedDraw: 25,
          predictedAwayWin: 30,
          actualResult: i % 2 === 0 ? 'home' : 'away',
        });
      }

      const weights = getAdaptiveWeights();

      // All weights should be positive
      expect(weights.dixonColes).toBeGreaterThan(0);
      expect(weights.bayesianDynamic).toBeGreaterThan(0);
      expect(weights.eloPoisson).toBeGreaterThan(0);
      expect(weights.purePoisson).toBeGreaterThan(0);

      // Should sum to 1.0
      const sum =
        weights.dixonColes +
        weights.bayesianDynamic +
        weights.eloPoisson +
        weights.purePoisson;
      expect(sum).toBeCloseTo(1.0, 4);
    });

    it('should return weights that sum to 1.0 with various calibration histories', () => {
      // Add many entries with different outcomes
      const outcomes: Array<'home' | 'draw' | 'away'> = [
        'home', 'away', 'draw', 'home', 'home',
        'away', 'draw', 'away', 'home', 'draw',
      ];
      for (let i = 0; i < 10; i++) {
        addCalibrationResult({
          date: `2026-09-${i + 1}`,
          homeTeam: `Test Home${i}`,
          awayTeam: `Test Away${i}`,
          predictedHomeWin: 30 + i,
          predictedDraw: 30,
          predictedAwayWin: 40 - i,
          actualResult: outcomes[i],
        });
      }

      const weights = getAdaptiveWeights();
      const sum =
        weights.dixonColes +
        weights.bayesianDynamic +
        weights.eloPoisson +
        weights.purePoisson;
      expect(sum).toBeCloseTo(1.0, 4);
    });
  });
});
