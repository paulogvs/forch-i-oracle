// FORCH.i ORACLE — Admin Dashboard
// Manage cron jobs, view system status, and trigger manual operations.
// Route: /admin
// Security: CRON_SECRET is entered manually, never embedded in client code.

'use client';

import { useState, useCallback } from 'react';

interface CronStatus {
  jobName: string;
  lastRun: string;
  status: string;
  durationMs?: number;
  recordsProcessed?: number;
  error?: string;
}

interface JobResult {
  success: boolean;
  duration?: number;
  [key: string]: unknown;
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
  const [results, setResults] = useState<Record<string, JobResult | null>>({});
  const [globalLoading, setGlobalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!secret) {
      setError('Ingresa el CRON_SECRET para continuar');
      return;
    }

    setGlobalLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/cron/status?secret=${encodeURIComponent(secret)}`);
      const data = await res.json();

      if (data.success) {
        setStatuses(data.jobs);
      } else {
        setError(data.error || 'Error obteniendo status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setGlobalLoading(false);
    }
  }, [secret]);

  const triggerJob = async (jobName: string) => {
    if (!secret) {
      setError('Ingresa el CRON_SECRET para continuar');
      return;
    }

    setLoading(prev => ({ ...prev, [jobName]: true }));
    setError(null);

    try {
      const res = await fetch(`${JOB_ENDPOINTS[jobName]}?secret=${encodeURIComponent(secret)}`);
      const data = await res.json();

      setResults(prev => ({ ...prev, [jobName]: data }));

      // Refresh status after job
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error ejecutando job');
    } finally {
      setLoading(prev => ({ ...prev, [jobName]: false }));
    }
  };

  const triggerAll = async () => {
    for (const jobName of Object.keys(JOB_ENDPOINTS)) {
      await triggerJob(jobName);
    }
  };

  const formatDuration = (ms?: number): string => {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTime = (iso?: string): string => {
    if (!iso) return 'Nunca';
    const date = new Date(iso);
    return date.toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusColor = (status: string): string => {
    switch (status) {
      case 'success': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'running': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-mesh py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-wc-white mb-2">
            🔧 Panel de Administración
          </h1>
          <p className="text-wc-silver">
            FORCH.i ORACLE — Gestión de datos y predicciones
          </p>
        </div>

        {/* Secret Input */}
        <div className="glass-card p-6 mb-6">
          <h2 className="text-xl font-semibold text-wc-white mb-4">🔐 Autenticación</h2>
          <div className="flex gap-3">
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="CRON_SECRET"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-forch-gold/50"
            />
            <button
              onClick={fetchStatus}
              disabled={globalLoading || !secret}
              className="btn-premium px-4 py-2 text-sm disabled:opacity-50"
            >
              {globalLoading ? '⏳ Cargando...' : '📊 Ver Status'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="glass-card border-l-4 border-red-500 p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="glass-card p-6 mb-6">
          <h2 className="text-xl font-semibold text-wc-white mb-4">Acciones Rápidas</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={triggerAll}
              disabled={globalLoading || !secret}
              className="px-4 py-2 text-sm bg-gradient-to-r from-forch-green to-emerald-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              🚀 Ejecutar Todo
            </button>
          </div>
        </div>

        {/* Cron Jobs */}
        <div className="glass-card p-6 mb-6">
          <h2 className="text-xl font-semibold text-wc-white mb-4">Jobs Programados</h2>
          <div className="space-y-4">
            {Object.entries(JOB_LABELS).map(([jobName, label]) => {
              const status = statuses[jobName];
              const isLoading = loading[jobName];
              const result = results[jobName];

              return (
                <div key={jobName} className="border border-wc-silver/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-medium text-wc-white">{label}</h3>
                    <button
                      onClick={() => triggerJob(jobName)}
                      disabled={isLoading || !secret}
                      className="px-3 py-1.5 text-xs bg-wc-blue/20 text-wc-blue rounded hover:bg-wc-blue/30 transition-colors disabled:opacity-50"
                    >
                      {isLoading ? '⏳ Ejecutando...' : '▶ Ejecutar'}
                    </button>
                  </div>

                  {status && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-wc-silver">Estado:</span>
                        <span className={`ml-2 font-medium ${statusColor(status.status)}`}>
                          {status.status}
                        </span>
                      </div>
                      <div>
                        <span className="text-wc-silver">Última ejecución:</span>
                        <span className="ml-2 text-wc-white">{formatTime(status.lastRun)}</span>
                      </div>
                      <div>
                        <span className="text-wc-silver">Duración:</span>
                        <span className="ml-2 text-wc-white">{formatDuration(status.durationMs)}</span>
                      </div>
                      <div>
                        <span className="text-wc-silver">Registros:</span>
                        <span className="ml-2 text-wc-white">{status.recordsProcessed ?? '—'}</span>
                      </div>
                    </div>
                  )}

                  {status?.error && (
                    <p className="mt-2 text-sm text-red-400">Error: {status.error}</p>
                  )}

                  {result && result.success && (
                    <div className="mt-2 p-2 bg-green-500/10 rounded text-sm text-green-400">
                      ✅ Completado en {formatDuration(result.duration)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Schedule Info */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-wc-white mb-4">Programación Automática</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-wc-navy-light/50 rounded-lg">
              <p className="text-forch-gold font-medium">Cada 6 horas</p>
              <p className="text-sm text-wc-silver mt-1">Ingesta de datos desde API-Football</p>
            </div>
            <div className="p-3 bg-wc-navy-light/50 rounded-lg">
              <p className="text-forch-gold font-medium">Cada 12 horas</p>
              <p className="text-sm text-wc-silver mt-1">Recalcular predicciones</p>
            </div>
            <div className="p-3 bg-wc-navy-light/50 rounded-lg">
              <p className="text-forch-gold font-medium">Diario (00:00 UTC)</p>
              <p className="text-sm text-wc-silver mt-1">Simulación de torneo (100 runs)</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-wc-silver">
          <p>Built with FORCH.i by Paulo Velasco</p>
        </div>
      </div>
    </div>
  );
}
