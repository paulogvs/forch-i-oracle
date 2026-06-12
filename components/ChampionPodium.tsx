'use client';

import { Surface } from '@/components/ui/Surface';
import { Trophy } from 'lucide-react';

interface ChampionPodiumProps {
  champion: string;
  championFlag: string;
  runnerUp: string;
  runnerUpFlag: string;
}

export default function ChampionPodium({ champion, championFlag, runnerUp, runnerUpFlag }: ChampionPodiumProps) {
  return (
    <div className="space-y-4">
      {/* Champion */}
      <Surface variant="default" padding="lg" className="text-center border-accent-premium/20 shadow-[var(--shadow-glow-gold)]">
        <div className="text-5xl mb-3">{championFlag}</div>
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <Trophy className="h-3.5 w-3.5 text-accent-premium" />
          <h3 className="text-[10px] text-accent-premium font-bold uppercase tracking-widest">
            Campeón Mundial
          </h3>
        </div>
        <div className="text-2xl md:text-3xl font-black text-fg-primary">{champion}</div>
      </Surface>

      {/* Runner up */}
      <Surface variant="elevated" padding="md" className="text-center">
        <div className="text-3xl mb-2">{runnerUpFlag}</div>
        <h4 className="text-[10px] text-fg-disabled font-bold uppercase tracking-widest mb-1">Subcampeón</h4>
        <div className="text-lg font-bold text-fg-secondary">{runnerUp}</div>
      </Surface>
    </div>
  );
}
