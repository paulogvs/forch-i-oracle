'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLiveScores, useSimulation } from '@/lib/swr/hooks';
import { WORLD_CUP_TEAMS, ELO_RATINGS } from '@/lib/teams';
import { ALL_MATCHES } from '@/lib/matches';

// ─── Types ────────────────────────────────────────────────────────────────

interface LiveResponse {
  success: boolean;
  finished: { homeTeam: string; awayTeam: string; homeScore: number; awayScore: number }[];
  live: any[];
}

interface SimResponse {
  success: boolean;
  results: { matchId: string; homeScore: number; awayScore: number; winner: string }[];
  top8: any[];
  bracket: any;
}

type StatTab = 'overview' | 'teams' | 'matches' | 'scorers';

// ─── Helpers ──────────────────────────────────────────────────────────────

function getFlag(name: string): string {
  return WORLD_CUP_TEAMS.find((t) => t.name === name)?.flag || '🏳️';
}

// ─── Theme-aware card wrapper ─────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`surface ${className}`}>
      {children}
    </div>
  );
}

const STAT_TINTS: Record<string, string> = {
  blue:    'bg-tint-blue',
  green:   'bg-tint-green',
  violet:  'bg-tint-violet',
  gold:    'bg-tint-gold',
  red:     'bg-tint-red',
};

function StatCard({ label, value, emoji, tint }: {
  label: string; value: string | number; emoji: string; tint: string;
}) {
  return (
    <div className={`p-4 rounded-xl ${STAT_TINTS[tint]} border border-border-subtle`}>
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="text-2xl font-black text-fg-primary">{value}</div>
      <div className="t-micro">{label}</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function StatsPage() {
  const [tab, setTab] = useState<StatTab>('overview');

  const { data: liveData } = useLiveScores<LiveResponse>();
  const { data: simData } = useSimulation<SimResponse>();

  const matches = useMemo(() => {
    const finished = liveData?.finished || [];
    return finished.map((m) => ({
      ...m,
      totalGoals: m.homeScore + m.awayScore,
      goalDiff: Math.abs(m.homeScore - m.awayScore),
      winner: m.homeScore > m.awayScore ? m.homeTeam : m.awayScore > m.homeScore ? m.awayTeam : 'Empate',
    }));
  }, [liveData]);

  const totalMatches = matches.length;
  const totalGoals = matches.reduce((s, m) => s + m.totalGoals, 0);
  const avgGoals = totalMatches > 0 ? (totalGoals / totalMatches).toFixed(2) : '0';
  const cleanSheets = matches.filter((m) => m.homeScore === 0 || m.awayScore === 0).length;
  const highScoring = matches.filter((m) => m.totalGoals >= 4).length;

  // Team stats
  const teamStats = useMemo(() => {
    const stats = new Map<string, {
      name: string; flag: string; played: number; won: number; drawn: number; lost: number;
      goalsFor: number; goalsAgainst: number; goalDiff: number; points: number;
      cleanSheets: number; highScoring: number; biggestWin: number;
    }>();

    for (const t of WORLD_CUP_TEAMS) {
      if (t.name.includes('TBD')) continue;
      stats.set(t.name, {
        name: t.name, flag: t.flag, played: 0, won: 0, drawn: 0, lost: 0,
        goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0,
        cleanSheets: 0, highScoring: 0, biggestWin: 0,
      });
    }

    for (const m of matches) {
      const home = stats.get(m.homeTeam);
      const away = stats.get(m.awayTeam);
      if (!home || !away) continue;

      home.played++; away.played++;
      home.goalsFor += m.homeScore; home.goalsAgainst += m.awayScore;
      away.goalsFor += m.awayScore; away.goalsAgainst += m.homeScore;
      home.goalDiff = home.goalsFor - home.goalsAgainst;
      away.goalDiff = away.goalsFor - away.goalsAgainst;

      if (m.homeScore > m.awayScore) { home.won++; home.points += 3; away.lost++; }
      else if (m.homeScore < m.awayScore) { away.won++; away.points += 3; home.lost++; }
      else { home.drawn++; away.drawn++; home.points += 1; away.points += 1; }

      if (m.homeScore === 0) home.cleanSheets++;
      if (m.awayScore === 0) away.cleanSheets++;
      if (m.totalGoals >= 4) { home.highScoring++; away.highScoring++; }
      const gd = Math.abs(m.homeScore - m.awayScore);
      if (gd > home.biggestWin) home.biggestWin = gd;
      if (gd > away.biggestWin) away.biggestWin = gd;
    }

    return Array.from(stats.values()).sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff);
  }, [matches]);

  const topScorers = useMemo(() => {
    return teamStats
      .filter(t => t.played > 0)
      .sort((a, b) => b.goalsFor - a.goalsFor)
      .slice(0, 10);
  }, [teamStats]);

  const TABS = [
    { id: 'overview' as const, label: 'Resumen', emoji: '📊' },
    { id: 'teams' as const, label: 'Equipos', emoji: '⚽' },
    { id: 'matches' as const, label: 'Partidos', emoji: '🎯' },
    { id: 'scorers' as const, label: 'Goleadores', emoji: '🥇' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-4 animate-fade">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="h-page text-accent-primary">
          📈 Estadísticas en Vivo
        </h1>
        <p className="t-meta mt-2">
          Mundial 2026 — {totalMatches} partidos jugados
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex gap-2 p-1 surface rounded-xl">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg h-card transition-all ${
                tab === t.id
                  ? 'bg-accent-primary/20 text-accent-primary shadow-lg'
                  : 'text-fg-secondary hover:text-fg-primary hover:bg-raised/50'
              }`}
            >
              <span>{t.emoji}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {tab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <OverviewTab totalMatches={totalMatches} totalGoals={totalGoals} avgGoals={avgGoals} cleanSheets={cleanSheets} highScoring={highScoring} teamStats={teamStats} matches={matches} />
            </motion.div>
          )}
          {tab === 'teams' && (
            <motion.div key="teams" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <TeamsTab teamStats={teamStats} />
            </motion.div>
          )}
          {tab === 'matches' && (
            <motion.div key="matches" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <MatchesTab matches={matches} />
            </motion.div>
          )}
          {tab === 'scorers' && (
            <motion.div key="scorers" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <ScorersTab topScorers={topScorers} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────

function OverviewTab({ totalMatches, totalGoals, avgGoals, cleanSheets, highScoring, teamStats, matches }: {
  totalMatches: number; totalGoals: number; avgGoals: string; cleanSheets: number; highScoring: number;
  teamStats: any[]; matches: any[];
}) {
  const stats = [
    { label: 'Partidos', value: totalMatches, emoji: '⚽', tint: 'blue' },
    { label: 'Goles', value: totalGoals, emoji: '🥅', tint: 'green' },
    { label: 'Promedio', value: avgGoals, emoji: '📊', tint: 'violet' },
    { label: 'Vallas Invictas', value: cleanSheets, emoji: '🛡️', tint: 'gold' },
    { label: 'Alta Anotación', value: highScoring, emoji: '🔥', tint: 'red' },
  ];

  const biggestWins = [...matches].sort((a, b) => b.goalDiff - a.goalDiff).slice(0, 5);
  const highestScoring = [...matches].sort((a, b) => b.totalGoals - a.totalGoals).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Biggest wins */}
        <Card className="p-5">
          <h3 className="h-card text-fg-secondary mb-4 flex items-center gap-2">
            💥 Mayores Victorias
          </h3>
          <div className="space-y-2">
            {biggestWins.map((m, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg surface-elevated t-body">
                <div className="flex items-center gap-2 min-w-0">
                  <span>{getFlag(m.homeTeam)}</span>
                  <span className="truncate">{m.homeTeam}</span>
                </div>
                <span className="font-mono font-bold text-accent-primary px-3">{m.homeScore} - {m.awayScore}</span>
                <div className="flex items-center gap-2 min-w-0 justify-end">
                  <span className="truncate text-right">{m.awayTeam}</span>
                  <span>{getFlag(m.awayTeam)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Highest scoring */}
        <Card className="p-5">
          <h3 className="h-card text-fg-secondary mb-4 flex items-center gap-2">
            🔥 Mayor Anotación
          </h3>
          <div className="space-y-2">
            {highestScoring.map((m, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg surface-elevated t-body">
                <div className="flex items-center gap-2 min-w-0">
                  <span>{getFlag(m.homeTeam)}</span>
                  <span className="truncate">{m.homeTeam}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-accent-premium px-3">{m.homeScore} - {m.awayScore}</span>
                  <span className="t-micro">({m.totalGoals} goles)</span>
                </div>
                <div className="flex items-center gap-2 min-w-0 justify-end">
                  <span className="truncate text-right">{m.awayTeam}</span>
                  <span>{getFlag(m.awayTeam)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top teams */}
      <Card className="p-5">
        <h3 className="h-card text-fg-secondary mb-4 flex items-center gap-2">
          🏆 Mejores Equipos (por puntos)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {teamStats.filter(t => t.played > 0).slice(0, 9).map((t, i) => (
            <div key={t.name} className={`flex items-center gap-3 p-3 ${
              i < 3 ? 'surface-blue' : 'surface'
            }`}>
              <span className="text-xl">{t.flag}</span>
              <div className="flex-1 min-w-0">
                <div className="h-card truncate">{t.name}</div>
                <div className="t-micro">{t.played}PJ · {t.won}G · {t.drawn}E · {t.lost}P</div>
              </div>
              <div className="text-right">
                <div className="h-section text-fg-primary">{t.points}</div>
                <div className={`t-micro ${t.goalDiff > 0 ? 'text-state-success' : t.goalDiff < 0 ? 'text-state-danger' : ''}`}>
                  {t.goalDiff > 0 ? '+' : ''}{t.goalDiff} DG
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Teams Tab ────────────────────────────────────────────────────────────

function TeamsTab({ teamStats }: { teamStats: any[] }) {
  const [sortBy, setSortBy] = useState<'points' | 'goals' | 'gd'>('points');

  const sorted = [...teamStats].sort((a, b) => {
    switch (sortBy) {
      case 'points': return b.points - a.points || b.goalDiff - a.goalDiff;
      case 'goals': return b.goalsFor - a.goalsFor;
      case 'gd': return b.goalDiff - a.goalDiff;
      default: return 0;
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[
          { id: 'points' as const, label: 'Puntos' },
          { id: 'goals' as const, label: 'Goles' },
          { id: 'gd' as const, label: 'Dif. Goles' },
        ].map((s) => (
          <button key={s.id} onClick={() => setSortBy(s.id)}
            className={`px-4 py-2 rounded-lg h-card transition-all border ${
              sortBy === s.id ? 'bg-accent-primary/20 text-accent-primary border-accent-primary/30' : 'bg-elevated text-fg-secondary border-border-subtle hover:text-fg-primary'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <table className="w-full t-body">
          <thead>
            <tr className="border-b border-border-subtle t-micro">
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Equipo</th>
              <th className="px-4 py-3 text-center">PJ</th>
              <th className="px-4 py-3 text-center">G</th>
              <th className="px-4 py-3 text-center">E</th>
              <th className="px-4 py-3 text-center">P</th>
              <th className="px-4 py-3 text-center">GF</th>
              <th className="px-4 py-3 text-center">GC</th>
              <th className="px-4 py-3 text-center">DG</th>
              <th className="px-4 py-3 text-center">Pts</th>
              <th className="px-4 py-3 text-center">CVI</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t, i) => (
              <tr key={t.name} className="border-b border-border-subtle/50 hover:bg-elevated/50 transition-colors">
                <td className="px-4 py-3 text-fg-tertiary">{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{t.flag}</span>
                    <span className="h-card">{t.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center t-mono">{t.played}</td>
                <td className="px-4 py-3 text-center text-state-success">{t.won}</td>
                <td className="px-4 py-3 text-center text-state-warning">{t.drawn}</td>
                <td className="px-4 py-3 text-center text-state-danger">{t.lost}</td>
                <td className="px-4 py-3 text-center t-mono">{t.goalsFor}</td>
                <td className="px-4 py-3 text-center t-mono">{t.goalsAgainst}</td>
                <td className={`px-4 py-3 text-center t-mono ${t.goalDiff > 0 ? 'text-state-success' : t.goalDiff < 0 ? 'text-state-danger' : ''}`}>
                  {t.goalDiff > 0 ? '+' : ''}{t.goalDiff}
                </td>
                <td className="px-4 py-3 text-center font-bold">{t.points}</td>
                <td className="px-4 py-3 text-center t-mono">{t.cleanSheets}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── Matches Tab ──────────────────────────────────────────────────────────

function MatchesTab({ matches }: { matches: any[] }) {
  const [sortBy, setSortBy] = useState<'date' | 'goals' | 'diff'>('date');

  const sorted = [...matches].sort((a, b) => {
    switch (sortBy) {
      case 'goals': return b.totalGoals - a.totalGoals;
      case 'diff': return b.goalDiff - a.goalDiff;
      default: return 0;
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[
          { id: 'date' as const, label: 'Recientes' },
          { id: 'goals' as const, label: 'Más Goles' },
          { id: 'diff' as const, label: 'Mayor Dif.' },
        ].map((s) => (
          <button key={s.id} onClick={() => setSortBy(s.id)}
            className={`px-4 py-2 rounded-lg h-card transition-all border ${
              sortBy === s.id ? 'bg-accent-primary/20 text-accent-primary border-accent-primary/30' : 'bg-elevated text-fg-secondary border-border-subtle hover:text-fg-primary'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {sorted.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
            <Card className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3 min-w-0 w-[40%]">
                <span className="text-2xl">{getFlag(m.homeTeam)}</span>
                <div className="min-w-0">
                  <div className="h-card truncate">{m.homeTeam}</div>
                  <div className="t-micro">
                    {m.homeScore > m.awayScore ? 'Victoria' : m.homeScore < m.awayScore ? 'Derrota' : 'Empate'}
                  </div>
                </div>
              </div>

              <div className="text-center shrink-0">
                <div className="h-section font-mono">
                  <span className={m.homeScore > m.awayScore ? 'text-state-success' : 'text-fg-secondary'}>{m.homeScore}</span>
                  <span className="text-fg-tertiary mx-1">-</span>
                  <span className={m.awayScore > m.homeScore ? 'text-state-success' : 'text-fg-secondary'}>{m.awayScore}</span>
                </div>
                <div className="t-micro">{m.totalGoals} goles</div>
              </div>

              <div className="flex items-center gap-3 min-w-0 w-[40%] justify-end">
                <div className="min-w-0 text-right">
                  <div className="h-card truncate">{m.awayTeam}</div>
                  <div className="t-micro">
                    {m.awayScore > m.homeScore ? 'Victoria' : m.awayScore < m.homeScore ? 'Derrota' : 'Empate'}
                  </div>
                </div>
                <span className="text-2xl">{getFlag(m.awayTeam)}</span>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Scorers Tab ──────────────────────────────────────────────────────────

function ScorersTab({ topScorers }: { topScorers: any[] }) {
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="h-card text-fg-secondary mb-4 flex items-center gap-2">
          ⚽ Goleadores por Equipo
        </h3>
        <p className="t-micro mb-4">Goles por equipo en el torneo</p>
        <div className="space-y-3">
          {topScorers.map((t, i) => (
            <div key={t.name} className="flex items-center gap-4">
              <span className="text-fg-tertiary w-6 text-right t-mono">{i + 1}</span>
              <span className="text-xl">{t.flag}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="h-card truncate">{t.name}</span>
                  <span className="h-card text-accent-primary">{t.goalsFor} goles</span>
                </div>
                <div className="w-full bg-elevated rounded-full h-2">
                  <div className="h-2 rounded-full bg-accent-primary" style={{ width: `${(t.goalsFor / (topScorers[0]?.goalsFor || 1)) * 100}%` }} />
                </div>
                <div className="flex justify-between t-micro mt-1">
                  <span>{t.played}PJ</span>
                  <span>{(t.goalsFor / t.played).toFixed(1)} gol/partido</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Fun facts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="h-card text-fg-secondary mb-3 flex items-center gap-2">🎯 Datos Curiosos</h3>
          <div className="space-y-2 t-body">
            <div className="flex justify-between">
              <span className="t-meta">Equipo más goleador</span>
              <span className="font-semibold">
                {topScorers[0]?.flag} {topScorers[0]?.name} ({topScorers[0]?.goalsFor})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="t-meta">Mejor diferencia de goles</span>
              <span className="font-semibold">
                {[...topScorers].sort((a, b) => b.goalDiff - a.goalDiff)[0]?.flag}{' '}
                {[...topScorers].sort((a, b) => b.goalDiff - a.goalDiff)[0]?.name}{' '}
                ({[...topScorers].sort((a, b) => b.goalDiff - a.goalDiff)[0]?.goalDiff > 0 ? '+' : ''}
                {[...topScorers].sort((a, b) => b.goalDiff - a.goalDiff)[0]?.goalDiff})
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="h-card text-fg-secondary mb-3 flex items-center gap-2">📊 Rendimiento</h3>
          <div className="space-y-2 t-body">
            <div className="flex justify-between">
              <span className="t-meta">Más victorias</span>
              <span className="font-semibold">
                {[...topScorers].sort((a, b) => b.won - a.won)[0]?.flag}{' '}
                {[...topScorers].sort((a, b) => b.won - a.won)[0]?.name}{' '}
                ({[...topScorers].sort((a, b) => b.won - a.won)[0]?.won})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="t-meta">Más vallas invictas</span>
              <span className="font-semibold">
                {[...topScorers].sort((a, b) => b.cleanSheets - a.cleanSheets)[0]?.flag}{' '}
                {[...topScorers].sort((a, b) => b.cleanSheets - a.cleanSheets)[0]?.name}{' '}
                ({[...topScorers].sort((a, b) => b.cleanSheets - a.cleanSheets)[0]?.cleanSheets})
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
