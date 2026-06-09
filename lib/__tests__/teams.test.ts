import { describe, it, expect } from 'vitest';
import { WORLD_CUP_TEAMS, TEAM_NAMES } from '../teams';

describe('teams', () => {
  it('should have World Cup teams', () => {
    expect(WORLD_CUP_TEAMS.length).toBeGreaterThanOrEqual(47);
  });

  it('should have required fields', () => {
    WORLD_CUP_TEAMS.forEach(team => {
      expect(team).toHaveProperty('name');
      expect(team).toHaveProperty('code');
      expect(team).toHaveProperty('flag');
      expect(team).toHaveProperty('confederation');
      expect(team).toHaveProperty('group');
    });
  });

  it('should have TEAM_NAMES array', () => {
    expect(TEAM_NAMES.length).toBeGreaterThanOrEqual(47);
  });

  it('should include flags in TEAM_NAMES', () => {
    TEAM_NAMES.forEach(name => {
      expect(name).toMatch(/ .+/); // flag + space + team name
    });
  });

  it('should find team by name', () => {
    const brazil = WORLD_CUP_TEAMS.find(t => t.name === 'Brasil');
    expect(brazil).toBeDefined();
    expect(brazil?.code).toBe('BRA');
  });

  it('should have unique codes', () => {
    const codes = WORLD_CUP_TEAMS.map(t => t.code);
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });
});
