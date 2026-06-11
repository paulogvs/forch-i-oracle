'use client';

import { useState, useEffect } from 'react';
import { ALL_MATCHES } from '@/lib/matches';
import { getTeamByName, ELO_RATINGS, POWER_RATINGS } from '@/lib/teams';
import { utcToLocal, getUserTimezoneOffset, getTimezoneLabel, TIMEZONE_PRESETS } from '@/lib/timezone';

type ViewMode = 'fecha' | 'grupo';
type PhaseFilter = string;

interface FixtureMatch {
  id: string;
  group: string;
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  venue: string;
  city: string;
  round: string;
  homeGoals: number | null;
  awayGoals: number | null;
  homeWin: number | null;
  draw: number | null;
  awayWin: number | null;
  confidence: string | null;
  xGHome: number | null;
  xGAway: number | null;
  homeAttack: number | null;
  homeDefense: number | null;
  homeMidfield: number | null;
  awayAttack: number | null;
  awayDefense: number | null;
  awayMidfield: number | null;
  homeElo: number | null;
  awayElo: number | null;
  topScores: { home: number; away: number; probability: number }[] | null;
  over25: number | null;
  btts: number | null;
  analysis: string | null;
  isPredicted: boolean;
  isPlayed: boolean;
  realHomeGoals: number | null;
  realAwayGoals: number | null;
}

export default function FixturePage() {
  const [viewMode, setViewMode] = useState<ViewMode>('fecha');
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all');
  const [fixtures, setFixtures] = useState<FixtureMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<FixtureMatch | null>(null);
  const [tzOffset, setTzOffset] = useState<number>(-4); // Default Bolivia

  useEffect(() => {
    // Auto-detect user timezone
    setTzOffset(getUserTimezoneOffset());
    loadFixtures();
  }, []);

  const loadFixtures = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/fixture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useEnhanced: true }),
      });
      const data = await res.json();
      if (!data.success) throw new Error('Error cargando pronósticos');

      const mapped: FixtureMatch[] = (data.fixture || []).map((m: any) => ({
        id: m.id,
        group: m.group || 'KO',
        date: m.date,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        venue: m.venue || '',
        city: m.city || '',
        time: m.time || '',
        round: m.round,
        homeGoals: m.predictedScore?.[0] ?? null,
        awayGoals: m.predictedScore?.[1] ?? null,
        homeWin: m.homeWinPct ?? null,
        draw: m.drawPct ?? null,
        awayWin: m.awayWinPct ?? null,
        confidence: m.confidence ?? null,
        xGHome: m.xG?.[0] ?? null,
        xGAway: m.xG?.[1] ?? null,
        homeAttack: m.homeAttack ?? null,
        homeDefense: m.homeDefense ?? null,
        homeMidfield: m.homeMidfield ?? null,
        awayAttack: m.awayAttack ?? null,
        awayDefense: m.awayDefense ?? null,
        awayMidfield: m.awayMidfield ?? null,
        homeElo: m.homeElo ?? null,
        awayElo: m.awayElo ?? null,
        topScores: m.topScores ?? null,
        over25: m.over25Probability ?? null,
        btts: m.bttsProbability ?? null,
        analysis: m.analysis ?? null,
        isPredicted: m.predictedScore !== null && m.predictedScore !== undefined,
        isPlayed: false,
        realHomeGoals: null,
        realAwayGoals: null,
      }));

      setFixtures(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const generateAll = async () => {
    setGenerating(true);
    try {
      await fetch('/api/accuracy', { method: 'POST' });
      await loadFixtures();
    } catch { /* ignore */ }
    finally { setGenerating(false); }
  };

  const PHASES: { id: PhaseFilter; label: string }[] = [
    { id: 'all', label: 'Todos (128)' },
    { id: 'group', label: 'Grupos (72)' },
    { id: 'round-32', label: '1/16 (16)' },
    { id: 'round-16', label: '1/8 (8)' },
    { id: 'quarter', label: '1/4 (4)' },
    { id: 'semi', label: 'Semis (2)' },
    { id: 'final', label: 'Final (1)' },
  ];

  const filtered = phaseFilter === 'all' ? fixtures : fixtures.filter(m => m.round === phaseFilter);

  // Group by LOCAL date (after timezone conversion)
  const groupedByDate = filtered.reduce<Record<string, { matches: FixtureMatch[]; localTime: string }>>((acc, m) => {
    const local = utcToLocal(m.date, m.time || '00:00');
    if (!acc[local.date]) acc[local.date] = { matches: [], localTime: local.time };
    acc[local.date].matches.push({ ...m, time: local.time });
    return acc;
  }, {});

  const groupedByGroup = filtered.reduce<Record<string, FixtureMatch[]>>((acc, m) => {
    const key = m.round === 'group' ? `Grupo ${m.group}` : 'Eliminatorias';
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const formatDate = (d: string) => {
    const dt = new Date(d + 'T12:00:00');
    return dt.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const currentTzLabel = getTimezoneLabel(tzOffset);

  const getRoundLabel = (round: string) => {
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
  };

  const getFlag = (name: string) => getTeamByName(name)?.flag || '❓';
  const predictedCount = fixtures.filter(f => f.isPredicted).length;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5 animate-fade-in">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">⚡ Pronósticos</h1>
          <p className="text-xs sm:text-sm text-text-secondary truncate">
            {predictedCount} / {fixtures.length || 128} partidos · Toca un partido para ver detalles
          </p>
        </div>
        <button onClick={generateAll} disabled={generating} className="btn-premium text-xs px-4 py-2 disabled:opacity-50 shrink-0">
          {generating ? '⏳...' : '⚡ Generar Todo'}
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-accent-blue to-accent-emerald rounded-full transition-all duration-500"
          style={{ width: `${fixtures.length > 0 ? (predictedCount / fixtures.length) * 100 : 0}%` }}
        />
      </div>

      {/* Phase filter */}
      <div className="flex overflow-x-auto scrollbar-hide gap-1.5 mb-4 pb-1 animate-fade-in">
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

      {/* Timezone selector + view mode */}
      <div className="flex flex-wrap items-center gap-2 mb-5 animate-fade-in">
        <select
          value={tzOffset}
          onChange={(e) => setTzOffset(Number(e.target.value))}
          className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-[11px] text-white focus:border-accent-blue/50 focus:outline-none"
        >
          {TIMEZONE_PRESETS.map(tz => (
            <option key={tz.offset} value={tz.offset} className="bg-[#0A1628]">{tz.label} ({getTimezoneLabel(tz.offset)})</option>
          ))}
        </select>
        <div className="flex gap-1 p-1 bg-white/[0.04] rounded-lg">
          <button
            onClick={() => setViewMode('fecha')}
            className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
              viewMode === 'fecha' ? 'bg-white/[0.08] text-white' : 'text-text-secondary hover:text-white'
            }`}
          >
            📅 Por Fecha
          </button>
          <button
            onClick={() => setViewMode('grupo')}
            className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
              viewMode === 'grupo' ? 'bg-white/[0.08] text-white' : 'text-text-secondary hover:text-white'
            }`}
          >
            📋 Por Grupo
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-2 border-accent-blue/30 border-t-accent-blue animate-spin mb-4" />
          <p className="text-sm text-text-secondary">Cargando pronósticos...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="glass-card p-6 text-center">
          <p className="text-accent-crimson text-sm mb-4">{error}</p>
          <button onClick={loadFixtures} className="btn-premium text-sm px-4 py-2">Reintentar</button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <div className="animate-fade-in">
          {viewMode === 'fecha' ? (
            Object.entries(groupedByDate).map(([date, { matches }]) => (
              <div key={date} className="mb-6">
                <h3 className="text-xs font-bold text-accent-blue uppercase tracking-wider mb-2 sticky top-14 bg-[#050B14]/90 backdrop-blur py-2 z-10 flex items-center gap-2">
                  <span>{formatDate(date)}</span>
                  <span className="text-text-muted font-normal">· {matches.length} partidos</span>
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
                  <div className="space-y-1.5">
                    {matches.map(m => <MatchRowCompact key={m.id} match={m} getFlag={getFlag} onDetail={() => setSelectedMatch(m)} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Match Detail Modal */}
      {selectedMatch && <MatchDetailModal match={selectedMatch} getFlag={getFlag} onClose={() => setSelectedMatch(null)} />}
    </div>
  );
}

function MatchCard({ match, getFlag, getRoundLabel, onDetail }: {
  match: FixtureMatch;
  getFlag: (name: string) => string;
  getRoundLabel: (round: string) => string;
  onDetail: () => void;
}) {
  const local = match.date && match.time ? utcToLocal(match.date, match.time) : null;

  return (
    <button onClick={onDetail} className="glass-card p-3 hover:border-white/[0.1] transition-colors w-full text-left cursor-pointer group">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-text-muted font-medium">{getRoundLabel(match.round)}</span>
        <div className="flex items-center gap-1.5">
          {match.confidence && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              match.confidence === 'alta' ? 'bg-accent-emerald/15 text-accent-emerald' :
              match.confidence === 'media' ? 'bg-accent-amber/15 text-accent-amber' :
              'bg-white/[0.06] text-text-muted'
            }`}>
              {match.confidence}
            </span>
          )}
          <span className="text-[10px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">👁 Ver</span>
        </div>
      </div>

      {/* Local time */}
      {local && (
        <div className="text-[10px] text-accent-blue/70 mb-1.5 flex items-center gap-1">
          🕐 {local.display}
          {local.isDifferentDay && (
            <span className="text-[9px] text-accent-amber/80 bg-accent-amber/10 px-1 rounded">día diferente a UTC</span>
          )}
        </div>
      )}

      {match.homeGoals !== null ? (
        <>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-base">{getFlag(match.homeTeam)}</span>
              <span className="text-xs text-white font-medium truncate max-w-[120px]">{match.homeTeam}</span>
            </div>
            <span className="text-sm font-bold font-mono text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded">
              {match.homeGoals}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">{getFlag(match.awayTeam)}</span>
              <span className="text-xs text-white font-medium truncate max-w-[120px]">{match.awayTeam}</span>
            </div>
            <span className="text-sm font-bold font-mono text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded">
              {match.awayGoals}
            </span>
          </div>
          {/* 1X2 bar */}
          {match.homeWin !== null && (
            <div className="mt-2">
              <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
                <div style={{ width: `${match.homeWin}%` }} className="bg-accent-blue/60" />
                <div style={{ width: `${match.draw}%` }} className="bg-white/20" />
                <div style={{ width: `${match.awayWin}%` }} className="bg-accent-crimson/60" />
              </div>
              <div className="flex justify-between text-[9px] text-text-muted mt-0.5">
                <span>{match.homeWin}%</span>
                <span>{match.draw}%</span>
                <span>{match.awayWin}%</span>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-3">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-base">{getFlag(match.homeTeam)}</span>
            <span className="text-xs text-text-muted">vs</span>
            <span className="text-base">{getFlag(match.awayTeam)}</span>
          </div>
          <span className="text-[10px] text-text-muted">Por definir</span>
        </div>
      )}
    </button>
  );
}

function MatchRowCompact({ match, getFlag, onDetail }: {
  match: FixtureMatch;
  getFlag: (name: string) => string;
  onDetail: () => void;
}) {
  const local = match.date && match.time ? utcToLocal(match.date, match.time) : null;
  return (
    <button onClick={onDetail} className="flex items-center justify-between text-xs py-1.5 w-full text-left hover:bg-white/[0.03] rounded px-1 -mx-1 transition-colors cursor-pointer">
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-sm shrink-0">{getFlag(match.homeTeam)}</span>
        <span className="text-text-primary truncate">{match.homeTeam}</span>
      </div>
      {match.homeGoals !== null ? (
        <span className="font-bold font-mono text-accent-blue mx-2 shrink-0">
          {match.homeGoals} - {match.awayGoals}
        </span>
      ) : (
        <span className="text-text-muted mx-2 shrink-0">vs</span>
      )}
      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
        <span className="text-text-primary truncate text-right">{match.awayTeam}</span>
        <span className="text-sm shrink-0">{getFlag(match.awayTeam)}</span>
      </div>
      {local && (
        <span className="text-[9px] text-accent-blue/50 shrink-0 ml-2 w-12 text-right">{local.time}</span>
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// MATCH DETAIL MODAL
// ═══════════════════════════════════════════════════════════════

function MatchDetailModal({ match, getFlag, onClose }: {
  match: FixtureMatch;
  getFlag: (name: string) => string;
  onClose: () => void;
}) {
  const homeElo = match.homeElo || ELO_RATINGS[match.homeTeam]?.elo || 1500;
  const awayElo = match.awayElo || ELO_RATINGS[match.awayTeam]?.elo || 1500;
  const eloDiff = homeElo - awayElo;
  const homePower = POWER_RATINGS[match.homeTeam] || { attack: 50, defense: 50, midfield: 50 };
  const awayPower = POWER_RATINGS[match.awayTeam] || { attack: 50, defense: 50, midfield: 50 };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" />

      {/* Modal */}
      <div
        className="relative w-full sm:max-w-lg bg-[#0A1628] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button onClick={onClose} className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-text-secondary transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header - Teams + Score */}
        <div className="p-5 pb-4 border-b border-white/[0.06]">
          <div className="text-[10px] text-accent-blue font-semibold uppercase tracking-wider mb-3">
            {match.round === 'group' ? `Grupo ${match.group}` : getRoundLabel(match.round)} · {match.venue}{match.city ? `, ${match.city}` : ''}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              <div className="text-3xl mb-1">{getFlag(match.homeTeam)}</div>
              <div className="text-sm font-bold text-white">{match.homeTeam}</div>
            </div>
            {match.homeGoals !== null ? (
              <div className="px-4 py-2 bg-white/[0.06] rounded-xl">
                <div className="text-2xl font-bold font-mono text-accent-blue">
                  {match.homeGoals} — {match.awayGoals}
                </div>
                <div className="text-[10px] text-text-muted text-center">Predicción</div>
              </div>
            ) : (
              <div className="px-4 py-2 bg-white/[0.06] rounded-xl">
                <div className="text-lg font-bold text-text-muted">vs</div>
              </div>
            )}
            <div className="flex-1 text-center">
              <div className="text-3xl mb-1">{getFlag(match.awayTeam)}</div>
              <div className="text-sm font-bold text-white">{match.awayTeam}</div>
            </div>
          </div>
        </div>

        {match.homeGoals !== null && (
          <>
            {/* 1X2 Probabilities */}
            <div className="p-5 border-b border-white/[0.06]">
              <h4 className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider mb-3">Probabilidades</h4>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center p-2 bg-accent-blue/10 rounded-lg">
                  <div className="text-lg font-bold text-accent-blue">{match.homeWin}%</div>
                  <div className="text-[10px] text-text-muted">Local</div>
                </div>
                <div className="text-center p-2 bg-white/[0.06] rounded-lg">
                  <div className="text-lg font-bold text-white">{match.draw}%</div>
                  <div className="text-[10px] text-text-muted">Empate</div>
                </div>
                <div className="text-center p-2 bg-accent-crimson/10 rounded-lg">
                  <div className="text-lg font-bold text-accent-crimson">{match.awayWin}%</div>
                  <div className="text-[10px] text-text-muted">Visitante</div>
                </div>
              </div>
              <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
                <div style={{ width: `${match.homeWin}%` }} className="bg-accent-blue/70" />
                <div style={{ width: `${match.draw}%` }} className="bg-white/20" />
                <div style={{ width: `${match.awayWin}%` }} className="bg-accent-crimson/70" />
              </div>
            </div>

            {/* xG + Markets */}
            <div className="p-5 border-b border-white/[0.06]">
              <h4 className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider mb-3">Goles Esperados y Mercados</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 bg-white/[0.03] rounded-lg">
                  <div className="text-xs text-text-muted">xG {match.homeTeam}</div>
                  <div className="text-base font-bold text-white">{match.xGHome?.toFixed(2) || '—'}</div>
                </div>
                <div className="p-2.5 bg-white/[0.03] rounded-lg">
                  <div className="text-xs text-text-muted">xG {match.awayTeam}</div>
                  <div className="text-base font-bold text-white">{match.xGAway?.toFixed(2) || '—'}</div>
                </div>
                <div className="p-2.5 bg-white/[0.03] rounded-lg">
                  <div className="text-xs text-text-muted">Over 2.5</div>
                  <div className="text-base font-bold text-accent-emerald">{match.over25 ?? '—'}%</div>
                </div>
                <div className="p-2.5 bg-white/[0.03] rounded-lg">
                  <div className="text-xs text-text-muted">BTTS</div>
                  <div className="text-base font-bold text-accent-amber">{match.btts ?? '—'}%</div>
                </div>
              </div>
            </div>

            {/* Team Comparison */}
            <div className="p-5 border-b border-white/[0.06]">
              <h4 className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider mb-3">Comparación de Equipos</h4>

              {/* Elo */}
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white">{match.homeTeam}</span>
                  <span className="text-text-muted">Elo Rating</span>
                  <span className="text-white">{match.awayTeam}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold font-mono text-accent-blue w-10 text-right">{homeElo}</span>
                  <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full bg-accent-blue" style={{ width: `${Math.max(20, Math.min(80, 50 + eloDiff * 0.1))}%` }} />
                  </div>
                  <span className="text-sm font-bold font-mono text-accent-crimson w-10">{awayElo}</span>
                </div>
                <div className="text-[10px] text-text-muted text-center mt-0.5">Diferencia: {eloDiff > 0 ? '+' : ''}{eloDiff}</div>
              </div>

              {/* Power Ratings */}
              {['attack', 'midfield', 'defense'].map((stat) => {
                const homeVal = homePower[stat as keyof typeof homePower];
                const awayVal = awayPower[stat as keyof typeof awayPower];
                const labels: Record<string, string> = { attack: 'Ataque', midfield: 'Medio', defense: 'Defensa' };
                return (
                  <div key={stat} className="mb-2.5">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-white">{homeVal}</span>
                      <span className="text-text-muted">{labels[stat]}</span>
                      <span className="text-white">{awayVal}</span>
                    </div>
                    <div className="flex h-1.5 rounded-full overflow-hidden">
                      <div className="bg-accent-blue/60" style={{ width: `${(homeVal / (homeVal + awayVal)) * 100}%` }} />
                      <div className="bg-accent-crimson/60" style={{ width: `${(awayVal / (homeVal + awayVal)) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Top Scores */}
            {match.topScores && match.topScores.length > 0 && (
              <div className="p-5 border-b border-white/[0.06]">
                <h4 className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider mb-3">Marcadores Más Probables</h4>
                <div className="space-y-1.5">
                  {match.topScores.slice(0, 5).map((s, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs">
                      <span className="text-text-muted w-4 text-right">{i + 1}</span>
                      <span className="font-mono font-bold text-white w-8">{s.home}-{s.away}</span>
                      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full bg-accent-gold/50" style={{ width: `${Math.min(100, s.probability * 3)}%` }} />
                      </div>
                      <span className="text-text-muted w-10 text-right">{s.probability}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analysis */}
            {match.analysis && (
              <div className="p-5">
                <h4 className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider mb-2">Análisis</h4>
                <p className="text-xs text-text-secondary leading-relaxed">{match.analysis}</p>
              </div>
            )}
          </>
        )}

        {/* Confidence badge */}
        {match.confidence && match.homeGoals !== null && (
          <div className="p-4 border-t border-white/[0.06] flex items-center justify-center">
            <span className={`text-xs font-semibold px-4 py-1.5 rounded-full ${
              match.confidence === 'alta' ? 'bg-accent-emerald/15 text-accent-emerald' :
              match.confidence === 'media' ? 'bg-accent-amber/15 text-accent-amber' :
              'bg-white/[0.06] text-text-muted'
            }`}>
              Confianza: {match.confidence.charAt(0).toUpperCase() + match.confidence.slice(1)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function getRoundLabel(round: string): string {
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
