'use client';

import type { Prediction } from '@/lib/groq';

interface ComparisonBarsProps {
  homeTeam: string;
  awayTeam: string;
  prediction: Prediction;
}

interface BarData {
  label: string;
  homeValue: number;
  awayValue: number;
  icon: string;
}

export default function ComparisonBars({ homeTeam, awayTeam, prediction }: ComparisonBarsProps) {
  const bars: BarData[] = [
    { label: 'Ataque', homeValue: prediction.homeAttackStrength, awayValue: prediction.awayAttackStrength, icon: '⚔️' },
    { label: 'Mediocampo', homeValue: prediction.homeMidfieldStrength, awayValue: prediction.awayMidfieldStrength, icon: '🎯' },
    { label: 'Defensa', homeValue: prediction.homeDefenseStrength, awayValue: prediction.awayDefenseStrength, icon: '🛡️' },
  ];

  return (
    <div className="space-y-4">
      {bars.map((bar) => {
        const total = bar.homeValue + bar.awayValue;
        const homePct = total > 0 ? Math.round((bar.homeValue / total) * 100) : 50;
        const awayPct = 100 - homePct;

        return (
          <div key={bar.label}>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-white font-medium">{bar.icon} {bar.label}</span>
              <span className="text-gray-500">{bar.homeValue} vs {bar.awayValue}</span>
            </div>
            <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
              <div
                className="bg-gradient-to-r from-forch-gold to-yellow-500 rounded-l-full transition-all duration-1000"
                style={{ width: `${homePct}%` }}
              />
              <div
                className="bg-gradient-to-r from-gray-600 to-gray-500 rounded-r-full transition-all duration-1000"
                style={{ width: `${awayPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
              <span>{homeTeam} {homePct}%</span>
              <span>{awayPct}% {awayTeam}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
