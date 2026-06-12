'use client';

import { useState, useEffect } from 'react';
import { ALL_MATCHES } from '@/lib/matches';
import { getTeamByName, ELO_RATINGS, POWER_RATINGS, WORLD_CUP_TEAMS } from '@/lib/teams';
import { utcToLocal, getUserTimezoneOffset, getTimezoneLabel, TIMEZONE_PRESETS } from '@/lib/timezone';

type MainTab = 'predicciones' | 'top8' | 'bracket';
type ViewMode = 'fecha' | 'grupo';
type PhaseFilter = string;

interface FixtureMatch {
  id: string; group: string; date: string; time: string; homeTeam: string; awayTeam: string;
  venue: string; city: string; round: string; homeGoals: number | null; awayGoals: number | null;
  homeWin: number | null; draw: number | null; awayWin: number | null; confidence: string | null;
  topScores: { home: number; away: number; probability: number }[] | null;
  isPredicted: boolean; extraTime?: boolean; penalties?: boolean;
  analysis?: string; homeKeyPlayers?: string[]; awayKeyPlayers?: string[];
}

export default function FixturePage() {
  const [mainTab, setMainTab] = useState<MainTab>('predicciones');
  const [viewMode, setViewMode] = useState<ViewMode>('fecha');
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all');
  const [fixtures, setFixtures] = useState<FixtureMatch[]>([]);
  const [top8, setTop8] = useState<any[]>([]);
  const [bracket, setBracket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMatch, setSelectedMatch] = useState<FixtureMatch | null>(null);
  const [tzOffset, setTzOffset] = useState<number>(-4);
  const [groupViewMode, setGroupViewMode] = useState<'partidos' | 'tablas'>('partidos');
  const [liveStandings, setLiveStandings] = useState<Record<string, any[]>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => { setTzOffset(getUserTimezoneOffset()); loadAll(); }, []);

  useEffect(() => {
    const interval = setInterval(loadAll, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadAll = async () => {
    setLoading(true); setError('');
    try {
      const [fixtureRes, simRes] = await Promise.all([
        fetch('/api/fixture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ useEnhanced: true }) }),
        fetch('/api/simulate-tournament'),
      ]);
      const fixtureData = await fixtureRes.json();
      const simData = await simRes.json();
      if (fixtureData.success) {
        const mapped: FixtureMatch[] = (fixtureData.fixture || []).map((m: any) => {
          const isKO = m.round !== 'group';
          const isTight = m.predictedScore && m.predictedScore[0] === m.predictedScore[1] && isKO;
          return {
            id: m.id, group: m.group || 'KO', date: m.date, time: m.time || '',
            homeTeam: m.homeTeam, awayTeam: m.awayTeam, venue: m.venue || '', city: m.city || '',
            round: m.round, homeGoals: m.predictedScore?.[0] ?? null, awayGoals: m.predictedScore?.[1] ?? null,
            homeWin: m.homeWinPct ?? null, draw: m.drawPct ?? null, awayWin: m.awayWinPct ?? null,
            confidence: m.confidence ?? null, topScores: m.topScores ?? null,
            isPredicted: m.predictedScore !== null, extraTime: isTight, penalties: isTight,
            analysis: m.analysis || '', homeKeyPlayers: m.homeKeyPlayers || [], awayKeyPlayers: m.awayKeyPlayers || [],
          };
        });
        setFixtures(mapped);
        setLastUpdated(new Date());
      }
      if (simData.success) { setTop8(simData.top8 || []); setBracket(simData.bracket); setLiveStandings(simData.liveStandings || {}); }
    } catch (err) { console.error('[fixture] Error:', err); setError('Error cargando datos'); }
    finally { setLoading(false); }
  };

  const MAIN_TABS = [
    {
      id: 'predicciones' as const,
      label: 'Predicciones',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
      ),
    },
    {
      id: 'top8' as const,
      label: 'Top 8',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0116.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-2.27.52m0 0c-.26 0-.515.02-.77.054m0 0a6.003 6.003 0 01-2.27-.52" />
        </svg>
      ),
    },
    {
      id: 'bracket' as const,
      label: 'Bracket',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L12 12.75 6.429 9.75m11.142 0l4.179 2.25-9.75 5.25-9.75-5.25 4.179-2.25" />
        </svg>
      ),
    },
  ];
  const PHASES: { id: PhaseFilter; label: string }[] = [
    { id: 'all', label: 'Todos (128)' }, { id: 'group', label: 'Grupos (72)' },
    { id: 'round-32', label: '1/16 (16)' }, { id: 'round-16', label: '1/8 (8)' },
    { id: 'quarter', label: '1/4 (4)' }, { id: 'semi', label: 'Semis (2)' }, { id: 'final', label: 'Final (1)' },
  ];
  const filtered = phaseFilter === 'all' ? fixtures : fixtures.filter(m => m.round === phaseFilter);
  const currentTzLabel = getTimezoneLabel(tzOffset);
  const groupedByDate = filtered.reduce<Record<string, FixtureMatch[]>>((acc, m) => {
    const local = utcToLocal(m.date, m.time || '00:00');
    if (!acc[local.date]) acc[local.date] = [];
    acc[local.date].push({ ...m, time: local.time }); return acc;
  }, {});
  const groupedByGroup = filtered.reduce<Record<string, FixtureMatch[]>>((acc, m) => {
    const key = m.round === 'group' ? `Grupo ${m.group}` : 'Eliminatorias';
    if (!acc[key]) acc[key] = []; acc[key].push(m); return acc;
  }, {});
  const formatDate = (d: string) => { const dt = new Date(d + 'T12:00:00'); return dt.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }); };
  const getRoundLabel = (round: string) => { const l: Record<string,string> = { group:'Fase de Grupos','round-32':'1/16 Final','round-16':'Octavos',quarter:'Cuartos',semi:'Semifinales',third:'Tercer Puesto',final:'Final' }; return l[round] || round; };
  const getFlag = (name: string) => getTeamByName(name)?.flag || '❓';
  const predictedCount = fixtures.filter(f => f.isPredicted).length;
  const hasLiveStandings = Object.keys(liveStandings).length > 0 && Object.values(liveStandings).some((g: any) => g.some((t: any) => t.played > 0));

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-1 flex items-center gap-2">
              <span className="w-8 h-8 rounded-card-sm bg-accent-primary/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </span>
              Mundial 2026
            </h1>
            <p className="text-xs sm:text-sm text-fg-secondary truncate">{predictedCount} / {fixtures.length || 128} predichos · Poisson + Elo + xG</p>
          </div>
          <div className="text-[10px] text-fg-disabled shrink-0 text-right">
            {lastUpdated ? (
              <span>Actualizado: {lastUpdated.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}</span>
            ) : (
              <span className="animate-pulse">Cargando...</span>
            )}
          </div>
        </div>
        <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden mt-3">
          <div className="h-full bg-gradient-to-r from-accent-primary to-state-success rounded-full transition-all duration-500" style={{ width: `${fixtures.length > 0 ? (predictedCount / fixtures.length) * 100 : 0}%` }} />
        </div>
      </div>

      {/* Main tabs */}
      <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl mb-4 animate-fade-in">
        {MAIN_TABS.map(t => (
          <button key={t.id} onClick={() => setMainTab(t.id)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all duration-200 ${mainTab === t.id ? 'bg-accent-primary/20 text-accent-primary' : 'text-fg-secondary hover:text-white hover:bg-white/[0.04]'}`}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Phase filter (only for predicciones) */}
      {mainTab === 'predicciones' && (
        <div className="flex overflow-x-auto scrollbar-hide gap-1.5 mb-3 pb-1 animate-fade-in">
          {PHASES.map(p => (
            <button key={p.id} onClick={() => setPhaseFilter(p.id)} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all duration-200 ${phaseFilter === p.id ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30' : 'bg-white/[0.04] text-fg-secondary border border-transparent hover:text-white'}`}>{p.label}</button>
          ))}
        </div>
      )}

      {/* Controls */}
      {mainTab === 'predicciones' && (
        <div className="flex flex-wrap items-center gap-2 mb-5 animate-fade-in">
          <select value={tzOffset} onChange={(e) => setTzOffset(Number(e.target.value))} className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-[11px] text-white focus:border-accent-primary/50 focus:outline-none">
            {TIMEZONE_PRESETS.map(tz => (<option key={tz.offset} value={tz.offset} className="bg-[#0A1628]">{tz.label} ({getTimezoneLabel(tz.offset)})</option>))}
          </select>
          {(phaseFilter === 'all' || phaseFilter === 'group') && (
            <div className="flex gap-1 p-1 bg-white/[0.04] rounded-lg">
              <button onClick={() => setGroupViewMode('partidos')} className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-200 ${groupViewMode === 'partidos' ? 'bg-white/[0.08] text-white' : 'text-fg-secondary hover:text-white'}`}>⚽ Partidos</button>
              <button onClick={() => setGroupViewMode('tablas')} className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-200 ${groupViewMode === 'tablas' ? 'bg-white/[0.08] text-white' : 'text-fg-secondary hover:text-white'}`}>📊 Tablas</button>
            </div>
          )}
          <div className="flex gap-1 p-1 bg-white/[0.04] rounded-lg">
            <button onClick={() => setViewMode('fecha')} className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-200 ${viewMode === 'fecha' ? 'bg-white/[0.08] text-white' : 'text-fg-secondary hover:text-white'}`}>📅 Fecha</button>
            <button onClick={() => setViewMode('grupo')} className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-200 ${viewMode === 'grupo' ? 'bg-white/[0.08] text-white' : 'text-fg-secondary hover:text-white'}`}>📋 Grupo</button>
          </div>
        </div>
      )}

      {loading && (<div className="flex flex-col items-center justify-center py-20"><div className="w-10 h-10 rounded-full border-2 border-accent-primary/30 border-t-accent-primary animate-spin mb-4" /><p className="text-sm text-fg-secondary">Cargando...</p></div>)}
      {error && (<div className="glass-card p-6 text-center"><p className="text-state-danger text-sm mb-4">{error}</p><button onClick={loadAll} className="btn-premium text-sm px-4 py-2">Reintentar</button></div>)}

      {/* ═══ TAB: PREDICCIONES ═══ */}
      {!loading && !error && mainTab === 'predicciones' && groupViewMode === 'partidos' && (
        <div className="animate-fade-in">
          {viewMode === 'fecha' ? (
            Object.entries(groupedByDate).map(([date, matches], dayIdx) => (
              <div key={date} className="mb-6 animate-fade-in-up" style={{ animationDelay: `${dayIdx * 30}ms` }}>
                <h3 className="text-xs font-bold text-accent-primary uppercase tracking-wider mb-2 sticky top-14 bg-canvas/90 backdrop-blur py-2 z-10 flex items-center gap-2">
                  <span>{formatDate(date)}</span><span className="text-fg-disabled font-normal">· {matches.length}</span>
                  <span className="text-[10px] text-accent-premium/60 bg-accent-premium/10 px-1.5 py-0.5 rounded ml-auto">{currentTzLabel}</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {matches.map(m => <MatchCard key={m.id} match={m} getFlag={getFlag} getRoundLabel={getRoundLabel} onDetail={() => setSelectedMatch(m)} />)}
                </div>
              </div>
            ))
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Object.entries(groupedByGroup).map(([group, matches]) => (
                <div key={group} className="glass-card p-3">
                  <h3 className="text-xs font-bold text-accent-premium uppercase mb-3">{group}</h3>
                  <div className="space-y-1.5">{matches.map(m => <MatchRowCompact key={m.id} match={m} getFlag={getFlag} onDetail={() => setSelectedMatch(m)} />)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: TABLAS DE POSICIONES ═══ */}
      {!loading && !error && mainTab === 'predicciones' && groupViewMode === 'tablas' && (
        <div className="animate-fade-in">
          <div className="glass-card p-3 mb-4 text-center"><p className="text-xs text-fg-secondary">{hasLiveStandings ? '📊 Tablas con resultados reales' : '📊 Tablas simuladas por Elo'}</p></div>
          {hasLiveStandings ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Object.entries(liveStandings).map(([group, teams]) => {
                const played = (teams as any[]).some((t: any) => t.played > 0);
                if (!played) return null;
                return (<StandingsTable key={group} group={group} teams={teams as any[]} getFlag={getFlag} />);
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {['A','B','C','D','E','F','G','H','I','J','K','L'].map(group => {
                const teams = WORLD_CUP_TEAMS.filter(t => t.group === group);
                const sorted = [...teams].sort((a, b) => (ELO_RATINGS[b.name]?.elo || 1500) - (ELO_RATINGS[a.name]?.elo || 1500));
                return (
                  <div key={group} className="glass-card p-3">
                    <h3 className="text-xs font-bold text-accent-premium uppercase mb-2">Grupo {group} <span className="text-[9px] text-fg-disabled font-normal">(Elo)</span></h3>
                    <table className="w-full text-[10px]"><thead><tr className="text-fg-disabled"><th className="text-left pb-1" scope="col">#</th><th className="text-left pb-1" scope="col">Equipo</th><th className="text-center pb-1" scope="col">Elo</th></tr></thead><tbody>
                      {sorted.map((t, i) => (<tr key={t.name} className={i < 2 ? 'text-state-success' : ''}><td className="py-0.5 text-fg-disabled">{i + 1}</td><td className="py-0.5"><span className="mr-1">{t.flag}</span><span className="text-white truncate block max-w-[100px]">{t.name}</span></td><td className="py-0.5 text-center font-mono">{ELO_RATINGS[t.name]?.elo || 1500}</td></tr>))}
                    </tbody></table>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: TOP 8 ═══ */}
      {!loading && !error && mainTab === 'top8' && (
        <div className="animate-fade-in space-y-4">
          {top8.length > 0 ? top8.slice(0, 8).map((team, i) => {
            const name = team.teamId || team.team || '';
            const pct = team.championProb || team.pct || 0;
            return (
              <div key={name} className="glass-card p-4 animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="w-7 text-center text-sm font-bold">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}</span>
                    <span className="text-2xl">{getFlag(name)}</span>
                    <span className="text-sm text-white font-medium">{name}</span>
                  </div>
                  <span className="text-xl font-bold text-accent-primary font-mono">{pct}%</span>
                </div>
                <div className="w-full h-3 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: i === 0 ? 'linear-gradient(90deg, #D4AF37, #E6C84A)' : i < 3 ? 'rgba(43, 127, 255, 0.5)' : 'rgba(43, 127, 255, 0.25)' }} />
                </div>
              </div>
            );
          }) : (
            <div className="glass-card p-10 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-accent-premium/10 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-accent-premium" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0116.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-2.27.52m0 0c-.26 0-.515.02-.77.054m0 0a6.003 6.003 0 01-2.27-.52" />
                </svg>
              </div>
              <p className="text-sm text-white font-semibold mb-1">Esperando datos</p>
              <p className="text-xs text-fg-disabled">Las simulaciones se ejecutan automáticamente vía cron jobs</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: BRACKET ═══ */}
      {!loading && !error && mainTab === 'bracket' && (
        <div className="animate-fade-in space-y-6">
          {bracket ? (
            <>
              {bracket.roundOf32?.length > 0 && (<BracketRound title="1/16 Final" matches={bracket.roundOf32} getFlag={getFlag} />)}
              {bracket.roundOf16?.length > 0 && (<BracketRound title="Octavos" matches={bracket.roundOf16} getFlag={getFlag} />)}
              {bracket.quarters?.length > 0 && (<BracketRound title="Cuartos" matches={bracket.quarters} getFlag={getFlag} />)}
              {bracket.semis?.length > 0 && (<BracketRound title="Semifinales" matches={bracket.semis} getFlag={getFlag} />)}
              {bracket.final && (
                <div className="glass-card p-6 text-center border border-accent-premium/20">
                  <div className="w-16 h-16 mx-auto rounded-full bg-accent-premium/10 flex items-center justify-center mb-3">
                    <svg className="w-8 h-8 text-accent-premium" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172" />
                    </svg>
                  </div>
                  {bracket.champion && <div className="text-lg font-bold text-gold mb-3">{bracket.champion}</div>}
                  {bracket.final.homeTeam && (
                    <div className="flex items-center justify-center gap-4 text-sm">
                      <span className="text-white">{getFlag(bracket.final.homeTeam)} {bracket.final.homeTeam}</span>
                      <span className="font-bold text-accent-primary">{bracket.final.homeScore} — {bracket.final.awayScore}</span>
                      <span className="text-white">{bracket.final.awayTeam} {getFlag(bracket.final.awayTeam)}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="glass-card p-10 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-accent-premium/10 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-accent-premium" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0116.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-2.27.52m0 0c-.26 0-.515.02-.77.054m0 0a6.003 6.003 0 01-2.27-.52" />
                </svg>
              </div>
              <p className="text-sm text-white font-semibold mb-1">Esperando datos</p>
              <p className="text-xs text-fg-disabled">Las simulaciones se ejecutan automáticamente vía cron jobs</p>
            </div>
          )}
        </div>
      )}

      {selectedMatch && <MatchDetailModal match={selectedMatch} getFlag={getFlag} getRoundLabel={getRoundLabel} onClose={() => setSelectedMatch(null)} />}
      <footer className="text-center py-4 text-[11px] text-fg-disabled border-t border-white/[0.04] mt-8"><p>FORCH.i © 2026 · Poisson + Dixon-Coles + Elo · WC2026</p></footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUBCOMPONENTS
// ═══════════════════════════════════════════════════════════════

function StandingsTable({ group, teams, getFlag }: { group: string; teams: any[]; getFlag: (n: string) => string }) {
  return (
    <div className="glass-card p-3">
      <h3 className="text-xs font-bold text-accent-premium uppercase mb-2">Grupo {group}</h3>
      <table className="w-full text-[10px]"><thead><tr className="text-fg-disabled">
        <th className="text-left pb-1" scope="col">#</th><th className="text-left pb-1" scope="col">Equipo</th>
        <th className="text-center pb-1" scope="col">PJ</th><th className="text-center pb-1" scope="col">PG</th>
        <th className="text-center pb-1" scope="col">PE</th><th className="text-center pb-1" scope="col">PP</th>
        <th className="text-center pb-1" scope="col">GF</th><th className="text-center pb-1" scope="col">GC</th>
        <th className="text-center pb-1" scope="col">DG</th><th className="text-center pb-1" scope="col">Pts</th>
      </tr></thead><tbody>
        {teams.map((t, i) => (<tr key={t.name} className={i < 2 ? 'text-state-success' : i < 4 ? '' : 'text-fg-disabled/60'}>
          <td className="py-0.5 text-fg-disabled">{i + 1}</td><td className="py-0.5"><span className="mr-1">{getFlag(t.name)}</span><span className="text-white truncate block max-w-[70px]">{t.name}</span></td>
          <td className="py-0.5 text-center">{t.played}</td><td className="py-0.5 text-center">{t.won}</td><td className="py-0.5 text-center">{t.drawn}</td>
          <td className="py-0.5 text-center">{t.lost}</td><td className="py-0.5 text-center">{t.gf}</td><td className="py-0.5 text-center">{t.ga}</td>
          <td className="py-0.5 text-center">{t.gd > 0 ? '+' : ''}{t.gd}</td><td className="py-0.5 text-center font-bold">{t.points}</td>
        </tr>))}
      </tbody></table>
      <div className="mt-1 text-[9px] text-fg-disabled"><span className="text-state-success">■</span> Clasifica<span className="ml-2 text-fg-disabled/60">■</span> Posible 3°</div>
    </div>
  );
}

function BracketRound({ title, matches, getFlag }: { title: string; matches: any[]; getFlag: (n: string) => string }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-fg-secondary uppercase tracking-wider mb-2">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {matches.map((m: any) => (
          <BracketCard key={m.id} match={m} getFlag={getFlag} />
        ))}
      </div>
    </div>
  );
}

function BracketCard({ match, getFlag }: { match: any; getFlag: (n: string) => string }) {
  if (!match) return null;
  return (
    <div className={`glass-card p-3 ${match.isPlayed ? 'border-l-2 border-l-state-success' : ''}`}>
      <div className="flex items-center justify-between mb-1"><span className="text-[10px] text-fg-disabled">{match.roundLabel || ''}</span>{match.isPlayed && <span className="text-[10px] text-state-success">✅</span>}</div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs"><span className={`text-white ${match.winner === match.homeTeam ? 'font-bold text-accent-primary' : ''}`}>{getFlag(match.homeTeam)} {match.homeTeam}</span><span className={`font-mono font-bold px-2 py-0.5 rounded ${match.winner === match.homeTeam ? 'bg-accent-primary/15 text-accent-primary' : 'bg-white/[0.06] text-fg-disabled'}`}>{match.homeScore ?? '-'}</span></div>
        <div className="flex items-center justify-between text-xs"><span className={`text-white ${match.winner === match.awayTeam ? 'font-bold text-accent-primary' : ''}`}>{getFlag(match.awayTeam)} {match.awayTeam}</span><span className={`font-mono font-bold px-2 py-0.5 rounded ${match.winner === match.awayTeam ? 'bg-accent-primary/15 text-accent-primary' : 'bg-white/[0.06] text-fg-disabled'}`}>{match.awayScore ?? '-'}</span></div>
      </div>
    </div>
  );
}

function MatchCard({ match, getFlag, getRoundLabel, onDetail }: { match: FixtureMatch; getFlag: (n: string) => string; getRoundLabel: (r: string) => string; onDetail: () => void; }) {
  const local = match.date && match.time ? utcToLocal(match.date, match.time) : null;
  const isKO = match.round !== 'group';
  const isTight = match.homeGoals !== null && match.homeGoals === match.awayGoals && isKO;
  return (
    <button onClick={onDetail} className="glass-card p-3 hover:border-white/[0.1] transition-all duration-200 w-full text-left cursor-pointer group">
      <div className="flex items-center justify-between mb-1"><span className="text-[10px] text-fg-disabled font-medium">{getRoundLabel(match.round)}</span><div className="flex items-center gap-1.5">{match.confidence && (<span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${match.confidence === 'alta' ? 'bg-state-success/15 text-state-success' : match.confidence === 'media' ? 'bg-state-warning/15 text-state-warning' : 'bg-white/[0.06] text-fg-disabled'}`}>{match.confidence}</span>)}<span className="text-[10px] text-fg-disabled opacity-0 group-hover:opacity-100 transition-opacity">👁 Ver</span></div></div>
      {local && <div className="text-[10px] text-accent-primary/70 mb-1">🕐 {local.display}</div>}
      {match.homeGoals !== null ? (<>
        <div className="flex items-center justify-between mb-1"><div className="flex items-center gap-2"><span className="text-base">{getFlag(match.homeTeam)}</span><span className="text-xs text-white font-medium truncate max-w-[120px]">{match.homeTeam}</span></div><span className="text-sm font-bold font-mono text-accent-primary bg-accent-primary/10 px-2 py-0.5 rounded">{match.homeGoals}</span></div>
        <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-base">{getFlag(match.awayTeam)}</span><span className="text-xs text-white font-medium truncate max-w-[120px]">{match.awayTeam}</span></div><span className="text-sm font-bold font-mono text-accent-primary bg-accent-primary/10 px-2 py-0.5 rounded">{match.awayGoals}</span></div>
        {isTight && (<div className="mt-1 text-[10px] text-state-warning/80 bg-state-warning/10 px-2 py-0.5 rounded text-center">⚽ Empate 90 min → {match.penalties ? 'Gana en penales' : 'Gana en alargue'}</div>)}
        {match.homeWin !== null && (<div className="mt-2"><div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden"><div style={{ width: `${match.homeWin}%` }} className="bg-accent-primary/60" /><div style={{ width: `${match.draw}%` }} className="bg-white/20" /><div style={{ width: `${match.awayWin}%` }} className="bg-state-danger/60" /></div><div className="flex justify-between text-[9px] text-fg-disabled mt-0.5"><span>{match.homeWin}%</span><span>{match.draw}%</span><span>{match.awayWin}%</span></div></div>)}
      </>) : (<div className="text-center py-3"><span className="text-[10px] text-fg-disabled">Por definir</span></div>)}
    </button>
  );
}

function MatchRowCompact({ match, getFlag, onDetail }: { match: FixtureMatch; getFlag: (n: string) => string; onDetail: () => void; }) {
  return (
    <button onClick={onDetail} className="flex items-center justify-between text-xs py-1.5 w-full text-left hover:bg-white/[0.03] rounded px-1 -mx-1 transition-colors cursor-pointer">
      <div className="flex items-center gap-1.5 flex-1 min-w-0"><span className="text-sm shrink-0">{getFlag(match.homeTeam)}</span><span className="text-fg-primary truncate">{match.homeTeam}</span></div>
      {match.homeGoals !== null ? (<span className="font-bold font-mono text-accent-primary mx-2 shrink-0">{match.homeGoals} - {match.awayGoals}</span>) : (<span className="text-fg-disabled mx-2 shrink-0">vs</span>)}
      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end"><span className="text-fg-primary truncate text-right">{match.awayTeam}</span><span className="text-sm shrink-0">{getFlag(match.awayTeam)}</span></div>
    </button>
  );
}

function MatchDetailModal({ match, getFlag, getRoundLabel, onClose }: { match: FixtureMatch; getFlag: (n: string) => string; getRoundLabel: (r: string) => string; onClose: () => void; }) {
  const homeElo = ELO_RATINGS[match.homeTeam]?.elo || 1500; const awayElo = ELO_RATINGS[match.awayTeam]?.elo || 1500;
  const eloDiff = homeElo - awayElo; const homePower = POWER_RATINGS[match.homeTeam] || { attack: 50, defense: 50, midfield: 50 };
  const awayPower = POWER_RATINGS[match.awayTeam] || { attack: 50, defense: 50, midfield: 50 };
  const isKO = match.round !== 'group'; const isTight = match.homeGoals !== null && match.homeGoals === match.awayGoals && isKO;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" />
      <div className="relative w-full sm:max-w-lg bg-surface border border-white/[0.08] rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-fg-secondary transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        <div className="p-5 pb-4 border-b border-white/[0.06]">
          <div className="text-[10px] text-accent-primary font-semibold uppercase tracking-wider mb-3">{match.round === 'group' ? `Grupo ${match.group}` : getRoundLabel(match.round)}{match.venue ? ` · ${match.venue}` : ''}</div>
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center"><div className="text-3xl mb-1">{getFlag(match.homeTeam)}</div><div className="text-sm font-bold text-white">{match.homeTeam}</div></div>
            {match.homeGoals !== null ? (<div className="px-4 py-2 bg-white/[0.06] rounded-xl"><div className="text-2xl font-bold font-mono text-accent-primary">{match.homeGoals} — {match.awayGoals}</div><div className="text-[10px] text-fg-disabled text-center">Predicción</div>{isTight && <div className="text-[9px] text-state-warning/80 mt-1">⚽ {match.penalties ? 'Penales' : 'Alargue'}</div>}</div>) : (<div className="px-4 py-2 bg-white/[0.06] rounded-xl"><div className="text-lg font-bold text-fg-disabled">vs</div></div>)}
            <div className="flex-1 text-center"><div className="text-3xl mb-1">{getFlag(match.awayTeam)}</div><div className="text-sm font-bold text-white">{match.awayTeam}</div></div>
          </div>
        </div>
        {match.homeGoals !== null && (<>
          <div className="p-5 border-b border-white/[0.06]"><h4 className="text-[10px] text-fg-secondary font-semibold uppercase tracking-wider mb-3">Probabilidades</h4><div className="grid grid-cols-3 gap-2 mb-3"><div className="text-center p-2 bg-accent-primary/10 rounded-lg"><div className="text-lg font-bold text-accent-primary">{match.homeWin}%</div><div className="text-[10px] text-fg-disabled">Local</div></div><div className="text-center p-2 bg-white/[0.06] rounded-lg"><div className="text-lg font-bold text-white">{match.draw}%</div><div className="text-[10px] text-fg-disabled">Empate</div></div><div className="text-center p-2 bg-state-danger/10 rounded-lg"><div className="text-lg font-bold text-state-danger">{match.awayWin}%</div><div className="text-[10px] text-fg-disabled">Visitante</div></div></div><div className="flex gap-0.5 h-2 rounded-full overflow-hidden"><div style={{ width: `${match.homeWin}%` }} className="bg-accent-primary/70" /><div style={{ width: `${match.draw}%` }} className="bg-white/20" /><div style={{ width: `${match.awayWin}%` }} className="bg-state-danger/70" /></div></div>
          <div className="p-5 border-b border-white/[0.06]"><h4 className="text-[10px] text-fg-secondary font-semibold uppercase tracking-wider mb-3">Comparación</h4><div className="mb-3"><div className="flex justify-between text-xs mb-1"><span className="text-white">{match.homeTeam}</span><span className="text-fg-disabled">Elo</span><span className="text-white">{match.awayTeam}</span></div><div className="flex items-center gap-2"><span className="text-sm font-bold font-mono text-accent-primary w-10 text-right">{homeElo}</span><div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden"><div className="h-full bg-accent-primary" style={{ width: `${Math.max(20, Math.min(80, 50 + eloDiff * 0.1))}%` }} /></div><span className="text-sm font-bold font-mono text-state-danger w-10">{awayElo}</span></div><div className="text-[10px] text-fg-disabled text-center mt-0.5">Diferencia: {eloDiff > 0 ? '+' : ''}{eloDiff}</div></div>{['attack', 'midfield', 'defense'].map((stat) => { const h = homePower[stat as keyof typeof homePower]; const a = awayPower[stat as keyof typeof awayPower]; const l: Record<string, string> = { attack: 'Ataque', midfield: 'Medio', defense: 'Defensa' }; return (<div key={stat} className="mb-2.5"><div className="flex justify-between text-[11px] mb-1"><span className="text-white">{h}</span><span className="text-fg-disabled">{l[stat]}</span><span className="text-white">{a}</span></div><div className="flex h-1.5 rounded-full overflow-hidden"><div className="bg-accent-primary/60" style={{ width: `${(h / (h + a)) * 100}%` }} /><div className="bg-state-danger/60" style={{ width: `${(a / (h + a)) * 100}%` }} /></div></div>); })}</div>
          {match.topScores && match.topScores.length > 0 && (<div className="p-5 border-b border-white/[0.06]"><h4 className="text-[10px] text-fg-secondary font-semibold uppercase tracking-wider mb-3">Marcadores Probables</h4><div className="space-y-1.5">{match.topScores.slice(0, 5).map((s, i) => (<div key={i} className="flex items-center gap-3 text-xs"><span className="text-fg-disabled w-4 text-right">{i + 1}</span><span className="font-mono font-bold text-white w-8">{s.home}-{s.away}</span><div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden"><div className="h-full bg-accent-premium/50" style={{ width: `${Math.min(100, s.probability * 3)}%` }} /></div><span className="text-fg-disabled w-10 text-right">{s.probability}%</span></div>))}</div></div>)}
          {match.confidence && (<div className="p-4 border-t border-white/[0.06] flex items-center justify-center"><span className={`text-xs font-semibold px-4 py-1.5 rounded-full ${match.confidence === 'alta' ? 'bg-state-success/15 text-state-success' : match.confidence === 'media' ? 'bg-state-warning/15 text-state-warning' : 'bg-white/[0.06] text-fg-disabled'}`}>Confianza: {match.confidence.charAt(0).toUpperCase() + match.confidence.slice(1)}</span></div>)}
          {/* ═══ GROQ ANALYSIS ═══ */}
          {(match.analysis || match.homeKeyPlayers?.length || match.awayKeyPlayers?.length) && (
            <div className="p-5 border-t border-white/[0.06]">
              <h4 className="text-[10px] text-accent-premium font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                </svg>
                Análisis IA — FORCH.i Oracle
              </h4>
              {match.analysis && (
                <p className="text-sm text-fg-secondary leading-relaxed mb-4">{match.analysis}</p>
              )}
              {(match.homeKeyPlayers?.length || match.awayKeyPlayers?.length) && (
                <div className="grid grid-cols-2 gap-3">
                  {match.homeKeyPlayers?.length ? (
                    <div>
                      <div className="text-[10px] text-fg-disabled uppercase tracking-wider mb-1.5">Jugadores Clave — {match.homeTeam}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {match.homeKeyPlayers!.map((p, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-[11px] text-accent-primary">{p}</span>
                        ))}
                      </div>
                    </div>
                  ) : <div />}
                  {match.awayKeyPlayers?.length ? (
                    <div>
                      <div className="text-[10px] text-fg-disabled uppercase tracking-wider mb-1.5">Jugadores Clave — {match.awayTeam}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {match.awayKeyPlayers!.map((p, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full bg-state-danger/10 border border-state-danger/20 text-[11px] text-state-danger">{p}</span>
                        ))}
                      </div>
                    </div>
                  ) : <div />}
                </div>
              )}
            </div>
          )}
        </>)}
      </div>
    </div>
  );
}
