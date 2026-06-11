'use client';

import { useState, useEffect } from 'react';
import { ALL_MATCHES } from '@/lib/matches';
import { getTeamByName } from '@/lib/teams';

type ViewMode = 'fecha' | 'grupo';
type PhaseFilter = string;

interface FixtureMatch {
  id: string;
  group: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  venue: string;
  round: string;
  homeGoals: number | null;
  awayGoals: number | null;
  homeWin: number | null;
  draw: number | null;
  awayWin: number | null;
  confidence: string | null;
  xGHome: number | null;
  xGAway: number | null;
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

  useEffect(() => { loadFixtures(); }, []);

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
        round: m.round,
        homeGoals: m.predictedScore?.[0] ?? null,
        awayGoals: m.predictedScore?.[1] ?? null,
        homeWin: m.homeWinPct ?? null,
        draw: m.drawPct ?? null,
        awayWin: m.awayWinPct ?? null,
        confidence: m.confidence ?? null,
        xGHome: m.xG?.[0] ?? null,
        xGAway: m.xG?.[1] ?? null,
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
    { id: 'third', label: '3° (1)' },
    { id: 'final', label: 'Final (1)' },
  ];

  const filtered = phaseFilter === 'all' ? fixtures : fixtures.filter(m => m.round === phaseFilter);

  const groupedByDate = filtered.reduce<Record<string, FixtureMatch[]>>((acc, m) => {
    const key = m.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
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
    <div className="px-4 md:px-6 lg:px-8 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">⚡ Pronósticos</h1>
            <p className="text-sm text-text-secondary">
              {predictedCount} / {fixtures.length || 128} partidos predichos · Motor Poisson + Elo + xG
            </p>
          </div>
          <button onClick={generateAll} disabled={generating} className="btn-premium text-xs px-4 py-2 disabled:opacity-50">
            {generating ? '⏳...' : '⚡ Generar Todo'}
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent-blue to-accent-emerald rounded-full transition-all duration-500"
            style={{ width: `${fixtures.length > 0 ? (predictedCount / fixtures.length) * 100 : 0}%` }}
          />
        </div>
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

      {/* View mode toggle */}
      <div className="flex items-center gap-2 mb-6 animate-fade-in">
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
            Object.entries(groupedByDate).map(([date, matches]) => (
              <div key={date} className="mb-6">
                <h3 className="text-xs font-bold text-accent-blue uppercase tracking-wider mb-2 sticky top-14 bg-[#050B14]/90 backdrop-blur py-2 z-10 flex items-center gap-2">
                  <span>{formatDate(date)}</span>
                  <span className="text-text-muted font-normal">· {matches.length} partidos</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {matches.map(m => <MatchCard key={m.id} match={m} getFlag={getFlag} getRoundLabel={getRoundLabel} />)}
                </div>
              </div>
            ))
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Object.entries(groupedByGroup).map(([group, matches]) => (
                <div key={group} className="glass-card p-3">
                  <h3 className="text-xs font-bold text-accent-gold uppercase mb-3">{group}</h3>
                  <div className="space-y-1.5">
                    {matches.map(m => <MatchRowCompact key={m.id} match={m} getFlag={getFlag} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MatchCard({ match, getFlag, getRoundLabel }: {
  match: FixtureMatch;
  getFlag: (name: string) => string;
  getRoundLabel: (round: string) => string;
}) {
  return (
    <div className="glass-card p-3 hover:border-white/[0.1] transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-text-muted font-medium">{getRoundLabel(match.round)}</span>
        {match.confidence && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            match.confidence === 'alta' ? 'bg-accent-emerald/15 text-accent-emerald' :
            match.confidence === 'media' ? 'bg-accent-amber/15 text-accent-amber' :
            'bg-white/[0.06] text-text-muted'
          }`}>
            {match.confidence}
          </span>
        )}
      </div>

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
    </div>
  );
}

function MatchRowCompact({ match, getFlag }: {
  match: FixtureMatch;
  getFlag: (name: string) => string;
}) {
  return (
    <div className="flex items-center justify-between text-xs py-1">
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
    </div>
  );
}
