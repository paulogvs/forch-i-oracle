import { describe, it, expect } from 'vitest';
import { WORLD_CUP_TEAMS, TEAM_NAMES, getTeamByName, getTeamEnglishName } from '../teams';

describe('teams data', () => {
  it('should have at least 48 World Cup teams', () => {
    expect(WORLD_CUP_TEAMS.length).toBeGreaterThanOrEqual(48);
  });

  it('should have all required fields including englishName', () => {
    WORLD_CUP_TEAMS.forEach((team) => {
      expect(team).toHaveProperty('name');
      expect(team).toHaveProperty('englishName');
      expect(team).toHaveProperty('code');
      expect(team).toHaveProperty('flag');
      expect(team).toHaveProperty('confederation');
      expect(team).toHaveProperty('group');
    });
  });

  it('should have unique codes', () => {
    const codes = WORLD_CUP_TEAMS.map((t) => t.code);
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });

  it('should include flags in TEAM_NAMES', () => {
    TEAM_NAMES.forEach((name) => {
      expect(name).toMatch(/ .+/); // flag + space + team name
    });
  });

  it('should have TEAM_NAMES array matching team count', () => {
    expect(TEAM_NAMES.length).toBe(WORLD_CUP_TEAMS.length);
  });
});

describe('getTeamByName', () => {
  it('should find team by Spanish name', () => {
    const brazil = getTeamByName('Brasil');
    expect(brazil).toBeDefined();
    expect(brazil?.code).toBe('BRA');
  });

  it('should be case-insensitive', () => {
    const team = getTeamByName('argentina');
    expect(team).toBeDefined();
    expect(team?.code).toBe('ARG');
  });

  it('should return undefined for unknown team', () => {
    expect(getTeamByName('Atlético de Madrid')).toBeUndefined();
  });
});

describe('getTeamEnglishName', () => {
  it('should convert Spanish names to English API names', () => {
    expect(getTeamEnglishName('Alemania')).toBe('Germany');
    expect(getTeamEnglishName('España')).toBe('Spain');
    expect(getTeamEnglishName('Países Bajos')).toBe('Netherlands');
    expect(getTeamEnglishName('Estados Unidos')).toBe('USA');
    expect(getTeamEnglishName('Costa de Marfil')).toBe('Ivory Coast');
  });

  it('should be case-insensitive', () => {
    expect(getTeamEnglishName('brasil')).toBe('Brazil');
    expect(getTeamEnglishName('BRASIL')).toBe('Brazil');
  });

  it('should fallback to original name for unknown teams', () => {
    expect(getTeamEnglishName('Some Unknown Team')).toBe('Some Unknown Team');
  });

  it('should cover all teams in WORLD_CUP_TEAMS', () => {
    WORLD_CUP_TEAMS.forEach((team) => {
      const english = getTeamEnglishName(team.name);
      expect(english).toBe(team.englishName);
    });
  });
});
