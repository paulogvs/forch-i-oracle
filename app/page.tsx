'use client';

import { useEffect } from 'react';
import { Target, Zap, CheckCircle2, ArrowRight, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Surface } from '@/components/ui/Surface';
import { Badge } from '@/components/ui/Badge';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { LiveDot } from '@/components/ui/LiveDot';
import { useAccuracy, useFixture, useLiveScores } from '@/lib/swr/hooks';
import { useTournamentStore } from '@/lib/store/tournament-store';
import { formatPercent } from '@/lib/utils';
import { toast } from 'sonner';

interface AccuracyResponse {
  winnerAccuracy?: number;
  goalMAE?: number;
  over25Accuracy?: number;
  matchesPlayed?: number;
}

interface FixtureResponse {
  fixture?: unknown[];
}

interface LiveResponse {
  matches?: { homeFlag?: string; homeTeam: string; homeScore: number; awayScore: number; awayTeam: string; awayFlag?: string }[];
}

type LiveMatchItem = NonNullable<LiveResponse['matches']>[number];

export default function DashboardPage() {
  const { data: accuracy, isLoading: loadingAcc, error: errAcc } = useAccuracy<AccuracyResponse>();
  const { data: fixture } = useFixture<FixtureResponse>();
  const { data: live } = useLiveScores<LiveResponse>();
  const { setLastUpdated, setLive } = useTournamentStore();

  useEffect(() => {
    if (accuracy) setLastUpdated(new Date().toISOString());
    if (live?.matches && live.matches.length > 0) setLive(true); else setLive(false);
  }, [accuracy, live, setLastUpdated, setLive]);

  useEffect(() => {
    if (errAcc) toast.error('No se pudo cargar precisión: ' + errAcc.message);
  }, [errAcc]);

  return (
    <div className="space-y-8 animate-fade">
      {/* HERO */}
      <header className="space-y-2">
        <Badge variant="info">Panel de Precisión · WC2026</Badge>
        <h1 className="h-display">Predicciones IA <span className="text-gold">Mundial 2026</span></h1>
        <p className="t-body text-fg-secondary max-w-2xl">
          Motor Poisson + Dixon-Coles + Elo + xG. Re-simulación automática tras cada resultado real.
        </p>
      </header>

      {/* MÉTRICAS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loadingAcc ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : (
          <>
            <MetricCard
              icon={<Target className="h-4 w-4" />}
              label="Acierto ganador"
              value={accuracy?.winnerAccuracy != null ? formatPercent(accuracy.winnerAccuracy) : '—'}
              hint="aciertos H/D/A"
              tone="info"
            />
            <MetricCard
              icon={<Zap className="h-4 w-4" />}
              label="Error en goles"
              value={accuracy?.goalMAE != null ? accuracy.goalMAE.toFixed(2) : '—'}
              hint="MAE"
              tone="warning"
            />
            <MetricCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Over 2.5"
              value={accuracy?.over25Accuracy != null ? formatPercent(accuracy.over25Accuracy) : '—'}
              hint="acierto"
              tone="success"
            />
            <MetricCard
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Partidos jugados"
              value={accuracy?.matchesPlayed ?? '—'}
              hint={`de ${fixture?.fixture?.length ?? 128}`}
              tone="premium"
            />
          </>
        )}
      </section>

      {/* EN VIVO */}
      {live?.matches && live.matches.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <LiveDot active />
            <h2 className="h-section">En vivo ahora</h2>
          </div>
          <Surface padding="md">
            <div className="space-y-3">
              {live.matches.slice(0, 4).map((m: LiveMatchItem, i: number) => (
                <LiveMatchRow key={i} match={m} index={i} />
              ))}
            </div>
          </Surface>
        </section>
      )}

      {/* NAVEGACIÓN RÁPIDA */}
      <section className="space-y-3">
        <h2 className="h-section">Explorar</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <QuickNav href="/fixture"   title="Predicción"  desc="128 partidos · Top 8 · Bracket" />
          <QuickNav href="/live"      title="En Vivo"     desc="Resultados reales vs predicción" highlight={live?.matches && live.matches.length > 0} />
          <QuickNav href="/benchmark" title="Benchmark"   desc="10 modelos IA comparados" />
        </div>
      </section>
    </div>
  );
}

function MetricCard({ icon, label, value, hint, tone }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; hint?: string;
  tone?: 'info' | 'success' | 'warning' | 'premium';
}) {
  const toneCls = {
    info:    'text-accent-primary',
    success: 'text-state-success',
    warning: 'text-state-warning',
    premium: 'text-accent-premium',
  }[tone || 'info'];

  return (
    <Surface variant="default" padding="md">
      <div className="flex items-center justify-between mb-3">
        <span className="t-micro">{label}</span>
        <span className={toneCls}>{icon}</span>
      </div>
      <div className="space-y-1">
        <div className="t-mono text-2xl font-semibold text-fg-primary tabular-nums">{value}</div>
        {hint && <div className="t-micro text-fg-tertiary">{hint}</div>}
      </div>
    </Surface>
  );
}

function QuickNav({ href, title, desc, highlight }: { href: string; title: string; desc: string; highlight?: boolean }) {
  return (
    <Link href={href} className="block group">
      <Surface variant="interactive" padding="md">
        <div className="flex items-start justify-between mb-2">
          <h3 className="h-card">{title}</h3>
          {highlight && <Badge variant="success">en vivo</Badge>}
        </div>
        <p className="t-meta mb-3">{desc}</p>
        <span className="inline-flex items-center gap-1 text-xs text-accent-primary group-hover:gap-2 transition-all">
          Abrir <ArrowRight className="h-3 w-3" />
        </span>
      </Surface>
    </Link>
  );
}

function LiveMatchRow({ match, index }: { match: { homeFlag?: string; homeTeam: string; homeScore: number; awayScore: number; awayTeam: string; awayFlag?: string }; index: number }) {
  return (
    <div
      className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0 animate-rise"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-center gap-2 text-sm">
        <span>{match.homeFlag ?? ''}</span>
        <span className="font-medium">{match.homeTeam}</span>
      </div>
      <div className="t-mono font-semibold tabular-nums">
        {match.homeScore} <span className="text-fg-tertiary mx-1">·</span> {match.awayScore}
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">{match.awayTeam}</span>
        <span>{match.awayFlag ?? ''}</span>
      </div>
    </div>
  );
}
