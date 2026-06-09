import { describe, it, expect } from 'vitest';
import {
  matches,
  GROUPS,
  getMatchesByGroup,
  getMatchesByRound,
  getMatchById,
  getConfirmedMatches,
  getGroupStageMatches,
  getKnockoutMatches,
  formatMatchDate,
  formatMatchTime,
  getTeamFlag,
  getRoundName,
  type Match,
  type Round,
} from '../matches';

describe('matches data', () => {
  it('should have all matches (group + knockout)', () => {
    // 72 group stage + knockout (at least 28)
    expect(matches.length).toBeGreaterThanOrEqual(100);
  });

  it('should have 12 groups (A-L)', () => {
    expect(GROUPS).toHaveLength(12);
    expect(GROUPS).toContain('A');
    expect(GROUPS).toContain('L');
  });
});

describe('getMatchesByGroup', () => {
  it('should return matches for a specific group', () => {
    const groupA = getMatchesByGroup('A');
    expect(groupA.length).toBeGreaterThan(0);
    groupA.forEach((m) => expect(m.group).toBe('A'));
  });

  it('should return empty array for invalid group', () => {
    expect(getMatchesByGroup('Z')).toHaveLength(0);
  });
});

describe('getMatchById', () => {
  it('should find a match by ID', () => {
    const match = getMatchById('A1');
    expect(match).toBeDefined();
    expect(match?.id).toBe('A1');
  });

  it('should find the final match', () => {
    const final = getMatchById('FINAL');
    expect(final).toBeDefined();
    expect(final?.round).toBe('final');
  });

  it('should return undefined for unknown ID', () => {
    expect(getMatchById('ZZZ999')).toBeUndefined();
  });
});

describe('getConfirmedMatches', () => {
  it('should exclude TBD matches', () => {
    const confirmed = getConfirmedMatches();
    confirmed.forEach((m) => expect(m.isTBD).toBeFalsy());
  });

  it('should have fewer matches than total', () => {
    expect(getConfirmedMatches().length).toBeLessThan(matches.length);
  });
});

describe('getGroupStageMatches / getKnockoutMatches', () => {
  it('should separate group stage from knockout', () => {
    const groupStage = getGroupStageMatches();
    const knockout = getKnockoutMatches();

    groupStage.forEach((m) => expect(m.round).toBe('group'));
    knockout.forEach((m) => expect(m.round).not.toBe('group'));

    expect(groupStage.length + knockout.length).toBe(matches.length);
  });
});

describe('getMatchesByRound', () => {
  it('should return round-16 matches', () => {
    const r16 = getMatchesByRound('round-16');
    expect(r16.length).toBeGreaterThan(0);
    r16.forEach((m) => expect(m.round).toBe('round-16'));
  });

  it('should return the final', () => {
    const finals = getMatchesByRound('final');
    expect(finals.length).toBe(1);
    expect(finals[0].id).toBe('FINAL');
  });
});

describe('format helpers', () => {
  it('should format match date', () => {
    const match: Match = {
      id: 'test',
      group: 'A',
      matchday: 1,
      date: '2026-06-11',
      time: '02:00',
      homeTeam: 'México',
      awayTeam: 'Sudáfrica',
      homeCode: 'MEX',
      awayCode: 'RSA',
      venue: 'Estadio Azteca',
      city: 'Mexico City',
      round: 'group',
    };
    const formatted = formatMatchDate(match);
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe('string');
  });

  it('should format match time with UTC', () => {
    const match: Match = {
      id: 'test',
      group: 'A',
      matchday: 1,
      date: '2026-06-11',
      time: '02:00',
      homeTeam: 'México',
      awayTeam: 'Sudáfrica',
      homeCode: 'MEX',
      awayCode: 'RSA',
      venue: 'Estadio Azteca',
      city: 'Mexico City',
      round: 'group',
    };
    expect(formatMatchTime(match)).toBe('02:00 UTC');
  });

  it('should get team flag for known teams', () => {
    expect(getTeamFlag('Brasil')).toBe('🇧🇷');
    expect(getTeamFlag('México')).toBe('🇲🇽');
  });

  it('should return fallback flag for unknown teams', () => {
    expect(getTeamFlag('Made Up Team')).toBe('🏳️');
  });
});

describe('getRoundName', () => {
  it('should return Spanish round names', () => {
    expect(getRoundName('group')).toBe('Fase de Grupos');
    expect(getRoundName('round-32')).toBe('Dieciseisavos de Final');
    expect(getRoundName('round-16')).toBe('Octavos de Final');
    expect(getRoundName('quarter')).toBe('Cuartos de Final');
    expect(getRoundName('semi')).toBe('Semifinales');
    expect(getRoundName('third')).toBe('Tercer Puesto');
    expect(getRoundName('final')).toBe('La Gran Final');
  });
});
