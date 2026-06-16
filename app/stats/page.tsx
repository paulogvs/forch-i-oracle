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

function getTeamData(name: string) {
  return WORLD_CUP_TEAMS.find((t) => t.name === name);
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

  // Top scorers (simplified — counts from finished matches)
  const topScorers = useMemo(() => {
    // We don't have individual goal data, so we show team-level goals
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950 text-white p-4 md:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
          📈 Estadísticas en Vivo
        </h1>
        <p className="text-slate-400 mt-2">
          Mundial 2026 — {totalMatches} partidos jugados
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex gap-2 p-1 bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-800">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
                tab === t.id
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 shadow-lg shadow-cyan-500/10'
                  : 'text-slate-500 hover:text-slate-300'
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
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <OverviewTab
                totalMatches={totalMatches}
                totalGoals={totalGoals}
                avgGoals={avgGoals}
                cleanSheets={cleanSheets}
                highScoring={highScoring}
                teamStats={teamStats}
                matches={matches}
              />
            </motion.div>
          )}

          {tab === 'teams' && (
            <motion.div
              key="teams"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <TeamsTab teamStats={teamStats} />
            </motion.div>
          )}

          {tab === 'matches' && (
            <motion.div
              key="matches"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <MatchesTab matches={matches} />
            </motion.div>
          )}

          {tab === 'scorers' && (
            <motion.div
              key="scorers"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
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
    { label: 'Partidos', value: totalMatches, emoji: '⚽', color: 'from-cyan-500 to-blue-500' },
    { label: 'Goles', value: totalGoals, emoji: '🥅', color: 'from-emerald-500 to-green-500' },
    { label: 'Promedio', value: avgGoals, emoji: '📊', color: 'from-purple-500 to-pink-500' },
    { label: 'Vallas Invictas', value: cleanSheets, emoji: '🛡️', color: 'from-amber-500 to-orange-500' },
    { label: 'Alta Anotación', value: highScoring, emoji: '🔥', color: 'from-red-500 to-pink-500' },
  ];

  // Biggest wins
  const biggestWins = [...matches]
    .sort((a, b) => b.goalDiff - a.goalDiff)
    .slice(0, 5);

  // Highest scoring
  const highestScoring = [...matches]
    .sort((a, b) => b.totalGoals - a.totalGoals)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={`p-4 rounded-xl bg-gradient-to-br ${s.color} bg-opacity-10 border border-white/10`}
          >
            <div className="text-2xl mb-1">{s.emoji}</div>
            <div className="text-3xl font-black text-white">{s.value}</div>
            <div className="text-xs text-slate-400">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Biggest wins */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800 p-5">
          <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
            💥 Mayores Victorias
          </h3>
          <div className="space-y-2">
            {biggestWins.map((m, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span>{getFlag(m.homeTeam)}</span>
                  <span className="truncate">{m.homeTeam}</span>
                </div>
                <span className="font-mono font-bold text-cyan-400 px-3">
                  {m.homeScore} - {m.awayScore}
                </span>
                <div className="flex items-center gap-2 min-w-0 justify-end">
                  <span className="truncate text-right">{m.awayTeam}</span>
                  <span>{getFlag(m.awayTeam)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Highest scoring */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800 p-5">
          <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
            🔥 Mayor Anotación
          </h3>
          <div className="space-y-2">
            {highestScoring.map((m, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span>{getFlag(m.homeTeam)}</span>
                  <span className="truncate">{m.homeTeam}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-amber-400 px-3">
                    {m.homeScore} - {m.awayScore}
                  </span>
                  <span className="text-xs text-slate-500">({m.totalGoals} goles)</span>
                </div>
                <div className="flex items-center gap-2 min-w-0 justify-end">
                  <span className="truncate text-right">{m.awayTeam}</span>
                  <span>{getFlag(m.awayTeam)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top teams */}
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800 p-5">
        <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
          🏆 Mejores Equipos (por puntos)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {teamStats.filter(t => t.played > 0).slice(0, 9).map((t, i) => (
            <div key={t.name} className={`flex items-center gap-3 p-3 rounded-xl border ${
              i < 3 ? 'bg-gradient-to-r from-emerald-500/10 to-transparent border-emerald-500/20' :
              'bg-slate-800/30 border-slate-800'
            }`}>
              <span className="text-xl">{t.flag}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{t.name}</div>
                <div className="text-xs text-slate-500">
                  {t.played}PJ · {t.won}G · {t.drawn}E · {t.lost}P
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-white">{t.points}</div>
                <div className={`text-xs ${t.goalDiff > 0 ? 'text-emerald-400' : t.goalDiff < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                  {t.goalDiff > 0 ? '+' : ''}{t.goalDiff} DG
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
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
          <button
            key={s.id}
            onClick={() => setSortBy(s.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              sortBy === s.id
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-slate-900/60 text-slate-500 border border-slate-800 hover:text-slate-300'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-xs">
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
              <tr key={t.name} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{t.flag}</span>
                    <span className="font-semibold">{t.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-slate-400">{t.played}</td>
                <td className="px-4 py-3 text-center text-emerald-400">{t.won}</td>
                <td className="px-4 py-3 text-center text-yellow-400">{t.drawn}</td>
                <td className="px-4 py-3 text-center text-red-400">{t.lost}</td>
                <td className="px-4 py-3 text-center">{t.goalsFor}</td>
                <td className="px-4 py-3 text-center">{t.goalsAgainst}</td>
                <td className={`px-4 py-3 text-center font-mono ${t.goalDiff > 0 ? 'text-emerald-400' : t.goalDiff < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                  {t.goalDiff > 0 ? '+' : ''}{t.goalDiff}
                </td>
                <td className="px-4 py-3 text-center font-bold text-white">{t.points}</td>
                <td className="px-4 py-3 text-center text-slate-400">{t.cleanSheets}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
          <button
            key={s.id}
            onClick={() => setSortBy(s.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              sortBy === s.id
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-slate-900/60 text-slate-500 border border-slate-800 hover:text-slate-300'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {sorted.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02 }}
            className="flex items-center justify-between p-4 bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-800"
          >
            <div className="flex items-center gap-3 min-w-0 w-[40%]">
              <span className="text-2xl">{getFlag(m.homeTeam)}</span>
              <div className="min-w-0">
                <div className="font-semibold truncate">{m.homeTeam}</div>
                <div className="text-xs text-slate-500">
                  {m.homeScore > m.awayScore ? 'Victoria' : m.homeScore < m.awayScore ? 'Derrota' : 'Empate'}
                </div>
              </div>
            </div>

            <div className="text-center shrink-0">
              <div className="text-3xl font-black font-mono">
                <span className={m.homeScore > m.awayScore ? 'text-emerald-400' : 'text-slate-400'}>
                  {m.homeScore}
                </span>
                <span className="text-slate-600 mx-1">-</span>
                <span className={m.awayScore > m.homeScore ? 'text-emerald-400' : 'text-slate-400'}>
                  {m.awayScore}
                </span>
              </div>
              <div className="text-xs text-slate-500">{m.totalGoals} goles</div>
            </div>

            <div className="flex items-center gap-3 min-w-0 w-[40%] justify-end">
              <div className="min-w-0 text-right">
                <div className="font-semibold truncate">{m.awayTeam}</div>
                <div className="text-xs text-slate-500">
                  {m.awayScore > m.homeScore ? 'Victoria' : m.awayScore < m.homeScore ? 'Derrota' : 'Empate'}
                </div>
              </div>
              <span className="text-2xl">{getFlag(m.awayTeam)}</span>
            </div>
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
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800 p-5">
        <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
          ⚽ Goleadores por Equipo
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          goles por equipo en el torneo
        </p>
        <div className="space-y-3">
          {topScorers.map((t, i) => (
            <div key={t.name} className="flex items-center gap-4">
              <span className="text-slate-500 w-6 text-right text-sm">{i + 1}</span>
              <span className="text-xl">{t.flag}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm truncate">{t.name}</span>
                  <span className="text-sm font-bold text-cyan-400">{t.goalsFor} goles</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                    style={{ width: `${(t.goalsFor / (topScorers[0]?.goalsFor || 1)) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>{t.played}PJ</span>
                  <span>{(t.goalsFor / t.played).toFixed(1)} gol/partido</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fun facts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800 p-5">
          <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
            🎯 Datos Curiosos
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Equipo más goleador</span>
              <span className="font-semibold">
                {topScorers[0]?.flag} {topScorers[0]?.name} ({topScorers[0]?.goalsFor})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Mejor diferencia de goles</span>
              <span className="font-semibold">
                {topScorers.sort((a, b) => b.goalDiff - a.goalDiff)[0]?.flag}{' '}
                {topScorers.sort((a, b) => b.goalDiff - a.goalDiff)[0]?.name}{' '}
                ({topScorers.sort((a, b) => b.goalDiff - a.goalDiff)[0]?.goalDiff > 0 ? '+' : ''}
                {topScorers.sort((a, b) => b.goalDiff - a.goalDiff)[0]?.goalDiff})
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800 p-5">
          <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
            📊 Rendimiento
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Más victorias</span>
              <span className="font-semibold">
                {topScorers.sort((a, b) => b.won - a.won)[0]?.flag}{' '}
                {topScorers.sort((a, b) => b.won - a.won)[0]?.name}{' '}
                ({topScorers.sort((a, b) => b.won - a.won)[0]?.won})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Más vallas invictas</span>
              <span className="font-semibold">
                {topScorers.sort((a, b) => b.cleanSheets - a.cleanSheets)[0]?.flag}{' '}
                {topScorers.sort((a, b) => b.cleanSheets - a.cleanSheets)[0]?.name}{' '}
                ({topScorers.sort((a, b) => b.cleanSheets - a.cleanSheets)[0]?.cleanSheets})
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
