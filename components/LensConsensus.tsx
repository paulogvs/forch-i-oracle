'use client';

import type { Prediction } from '@/lib/groq';
import { getTeamByName } from '@/lib/teams';

interface LensConsensusProps {
  prediction: Prediction;
  homeTeam: string;
  awayTeam: string;
}

interface Lens {
  icon: string;
  name: string;
  verdict: string; // nombre del equipo favorecido o 'Empate'
  confidence: number; // 0-100
  insight: string; // frase corta explicativa
  color: string;
}

function getTeamFlag(name: string): string {
  const team = getTeamByName(name);
  return team?.flag || '🏳️';
}

export default function LensConsensus({ prediction, homeTeam, awayTeam }: LensConsensusProps) {
  const homeFlag = getTeamFlag(homeTeam);
  const awayFlag = getTeamFlag(awayTeam);

  // Lens 1: Motor Estadístico (Poisson + Elo)
  const statDiff = prediction.homeWin - prediction.awayWin;
  const statVerdict = statDiff > 8 ? homeTeam : statDiff < -8 ? awayTeam : 'Empate';
  const statLens: Lens = {
    icon: '📊',
    name: 'Motor Estadístico',
    verdict: statVerdict,
    confidence: Math.abs(statDiff),
    color: 'text-forch-gold',
    insight: statDiff > 8
      ? `Poisson + Elo favorecen a ${homeTeam} (${prediction.homeWin}%)`
      : statDiff < -8
        ? `Poisson + Elo favorecen a ${awayTeam} (${prediction.awayWin}%)`
        : 'Modelo equilibrado — partido parejo',
  };

  // Lens 2: Forma Reciente
  const homeWins = prediction.homeFormLast5.filter(f => f === 'W').length;
  const awayWins = prediction.awayFormLast5.filter(f => f === 'W').length;
  const formDiff = homeWins - awayWins;
  const formVerdict = formDiff > 0 ? homeTeam : formDiff < 0 ? awayTeam : 'Empate';
  const formLens: Lens = {
    icon: '📈',
    name: 'Forma Reciente',
    verdict: formVerdict,
    confidence: Math.abs(formDiff) * 20,
    color: 'text-green-400',
    insight: homeWins > awayWins
      ? `${homeTeam} con mejor racha (${homeWins}V vs ${awayWins}V)`
      : awayWins > homeWins
        ? `${awayTeam} con mejor racha (${awayWins}V vs ${homeWins}V)`
        : 'Forma similar — sin ventaja clara',
  };

  // Lens 3: Calidad de Plantel (Elo)
  const eloLens: Lens = {
    icon: '⭐',
    name: 'Calidad de Plantel',
    verdict: prediction.homeAttackStrength > prediction.awayAttackStrength ? homeTeam : awayTeam,
    confidence: Math.abs(prediction.homeAttackStrength - prediction.awayAttackStrength),
    color: 'text-blue-400',
    insight: prediction.homeAttackStrength > prediction.awayAttackStrength
      ? `${homeTeam} con ataque superior (${prediction.homeAttackStrength} vs ${prediction.awayAttackStrength})`
      : prediction.awayAttackStrength > prediction.homeAttackStrength
        ? `${awayTeam} con ataque superior (${prediction.awayAttackStrength} vs ${prediction.homeAttackStrength})`
        : 'Ataques de nivel similar',
  };

  // Lens 4: Defensa Sólida
  const defLens: Lens = {
    icon: '🛡️',
    name: 'Solidez Defensiva',
    verdict: prediction.homeDefenseStrength > prediction.awayDefenseStrength ? homeTeam : awayTeam,
    confidence: Math.abs(prediction.homeDefenseStrength - prediction.awayDefenseStrength),
    color: 'text-purple-400',
    insight: prediction.homeDefenseStrength > prediction.awayDefenseStrength
      ? `${homeTeam} defensa más sólida (${prediction.homeDefenseStrength} vs ${prediction.awayDefenseStrength})`
      : prediction.awayDefenseStrength > prediction.homeDefenseStrength
        ? `${awayTeam} defensa más sólida (${prediction.awayDefenseStrength} vs ${prediction.homeDefenseStrength})`
        : 'Defensas de nivel similar',
  };

  // Lens 5: Factor Local
  const homeAdvantage = prediction.keyFactors.find(f => f.label.toLowerCase().includes('local'));
  const localLens: Lens = {
    icon: '🏟️',
    name: 'Ventaja Local',
    verdict: homeTeam,
    confidence: homeAdvantage ? Math.abs(homeAdvantage.homeAdvantage) * 10 : 20,
    color: 'text-amber-400',
    insight: homeAdvantage
      ? homeAdvantage.description
      : `Factor local para ${homeTeam}`,
  };

  const lenses = [statLens, formLens, eloLens, defLens, localLens];

  // Conteo de consenso
  const votes: Record<string, number> = {};
  lenses.forEach(l => {
    votes[l.verdict] = (votes[l.verdict] || 0) + 1;
  });

  const sortedVotes = Object.entries(votes).sort((a, b) => b[1] - a[1]);
  const consensusLeader = sortedVotes[0];
  const isSplit = sortedVotes.length > 1 && sortedVotes[0][1] === sortedVotes[1][1];

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-4">
      {/* Header con consenso */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          🔮 Consenso de Análisis
        </h3>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
          <span className="text-xs text-gray-400">Consenso:</span>
          {isSplit ? (
            <span className="text-xs font-bold text-gray-300">Empate técnico</span>
          ) : (
            <span className="text-xs font-bold text-forch-gold">
              {consensusLeader[0] === 'Empate' ? 'Empate' : `${getTeamFlag(consensusLeader[0])} ${consensusLeader[0]}`}
            </span>
          )}
          <span className="text-xs text-gray-500">({consensusLeader[1]}/5)</span>
        </div>
      </div>

      {/* Barra de consenso visual */}
      <div className="flex rounded-full overflow-hidden h-2 mb-6 bg-white/5">
        {sortedVotes.map(([team, count], i) => {
          const pct = (count / 5) * 100;
          const colors = ['bg-forch-gold', 'bg-gray-500', 'bg-gray-600', 'bg-gray-700'];
          return (
            <div
              key={team}
              className={`${colors[i % colors.length]} transition-all duration-500`}
              style={{ width: `${pct}%` }}
              title={`${team}: ${count}/5`}
            />
          );
        })}
      </div>

      {/* 5 Lenses en grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {lenses.map((lens, i) => {
          const isForHome = lens.verdict === homeTeam;
          const isForAway = lens.verdict === awayTeam;
          const isDraw = lens.verdict === 'Empate';

          return (
            <div
              key={i}
              className="relative p-3 rounded-xl bg-white/5 border border-white/10
                         hover:bg-white/10 transition-all duration-200 group cursor-default"
            >
              {/* Indicador de veredicto */}
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-base">{lens.icon}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${lens.color}`}>
                  {lens.name}
                </span>
              </div>

              {/* Veredicto */}
              <div className="mb-2">
                {isDraw ? (
                  <span className="text-sm font-bold text-gray-400">Empate</span>
                ) : (
                  <span className={`text-sm font-bold ${
                    isForHome ? 'text-forch-gold' : 'text-gray-400'
                  }`}>
                    {lens.verdict === homeTeam ? `${homeFlag} ${homeTeam}` : `${awayFlag} ${awayTeam}`}
                  </span>
                )}
              </div>

              {/* Insight */}
              <p className="text-[10px] text-gray-500 leading-snug">
                {lens.insight}
              </p>

              {/* Mini confidence bar */}
              <div className="mt-2 w-full bg-white/10 rounded-full h-1">
                <div
                  className={`h-1 rounded-full transition-all duration-700 ${
                    isForHome ? 'bg-forch-gold' : isForAway ? 'bg-gray-500' : 'bg-gray-600'
                  }`}
                  style={{ width: `${Math.min(100, lens.confidence)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <p className="text-[10px] text-gray-600 text-center mt-4">
        Cada lente analiza desde una perspectiva diferente usando datos reales — no opiniones
      </p>
    </div>
  );
}
