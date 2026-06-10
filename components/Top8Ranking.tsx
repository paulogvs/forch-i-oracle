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
}: {
  rank: number;
  item: ChampionProbability;
  inView: boolean;
  delay: number;
}) {
  const pct = useCountUp(item.pct, 1200, inView);

  const rankColors: Record<number, string> = {
    1: 'bg-forch-gold text-black',
    2: 'bg-gray-300 text-gray-800',
    3: 'bg-amber-700 text-white',
  };

  const rankBadge = rankColors[rank]
    ? (
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${rankColors[rank]}`}>
          {rank}
        </span>
      )
    : (
        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-white/10 text-gray-400">
          {rank}
        </span>
      );

  return (
    <div
      className="flex items-center gap-3 md:gap-4 py-3 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Rank badge */}
      {rankBadge}

      {/* Flag + Team */}
      <div className="flex items-center gap-2 w-32 md:w-40 shrink-0">
        <span className="text-xl">{item.flag}</span>
        <span className="text-sm md:text-base font-semibold text-white truncate">
          {item.team}
        </span>
      </div>

      {/* Bar */}
      <div className="flex-1 h-6 md:h-8 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: inView ? `${(item.pct / 35) * 100}%` : '0%',
            background: rank === 1
              ? 'linear-gradient(to right, #D4AF37cc, #D4AF37)'
              : rank === 2
                ? 'linear-gradient(to right, #9CA3AFcc, #9CA3AF)'
                : rank === 3
                  ? 'linear-gradient(to right, #B45309cc, #B45309)'
                  : 'linear-gradient(to right, #4B5563cc, #6B7280)',
            transitionDelay: `${delay}ms`,
          }}
        />
      </div>

      {/* Percentage */}
      <span className="text-base md:text-lg font-bold text-forch-gold w-14 text-right shrink-0 font-mono">
        {pct.toFixed(1)}%
      </span>

      {/* Win count */}
      <span className="text-xs text-gray-500 w-16 text-right shrink-0 font-mono hidden sm:block">
        {item.wins}/{(item.wins / (item.pct / 100))} sims
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
    <div ref={ref} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8">
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-lg md:text-xl font-bold text-white mb-1">
          🏆 Probabilidad de Campeón
        </h3>
        <p className="text-xs text-gray-500">
          Basado en {totalSims} simulaciones con motor Poisson + Elo + xG
        </p>
      </div>

      {/* Insight: líder */}
      {data.length > 0 && (
        <div className="mb-6 p-3 bg-forch-gold/10 border border-forch-gold/20 rounded-xl text-center">
          <p className="text-xs text-forch-gold font-semibold uppercase tracking-wider mb-1">
            Favorito principal
          </p>
          <p className="text-white font-bold text-lg">
            {data[0].flag} {data[0].team}
          </p>
          <p className="text-gray-400 text-xs">
            Ganó {data[0].wins} de {totalSims} simulaciones
          </p>
        </div>
      )}

      {/* Insight: dark horse */}
      {data.length >= 4 && (
        <div className="mb-6 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
          <p className="text-xs text-green-400 font-semibold uppercase tracking-wider mb-1">
            Dark Horse
          </p>
          <p className="text-white font-bold">
            {data[3].flag} {data[3].team}
          </p>
          <p className="text-gray-400 text-xs">
            {data[3].pct}% de probabilidad — valor oculto
          </p>
        </div>
      )}

      {/* Ranking rows */}
      <div className="space-y-1">
        {data.map((item, idx) => (
          <Top8Row
            key={item.team}
            rank={idx + 1}
            item={item}
            inView={inView}
            delay={idx * 100}
          />
        ))}
      </div>

      {/* Footer */}
      <p className="text-[10px] text-gray-600 text-center mt-4">
        Las probabilidades se basan en simulaciones estadísticas — no reflejan cuotas de apuestas
      </p>
    </div>
  );
}
