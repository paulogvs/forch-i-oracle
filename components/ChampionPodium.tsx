'use client';

interface ChampionPodiumProps {
  champion: string;
  championFlag: string;
  runnerUp: string;
  runnerUpFlag: string;
}

export default function ChampionPodium({ champion, championFlag, runnerUp, runnerUpFlag }: ChampionPodiumProps) {
  return (
    <div className="space-y-6">
      {/* Champion */}
      <div className="champion-podium">
        <div className="text-5xl mb-3 animate-bounce-subtle">{championFlag}</div>
        <h3 className="text-[10px] text-wc-gold font-bold uppercase tracking-widest mb-1">
          🏆 Campeón Mundial 🏆
        </h3>
        <div className="text-2xl md:text-3xl font-black text-white relative z-10">
          {champion}
        </div>
      </div>

      {/* Runner up */}
      <div className="glass-card p-4 text-center">
        <div className="text-3xl mb-2">{runnerUpFlag}</div>
        <h4 className="text-[10px] text-wc-silver font-bold uppercase tracking-widest mb-1">
          Subcampeón
        </h4>
        <div className="text-lg font-bold text-white/80">
          {runnerUp}
        </div>
      </div>
    </div>
  );
}
