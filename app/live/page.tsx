'use client';

import { useState, useEffect } from 'react';
import { ALL_MATCHES } from '@/lib/matches';
import { getTeamByName } from '@/lib/teams';

interface LiveMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  round: string;
  group: string;
  // Predicted
  predHome: number;
  predAway: number;
  predWinner: string;
  // Real
  realHome: number | null;
  realAway: number | null;
  realWinner: string | null;
  isPlayed: boolean;
  // Accuracy
  winnerCorrect: boolean | null;
  goalDiff: number | null;
}

export default function LivePage() {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [phaseFilter, setPhaseFilter] = useState('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fixtureRes, accuracyRes] = await Promise.all([
        fetch('/api/fixture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ useEnhanced: true }) }),
        fetch('/api/accuracy'),
      ]);

      const fixtureData = await fixtureRes.json();
      const accuracyData = await accuracyRes.json();

      const predMap = new Map();
      if (fixtureData.success && fixtureData.fixture) {
        for (const m of fixtureData.fixture) {
          predMap.set(m.id, {
            homeGoals: m.predictedScore?.[0] ?? 0,
            awayGoals: m.predictedScore?.[1] ?? 0,
          });
        }
      }

      const resultMap = new Map();
      if (accuracyData.success && accuracyData.comparisons) {
        for (const c of accuracyData.comparisons) {
          resultMap.set(c.matchId, {
            realHome: c.realHomeGoals,
            realAway: c.realAwayGoals,
            realWinner: c.realWinner,
            isPlayed: c.isPlayed,
            winnerCorrect: c.winnerCorrect,
            goalDiff: c.goalError,
          });
        }
      }

      const liveMatches: LiveMatch[] = ALL_MATCHES.map(m => {
        const pred = predMap.get(m.id);
        const real = resultMap.get(m.id);
        const predHome = pred?.homeGoals ?? 0;
        const predAway = pred?.awayGoals ?? 0;
        const predWinner = predHome > predAway ? 'home' : predHome < predAway ? 'away' : 'draw';

        return {
          id: m.id,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          date: m.date,
          round: m.round,
          group: m.group,
          predHome,
          predAway,
          predWinner,
          realHome: real?.realHome ?? null,
          realAway: real?.realAway ?? null,
          realWinner: real?.realWinner ?? null,
          isPlayed: real?.isPlayed ?? false,
          winnerCorrect: real?.winnerCorrect ?? null,
          goalDiff: real?.goalDiff ?? null,
        };
      });

      setMatches(liveMatches);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const PHASES = [
    { id: 'all', label: 'Todos' },
    { id: 'group', label: 'Grupos' },
    { id: 'round-32', label: '1/16' },
    { id: 'round-16', label: '1/8' },
    { id: 'quarter', label: '1/4' },
    { id: 'semi', label: 'Semis' },
    { id: 'final', label: 'Final' },
  ];

  const filtered = phaseFilter === 'all' ? matches : matches.filter(m => m.round === phaseFilter);

  const playedMatches = matches.filter(m => m.isPlayed);
  const correctWinners = playedMatches.filter(m => m.winnerCorrect === true).length;
  const avgError = playedMatches.length > 0
    ? (playedMatches.reduce((s, m) => s + (m.goalDiff || 0), 0) / playedMatches.length).toFixed(2)
    : '—';

  const getFlag = (name: string) => getTeamByName(name)?.flag || '❓';
  const getRoundLabel = (round: string) => {
    const labels: Record<string, string> = {
      group: 'Grupo', 'round-32': '1/16', 'round-16': '1/8',
      quarter: '1/4', semi: 'Semi', third: '3°', final: 'Final',
    };
    return labels[round] || round;
  };
  const formatDate = (d: string) => {
    const dt = new Date(d + 'T12:00:00');
    return dt.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="px-4 md:px-6 lg:px-8 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">📈 Veredicto Vivo</h1>
        <p className="text-sm text-text-secondary">
          Comparación predicción vs realidad · Se actualiza con cada resultado
        </p>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-3 gap-3 mb-6 animate-fade-in-up">
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-accent-emerald">{playedMatches.length}</div>
          <div className="text-xs text-text-secondary">Partidos Jugados</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-accent-gold">
            {playedMatches.length > 0 ? Math.round((correctWinners / playedMatches.length) * 100) : 0}%
          </div>
          <div className="text-xs text-text-secondary">Acierto Ganador</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-accent-blue">{avgError}</div>
          <div className="text-xs text-text-secondary">Error en Goles</div>
        </div>
      </div>

      {/* Phase filter */}
      <div className="flex overflow-x-auto scrollbar-hide gap-1.5 mb-6 pb-1">
        {PHASES.map(p => (
          <button
            key={p.id}
            onClick={() => setPhaseFilter(p.id)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
              phaseFilter === p.id
                ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                : 'bg-white/[0.04] text-text-secondary border border-transparent hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Match list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-2 border-accent-blue/30 border-t-accent-blue animate-spin mb-4" />
          <p className="text-sm text-text-secondary">Cargando...</p>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* Group by date */}
          {(() => {
            const byDate = new Map<string, LiveMatch[]>();
            for (const m of filtered) {
              if (!byDate.has(m.date)) byDate.set(m.date, []);
              byDate.get(m.date)!.push(m);
            }
            return Array.from(byDate.entries()).map(([date, dayMatches]) => (
              <div key={date}>
                <h3 className="text-xs font-bold text-accent-blue uppercase tracking-wider mb-2 sticky top-14 bg-[#050B14]/90 backdrop-blur py-2 z-10">
                  {formatDate(date)}
                </h3>
                <div className="space-y-1.5">
                  {dayMatches.map(m => {
                    const statusIcon = m.isPlayed
                      ? (m.winnerCorrect === true ? '✅' : m.winnerCorrect === false ? '❌' : '🟡')
                      : '⏳';
                    return (
                      <div key={m.id} className={`glass-card p-3 transition-colors ${m.isPlayed ? 'border-l-2 border-l-accent-emerald' : ''}`}>
                        <div className="flex items-center gap-3">
                          {/* Status */}
                          <span className="text-lg w-6 text-center shrink-0">{statusIcon}</span>

                          {/* Round + Teams */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-xs mb-1">
                              <span className="text-text-muted font-mono w-10">{m.id}</span>
                              <span className="text-accent-gold w-8 text-[10px]">{getRoundLabel(m.round)}</span>
                              <span className="text-white truncate">{m.homeTeam}</span>
                              <span className="text-text-muted">vs</span>
                              <span className="text-white truncate text-right">{m.awayTeam}</span>
                            </div>

                            {/* Predicted vs Real */}
                            <div className="flex items-center gap-4 text-[11px]">
                              <span className="text-accent-blue">
                                Pred: {m.predHome}-{m.predAway}
                              </span>
                              {m.isPlayed && m.realHome !== null ? (
                                <span className={`font-bold ${m.winnerCorrect ? 'text-accent-emerald' : 'text-accent-crimson'}`}>
                                  Real: {m.realHome}-{m.realAway}
                                </span>
                              ) : (
                                <span className="text-text-muted">{formatDate(m.date)}</span>
                              )}
                              {m.goalDiff !== null && (
                                <span className="text-text-muted">
                                  Error: {m.goalDiff} gol{m.goalDiff !== 1 ? 'es' : ''}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Flags */}
                          <div className="flex gap-1 shrink-0">
                            <span className="text-base">{getFlag(m.homeTeam)}</span>
                            <span className="text-base">{getFlag(m.awayTeam)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </div>
      )}

      {/* Legend */}
      <div className="glass-card p-4 mt-8 animate-fade-in-up">
        <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Leyenda</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2"><span>✅</span> <span className="text-text-secondary">Ganador correcto</span></div>
          <div className="flex items-center gap-2"><span>❌</span> <span className="text-text-secondary">Ganador incorrecto</span></div>
          <div className="flex items-center gap-2"><span>🟡</span> <span className="text-text-secondary">Empate no predicho</span></div>
          <div className="flex items-center gap-2"><span>⏳</span> <span className="text-text-secondary">Por jugar</span></div>
        </div>
      </div>
    </div>
  );
}
