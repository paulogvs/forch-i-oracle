'use client';

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
      <div className="glass-card p-6 text-center border-accent-gold/20">
        <div className="text-5xl mb-3 animate-bounce-subtle">{championFlag}</div>
        <h3 className="text-[10px] text-accent-gold font-bold uppercase tracking-widest mb-1">
          🏆 Campeón Mundial
        </h3>
        <div className="text-2xl md:text-3xl font-black text-text-primary">{champion}</div>
      </div>

      {/* Runner up */}
      <div className="glass-card-static p-4 text-center">
        <div className="text-3xl mb-2">{runnerUpFlag}</div>
        <h4 className="text-[10px] text-text-muted font-bold uppercase tracking-widest mb-1">Subcampeón</h4>
        <div className="text-lg font-bold text-text-secondary">{runnerUp}</div>
      </div>
    </div>
  );
}
