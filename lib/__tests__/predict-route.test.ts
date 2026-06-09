import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the modules that make external calls
vi.mock('@/lib/gemini', () => ({
  getPrediction: vi.fn().mockResolvedValue({
    homeWin: 60,
    draw: 25,
    awayWin: 15,
    analysis: 'Test analysis from Gemini',
  }),
}));

vi.mock('@/lib/football-api', () => ({
  getMatchContext: vi.fn().mockResolvedValue('Test match context'),
}));

// Import after mocking
import { POST } from '@/app/api/predict/route';
import { getPrediction } from '@/lib/gemini';

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
    } as unknown as Request;
  }

  it('should return 400 when teams are missing', async () => {
    const request = createMockRequest({ homeTeam: 'Brasil' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('required');
  });

  it('should return 400 when teams are the same', async () => {
    const request = createMockRequest({ homeTeam: 'Brasil', awayTeam: 'Brasil' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('different');
  });

  it('should return 200 with valid prediction', async () => {
    const request = createMockRequest({ homeTeam: 'Brasil', awayTeam: 'Argentina' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.prediction.homeWin).toBe(60);
    expect(data.prediction.draw).toBe(25);
    expect(data.prediction.awayWin).toBe(15);
    expect(data.prediction.analysis).toBe('Test analysis from Gemini');
  });

  it('should call getPrediction with correct parameters', async () => {
    const context = {
      id: 'A1',
      group: 'A',
      matchday: 1,
      date: '2026-06-11',
      time: '02:00',
      venue: 'Estadio Azteca',
      city: 'Mexico City',
    };
    const request = createMockRequest({
      homeTeam: 'México',
      awayTeam: 'Sudáfrica',
      matchContext: context,
    });

    await POST(request);

    expect(getPrediction).toHaveBeenCalledWith(
      'México',
      'Sudáfrica',
      expect.any(String),
      context
    );
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
