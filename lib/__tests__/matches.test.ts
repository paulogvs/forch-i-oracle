import { describe, it, expect } from 'vitest';
import {
  ALL_MATCHES,
  GROUPS,
  getMatchesByGroup,
  getMatchesByRound,
  GROUP_STAGE_MATCHES,
  KNOCKOUT_MATCHES,
  formatMatchDate,
  formatMatchTime,
  getTeamFlag,
  getRoundName,
  type Match,
} from '../matches';

describe('matches data', () => {
  it('should have all matches (group + knockout)', () => {
    // 72 group stage + knockout (16 R32 + 8 R16 + 4 QF + 2 SF + 1 TP + 1 Final = 128)
    expect(ALL_MATCHES.length).toBeGreaterThanOrEqual(100);
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

describe('GROUP_STAGE_MATCHES / KNOCKOUT_MATCHES', () => {
  it('should separate group stage from knockout', () => {
    GROUP_STAGE_MATCHES.forEach((m) => expect(m.round).toBe('group'));
    KNOCKOUT_MATCHES.forEach((m) => expect(m.round).not.toBe('group'));
    expect(GROUP_STAGE_MATCHES.length + KNOCKOUT_MATCHES.length).toBe(ALL_MATCHES.length);
  });
});

describe('getMatchesByRound', () => {
  it('should return round-32 matches', () => {
    const r32 = getMatchesByRound('round-32');
    expect(r32.length).toBeGreaterThan(0);
    r32.forEach((m) => expect(m.round).toBe('round-32'));
  });

  it('should return round-16 matches', () => {
    const r16 = getMatchesByRound('round-16');
    expect(r16.length).toBeGreaterThan(0);
    r16.forEach((m) => expect(m.round).toBe('round-16'));
  });

  it('should return the final', () => {
    const finals = getMatchesByRound('final');
    expect(finals.length).toBe(1);
    expect(finals[0].round).toBe('final');
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

  it('should format match time', () => {
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
    expect(formatMatchTime(match)).toBe('02:00');
  });

  it('should get team flag for known teams', () => {
    expect(getTeamFlag('Brasil')).toBe('🇧🇷');
    expect(getTeamFlag('México')).toBe('🇲🇽');
    expect(getTeamFlag('Corea del Sur')).toBe('🇰🇷');
  });

  it('should return fallback flag for unknown teams', () => {
    expect(getTeamFlag('Made Up Team')).toBe('❓');
  });
});

describe('getRoundName', () => {
  it('should return Spanish round names', () => {
    expect(getRoundName('group')).toBe('Fase de Grupos');
    expect(getRoundName('round-32')).toBe('1/16 Final');
    expect(getRoundName('round-16')).toBe('Octavos');
    expect(getRoundName('quarter')).toBe('Cuartos');
    expect(getRoundName('semi')).toBe('Semis');
    expect(getRoundName('third')).toBe('3° Puesto');
    expect(getRoundName('final')).toBe('Final');
  });
});
