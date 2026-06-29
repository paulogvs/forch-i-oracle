'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { jsonFetcher } from '@/lib/swr/fetchers';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft, BarChart3, Target, TrendingUp, Activity, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

// ═══ TYPES ═════════════════════════════════════════════════════

interface CalibrationBin {
  binLabel: string; total: number; correct: number;
  accuracy: number; avgConfidence: number; calibrationError: number;
}

interface BacktestData {
  success: boolean;
  overall: {
    totalMatches: number; matchesWithBoth: number;
    winnerAccuracy: number; goalMAE: number;
    brierScore: number; exactScoreHits: number; withinOneGoal: number;
  };
  calibration: CalibrationBin[];
  byRound: {
    group: { total: number; correct: number; accuracy: number };
    knockout: { total: number; correct: number; accuracy: number };
  };
  matchComparisons: any[];
}

// ═══ HELPERS ═══════════════════════════════════════════════════

function formatPct(v: number): string {
  return `${Math.round(v)}%`;
}

function roundLabel(r: string): string {
  const map: Record<string, string> = {
    'group': 'Fase Grupos', 'R16': 'Octavos', 'QF': 'Cuartos',
    'SF': 'Semifinales', 'F': 'Final', 'TP': 'Tercer Puesto',
  };
  return map[r] || r;
}

function BrierRating(brier: number): { label: string; color: string } {
  if (brier <= 0.15) return { label: 'Excelente', color: 'text-accent-emerald' };
  if (brier <= 0.25) return { label: 'Buena', color: 'text-accent-primary' };
  if (brier <= 0.40) return { label: 'Aceptable', color: 'text-state-warning' };
  return { label: 'Mala', color: 'text-state-error' };
}

// ═══ STAT CARD ═════════════════════════════════════════════════

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-raised/30 rounded-xl p-4 border border-white/5 space-y-1.5">
      <div className="flex items-center gap-2 text-fg-tertiary text-xs">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className={cn("text-2xl font-bold font-mono tabular-nums", color || 'text-fg-primary')}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-fg-tertiary">{sub}</div>}
    </div>
  );
}

// ═══ MAIN PAGE ═════════════════════════════════════════════════

export default function BacktestPage() {
  const { data, isLoading } = useSWR<BacktestData>('/api/backtest', jsonFetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  });

  const calibrationBars = useMemo(() => {
    if (!data?.calibration) return [];
    const maxTotal = Math.max(...data.calibration.map(b => b.total), 1);
    return data.calibration.map(b => ({
      ...b,
      widthPct: (b.total / maxTotal) * 100,
    }));
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-app-bg text-fg-primary p-6 flex items-center justify-center">
        <div className="flex items-center gap-2 text-fg-tertiary">
          <BarChart3 className="w-5 h-5 animate-pulse" />
          Cargando backtest...
        </div>
      </div>
    );
  }

  if (!data?.success) {
    return (
      <div className="min-h-screen bg-app-bg text-fg-primary p-6 flex items-center justify-center">
        <div className="text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-state-warning mx-auto" />
          <p className="text-fg-tertiary">No hay datos de backtest disponibles</p>
          <p className="text-[10px] text-fg-tertiary">Esperando resultados reales...</p>
        </div>
      </div>
    );
  }

  const { overall, byRound } = data;
  const brierRating = BrierRating(overall.brierScore);

  // Overall calibration error: average |calibrationError| across all bins
  const avgCalError = data.calibration.length > 0
    ? data.calibration.reduce((s, b) => s + Math.abs(b.calibrationError), 0) / data.calibration.length
    : 0;

  return (
    <div className="min-h-screen bg-app-bg text-fg-primary p-4 sm:p-6 max-w-5xl mx-auto space-y-6 animate-fade">

      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-fg-tertiary hover:text-fg-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <Badge variant="premium">Backtest</Badge>
            <h1 className="text-lg font-bold mt-1">Validación de Predicciones</h1>
          </div>
        </div>
        <span className="text-[10px] text-fg-tertiary tabular-nums">
          {overall.matchesWithBoth}/{overall.totalMatches} partidos
        </span>
      </div>

      {/* ═══ OVERALL STATS ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={Target} label="Precisión Ganador"
          value={formatPct(overall.winnerAccuracy)}
          sub={`${overall.matchesWithBoth} partidos c/ resultado`}
          color="text-accent-emerald"
        />
        <StatCard
          icon={TrendingUp} label="Brier Score"
          value={overall.brierScore.toFixed(3)}
          sub={brierRating.label}
          color={brierRating.color}
        />
        <StatCard
          icon={Activity} label="Error de Goles (MAE)"
          value={overall.goalMAE.toFixed(2)}
          sub="Promedio por partido"
          color="text-accent-primary"
        />
        <StatCard
          icon={BarChart3} label="Puntaje Exacto"
          value={`${overall.exactScoreHits}/${overall.matchesWithBoth}`}
          sub={`${overall.withinOneGoal} dentro de 1 gol`}
        />
      </div>

      {/* ═══ BY ROUND ═══ */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-raised/30 rounded-xl p-4 border border-white/5 space-y-2">
          <div className="text-xs text-fg-tertiary flex items-center gap-2">
            <Target className="w-3 h-3" /> Fase de Grupos
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-accent-emerald">
              {formatPct(byRound.group.accuracy)}
            </span>
            <span className="text-xs text-fg-tertiary">
              {byRound.group.correct}/{byRound.group.total}
            </span>
          </div>
        </div>
        <div className="bg-raised/30 rounded-xl p-4 border border-white/5 space-y-2">
          <div className="text-xs text-fg-tertiary flex items-center gap-2">
            <Target className="w-3 h-3" /> Eliminatorias
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-accent-primary">
              {formatPct(byRound.knockout.accuracy)}
            </span>
            <span className="text-xs text-fg-tertiary">
              {byRound.knockout.correct}/{byRound.knockout.total}
            </span>
          </div>
        </div>
      </div>

      {/* ═══ CALIBRATION CHART ═══ */}
      <div className="bg-raised/30 rounded-xl p-4 border border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent-primary" />
            Calibración de Confianza
          </h2>
          <span className={cn(
            "text-[10px] px-2 py-0.5 rounded-full",
            avgCalError < 5 ? "bg-accent-emerald/20 text-accent-emerald" :
            avgCalError < 10 ? "bg-state-warning/20 text-state-warning" :
            "bg-state-error/20 text-state-error"
          )}>
            Error medio: {avgCalError.toFixed(1)}%
          </span>
        </div>

        {calibrationBars.length === 0 ? (
          <p className="text-xs text-fg-tertiary py-4 text-center">
            No hay suficientes datos para calcular calibración. Espera más resultados reales.
          </p>
        ) : (
          <div className="space-y-2">
            {calibrationBars.map(b => (
              <div key={b.binLabel} className="space-y-1">
                <div className="flex justify-between text-[10px] text-fg-tertiary">
                  <span>{b.binLabel}</span>
                  <span>{b.total} preds · {b.correct} correctas</span>
                </div>
                <div className="relative h-5 bg-black/30 rounded-full overflow-hidden">
                  {/* Barra de precisión real */}
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent-emerald to-accent-primary rounded-full transition-all duration-700"
                    style={{ width: `${b.accuracy}%` }}
                  />
                  {/* Marcador de confianza promedio */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white/70 transition-all duration-700"
                    style={{ left: `${b.avgConfidence}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-fg-tertiary">
                  <span>
                    Precisión: {b.accuracy}%
                  </span>
                  <span className={cn(
                    b.calibrationError > 0 ? "text-state-warning" :
                    b.calibrationError < 0 ? "text-accent-primary" : ""
                  )}>
                    Confianza: {b.avgConfidence}%
                    {b.calibrationError > 0 ? ` (sobreconfianza +${b.calibrationError})` : ''}
                    {b.calibrationError < 0 ? ` (subconfianza ${b.calibrationError})` : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[9px] text-fg-tertiary mt-2">
          La línea vertical blanca marca la confianza promedio. La barra verde muestra la precisión real.
          Idealmente deben alinearse (calibración perfecta = 0).
        </p>
      </div>

      {/* ═══ MATCH LIST ═══ */}
      <div className="bg-raised/30 rounded-xl p-4 border border-white/5 space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-accent-primary" />
          Comparación Partido a Partido
        </h2>
        <div className="divide-y divide-white/5">
          {data.matchComparisons.slice(0, 50).map((m: any) => (
            <div key={m.matchId} className="py-2 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  m.winnerCorrect ? 'bg-accent-emerald' : m.winnerCorrect === false ? 'bg-state-error' : 'bg-fg-tertiary/30'
                )} />
                <span className="truncate">{m.homeTeam}</span>
                <span className="text-fg-tertiary shrink-0">vs</span>
                <span className="truncate">{m.awayTeam}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-2">
                {m.isPlayed ? (
                  <>
                    <span className="font-mono tabular-nums text-fg-tertiary">
                      {m.realHomeGoals}-{m.realAwayGoals}
                    </span>
                    <span className={cn(
                      'font-mono tabular-nums',
                      m.winnerCorrect ? 'text-accent-emerald' : 'text-state-error'
                    )}>
                      {m.predictedHomeGoals}-{m.predictedAwayGoals}
                    </span>
                    {m.winnerCorrect ? (
                      <CheckCircle2 className="w-3 h-3 text-accent-emerald shrink-0" />
                    ) : (
                      <XCircle className="w-3 h-3 text-state-error shrink-0" />
                    )}
                  </>
                ) : (
                  <span className="text-fg-tertiary italic">Pendiente</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ FOOTER ═══ */}
      <p className="text-[10px] text-fg-tertiary text-center">
        Los datos se actualizan automáticamente cada 60s. Basado en resultados reales de API-Football.
      </p>
    </div>
  );
}
