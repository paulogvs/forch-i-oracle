'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

interface Snapshot {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  homeWinPct: number;
  drawPct: number;
  awayWinPct: number;
  confidence: string;
  createdAt: string;
  trigger: string;
}

interface DriftSparklineProps {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  className?: string;
}

export default function DriftSparkline({ matchId, homeTeam, awayTeam, className = '' }: DriftSparklineProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/prediction-snapshots/${matchId}`);
        if (res.ok) {
          const data = await res.json();
          setSnapshots(data);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [matchId]);

  if (loading || snapshots.length < 2) {
    return null;
  }

  const homeWinData = snapshots.map(s => s.homeWinPct);
  const awayWinData = snapshots.map(s => s.awayWinPct);
  const drawData = snapshots.map(s => s.drawPct);

  const width = 200;
  const height = 40;
  const padding = 2;

  const createPath = (data: number[]) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((v, i) => ({
      x: padding + (i / (data.length - 1)) * (width - padding * 2),
      y: height - padding - ((v - min) / range) * (height - padding * 2),
    }));

    return points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
  };

  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  const homeDrift = last.homeWinPct - first.homeWinPct;
  const awayDrift = last.awayWinPct - first.awayWinPct;

  return (
    <div className={`surface-elevated rounded-[var(--r-md)] p-3 border border-border-primary/10 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-[10px] text-fg-secondary">
          <Activity className="w-3 h-3" />
          <span>Drift del partido</span>
        </div>
        <div className="text-[9px] text-fg-tertiary">
          {snapshots.length} snapshots
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-10">
        <path d={createPath(homeWinData)} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d={createPath(awayWinData)} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d={createPath(drawData)} fill="none" stroke="#6b7280" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3,2" />
      </svg>

      <div className="flex items-center justify-between mt-2 text-[10px]">
        <div className="flex items-center gap-1">
          <span className="text-fg-secondary">{homeTeam}</span>
          <span className={homeDrift > 0 ? 'text-green-400' : homeDrift < 0 ? 'text-red-400' : 'text-fg-tertiary'}>
            {homeDrift > 0 ? '+' : ''}{homeDrift.toFixed(1)}%
          </span>
          {homeDrift > 0 ? <TrendingUp className="w-3 h-3 text-green-400" /> : homeDrift < 0 ? <TrendingDown className="w-3 h-3 text-red-400" /> : <Minus className="w-3 h-3 text-fg-tertiary" />}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-fg-secondary">{awayTeam}</span>
          <span className={awayDrift > 0 ? 'text-green-400' : awayDrift < 0 ? 'text-red-400' : 'text-fg-tertiary'}>
            {awayDrift > 0 ? '+' : ''}{awayDrift.toFixed(1)}%
          </span>
          {awayDrift > 0 ? <TrendingUp className="w-3 h-3 text-green-400" /> : awayDrift < 0 ? <TrendingDown className="w-3 h-3 text-red-400" /> : <Minus className="w-3 h-3 text-fg-tertiary" />}
        </div>
      </div>
    </div>
  );
}