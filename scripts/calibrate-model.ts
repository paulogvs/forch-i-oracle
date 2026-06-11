/**
 * FORCH.i ORACLE — Lambda Calibration Script
 *
 * Calculates the optimal CALIBRATION_FACTOR so that the average total expected
 * goals across all 72 group-stage matches is approximately 2.65 (historical WC average).
 *
 * Usage: npx tsx scripts/calibrate-model.ts
 *
 * This is a development script, NOT part of the runtime build.
 */

import { calculateExpectedGoals } from '../lib/predictor-engine';
import { getMatchesByGroup, GROUPS } from '../lib/matches';

function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  FORCH.i ORACLE — Lambda Calibration     ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const TARGET = 2.65; // Historical WC average goals per match (1998-2022)

  // Get all 72 group matches
  const allMatches: Array<{ home: string; away: string }> = [];
  for (const group of GROUPS) {
    const matches = getMatchesByGroup(group);
    for (const m of matches) {
      allMatches.push({ home: m.homeTeam, away: m.awayTeam });
    }
  }

  console.log(`Found ${allMatches.length} group matches\n`);

  // Calculate raw lambdas (factor = 1.0)
  let totalGoals = 0;
  const matchLambdas: Array<{ home: string; away: string; hLambda: number; aLambda: number; total: number }> = [];

  for (const match of allMatches) {
    const hLambda = calculateExpectedGoals(match.home, match.away, true);
    const aLambda = calculateExpectedGoals(match.away, match.home, false);
    const total = hLambda + aLambda;
    totalGoals += total;
    matchLambdas.push({ home: match.home, away: match.away, hLambda, aLambda, total });
  }

  const rawAvg = totalGoals / allMatches.length;
  const factor = TARGET / rawAvg;

  console.log('═══ Results ═══');
  console.log(`Raw average total goals: ${rawAvg.toFixed(4)}`);
  console.log(`Target average:          ${TARGET}`);
  console.log(`CALIBRATION_FACTOR:      ${factor.toFixed(4)}`);
  console.log(`\nRecommended value: ${(Math.round(factor * 100) / 100).toFixed(2)}`);

  // Show distribution
  const buckets = [0, 0, 0, 0, 0]; // <2.0, 2.0-2.5, 2.5-3.0, 3.0-3.5, 3.5+
  for (const m of matchLambdas) {
    if (m.total < 2.0) buckets[0]++;
    else if (m.total < 2.5) buckets[1]++;
    else if (m.total < 3.0) buckets[2]++;
    else if (m.total < 3.5) buckets[3]++;
    else buckets[4]++;
  }

  console.log('\n═══ Lambda Distribution ═══');
  console.log(`<2.0:  ${buckets[0]} matches`);
  console.log(`2.0-2.5: ${buckets[1]} matches`);
  console.log(`2.5-3.0: ${buckets[2]} matches`);
  console.log(`3.0-3.5: ${buckets[3]} matches`);
  console.log(`3.5+:  ${buckets[4]} matches`);

  // Show top 5 highest and lowest
  matchLambdas.sort((a, b) => b.total - a.total);

  console.log('\n═══ Top 5 Highest Expected Goals ═══');
  for (const m of matchLambdas.slice(0, 5)) {
    console.log(`  ${m.home} vs ${m.away}: ${m.total.toFixed(2)} (${m.hLambda.toFixed(2)} + ${m.aLambda.toFixed(2)})`);
  }

  console.log('\n═══ Top 5 Lowest Expected Goals ═══');
  for (const m of matchLambdas.slice(-5)) {
    console.log(`  ${m.home} vs ${m.away}: ${m.total.toFixed(2)} (${m.hLambda.toFixed(2)} + ${m.aLambda.toFixed(2)})`);
  }

  console.log('\n═══ Next Steps ═══');
  console.log(`1. Update CALIBRATION_FACTOR in lib/predictor-engine.ts to ${factor.toFixed(2)}`);
  console.log('2. Re-run: npm run test:run && npm run build');
  console.log('3. Verify average is now ~2.65 by re-running this script');
}

main();
