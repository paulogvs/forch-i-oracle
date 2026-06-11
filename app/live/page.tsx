'use client';

import { useState, useEffect } from 'react';
import { ALL_MATCHES } from '@/lib/matches';
import { getTeamByName } from '@/lib/teams';

type TabType = 'grupos' | 'eliminatorias' | 'ingresar';
type PhaseFilter = string;

interface LiveMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  round: string;
  group: string;
  // Real
  realHome: number | null;
  realAway: number | null;
  isPlayed: boolean;
  // Predicted
  predHome: number | null;
  predAway: number | null;
  predHomeWin: number | null;
  // Drift
  confidenceDrift: number | null;
  direction: 'up' | 'down' | 'same' | null;
}

export default function LivePage() {
  const [tab, setTab] = useState<TabType>('grupos');
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all');
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveStandings, setLiveStandings] = useState<Record<string, any[]>>({});
  const [liveBracket, setLiveBracket] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [formMatchId, setFormMatchId] = useState('');
  const [formHome, setFormHome] = useState(0);
  const [formAway, setFormAway] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fixtureRes, liveRes] = await Promise.all([
        fetch('/api/fixture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ useEnhanced: true }) }),
        fetch('/api/live-update'),
      ]);

      const fixtureData = await fixtureRes.json();
      const liveData = await liveRes.json();

      if (!fixtureData.success) throw new Error(fixtureData.error || 'Error cargando pronósticos');
      if (!liveData.success) throw new Error(liveData.error || 'Error cargando datos en vivo');

      // Build match results map from live standings
      // We need to get actual match results — extract from the API
      const realResultsMap = new Map<string, { home: number; away: number }>();

      // Get played match results from simulate-tournament endpoint which includes results
      const simRes = await fetch('/api/simulate-tournament');
      const simData = await simRes.json();
      if (simData.success && simData.results) {
        for (const r of simData.results) {
          realResultsMap.set(r.matchId, { home: r.homeScore, away: r.awayScore });
        }
      }

      // Build live matches from fixture predictions + real results
      const predMap = new Map();
      if (fixtureData.fixture) {
        for (const m of fixtureData.fixture) {
          predMap.set(m.id, {
            homeGoals: m.predictedScore?.[0] ?? null,
            awayGoals: m.predictedScore?.[1] ?? null,
            homeWin: m.homeWinPct ?? null,
          });
        }
      }

      const allMatches: LiveMatch[] = ALL_MATCHES.map(m => {
        const pred = predMap.get(m.id);
        const real = realResultsMap.get(m.id);
        const isPlayed = real !== undefined;

        return {
          id: m.id,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          date: m.date,
          round: m.round,
          group: m.group,
          realHome: real?.home ?? null,
          realAway: real?.away ?? null,
          isPlayed,
          predHome: pred?.homeGoals ?? null,
          predAway: pred?.awayGoals ?? null,
          predHomeWin: pred?.homeWin ?? null,
          confidenceDrift: null,
          direction: null,
        };
      });

      setMatches(allMatches);
      setLiveStandings(liveData.liveStandings || {});
      setLiveBracket(liveData.liveBracket);
    } catch (err) {
      console.error('[live] Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMatchId) return;

    setSubmitting(true);
    setSubmitResult(null);

    try {
      const res = await fetch('/api/live-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: formMatchId,
          homeScore: formHome,
          awayScore: formAway,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');

      setSubmitResult(`✅ ${data.message} · ${data.driftCount} predicciones actualizadas`);
      setFormMatchId('');
      setFormHome(0);
      setFormAway(0);
      loadData(); // Refresh
    } catch (err) {
      console.error('[live] Submit error:', err);
      setSubmitResult(`❌ ${err instanceof Error ? err.message : 'Error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const TABS: { id: TabType; label: string; icon: string }[] = [
    { id: 'grupos', label: 'Grupos', icon: '📋' },
    { id: 'eliminatorias', label: 'Eliminatorias', icon: '🏆' },
    { id: 'ingresar', label: 'Ingresar Resultado', icon: '✏️' },
  ];

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

  // Group matches by date
  const byDate = new Map<string, LiveMatch[]>();
  for (const m of filtered) {
    if (!byDate.has(m.date)) byDate.set(m.date, []);
    byDate.get(m.date)!.push(m);
  }

  const playedCount = matches.filter(m => m.isPlayed).length;
  const correctCount = matches.filter(m => {
    if (!m.isPlayed || m.predHome === null || m.predAway === null || m.realHome === null || m.realAway === null) return false;
    const predWinner = m.predHome > m.predAway ? 'home' : m.predHome < m.predAway ? 'away' : 'draw';
    const realWinner = m.realHome > m.realAway ? 'home' : m.realHome < m.realAway ? 'away' : 'draw';
    return predWinner === realWinner;
  }).length;
  const accuracy = playedCount > 0 ? Math.round((correctCount / playedCount) * 100) : 0;

  // Live group standings
  const hasRealResults = Object.keys(liveStandings).length > 0 && Object.values(liveStandings).some((g: any) => g.some((t: any) => t.played > 0));

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-5 animate-fade-in">
        <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">📈 Mundial en Vivo</h1>
        <p className="text-xs sm:text-sm text-text-secondary">
          Resultados reales vs predicciones · Tabla y bracket se recalculan automáticamente
        </p>
        {playedCount > 0 && (
          <div className="flex items-center gap-4 mt-2 text-xs">
            <span className="text-accent-emerald">✅ {correctCount}/{playedCount} correctas ({accuracy}%)</span>
            <span className="text-text-muted">·</span>
            <span className="text-accent-blue">⏳ {matches.length - playedCount} pendientes</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl mb-4 animate-fade-in">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setShowForm(false); }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              tab === t.id ? 'bg-accent-blue/20 text-accent-blue' : 'text-text-secondary hover:text-white'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Phase filter */}
      <div className="flex overflow-x-auto scrollbar-hide gap-1.5 mb-5 pb-1">
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

      {/* Error */}
      {error && (
        <div className="glass-card p-4 text-center mb-4 border border-accent-crimson/20">
          <p className="text-accent-crimson text-sm">{error}</p>
          <button onClick={loadData} className="btn-premium text-xs mt-2 px-3 py-1.5">Reintentar</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-2 border-accent-blue/30 border-t-accent-blue animate-spin mb-4" />
          <p className="text-sm text-text-secondary">Cargando datos en vivo...</p>
        </div>
      )}

      {/* ═══ TAB: Group Standings ═══ */}
      {!loading && !error && tab === 'grupos' && (
        <div className="animate-fade-in">
          {hasRealResults ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Object.entries(liveStandings).map(([group, teams]) => {
                const played = (teams as any[]).some((t: any) => t.played > 0);
                if (!played) return null;
                return (
                  <div key={group} className="glass-card p-3">
                    <h3 className="text-xs font-bold text-accent-gold uppercase mb-2">Grupo {group}</h3>
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="text-text-muted">
                          <th className="text-left pb-1" scope="col">#</th>
                          <th className="text-left pb-1" scope="col">Equipo</th>
                          <th className="text-center pb-1" scope="col">PJ</th>
                          <th className="text-center pb-1" scope="col">DG</th>
                          <th className="text-center pb-1" scope="col">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(teams as any[]).map((t: any, i: number) => (
                          <tr key={t.name} className={`${i < 2 ? 'text-accent-emerald' : ''}`}>
                            <td className="py-0.5 text-text-muted">{i + 1}</td>
                            <td className="py-0.5">
                              <span className="mr-1">{getFlag(t.name)}</span>
                              <span className="text-white truncate block max-w-[80px]">{t.name}</span>
                            </td>
                            <td className="py-0.5 text-center">{t.played}</td>
                            <td className="py-0.5 text-center">{t.gd > 0 ? '+' : ''}{t.gd}</td>
                            <td className="py-0.5 text-center font-bold">{t.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-card p-8 text-center">
              <div className="text-3xl mb-3">⏳</div>
              <p className="text-sm text-text-secondary mb-2">Aún no hay resultados reales</p>
              <p className="text-xs text-text-muted">Ingresa un resultado para ver la tabla actualizarse en vivo</p>
              <button onClick={() => { setTab('ingresar'); setShowForm(true); }} className="btn-premium text-xs mt-4 px-4 py-2">
                ✏️ Ingresar Primer Resultado
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: Knockout Bracket ═══ */}
      {!loading && !error && tab === 'eliminatorias' && (
        <div className="animate-fade-in space-y-6">
          {liveBracket?.roundOf16 && liveBracket.roundOf16.length > 0 && (
            <>
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Octavos de Final</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {liveBracket.roundOf16.map((m: any) => (
                  <div key={m.id} className="glass-card p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-text-muted">{m.roundLabel}</span>
                      {m.isPlayed && <span className="text-[10px] text-accent-emerald">✅ Finalizado</span>}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`text-white ${m.winner === m.homeTeam ? 'font-bold text-accent-blue' : ''}`}>
                          {getFlag(m.homeTeam)} {m.homeTeam}
                        </span>
                        <span className={`font-mono font-bold px-2 py-0.5 rounded ${m.winner === m.homeTeam ? 'bg-accent-blue/15 text-accent-blue' : 'bg-white/[0.06] text-text-muted'}`}>
                          {m.homeScore}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className={`text-white ${m.winner === m.awayTeam ? 'font-bold text-accent-blue' : ''}`}>
                          {getFlag(m.awayTeam)} {m.awayTeam}
                        </span>
                        <span className={`font-mono font-bold px-2 py-0.5 rounded ${m.winner === m.awayTeam ? 'bg-accent-blue/15 text-accent-blue' : 'bg-white/[0.06] text-text-muted'}`}>
                          {m.awayScore}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {liveBracket?.champion && liveBracket.champion !== 'TBD' && (
            <div className="glass-card p-6 text-center border border-accent-gold/20">
              <div className="text-4xl mb-2">🏆</div>
              <div className="text-lg font-bold text-gradient-gold">{liveBracket.champion}</div>
              <div className="text-xs text-text-muted mt-1">Campeón Simulado</div>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: Enter Result ═══ */}
      {!loading && !error && tab === 'ingresar' && (
        <div className="animate-fade-in max-w-lg mx-auto">
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold text-accent-blue uppercase tracking-wider mb-4">
              ✏️ Ingresar Resultado Real
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="match-select" className="block text-xs text-text-secondary mb-2">Seleccionar Partido</label>
                <select
                  id="match-select"
                  value={formMatchId}
                  onChange={(e) => setFormMatchId(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:border-accent-blue/50 focus:outline-none"
                >
                  <option value="" className="bg-[#0A1628]">-- Seleccionar --</option>
                  {ALL_MATCHES.filter(m => m.round === 'group' || m.round === 'round-32').map(m => (
                    <option key={m.id} value={m.id} className="bg-[#0A1628]">
                      {m.id} · {m.homeTeam} vs {m.awayTeam}
                    </option>
                  ))}
                </select>
              </div>

              {formMatchId && (
                <div className="flex items-center gap-4 p-4 bg-white/[0.03] rounded-xl">
                  <div className="flex-1 text-center">
                    <p className="text-xs text-text-secondary mb-2">
                      {ALL_MATCHES.find(m => m.id === formMatchId)?.homeTeam}
                    </p>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={formHome}
                      onChange={(e) => setFormHome(parseInt(e.target.value) || 0)}
                      className="w-20 text-center text-3xl font-bold bg-white/[0.06] border border-white/[0.1] rounded-xl py-3 text-white focus:border-accent-blue/50 focus:outline-none"
                    />
                  </div>
                  <span className="text-2xl text-text-muted font-bold">—</span>
                  <div className="flex-1 text-center">
                    <p className="text-xs text-text-secondary mb-2">
                      {ALL_MATCHES.find(m => m.id === formMatchId)?.awayTeam}
                    </p>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={formAway}
                      onChange={(e) => setFormAway(parseInt(e.target.value) || 0)}
                      className="w-20 text-center text-3xl font-bold bg-white/[0.06] border border-white/[0.1] rounded-xl py-3 text-white focus:border-accent-blue/50 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !formMatchId}
                className="btn-premium w-full py-3 disabled:opacity-50"
              >
                {submitting ? '⏳ Recalculando...' : '✅ Guardar y Recalcular Todo'}
              </button>
            </form>

            {submitResult && (
              <div className={`mt-4 p-3 rounded-xl text-sm text-center ${
                submitResult.startsWith('✅')
                  ? 'bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20'
                  : 'bg-accent-crimson/10 text-accent-crimson border border-accent-crimson/20'
              }`}>
                {submitResult}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Match List (fallback for all tabs) ═══ */}
      {!loading && !error && tab !== 'ingresar' && byDate.size > 0 && (
        <div className="mt-6 animate-fade-in space-y-6">
          {Array.from(byDate.entries()).map(([date, dayMatches]) => (
            <div key={date}>
              <h3 className="text-xs font-bold text-accent-blue uppercase tracking-wider mb-2 sticky top-14 bg-[#050B14]/90 backdrop-blur py-2 z-10">
                {formatDate(date)}
              </h3>
              <div className="space-y-1.5">
                {dayMatches.map(m => {
                  const hasReal = m.isPlayed && m.realHome !== null && m.realAway !== null;
                  const hasPred = m.predHome !== null && m.predAway !== null;
                  const isCorrect = hasReal && hasPred
                    ? ((m.realHome! > m.realAway!) === (m.predHome! > m.predAway!))
                    : null;

                  return (
                    <div key={m.id} className={`glass-card p-3 flex items-center gap-3 ${
                      m.isPlayed ? 'border-l-2 border-l-accent-emerald' : ''
                    }`}>
                      {/* Status */}
                      <span className="text-base w-6 text-center shrink-0">
                        {m.isPlayed ? (isCorrect ? '✅' : '❌') : '⏳'}
                      </span>

                      {/* Teams + Scores */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs mb-0.5">
                          <span className="text-text-muted font-mono w-10 text-[10px]">{m.id}</span>
                          <span className="text-text-muted text-[10px]">{getRoundLabel(m.round)}</span>
                          <span className="text-white truncate">{m.homeTeam}</span>
                          <span className="text-text-muted">vs</span>
                          <span className="text-white truncate text-right">{m.awayTeam}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px]">
                          {hasReal && (
                            <span className="font-bold text-accent-emerald">
                              Real: {m.realHome}-{m.realAway}
                            </span>
                          )}
                          {hasPred && (
                            <span className="text-accent-blue">
                              Pred: {m.predHome}-{m.predAway}
                            </span>
                          )}
                          {hasReal && hasPred && (
                            <span className={isCorrect ? 'text-accent-emerald' : 'text-accent-crimson'}>
                              {isCorrect ? '✅ Ganador OK' : '❌ Incorrecto'}
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
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="glass-card p-4 mt-8 animate-fade-in">
        <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-3">Leyenda</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2"><span>✅</span> <span className="text-text-secondary">Predicción correcta</span></div>
          <div className="flex items-center gap-2"><span>❌</span> <span className="text-text-secondary">Predicción incorrecta</span></div>
          <div className="flex items-center gap-2"><span>⏳</span> <span className="text-text-secondary">Por jugar</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 bg-accent-emerald rounded-sm border-l-2 border-l-accent-emerald"></span> <span className="text-text-secondary">Resultado ingresado</span></div>
        </div>
      </div>
    </div>
  );
}
