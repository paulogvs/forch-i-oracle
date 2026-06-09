// FORCH.i ORACLE — Bracket match card component
'use client';

import { useState } from 'react';

interface BracketMatchProps {
  match: {
    id: string;
    roundLabel: string;
    homeTeam: string;
    awayTeam: string;
    homeFlag: string;
    awayFlag: string;
    homeScore: number;
    awayScore: number;
    winner: string;
    homeWinProb?: number;
    drawProb?: number;
    awayWinProb?: number;
    prediction?: string;
    isPlayed?: boolean;
  };
  compact?: boolean;
}

export default function BracketMatch({ match, compact = false }: BracketMatchProps) {
  const [hovered, setHovered] = useState(false);
  const isTBD = match.homeTeam === 'TBD' || match.awayTeam === 'TBD';

  if (compact) {
    return (
      <div
        className="bg-white/5 border border-white/10 rounded-lg p-2 min-w-[140px] text-[11px]
                   hover:border-forch-gold/30 transition-all duration-200"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-gray-500">{match.homeFlag} {match.homeTeam}</span>
          <span className="text-white font-bold">{match.homeScore}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">{match.awayFlag} {match.awayTeam}</span>
          <span className="text-white font-bold">{match.awayScore}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative bg-white/5 border rounded-xl overflow-hidden transition-all duration-300 ${
        isTBD
          ? 'border-white/5 opacity-40'
          : hovered
          ? 'border-forch-gold/50 shadow-lg shadow-forch-gold/10'
          : 'border-white/10 hover:border-forch-gold/30'
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Round label */}
      <div className="px-3 py-1 bg-white/5 border-b border-white/5">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">{match.roundLabel}</span>
      </div>

      {/* Home team */}
      <div
        className={`px-3 py-2 flex items-center justify-between transition-colors ${
          match.winner === match.homeTeam && match.winner !== 'TBD'
            ? 'bg-forch-gold/10'
            : ''
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{match.homeFlag}</span>
          <span className={`text-sm ${match.winner === match.homeTeam ? 'text-white font-bold' : 'text-gray-300'}`}>
            {match.homeTeam}
          </span>
        </div>
        <span className={`text-sm font-bold ${match.winner === match.homeTeam ? 'text-forch-gold' : 'text-gray-400'}`}>
          {match.homeScore}
        </span>
      </div>

      {/* Away team */}
      <div
        className={`px-3 py-2 flex items-center justify-between border-t border-white/5 transition-colors ${
          match.winner === match.awayTeam && match.winner !== 'TBD'
            ? 'bg-forch-gold/10'
            : ''
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{match.awayFlag}</span>
          <span className={`text-sm ${match.winner === match.awayTeam ? 'text-white font-bold' : 'text-gray-300'}`}>
            {match.awayTeam}
          </span>
        </div>
        <span className={`text-sm font-bold ${match.winner === match.awayTeam ? 'text-forch-gold' : 'text-gray-400'}`}>
          {match.awayScore}
        </span>
      </div>

      {/* Hover tooltip */}
      {hovered && match.prediction && !isTBD && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 border border-white/10
                        rounded-xl shadow-2xl text-xs text-gray-300">
          <p>{match.prediction}</p>
          {match.homeWinProb && (
            <div className="mt-2 flex gap-2 text-[10px]">
              <span className="text-forch-gold">{match.homeTeam}: {match.homeWinProb}%</span>
              <span className="text-gray-500">Empate: {match.drawProb}%</span>
              <span className="text-forch-gold">{match.awayTeam}: {match.awayWinProb}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
