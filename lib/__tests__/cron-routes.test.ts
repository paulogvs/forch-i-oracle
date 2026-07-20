// FORCH.i ORACLE — Cron Job API Route Tests
// Tests for /api/cron/ingest, /api/cron/recalculate, /api/cron/simulate, /api/cron/status

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import type { IDataLayer } from '@/lib/data-layer/interface';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/cron-auth', () => ({
  validateCronAuth: vi.fn(),
}));

vi.mock('@/lib/data-layer', () => ({
  getDataLayerAsync: vi.fn(),
}));

vi.mock('@/lib/hardcoded-results', () => ({
  HARDCODED_RESULTS: [],
}));

vi.mock('@/lib/matches', () => ({
  ALL_MATCHES: [],
}));

vi.mock('@/lib/ensemble-engine', () => ({
  calculateEnsemblePrediction: vi.fn(),
}));

vi.mock('@/lib/prediction-store', () => ({
  addMatchResult: vi.fn(),
}));

vi.mock('@/lib/tournament-sim', () => ({
  simulateTournamentMulti: vi.fn(),
}));

vi.mock('@/lib/tournament-results', () => ({
  saveBracketAndPredictions: vi.fn(),
}));

// ─── Imports (after mocks) ─────────────────────────────────────────────────

import { validateCronAuth } from '@/lib/cron-auth';
import { getDataLayerAsync } from '@/lib/data-layer';
import { HARDCODED_RESULTS } from '@/lib/hardcoded-results';
import { ALL_MATCHES } from '@/lib/matches';
import { calculateEnsemblePrediction } from '@/lib/ensemble-engine';
import { addMatchResult } from '@/lib/prediction-store';
import { simulateTournamentMulti } from '@/lib/tournament-sim';
import { saveBracketAndPredictions } from '@/lib/tournament-results';

// ─── Helpers ────────────────────────────────────────────────────────────────

function mockRequest(path = '/api/cron/ingest', headers: Record<string, string> = {}) {
  return new Request(`http://localhost:3000${path}`, { headers }) as unknown as Request;
}

function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function createMockDataLayer(overrides: Partial<IDataLayer> = {}): IDataLayer {
  return {
    getAllTeams: vi.fn().mockResolvedValue([{ id: 'bra', eloRating: 1800 }]),
    getMatchResults: vi.fn().mockResolvedValue([]),
    getUpcomingMatches: vi.fn().mockResolvedValue([]),
    getMatch: vi.fn().mockResolvedValue(null),
    getTeam: vi.fn().mockResolvedValue({ eloRating: 1500 }),
    getTeamForm: vi.fn().mockResolvedValue(null),
    savePrediction: vi.fn().mockResolvedValue({ id: 'pred-1', predictedAt: new Date().toISOString() }),
    saveTeamForm: vi.fn().mockResolvedValue({ id: 'form-1', updatedAt: new Date().toISOString() }),
    submitMatchResult: vi.fn().mockResolvedValue(undefined),
    updateCronStatus: vi.fn().mockResolvedValue(undefined),
    getCronStatus: vi.fn().mockResolvedValue(null),
    saveTournamentProbs: vi.fn().mockResolvedValue([]),
    setKeyValue: vi.fn().mockResolvedValue(undefined),
    getKeyValue: vi.fn().mockResolvedValue(null),
    ...overrides,
  } as unknown as IDataLayer;
}

function ensembleResult(overrides: Record<string, unknown> = {}) {
  return {
    homeWin: 45,
    draw: 25,
    awayWin: 30,
    predictedScoreHome: 2,
    predictedScoreAway: 1,
    homeExpectedGoals: 1.8,
    awayExpectedGoals: 1.2,
    over25Probability: 62,
    bttsProbability: 55,
    confidence: 'high',
    confidenceScore: 82,
    keyFactors: ['Home advantage', 'Strong attack'],
    topScores: [{ score: '2-1', prob: 15 }],
    agreement: { agreementScore: 0.85 },
    models: {
      dynamic: { hasRealData: true },
      eloPoisson: {
        homeAttack: 1.5,
        homeDefense: 0.8,
        homeMidfield: 1.2,
        awayAttack: 1.1,
        awayDefense: 0.9,
        awayMidfield: 1.0,
        homeElo: 1800,
        awayElo: 1600,
      },
    },
    ...overrides,
  };
}

function simulationResult(overrides: Record<string, unknown> = {}) {
  return {
    totalSims: 5000,
    top8: [
      { team: 'bra', pct: 12.5, wins: 625 },
      { team: 'arg', pct: 11.2, wins: 560 },
    ],
    bracket: { round16: [], quarterfinals: [], semifinals: [], final: {} },
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('Cron Job API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (validateCronAuth as ReturnType<typeof vi.fn>).mockReturnValue(null);
  });

  // ─── /api/cron/ingest ───────────────────────────────────────────────────

  describe('GET /api/cron/ingest', () => {
    let GET: typeof import('@/app/api/cron/ingest/route').GET;

    beforeEach(async () => {
      // Re-import to get a fresh module each time
      const mod = await import('@/app/api/cron/ingest/route');
      GET = mod.GET;
    });

    it('returns 401 when auth fails', async () => {
      (validateCronAuth as ReturnType<typeof vi.fn>).mockReturnValue(unauthorizedResponse());
      const res = await GET(mockRequest('/api/cron/ingest'));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 200 with success=true when authorized and no results', async () => {
      const db = createMockDataLayer();
      (getDataLayerAsync as ReturnType<typeof vi.fn>).mockResolvedValue(db);

      const res = await GET(mockRequest('/api/cron/ingest'));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.resultsIngested).toBe(0);
    });

    it('returns resultsIngested count', async () => {
      const mockResults = [
        { matchId: 'M01', homeScore: 2, awayScore: 1 },
      ];
      vi.mocked(HARDCODED_RESULTS).length = 0;
      // Override via Object.defineProperty trick
      Object.defineProperty(HARDCODED_RESULTS, 'length', { value: 1 });
      // We need to actually populate HARDCODED_RESULTS — use the module mock
      const hardcodedMod = await import('@/lib/hardcoded-results');
      (hardcodedMod.HARDCODED_RESULTS as any[]).splice(0, hardcodedMod.HARDCODED_RESULTS.length, ...mockResults);

      const allMatchesMod = await import('@/lib/matches');
      (allMatchesMod.ALL_MATCHES as any[]).splice(0, allMatchesMod.ALL_MATCHES.length, {
        id: 'M01',
        homeTeam: 'Brazil',
        awayTeam: 'Argentina',
      });

      const db = createMockDataLayer();
      (getDataLayerAsync as ReturnType<typeof vi.fn>).mockResolvedValue(db);

      const res = await GET(mockRequest('/api/cron/ingest'));
      const body = await res.json();

      expect(body.success).toBe(true);
      expect(body.resultsIngested).toBe(1);

      // Cleanup
      (hardcodedMod.HARDCODED_RESULTS as any[]).splice(0, hardcodedMod.HARDCODED_RESULTS.length);
      (allMatchesMod.ALL_MATCHES as any[]).splice(0, allMatchesMod.ALL_MATCHES.length);
    });

    it('returns diagnostics array', async () => {
      const db = createMockDataLayer();
      (getDataLayerAsync as ReturnType<typeof vi.fn>).mockResolvedValue(db);

      const res = await GET(mockRequest('/api/cron/ingest'));
      const body = await res.json();

      expect(body.diagnostics).toBeDefined();
      expect(Array.isArray(body.diagnostics)).toBe(true);
      expect(body.diagnostics.length).toBeGreaterThan(0);
    });

    it('handles empty HARDCODED_RESULTS gracefully', async () => {
      const db = createMockDataLayer();
      (getDataLayerAsync as ReturnType<typeof vi.fn>).mockResolvedValue(db);

      const res = await GET(mockRequest('/api/cron/ingest'));
      const body = await res.json();

      expect(body.success).toBe(true);
      expect(body.resultsIngested).toBe(0);
      expect(db.submitMatchResult).not.toHaveBeenCalled();
    });

    it('updates cron status after completion', async () => {
      const db = createMockDataLayer();
      (getDataLayerAsync as ReturnType<typeof vi.fn>).mockResolvedValue(db);

      await GET(mockRequest('/api/cron/ingest'));

      expect(db.updateCronStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          jobName: 'ingest',
          status: 'success',
        })
      );
    });

    it('deduplicates already-ingested results', async () => {
      const hardcodedMod = await import('@/lib/hardcoded-results');
      (hardcodedMod.HARDCODED_RESULTS as any[]).splice(0, hardcodedMod.HARDCODED_RESULTS.length, {
        matchId: 'M01',
        homeScore: 2,
        awayScore: 1,
      });

      const allMatchesMod = await import('@/lib/matches');
      (allMatchesMod.ALL_MATCHES as any[]).splice(0, allMatchesMod.ALL_MATCHES.length, {
        id: 'M01',
        homeTeam: 'Brazil',
        awayTeam: 'Argentina',
      });

      const db = createMockDataLayer({
        getMatchResults: vi.fn().mockResolvedValue([
          { matchId: 'M01', homeScore: 2, awayScore: 1, winner: 'Brazil' },
        ]),
      });
      (getDataLayerAsync as ReturnType<typeof vi.fn>).mockResolvedValue(db);

      const res = await GET(mockRequest('/api/cron/ingest'));
      const body = await res.json();

      expect(body.resultsIngested).toBe(0);
      expect(db.submitMatchResult).not.toHaveBeenCalled();

      (hardcodedMod.HARDCODED_RESULTS as any[]).splice(0, hardcodedMod.HARDCODED_RESULTS.length);
      (allMatchesMod.ALL_MATCHES as any[]).splice(0, allMatchesMod.ALL_MATCHES.length);
    });
  });

  describe('POST /api/cron/ingest', () => {
    it('returns 401 when auth fails', async () => {
      (validateCronAuth as ReturnType<typeof vi.fn>).mockReturnValue(unauthorizedResponse());
      const { POST } = await import('@/app/api/cron/ingest/route');
      const res = await POST(mockRequest('/api/cron/ingest'));
      expect(res.status).toBe(401);
    });

    it('returns 200 with success=true when authorized', async () => {
      const db = createMockDataLayer();
      (getDataLayerAsync as ReturnType<typeof vi.fn>).mockResolvedValue(db);
      const { POST } = await import('@/app/api/cron/ingest/route');
      const res = await POST(mockRequest('/api/cron/ingest'));
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  // ─── /api/cron/recalculate ──────────────────────────────────────────────

  describe('GET /api/cron/recalculate', () => {
    let GET: typeof import('@/app/api/cron/recalculate/route').GET;

    beforeEach(async () => {
      const mod = await import('@/app/api/cron/recalculate/route');
      GET = mod.GET;
    });

    it('returns 401 when auth fails', async () => {
      (validateCronAuth as ReturnType<typeof vi.fn>).mockReturnValue(unauthorizedResponse());
      const res = await GET(mockRequest('/api/cron/recalculate'));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 200 with success=true when authorized', async () => {
      const db = createMockDataLayer();
      (getDataLayerAsync as ReturnType<typeof vi.fn>).mockResolvedValue(db);
      (calculateEnsemblePrediction as ReturnType<typeof vi.fn>).mockReturnValue(ensembleResult());

      const res = await GET(mockRequest('/api/cron/recalculate'));
      const body = await res.json();

      expect(body.success).toBe(true);
      expect(body.matchesProcessed).toBe(0);
      expect(body.predictionsSaved).toBe(0);
    });

    it('returns matchesProcessed and predictionsSaved counts', async () => {
      const upcomingMatch = {
        id: 'M10',
        homeTeamId: 'bra',
        awayTeamId: 'arg',
        matchDate: '2026-06-15',
      };
      const db = createMockDataLayer({
        getUpcomingMatches: vi.fn().mockResolvedValue([upcomingMatch]),
        getMatch: vi.fn().mockResolvedValue(upcomingMatch),
      });
      (getDataLayerAsync as ReturnType<typeof vi.fn>).mockResolvedValue(db);
      (calculateEnsemblePrediction as ReturnType<typeof vi.fn>).mockReturnValue(ensembleResult());

      const res = await GET(mockRequest('/api/cron/recalculate'));
      const body = await res.json();

      expect(body.success).toBe(true);
      expect(body.matchesProcessed).toBe(1);
      expect(body.predictionsSaved).toBe(1);
      expect(db.savePrediction).toHaveBeenCalledOnce();
    });

    it('handles empty upcoming matches', async () => {
      const db = createMockDataLayer({
        getUpcomingMatches: vi.fn().mockResolvedValue([]),
      });
      (getDataLayerAsync as ReturnType<typeof vi.fn>).mockResolvedValue(db);

      const res = await GET(mockRequest('/api/cron/recalculate'));
      const body = await res.json();

      expect(body.success).toBe(true);
      expect(body.matchesProcessed).toBe(0);
      expect(body.predictionsSaved).toBe(0);
      expect(db.savePrediction).not.toHaveBeenCalled();
    });

    it('handles prediction errors for individual matches', async () => {
      const match1 = { id: 'M10', homeTeamId: 'bra', awayTeamId: 'arg', matchDate: '2026-06-15' };
      const match2 = { id: 'M11', homeTeamId: 'ger', awayTeamId: 'fra', matchDate: '2026-06-16' };
      const db = createMockDataLayer({
        getUpcomingMatches: vi.fn().mockResolvedValue([match1, match2]),
        getMatch: vi.fn().mockResolvedValue(match1),
      });
      (getDataLayerAsync as ReturnType<typeof vi.fn>).mockResolvedValue(db);

      (calculateEnsemblePrediction as ReturnType<typeof vi.fn>)
        .mockImplementationOnce(() => { throw new Error('Model failure'); })
        .mockReturnValueOnce(ensembleResult());

      const res = await GET(mockRequest('/api/cron/recalculate'));
      const body = await res.json();

      expect(body.success).toBe(true);
      expect(body.matchesProcessed).toBe(1);
      expect(body.predictionsSaved).toBe(1);
      expect(body.errors).toBeDefined();
      expect(body.errors!.length).toBe(1);
      expect(body.errors![0]).toContain('Model failure');
    });

    it('updates cron status after completion', async () => {
      const db = createMockDataLayer();
      (getDataLayerAsync as ReturnType<typeof vi.fn>).mockResolvedValue(db);

      await GET(mockRequest('/api/cron/recalculate'));

      expect(db.updateCronStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          jobName: 'recalculate',
          status: 'success',
        })
      );
    });

    it('feeds real results into prediction store before recalculating', async () => {
      const existingResults = [
        { matchId: 'M01', homeScore: 2, awayScore: 1, winner: 'bra' },
      ];
      const match = { id: 'M01', homeTeamId: 'bra', awayTeamId: 'arg', matchDate: '2026-06-15' };
      const db = createMockDataLayer({
        getMatchResults: vi.fn().mockResolvedValue(existingResults),
        getMatch: vi.fn().mockResolvedValue(match),
        getUpcomingMatches: vi.fn().mockResolvedValue([]),
      });
      (getDataLayerAsync as ReturnType<typeof vi.fn>).mockResolvedValue(db);

      await GET(mockRequest('/api/cron/recalculate'));

      expect(addMatchResult).toHaveBeenCalledWith(
        expect.objectContaining({
          homeTeam: 'bra',
          awayTeam: 'arg',
          homeGoals: 2,
          awayGoals: 1,
        })
      );
    });
  });

  // ─── /api/cron/simulate ─────────────────────────────────────────────────

  describe('GET /api/cron/simulate', () => {
    let GET: typeof import('@/app/api/cron/simulate/route').GET;

    beforeEach(async () => {
      const mod = await import('@/app/api/cron/simulate/route');
      GET = mod.GET;
      (simulateTournamentMulti as ReturnType<typeof vi.fn>).mockResolvedValue(simulationResult());
    });

    it('returns 401 when auth fails', async () => {
      (validateCronAuth as ReturnType<typeof vi.fn>).mockReturnValue(unauthorizedResponse());
      const res = await GET(mockRequest('/api/cron/simulate'));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 200 with success=true when authorized', async () => {
      const db = createMockDataLayer();
      (getDataLayerAsync as ReturnType<typeof vi.fn>).mockResolvedValue(db);

      const res = await GET(mockRequest('/api/cron/simulate'));
      const body = await res.json();

      expect(body.success).toBe(true);
      expect(body.simulationsCompleted).toBe(5000);
    });

    it('returns simulationsCompleted, teamsRanked, topTeam, topProb', async () => {
      const db = createMockDataLayer();
      (getDataLayerAsync as ReturnType<typeof vi.fn>).mockResolvedValue(db);

      const res = await GET(mockRequest('/api/cron/simulate'));
      const body = await res.json();

      expect(body.simulationsCompleted).toBe(5000);
      expect(body.teamsRanked).toBe(2);
      expect(body.topTeam).toBe('bra');
      expect(body.topProb).toBe(12.5);
    });

    it('returns top8 array', async () => {
      const db = createMockDataLayer();
      (getDataLayerAsync as ReturnType<typeof vi.fn>).mockResolvedValue(db);

      const res = await GET(mockRequest('/api/cron/simulate'));
      const body = await res.json();

      expect(Array.isArray(body.top8)).toBe(true);
      expect(body.top8.length).toBe(2);
      expect(body.top8[0].team).toBe('bra');
    });

    it('returns bracket object', async () => {
      const db = createMockDataLayer();
      (getDataLayerAsync as ReturnType<typeof vi.fn>).mockResolvedValue(db);

      const res = await GET(mockRequest('/api/cron/simulate'));
      const body = await res.json();

      expect(body.bracket).toBeDefined();
      expect(typeof body.bracket).toBe('object');
    });

    it('handles empty simulation results', async () => {
      (simulateTournamentMulti as ReturnType<typeof vi.fn>).mockResolvedValue(
        simulationResult({ totalSims: 5000, top8: [] })
      );
      const db = createMockDataLayer();
      (getDataLayerAsync as ReturnType<typeof vi.fn>).mockResolvedValue(db);

      const res = await GET(mockRequest('/api/cron/simulate'));
      const body = await res.json();

      expect(body.success).toBe(true);
      expect(body.topTeam).toBe('');
      expect(body.topProb).toBe(0);
    });

    it('handles simulation errors', async () => {
      (simulateTournamentMulti as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Simulation crashed')
      );
      const db = createMockDataLayer();
      (getDataLayerAsync as ReturnType<typeof vi.fn>).mockResolvedValue(db);

      const res = await GET(mockRequest('/api/cron/simulate'));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toContain('Simulation crashed');
    });

    it('updates cron status after completion', async () => {
      const db = createMockDataLayer();
      (getDataLayerAsync as ReturnType<typeof vi.fn>).mockResolvedValue(db);

      await GET(mockRequest('/api/cron/simulate'));

      expect(db.updateCronStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          jobName: 'simulate',
          status: 'success',
        })
      );
    });

    it('saves tournament probabilities to data layer', async () => {
      const db = createMockDataLayer();
      (getDataLayerAsync as ReturnType<typeof vi.fn>).mockResolvedValue(db);

      await GET(mockRequest('/api/cron/simulate'));

      expect(db.saveTournamentProbs).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ teamId: 'bra', championProb: 12.5 }),
        ])
      );
    });

    it('saves bracket and predictions', async () => {
      const db = createMockDataLayer();
      (getDataLayerAsync as ReturnType<typeof vi.fn>).mockResolvedValue(db);

      await GET(mockRequest('/api/cron/simulate'));

      expect(saveBracketAndPredictions).toHaveBeenCalledWith(
        db,
        expect.any(Object)
      );
    });

    it('saves consensusBracketHash to prevent redundant re-computation', async () => {
      const db = createMockDataLayer();
      (getDataLayerAsync as ReturnType<typeof vi.fn>).mockResolvedValue(db);

      await GET(mockRequest('/api/cron/simulate'));

      expect(db.setKeyValue).toHaveBeenCalledWith(
        'consensusBracketHash',
        expect.any(String)
      );
    });

    it('passes real results to simulation', async () => {
      const realResults = [
        { matchId: 'M01', homeScore: 2, awayScore: 1, winner: 'bra' },
      ];
      const db = createMockDataLayer({
        getMatchResults: vi.fn().mockResolvedValue(realResults),
      });
      (getDataLayerAsync as ReturnType<typeof vi.fn>).mockResolvedValue(db);

      await GET(mockRequest('/api/cron/simulate'));

      expect(simulateTournamentMulti).toHaveBeenCalledWith(
        5000,
        expect.arrayContaining([
          expect.objectContaining({ matchId: 'M01', homeScore: 2, awayScore: 1 }),
        ]),
        expect.any(Function)
      );
    });

    it('updates cron status on error', async () => {
      (simulateTournamentMulti as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Crash')
      );
      const db = createMockDataLayer();
      (getDataLayerAsync as ReturnType<typeof vi.fn>).mockResolvedValue(db);

      await GET(mockRequest('/api/cron/simulate'));

      expect(db.updateCronStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          jobName: 'simulate',
          status: 'failed',
          error: 'Crash',
        })
      );
    });
  });

  // ─── /api/cron/status ───────────────────────────────────────────────────

  describe('GET /api/cron/status', () => {
    let GET: typeof import('@/app/api/cron/status/route').GET;

    beforeEach(async () => {
      const mod = await import('@/app/api/cron/status/route');
      GET = mod.GET;
    });

    it('returns 401 when auth fails', async () => {
      (validateCronAuth as ReturnType<typeof vi.fn>).mockReturnValue(unauthorizedResponse());
      const res = await GET(mockRequest('/api/cron/status'));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 200 with success=true when authorized', async () => {
      const db = createMockDataLayer();
      (getDataLayerAsync as ReturnType<typeof vi.fn>).mockResolvedValue(db);

      const res = await GET(mockRequest('/api/cron/status'));
      const body = await res.json();

      expect(body.success).toBe(true);
    });

    it('returns jobs object with ingest, recalculate, simulate statuses', async () => {
      const db = createMockDataLayer({
        getCronStatus: vi.fn().mockImplementation((jobName: string) =>
          Promise.resolve({
            jobName,
            lastRun: '2026-06-15T12:00:00Z',
            status: 'success',
            durationMs: 1500,
            recordsProcessed: 10,
          })
        ),
      });
      (getDataLayerAsync as ReturnType<typeof vi.fn>).mockResolvedValue(db);

      const res = await GET(mockRequest('/api/cron/status'));
      const body = await res.json();

      expect(body.jobs).toBeDefined();
      expect(body.jobs.ingest).toBeDefined();
      expect(body.jobs.recalculate).toBeDefined();
      expect(body.jobs.simulate).toBeDefined();
      expect(body.jobs.ingest.status).toBe('success');
      expect(body.jobs.recalculate.status).toBe('success');
      expect(body.jobs.simulate.status).toBe('success');
    });

    it('handles never_run status (no previous runs)', async () => {
      const db = createMockDataLayer({
        getCronStatus: vi.fn().mockResolvedValue(null),
      });
      (getDataLayerAsync as ReturnType<typeof vi.fn>).mockResolvedValue(db);

      const res = await GET(mockRequest('/api/cron/status'));
      const body = await res.json();

      expect(body.success).toBe(true);
      expect(body.jobs.ingest).toEqual({ jobName: 'ingest', status: 'never_run' });
      expect(body.jobs.recalculate).toEqual({ jobName: 'recalculate', status: 'never_run' });
      expect(body.jobs.simulate).toEqual({ jobName: 'simulate', status: 'never_run' });
    });

    it('queries cron status for all three job names', async () => {
      const db = createMockDataLayer();
      (getDataLayerAsync as ReturnType<typeof vi.fn>).mockResolvedValue(db);

      await GET(mockRequest('/api/cron/status'));

      expect(db.getCronStatus).toHaveBeenCalledWith('ingest');
      expect(db.getCronStatus).toHaveBeenCalledWith('recalculate');
      expect(db.getCronStatus).toHaveBeenCalledWith('simulate');
      expect(db.getCronStatus).toHaveBeenCalledTimes(3);
    });

    it('does not update cron status (read-only endpoint)', async () => {
      const db = createMockDataLayer();
      (getDataLayerAsync as ReturnType<typeof vi.fn>).mockResolvedValue(db);

      await GET(mockRequest('/api/cron/status'));

      expect(db.updateCronStatus).not.toHaveBeenCalled();
    });
  });
});
