'use client';

import { useMemo } from 'react';
import { Target, Zap, CheckCircle2, Activity, Trophy, Clock, ChevronRight, RefreshCw, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { useTournamentStore } from '@/lib/store/tournament-store';
import { groupResultsByDate, getFlag, getRoundLabel } from '@/lib/dashboard-utils';
import { motion, AnimatePresence } from 'motion/react';

export default function DashboardPage() {
  const { fixture, bracket, top8, loading, error, refresh, lastUpdated } = useTournamentStore();

  const stats = useMemo(() => {
    if (!fixture) return null;
    let correct = 0, played = 0, exact = 0;
    const details = fixture.filter(m => m.actualScore).map(m => {
      const [pH, pA] = m.predictedScore || [0, 0];
      const [rH, rA] = m.actualScore!;
      const isCorrect = (pH > pA && rH > rA) || (pH < pA && rH < rA) || (pH === pA && rH === rA);
      const isExact = pH === rH && pA === rA;
      if (isCorrect) correct++;
      if (isExact) exact++;
      played++;
      return {
        home: m.homeTeam,
        away: m.awayTeam,
        pred: [pH, pA],
        real: [rH, rA],
        correct: isCorrect,
        exact: isExact,
        date: m.date,
        time: m.time,
        round: m.round,
        group: m.group,
        confidence: m.confidence
      };
    });
    return { accuracy: played > 0 ? Math.round((correct / played) * 100) : 0, played, exact, details };
  }, [fixture]);

  const upcomingMatches = useMemo(() => {
    if (!fixture) return [];
    return fixture
      .filter(m => !m.actualScore)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
      .slice(0, 4);
  }, [fixture]);

  const dateGroups = useMemo(() => {
    if (!stats) return [];
    return groupResultsByDate(stats.details as any, false);
  }, [stats]);

  if (loading && !fixture) return <div className="flex items-center justify-center min-h-[60vh]"><RefreshCw className="animate-spin text-gold" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade pb-8">
      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant="premium">Panel de Control</Badge>
          <button onClick={() => refresh()} className="text-[10px] text-fg-tertiary hover:text-fg-primary flex items-center gap-1">
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
            {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Sincronizar'}
          </button>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Predicciones IA <span className="text-gold">Mundial 2026</span></h1>
        <p className="text-xs text-fg-secondary">Estado actual del torneo al 7 de Julio de 2026</p>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <StatPill icon={<Target className="h-3.5 w-3.5" />} label="Acierto" value={`${stats?.accuracy || 0}%`} sub={`${stats?.played || 0} jugados`} color="emerald" />
        <StatPill icon={<Zap className="h-3.5 w-3.5" />} label="Exactos" value={`${stats?.exact || 0}`} sub="🎯 Marcadores OK" color="gold" />
      </div>

      {upcomingMatches.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-bold text-fg-primary flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-accent-primary" /> Próximos Partidos</h2>
          <div className="space-y-2">
            {upcomingMatches.map(m => <UpcomingMatchCard key={m.id} match={m} />)}
          </div>
        </section>
      )}

      {dateGroups.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-fg-primary flex items-center gap-2"><Activity className="h-3.5 w-3.5 text-accent-emerald" /> Resultados Reales</h2>
          {dateGroups.map(group => (
            <div key={group.date}>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-[11px] font-bold text-fg-tertiary uppercase">{group.label}</h3>
                <div className="flex-1 h-px bg-border-subtle" />
              </div>
              <div className="space-y-1.5">
                {group.matches.map((m, i) => <ResultCard key={i} match={m as any} />)}
              </div>
            </div>
          ))}
        </section>
      )}

      {top8 && (
        <section className="space-y-2">
          <h2 className="text-xs font-bold text-fg-primary flex items-center gap-2"><Trophy className="h-3.5 w-3.5 text-accent-premium" /> Campeón del Mundo</h2>
          <ChampionWidget probs={top8} champion={bracket?.champion} />
        </section>
      )}

      <section className="space-y-2">
        <div className="space-y-2">
          <QuickLink href="/fixture" icon="⚡" title="Predicción Completa" desc="Ver tablas y bracket" accent="accent-premium" />
        </div>
      </section>
    </div>
  );
}

function StatPill({ icon, label, value, sub, color }: any) {
  return (
    <div className="p-3 rounded-[var(--r-lg)] border bg-elevated border-border-subtle">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-fg-tertiary uppercase font-semibold">{label}</span>
        <span className={cn(color === 'emerald' ? 'text-accent-emerald' : 'text-accent-gold')}>{icon}</span>
      </div>
      <div className="text-xl font-bold font-mono">{value}</div>
      <div className="text-[10px] text-fg-tertiary mt-0.5">{sub}</div>
    </div>
  );
}

function UpcomingMatchCard({ match }: any) {
  const [h, a] = match.predictedScore || [0, 0];
  return (
    <div className="surface p-3 rounded-[var(--r-lg)] border border-border-subtle flex items-center gap-3 bg-raised/20">
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-base">{getFlag(match.homeTeam)}</span>
        <span className="text-xs font-bold truncate text-fg-secondary">{match.homeTeam}</span>
      </div>
      <div className="shrink-0 text-center">
        <div className="px-2.5 py-1 bg-raised/50 rounded-[var(--r-sm)] border border-border-subtle">
          <span className="font-mono font-bold text-sm text-fg-tertiary">{h}-{a}</span>
        </div>
        <div className="text-[9px] text-fg-tertiary mt-0.5">{getRoundLabel(match.round)}</div>
      </div>
      <div className="flex-1 min-w-0 text-right flex items-center gap-2 justify-end">
        <span className="text-xs font-bold truncate text-fg-secondary">{match.awayTeam}</span>
        <span className="text-base">{getFlag(match.awayTeam)}</span>
      </div>
    </div>
  );
}

function ResultCard({ match }: { match: { home: string, away: string, pred: [number, number], real: [number, number], correct: boolean, exact: boolean } }) {
  return (
    <div className={cn(
      "flex items-center gap-2 p-3 rounded-[var(--r-lg)] border",
      match.exact ? "bg-accent-premium/10 border-accent-premium/30" :
      match.correct ? "bg-accent-emerald/10 border-accent-emerald/30" : "bg-state-danger/10 border-state-danger/30"
    )}>
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-base shrink-0">{getFlag(match.home)}</span>
        <span className="text-xs truncate font-medium">{match.home}</span>
      </div>
      <div className="shrink-0 flex flex-col items-center">
        <div className="px-2.5 py-0.5 rounded-[var(--r-sm)] bg-canvas/50 border border-border-subtle">
          <span className="font-mono font-bold text-sm">{match.real[0]}-{match.real[1]}</span>
        </div>
        <span className="text-[9px] text-fg-tertiary">Pred: {match.pred[0]}-{match.pred[1]}</span>
      </div>
      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
        <span className="text-xs truncate font-medium text-right">{match.away}</span>
        <span className="text-base shrink-0">{getFlag(match.away)}</span>
      </div>
    </div>
  );
}

function ChampionWidget({ probs, champion }: any) {
  const maxProb = probs[0]?.pct || 1;
  return (
    <div className="surface p-4 rounded-[var(--r-lg)] border border-accent-gold/20 bg-elevated/50">
      <div className="text-center mb-4">
        <div className="text-3xl mb-1">🏆</div>
        <div className="text-lg font-black text-gold">{champion}</div>
        <div className="text-[10px] text-fg-tertiary">Favorito según 1,000 simulaciones</div>
      </div>
      <div className="space-y-1.5">
        {probs.slice(0, 8).map((p: any, i: number) => (
          <div key={p.team} className="flex items-center gap-2">
            <span className="text-[10px] w-4 text-fg-tertiary">{i+1}</span>
            <span className="text-[10px]">{getFlag(p.team)}</span>
            <span className="text-[11px] font-semibold w-20 truncate">{p.team}</span>
            <div className="flex-1 h-2 bg-raised rounded-full overflow-hidden">
              <div className="h-full bg-gold/60" style={{ width: `${(p.pct / maxProb) * 100}%` }} />
            </div>
            <span className="text-[10px] font-mono w-10 text-right">{p.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickLink({ href, icon, title, desc, accent }: any) {
  return (
    <Link href={href} className="block surface-interactive px-4 py-3 rounded-[var(--r-lg)] border border-border-subtle hover:border-accent-primary/50 transition-all">
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <div className="flex-1">
          <div className="text-sm font-bold">{title}</div>
          <div className="text-[10px] text-fg-tertiary">{desc}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-fg-tertiary" />
      </div>
    </Link>
  );
}
