'use client';

import { useState, useEffect } from 'react';
import { ALL_MATCHES } from '@/lib/matches';
import { getTeamByName } from '@/lib/teams';

type TabType = 'grupos' | 'eliminatorias';
type PhaseFilter = string;

interface LiveMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  round: string;
  group: string;
  realHome: number | null;
  realAway: number | null;
  isPlayed: boolean;
  predHome: number | null;
  predAway: number | null;
}

export default function LivePage() {
  const [tab, setTab] = useState<TabType>('grupos');
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all');
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveStandings, setLiveStandings] = useState<Record<string, any[]>>({});
  const [liveBracket, setLiveBracket] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get predictions
      const fixtureRes = await fetch('/api/fixture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useEnhanced: true }),
      });
      const fixtureData = await fixtureRes.json();

      // Get real results + live standings + bracket
      const simRes = await fetch('/api/simulate-tournament');
      const simData = await simRes.json();

      // Build real results map
      const realResultsMap = new Map<string, { home: number; away: number }>();
      if (simData.success && simData.results) {
        for (const r of simData.results) {
          realResultsMap.set(r.matchId, { home: r.homeScore, away: r.awayScore });
        }
      }

      // Build predictions map
      const predMap = new Map();
      if (fixtureData.success && fixtureData.fixture) {
        for (const m of fixtureData.fixture) {
          predMap.set(m.id, {
            homeGoals: m.predictedScore?.[0] ?? null,
            awayGoals: m.predictedScore?.[1] ?? null,
          });
        }
      }

      // Build live matches
      const allMatches: LiveMatch[] = ALL_MATCHES.map(m => {
        const pred = predMap.get(m.id);
        const real = realResultsMap.get(m.id);
        return {
          id: m.id,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          date: m.date,
          round: m.round,
          group: m.group,
          realHome: real?.home ?? null,
          realAway: real?.away ?? null,
          isPlayed: real !== undefined,
          predHome: pred?.homeGoals ?? null,
          predAway: pred?.awayGoals ?? null,
        };
      });

      setMatches(allMatches);
      setLiveStandings(simData.success ? simData.liveStandings || {} : {});
      setLiveBracket(simData.success ? simData.bracket : null);
      setLastUpdate(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error('[live] Error loading:', err);
      setError('No se pudieron cargar los datos en vivo');
    } finally {
      setLoading(false);
    }
  };

  const TABS: { id: TabType; label: string; icon: string }[] = [
    { id: 'grupos', label: 'Tabla de Grupos', icon: '📋' },
    { id: 'eliminatorias', label: 'Eliminatorias', icon: '🏆' },
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
  const playedMatches = matches.filter(m => m.isPlayed);
  const correctCount = matches.filter(m => {
    if (!m.isPlayed || m.predHome === null || m.predAway === null || m.realHome === null || m.realAway === null) return false;
    const predWinner = m.predHome > m.predAway ? 'home' : m.predHome < m.predAway ? 'away' : 'draw';
    const realWinner = m.realHome > m.realAway ? 'home' : m.realHome < m.realAway ? 'away' : 'draw';
    return predWinner === realWinner;
  }).length;
  const accuracy = playedMatches.length > 0 ? Math.round((correctCount / playedMatches.length) * 100) : 0;

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

  // Check if there are any real results
  const hasRealResults = playedMatches.length > 0;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-5 animate-fade-in">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">📈 Mundial en Vivo</h1>
            <p className="text-xs sm:text-sm text-text-secondary">
              Resultados reales auto-actualizados · Tabla y bracket recalculados dinámicamente
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {lastUpdate && <div className="text-[10px] text-text-muted hidden sm:block">Actualizado: {lastUpdate}</div>}
            <button onClick={loadData} className="btn-premium text-xs px-4 py-2">🔄 Actualizar</button>
          </div>
        </div>

        {/* Live stats bar */}
        {hasRealResults && (
          <div className="flex items-center gap-4 mt-3 text-xs">
            <span className="text-accent-emerald font-semibold">✅ {correctCount}/{playedMatches.length} correctas ({accuracy}%)</span>
            <span className="text-text-muted">·</span>
            <span className="text-accent-blue">⏳ {matches.length - playedMatches.length} pendientes</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl mb-4 animate-fade-in">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
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
          <button onClick={loadData} className="btn-premium text-xs mt-2 px-3 py-1.5">🔄 Reintentar</button>
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
            <div className="glass-card p-10 text-center">
              <div className="text-4xl mb-3">⏳</div>
              <p className="text-sm text-white font-semibold mb-1">Esperando primeros resultados</p>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                Los resultados se actualizan automáticamente cada 6 horas desde API-Football.
                Cuando comience el Mundial, esta tabla se llenará sola con datos reales.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: Knockout Bracket ═══ */}
      {!loading && !error && tab === 'eliminatorias' && (
        <div className="animate-fade-in space-y-6">
          {liveBracket ? (
            <>
              {liveBracket.roundOf32 && liveBracket.roundOf32.length > 0 && (
                <>
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">1/16 Final</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {liveBracket.roundOf32.map((m: any) => (
                      <BracketMatchCard key={m.id} match={m} getFlag={getFlag} />
                    ))}
                  </div>
                </>
              )}

              {liveBracket.roundOf16 && liveBracket.roundOf16.length > 0 && (
                <>
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Octavos de Final</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {liveBracket.roundOf16.map((m: any) => (
                      <BracketMatchCard key={m.id} match={m} getFlag={getFlag} />
                    ))}
                  </div>
                </>
              )}

              {liveBracket.quarters && liveBracket.quarters.length > 0 && (
                <>
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Cuartos de Final</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {liveBracket.quarters.map((m: any) => (
                      <BracketMatchCard key={m.id} match={m} getFlag={getFlag} />
                    ))}
                  </div>
                </>
              )}

              {liveBracket.semis && liveBracket.semis.length > 0 && (
                <>
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Semifinales</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {liveBracket.semis.map((m: any) => (
                      <BracketMatchCard key={m.id} match={m} getFlag={getFlag} />
                    ))}
                  </div>
                </>
              )}

              {liveBracket.final && (
                <div className="glass-card p-6 text-center border border-accent-gold/20">
                  <div className="text-4xl mb-2">🏆</div>
                  <div className="text-lg font-bold text-gradient-gold">{liveBracket.champion || 'Por definir'}</div>
                  <div className="text-xs text-text-muted mt-1">Campeón Simulado</div>
                  {liveBracket.final.homeTeam && (
                    <div className="mt-3 flex items-center justify-center gap-4 text-sm">
                      <span className="text-white">{getFlag(liveBracket.final.homeTeam)} {liveBracket.final.homeTeam}</span>
                      <span className="font-bold text-accent-blue">{liveBracket.final.homeScore} — {liveBracket.final.awayScore}</span>
                      <span className="text-white">{liveBracket.final.awayTeam} {getFlag(liveBracket.final.awayTeam)}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="glass-card p-10 text-center">
              <div className="text-4xl mb-3">🏆</div>
              <p className="text-sm text-white font-semibold mb-1">Bracket en espera</p>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                Las eliminatorias se arman automáticamente conforme avanzan los resultados de fase de grupos.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══ Match List — All results vs predictions ═══ */}
      {!loading && !error && hasRealResults && byDate.size > 0 && (
        <div className="mt-8 animate-fade-in">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
            📊 Todos los Partidos — Real vs Predicho
          </h3>
          {Array.from(byDate.entries()).map(([date, dayMatches]) => (
            <div key={date} className="mb-4">
              <h4 className="text-[11px] font-bold text-accent-blue uppercase tracking-wider mb-2">
                {formatDate(date)}
              </h4>
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
                      <span className="text-base w-6 text-center shrink-0">
                        {m.isPlayed ? (isCorrect ? '✅' : '❌') : '⏳'}
                      </span>

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
          <div className="flex items-center gap-2"><span className="w-3 h-3 border-l-2 border-accent-emerald"></span> <span className="text-text-secondary">Resultado real</span></div>
        </div>
      </div>
    </div>
  );
}

function BracketMatchCard({ match, getFlag }: { match: any; getFlag: (n: string) => string }) {
  return (
    <div className={`glass-card p-3 ${match.isPlayed ? 'border-l-2 border-l-accent-emerald' : ''}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-text-muted">{match.roundLabel || 'Eliminatoria'}</span>
        {match.isPlayed && <span className="text-[10px] text-accent-emerald">✅</span>}
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className={`text-white ${match.winner === match.homeTeam ? 'font-bold text-accent-blue' : ''}`}>
            {getFlag(match.homeTeam)} {match.homeTeam}
          </span>
          <span className={`font-mono font-bold px-2 py-0.5 rounded ${
            match.winner === match.homeTeam ? 'bg-accent-blue/15 text-accent-blue' : 'bg-white/[0.06] text-text-muted'
          }`}>
            {match.homeScore ?? '-'}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className={`text-white ${match.winner === match.awayTeam ? 'font-bold text-accent-blue' : ''}`}>
            {getFlag(match.awayTeam)} {match.awayTeam}
          </span>
          <span className={`font-mono font-bold px-2 py-0.5 rounded ${
            match.winner === match.awayTeam ? 'bg-accent-blue/15 text-accent-blue' : 'bg-white/[0.06] text-text-muted'
          }`}>
            {match.awayScore ?? '-'}
          </span>
        </div>
      </div>
    </div>
  );
}
