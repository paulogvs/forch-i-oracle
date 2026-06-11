/**
 * FORCH.i ORACLE — Fetch Real Match Results
 *
 * Fetches actual match results from API-Football and saves to results.json.
 * Respects rate limits (free tier: 100 req/day).
 * Caches results to avoid re-fetching.
 *
 * Usage: npx tsx scripts/fetch-real-results.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '..', 'data', 'worldcup-bench');
const RESULTS_FILE = path.join(DATA_DIR, 'results.json');
const API_KEY = process.env.FOOTBALL_API_KEY;

interface ActualResult {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  outcome: 'H' | 'D' | 'A';
  date: string;
}

function loadExistingResults(): ActualResult[] {
  try {
    return JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveResults(results: ActualResult[]): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
}

async function fetchFinishedFixtures(): Promise<unknown[]> {
  if (!API_KEY) {
    console.warn('⚠️  FOOTBALL_API_KEY not set. Cannot fetch results.');
    return [];
  }

  // API-Football: get fixtures for WC 2026
  // League ID for World Cup = 1 or check current season
  const response = await fetch('https://v3.football.api-sports.io/fixtures?league=1&season=2026&status=FT', {
    headers: {
      'x-rapidapi-key': API_KEY,
      'x-rapidapi-host': 'v3.football.api-sports.io',
    },
  });

  if (!response.ok) {
    console.error(`API error: ${response.status} ${response.statusText}`);
    return [];
  }

  const data = await response.json();
  return data.response || [];
}

function deriveOutcome(homeScore: number, awayScore: number): 'H' | 'D' | 'A' {
  if (homeScore > awayScore) return 'H';
  if (homeScore < awayScore) return 'A';
  return 'D';
}

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  FORCH.i ORACLE — Fetch Real Results     ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const existing = loadExistingResults();
  const existingIds = new Set(existing.map(r => r.matchId));
  console.log(`📊 Existing results: ${existing.length}`);

  const fixtures = await fetchFinishedFixtures();
  console.log(`🔄 Fetched fixtures: ${fixtures.length}`);

  let newCount = 0;
  for (const fixture of fixtures) {
    const f = fixture as Record<string, unknown>;
    const teams = f.teams as Record<string, Record<string, string>> | undefined;
    const goals = f.goals as Record<string, number> | undefined;
    const matchId = String(f.id || '');

    if (!teams || !goals || !matchId) continue;

    const homeTeam = teams.home?.name || '';
    const awayTeam = teams.away?.name || '';
    const homeScore = goals.home ?? 0;
    const awayScore = goals.away ?? 0;

    if (!existingIds.has(matchId)) {
      existing.push({
        matchId,
        homeTeam,
        awayTeam,
        homeScore,
        awayScore,
        outcome: deriveOutcome(homeScore, awayScore),
        date: String(f.date || new Date().toISOString()),
      });
      newCount++;
    }
  }

  saveResults(existing);
  console.log(`\n✅ Results saved: ${existing.length} total (${newCount} new)`);
}

main().catch(console.error);
