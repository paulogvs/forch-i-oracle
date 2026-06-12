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

export default function ProbabilityBar({
  homeWin, draw, awayWin,
  homeLabel = 'Local', awayLabel = 'Visitante',
  height = 'md', className = '',
}: ProbabilityBarProps) {
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { const timer = setTimeout(() => setMounted(true), 100); return () => clearTimeout(timer); }, []);

  const h = height === 'sm' ? 'h-2' : 'h-3';
  const total = homeWin + draw + awayWin || 1;

  return (
    <div className={`w-full ${className}`}>
      <div ref={ref} className={`flex ${h} rounded-full overflow-hidden bg-raised/30`}>
        <div
          className="bg-accent-primary transition-all duration-700 ease-out"
          style={{ width: mounted ? `${(homeWin / total) * 100}%` : '0%' }}
        />
        <div
          className="bg-fg-tertiary/40 transition-all duration-700 ease-out"
          style={{ width: mounted ? `${(draw / total) * 100}%` : '0%', transitionDelay: '0.1s' }}
        />
        <div
          className="bg-state-danger/70 transition-all duration-700 ease-out"
          style={{ width: mounted ? `${(awayWin / total) * 100}%` : '0%', transitionDelay: '0.2s' }}
        />
      </div>
      <div className="flex justify-between mt-1.5 text-[11px] font-mono">
        <span className="text-accent-primary font-semibold">{homeWin}%</span>
        <span className="text-fg-tertiary">{draw}%</span>
        <span className="text-state-danger font-semibold">{awayWin}%</span>
      </div>
    </div>
  );
}
