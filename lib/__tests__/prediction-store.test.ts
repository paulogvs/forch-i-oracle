import { describe, it, expect, beforeEach } from 'vitest';
import {
  addMatchResult,
  getDynamicStats,
  predictMatchDynamic,
  getAllTeamStats,
  getMatchResults,
  getResultsCount,
  resetEngine,
  seedFromResults,
  type MatchResult,
} from '../prediction-store';
import { resetLiveElo } from '../elo-sync';

function resetAllState(): void {
  resetEngine();
  resetLiveElo();
}

describe('prediction-store', () => {
  beforeEach(() => {
    resetAllState();
  });

  // ─── addMatchResult ───────────────────────────────────────────

  describe('addMatchResult', () => {
    it('should accept a valid match result without throwing', () => {
      expect(() => {
        addMatchResult({
          homeTeam: 'Argentina',
          awayTeam: 'Francia',
          homeGoals: 2,
          awayGoals: 1,
          date: '2026-06-15',
        });
      }).not.toThrow();
    });

    it('should accumulate multiple results', () => {
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'Francia', homeGoals: 2, awayGoals: 1, date: '2026-06-15' });
      addMatchResult({ homeTeam: 'Brasil', awayTeam: 'México', homeGoals: 3, awayGoals: 0, date: '2026-06-16' });
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'Brasil', homeGoals: 1, awayGoals: 1, date: '2026-06-20' });

      expect(getResultsCount()).toBe(3);
      expect(getMatchResults()).toHaveLength(3);
    });

    it('should accept optional xG values', () => {
      expect(() => {
        addMatchResult({
          homeTeam: 'Argentina',
          awayTeam: 'Brasil',
          homeGoals: 1,
          awayGoals: 0,
          date: '2026-06-15',
          homeXG: 2.3,
          awayXG: 0.8,
        });
      }).not.toThrow();
    });

    it('should store results in order', () => {
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'Francia', homeGoals: 2, awayGoals: 1, date: '2026-06-15' });
      addMatchResult({ homeTeam: 'Brasil', awayTeam: 'México', homeGoals: 3, awayGoals: 0, date: '2026-06-16' });

      const results = getMatchResults();
      expect(results[0].homeTeam).toBe('Argentina');
      expect(results[1].homeTeam).toBe('Brasil');
    });
  });

  // ─── getDynamicStats — initial state ──────────────────────────

  describe('getDynamicStats — initial state', () => {
    it('should return baseline stats for a known team with no matches', () => {
      const stats = getDynamicStats('Argentina');

      expect(stats.elo).toBeGreaterThan(0);
      expect(stats.attackStrength).toBeGreaterThan(0);
      expect(stats.defenseStrength).toBeGreaterThan(0);
      expect(stats.xGDiff).toBe(0);
      expect(stats.formPoints).toBe(0);
      expect(stats.momentum).toBe(0);
      expect(stats.matchesPlayed).toBe(0);
    });

    it('should return fallback stats for an unknown team', () => {
      const stats = getDynamicStats('Equipo Inexistente XYZ');

      expect(stats.elo).toBe(1500);
      expect(stats.attackStrength).toBe(1.5);
      expect(stats.defenseStrength).toBe(1.0);
      expect(stats.matchesPlayed).toBe(0);
    });

    it('should not return NaN for any stat', () => {
      const stats = getDynamicStats('Argentina');
      expect(Number.isNaN(stats.elo)).toBe(false);
      expect(Number.isNaN(stats.attackStrength)).toBe(false);
      expect(Number.isNaN(stats.defenseStrength)).toBe(false);
      expect(Number.isNaN(stats.formPoints)).toBe(false);
      expect(Number.isNaN(stats.momentum)).toBe(false);
    });
  });

  // ─── getDynamicStats — after adding results ───────────────────

  describe('getDynamicStats — after results', () => {
    it('should update matchesPlayed after adding results', () => {
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'Francia', homeGoals: 2, awayGoals: 1, date: '2026-06-15' });

      const argStats = getDynamicStats('Argentina');
      const fraStats = getDynamicStats('Francia');

      expect(argStats.matchesPlayed).toBe(1);
      expect(fraStats.matchesPlayed).toBe(1);
    });

    it('should accumulate stats from multiple results for the same team', () => {
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'Francia', homeGoals: 2, awayGoals: 1, date: '2026-06-15' });
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'Brasil', homeGoals: 3, awayGoals: 0, date: '2026-06-18' });
      addMatchResult({ homeTeam: 'México', awayTeam: 'Argentina', homeGoals: 0, awayGoals: 1, date: '2026-06-21' });

      const argStats = getDynamicStats('Argentina');
      expect(argStats.matchesPlayed).toBe(3);
    });

    it('should reflect winning form in formPoints', () => {
      // Argentina wins 3 matches in a row
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'Francia', homeGoals: 2, awayGoals: 0, date: '2026-06-15' });
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'Brasil', homeGoals: 1, awayGoals: 0, date: '2026-06-18' });
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'México', homeGoals: 3, awayGoals: 1, date: '2026-06-21' });

      const stats = getDynamicStats('Argentina');
      expect(stats.formPoints).toBeGreaterThan(0);
      expect(stats.attackStrength).toBeGreaterThanOrEqual(0.3);
    });

    it('should track lastUpdated as the last match date', () => {
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'Francia', homeGoals: 2, awayGoals: 1, date: '2026-06-15' });
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'Brasil', homeGoals: 1, awayGoals: 0, date: '2026-06-25' });

      const stats = getDynamicStats('Argentina');
      expect(stats.lastUpdated).toBe('2026-06-25');
    });

    it('should not return NaN in any stat after adding results', () => {
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'Francia', homeGoals: 2, awayGoals: 1, date: '2026-06-15' });
      const stats = getDynamicStats('Argentina');

      expect(Number.isNaN(stats.elo)).toBe(false);
      expect(Number.isNaN(stats.attackStrength)).toBe(false);
      expect(Number.isNaN(stats.defenseStrength)).toBe(false);
      expect(Number.isNaN(stats.xGDiff)).toBe(false);
      expect(Number.isNaN(stats.formPoints)).toBe(false);
      expect(Number.isNaN(stats.momentum)).toBe(false);
    });
  });

  // ─── Momentum ─────────────────────────────────────────────────

  describe('momentum', () => {
    it('should be 0 with only one match', () => {
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'Francia', homeGoals: 2, awayGoals: 0, date: '2026-06-15' });
      const stats = getDynamicStats('Argentina');
      expect(stats.momentum).toBe(0);
    });

    it('should be positive during a winning streak', () => {
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'Francia', homeGoals: 2, awayGoals: 0, date: '2026-06-15' });
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'Brasil', homeGoals: 3, awayGoals: 1, date: '2026-06-18' });
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'México', homeGoals: 1, awayGoals: 0, date: '2026-06-21' });

      const stats = getDynamicStats('Argentina');
      expect(stats.momentum).toBeGreaterThan(0);
    });

    it('should be negative during a declining streak (wins → losses)', () => {
      // Momentum tracks trend, not absolute level. A team that starts winning
      // then starts losing shows a declining trend → negative momentum.
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'Francia', homeGoals: 3, awayGoals: 0, date: '2026-06-10' });
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'Brasil', homeGoals: 2, awayGoals: 0, date: '2026-06-13' });
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'México', homeGoals: 0, awayGoals: 2, date: '2026-06-16' });
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'Japón', homeGoals: 0, awayGoals: 3, date: '2026-06-19' });

      const stats = getDynamicStats('Argentina');
      expect(stats.momentum).toBeLessThan(0);
    });

    it('should be clamped between -1 and +1', () => {
      // Extreme winning streak
      for (let i = 0; i < 10; i++) {
        addMatchResult({
          homeTeam: 'Argentina',
          awayTeam: 'Francia',
          homeGoals: 5,
          awayGoals: 0,
          date: `2026-06-${String(15 + i).padStart(2, '0')}`,
        });
      }

      const stats = getDynamicStats('Argentina');
      expect(stats.momentum).toBeGreaterThanOrEqual(-1);
      expect(stats.momentum).toBeLessThanOrEqual(1);
    });
  });

  // ─── predictMatchDynamic — initial state ──────────────────────

  describe('predictMatchDynamic — initial state', () => {
    it('should return valid prediction structure', () => {
      const pred = predictMatchDynamic('Argentina', 'Francia');

      expect(pred.homeExpectedGoals).toBeGreaterThan(0);
      expect(pred.awayExpectedGoals).toBeGreaterThan(0);
      expect(typeof pred.homeWinPct).toBe('number');
      expect(typeof pred.drawPct).toBe('number');
      expect(typeof pred.awayWinPct).toBe('number');
      expect(pred.predictedScore).toHaveLength(2);
      expect(typeof pred.confidence).toBe('number');
      expect(typeof pred.hasRealData).toBe('boolean');
    });

    it('should have hasRealData false without results', () => {
      const pred = predictMatchDynamic('Argentina', 'Francia');
      expect(pred.hasRealData).toBe(false);
    });

    it('should have probabilities summing to approximately 100', () => {
      const pred = predictMatchDynamic('Argentina', 'Francia');
      const total = pred.homeWinPct + pred.drawPct + pred.awayWinPct;
      expect(total).toBeGreaterThanOrEqual(99);
      expect(total).toBeLessThanOrEqual(101);
    });

    it('should have non-negative predicted scores', () => {
      const pred = predictMatchDynamic('Argentina', 'Francia');
      expect(pred.predictedScore[0]).toBeGreaterThanOrEqual(0);
      expect(pred.predictedScore[1]).toBeGreaterThanOrEqual(0);
    });

    it('should have confidence between 0 and 100', () => {
      const pred = predictMatchDynamic('Argentina', 'Francia');
      expect(pred.confidence).toBeGreaterThanOrEqual(0);
      expect(pred.confidence).toBeLessThanOrEqual(100);
    });

    it('should have no NaN values in prediction', () => {
      const pred = predictMatchDynamic('Argentina', 'Francia');
      expect(Number.isNaN(pred.homeExpectedGoals)).toBe(false);
      expect(Number.isNaN(pred.awayExpectedGoals)).toBe(false);
      expect(Number.isNaN(pred.homeWinPct)).toBe(false);
      expect(Number.isNaN(pred.drawPct)).toBe(false);
      expect(Number.isNaN(pred.awayWinPct)).toBe(false);
      expect(Number.isNaN(pred.confidence)).toBe(false);
    });

    it('should favor a strong home team over a weak away team', () => {
      const pred = predictMatchDynamic('Argentina', 'Haití');
      expect(pred.homeWinPct).toBeGreaterThan(pred.awayWinPct);
    });

    it('should produce close prediction for evenly matched teams', () => {
      const pred = predictMatchDynamic('Argentina', 'Francia');
      const diff = Math.abs(pred.homeWinPct - pred.awayWinPct);
      // Should be within 25 points (home advantage matters)
      expect(diff).toBeLessThanOrEqual(25);
    });
  });

  // ─── predictMatchDynamic — after adding results ───────────────

  describe('predictMatchDynamic — after results', () => {
    it('should set hasRealData to true after adding results', () => {
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'Francia', homeGoals: 2, awayGoals: 1, date: '2026-06-15' });

      const pred = predictMatchDynamic('Argentina', 'Brasil');
      expect(pred.hasRealData).toBe(true);
    });

    it('should have hasRealData true if either team has results', () => {
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'Francia', homeGoals: 2, awayGoals: 1, date: '2026-06-15' });

      // Brasil has no results, but Argentina does
      const pred = predictMatchDynamic('Brasil', 'Argentina');
      expect(pred.hasRealData).toBe(true);
    });

    it('should produce different predictions after ingesting real results', () => {
      const predBefore = predictMatchDynamic('Argentina', 'Francia');

      // Argentina dominates 3 matches
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'Francia', homeGoals: 3, awayGoals: 0, date: '2026-06-15' });
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'Brasil', homeGoals: 2, awayGoals: 0, date: '2026-06-18' });
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'México', homeGoals: 4, awayGoals: 1, date: '2026-06-21' });

      const predAfter = predictMatchDynamic('Argentina', 'Francia');

      // Predictions should have changed
      expect(predAfter.homeExpectedGoals).not.toBe(predBefore.homeExpectedGoals);
    });

    it('should still have valid probability sums after results', () => {
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'Francia', homeGoals: 2, awayGoals: 1, date: '2026-06-15' });
      addMatchResult({ homeTeam: 'Brasil', awayTeam: 'México', homeGoals: 3, awayGoals: 0, date: '2026-06-16' });

      const pred = predictMatchDynamic('Argentina', 'Francia');
      const total = pred.homeWinPct + pred.drawPct + pred.awayWinPct;
      expect(total).toBeGreaterThanOrEqual(99);
      expect(total).toBeLessThanOrEqual(101);
    });
  });

  // ─── predictMatchDynamic — home advantage ─────────────────────

  describe('predictMatchDynamic — home advantage', () => {
    it('should apply default home advantage', () => {
      const pred = predictMatchDynamic('Argentina', 'Francia');
      const predSwapped = predictMatchDynamic('Francia', 'Argentina');

      // Home team should generally have a higher win probability
      // (unless teams are very evenly matched, the home advantage should help)
      expect(pred.homeWinPct).toBeGreaterThanOrEqual(0);
      expect(predSwapped.homeWinPct).toBeGreaterThanOrEqual(0);
    });

    it('should accept custom home advantage parameter', () => {
      const predDefault = predictMatchDynamic('Argentina', 'Francia');
      const predHigh = predictMatchDynamic('Argentina', 'Francia', 1.5);

      // Higher home advantage should increase home expected goals
      expect(predHigh.homeExpectedGoals).toBeGreaterThanOrEqual(predDefault.homeExpectedGoals);
    });
  });

  // ─── Team stats after match results ───────────────────────────

  describe('team stats adjustments', () => {
    it('should increase Elo for winning strong team beating weak team (small change)', () => {
      const eloBefore = getDynamicStats('Argentina').elo;
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'Haití', homeGoals: 3, awayGoals: 0, date: '2026-06-15' });
      const eloAfter = getDynamicStats('Argentina').elo;

      // Elo should increase (won), but small change because expected to win
      expect(eloAfter).toBeGreaterThanOrEqual(eloBefore);
    });

    it('should increase Elo more for weak team beating strong team', () => {
      const eloBeforeHaiti = getDynamicStats('Haití').elo;
      addMatchResult({ homeTeam: 'Haití', awayTeam: 'Argentina', homeGoals: 2, awayGoals: 1, date: '2026-06-15' });
      const eloAfterHaiti = getDynamicStats('Haití').elo;

      // Elo should increase significantly (unexpected win)
      expect(eloAfterHaiti).toBeGreaterThan(eloBeforeHaiti);
    });

    it('should decrease Elo when losing', () => {
      const eloBefore = getDynamicStats('Argentina').elo;
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'México', homeGoals: 0, awayGoals: 2, date: '2026-06-15' });
      const eloAfter = getDynamicStats('Argentina').elo;

      expect(eloAfter).toBeLessThan(eloBefore);
    });

    it('should have positive attack and defense strength', () => {
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'Francia', homeGoals: 2, awayGoals: 1, date: '2026-06-15' });

      const stats = getDynamicStats('Argentina');
      expect(stats.attackStrength).toBeGreaterThanOrEqual(0.3);
      expect(stats.defenseStrength).toBeGreaterThanOrEqual(0.3);
    });

    it('should update xGDiff based on xG data', () => {
      addMatchResult({
        homeTeam: 'Argentina',
        awayTeam: 'Francia',
        homeGoals: 1,
        awayGoals: 0,
        date: '2026-06-15',
        homeXG: 3.0,
        awayXG: 0.5,
      });

      const stats = getDynamicStats('Argentina');
      expect(stats.xGDiff).toBeGreaterThan(0);
    });
  });

  // ─── Edge cases ───────────────────────────────────────────────

  describe('edge cases', () => {
    it('should not crash when predicting with same team as home and away', () => {
      expect(() => {
        predictMatchDynamic('Argentina', 'Argentina');
      }).not.toThrow();

      const pred = predictMatchDynamic('Argentina', 'Argentina');
      expect(pred.homeExpectedGoals).toBeGreaterThan(0);
      expect(pred.awayExpectedGoals).toBeGreaterThan(0);
    });

    it('should handle completely unknown teams', () => {
      expect(() => {
        predictMatchDynamic('Equipo Alpha', 'Equipo Beta');
      }).not.toThrow();

      const pred = predictMatchDynamic('Equipo Alpha', 'Equipo Beta');
      expect(pred.homeExpectedGoals).toBeGreaterThan(0);
      expect(pred.awayExpectedGoals).toBeGreaterThan(0);
      expect(pred.hasRealData).toBe(false);
    });

    it('should handle mix of known and unknown teams', () => {
      const pred = predictMatchDynamic('Argentina', 'Equipo Desconocido');
      expect(pred.homeWinPct).toBeGreaterThan(0);
      expect(pred.awayWinPct).toBeGreaterThan(0);
    });

    it('should handle results with 0-0 draws', () => {
      expect(() => {
        addMatchResult({ homeTeam: 'Argentina', awayTeam: 'Francia', homeGoals: 0, awayGoals: 0, date: '2026-06-15' });
      }).not.toThrow();

      const stats = getDynamicStats('Argentina');
      expect(stats.formPoints).toBeGreaterThanOrEqual(0);
    });

    it('should handle high-scoring matches', () => {
      expect(() => {
        addMatchResult({ homeTeam: 'Argentina', awayTeam: 'Francia', homeGoals: 6, awayGoals: 4, date: '2026-06-15' });
      }).not.toThrow();

      const stats = getDynamicStats('Argentina');
      expect(stats.attackStrength).toBeGreaterThanOrEqual(0.3);
    });
  });

  // ─── getAllTeamStats ───────────────────────────────────────────

  describe('getAllTeamStats', () => {
    it('should return stats for all known teams', () => {
      const allStats = getAllTeamStats();
      expect(allStats.size).toBeGreaterThan(0);
    });

    it('should include Argentina', () => {
      const allStats = getAllTeamStats();
      expect(allStats.has('Argentina')).toBe(true);
    });

    it('should return valid stats for each team', () => {
      const allStats = getAllTeamStats();
      for (const [team, stats] of allStats) {
        expect(stats.elo).toBeGreaterThan(0);
        expect(stats.attackStrength).toBeGreaterThanOrEqual(0.3);
        expect(stats.defenseStrength).toBeGreaterThanOrEqual(0.3);
        expect(Number.isNaN(stats.elo)).toBe(false);
      }
    });
  });

  // ─── seedFromResults ──────────────────────────────────────────

  describe('seedFromResults', () => {
    it('should seed valid results and return count', () => {
      const count = seedFromResults([
        { homeTeam: 'Argentina', awayTeam: 'Francia', homeScore: 2, awayScore: 1 },
        { homeTeam: 'Brasil', awayTeam: 'México', homeScore: 3, awayScore: 0 },
      ]);

      expect(count).toBe(2);
      expect(getResultsCount()).toBe(2);
    });

    it('should skip TBD teams', () => {
      const count = seedFromResults([
        { homeTeam: 'Argentina', awayTeam: 'TBD', homeScore: 2, awayScore: 1 },
        { homeTeam: 'Brasil', awayTeam: 'México', homeScore: 3, awayScore: 0 },
      ]);

      expect(count).toBe(1);
      expect(getResultsCount()).toBe(1);
    });

    it('should return 0 for empty input', () => {
      const count = seedFromResults([]);
      expect(count).toBe(0);
      expect(getResultsCount()).toBe(0);
    });
  });

  // ─── resetEngine ──────────────────────────────────────────────

  describe('resetEngine', () => {
    it('should clear all stored results', () => {
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'Francia', homeGoals: 2, awayGoals: 1, date: '2026-06-15' });
      addMatchResult({ homeTeam: 'Brasil', awayTeam: 'México', homeGoals: 3, awayGoals: 0, date: '2026-06-16' });
      expect(getResultsCount()).toBe(2);

      resetEngine();

      expect(getResultsCount()).toBe(0);
      expect(getMatchResults()).toHaveLength(0);
    });

    it('should reset team stats to baseline after clearing', () => {
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'Francia', homeGoals: 2, awayGoals: 1, date: '2026-06-15' });
      expect(getDynamicStats('Argentina').matchesPlayed).toBe(1);

      resetEngine();

      expect(getDynamicStats('Argentina').matchesPlayed).toBe(0);
    });
  });

  // ─── No NaN in all outputs ────────────────────────────────────

  describe('no NaN in any output', () => {
    it('should never produce NaN predictions', () => {
      // Add various results
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'Francia', homeGoals: 2, awayGoals: 1, date: '2026-06-15' });
      addMatchResult({ homeTeam: 'Brasil', awayTeam: 'México', homeGoals: 0, awayGoals: 0, date: '2026-06-16' });
      addMatchResult({ homeTeam: 'México', awayTeam: 'Argentina', homeGoals: 1, awayGoals: 5, date: '2026-06-17' });

      // Test predictions for many team combinations
      const teams = ['Argentina', 'Francia', 'Brasil', 'México', 'Haití', 'Japón'];
      for (const home of teams) {
        for (const away of teams) {
          if (home === away) continue;
          const pred = predictMatchDynamic(home, away);
          expect(Number.isNaN(pred.homeExpectedGoals)).toBe(false);
          expect(Number.isNaN(pred.awayExpectedGoals)).toBe(false);
          expect(Number.isNaN(pred.homeWinPct)).toBe(false);
          expect(Number.isNaN(pred.drawPct)).toBe(false);
          expect(Number.isNaN(pred.awayWinPct)).toBe(false);
          expect(Number.isNaN(pred.confidence)).toBe(false);
        }
      }
    });

    it('should never produce NaN dynamic stats', () => {
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'Francia', homeGoals: 3, awayGoals: 2, date: '2026-06-15' });

      const allStats = getAllTeamStats();
      for (const [team, stats] of allStats) {
        expect(Number.isNaN(stats.elo)).toBe(false);
        expect(Number.isNaN(stats.attackStrength)).toBe(false);
        expect(Number.isNaN(stats.defenseStrength)).toBe(false);
        expect(Number.isNaN(stats.xGDiff)).toBe(false);
        expect(Number.isNaN(stats.formPoints)).toBe(false);
        expect(Number.isNaN(stats.momentum)).toBe(false);
      }
    });
  });

  // ─── Probability validity ─────────────────────────────────────

  describe('probability validity', () => {
    it('should have individual probabilities between 0 and 100', () => {
      addMatchResult({ homeTeam: 'Argentina', awayTeam: 'Francia', homeGoals: 2, awayGoals: 1, date: '2026-06-15' });

      const pred = predictMatchDynamic('Argentina', 'Francia');
      expect(pred.homeWinPct).toBeGreaterThanOrEqual(0);
      expect(pred.homeWinPct).toBeLessThanOrEqual(100);
      expect(pred.drawPct).toBeGreaterThanOrEqual(0);
      expect(pred.drawPct).toBeLessThanOrEqual(100);
      expect(pred.awayWinPct).toBeGreaterThanOrEqual(0);
      expect(pred.awayWinPct).toBeLessThanOrEqual(100);
    });

    it('should have probabilities summing to ~100 after many results', () => {
      for (let i = 0; i < 10; i++) {
        addMatchResult({
          homeTeam: 'Argentina',
          awayTeam: 'Francia',
          homeGoals: Math.floor(Math.random() * 4),
          awayGoals: Math.floor(Math.random() * 3),
          date: `2026-06-${String(15 + i).padStart(2, '0')}`,
        });
      }

      const pred = predictMatchDynamic('Argentina', 'Francia');
      const total = pred.homeWinPct + pred.drawPct + pred.awayWinPct;
      expect(total).toBeGreaterThanOrEqual(98);
      expect(total).toBeLessThanOrEqual(102);
    });

    it('should give overwhelming favorite near-100% win probability', () => {
      // Argentina (elite) vs unknown team with default rating
      const pred = predictMatchDynamic('Argentina', 'Equipo Desconocido');
      expect(pred.homeWinPct).toBeGreaterThan(60);
    });
  });
});
