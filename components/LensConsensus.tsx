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
  verdict: string;
  confidence: number;
  insight: string;
  color: string;
}

function getTeamFlag(name: string): string {
  const team = getTeamByName(name);
  return team?.flag || '🏳️';
}

export default function LensConsensus({ prediction, homeTeam, awayTeam }: LensConsensusProps) {
  const homeFlag = getTeamFlag(homeTeam);
  const awayFlag = getTeamFlag(awayTeam);

  const statDiff = prediction.homeWin - prediction.awayWin;
  const statVerdict = statDiff > 8 ? homeTeam : statDiff < -8 ? awayTeam : 'Empate';
  const statLens: Lens = {
    icon: '📊',
    name: 'Estadístico',
    verdict: statVerdict,
    confidence: Math.abs(statDiff),
    color: 'text-accent-premium',
    insight: statDiff > 8
      ? `Poisson + Elo favorecen a ${homeTeam} (${prediction.homeWin}%)`
      : statDiff < -8
        ? `Poisson + Elo favorecen a ${awayTeam} (${prediction.awayWin}%)`
        : 'Modelo equilibrado',
  };

  const homeWins = prediction.homeFormLast5.filter(f => f === 'W').length;
  const awayWins = prediction.awayFormLast5.filter(f => f === 'W').length;
  const formDiff = homeWins - awayWins;
  const formVerdict = formDiff > 0 ? homeTeam : formDiff < 0 ? awayTeam : 'Empate';
  const formLens: Lens = {
    icon: '📈',
    name: 'Forma',
    verdict: formVerdict,
    confidence: Math.abs(formDiff) * 20,
    color: 'text-state-success',
    insight: homeWins > awayWins
      ? `${homeTeam} mejor racha (${homeWins}V vs ${awayWins}V)`
      : awayWins > homeWins
        ? `${awayTeam} mejor racha (${awayWins}V vs ${homeWins}V)`
        : 'Forma similar',
  };

  const eloLens: Lens = {
    icon: '⭐',
    name: 'Plantel',
    verdict: prediction.homeAttackStrength > prediction.awayAttackStrength ? homeTeam : awayTeam,
    confidence: Math.abs(prediction.homeAttackStrength - prediction.awayAttackStrength),
    color: 'text-accent-primary',
    insight: prediction.homeAttackStrength > prediction.awayAttackStrength
      ? `${homeTeam} ataque superior`
      : `${awayTeam} ataque superior`,
  };

  const defLens: Lens = {
    icon: '🛡️',
    name: 'Defensa',
    verdict: prediction.homeDefenseStrength > prediction.awayDefenseStrength ? homeTeam : awayTeam,
    confidence: Math.abs(prediction.homeDefenseStrength - prediction.awayDefenseStrength),
    color: 'text-accent-secondary',
    insight: prediction.homeDefenseStrength > prediction.awayDefenseStrength
      ? `${homeTeam} defensa más sólida`
      : `${awayTeam} defensa más sólida`,
  };

  const homeAdvantage = prediction.keyFactors.find(f => f.label.toLowerCase().includes('local'));
  const localLens: Lens = {
    icon: '🏟️',
    name: 'Local',
    verdict: homeTeam,
    confidence: homeAdvantage ? Math.abs(homeAdvantage.homeAdvantage) * 10 : 20,
    color: 'text-state-warning',
    insight: homeAdvantage ? homeAdvantage.description : `Factor local para ${homeTeam}`,
  };

  const lenses = [statLens, formLens, eloLens, defLens, localLens];

  const votes: Record<string, number> = {};
  lenses.forEach(l => { votes[l.verdict] = (votes[l.verdict] || 0) + 1; });
  const sortedVotes = Object.entries(votes).sort((a, b) => b[1] - a[1]);
  const consensusLeader = sortedVotes[0];
  const isSplit = sortedVotes.length > 1 && sortedVotes[0][1] === sortedVotes[1][1];

  return (
    <div className="surface p-5 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xs font-bold text-fg-primary uppercase tracking-wider">Consenso</h3>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
          <span className="text-[10px] text-fg-disabled">Voto:</span>
          {isSplit ? (
            <span className="text-[10px] font-bold text-fg-secondary">Empate</span>
          ) : (
            <span className="text-[10px] font-bold text-accent-premium">
              {consensusLeader[0] === 'Empate' ? 'Empate' : `${getTeamFlag(consensusLeader[0])} ${consensusLeader[0]}`}
            </span>
          )}
          <span className="text-[10px] text-fg-disabled">({consensusLeader[1]}/5)</span>
        </div>
      </div>

      {/* Consensus bar */}
      <div className="flex rounded-full overflow-hidden h-1.5 mb-5 bg-white/[0.04]">
        {sortedVotes.map(([team, count], i) => {
          const pct = (count / 5) * 100;
          const barColors = ['bg-accent-premium', 'bg-fg-tertiary', 'bg-fg-tertiary/60', 'bg-fg-tertiary/40'];
          return (
            <div
              key={team}
              className={`${barColors[i % barColors.length]} transition-all duration-500`}
              style={{ width: `${pct}%` }}
              title={`${team}: ${count}/5`}
            />
          );
        })}
      </div>

      {/* 5 Lenses */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        {lenses.map((lens, i) => {
          const isForHome = lens.verdict === homeTeam;
          const isDraw = lens.verdict === 'Empate';

          return (
            <div
              key={i}
              className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]
                         hover:bg-white/[0.06] transition-all duration-200"
            >
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm">{lens.icon}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${lens.color}`}>
                  {lens.name}
                </span>
              </div>

              <div className="mb-2">
                {isDraw ? (
                  <span className="text-xs font-bold text-fg-disabled">Empate</span>
                ) : (
                  <span className={`text-xs font-bold ${isForHome ? 'text-accent-premium' : 'text-fg-secondary'}`}>
                    {lens.verdict === homeTeam ? `${homeFlag} ${homeTeam}` : `${awayFlag} ${awayTeam}`}
                  </span>
                )}
              </div>

              <p className="text-[10px] text-fg-disabled leading-snug">{lens.insight}</p>

              <div className="mt-2 w-full bg-white/[0.06] rounded-full h-1">
                <div
                  className={`h-1 rounded-full transition-all duration-700 ${
                    isForHome ? 'bg-accent-premium' : 'bg-fg-tertiary'
                  }`}
                  style={{ width: `${Math.min(100, lens.confidence)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-fg-disabled text-center mt-4">
        Cada lente analiza desde una perspectiva diferente — datos reales, no opiniones
      </p>
    </div>
  );
}
