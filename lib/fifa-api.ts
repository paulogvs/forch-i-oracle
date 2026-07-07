// FORCH.i ORACLE — FIFA Public API Adapter
// Loads match results from cached FIFA API response (.fifa-2026-raw.json)
// Falls back to empty array if file not found.
// No external API calls at runtime — pure cached data.
import { mapToSpanish } from '@/lib/teams';
import fs from 'fs';
import path from 'path';

export interface FIFAMatch {
  IdMatch: string;
  Date: string;
  Home: {
    Score: number | null;
    TeamName: { Locale: string; Description: string }[];
    IdTeam: string;
    Abbreviation: string;
  };
  Away: {
    Score: number | null;
    TeamName: { Locale: string; Description: string }[];
    IdTeam: string;
    Abbreviation: string;
  };
  StageName: { Locale: string; Description: string }[];
  GroupName: { Locale: string; Description: string }[];
  IdStage: string;
  IdGroup: string;
  Attendance: string;
}

export interface InternalMatchResult {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  stage: string;
  group: string;
}

const STAGE_MAP: Record<string, string> = {
  'First Stage': 'group',
  'Round of 32': 'R32',
  'Round of 16': 'R16',
  'Quarter-finals': 'QF',
  'Semi-finals': 'SF',
  'Match for third place': 'TP',
  'Final': 'F',
};

function detectStage(stageNames: { Locale: string; Description: string }[]): string {
  const desc = stageNames?.[0]?.Description || '';
  return STAGE_MAP[desc] || desc;
}

function detectGroup(groupNames: { Locale: string; Description: string }[]): string {
  const desc = groupNames?.[0]?.Description || '';
  const match = desc.match(/Group\s+([A-Z])/i);
  return match?.[1] || '';
}

function getEnglishName(teamNameArr: { Locale: string; Description: string }[]): string {
  const en = teamNameArr?.find(n => n.Locale === 'en-GB');
  return en?.Description || teamNameArr?.[0]?.Description || '';
}

/**
 * Fetch matches from cached FIFA API response.
 * Reads .fifa-2026-raw.json from the project root.
 * Returns only finished matches (where both scores are not null).
 */
export function fetchFIFAMatches(_locale: string): FIFAMatch[] {
  try {
    const dataPath = path.resolve(process.cwd(), '.fifa-2026-raw.json');
    if (!fs.existsSync(dataPath)) {
      console.warn('[fifa-api] .fifa-2026-raw.json not found, returning empty');
      return [];
    }

    const raw = fs.readFileSync(dataPath, 'utf-8');
    const parsed = JSON.parse(raw);
    const results = parsed.Results || parsed.results || {};

    const allMatches: FIFAMatch[] = Object.values(results) as FIFAMatch[];
    const finishedMatches = allMatches.filter(
      (r: FIFAMatch) => r.Home?.Score != null && r.Away?.Score != null
    );

    console.log(`[fifa-api] Loaded ${finishedMatches.length} finished matches from cached data`);
    return finishedMatches;
  } catch (err) {
    console.warn('[fifa-api] Failed to load cached FIFA data:', err instanceof Error ? err.message : String(err));
    return [];
  }
}

/**
 * Convert a FIFA API match to the internal format.
 * Maps team names to Spanish using the canonical map.
 * Returns null if the match doesn't have scores or team names can't be resolved.
 */
export function toInternalResult(match: FIFAMatch): InternalMatchResult | null {
  const homeEnglish = getEnglishName(match.Home.TeamName);
  const awayEnglish = getEnglishName(match.Away.TeamName);

  const homeTeam = mapToSpanish(homeEnglish);
  const awayTeam = mapToSpanish(awayEnglish);

  if (!homeTeam || !awayTeam) {
    console.warn(`[fifa-api] Could not map team names: "${homeEnglish}" -> "${homeTeam}", "${awayEnglish}" -> "${awayTeam}"`);
    return null;
  }

  return {
    matchId: match.IdMatch,
    homeTeam,
    awayTeam,
    homeScore: match.Home.Score ?? 0,
    awayScore: match.Away.Score ?? 0,
    stage: detectStage(match.StageName),
    group: detectGroup(match.GroupName),
  };
}
