'use client';

import { useEffect, useRef, useState } from 'react';

interface ProbabilityBarProps {
  homeWin: number;
  draw: number;
  awayWin: number;
  homeLabel?: string;
  awayLabel?: string;
  height?: 'sm' | 'md';
  className?: string;
}

/**
 * Segmented horizontal probability bar with animated widths.
 * Shows home/draw/away percentages with gradient fills.
 */
export default function ProbabilityBar({
  homeWin,
  draw,
  awayWin,
  homeLabel = 'Local',
  awayLabel = 'Visitante',
  height = 'md',
  className = '',
}: ProbabilityBarProps) {
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const h = height === 'sm' ? 'h-2' : 'h-3';
  const total = homeWin + draw + awayWin || 1;

  return (
    <div className={`w-full ${className}`}>
      {/* Bar */}
      <div ref={ref} className={`flex ${h} rounded-full overflow-hidden bg-white/5`}>
        <div
          className="bg-gradient-to-r from-accent-primary to-accent-primary transition-all duration-700 ease-out"
          style={{ width: mounted ? `${(homeWin / total) * 100}%` : '0%' }}
        />
        <div
          className="bg-gradient-to-r from-slate-500 to-slate-400 transition-all duration-700 ease-out"
          style={{ width: mounted ? `${(draw / total) * 100}%` : '0%', transitionDelay: '0.1s' }}
        />
        <div
          className="bg-gradient-to-r from-accent-premium to-yellow-400 transition-all duration-700 ease-out"
          style={{ width: mounted ? `${(awayWin / total) * 100}%` : '0%', transitionDelay: '0.2s' }}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-2 text-xs font-mono">
        <span className="text-accent-primary font-semibold">{homeWin}%</span>
        <span className="text-fg-tertiary">{draw}%</span>
        <span className="text-accent-premium font-semibold">{awayWin}%</span>
      </div>
    </div>
  );
}
