// FORCH.i ORACLE — Dashboard Utilities
// Functions for grouping, sorting, and formatting dashboard data

import { ALL_MATCHES } from './matches';
import { getTeamByName } from './teams';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface MatchResultDetail {
  home: string;
  away: string;
  pred: [number, number];
  real: [number, number];
  correct: boolean;
  exact: boolean;
  date: string;
  time: string;
  round: string;
  group: string;
  confidence: string | null;
}

export interface DateGroup {
  date: string;
  label: string;
  matches: MatchResultDetail[];
  correctCount: number;
  totalCount: number;
  accuracyPct: number;
}

export interface UpcomingMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
  round: string;
  group: string;
  predictedScore: [number, number] | null;
  homeWinPct: number;
  drawPct: number;
  awayWinPct: number;
  confidence: string | null;
  daysUntil: number;
}

// ═══════════════════════════════════════════════════════════════
// GROUP RESULTS BY DATE
// ═══════════════════════════════════════════════════════════════

/**
 * Groups match results by date, sorted chronologically.
 * Each group shows accuracy stats for that day.
 */
export function groupResultsByDate(
  matchDetails: MatchResultDetail[]
): DateGroup[] {
  const groups = new Map<string, MatchResultDetail[]>();

  for (const m of matchDetails) {
    const dateKey = m.date || 'unknown';
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey)!.push(m);
  }

  const result: DateGroup[] = [];

  groups.forEach((matches, date) => {
    const correctCount = matches.filter((m: MatchResultDetail) => m.correct || m.exact).length;
    const totalCount = matches.length;
    const accuracyPct = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    result.push({
      date,
      label: formatDateLabel(date),
      matches: matches.sort((a: MatchResultDetail, b: MatchResultDetail) => (a.time || '').localeCompare(b.time || '')),
      correctCount,
      totalCount,
      accuracyPct,
    });
  });

  // Sort groups chronologically
  result.sort((a, b) => a.date.localeCompare(b.date));

  return result;
}

// ═══════════════════════════════════════════════════════════════
// GET UPCOMING MATCHES (next N matches)
// ═══════════════════════════════════════════════════════════════

/**
 * Returns the next N upcoming matches sorted by date.
 * Filters out matches that already have results.
 */
export function getUpcomingMatches(
  predictions: Map<string, any>,
  finishedTeams: Set<string>,
  count = 4
): UpcomingMatch[] {
  const now = new Date();
  // Start of today (00:00 UTC) — exclude matches before this
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);

  const upcoming = Array.from(predictions.values())
    .filter(p => {
      if (!p.predictedScore) return false;
      // Exclude if either team already has a finished result
      if (finishedTeams.has(`${p.homeTeam}_vs_${p.awayTeam}`)) return false;
      // Exclude matches from before today
      const staticMatch = ALL_MATCHES.find(
        m => m.homeTeam === p.homeTeam && m.awayTeam === p.awayTeam
      );
      if (staticMatch) {
        const matchDate = new Date(`${staticMatch.date}T${staticMatch.time || '00:00'}:00Z`);
        if (matchDate < todayStart) return false;
      }
      return true;
    })
    .map(p => {
      // Find the static match for date info
      const staticMatch = ALL_MATCHES.find(
        m => m.homeTeam === p.homeTeam && m.awayTeam === p.awayTeam
      );
      const matchDate = staticMatch ? new Date(`${staticMatch.date}T${staticMatch.time || '00:00'}:00Z`) : now;
      const daysUntil = Math.max(0, Math.ceil((matchDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      return {
        id: p.id,
        homeTeam: p.homeTeam,
        awayTeam: p.awayTeam,
        date: staticMatch?.date || '',
        time: staticMatch?.time || '',
        round: p.round || 'group',
        group: p.group || '',
        predictedScore: p.predictedScore,
        homeWinPct: p.homeWinPct,
        drawPct: p.drawPct,
        awayWinPct: p.awayWinPct,
        confidence: p.confidence,
        daysUntil,
      };
    })
    .sort((a, b) => {
      // Sort by date ascending (nearest first)
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || '').localeCompare(b.time || '');
    });

  return upcoming.slice(0, count);
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function formatDateLabel(dateStr: string): string {
  if (!dateStr || dateStr === 'unknown') return 'Sin fecha';

  try {
    const date = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Hoy';
    if (date.toDateString() === yesterday.toDateString()) return 'Ayer';

    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return dateStr;
  }
}

export function getFlag(name: string): string {
  return getTeamByName(name)?.flag || '🏳️';
}

export function getRoundLabel(round: string): string {
  const labels: Record<string, string> = {
    group: 'Fase de Grupos',
    'round-32': '1/16 Final',
    'round-16': 'Octavos',
    quarter: 'Cuartos',
    semi: 'Semifinales',
    third: 'Tercer Puesto',
    final: 'Final',
  };
  return labels[round] || round;
}
