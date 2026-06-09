// FORCH.i ORACLE — Champion reveal animation
'use client';

import { useEffect, useState } from 'react';

interface ChampionRevealProps {
  champion: string;
  championFlag: string;
  runnerUp: string;
  runnerUpFlag: string;
  thirdPlaceTeam: string;
  thirdPlaceFlag: string;
  fourthPlaceTeam: string;
  fourthPlaceFlag: string;
}

export default function ChampionReveal({
  champion, championFlag,
  runnerUp, runnerUpFlag,
  thirdPlaceTeam, thirdPlaceFlag,
  fourthPlaceTeam, fourthPlaceFlag,
}: ChampionRevealProps) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),   // Champion appears
      setTimeout(() => setPhase(2), 1200),   // Runner up appears
      setTimeout(() => setPhase(3), 2000),   // Third & fourth appear
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative">
      {/* Champion - Center */}
      <div
        className={`text-center transition-all duration-700 ${
          phase >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
        }`}
      >
        <div className="relative inline-block">
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-4xl animate-bounce">
            👑
          </div>
          <span className="text-8xl block mb-4">{championFlag}</span>
          <h2 className="text-4xl font-black text-forch-gold mb-2">{champion}</h2>
          <p className="text-sm text-gray-400 uppercase tracking-widest">Campeón del Mundo</p>
        </div>
      </div>

      {/* Podium */}
      <div className="mt-12 grid grid-cols-4 gap-4 max-w-3xl mx-auto">
        {/* 1st */}
        <div
          className={`text-center transition-all duration-500 ${
            phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="bg-forch-gold/10 border border-forch-gold/30 rounded-xl p-3">
            <span className="text-3xl block mb-1">{championFlag}</span>
            <p className="text-xs text-forch-gold font-bold">{champion}</p>
            <p className="text-[10px] text-gray-500">🥇 1°</p>
          </div>
        </div>

        {/* 2nd */}
        <div
          className={`text-center transition-all duration-500 ${
            phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="bg-gray-400/10 border border-gray-400/30 rounded-xl p-3">
            <span className="text-3xl block mb-1">{runnerUpFlag}</span>
            <p className="text-xs text-gray-300 font-bold">{runnerUp}</p>
            <p className="text-[10px] text-gray-500">🥈 2°</p>
          </div>
        </div>

        {/* 3rd */}
        <div
          className={`text-center transition-all duration-500 ${
            phase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="bg-orange-600/10 border border-orange-600/30 rounded-xl p-3">
            <span className="text-3xl block mb-1">{thirdPlaceFlag}</span>
            <p className="text-xs text-orange-300 font-bold">{thirdPlaceTeam}</p>
            <p className="text-[10px] text-gray-500">🥉 3°</p>
          </div>
        </div>

        {/* 4th */}
        <div
          className={`text-center transition-all duration-500 ${
            phase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <span className="text-3xl block mb-1">{fourthPlaceFlag}</span>
            <p className="text-xs text-gray-400 font-bold">{fourthPlaceTeam}</p>
            <p className="text-[10px] text-gray-500">4°</p>
          </div>
        </div>
      </div>
    </div>
  );
}
