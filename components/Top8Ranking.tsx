'use client';

import { useEffect, useRef, useState } from 'react';

export interface ChampionProbability {
  team: string;
  flag: string;
  wins: number;
  pct: number;
}

interface Top8RankingProps {
  data: ChampionProbability[];
  totalSims: number;
}

function useCountUp(target: number, duration = 1200, start = false) {
  const [value, setValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!start) return;
    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target * 10) / 10);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    startTimeRef.current = null;
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [start, target, duration]);

  return value;
}

function Top8Row({
  rank,
  item,
  inView,
  delay,
  totalSims,
}: {
  rank: number;
  item: ChampionProbability;
  inView: boolean;
  delay: number;
  totalSims: number;
}) {
  const pct = useCountUp(item.pct, 1200, inView);

  const rankColors: Record<number, string> = {
    1: 'bg-accent-premium text-canvas',
    2: 'bg-fg-secondary text-canvas',
    3: 'bg-state-warning/80 text-white',
  };

  const rankBadge = rankColors[rank] ? (
    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${rankColors[rank]}`}>
      {rank}
    </span>
  ) : (
    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-white/[0.06] text-fg-disabled">
      {rank}
    </span>
  );

  return (
    <div
      className="flex items-center gap-3 md:gap-4 py-2.5 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      {rankBadge}

      <div className="flex items-center gap-2 w-32 md:w-40 shrink-0">
        <span className="text-lg">{item.flag}</span>
        <span className="text-xs md:text-sm font-semibold text-fg-primary truncate">{item.team}</span>
      </div>

      <div className="flex-1 h-5 md:h-6 bg-white/[0.04] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: inView ? `${(item.pct / 35) * 100}%` : '0%',
            background:
              rank === 1
                ? 'var(--gradient-gold)'
                : rank === 2
                ? 'linear-gradient(to right, #94A3B8cc, #94A3B8)'
                : rank === 3
                ? 'linear-gradient(to right, #F59E0Bcc, #F59E0B)'
                : 'linear-gradient(to right, var(--text-disabled), var(--text-tertiary))',
            transitionDelay: `${delay}ms`,
          }}
        />
      </div>

      <span className="text-sm md:text-base font-bold text-accent-premium w-14 text-right shrink-0 font-mono">
        {pct.toFixed(1)}%
      </span>

      <span className="text-[10px] text-fg-disabled w-16 text-right shrink-0 font-mono hidden sm:block">
        {item.wins}/{item.pct > 0 ? Math.round(item.wins / (item.pct / 100)) : totalSims} sims
      </span>
    </div>
  );
}

export default function Top8Ranking({ data, totalSims }: Top8RankingProps) {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!data || data.length === 0) return null;

  return (
    <div ref={ref} className="surface p-6 md:p-8">
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-base md:text-lg font-bold text-fg-primary mb-1">Probabilidad de Campeón</h3>
        <p className="text-[11px] text-fg-disabled">
          Basado en {totalSims} simulaciones con motor Poisson + Elo + xG
        </p>
      </div>

      {/* Leader insight */}
      {data.length > 0 && (
        <div className="mb-5 p-3 bg-accent-premium/10 border border-accent-premium/20 rounded-xl text-center">
          <p className="text-[10px] text-accent-premium font-semibold uppercase tracking-wider mb-1">Favorito</p>
          <p className="text-fg-primary font-bold text-base">
            {data[0].flag} {data[0].team}
          </p>
          <p className="text-fg-disabled text-[11px]">
            Ganó {data[0].wins} de {totalSims} simulaciones
          </p>
        </div>
      )}

      {/* Dark horse */}
      {data.length >= 4 && (
        <div className="mb-5 p-3 bg-state-success/10 border border-state-success/20 rounded-xl text-center">
          <p className="text-[10px] text-state-success font-semibold uppercase tracking-wider mb-1">Dark Horse</p>
          <p className="text-fg-primary font-bold">
            {data[3].flag} {data[3].team}
          </p>
          <p className="text-fg-disabled text-[11px]">
            {data[3].pct}% — valor oculto
          </p>
        </div>
      )}

      {/* Rows */}
      <div className="space-y-0.5">
        {data.map((item, idx) => (
          <Top8Row key={item.team} rank={idx + 1} item={item} inView={inView} delay={idx * 100} totalSims={totalSims} />
        ))}
      </div>

      <p className="text-[10px] text-fg-disabled text-center mt-4">
        Simulaciones estadísticas — no reflejan cuotas de apuestas
      </p>
    </div>
  );
}
