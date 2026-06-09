'use client';

import type { Prediction } from '@/lib/gemini';

interface KeyFactorsProps {
  factors: Prediction['keyFactors'];
}

export default function KeyFactors({ factors }: KeyFactorsProps) {
  return (
    <div className="space-y-3">
      {factors.map((factor, i) => {
        // homeAdvantage: -10 (away) to +10 (home), 0 = balanced
        const pct = 50 + (factor.homeAdvantage * 5); // -10→0%, 0→50%, +10→100%
        const isBalanced = Math.abs(factor.homeAdvantage) <= 1;

        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white font-medium">{factor.label}</span>
              <span className="text-gray-400 text-[11px]">{factor.description}</span>
            </div>
            <div className="flex h-1.5 rounded-full overflow-hidden bg-white/5">
              {isBalanced ? (
                <div className="w-1/2 bg-gray-400" />
              ) : (
                <>
                  <div
                    className={`rounded-l-full transition-all duration-700 ${
                      factor.homeAdvantage > 0 ? 'bg-forch-gold' : 'bg-gray-600'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                  <div
                    className={`rounded-r-full transition-all duration-700 ${
                      factor.homeAdvantage < 0 ? 'bg-forch-gold' : 'bg-gray-600'
                    }`}
                    style={{ width: `${100 - pct}%` }}
                  />
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
