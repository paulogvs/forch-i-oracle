'use client';

import { useState, useEffect, useCallback } from 'react';
import { ALL_MATCHES } from '@/lib/matches';

// ═══════════════════════════════════════════════════════════════
// RESULT ENTRY SECTION
// ═══════════════════════════════════════════════════════════════

function ResultEntrySection() {
  const [form, setForm] = useState({ matchId: '', homeScore: 0, awayScore: 0 });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roundFilter, setRoundFilter] = useState('todos');

  interface MatchOption {
    id: string;
    homeTeam: string;
    awayTeam: string;
    date: string;
    round: string;
    group: string;
  }

  const allMatches: MatchOption[] = ALL_MATCHES.map(m => ({
    id: m.id,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    date: m.date,
    round: m.round,
    group: m.group,
  }));

  const rounds = [
    { id: 'todos', label: 'Todos' },
    { id: 'group', label: 'Grupos' },
    { id: 'round-32', label: '1/16' },
    { id: 'round-16', label: '1/8' },
    { id: 'quarter', label: '1/4' },
    { id: 'semi', label: '1/2' },
    { id: 'final', label: 'Final' },
  ];

  const filteredMatches = allMatches.filter(m => {
    const matchRound = roundFilter === 'todos' ? true : m.round === roundFilter;
    const matchSearch = searchTerm === '' ||
      m.homeTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.awayTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchRound && matchSearch;
  });

  const getRoundLabel = (round: string) => {
    const labels: Record<string, string> = {
      group: 'Grupo',
      'round-32': '1/16',
      'round-16': '1/8',
      quarter: '1/4',
      semi: '1/2',
      third: '3°',
      final: 'Final',
    };
    return labels[round] || round;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.matchId) return;

    setLoading(true);
    setResult(null);

    try {
      const match = ALL_MATCHES.find(m => m.id === form.matchId);
      if (!match) throw new Error('Partido no encontrado');

      const res = await fetch('/api/match-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: form.matchId,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          homeScore: form.homeScore,
          awayScore: form.awayScore,
          competition: 'World Cup',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando resultado');

      setResult({ success: true, message: data.message });
      loadResults();
      setForm({ matchId: '', homeScore: 0, awayScore: 0 });
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : 'Error desconocido' });
    } finally {
      setLoading(false);
    }
  };

  const loadResults = async () => {
    try {
      const res = await fetch('/api/simulate-tournament');
      const data = await res.json();
      if (data.success) setRecentResults(data.results || []);
    } catch { /* ignore */ }
  };

  useEffect(() => { loadResults(); }, []);

  return (
    <div className="glass-card p-6 mb-8 animate-fade-in-up">
      <h3 className="text-sm font-bold text-accent-blue uppercase tracking-wider mb-4">
        ⚽ Registrar Resultado Real
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-text-secondary mb-2">Buscar partido</label>
          <input
            type="text"
            placeholder="Buscar equipo o ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-accent-blue/50 focus:outline-none transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {rounds.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRoundFilter(r.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                roundFilter === r.id
                  ? 'bg-accent-blue/20 text-accent-blue'
                  : 'bg-white/[0.04] text-text-secondary hover:text-white'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="max-h-48 overflow-y-auto space-y-1">
          {filteredMatches.slice(0, 30).map(m => {
            const isSelected = form.matchId === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setForm(prev => ({ ...prev, matchId: m.id }))}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                  isSelected
                    ? 'bg-accent-blue/15 border border-accent-blue/30'
                    : 'hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-text-muted font-mono w-10">{m.id}</span>
                  <span className="text-accent-gold w-8">{getRoundLabel(m.round)}</span>
                  <span className="text-white">{m.homeTeam}</span>
                  <span className="text-text-muted">vs</span>
                  <span className="text-white">{m.awayTeam}</span>
                </div>
                <span className="text-text-muted">{m.date}</span>
              </button>
            );
          })}
        </div>

        {form.matchId && (
          <div className="flex items-center gap-4 p-4 bg-white/[0.03] rounded-xl">
            <div className="flex-1 text-center">
              <p className="text-xs text-text-secondary mb-2">
                {ALL_MATCHES.find(m => m.id === form.matchId)?.homeTeam}
              </p>
              <input
                type="number"
                min={0}
                max={20}
                value={form.homeScore}
                onChange={(e) => setForm(prev => ({ ...prev, homeScore: parseInt(e.target.value) || 0 }))}
                className="w-20 text-center text-3xl font-bold bg-white/[0.06] border border-white/[0.1] rounded-xl py-3 text-white focus:border-accent-blue/50 focus:outline-none"
              />
            </div>
            <span className="text-2xl text-text-muted font-bold">—</span>
            <div className="flex-1 text-center">
              <p className="text-xs text-text-secondary mb-2">
                {ALL_MATCHES.find(m => m.id === form.matchId)?.awayTeam}
              </p>
              <input
                type="number"
                min={0}
                max={20}
                value={form.awayScore}
                onChange={(e) => setForm(prev => ({ ...prev, awayScore: parseInt(e.target.value) || 0 }))}
                className="w-20 text-center text-3xl font-bold bg-white/[0.06] border border-white/[0.1] rounded-xl py-3 text-white focus:border-accent-blue/50 focus:outline-none"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !form.matchId}
          className="btn-premium w-full py-3"
        >
          {loading ? '⏳ Guardando...' : '✅ Guardar Resultado y Recalcular'}
        </button>

        {result && (
          <div className={`p-3 rounded-xl text-sm text-center ${
            result.success
              ? 'bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20'
              : 'bg-accent-crimson/10 text-accent-crimson border border-accent-crimson/20'
          }`}>
            {result.message}
          </div>
        )}
      </form>

      {recentResults.length > 0 && (
        <div className="mt-6 pt-4 border-t border-white/[0.06]">
          <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
            Resultados Ingresados ({recentResults.length})
          </h4>
          <div className="space-y-1">
            {recentResults.slice(0, 5).map((r, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-white/[0.02]">
                <span className="text-text-muted font-mono w-10">{r.matchId}</span>
                <span className="text-white flex-1 truncate text-center">{r.homeTeam} vs {r.awayTeam}</span>
                <span className="font-bold font-mono text-accent-blue">{r.homeScore} - {r.awayScore}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CRON JOBS SECTION
// ═══════════════════════════════════════════════════════════════

interface CronStatus {
  jobName: string;
  lastRun: string;
  status: string;
  durationMs?: number;
  recordsProcessed?: number;
  error?: string;
}

const JOB_LABELS: Record<string, string> = {
  'ingest-data': '📥 Ingesta de Datos',
  'recalculate-predictions': '🔄 Recalcular Predicciones',
  'simulate-tournament': '🏆 Simular Torneo',
};

const JOB_ENDPOINTS: Record<string, string> = {
  'ingest-data': '/api/cron/ingest',
  'recalculate-predictions': '/api/cron/recalculate',
  'simulate-tournament': '/api/cron/simulate',
};

export default function AdminPage() {
  const [secret, setSecret] = useState('');
  const [statuses, setStatuses] = useState<Record<string, CronStatus | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [globalLoading, setGlobalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!secret) { setError('Ingresa el CRON_SECRET para continuar'); return; }
    setGlobalLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cron/status?secret=${encodeURIComponent(secret)}`);
      const data = await res.json();
      if (data.success) setStatuses(data.jobs);
      else setError(data.error || 'Error obteniendo status');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setGlobalLoading(false);
    }
  }, [secret]);

  const triggerJob = async (jobName: string) => {
    if (!secret) { setError('Ingresa el CRON_SECRET para continuar'); return; }
    setLoading(prev => ({ ...prev, [jobName]: true }));
    setError(null);
    try {
      const res = await fetch(`${JOB_ENDPOINTS[jobName]}?secret=${encodeURIComponent(secret)}`);
      await res.json();
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error ejecutando job');
    } finally {
      setLoading(prev => ({ ...prev, [jobName]: false }));
    }
  };

  const formatDuration = (ms?: number): string => {
    if (!ms) return '—';
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTime = (iso?: string): string => {
    if (!iso) return 'Nunca';
    return new Date(iso).toLocaleString('es-MX', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  const statusColor = (status: string): string => {
    switch (status) {
      case 'success': return 'text-accent-emerald';
      case 'failed': return 'text-accent-crimson';
      case 'running': return 'text-accent-amber';
      default: return 'text-text-muted';
    }
  };

  return (
    <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
          ⚙️ Administración
        </h1>
        <p className="text-sm text-text-secondary">
          Registrar resultados reales y gestionar el sistema
        </p>
      </div>

      {/* Result entry */}
      <ResultEntrySection />

      {/* Cron jobs section */}
      <div className="glass-card p-6 mb-6 animate-fade-in-up stagger-1">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4">
          🔧 Cron Jobs (GitHub Actions)
        </h3>

        <div className="flex gap-3 mb-4">
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="CRON_SECRET"
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-accent-blue/50 focus:outline-none"
          />
          <button onClick={fetchStatus} disabled={globalLoading || !secret} className="btn-premium px-4 py-2 text-sm disabled:opacity-50">
            {globalLoading ? '⏳...' : '📊 Status'}
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl text-sm bg-accent-crimson/10 text-accent-crimson mb-4">{error}</div>
        )}

        <div className="space-y-3">
          {Object.entries(JOB_LABELS).map(([jobName, label]) => {
            const status = statuses[jobName];
            return (
              <div key={jobName} className="border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{label}</span>
                  <button
                    onClick={() => triggerJob(jobName)}
                    disabled={loading[jobName] || !secret}
                    className="px-3 py-1.5 text-xs bg-accent-blue/15 text-accent-blue rounded-lg hover:bg-accent-blue/25 transition-colors disabled:opacity-50"
                  >
                    {loading[jobName] ? '⏳...' : '▶ Ejecutar'}
                  </button>
                </div>
                {status && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div><span className="text-text-muted">Estado:</span> <span className={`font-medium ${statusColor(status.status)}`}>{status.status}</span></div>
                    <div><span className="text-text-muted">Última vez:</span> <span className="text-white">{formatTime(status.lastRun)}</span></div>
                    <div><span className="text-text-muted">Duración:</span> <span className="text-white">{formatDuration(status.durationMs)}</span></div>
                    <div><span className="text-text-muted">Registros:</span> <span className="text-white">{status.recordsProcessed ?? '—'}</span></div>
                  </div>
                )}
                {status?.error && <p className="mt-2 text-xs text-accent-crimson">Error: {status.error}</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Schedule info */}
      <div className="glass-card p-6 animate-fade-in-up stagger-2">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4">
          Programación Automática
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-white/[0.03] rounded-xl">
            <p className="text-accent-gold font-semibold text-sm">Cada 6 horas</p>
            <p className="text-xs text-text-secondary mt-1">Ingesta de datos</p>
          </div>
          <div className="p-3 bg-white/[0.03] rounded-xl">
            <p className="text-accent-gold font-semibold text-sm">Cada 12 horas</p>
            <p className="text-xs text-text-secondary mt-1">Recalcular predicciones</p>
          </div>
          <div className="p-3 bg-white/[0.03] rounded-xl">
            <p className="text-accent-gold font-semibold text-sm">Diario 00:00 UTC</p>
            <p className="text-xs text-text-secondary mt-1">Simular torneo (100 runs)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
