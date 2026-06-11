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
  const [generating, setGenerating] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<FixtureMatch | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [tzOffset, setTzOffset] = useState<number>(-4);
  const [groupViewMode, setGroupViewMode] = useState<'partidos' | 'tablas'>('partidos');
  const [liveStandings, setLiveStandings] = useState<Record<string, any[]>>({});

  useEffect(() => { setTzOffset(getUserTimezoneOffset()); loadAll(); }, []);

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
          };
        });
        setFixtures(mapped);
      }
      if (simData.success) { setTop8(simData.top8 || []); setBracket(simData.bracket); setLiveStandings(simData.liveStandings || {}); }
    } catch (err) { console.error('[fixture] Error:', err); setError('Error cargando datos'); }
    finally { setLoading(false); }
  };

  const runSimulation = async () => {
    setSimulating(true);
    try {
      const res = await fetch('/api/simulate-tournament', { method: 'POST' });
      const data = await res.json();
      if (data.success) { setTop8(data.top8 || []); setBracket(data.bracket); setLiveStandings(data.liveStandings || {}); setMainTab('top8'); }
    } catch (err) { console.error('[fixture] Sim error:', err); setError('Error en simulación'); }
    finally { setSimulating(false); }
  };

  const MAIN_TABS = [
    { id: 'predicciones' as const, label: 'Predicciones', icon: '🔮' },
    { id: 'top8' as const, label: 'Top 8', icon: '🏆' },
    { id: 'bracket' as const, label: 'Bracket', icon: '📐' },
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
      <div className="mb-5 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">⚡ Mundial 2026</h1>
            <p className="text-xs sm:text-sm text-text-secondary truncate">{predictedCount} / {fixtures.length || 128} predichos · Poisson + Elo + xG</p>
          </div>
          <button onClick={runSimulation} disabled={simulating} className="btn-premium text-xs px-4 py-2 disabled:opacity-50 shrink-0">{simulating ? '⏳...' : '🏆 Simular'}</button>
        </div>
        <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden mt-3">
          <div className="h-full bg-gradient-to-r from-accent-blue to-accent-emerald rounded-full transition-all duration-500" style={{ width: `${fixtures.length > 0 ? (predictedCount / fixtures.length) * 100 : 0}%` }} />
        </div>
      </div>

      {/* Main tabs */}
      <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl mb-4 animate-fade-in">
        {MAIN_TABS.map(t => (
          <button key={t.id} onClick={() => setMainTab(t.id)} className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${mainTab === t.id ? 'bg-accent-blue/20 text-accent-blue' : 'text-text-secondary hover:text-white'}`}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* Phase filter (only for predicciones) */}
      {mainTab === 'predicciones' && (
        <div className="flex overflow-x-auto scrollbar-hide gap-1.5 mb-3 pb-1 animate-fade-in">
          {PHASES.map(p => (
            <button key={p.id} onClick={() => setPhaseFilter(p.id)} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${phaseFilter === p.id ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30' : 'bg-white/[0.04] text-text-secondary border border-transparent hover:text-white'}`}>{p.label}</button>
          ))}
        </div>
      )}

      {/* Controls */}
      {mainTab === 'predicciones' && (
        <div className="flex flex-wrap items-center gap-2 mb-5 animate-fade-in">
          <select value={tzOffset} onChange={(e) => setTzOffset(Number(e.target.value))} className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-[11px] text-white focus:border-accent-blue/50 focus:outline-none">
            {TIMEZONE_PRESETS.map(tz => (<option key={tz.offset} value={tz.offset} className="bg-[#0A1628]">{tz.label} ({getTimezoneLabel(tz.offset)})</option>))}
          </select>
          {(phaseFilter === 'all' || phaseFilter === 'group') && (
            <div className="flex gap-1 p-1 bg-white/[0.04] rounded-lg">
              <button onClick={() => setGroupViewMode('partidos')} className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${groupViewMode === 'partidos' ? 'bg-white/[0.08] text-white' : 'text-text-secondary hover:text-white'}`}>⚽ Partidos</button>
              <button onClick={() => setGroupViewMode('tablas')} className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${groupViewMode === 'tablas' ? 'bg-white/[0.08] text-white' : 'text-text-secondary hover:text-white'}`}>📊 Tablas</button>
            </div>
          )}
          <div className="flex gap-1 p-1 bg-white/[0.04] rounded-lg">
            <button onClick={() => setViewMode('fecha')} className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${viewMode === 'fecha' ? 'bg-white/[0.08] text-white' : 'text-text-secondary hover:text-white'}`}>📅 Fecha</button>
            <button onClick={() => setViewMode('grupo')} className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${viewMode === 'grupo' ? 'bg-white/[0.08] text-white' : 'text-text-secondary hover:text-white'}`}>📋 Grupo</button>
          </div>
        </div>
      )}

      {loading && (<div className="flex flex-col items-center justify-center py-20"><div className="w-10 h-10 rounded-full border-2 border-accent-blue/30 border-t-accent-blue animate-spin mb-4" /><p className="text-sm text-text-secondary">Cargando...</p></div>)}
      {error && (<div className="glass-card p-6 text-center"><p className="text-accent-crimson text-sm mb-4">{error}</p><button onClick={loadAll} className="btn-premium text-sm px-4 py-2">Reintentar</button></div>)}

      {/* ═══ TAB: PREDICCIONES ═══ */}
      {!loading && !error && mainTab === 'predicciones' && groupViewMode === 'partidos' && (
        <div className="animate-fade-in">
          {viewMode === 'fecha' ? (
            Object.entries(groupedByDate).map(([date, matches]) => (
              <div key={date} className="mb-6">
                <h3 className="text-xs font-bold text-accent-blue uppercase tracking-wider mb-2 sticky top-14 bg-[#050B14]/90 backdrop-blur py-2 z-10 flex items-center gap-2">
                  <span>{formatDate(date)}</span><span className="text-text-muted font-normal">· {matches.length}</span>
                  <span className="text-[10px] text-accent-gold/60 bg-accent-gold/10 px-1.5 py-0.5 rounded ml-auto">{currentTzLabel}</span>
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
                  <h3 className="text-xs font-bold text-accent-gold uppercase mb-3">{group}</h3>
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
          <div className="glass-card p-3 mb-4 text-center"><p className="text-xs text-text-secondary">{hasLiveStandings ? '📊 Tablas con resultados reales' : '📊 Tablas simuladas por Elo'}</p></div>
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
                    <h3 className="text-xs font-bold text-accent-gold uppercase mb-2">Grupo {group} <span className="text-[9px] text-text-muted font-normal">(Elo)</span></h3>
                    <table className="w-full text-[10px]"><thead><tr className="text-text-muted"><th className="text-left pb-1" scope="col">#</th><th className="text-left pb-1" scope="col">Equipo</th><th className="text-center pb-1" scope="col">Elo</th></tr></thead><tbody>
                      {sorted.map((t, i) => (<tr key={t.name} className={i < 2 ? 'text-accent-emerald' : ''}><td className="py-0.5 text-text-muted">{i + 1}</td><td className="py-0.5"><span className="mr-1">{t.flag}</span><span className="text-white truncate block max-w-[100px]">{t.name}</span></td><td className="py-0.5 text-center font-mono">{ELO_RATINGS[t.name]?.elo || 1500}</td></tr>))}
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
              <div key={name} className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="w-7 text-center text-sm font-bold">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}</span>
                    <span className="text-2xl">{getFlag(name)}</span>
                    <span className="text-sm text-white font-medium">{name}</span>
                  </div>
                  <span className="text-xl font-bold text-accent-blue font-mono">{pct}%</span>
                </div>
                <div className="w-full h-3 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: i === 0 ? 'linear-gradient(90deg, #D4AF37, #E6C84A)' : i < 3 ? 'rgba(43, 127, 255, 0.5)' : 'rgba(43, 127, 255, 0.25)' }} />
                </div>
              </div>
            );
          }) : (
            <div className="glass-card p-10 text-center">
              <div className="text-4xl mb-3">🏆</div><p className="text-sm text-white font-semibold mb-1">Sin simulación</p><p className="text-xs text-text-muted mb-4">Presiona "Simular" para probabilidades de campeón</p>
              <button onClick={runSimulation} disabled={simulating} className="btn-premium text-sm px-6 py-2 disabled:opacity-50">{simulating ? '⏳...' : '⚡ Simular (100 runs)'}</button>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: BRACKET ═══ */}
      {!loading && !error && mainTab === 'bracket' && (
        <div className="animate-fade-in space-y-6">
          {bracket ? (
            <>
              {bracket.roundOf32?.length > 0 && (<><h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">1/16 Final</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{bracket.roundOf32.map((m: any) => <BracketCard key={m.id} match={m} getFlag={getFlag} />)}</div></>)}
              {bracket.roundOf16?.length > 0 && (<><h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Octavos</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{bracket.roundOf16.map((m: any) => <BracketCard key={m.id} match={m} getFlag={getFlag} />)}</div></>)}
              {bracket.quarters?.length > 0 && (<><h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Cuartos</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{bracket.quarters.map((m: any) => <BracketCard key={m.id} match={m} getFlag={getFlag} />)}</div></>)}
              {bracket.semis?.length > 0 && (<><h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Semifinales</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{bracket.semis.map((m: any) => <BracketCard key={m.id} match={m} getFlag={getFlag} />)}</div></>)}
              {bracket.final && (<div className="glass-card p-6 text-center border border-accent-gold/20"><div className="text-4xl mb-2">🏆 FINAL</div>{bracket.champion && <div className="text-lg font-bold text-gradient-gold mb-3">{bracket.champion}</div>}{bracket.final.homeTeam && (<div className="flex items-center justify-center gap-4 text-sm"><span className="text-white">{getFlag(bracket.final.homeTeam)} {bracket.final.homeTeam}</span><span className="font-bold text-accent-blue">{bracket.final.homeScore} — {bracket.final.awayScore}</span><span className="text-white">{bracket.final.awayTeam} {getFlag(bracket.final.awayTeam)}</span></div>)}</div>)}
            </>
          ) : (
            <div className="glass-card p-10 text-center"><div className="text-4xl mb-3">📐</div><p className="text-sm text-white font-semibold mb-1">Bracket en espera</p><p className="text-xs text-text-muted mb-4">Simula el torneo para ver el bracket</p><button onClick={runSimulation} disabled={simulating} className="btn-premium text-sm px-6 py-2 disabled:opacity-50">{simulating ? '⏳...' : '⚡ Simular'}</button></div>
          )}
        </div>
      )}

      {selectedMatch && <MatchDetailModal match={selectedMatch} getFlag={getFlag} getRoundLabel={getRoundLabel} onClose={() => setSelectedMatch(null)} />}
      <footer className="text-center py-4 text-[11px] text-text-muted border-t border-white/[0.04] mt-8"><p>FORCH.i © 2026 · Poisson + Dixon-Coles + Elo · WC2026</p></footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUBCOMPONENTS
// ═══════════════════════════════════════════════════════════════

function StandingsTable({ group, teams, getFlag }: { group: string; teams: any[]; getFlag: (n: string) => string }) {
  return (
    <div className="glass-card p-3">
      <h3 className="text-xs font-bold text-accent-gold uppercase mb-2">Grupo {group}</h3>
      <table className="w-full text-[10px]"><thead><tr className="text-text-muted">
        <th className="text-left pb-1" scope="col">#</th><th className="text-left pb-1" scope="col">Equipo</th>
        <th className="text-center pb-1" scope="col">PJ</th><th className="text-center pb-1" scope="col">PG</th>
        <th className="text-center pb-1" scope="col">PE</th><th className="text-center pb-1" scope="col">PP</th>
        <th className="text-center pb-1" scope="col">GF</th><th className="text-center pb-1" scope="col">GC</th>
        <th className="text-center pb-1" scope="col">DG</th><th className="text-center pb-1" scope="col">Pts</th>
      </tr></thead><tbody>
        {teams.map((t, i) => (<tr key={t.name} className={i < 2 ? 'text-accent-emerald' : i < 4 ? '' : 'text-text-muted/60'}>
          <td className="py-0.5 text-text-muted">{i + 1}</td><td className="py-0.5"><span className="mr-1">{getFlag(t.name)}</span><span className="text-white truncate block max-w-[70px]">{t.name}</span></td>
          <td className="py-0.5 text-center">{t.played}</td><td className="py-0.5 text-center">{t.won}</td><td className="py-0.5 text-center">{t.drawn}</td>
          <td className="py-0.5 text-center">{t.lost}</td><td className="py-0.5 text-center">{t.gf}</td><td className="py-0.5 text-center">{t.ga}</td>
          <td className="py-0.5 text-center">{t.gd > 0 ? '+' : ''}{t.gd}</td><td className="py-0.5 text-center font-bold">{t.points}</td>
        </tr>))}
      </tbody></table>
      <div className="mt-1 text-[9px] text-text-muted"><span className="text-accent-emerald">■</span> Clasifica<span className="ml-2 text-text-muted/60">■</span> Posible 3°</div>
    </div>
  );
}

function BracketCard({ match, getFlag }: { match: any; getFlag: (n: string) => string }) {
  if (!match) return null;
  return (
    <div className={`glass-card p-3 ${match.isPlayed ? 'border-l-2 border-l-accent-emerald' : ''}`}>
      <div className="flex items-center justify-between mb-1"><span className="text-[10px] text-text-muted">{match.roundLabel || ''}</span>{match.isPlayed && <span className="text-[10px] text-accent-emerald">✅</span>}</div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs"><span className={`text-white ${match.winner === match.homeTeam ? 'font-bold text-accent-blue' : ''}`}>{getFlag(match.homeTeam)} {match.homeTeam}</span><span className={`font-mono font-bold px-2 py-0.5 rounded ${match.winner === match.homeTeam ? 'bg-accent-blue/15 text-accent-blue' : 'bg-white/[0.06] text-text-muted'}`}>{match.homeScore ?? '-'}</span></div>
        <div className="flex items-center justify-between text-xs"><span className={`text-white ${match.winner === match.awayTeam ? 'font-bold text-accent-blue' : ''}`}>{getFlag(match.awayTeam)} {match.awayTeam}</span><span className={`font-mono font-bold px-2 py-0.5 rounded ${match.winner === match.awayTeam ? 'bg-accent-blue/15 text-accent-blue' : 'bg-white/[0.06] text-text-muted'}`}>{match.awayScore ?? '-'}</span></div>
      </div>
    </div>
  );
}

function MatchCard({ match, getFlag, getRoundLabel, onDetail }: { match: FixtureMatch; getFlag: (n: string) => string; getRoundLabel: (r: string) => string; onDetail: () => void; }) {
  const local = match.date && match.time ? utcToLocal(match.date, match.time) : null;
  const isKO = match.round !== 'group';
  const isTight = match.homeGoals !== null && match.homeGoals === match.awayGoals && isKO;
  return (
    <button onClick={onDetail} className="glass-card p-3 hover:border-white/[0.1] transition-colors w-full text-left cursor-pointer group">
      <div className="flex items-center justify-between mb-1"><span className="text-[10px] text-text-muted font-medium">{getRoundLabel(match.round)}</span><div className="flex items-center gap-1.5">{match.confidence && (<span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${match.confidence === 'alta' ? 'bg-accent-emerald/15 text-accent-emerald' : match.confidence === 'media' ? 'bg-accent-amber/15 text-accent-amber' : 'bg-white/[0.06] text-text-muted'}`}>{match.confidence}</span>)}<span className="text-[10px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">👁 Ver</span></div></div>
      {local && <div className="text-[10px] text-accent-blue/70 mb-1">🕐 {local.display}</div>}
      {match.homeGoals !== null ? (<>
        <div className="flex items-center justify-between mb-1"><div className="flex items-center gap-2"><span className="text-base">{getFlag(match.homeTeam)}</span><span className="text-xs text-white font-medium truncate max-w-[120px]">{match.homeTeam}</span></div><span className="text-sm font-bold font-mono text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded">{match.homeGoals}</span></div>
        <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-base">{getFlag(match.awayTeam)}</span><span className="text-xs text-white font-medium truncate max-w-[120px]">{match.awayTeam}</span></div><span className="text-sm font-bold font-mono text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded">{match.awayGoals}</span></div>
        {isTight && (<div className="mt-1 text-[10px] text-accent-amber/80 bg-accent-amber/10 px-2 py-0.5 rounded text-center">⚽ Empate 90 min → {match.penalties ? 'Gana en penales' : 'Gana en alargue'}</div>)}
        {match.homeWin !== null && (<div className="mt-2"><div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden"><div style={{ width: `${match.homeWin}%` }} className="bg-accent-blue/60" /><div style={{ width: `${match.draw}%` }} className="bg-white/20" /><div style={{ width: `${match.awayWin}%` }} className="bg-accent-crimson/60" /></div><div className="flex justify-between text-[9px] text-text-muted mt-0.5"><span>{match.homeWin}%</span><span>{match.draw}%</span><span>{match.awayWin}%</span></div></div>)}
      </>) : (<div className="text-center py-3"><span className="text-[10px] text-text-muted">Por definir</span></div>)}
    </button>
  );
}

function MatchRowCompact({ match, getFlag, onDetail }: { match: FixtureMatch; getFlag: (n: string) => string; onDetail: () => void; }) {
  return (
    <button onClick={onDetail} className="flex items-center justify-between text-xs py-1.5 w-full text-left hover:bg-white/[0.03] rounded px-1 -mx-1 transition-colors cursor-pointer">
      <div className="flex items-center gap-1.5 flex-1 min-w-0"><span className="text-sm shrink-0">{getFlag(match.homeTeam)}</span><span className="text-text-primary truncate">{match.homeTeam}</span></div>
      {match.homeGoals !== null ? (<span className="font-bold font-mono text-accent-blue mx-2 shrink-0">{match.homeGoals} - {match.awayGoals}</span>) : (<span className="text-text-muted mx-2 shrink-0">vs</span>)}
      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end"><span className="text-text-primary truncate text-right">{match.awayTeam}</span><span className="text-sm shrink-0">{getFlag(match.awayTeam)}</span></div>
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
      <div className="relative w-full sm:max-w-lg bg-[#0A1628] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-text-secondary transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        <div className="p-5 pb-4 border-b border-white/[0.06]">
          <div className="text-[10px] text-accent-blue font-semibold uppercase tracking-wider mb-3">{match.round === 'group' ? `Grupo ${match.group}` : getRoundLabel(match.round)}{match.venue ? ` · ${match.venue}` : ''}</div>
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center"><div className="text-3xl mb-1">{getFlag(match.homeTeam)}</div><div className="text-sm font-bold text-white">{match.homeTeam}</div></div>
            {match.homeGoals !== null ? (<div className="px-4 py-2 bg-white/[0.06] rounded-xl"><div className="text-2xl font-bold font-mono text-accent-blue">{match.homeGoals} — {match.awayGoals}</div><div className="text-[10px] text-text-muted text-center">Predicción</div>{isTight && <div className="text-[9px] text-accent-amber/80 mt-1">⚽ {match.penalties ? 'Penales' : 'Alargue'}</div>}</div>) : (<div className="px-4 py-2 bg-white/[0.06] rounded-xl"><div className="text-lg font-bold text-text-muted">vs</div></div>)}
            <div className="flex-1 text-center"><div className="text-3xl mb-1">{getFlag(match.awayTeam)}</div><div className="text-sm font-bold text-white">{match.awayTeam}</div></div>
          </div>
        </div>
        {match.homeGoals !== null && (<>
          <div className="p-5 border-b border-white/[0.06]"><h4 className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider mb-3">Probabilidades</h4><div className="grid grid-cols-3 gap-2 mb-3"><div className="text-center p-2 bg-accent-blue/10 rounded-lg"><div className="text-lg font-bold text-accent-blue">{match.homeWin}%</div><div className="text-[10px] text-text-muted">Local</div></div><div className="text-center p-2 bg-white/[0.06] rounded-lg"><div className="text-lg font-bold text-white">{match.draw}%</div><div className="text-[10px] text-text-muted">Empate</div></div><div className="text-center p-2 bg-accent-crimson/10 rounded-lg"><div className="text-lg font-bold text-accent-crimson">{match.awayWin}%</div><div className="text-[10px] text-text-muted">Visitante</div></div></div><div className="flex gap-0.5 h-2 rounded-full overflow-hidden"><div style={{ width: `${match.homeWin}%` }} className="bg-accent-blue/70" /><div style={{ width: `${match.draw}%` }} className="bg-white/20" /><div style={{ width: `${match.awayWin}%` }} className="bg-accent-crimson/70" /></div></div>
          <div className="p-5 border-b border-white/[0.06]"><h4 className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider mb-3">Comparación</h4><div className="mb-3"><div className="flex justify-between text-xs mb-1"><span className="text-white">{match.homeTeam}</span><span className="text-text-muted">Elo</span><span className="text-white">{match.awayTeam}</span></div><div className="flex items-center gap-2"><span className="text-sm font-bold font-mono text-accent-blue w-10 text-right">{homeElo}</span><div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden"><div className="h-full bg-accent-blue" style={{ width: `${Math.max(20, Math.min(80, 50 + eloDiff * 0.1))}%` }} /></div><span className="text-sm font-bold font-mono text-accent-crimson w-10">{awayElo}</span></div><div className="text-[10px] text-text-muted text-center mt-0.5">Diferencia: {eloDiff > 0 ? '+' : ''}{eloDiff}</div></div>{['attack', 'midfield', 'defense'].map((stat) => { const h = homePower[stat as keyof typeof homePower]; const a = awayPower[stat as keyof typeof awayPower]; const l: Record<string, string> = { attack: 'Ataque', midfield: 'Medio', defense: 'Defensa' }; return (<div key={stat} className="mb-2.5"><div className="flex justify-between text-[11px] mb-1"><span className="text-white">{h}</span><span className="text-text-muted">{l[stat]}</span><span className="text-white">{a}</span></div><div className="flex h-1.5 rounded-full overflow-hidden"><div className="bg-accent-blue/60" style={{ width: `${(h / (h + a)) * 100}%` }} /><div className="bg-accent-crimson/60" style={{ width: `${(a / (h + a)) * 100}%` }} /></div></div>); })}</div>
          {match.topScores && match.topScores.length > 0 && (<div className="p-5 border-b border-white/[0.06]"><h4 className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider mb-3">Marcadores Probables</h4><div className="space-y-1.5">{match.topScores.slice(0, 5).map((s, i) => (<div key={i} className="flex items-center gap-3 text-xs"><span className="text-text-muted w-4 text-right">{i + 1}</span><span className="font-mono font-bold text-white w-8">{s.home}-{s.away}</span><div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden"><div className="h-full bg-accent-gold/50" style={{ width: `${Math.min(100, s.probability * 3)}%` }} /></div><span className="text-text-muted w-10 text-right">{s.probability}%</span></div>))}</div></div>)}
          {match.confidence && (<div className="p-4 border-t border-white/[0.06] flex items-center justify-center"><span className={`text-xs font-semibold px-4 py-1.5 rounded-full ${match.confidence === 'alta' ? 'bg-accent-emerald/15 text-accent-emerald' : match.confidence === 'media' ? 'bg-accent-amber/15 text-accent-amber' : 'bg-white/[0.06] text-text-muted'}`}>Confianza: {match.confidence.charAt(0).toUpperCase() + match.confidence.slice(1)}</span></div>)}
        </>)}
      </div>
    </div>
  );
}
