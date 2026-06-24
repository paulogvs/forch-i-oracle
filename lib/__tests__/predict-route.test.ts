import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';

// @ts-nocheck — vitest test file, mock objects don't satisfy NextRequest strictly

// Mock the modules that make external calls
vi.mock('@/lib/football-api', () => ({
  getMatchContext: vi.fn().mockResolvedValue('Test match context'),
  getComprehensiveTeamStats: vi.fn().mockResolvedValue(null),
}));

// Import after mocking
import { POST } from '@/app/api/predict/route';

describe('POST /api/predict', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockRequest(body: Record<string, unknown>, ip = '127.0.0.1') {
    return {
      json: async () => body,
      headers: {
        get: (key: string) => {
          if (key === 'x-forwarded-for') return ip;
          if (key === 'x-real-ip') return null;
          return null;
        },
      },
    } as unknown as NextRequest;
  }

  it('should return 400 when teams are missing', async () => {
    const request = createMockRequest({ homeTeam: 'Brasil' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Selecciona');
  });

  it('should return 400 when teams are the same', async () => {
    const request = createMockRequest({ homeTeam: 'Brasil', awayTeam: 'Brasil' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('diferentes');
  });

  it('should return 200 with valid prediction', async () => {
    const request = createMockRequest({ homeTeam: 'Brasil', awayTeam: 'Argentina' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.prediction).toBeDefined();
    expect(data.prediction.homeWin).toBeDefined();
    expect(typeof data.prediction.homeWin).toBe('number');
    expect(data.prediction.homeWin).toBeGreaterThanOrEqual(0);
    expect(data.prediction.homeWin).toBeLessThanOrEqual(100);
    expect(data.prediction.analysis).toBeDefined();
    expect(typeof data.prediction.analysis).toBe('string');
  });

  it('should include timestamp in response', async () => {
    const request = createMockRequest({ homeTeam: 'Brasil', awayTeam: 'Argentina' });
    const response = await POST(request);
    const data = await response.json();

    expect(data.timestamp).toBeDefined();
    expect(new Date(data.timestamp).getTime()).not.toBeNaN();
  });

  it('should return 429 when rate limit exceeded', async () => {
    // Send 11 requests rapidly from the same IP (limit is 10/min)
    const ip = 'rate-limited-ip';
    for (let i = 0; i < 10; i++) {
      const request = createMockRequest(
        { homeTeam: 'Brasil', awayTeam: `Team${i}` },
        ip
      );
      await POST(request);
    }

    // 11th request should be rate limited
    const request = createMockRequest(
      { homeTeam: 'Brasil', awayTeam: 'Overflow' },
      ip
    );
    const response = await POST(request);

    expect(response.status).toBe(429);
  });
});
