/**
 * download-worldcup-bench.ts
 * Downloads all WorldCupBench prediction files and tournament data.
 * Run with: npx tsx scripts/download-worldcup-bench.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const DATA_DIR = path.resolve(__dirname, '..', 'data', 'worldcup-bench');

const BASE_URL = 'https://raw.githubusercontent.com/mverab/WorldCupBench/main';

const FILES: Array<{ path: string; name: string }> = [
  // Tournament structure
  { path: 'data/tournament.json', name: 'tournament.json' },
  { path: 'data/leaderboard.json', name: 'leaderboard.json' },
  { path: 'prompts/prediction_prompt.txt', name: 'prediction_prompt.txt' },
  { path: 'schema/predictions_schema.json', name: 'predictions_schema.json' },
  { path: 'src/models_config.py', name: 'models_config.py' },

  // 10 model predictions (Kimi-K2.6 has no JSON — only rationale)
  { path: 'predictions/pre-tournament/Claude-Fable-5_prediction.json', name: 'Claude-Fable-5_prediction.json' },
  { path: 'predictions/pre-tournament/DeepSeek-V4-Pro_prediction.json', name: 'DeepSeek-V4-Pro_prediction.json' },
  { path: 'predictions/pre-tournament/GLM-5.1_prediction.json', name: 'GLM-5.1_prediction.json' },
  { path: 'predictions/pre-tournament/GPT-5.5_prediction.json', name: 'GPT-5.5_prediction.json' },
  { path: 'predictions/pre-tournament/Gemini-3.5-Flash_prediction.json', name: 'Gemini-3.5-Flash_prediction.json' },
  { path: 'predictions/pre-tournament/Grok-4.3_prediction.json', name: 'Grok-4.3_prediction.json' },
  { path: 'predictions/pre-tournament/MiMo-V2.5-Pro_prediction.json', name: 'MiMo-V2.5-Pro_prediction.json' },
  { path: 'predictions/pre-tournament/MiniMax-M3_prediction.json', name: 'MiniMax-M3_prediction.json' },
  { path: 'predictions/pre-tournament/Nex-N2-Pro_prediction.json', name: 'Nex-N2-Pro_prediction.json' },
  { path: 'predictions/pre-tournament/Qwen-3.7-Max_prediction.json', name: 'Qwen-3.7-Max_prediction.json' },
];

function fetchFile(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  console.log('=== WorldCupBench Download Script ===\n');
  console.log(`Downloading to: ${DATA_DIR}\n`);

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  let success = 0;
  let failed = 0;

  for (const file of FILES) {
    const url = `${BASE_URL}/${file.path}`;
    const destPath = path.join(DATA_DIR, file.name);
    try {
      console.log(`  [↓] ${file.name}...`);
      const content = await fetchFile(url);
      fs.writeFileSync(destPath, content, 'utf-8');
      const size = (content.length / 1024).toFixed(1);
      console.log(`  [✓] ${file.name} (${size} KB)`);
      success++;
    } catch (err: any) {
      console.log(`  [✗] ${file.name} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\n=== Done: ${success} OK, ${failed} failed ===`);

  // Generate a summary prediction index
  const predictionFiles = FILES.filter(f =>
    f.name.endsWith('_prediction.json') && !f.name.startsWith('Kimi')
  );
  const summary: any = {
    downloaded_at: new Date().toISOString(),
    source: 'https://github.com/mverab/WorldCupBench',
    total_predictions: success,
    models: predictionFiles.map(f => f.name.replace('_prediction.json', '')),
  };

  // Read each prediction to extract metadata
  for (const pf of predictionFiles) {
    const destPath = path.join(DATA_DIR, pf.name);
    if (fs.existsSync(destPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(destPath, 'utf-8'));
        const modelName = pf.name.replace('_prediction.json', '');
        (summary as any)[modelName] = {
          champion: data.final_standings?.champion || 'N/A',
          runner_up: data.final_standings?.runner_up || 'N/A',
          third_place: data.final_standings?.third_place || 'N/A',
          fourth_place: data.final_standings?.fourth_place || 'N/A',
          timestamp: data.timestamp || 'N/A',
          total_tokens: data.usage?.total?.total_tokens || 0,
          cost_usd: data.cost_usd?.total || 0,
        };
      } catch { /* skip parse errors */ }
    }
  }

  fs.writeFileSync(path.join(DATA_DIR, 'index.json'), JSON.stringify(summary, null, 2));
  console.log('  [✓] index.json (prediction summary)');
}

main().catch(console.error);
