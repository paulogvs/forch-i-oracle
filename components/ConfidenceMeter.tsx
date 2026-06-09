'use client';

import type { Prediction } from '@/lib/gemini';

interface ConfidenceMeterProps {
  confidence: Prediction['confidence'];
}

const config = {
  alta: { label: 'Alta', color: 'text-green-400', bg: 'bg-green-400', icon: '🎯', glow: 'shadow-green-400/30' },
  media: { label: 'Media', color: 'text-yellow-400', bg: 'bg-yellow-400', icon: '⚖️', glow: 'shadow-yellow-400/30' },
  baja: { label: 'Baja', color: 'text-red-400', bg: 'bg-red-400', icon: '🔮', glow: 'shadow-red-400/30' },
};

export default function ConfidenceMeter({ confidence }: ConfidenceMeterProps) {
  const cfg = config[confidence] ?? config.media;

  return (
    <div className="flex items-center gap-3">
      <span className="text-2xl">{cfg.icon}</span>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 uppercase tracking-wider">Confianza</span>
          <span className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</span>
        </div>
        <div className="flex gap-1 mt-1">
          {[1, 2, 3].map((level) => (
            <div
              key={level}
              className={`h-1.5 w-8 rounded-full transition-all duration-500 ${
                level <= (confidence === 'alta' ? 3 : confidence === 'media' ? 2 : 1)
                  ? `${cfg.bg} shadow-sm ${cfg.glow}`
                  : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
