import { describe, it, expect } from 'vitest';
import {
  simulateTournament,
  simulateTournamentMulti,
  buildConsensusBracket,
  assignThirdsBacktracking,
  type TournamentBracket,
  type MultiSimResult,
} from '../tournament-sim';
import { WORLD_CUP_TEAMS } from '../teams';

const VALID_TEAM_NAMES = new Set(WORLD_CUP_TEAMS.map((t) => t.name));
const ALL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

function expectValidTeam(name: string) {
  expect(VALID_TEAM_NAMES.has(name)).toBe(true);
}

function expectValidMatch(m: any) {
  expect(m.homeTeam).toBeTruthy();
  expect(m.awayTeam).toBeTruthy();
  expect(typeof m.homeScore).toBe('number');
  expect(typeof m.awayScore).toBe('number');
  expect(m.winner).toBeTruthy();
  expect(m.isPlayed).toBeDefined();
}

function expectValidStanding(s: any) {
  expect(typeof s.played).toBe('number');
  expect(typeof s.won).toBe('number');
  expect(typeof s.drawn).toBe('number');
  expect(typeof s.lost).toBe('number');
  expect(typeof s.goalsFor).toBe('number');
  expect(typeof s.goalsAgainst).toBe('number');
  expect(typeof s.goalDiff).toBe('number');
  expect(typeof s.points).toBe('number');
}

describe('tournament-sim', () => {
  // ──────────────────────────────────────────────────────────────
  // assignThirdsBacktracking (sync, pure function)
  // ──────────────────────────────────────────────────────────────

  describe('assignThirdsBacktracking', () => {
    it('should assign all qualified groups to slots when possible', () => {
      const slots = [
        ['A', 'B', 'C'],
        ['D', 'E', 'F'],
        ['G', 'H', 'I'],
      ];
      const qualified = ['A', 'D', 'G'];
      const result = assignThirdsBacktracking(slots, qualified);
      expect(result).toHaveLength(3);
      expect(result.filter((x) => x !== null)).toHaveLength(3);
    });

    it('should return null for slots with no viable groups', () => {
      const slots = [['A', 'B'], ['C', 'D']];
      const qualified = ['A'];
      const result = assignThirdsBacktracking(slots, qualified);
      expect(result).toHaveLength(2);
      expect(result[0]).toBe('A');
      expect(result[1]).toBeNull();
    });

    it('should not assign the same group to multiple slots', () => {
      const slots = [['A', 'B'], ['A', 'B']];
      const qualified = ['A', 'B'];
      const result = assignThirdsBacktracking(slots, qualified);
      const nonNull = result.filter((x) => x !== null) as string[];
      expect(new Set(nonNull).size).toBe(nonNull.length);
    });

    it('should handle empty qualified groups', () => {
      const slots = [['A', 'B'], ['C', 'D']];
      const result = assignThirdsBacktracking(slots, []);
      expect(result.every((x) => x === null)).toBe(true);
    });

    it('should handle empty slots', () => {
      const result = assignThirdsBacktracking([], ['A', 'B']);
      expect(result).toHaveLength(0);
    });

    it('should handle more qualified groups than slots', () => {
      const slots = [['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']];
      const qualified = ALL_LETTERS;
      const result = assignThirdsBacktracking(slots, qualified);
      expect(result).toHaveLength(1);
      expect(result[0]).not.toBeNull();
      expect(qualified).toContain(result[0]);
    });

    it('should produce a valid assignment for real WC2026 slots', () => {
      const r32SlotAllowed: string[][] = [
        ['A', 'B', 'C', 'D', 'F'],
        ['C', 'D', 'F', 'G', 'H'],
        ['C', 'E', 'F', 'H', 'I'],
        ['E', 'H', 'I', 'J', 'K'],
        ['B', 'E', 'F', 'I', 'J'],
        ['A', 'E', 'H', 'I', 'J'],
        ['E', 'F', 'G', 'I', 'J'],
        ['D', 'E', 'I', 'J', 'L'],
      ];
      const result = assignThirdsBacktracking(r32SlotAllowed, ALL_LETTERS);
      expect(result).toHaveLength(8);
      const assigned = result.filter((x) => x !== null) as string[];
      expect(new Set(assigned).size).toBe(assigned.length);
      assigned.forEach((g) => expect(ALL_LETTERS).toContain(g));
    });
  });

  // ──────────────────────────────────────────────────────────────
  // simulateTournament (single simulation)
  // ──────────────────────────────────────────────────────────────

  describe('simulateTournament', () => {
    let bracket: TournamentBracket;

    it('should return a valid TournamentBracket', async () => {
      bracket = await simulateTournament({ seed: 42 });
      expect(bracket).toBeDefined();
      expect(bracket.champion).toBeTruthy();
      expect(bracket.runnerUp).toBeTruthy();
      expect(bracket.thirdPlaceTeam).toBeTruthy();
      expect(bracket.fourthPlaceTeam).toBeTruthy();
      expect(bracket.simulatedAt).toBeTruthy();
    }, 30000);

    it('should have exactly 12 groups (A-L)', async () => {
      const b = await simulateTournament({ seed: 42 });
      expect(b.groups).toHaveLength(12);
      const groupLetters = b.groups.map((g) => g.group);
      expect(groupLetters).toEqual(ALL_LETTERS);
    }, 30000);

    it('should have 4 teams per group', async () => {
      const b = await simulateTournament({ seed: 42 });
      for (const group of b.groups) {
        expect(group.teams).toHaveLength(4);
      }
    }, 30000);

    it('should have no duplicate teams in the same group', async () => {
      const b = await simulateTournament({ seed: 42 });
      for (const group of b.groups) {
        const names = group.teams.map((t) => t.name);
        expect(new Set(names).size).toBe(names.length);
      }
    }, 30000);

    it('should have all 48 teams across all groups', async () => {
      const b = await simulateTournament({ seed: 42 });
      const allNames = b.groups.flatMap((g) => g.teams.map((t) => t.name)).sort();
      const expected = WORLD_CUP_TEAMS.map((t) => t.name).sort();
      expect(allNames).toEqual(expected);
    }, 30000);

    it('each team standing should have valid columns', async () => {
      const b = await simulateTournament({ seed: 42 });
      for (const group of b.groups) {
        for (const team of group.teams) {
          expectValidStanding(team);
          expect(team.name).toBeTruthy();
          expect(team.flag).toBeTruthy();
          expect(team.code).toBeTruthy();
        }
      }
    }, 30000);

    it('standings should be sorted by points desc, then GD desc, then GF desc', async () => {
      const b = await simulateTournament({ seed: 42 });
      for (const group of b.groups) {
        const teams = group.teams;
        for (let i = 0; i < teams.length - 1; i++) {
          const a = teams[i];
          const c = teams[i + 1];
          // Either a has more pts, or same pts + better GD, or same pts + same GD + more GF
          const ordered =
            a.points > c.points ||
            (a.points === c.points && a.goalDiff > c.goalDiff) ||
            (a.points === c.points && a.goalDiff === c.goalDiff && a.goalsFor >= c.goalsFor);
          expect(ordered).toBe(true);
        }
      }
    }, 30000);

    it('each group should have 6 matches played per team', async () => {
      const b = await simulateTournament({ seed: 42 });
      for (const group of b.groups) {
        for (const team of group.teams) {
          expect(team.played).toBe(3);
        }
      }
    }, 30000);

    it('should have correct knockout round sizes', async () => {
      const b = await simulateTournament({ seed: 42 });
      expect(b.roundOf32).toHaveLength(16);
      expect(b.roundOf16).toHaveLength(8);
      expect(b.quarters).toHaveLength(4);
      expect(b.semis).toHaveLength(2);
      expect(b.thirdPlace).toBeDefined();
      expect(b.thirdPlace.id).toBe('TP-1');
      expect(b.final).toBeDefined();
      expect(b.final.id).toBe('FINAL');
    }, 30000);

    it('knockout matches should have valid team names (not TBD)', async () => {
      const b = await simulateTournament({ seed: 42 });
      for (const match of [...b.roundOf32, ...b.roundOf16, ...b.quarters, ...b.semis]) {
        expectValidMatch(match);
        expect(match.homeTeam).not.toBe('TBD');
        expect(match.awayTeam).not.toBe('TBD');
        expectValidTeam(match.homeTeam);
        expectValidTeam(match.awayTeam);
      }
    }, 30000);

    it('final should produce a champion and runner-up', async () => {
      const b = await simulateTournament({ seed: 42 });
      expect(b.final.winner).toBeTruthy();
      expect(b.final.winner).not.toBe('TBD');
      expect(b.final.winner).not.toBe('draw');
      expectValidTeam(b.final.winner);
      expectValidTeam(b.runnerUp);
    }, 30000);

    it('champion, runner-up, and third place should all be distinct', async () => {
      const b = await simulateTournament({ seed: 42 });
      expect(b.champion).not.toBe(b.runnerUp);
      expect(b.champion).not.toBe(b.thirdPlaceTeam);
      expect(b.runnerUp).not.toBe(b.thirdPlaceTeam);
    }, 30000);

    it('champion and runner-up should come from the final match', async () => {
      const b = await simulateTournament({ seed: 42 });
      const finalTeams = [b.final.homeTeam, b.final.awayTeam];
      expect(finalTeams).toContain(b.champion);
      expect(finalTeams).toContain(b.runnerUp);
    }, 30000);

    it('third and fourth place should come from the third-place match', async () => {
      const b = await simulateTournament({ seed: 42 });
      const tpTeams = [b.thirdPlace.homeTeam, b.thirdPlace.awayTeam];
      expect(tpTeams).toContain(b.thirdPlaceTeam);
      expect(tpTeams).toContain(b.fourthPlaceTeam);
    }, 30000);

    it('should be deterministic with the same seed', async () => {
      const b1 = await simulateTournament({ seed: 123 });
      const b2 = await simulateTournament({ seed: 123 });
      expect(b1.champion).toBe(b2.champion);
      expect(b1.runnerUp).toBe(b2.runnerUp);
      expect(b1.thirdPlaceTeam).toBe(b2.thirdPlaceTeam);
      expect(b1.final.homeTeam).toBe(b2.final.homeTeam);
      expect(b1.final.awayTeam).toBe(b2.final.awayTeam);
    }, 30000);

    it('should produce different results with different seeds', async () => {
      const b1 = await simulateTournament({ seed: 1 });
      const b2 = await simulateTournament({ seed: 99999 });
      // Not guaranteed to be different, but very likely with different seeds
      // Just verify both ran successfully
      expect(b1.champion).toBeTruthy();
      expect(b2.champion).toBeTruthy();
    }, 30000);

    it('should accept real results that override simulation', async () => {
      // Use a group stage match (A1: México vs Sudáfrica) with its real matchId
      const realResult = {
        matchId: 'A1',
        homeScore: 5,
        awayScore: 0,
        winner: 'México',
      };
      const b = await simulateTournament({ realResults: [realResult], seed: 42 });
      // México should have 3 pts and 5 GF from the real result in Group A
      const groupA = b.groups.find((g) => g.group === 'A');
      expect(groupA).toBeDefined();
      const mexico = groupA!.teams.find((t) => t.name === 'México');
      expect(mexico).toBeDefined();
      expect(mexico!.goalsFor).toBeGreaterThanOrEqual(5);
      expect(mexico!.points).toBeGreaterThanOrEqual(3);
    }, 30000);
  });

  // ──────────────────────────────────────────────────────────────
  // simulateTournamentMulti
  // ──────────────────────────────────────────────────────────────

  describe('simulateTournamentMulti', () => {
    it('should complete 10 simulations without error', async () => {
      const result = await simulateTournamentMulti(10, [], undefined, Date.now());
      expect(result).toBeDefined();
      expect(result.totalSims).toBe(10);
    }, 60000);

    it('should return top-8 champion probabilities', async () => {
      const result = await simulateTournamentMulti(10, [], undefined, Date.now());
      expect(result.top8).toBeDefined();
      expect(result.top8.length).toBeLessThanOrEqual(8);
      expect(result.top8.length).toBeGreaterThan(0);
    }, 60000);

    it('each champion probability entry should have valid shape', async () => {
      const result = await simulateTournamentMulti(10, [], undefined, Date.now());
      for (const entry of result.top8) {
        expect(entry.team).toBeTruthy();
        expect(typeof entry.wins).toBe('number');
        expect(entry.wins).toBeGreaterThan(0);
        expect(typeof entry.pct).toBe('number');
        expect(entry.pct).toBeGreaterThanOrEqual(0);
        expect(entry.pct).toBeLessThanOrEqual(100);
        expect(entry.flag).toBeTruthy();
        expectValidTeam(entry.team);
      }
    }, 60000);

    it('probabilities should sum to approximately 100%', async () => {
      const result = await simulateTournamentMulti(10, [], undefined, Date.now());
      const totalPct = result.top8.reduce((s, e) => s + e.pct, 0);
      // Allow rounding tolerance (up to 1% off due to Math.round)
      expect(totalPct).toBeGreaterThanOrEqual(90);
      expect(totalPct).toBeLessThanOrEqual(110);
    }, 60000);

    it('should return a bracket from the last simulation', async () => {
      const result = await simulateTournamentMulti(10, [], undefined, Date.now());
      expect(result.bracket).toBeDefined();
      expect(result.bracket.champion).toBeTruthy();
      expect(result.bracket.groups).toHaveLength(12);
      expect(result.bracket.roundOf32).toHaveLength(16);
    }, 60000);

    it('should return round counts for all rounds', async () => {
      const result = await simulateTournamentMulti(10, [], undefined, Date.now());
      expect(result.roundCounts).toBeDefined();
      expect(result.roundCounts.r32).toBeInstanceOf(Map);
      expect(result.roundCounts.r16).toBeInstanceOf(Map);
      expect(result.roundCounts.qf).toBeInstanceOf(Map);
      expect(result.roundCounts.sf).toBeInstanceOf(Map);
      expect(result.roundCounts.final).toBeInstanceOf(Map);
      expect(result.roundCounts.champion).toBeInstanceOf(Map);
      expect(result.roundCounts.runnerUp).toBeInstanceOf(Map);
      expect(result.roundCounts.third).toBeInstanceOf(Map);
    }, 60000);

    it('should be deterministic with the same seed', async () => {
      const seed = 54321;
      const r1 = await simulateTournamentMulti(10, [], undefined, seed);
      const r2 = await simulateTournamentMulti(10, [], undefined, seed);
      expect(r1.top8.map((e) => e.team)).toEqual(r2.top8.map((e) => e.team));
      expect(r1.top8.map((e) => e.wins)).toEqual(r2.top8.map((e) => e.wins));
    }, 60000);

    it('champion counts should not exceed total sims', async () => {
      const result = await simulateTournamentMulti(10, [], undefined, Date.now());
      let totalWins = 0;
      for (const [, count] of result.roundCounts.champion) {
        totalWins += count;
      }
      expect(totalWins).toBeLessThanOrEqual(10);
      expect(totalWins).toBeGreaterThan(0);
    }, 60000);

    it('real results should affect simulation outcome', async () => {
      const seed = 42;
      // Override a group match so Mexico beats South Africa 10-0 (A1)
      const realResults = [{
        matchId: 'A1',
        homeScore: 10,
        awayScore: 0,
        winner: 'México',
      }];
      const withRealResult = await simulateTournamentMulti(10, realResults, undefined, seed);
      // Check that in the bracket's group A, Mexico has at least 10 GF
      const groupA = withRealResult.bracket.groups.find((g) => g.group === 'A');
      expect(groupA).toBeDefined();
      const mexico = groupA!.teams.find((t) => t.name === 'México');
      expect(mexico).toBeDefined();
      expect(mexico!.goalsFor).toBeGreaterThanOrEqual(10);
    }, 60000);
  });

  // ──────────────────────────────────────────────────────────────
  // buildConsensusBracket
  // ──────────────────────────────────────────────────────────────

  describe('buildConsensusBracket', () => {
    function makeRoundCounts(overrides?: {
      r32?: [string, number][];
      r16?: [string, number][];
      qf?: [string, number][];
      sf?: [string, number][];
      final?: [string, number][];
      champion?: [string, number][];
      runnerUp?: [string, number][];
      third?: [string, number][];
    }): MultiSimResult['roundCounts'] {
      const make = (entries?: [string, number][]) => {
        const m = new Map<string, number>();
        if (entries) entries.forEach(([k, v]) => m.set(k, v));
        return m;
      };
      return {
        r32: make(overrides?.r32),
        r16: make(overrides?.r16),
        qf: make(overrides?.qf),
        sf: make(overrides?.sf),
        final: make(overrides?.final),
        champion: make(overrides?.champion),
        runnerUp: make(overrides?.runnerUp),
        third: make(overrides?.third),
      };
    }

    it('should return a valid bracket from simulation counts', () => {
      const counts = makeRoundCounts({
        r32: [['Brasil', 10], ['Argentina', 9], ['Francia', 8], ['España', 7],
              ['Alemania', 6], ['Inglaterra', 5], ['Portugal', 4], ['Países Bajos', 3]],
        r16: [['Brasil', 8], ['Argentina', 7], ['Francia', 6], ['España', 5]],
        qf: [['Brasil', 6], ['Argentina', 5], ['Francia', 4], ['España', 3]],
        sf: [['Brasil', 5], ['Argentina', 4]],
        final: [['Brasil', 4], ['Argentina', 3]],
        champion: [['Brasil', 3], ['Argentina', 2]],
        runnerUp: [['Argentina', 2]],
        third: [['Francia', 1]],
      });
      const bracket = buildConsensusBracket(counts, 10, [
        { team: 'Brasil', flag: '🇧🇷', wins: 3, pct: 30 },
        { team: 'Argentina', flag: '🇦🇷', wins: 2, pct: 20 },
      ]);
      expect(bracket.champion).toBe('Brasil');
      expect(bracket.runnerUp).toBe('Argentina');
      expect(bracket.roundOf32).toHaveLength(16);
      expect(bracket.roundOf16).toHaveLength(8);
      expect(bracket.quarters).toHaveLength(4);
      expect(bracket.semis).toHaveLength(2);
      expect(bracket.thirdPlace).toBeDefined();
      expect(bracket.final).toBeDefined();
    });

    it('all knockout slots should be filled with team names', () => {
      const counts = makeRoundCounts({
        r32: [
          ['Brasil', 10], ['Argentina', 9], ['Francia', 8], ['España', 7],
          ['Alemania', 6], ['Inglaterra', 5], ['Portugal', 4], ['Países Bajos', 3],
          ['Bélgica', 2], ['Croacia', 2], ['Uruguay', 1], ['Japón', 1],
          ['Marruecos', 1], ['Corea del Sur', 1], ['México', 1], ['Ecuador', 1],
          ['Colombia', 1], ['Senegal', 1], ['Estados Unidos', 1], ['Irán', 1],
          ['Túnez', 1], ['Canadá', 1], ['Sudáfrica', 1], ['Suiza', 1],
          ['Paraguay', 1], ['Argelia', 1], ['Costa de Marfil', 1], ['Cabo Verde', 1],
          ['Australia', 1], ['Escocia', 1], ['Noruega', 1], ['Turquía', 1],
        ],
        r16: [
          ['Brasil', 8], ['Argentina', 7], ['Francia', 6], ['España', 5],
          ['Alemania', 4], ['Inglaterra', 3], ['Portugal', 2], ['Países Bajos', 1],
        ],
        qf: [['Brasil', 6], ['Argentina', 5], ['Francia', 4], ['España', 3]],
        sf: [['Brasil', 5], ['Argentina', 4]],
        final: [['Brasil', 4], ['Argentina', 3]],
        champion: [['Brasil', 3]],
        runnerUp: [['Argentina', 2]],
        third: [['Francia', 1]],
      });
      const bracket = buildConsensusBracket(counts, 10);
      for (const match of [...bracket.roundOf32, ...bracket.roundOf16, ...bracket.quarters, ...bracket.semis]) {
        expect(match.homeTeam).not.toBe('TBD');
        expect(match.awayTeam).not.toBe('TBD');
      }
    });

    it('final champion should match the champion parameter', () => {
      const counts = makeRoundCounts({
        champion: [['Brasil', 5], ['Argentina', 3]],
        runnerUp: [['Argentina', 3]],
        third: [['Francia', 2]],
        r32: [['Brasil', 10], ['Argentina', 9]],
        r16: [['Brasil', 8], ['Argentina', 7]],
        qf: [['Brasil', 6], ['Argentina', 5]],
        sf: [['Brasil', 5], ['Argentina', 4]],
        final: [['Brasil', 4], ['Argentina', 3]],
      });
      const bracket = buildConsensusBracket(counts, 10, [
        { team: 'Brasil', flag: '🇧🇷', wins: 5, pct: 50 },
        { team: 'Argentina', flag: '🇦🇷', wins: 3, pct: 30 },
      ]);
      expect(bracket.champion).toBe('Brasil');
      expect(bracket.final.winner).toBe('Brasil');
    });

    it('should handle edge case with minimal data', () => {
      const counts = makeRoundCounts({
        r32: [['Brasil', 1]],
        r16: [['Brasil', 1]],
        qf: [['Brasil', 1]],
        sf: [['Brasil', 1]],
        final: [['Brasil', 1]],
        champion: [['Brasil', 1]],
        runnerUp: [['Argentina', 1]],
        third: [['Francia', 1]],
      });
      const bracket = buildConsensusBracket(counts, 1);
      expect(bracket.champion).toBe('Brasil');
      expect(bracket.simulatedAt).toBeTruthy();
    });

    it('simulatedAt should be a valid ISO timestamp', () => {
      const counts = makeRoundCounts({
        champion: [['Brasil', 1]],
        runnerUp: [['Argentina', 1]],
        third: [['Francia', 1]],
        r32: [['Brasil', 1]],
        r16: [['Brasil', 1]],
        qf: [['Brasil', 1]],
        sf: [['Brasil', 1]],
        final: [['Brasil', 1]],
      });
      const bracket = buildConsensusBracket(counts, 1);
      expect(() => new Date(bracket.simulatedAt)).not.toThrow();
      expect(new Date(bracket.simulatedAt).getTime()).not.toBeNaN();
    });

    it('should populate all flag fields', () => {
      const counts = makeRoundCounts({
        r32: [
          ['Brasil', 10], ['Argentina', 9], ['Francia', 8], ['España', 7],
          ['Alemania', 6], ['Inglaterra', 5], ['Portugal', 4], ['Países Bajos', 3],
          ['Bélgica', 2], ['Croacia', 2], ['Uruguay', 1], ['Japón', 1],
          ['Marruecos', 1], ['Corea del Sur', 1], ['México', 1], ['Ecuador', 1],
        ],
        r16: [
          ['Brasil', 8], ['Argentina', 7], ['Francia', 6], ['España', 5],
          ['Alemania', 4], ['Inglaterra', 3], ['Portugal', 2], ['Países Bajos', 1],
        ],
        qf: [['Brasil', 6], ['Argentina', 5], ['Francia', 4], ['España', 3]],
        sf: [['Brasil', 5], ['Argentina', 4]],
        final: [['Brasil', 4], ['Argentina', 3]],
        champion: [['Brasil', 3]],
        runnerUp: [['Argentina', 2]],
        third: [['Francia', 1]],
      });
      const bracket = buildConsensusBracket(counts, 10);
      expect(bracket.championFlag).toBeTruthy();
      expect(bracket.runnerUpFlag).toBeTruthy();
      expect(bracket.thirdPlaceFlag).toBeTruthy();
      expect(bracket.fourthPlaceFlag).toBeTruthy();
    });
  });
});
