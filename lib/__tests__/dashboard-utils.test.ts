import { describe, it, expect } from 'vitest';
import { groupResultsByDate, getUpcomingMatches, getRoundLabel } from '../dashboard-utils';
import type { MatchResultDetail } from '../dashboard-utils';

describe('dashboard-utils', () => {
  describe('groupResultsByDate', () => {
    it('groups matches by date and sorts chronologically', () => {
      const matches: MatchResultDetail[] = [
        { home: 'Brasil', away: 'Marruecos', pred: [2, 1], real: [2, 1], correct: true, exact: true, date: '2026-06-13', time: '22:00', round: 'group', group: 'C', confidence: 'alta' },
        { home: 'México', away: 'Sudáfrica', pred: [1, 0], real: [2, 0], correct: true, exact: false, date: '2026-06-11', time: '19:00', round: 'group', group: 'A', confidence: 'media' },
        { home: 'Canadá', away: 'Bosnia', pred: [1, 1], real: [0, 2], correct: false, exact: false, date: '2026-06-12', time: '19:00', round: 'group', group: 'B', confidence: 'baja' },
      ];

      const groups = groupResultsByDate(matches);

      expect(groups).toHaveLength(3);
      // Sorted by date
      expect(groups[0].date).toBe('2026-06-11');
      expect(groups[1].date).toBe('2026-06-12');
      expect(groups[2].date).toBe('2026-06-13');
    });

    it('computes accuracy per day', () => {
      const matches: MatchResultDetail[] = [
        { home: 'A', away: 'B', pred: [1, 0], real: [1, 0], correct: true, exact: true, date: '2026-06-11', time: '19:00', round: 'group', group: 'A', confidence: 'alta' },
        { home: 'C', away: 'D', pred: [2, 1], real: [0, 1], correct: false, exact: false, date: '2026-06-11', time: '22:00', round: 'group', group: 'B', confidence: 'media' },
        { home: 'E', away: 'F', pred: [1, 1], real: [1, 1], correct: true, exact: true, date: '2026-06-11', time: '16:00', round: 'group', group: 'C', confidence: 'alta' },
      ];

      const groups = groupResultsByDate(matches);

      expect(groups).toHaveLength(1);
      expect(groups[0].totalCount).toBe(3);
      expect(groups[0].correctCount).toBe(2);
      expect(groups[0].accuracyPct).toBe(67);
    });

    it('returns empty array for no matches', () => {
      expect(groupResultsByDate([])).toEqual([]);
    });

    it('sorts matches within a day by time', () => {
      const matches: MatchResultDetail[] = [
        { home: 'A', away: 'B', pred: [1, 0], real: [1, 0], correct: true, exact: true, date: '2026-06-11', time: '22:00', round: 'group', group: 'A', confidence: 'alta' },
        { home: 'C', away: 'D', pred: [2, 1], real: [2, 1], correct: true, exact: true, date: '2026-06-11', time: '16:00', round: 'group', group: 'B', confidence: 'alta' },
      ];

      const groups = groupResultsByDate(matches);

      expect(groups[0].matches[0].time).toBe('16:00');
      expect(groups[0].matches[1].time).toBe('22:00');
    });
  });

  describe('getRoundLabel', () => {
    it('returns correct labels for all rounds', () => {
      expect(getRoundLabel('group')).toBe('Fase de Grupos');
      expect(getRoundLabel('round-32')).toBe('1/16 Final');
      expect(getRoundLabel('round-16')).toBe('Octavos');
      expect(getRoundLabel('quarter')).toBe('Cuartos');
      expect(getRoundLabel('semi')).toBe('Semifinales');
      expect(getRoundLabel('third')).toBe('Tercer Puesto');
      expect(getRoundLabel('final')).toBe('Final');
    });

    it('returns raw string for unknown rounds', () => {
      expect(getRoundLabel('unknown')).toBe('unknown');
    });
  });
});
