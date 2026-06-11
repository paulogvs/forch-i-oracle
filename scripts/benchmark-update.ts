/**
 * FORCH.i ORACLE — Benchmark Update Script
 *
 * Reads model predictions from data/worldcup-bench/*_prediction.json,
 * reads/creates results.json with actual outcomes,
 * and generates leaderboard.json with scored rankings.
 *
 * Idempotent: running twice produces the same output.
 *
 * Usage: npx tsx scripts/benchmark-update.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  calculateBrierScore,
  isCorrectOutcome,
  isCorrectExactScore,
  deriveOutcome,
  calculateSimulatedROI,
  calculateWeightedConsensus,
  calculateScoreConsensus,
  type ScoreConsensusEntry,
} from '../lib/benchmark-scoring';

const DATA_DIR = path.join(__dirname, '..', 'data', 'worldcup-bench');
const RESULTS_FILE = path.join(DATA_DIR, 'results.json');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');
const CONSENSUS_FILE = path.join(DATA_DIR, 'consensus.json');

interface PredictionFile {
  modelId: string;
  modelName: string;
  predictions: Array<{
    matchId: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    outcome: 'H' | 'D' | 'A';
    confidence: number;
  }>;
}

interface ActualResult {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  outcome: 'H' | 'D' | 'A';
  date: string;
}

interface LeaderboardEntry {
  rank: number;
  modelId: string;
  modelName: string;
  totalPredictions: number;
  brierScore: number;
  accuracy1X2: number;
  accuracyExactScore: number;
  roiSimulated: number;
  updatedAt: string;
}

function loadResults(): ActualResult[] {
  try {
    const data = fs.readFileSync(RESULTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveResults(results: ActualResult[]): void {
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
}

function loadPredictionFiles(): PredictionFile[] {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('_prediction.json'));
  const predictions: PredictionFile[] = [];

  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));
      predictions.push(data);
    } catch {
      console.warn(`⚠️  Failed to parse ${file}`);
    }
  }

  return predictions;
}

function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  FORCH.i ORACLE — Benchmark Update       ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // 1. Load data
  const results = loadResults();
  const modelPredictions = loadPredictionFiles();

  console.log(`📊 Results loaded: ${results.length}`);
  console.log(`🤖 Models loaded: ${modelPredictions.length}`);

  if (modelPredictions.length === 0) {
    console.log('\n⚠️  No prediction files found. Nothing to score.');
    console.log('   Place prediction files in data/worldcup-bench/*_prediction.json');
    return;
  }

  // 2. Score each model
  const leaderboard: LeaderboardEntry[] = [];

  for (const model of modelPredictions) {
    let totalBrier = 0;
    let correct1X2 = 0;
    let correctExact = 0;
    let evaluated = 0;

    for (const pred of model.predictions) {
      const result = results.find(r => r.matchId === pred.matchId);
      if (!result) continue; // Skip if no actual result yet

      evaluated++;
      const brier = calculateBrierScore(pred.outcome, pred.confidence, result.outcome);
      totalBrier += brier;

      if (isCorrectOutcome(pred.outcome, result.outcome)) correct1X2++;
      if (isCorrectExactScore(pred.homeScore, pred.awayScore, result.homeScore, result.awayScore)) correctExact++;
    }

    if (evaluated === 0) continue;

    // ROI calculation
    const roiPreds = model.predictions
      .filter(p => results.find(r => r.matchId === p.matchId))
      .map(p => {
        const result = results.find(r => r.matchId === p.matchId)!;
        return {
          predictedOutcome: p.outcome,
          confidence: p.confidence,
          actualOutcome: result.outcome,
        };
      });

    leaderboard.push({
      rank: 0,
      modelId: model.modelId,
      modelName: model.modelName,
      totalPredictions: evaluated,
      brierScore: Math.round((totalBrier / evaluated) * 10000) / 10000,
      accuracy1X2: Math.round((correct1X2 / evaluated) * 100),
      accuracyExactScore: Math.round((correctExact / evaluated) * 100),
      roiSimulated: Math.round(calculateSimulatedROI(roiPreds) * 100) / 100,
      updatedAt: new Date().toISOString(),
    });
  }

  // 3. Rank by Brier score (lower = better)
  leaderboard.sort((a, b) => a.brierScore - b.brierScore);
  leaderboard.forEach((entry, i) => { entry.rank = i + 1; });

  // 4. Save leaderboard
  fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2));
  console.log(`\n✅ Leaderboard saved (${leaderboard.length} models scored)`);

  // 5. Generate consensus for unsolved matches
  const solvedMatchIds = new Set(results.map(r => r.matchId));
  const allMatchIds = new Set<string>();
  for (const model of modelPredictions) {
    for (const pred of model.predictions) {
      if (!solvedMatchIds.has(pred.matchId)) {
        allMatchIds.add(pred.matchId);
      }
    }
  }

  const consensus: Record<string, {
    matchId: string;
    homeTeam: string;
    awayTeam: string;
    consensusOutcome: string;
    confidence: number;
    topScores: ScoreConsensusEntry[];
    participatingModels: string[];
  }> = {};

  for (const matchId of allMatchIds) {
    const predsForMatch: Array<{
      modelId: string;
      predictedOutcome: 'H' | 'D' | 'A';
      confidence: number;
      predictedHomeScore: number;
      predictedAwayScore: number;
      homeTeam: string;
      awayTeam: string;
    }> = [];

    for (const model of modelPredictions) {
      const pred = model.predictions.find(p => p.matchId === matchId);
      if (pred) {
        predsForMatch.push({
          modelId: model.modelId,
          predictedOutcome: pred.outcome,
          confidence: pred.confidence,
          predictedHomeScore: pred.homeScore,
          predictedAwayScore: pred.awayScore,
          homeTeam: pred.homeTeam,
          awayTeam: pred.awayTeam,
        });
      }
    }

    if (predsForMatch.length === 0) continue;

    const weightedResult = calculateWeightedConsensus(predsForMatch);
    const scoreConsensus = calculateScoreConsensus(predsForMatch);

    consensus[matchId] = {
      matchId,
      homeTeam: predsForMatch[0].homeTeam,
      awayTeam: predsForMatch[0].awayTeam,
      consensusOutcome: weightedResult.outcome,
      confidence: Math.round(weightedResult.confidence * 100),
      topScores: scoreConsensus.slice(0, 5),
      participatingModels: predsForMatch.map(p => p.modelId),
    };
  }

  fs.writeFileSync(CONSENSUS_FILE, JSON.stringify(consensus, null, 2));
  console.log(`✅ Consensus saved (${Object.keys(consensus).length} unsolved matches)`);

  // 6. Summary
  console.log('\n═══ Leaderboard Summary ═══');
  for (const entry of leaderboard) {
    console.log(`  #${entry.rank} ${entry.modelName}: Brier=${entry.brierScore} | Acc=${entry.accuracy1X2}% | ROI=${entry.roiSimulated > 0 ? '+' : ''}${entry.roiSimulated}`);
  }
}

main();
