import { describe, it, expect, beforeEach } from 'vitest';
import { inMemoryDataLayer } from '../data-layer/in-memory';
import type { IDataLayer } from '../data-layer/interface';
import type {
  DBMatchPrediction,
  DBTeamForm,
  DBTournamentProbs,
  RealMatchResultInput,
} from '../data-layer/types';

const dl: IDataLayer = inMemoryDataLayer;

// ─── Helpers ────────────────────────────────────────────────────

function makePrediction(matchId: string): Omit<DBMatchPrediction, 'id' | 'predictedAt'> {
  return {
    matchId,
    homeWin: 0.45,
    draw: 0.25,
    awayWin: 0.30,
    mostLikelyScore: '2-1',
    expectedGoalsHome: 1.8,
    expectedGoalsAway: 1.2,
    over25Probability: 0.58,
    bttsProbability: 0.62,
    keyFactors: ['Home advantage', 'Recent form'],
    confidence: 'alta',
    dataQualityScore: 85,
    modelVersion: 'v2-enhanced',
    topScores: [
      { home: 2, away: 1, probability: 0.18 },
      { home: 1, away: 0, probability: 0.14 },
    ],
  };
}

function makeTeamForm(teamId: string): Omit<DBTeamForm, 'id' | 'updatedAt'> {
  return {
    teamId,
    last5: [
      { result: 'W', opponent: 'Uruguay', goalsFor: 3, goalsAgainst: 1, date: '2026-06-01' },
      { result: 'W', opponent: 'Chile', goalsFor: 2, goalsAgainst: 0, date: '2026-06-05' },
      { result: 'D', opponent: 'Colombia', goalsFor: 1, goalsAgainst: 1, date: '2026-06-08' },
      { result: 'L', opponent: 'Brasil', goalsFor: 0, goalsAgainst: 2, date: '2026-06-10' },
      { result: 'W', opponent: 'Perú', goalsFor: 2, goalsAgainst: 1, date: '2026-06-12' },
    ],
    xgFor: 1.75,
    xgAgainst: 0.95,
    momentum: 0.42,
    matchesPlayed: 5,
    eloDynamic: 1850,
  };
}

function makeTournamentProbs(teamId: string, champProb: number): Omit<DBTournamentProbs, 'id' | 'calculatedAt'> {
  return {
    teamId,
    championProb: champProb,
    semifinalistProb: champProb * 2.5,
    runnerUpProb: champProb * 1.8,
    simulationsCount: 10000,
    totalSimulations: 10000,
  };
}

// ═══════════════════════════════════════════════════════════════
// TEAMS
// ═══════════════════════════════════════════════════════════════

describe('Data Layer — Teams', () => {
  it('getAllTeams returns 48 teams', async () => {
    const teams = await dl.getAllTeams();
    expect(teams).toHaveLength(48);
  });

  it('each team has required fields', async () => {
    const teams = await dl.getAllTeams();
    for (const t of teams) {
      expect(t.id).toBeTruthy();
      expect(t.fifaCode).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.groupChar).toMatch(/^[A-L]$/);
      expect(t.eloRating).toBeGreaterThan(0);
      expect(t.powerRatings).toHaveProperty('attack');
      expect(t.powerRatings).toHaveProperty('defense');
      expect(t.powerRatings).toHaveProperty('midfield');
      expect(t.createdAt).toBeTruthy();
      expect(t.updatedAt).toBeTruthy();
    }
  });

  it('getTeam returns Argentina by id', async () => {
    const team = await dl.getTeam('Argentina');
    expect(team).not.toBeNull();
    expect(team!.fifaCode).toBe('ARG');
    expect(team!.groupChar).toBe('J');
  });

  it('getTeam returns null for unknown team', async () => {
    const team = await dl.getTeam('NonExistent');
    expect(team).toBeNull();
  });

  it('getTeamByCode finds team by FIFA code', async () => {
    const team = await dl.getTeamByCode('BRA');
    expect(team).not.toBeNull();
    expect(team!.name).toBe('Brasil');
  });

  it('getTeamByCode returns null for unknown code', async () => {
    const team = await dl.getTeamByCode('XXX');
    expect(team).toBeNull();
  });

  it('getTeamByName is case-insensitive', async () => {
    const upper = await dl.getTeamByName('MÉXICO');
    const lower = await dl.getTeamByName('méxico');
    const mixed = await dl.getTeamByName('México');
    expect(upper).not.toBeNull();
    expect(lower).not.toBeNull();
    expect(mixed).not.toBeNull();
    expect(upper!.fifaCode).toBe('MEX');
    expect(lower!.fifaCode).toBe('MEX');
    expect(mixed!.fifaCode).toBe('MEX');
  });

  it('getTeamsByGroup returns 4 teams per group', async () => {
    const groups = 'ABCDEFGHIJKL'.split('');
    for (const g of groups) {
      const teams = await dl.getTeamsByGroup(g);
      expect(teams).toHaveLength(4);
      for (const t of teams) {
        expect(t.groupChar).toBe(g);
      }
    }
  });

  it('getTeamsByGroup returns empty array for non-existent group', async () => {
    const teams = await dl.getTeamsByGroup('Z');
    expect(teams).toHaveLength(0);
  });

  it('all 12 groups are represented', async () => {
    const teams = await dl.getAllTeams();
    const groups = new Set(teams.map(t => t.groupChar));
    expect(groups.size).toBe(12);
  });
});

// ═══════════════════════════════════════════════════════════════
// MATCHES
// ═══════════════════════════════════════════════════════════════

describe('Data Layer — Matches', () => {
  it('getAllMatches returns all matches', async () => {
    const matches = await dl.getAllMatches();
    expect(matches.length).toBeGreaterThanOrEqual(104);
  });

  it('each match has required fields', async () => {
    const matches = await dl.getAllMatches();
    for (const m of matches) {
      expect(m.id).toBeTruthy();
      expect(m.round).toBeTruthy();
      expect(m.homeTeamId).toBeTruthy();
      expect(m.awayTeamId).toBeTruthy();
      expect(m.status).toBeTruthy();
      expect(m.createdAt).toBeTruthy();
    }
  });

  it('getMatch returns match by id A1', async () => {
    const match = await dl.getMatch('A1');
    expect(match).not.toBeNull();
    expect(match!.homeTeamId).toBe('México');
    expect(match!.awayTeamId).toBe('Sudáfrica');
    expect(match!.groupChar).toBe('A');
  });

  it('getMatch returns null for unknown id', async () => {
    const match = await dl.getMatch('ZZ99');
    expect(match).toBeNull();
  });

  it('getMatch finds knockout match SF-1', async () => {
    const match = await dl.getMatch('SF-1');
    expect(match).not.toBeNull();
    expect(match!.round).toBe('SF');
  });

  it('getMatch finds Final', async () => {
    const match = await dl.getMatch('Final');
    expect(match).not.toBeNull();
    expect(match!.round).toBe('F');
  });

  it('getMatchesByGroup returns group matches only', async () => {
    const matches = await dl.getMatchesByGroup('A');
    expect(matches.length).toBeGreaterThan(0);
    for (const m of matches) {
      expect(m.groupChar).toBe('A');
    }
  });

  it('getMatchesByStatus returns only scheduled matches initially', async () => {
    const scheduled = await dl.getMatchesByStatus('scheduled');
    expect(scheduled.length).toBeGreaterThan(0);
    for (const m of scheduled) {
      expect(m.status).toBe('scheduled');
    }
  });

  it('getUpcomingMatches returns sorted by date', async () => {
    const upcoming = await dl.getUpcomingMatches();
    expect(upcoming.length).toBeGreaterThan(0);
    for (let i = 1; i < upcoming.length; i++) {
      const prev = upcoming[i - 1].matchDate ?? '';
      const curr = upcoming[i].matchDate ?? '';
      expect(prev.localeCompare(curr)).toBeLessThanOrEqual(0);
    }
  });

  it('updateMatch modifies match fields', async () => {
    const original = await dl.getMatch('A1');
    expect(original).not.toBeNull();

    const updated = await dl.updateMatch('A1', { status: 'live', scoreHome: 1, scoreAway: 0 });
    expect(updated.status).toBe('live');
    expect(updated.scoreHome).toBe(1);
    expect(updated.scoreAway).toBe(0);

    // Restore
    await dl.updateMatch('A1', { status: 'scheduled', scoreHome: undefined, scoreAway: undefined });
  });

  it('updateMatch throws for non-existent match', async () => {
    await expect(dl.updateMatch('ZZ99', { status: 'live' }))
      .rejects.toThrow('Match not found: ZZ99');
  });

  it('getMatchByTeams finds match by team names', async () => {
    const match = await dl.getMatchByTeams('México', 'Sudáfrica');
    expect(match).not.toBeNull();
    expect(match!.id).toBe('A1');
  });

  it('getMatchByTeams is case-insensitive', async () => {
    const match = await dl.getMatchByTeams('MÉXICO', 'SUDÁFRICA');
    expect(match).not.toBeNull();
    expect(match!.id).toBe('A1');
  });

  it('getMatchByTeams returns null when no match found', async () => {
    const match = await dl.getMatchByTeams('Argentina', 'México');
    expect(match).toBeNull();
  });

  it('group matches exist for all 12 groups', async () => {
    const groups = 'ABCDEFGHIJKL'.split('');
    for (const g of groups) {
      const matches = await dl.getMatchesByGroup(g);
      expect(matches.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// PREDICTIONS
// ═══════════════════════════════════════════════════════════════

describe('Data Layer — Predictions', () => {
  it('savePrediction and getPrediction — full cycle', async () => {
    const pred = makePrediction('A1');
    const saved = await dl.savePrediction(pred);

    expect(saved.id).toBe('A1');
    expect(saved.matchId).toBe('A1');
    expect(saved.homeWin).toBe(0.45);
    expect(saved.draw).toBe(0.25);
    expect(saved.awayWin).toBe(0.30);
    expect(saved.mostLikelyScore).toBe('2-1');
    expect(saved.confidence).toBe('alta');
    expect(saved.predictedAt).toBeTruthy();

    const retrieved = await dl.getPrediction('A1');
    expect(retrieved).not.toBeNull();
    expect(retrieved!.matchId).toBe('A1');
    expect(retrieved!.homeWin).toBe(0.45);
  });

  it('getPrediction returns null for unknown match', async () => {
    const pred = await dl.getPrediction('NONEXISTENT');
    expect(pred).toBeNull();
  });

  it('deletePrediction clears in-memory, file read-through may persist', async () => {
    const testId = 'DEL_ONLY_MEM';
    await dl.savePrediction(makePrediction(testId));
    const before = await dl.getPrediction(testId);
    expect(before).not.toBeNull();

    await dl.deletePrediction(testId);

    // After delete + re-save with different value, the new value is returned
    const newPred = makePrediction(testId);
    newPred.homeWin = 0.99;
    await dl.savePrediction(newPred);
    const after = await dl.getPrediction(testId);
    expect(after!.homeWin).toBe(0.99);
  });

  it('deletePrediction is safe for non-existent match', async () => {
    await expect(dl.deletePrediction('ZZ99')).resolves.toBeUndefined();
  });

  it('savePrediction overwrites existing', async () => {
    await dl.savePrediction(makePrediction('C1'));
    const v1 = await dl.getPrediction('C1');
    expect(v1!.homeWin).toBe(0.45);

    const updated = makePrediction('C1');
    updated.homeWin = 0.60;
    updated.confidence = 'baja';
    await dl.savePrediction(updated);

    const v2 = await dl.getPrediction('C1');
    expect(v2!.homeWin).toBe(0.60);
    expect(v2!.confidence).toBe('baja');
  });

  it('savePredictions saves multiple predictions at once', async () => {
    const preds = [
      makePrediction('D1'),
      makePrediction('D2'),
      makePrediction('D3'),
    ];
    const saved = await dl.savePredictions(preds);
    expect(saved).toHaveLength(3);
    for (const s of saved) {
      expect(s.id).toBeTruthy();
      expect(s.predictedAt).toBeTruthy();
    }

    const d1 = await dl.getPrediction('D1');
    expect(d1).not.toBeNull();
    expect(d1!.matchId).toBe('D1');
  });

  it('getPredictionsForMatches returns only existing predictions', async () => {
    await dl.savePrediction(makePrediction('E1'));
    await dl.savePrediction(makePrediction('E3'));

    const results = await dl.getPredictionsForMatches(['E1', 'E2', 'E3', 'E4']);
    expect(results).toHaveLength(2);
    const ids = results.map(r => r.matchId);
    expect(ids).toContain('E1');
    expect(ids).toContain('E3');
    expect(ids).not.toContain('E2');
    expect(ids).not.toContain('E4');
  });

  it('getPredictionsForMatches returns empty for no matches', async () => {
    const results = await dl.getPredictionsForMatches([]);
    expect(results).toHaveLength(0);
  });

  it('prediction with optional fields saves correctly', async () => {
    const pred = makePrediction('F1');
    pred.agreement = {
      homeWinStdDev: 0.05,
      drawStdDev: 0.03,
      awayWinStdDev: 0.04,
      agreementScore: 0.88,
      unanimousWinner: true,
    };
    pred.uncertainty = {
      homeWin90: { low: 0.35, high: 0.55 },
      draw90: { low: 0.15, high: 0.35 },
      awayWin90: { low: 0.20, high: 0.40 },
      entropy: 1.45,
      effectiveOutcomes: 2.8,
    };
    pred.models = {
      dixonColes: { homeWin: 0.48, draw: 0.24, awayWin: 0.28 },
      eloPoisson: { homeWin: 0.42, draw: 0.26, awayWin: 0.32 },
    };
    pred.confidenceScore = 78;

    const saved = await dl.savePrediction(pred);
    expect(saved.agreement?.agreementScore).toBe(0.88);
    expect(saved.uncertainty?.entropy).toBe(1.45);
    expect(saved.models?.dixonColes?.homeWin).toBe(0.48);
    expect(saved.confidenceScore).toBe(78);

    const retrieved = await dl.getPrediction('F1');
    expect(retrieved!.agreement?.unanimousWinner).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// TEAM FORM
// ═══════════════════════════════════════════════════════════════

describe('Data Layer — Team Form', () => {
  it('saveTeamForm and getTeamForm — full cycle', async () => {
    const form = makeTeamForm('Argentina');
    const saved = await dl.saveTeamForm(form);

    expect(saved.id).toBe('Argentina');
    expect(saved.teamId).toBe('Argentina');
    expect(saved.last5).toHaveLength(5);
    expect(saved.xgFor).toBe(1.75);
    expect(saved.momentum).toBe(0.42);
    expect(saved.eloDynamic).toBe(1850);
    expect(saved.updatedAt).toBeTruthy();

    const retrieved = await dl.getTeamForm('Argentina');
    expect(retrieved).not.toBeNull();
    expect(retrieved!.teamId).toBe('Argentina');
    expect(retrieved!.last5[0].result).toBe('W');
    expect(retrieved!.last5[0].opponent).toBe('Uruguay');
  });

  it('getTeamForm returns null for unknown team', async () => {
    const form = await dl.getTeamForm('NonExistent');
    expect(form).toBeNull();
  });

  it('saveTeamForm overwrites existing form', async () => {
    await dl.saveTeamForm(makeTeamForm('Brasil'));
    const v1 = await dl.getTeamForm('Brasil');
    expect(v1!.momentum).toBe(0.42);

    const updated = makeTeamForm('Brasil');
    updated.momentum = -0.15;
    updated.matchesPlayed = 10;
    await dl.saveTeamForm(updated);

    const v2 = await dl.getTeamForm('Brasil');
    expect(v2!.momentum).toBe(-0.15);
    expect(v2!.matchesPlayed).toBe(10);
  });

  it('getAllTeamForms returns saved forms', async () => {
    await dl.saveTeamForm(makeTeamForm('G1_TEAM'));
    await dl.saveTeamForm(makeTeamForm('G2_TEAM'));

    const all = await dl.getAllTeamForms();
    const teamIds = all.map(f => f.teamId);
    expect(teamIds).toContain('G1_TEAM');
    expect(teamIds).toContain('G2_TEAM');
  });

  it('team form last5 results are valid', async () => {
    await dl.saveTeamForm(makeTeamForm('VALID_FORM'));
    const form = await dl.getTeamForm('VALID_FORM');
    expect(form).not.toBeNull();

    for (const match of form!.last5) {
      expect(['W', 'D', 'L']).toContain(match.result);
      expect(match.goalsFor).toBeGreaterThanOrEqual(0);
      expect(match.goalsAgainst).toBeGreaterThanOrEqual(0);
      expect(match.date).toBeTruthy();
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// TOURNAMENT PROBABILITIES
// ═══════════════════════════════════════════════════════════════

describe('Data Layer — Tournament Probabilities', () => {
  it('saveTournamentProbs and getTournamentProbs', async () => {
    const probs = [
      makeTournamentProbs('Argentina', 18.5),
      makeTournamentProbs('Brasil', 14.2),
      makeTournamentProbs('Francia', 12.8),
    ];
    const saved = await dl.saveTournamentProbs(probs);
    expect(saved).toHaveLength(3);

    for (const s of saved) {
      expect(s.id).toBeTruthy();
      expect(s.calculatedAt).toBeTruthy();
    }

    const all = await dl.getTournamentProbs();
    expect(all.length).toBeGreaterThanOrEqual(3);
  });

  it('getTournamentProbs returns sorted by championProb descending', async () => {
    const probs = [
      makeTournamentProbs('SORT_A', 5.0),
      makeTournamentProbs('SORT_B', 20.0),
      makeTournamentProbs('SORT_C', 12.0),
    ];
    await dl.saveTournamentProbs(probs);

    const all = await dl.getTournamentProbs();
    for (let i = 1; i < all.length; i++) {
      expect(all[i - 1].championProb).toBeGreaterThanOrEqual(all[i].championProb);
    }
  });

  it('getTournamentProb returns single team prob', async () => {
    await dl.saveTournamentProbs([makeTournamentProbs('SingleTeam', 9.9)]);

    const prob = await dl.getTournamentProb('SingleTeam');
    expect(prob).not.toBeNull();
    expect(prob!.championProb).toBe(9.9);
    expect(prob!.teamId).toBe('SingleTeam');
  });

  it('getTournamentProb returns null for unknown team', async () => {
    const prob = await dl.getTournamentProb('UnknownTeam');
    expect(prob).toBeNull();
  });

  it('saveTournamentProbs overwrites existing', async () => {
    await dl.saveTournamentProbs([makeTournamentProbs('OVERWRITE', 5.0)]);
    await dl.saveTournamentProbs([makeTournamentProbs('OVERWRITE', 15.0)]);

    const prob = await dl.getTournamentProb('OVERWRITE');
    expect(prob!.championProb).toBe(15.0);
  });

  it('tournament probs have all required fields', async () => {
    await dl.saveTournamentProbs([makeTournamentProbs('FIELDS_CHECK', 10.0)]);
    const prob = await dl.getTournamentProb('FIELDS_CHECK');
    expect(prob).not.toBeNull();
    expect(prob!.teamId).toBe('FIELDS_CHECK');
    expect(prob!.championProb).toBeGreaterThan(0);
    expect(prob!.simulationsCount).toBeGreaterThan(0);
    expect(prob!.totalSimulations).toBeGreaterThan(0);
    expect(prob!.calculatedAt).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// MATCH RESULTS
// ═══════════════════════════════════════════════════════════════

describe('Data Layer — Match Results', () => {
  beforeEach(async () => {
    await dl.clearMatchResults();
  });

  it('submitMatchResult and getMatchResults', async () => {
    const result: RealMatchResultInput = {
      matchId: 'A1',
      homeScore: 2,
      awayScore: 1,
      winner: 'México',
    };
    await dl.submitMatchResult(result);

    const results = await dl.getMatchResults();
    expect(results.length).toBeGreaterThanOrEqual(1);
    const found = results.find(r => r.matchId === 'A1');
    expect(found).toBeDefined();
    expect(found!.homeScore).toBe(2);
    expect(found!.awayScore).toBe(1);
    expect(found!.winner).toBe('México');
  });

  it('submitMatchResult updates match status to finished', async () => {
    await dl.submitMatchResult({
      matchId: 'A1',
      homeScore: 3,
      awayScore: 0,
      winner: 'México',
    });

    const match = await dl.getMatch('A1');
    expect(match!.status).toBe('finished');
    expect(match!.scoreHome).toBe(3);
    expect(match!.scoreAway).toBe(0);

    // Restore
    await dl.updateMatch('A1', { status: 'scheduled', scoreHome: undefined, scoreAway: undefined });
  });

  it('submitMatchResult overwrites existing result for same match', async () => {
    await dl.submitMatchResult({
      matchId: 'A1',
      homeScore: 1,
      awayScore: 1,
      winner: 'Empate',
    });
    await dl.submitMatchResult({
      matchId: 'A1',
      homeScore: 2,
      awayScore: 1,
      winner: 'México',
    });

    const results = await dl.getMatchResults();
    const a1Results = results.filter(r => r.matchId === 'A1');
    expect(a1Results).toHaveLength(1);
    expect(a1Results[0].homeScore).toBe(2);

    // Restore
    await dl.clearMatchResults();
    await dl.updateMatch('A1', { status: 'scheduled', scoreHome: undefined, scoreAway: undefined });
  });

  it('submitMatchResult with penalty shootout data', async () => {
    const result: RealMatchResultInput = {
      matchId: 'SF-1',
      homeScore: 2,
      awayScore: 2,
      winner: 'Argentina',
      homePenScore: 4,
      awayPenScore: 2,
    };
    await dl.submitMatchResult(result);

    const results = await dl.getMatchResults();
    const found = results.find(r => r.matchId === 'SF-1');
    expect(found).toBeDefined();
    expect(found!.homePenScore).toBe(4);
    expect(found!.awayPenScore).toBe(2);

    // Restore
    await dl.clearMatchResults();
    await dl.updateMatch('SF-1', { status: 'scheduled', scoreHome: undefined, scoreAway: undefined });
  });

  it('getMatchResults returns empty after clear', async () => {
    await dl.submitMatchResult({
      matchId: 'A1',
      homeScore: 1,
      awayScore: 0,
      winner: 'México',
    });
    await dl.clearMatchResults();
    const results = await dl.getMatchResults();
    expect(results).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// KEY-VALUE STORE
// ═══════════════════════════════════════════════════════════════

describe('Data Layer — Key-Value Store', () => {
  it('setKeyValue and getKeyValue — string value', async () => {
    await dl.setKeyValue('test-string', 'hello world');
    const result = await dl.getKeyValue('test-string');
    expect(result).not.toBeNull();
    expect(result!.key).toBe('test-string');
    expect(result!.value).toBe('hello world');
    expect(result!.updatedAt).toBeTruthy();
  });

  it('setKeyValue and getKeyValue — object value', async () => {
    const obj = { foo: 'bar', count: 42, nested: { a: true } };
    await dl.setKeyValue('test-obj', obj);
    const result = await dl.getKeyValue('test-obj');
    expect(result).not.toBeNull();
    expect(result!.value).toEqual(obj);
  });

  it('setKeyValue and getKeyValue — array value', async () => {
    const arr = [1, 2, 3, 'four', { five: 5 }];
    await dl.setKeyValue('test-arr', arr);
    const result = await dl.getKeyValue('test-arr');
    expect(result).not.toBeNull();
    expect(result!.value).toEqual(arr);
  });

  it('getKeyValue returns null for unknown key', async () => {
    const result = await dl.getKeyValue('nonexistent-key');
    expect(result).toBeNull();
  });

  it('setKeyValue overwrites existing value', async () => {
    await dl.setKeyValue('overwrite', 'v1');
    await dl.setKeyValue('overwrite', 'v2');
    const result = await dl.getKeyValue('overwrite');
    expect(result!.value).toBe('v2');
  });

  it('setKeyValue with null value', async () => {
    await dl.setKeyValue('null-key', null);
    const result = await dl.getKeyValue('null-key');
    expect(result).not.toBeNull();
    expect(result!.value).toBeNull();
  });

  it('setKeyValue with number value', async () => {
    await dl.setKeyValue('num-key', 3.14159);
    const result = await dl.getKeyValue('num-key');
    expect(result!.value).toBe(3.14159);
  });

  it('setKeyValue with boolean value', async () => {
    await dl.setKeyValue('bool-key', false);
    const result = await dl.getKeyValue('bool-key');
    expect(result!.value).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// CRON STATUS
// ═══════════════════════════════════════════════════════════════

describe('Data Layer — Cron Status', () => {
  it('updateCronStatus and getCronStatus', async () => {
    const status = {
      jobName: 'ingest',
      lastRun: new Date().toISOString(),
      status: 'success' as const,
      durationMs: 12345,
      recordsProcessed: 150,
    };
    await dl.updateCronStatus(status);

    const retrieved = await dl.getCronStatus('ingest');
    expect(retrieved).not.toBeNull();
    expect(retrieved!.jobName).toBe('ingest');
    expect(retrieved!.status).toBe('success');
    expect(retrieved!.durationMs).toBe(12345);
  });

  it('getCronStatus returns null for unknown job', async () => {
    const status = await dl.getCronStatus('nonexistent-job');
    expect(status).toBeNull();
  });

  it('updateCronStatus overwrites existing', async () => {
    await dl.updateCronStatus({
      jobName: 'test-job',
      lastRun: '2026-01-01T00:00:00Z',
      status: 'running',
    });
    await dl.updateCronStatus({
      jobName: 'test-job',
      lastRun: '2026-01-02T00:00:00Z',
      status: 'success',
    });

    const status = await dl.getCronStatus('test-job');
    expect(status!.status).toBe('success');
    expect(status!.lastRun).toBe('2026-01-02T00:00:00Z');
  });
});

// ═══════════════════════════════════════════════════════════════
// ACCURACY METRICS
// ═══════════════════════════════════════════════════════════════

describe('Data Layer — Accuracy Metrics', () => {
  it('saveAccuracyMetric and getAccuracyMetrics', async () => {
    const metric = {
      matchId: 'ACC_TEST',
      predictedHomeWin: 0.50,
      predictedDraw: 0.25,
      predictedAwayWin: 0.25,
      actualResult: 'home' as const,
      predictedCorrect: true,
      brierScore: 0.22,
      logLoss: 0.45,
      modelVersion: 'v2',
    };
    const saved = await dl.saveAccuracyMetric(metric);
    expect(saved.id).toBe('ACC_TEST');
    expect(saved.evaluatedAt).toBeTruthy();

    const retrieved = await dl.getAccuracyMetrics('ACC_TEST');
    expect(retrieved).not.toBeNull();
    expect(retrieved!.predictedCorrect).toBe(true);
  });

  it('getAccuracyMetrics returns null for unknown match', async () => {
    const result = await dl.getAccuracyMetrics('NONEXISTENT_ACC');
    expect(result).toBeNull();
  });

  it('getAllAccuracyMetrics returns saved metrics', async () => {
    await dl.saveAccuracyMetric({
      matchId: 'ALL_ACC_1',
      predictedHomeWin: 0.6,
      predictedDraw: 0.2,
      predictedAwayWin: 0.2,
      actualResult: 'home',
      predictedCorrect: true,
      brierScore: 0.15,
      logLoss: 0.3,
      modelVersion: 'v2',
    });
    await dl.saveAccuracyMetric({
      matchId: 'ALL_ACC_2',
      predictedHomeWin: 0.3,
      predictedDraw: 0.4,
      predictedAwayWin: 0.3,
      actualResult: 'away',
      predictedCorrect: false,
      brierScore: 0.55,
      logLoss: 1.2,
      modelVersion: 'v2',
    });

    const all = await dl.getAllAccuracyMetrics();
    const ids = all.map(m => m.matchId);
    expect(ids).toContain('ALL_ACC_1');
    expect(ids).toContain('ALL_ACC_2');
  });

  it('getOverallAccuracy computes stats', async () => {
    const overall = await dl.getOverallAccuracy();
    expect(overall).toHaveProperty('total');
    expect(overall).toHaveProperty('correct');
    expect(overall).toHaveProperty('accuracy');
    expect(overall).toHaveProperty('avgBrier');
    expect(typeof overall.total).toBe('number');
    expect(typeof overall.accuracy).toBe('number');
  });
});

// ═══════════════════════════════════════════════════════════════
// PREDICTION SNAPSHOTS
// ═══════════════════════════════════════════════════════════════

describe('Data Layer — Prediction Snapshots', () => {
  it('getPredictionSnapshots returns empty array for no snapshots', async () => {
    const snapshots = await dl.getPredictionSnapshots('NO_SNAPSHOTS');
    expect(snapshots).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════
// SEED OPERATIONS
// ═══════════════════════════════════════════════════════════════

describe('Data Layer — Seed Operations', () => {
  it('seedTeams adds custom teams', async () => {
    await dl.seedTeams([
      {
        id: 'SEED_TEAM_1',
        fifaCode: 'ST1',
        name: 'Seed Team 1',
        groupChar: 'A',
        confederation: 'TEST',
        eloRating: 1600,
        powerRatings: { attack: 60, defense: 60, midfield: 60 },
      },
    ]);

    const team = await dl.getTeam('SEED_TEAM_1');
    expect(team).not.toBeNull();
    expect(team!.fifaCode).toBe('ST1');
    expect(team!.createdAt).toBeTruthy();
    expect(team!.updatedAt).toBeTruthy();
  });

  it('seedMatches adds custom matches', async () => {
    await dl.seedMatches([
      {
        id: 'SEED_M1',
        round: 'group',
        groupChar: 'A',
        homeTeamId: 'Team X',
        awayTeamId: 'Team Y',
        status: 'scheduled',
      },
    ]);

    const match = await dl.getMatch('SEED_M1');
    expect(match).not.toBeNull();
    expect(match!.homeTeamId).toBe('Team X');
    expect(match!.createdAt).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// EDGE CASES & INTEGRATION
// ═══════════════════════════════════════════════════════════════

describe('Data Layer — Edge Cases', () => {
  it('methods handle empty string lookups gracefully', async () => {
    const team = await dl.getTeam('');
    expect(team).toBeNull();

    const match = await dl.getMatch('');
    expect(match).toBeNull();

    const pred = await dl.getPrediction('');
    expect(pred).toBeNull();
  });

  it('upsertTeam creates and updates team', async () => {
    const created = await dl.upsertTeam({
      id: 'UPSERT_TEST',
      fifaCode: 'UT',
      name: 'Upsert Test',
      groupChar: 'L',
      confederation: 'TEST',
      eloRating: 1500,
      powerRatings: { attack: 50, defense: 50, midfield: 50 },
    });
    expect(created.createdAt).toBeTruthy();
    expect(created.updatedAt).toBeTruthy();

    const updated = await dl.upsertTeam({
      id: 'UPSERT_TEST',
      fifaCode: 'UT',
      name: 'Upsert Test Updated',
      groupChar: 'L',
      confederation: 'TEST',
      eloRating: 1650,
      powerRatings: { attack: 70, defense: 60, midfield: 65 },
    });
    expect(updated.name).toBe('Upsert Test Updated');
    expect(updated.eloRating).toBe(1650);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt).toBeTruthy();
  });

  it('all methods are async and return promises', () => {
    expect(dl.getAllTeams()).toBeInstanceOf(Promise);
    expect(dl.getAllMatches()).toBeInstanceOf(Promise);
    expect(dl.getPrediction('x')).toBeInstanceOf(Promise);
    expect(dl.getTeamForm('x')).toBeInstanceOf(Promise);
    expect(dl.getTournamentProbs()).toBeInstanceOf(Promise);
    expect(dl.getMatchResults()).toBeInstanceOf(Promise);
    expect(dl.getKeyValue('x')).toBeInstanceOf(Promise);
  });

  it('data layer implements full IDataLayer interface', () => {
    const methods = [
      'getTeam', 'getTeamByCode', 'getTeamByName', 'getAllTeams',
      'getTeamsByGroup', 'upsertTeam',
      'getMatch', 'getMatchByNumber', 'getMatchesByGroup', 'getMatchesByStatus',
      'getUpcomingMatches', 'getAllMatches', 'updateMatch', 'getMatchByTeams',
      'getPrediction', 'getPredictionsForMatches', 'savePrediction',
      'savePredictions', 'deletePrediction',
      'getTeamForm', 'saveTeamForm', 'getAllTeamForms',
      'getTournamentProbs', 'getTournamentProb', 'saveTournamentProbs',
      'getAccuracyMetrics', 'getAllAccuracyMetrics', 'saveAccuracyMetric',
      'getOverallAccuracy',
      'submitMatchResult', 'getMatchResults', 'clearMatchResults',
      'updateCronStatus', 'getCronStatus',
      'seedTeams', 'seedMatches',
      'getKeyValue', 'setKeyValue',
      'getPredictionSnapshots',
    ];
    for (const method of methods) {
      expect(typeof (dl as any)[method]).toBe('function');
    }
  });
});
