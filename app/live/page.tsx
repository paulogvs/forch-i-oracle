'use client';

import { useState, useMemo } from 'react';
import { getFlag } from '@/lib/dashboard-utils';
import { cn } from '@/lib/utils';
import { useTournamentStore } from '@/lib/store/tournament-store';
import { Radio, BarChart3, Activity, CheckCircle2, Clock, RefreshCw } from 'lucide-react';

type SubPanel = 'ahora' | 'resultados' | 'pendientes';

export default function LivePage() {
  const [subPanel, setSubPanel] = useState<SubPanel>('resultados');
  const { fixture, standings, loading, refresh, lastUpdated } = useTournamentStore();

  const finished = useMemo(() => fixture?.filter(m => m.actualScore) || [], [fixture]);
  const upcoming = useMemo(() => fixture?.filter(m => !m.actualScore) || [], [fixture]);

  const stats = useMemo(() => {
    if (!finished.length) return { correct: 0, accuracy: 0 };
    const correct = finished.filter(m => {
      const [pH, pA] = m.predictedScore || [0, 0];
      const [rH, rA] = m.actualScore!;
      return (pH > pA && rH > rA) || (pH < pA && rH < rA) || (pH === pA && rH === rA);
    }).length;
    return { correct, accuracy: Math.round((correct / finished.length) * 100) };
  }, [finished]);

  if (loading && !fixture) return <div className="flex items-center justify-center min-h-[60vh]"><RefreshCw className="animate-spin text-gold" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fade">
      <div className="surface p-4 rounded-[var(--r-lg)] border border-accent-primary/20 bg-elevated/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-accent-primary" />
            <div>
              <h1 className="text-base font-bold">Panel En Vivo</h1>
              <p className="text-[10px] text-fg-tertiary">Sincronizado: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : '—'}</p>
            </div>
          </div>
          <button onClick={() => refresh()} className="p-2 hover:bg-raised rounded-full transition-colors">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="flex gap-1.5">
        {[
          { id: 'ahora', label: 'Juego', icon: Activity, count: 0 },
          { id: 'resultados', label: 'Resultados', icon: CheckCircle2, count: finished.length },
          { id: 'pendientes', label: 'Pendiente', icon: Clock, count: upcoming.length },
        ].map(tab => (
          <button key={tab.id} onClick={() => setSubPanel(tab.id as SubPanel)} className={cn(
            "flex-1 py-2 rounded-[var(--r-md)] text-[11px] font-semibold transition-all border flex items-center justify-center gap-2",
            subPanel === tab.id ? "bg-accent-primary/10 border-accent-primary/30 text-accent-primary" : "text-fg-tertiary border-border-subtle"
          )}>
            <tab.icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
            {tab.count > 0 && <span className="opacity-50">({tab.count})</span>}
          </button>
        ))}
      </div>

      {subPanel === 'resultados' && (
        <div className="space-y-2">
          <div className="p-3 rounded-xl bg-elevated border border-border-subtle flex items-center justify-between">
            <span className="text-xs font-bold">Precisión Histórica</span>
            <span className="text-sm font-mono text-accent-emerald">{stats.accuracy}%</span>
          </div>
          {finished.map(m => (
            <ResultMatchCard key={m.id} match={m} />
          ))}
        </div>
      )}

      {subPanel === 'pendientes' && (
        <div className="space-y-1">
          {upcoming.map(m => (
            <div key={m.id} className="p-3 rounded-lg bg-raised/10 border border-border-subtle flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2 flex-1">
                <span>{getFlag(m.homeTeam)}</span>
                <span className="truncate">{m.homeTeam}</span>
              </div>
              <div className="mx-4 font-mono font-bold text-accent-primary">
                {m.predictedScore?.[0]}-{m.predictedScore?.[1]}
              </div>
              <div className="flex items-center gap-2 flex-1 justify-end">
                <span className="truncate">{m.awayTeam}</span>
                <span>{getFlag(m.awayTeam)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {standings && (
        <div className="mt-8 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest px-1">Tablas de Posiciones</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(standings).map(([group, teams]: any) => (
              <div key={group} className="p-3 rounded-xl bg-elevated/50 border border-border-subtle">
                <h4 className="text-[10px] font-bold text-gold mb-2">GRUPO {group}</h4>
                <div className="space-y-1">
                  {teams.map((t: any, i: number) => (
                    <div key={t.name} className="flex items-center justify-between text-[10px] py-1 border-b border-white/5">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="opacity-40">{i+1}</span>
                        <span>{getFlag(t.name)}</span>
                        <span className="truncate">{t.name}</span>
                      </div>
                      <span className="font-bold">{t.points} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultMatchCard({ match: m }: any) {
  const [pH, pA] = m.predictedScore || [0, 0];
  const [rH, rA] = m.actualScore!;
  const isCorrect = (pH > pA && rH > rA) || (pH < pA && rH < rA) || (pH === pA && rH === rA);
  const isExact = pH === rH && pA === rA;

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-xl border",
      isExact ? "bg-accent-premium/5 border-accent-premium/20" :
      isCorrect ? "bg-accent-emerald/5 border-accent-emerald/20" : "bg-state-danger/5 border-state-danger/20"
    )}>
      <div className="flex-1 flex items-center gap-2 truncate">
        <span>{getFlag(m.homeTeam)}</span>
        <span className="text-xs truncate">{m.homeTeam}</span>
      </div>
      <div className="flex flex-col items-center">
        <div className="font-mono font-black text-sm">{rH}-{rA}</div>
        <div className="text-[8px] text-fg-tertiary">Pred: {pH}-{pA}</div>
      </div>
      <div className="flex-1 flex items-center gap-2 justify-end truncate">
        <span className="text-xs truncate">{m.awayTeam}</span>
        <span>{getFlag(m.awayTeam)}</span>
      </div>
    </div>
  );
}
