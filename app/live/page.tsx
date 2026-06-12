'use client';

import { useState, useEffect, useCallback } from 'react';
import { ALL_MATCHES } from '@/lib/matches';
import { getTeamByName } from '@/lib/teams';
import MatchSeal from '@/components/MatchSeal';

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

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fixtureRes, simRes] = await Promise.all([
        fetch('/api/fixture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ useEnhanced: true }),
        }),
        fetch('/api/simulate-tournament'),
      ]);

      const [fixtureData, simData] = await Promise.all([
        fixtureRes.json(),
        simRes.json(),
      ]);

      const realResultsMap = new Map<string, { home: number; away: number }>();
      if (simData.success && simData.results) {
        for (const r of simData.results) {
          realResultsMap.set(r.matchId, { home: r.homeScore, away: r.awayScore });
        }
      }

      const predMap = new Map();
      if (fixtureData.success && fixtureData.fixture) {
        for (const m of fixtureData.fixture) {
          predMap.set(m.id, {
            homeGoals: m.predictedScore?.[0] ?? null,
            awayGoals: m.predictedScore?.[1] ?? null,
          });
        }
      }

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
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  const TABS: { id: TabType; label: string; icon: JSX.Element }[] = [
    {
      id: 'grupos',
      label: 'Tabla de Grupos',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-2.625 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 12 6 12.504 6 13.125M15 12h1.5m-1.5 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-1.5 0h-1.5m1.5 0c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125" />
        </svg>
      ),
    },
    {
      id: 'eliminatorias',
      label: 'Eliminatorias',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0116.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-2.27.52m0 0c-.26 0-.515.02-.77.054m0 0a6.003 6.003 0 01-2.27-.52m0 0a6.003 6.003 0 01-2.48-5.228m0 0c.26 0 .515.02.77.054" />
        </svg>
      ),
    },
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

  const getFlag = (name: string) => getTeamByName(name)?.flag || '🏳️';
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
  const sortedDates = Array.from(new Set(filtered.map(m => m.date))).sort();
  for (const date of sortedDates) {
    byDate.set(date, filtered.filter(m => m.date === date));
  }

  const hasRealResults = playedMatches.length > 0;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-1 flex items-center gap-2">
              <span className="w-8 h-8 rounded-card-sm bg-accent-emerald/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-accent-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </span>
              Mundial en Vivo
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary">
              Resultados reales auto-actualizados · Tabla y bracket recalculados dinámicamente
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {lastUpdate && (
              <div className="text-[10px] text-text-muted hidden sm:flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
                {lastUpdate}
              </div>
            )}
            <button onClick={loadData} className="btn-premium text-xs px-4 py-2 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              Actualizar
            </button>
          </div>
        </div>

        {/* Live stats bar */}
        {hasRealResults && (
          <div className="flex items-center gap-4 mt-4 text-xs">
            <span className="flex items-center gap-1.5 text-accent-emerald font-semibold">
              <span className="w-5 h-5 rounded-full bg-accent-emerald/15 flex items-center justify-center text-[10px]">✓</span>
              {correctCount}/{playedMatches.length} correctas ({accuracy}%)
            </span>
            <span className="text-text-muted">·</span>
            <span className="flex items-center gap-1.5 text-accent-blue">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-breathe" />
              {matches.length - playedMatches.length} pendientes
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl mb-4 animate-fade-in">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all duration-200 ${
              tab === t.id ? 'bg-accent-blue/20 text-accent-blue' : 'text-text-secondary hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Phase filter */}
      <div className="flex overflow-x-auto scrollbar-hide gap-1.5 mb-5 pb-1">
        {PHASES.map(p => (
          <button
            key={p.id}
            onClick={() => setPhaseFilter(p.id)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all duration-200 ${
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
                  <div key={group} className="glass-card p-3 animate-fade-in-up">
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
              <div className="w-16 h-16 mx-auto rounded-full bg-accent-blue/10 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
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
                <BracketRound title="1/16 Final" matches={liveBracket.roundOf32} getFlag={getFlag} />
              )}
              {liveBracket.roundOf16 && liveBracket.roundOf16.length > 0 && (
                <BracketRound title="Octavos de Final" matches={liveBracket.roundOf16} getFlag={getFlag} />
              )}
              {liveBracket.quarters && liveBracket.quarters.length > 0 && (
                <BracketRound title="Cuartos de Final" matches={liveBracket.quarters} getFlag={getFlag} />
              )}
              {liveBracket.semis && liveBracket.semis.length > 0 && (
                <BracketRound title="Semifinales" matches={liveBracket.semis} getFlag={getFlag} />
              )}
              {liveBracket.final && (
                <div className="glass-card p-6 text-center border border-accent-gold/20">
                  <div className="w-16 h-16 mx-auto rounded-full bg-accent-gold/10 flex items-center justify-center mb-3">
                    <svg className="w-8 h-8 text-accent-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0116.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-2.27.52m0 0c-.26 0-.515.02-.77.054m0 0a6.003 6.003 0 01-2.27-.52" />
                    </svg>
                  </div>
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
              <div className="w-16 h-16 mx-auto rounded-full bg-accent-gold/10 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-accent-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0116.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-2.27.52m0 0c-.26 0-.515.02-.77.054m0 0a6.003 6.003 0 01-2.27-.52" />
                </svg>
              </div>
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
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            Todos los Partidos — Real vs Predicho
          </h3>
          {Array.from(byDate.entries()).map(([date, dayMatches], dayIdx) => (
            <div key={date} className="mb-4 animate-fade-in-up" style={{ animationDelay: `${dayIdx * 50}ms` }}>
              <h4 className="text-[11px] font-bold text-accent-blue uppercase tracking-wider mb-2">
                {formatDate(date)}
              </h4>
              <div className="space-y-1.5">
                {dayMatches.map((m, mIdx) => {
                  const hasReal = m.isPlayed && m.realHome !== null && m.realAway !== null;
                  const hasPred = m.predHome !== null && m.predAway !== null;
                  const isCorrect = hasReal && hasPred
                    ? ((m.realHome! > m.realAway!) === (m.predHome! > m.predAway!))
                    : null;

                  // Determine seal status
                  const sealStatus = hasReal
                    ? isCorrect ? 'correct' as const : 'incorrect' as const
                    : 'played' as const;

                  return (
                    <div
                      key={m.id}
                      className={`glass-card p-3 flex items-center gap-3 ${
                        hasReal ? (isCorrect ? 'border-l-2 border-l-accent-emerald' : 'border-l-2 border-l-accent-crimson') : ''
                      }`}
                    >
                      {/* Seal */}
                      <div className="shrink-0">
                        <MatchSeal status={sealStatus} delay={mIdx * 60} />
                      </div>

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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <MatchSeal status="correct" compact />
            <span className="text-text-secondary">Predicción correcta</span>
          </div>
          <div className="flex items-center gap-2">
            <MatchSeal status="incorrect" compact />
            <span className="text-text-secondary">Predicción incorrecta</span>
          </div>
          <div className="flex items-center gap-2">
            <MatchSeal status="played" compact />
            <span className="text-text-secondary">Por jugar / Sin predicción</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BracketRound({ title, matches, getFlag }: { title: string; matches: any[]; getFlag: (n: string) => string }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {matches.map((m: any) => (
          <div key={m.id} className={`glass-card p-3 ${m.isPlayed ? 'border-l-2 border-l-accent-emerald' : ''}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-text-muted">{m.roundLabel || 'Eliminatoria'}</span>
              {m.isPlayed && (
                <MatchSeal
                  status={m.winner ? 'correct' : 'played'}
                  compact
                />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className={`text-white ${m.winner === m.homeTeam ? 'font-bold text-accent-blue' : ''}`}>
                  {getFlag(m.homeTeam)} {m.homeTeam}
                </span>
                <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                  m.winner === m.homeTeam ? 'bg-accent-blue/15 text-accent-blue' : 'bg-white/[0.06] text-text-muted'
                }`}>
                  {m.homeScore ?? '-'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={`text-white ${m.winner === m.awayTeam ? 'font-bold text-accent-blue' : ''}`}>
                  {getFlag(m.awayTeam)} {m.awayTeam}
                </span>
                <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                  m.winner === m.awayTeam ? 'bg-accent-blue/15 text-accent-blue' : 'bg-white/[0.06] text-text-muted'
                }`}>
                  {m.awayScore ?? '-'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
