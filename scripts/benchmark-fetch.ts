/**
 * FORCH.i ORACLE — Benchmark Fetch
 *
 * Fetches model predictions from GitHub and local files.
 * Part of the WorldCupBench pipeline.
 *
 * Usage: npx tsx scripts/benchmark-fetch.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '..', 'data', 'worldcup-bench');

function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  FORCH.i ORACLE — Benchmark Fetch        ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // Check what prediction files exist
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  console.log(`📁 Files in ${DATA_DIR}:`);
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));
    const preview = file.endsWith('_prediction.json')
      ? `${data.modelName || 'unknown'} — ${data.predictions?.length || 0} predictions`
      : file;
    console.log(`   ${file}: ${preview}`);
  }

  const predictionFiles = files.filter(f => f.endsWith('_prediction.json'));
  console.log(`\n📊 Total prediction files: ${predictionFiles.length}`);
}

main();
