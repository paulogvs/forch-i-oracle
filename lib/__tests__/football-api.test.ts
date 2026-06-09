import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getTeamStats, getMatchContext } from '../football-api';

// Save and restore original env
const originalApiKey = process.env.FOOTBALL_API_KEY;

describe('football-api (no API key — fallback behavior)', () => {
  beforeEach(() => {
    // Ensure no API key is set so we test fallback
    delete process.env.FOOTBALL_API_KEY;
  });

  afterEach(() => {
    // Restore original env
    if (originalApiKey) {
      process.env.FOOTBALL_API_KEY = originalApiKey;
    } else {
      delete process.env.FOOTBALL_API_KEY;
    }
  });

  it('should return empty injuries when API key is not configured', async () => {
    const stats = await getTeamStats('Brasil');
    expect(stats.injuries).toEqual([]);
  });

  it('should return empty form when API key is not configured', async () => {
    const stats = await getTeamStats('Brasil');
    expect(stats.recentForm).toEqual([]);
  });

  it('should return match context with fallback data', async () => {
    const context = await getMatchContext('Brasil', 'Argentina');
    expect(context).toContain('Brasil');
    expect(context).toContain('Argentina');
    expect(context).toContain('Ninguna conocida'); // fallback for injuries
    expect(context).toContain('Sin datos recientes'); // fallback for form
  });
});
