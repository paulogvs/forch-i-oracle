'use client';

import { useState } from 'react';
import type { Prediction } from '@/lib/groq';
import { getTeamByName } from '@/lib/teams';
import FormBubbles from './FormBubbles';
import ComparisonBars from './ComparisonBars';
import LensConsensus from './LensConsensus';
import AnimatedNumber from './ui/AnimatedNumber';
import ProbabilityBar from './ui/ProbabilityBar';
import MatchSeal from './MatchSeal';

interface ResultCardProps {
  prediction: Prediction;
  homeTeam: string;
  awayTeam: string;
  /** Optional: match result data for seals */
  matchResult?: {
    isPlayed: boolean;
    realHome?: number | null;
    realAway?: number | null;
  };
}

type Tab = 'consensus' | 'form' | 'stats' | 'analysis';

const confidenceColor: Record<string, string> = {
  alta: 'text-accent-primary',
  media: 'text-state-warning',
  baja: 'text-state-danger',
};

const factorIcons: Record<string, string> = {
  'Forma reciente': '📈',
  'Ventaja local': '🏟️',
  'Calidad ataque': '⚽',
  'Solidez defensa': '🛡️',
  'Historial H2H': '📊',
  'Lesiones': '🏥',
  'Motivación': '🔥',
  'Experiencia': '⭐',
};

export default function ResultCard({ prediction, homeTeam, awayTeam, matchResult }: ResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('consensus');

  const homeFlag = getTeamByName(homeTeam)?.flag || '🏳️';
  const awayFlag = getTeamByName(awayTeam)?.flag || '🏳️';
  const homeCode = getTeamByName(homeTeam)?.code || homeTeam.slice(0, 3).toUpperCase();
  const awayCode = getTeamByName(awayTeam)?.code || awayTeam.slice(0, 3).toUpperCase();

  const winner = prediction.homeWin > prediction.awayWin ? homeTeam
    : prediction.awayWin > prediction.homeWin ? awayTeam : null;
  const isDraw = !winner;

  const allKeyPlayers = [...prediction.homeKeyPlayers, ...prediction.awayKeyPlayers].slice(0, 6);

  // Determine seal status
  const sealStatus = matchResult?.isPlayed && matchResult.realHome != null && matchResult.realAway != null
    ? (() => {
        const rh = matchResult.realHome!;
        const ra = matchResult.realAway!;
        const predWinner = prediction.predictedScoreHome > prediction.predictedScoreAway ? 'home'
          : prediction.predictedScoreHome < prediction.predictedScoreAway ? 'away' : 'draw';
        const realWinner = rh > ra ? 'home' : rh < ra ? 'away' : 'draw';
        return predWinner === realWinner ? 'correct-winner' as const : 'incorrect-winner' as const;
      })()
    : null;

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'consensus', label: 'Consenso', icon: '🔮' },
    { id: 'form', label: 'Forma', icon: '📈' },
    { id: 'stats', label: 'Stats', icon: '⚡' },
    { id: 'analysis', label: 'Análisis', icon: '📝' },
  ];

  return (
    <div className="surface-elevated overflow-hidden animate-fade-in-up">
      {/* ═══ HEADER ═══ */}
      <div className="px-6 pt-6 pb-2 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-fg-disabled">
          Predicción FORCH.i
        </span>
        <div className="flex items-center gap-2">
          {sealStatus && <MatchSeal status={sealStatus} compact />}
          <span className={`text-xs font-semibold ${confidenceColor[prediction.confidence] || 'text-fg-tertiary'}`}>
            {prediction.confidence === 'alta' ? '●' : prediction.confidence === 'media' ? '●' : '○'} {prediction.confidence}
          </span>
        </div>
      </div>

      {/* ═══ SCOREBOARD ═══ */}
      <div className="px-6 py-6 md:px-8">
        <div className="flex items-center justify-center gap-6 md:gap-12">
          {/* Home */}
          <div className="text-center flex-1 min-w-0">
            <div className="text-4xl md:text-5xl mb-2" role="img" aria-label={`Bandera de ${homeTeam}`}>{homeFlag}</div>
            <div className="text-sm md:text-base font-semibold text-white truncate">{homeTeam}</div>
            <div className="text-[10px] font-mono text-fg-disabled mt-0.5">{homeCode}</div>
          </div>

          {/* Score */}
          <div className="text-center px-2">
            <div className="flex items-center gap-2 md:gap-4">
              <AnimatedNumber
                value={prediction.predictedScoreHome}
                className="text-5xl md:text-7xl font-black text-gold"
              />
              <span className="text-2xl md:text-3xl text-fg-disabled font-light">—</span>
              <AnimatedNumber
                value={prediction.predictedScoreAway}
                className="text-5xl md:text-7xl font-black text-gold"
              />
            </div>
            <div className="mt-2 text-xs text-fg-tertiary">
              {isDraw ? '⚖️ Empate probable' : `🏆 ${winner} favorito`}
            </div>
          </div>

          {/* Away */}
          <div className="text-center flex-1 min-w-0">
            <div className="text-4xl md:text-5xl mb-2" role="img" aria-label={`Bandera de ${awayTeam}`}>{awayFlag}</div>
            <div className="text-sm md:text-base font-semibold text-white truncate">{awayTeam}</div>
            <div className="text-[10px] font-mono text-fg-disabled mt-0.5">{awayCode}</div>
          </div>
        </div>
      </div>

      {/* ═══ PROBABILITIES ═══ */}
      <div className="px-6 md:px-8 pb-4">
        <ProbabilityBar
          homeWin={prediction.homeWin}
          draw={prediction.draw}
          awayWin={prediction.awayWin}
        />
      </div>

      {/* ═══ xG PILLS ═══ */}
      {(prediction.homeExpectedGoals > 0 || prediction.awayExpectedGoals > 0) && (
        <div className="px-6 md:px-8 pb-4 flex flex-wrap items-center justify-center gap-3">
          <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-fg-secondary">
            xG <span className="text-white font-semibold">{prediction.homeExpectedGoals.toFixed(2)}</span>
            {' — '}
            <span className="text-white font-semibold">{prediction.awayExpectedGoals.toFixed(2)}</span>
          </span>
          {prediction.over25Probability > 0 && (
            <span className="px-3 py-1 rounded-full bg-accent-premium/10 border border-accent-premium/20 text-[11px] font-mono text-accent-premium">
              Over 2.5 {prediction.over25Probability}%
            </span>
          )}
          {prediction.bttsProbability > 0 && (
            <span className="px-3 py-1 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-[11px] font-mono text-accent-primary">
              BTTS {prediction.bttsProbability}%
            </span>
          )}
        </div>
      )}

      {/* ═══ KEY FACTORS ═══ */}
      {prediction.keyFactors.length > 0 && (
        <div className="px-6 md:px-8 pb-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          {prediction.keyFactors.slice(0, 4).map((factor, i) => (
            <div key={i} className="bg-white/[0.03] rounded-xl p-3 text-center border border-white/[0.04]">
              <div className="text-base mb-1">{factorIcons[factor.label] || '📊'}</div>
              <div className="text-[10px] text-fg-tertiary truncate">{factor.label}</div>
              <div className={`text-xs font-bold mt-0.5 ${factor.homeAdvantage > 0 ? 'text-accent-primary' : factor.homeAdvantage < 0 ? 'text-state-warning' : 'text-fg-secondary'}`}>
                {factor.homeAdvantage > 0 ? `+${factor.homeAdvantage}%` : `${factor.homeAdvantage}%`}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ EXPAND BUTTON ═══ */}
      <div className="px-6 md:px-8 pb-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]
                     text-xs text-fg-tertiary hover:text-white hover:bg-white/[0.06]
                     transition-all duration-200 flex items-center justify-center gap-2"
        >
          <span>{expanded ? 'Ver menos' : 'Ver análisis completo'}</span>
          <span className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>▼</span>
        </button>
      </div>

      {/* ═══ EXPANDED CONTENT ═══ */}
      {expanded && (
        <div className="border-t border-white/[0.06] animate-fade-in">
          {/* Tabs */}
          <div className="flex border-b border-white/[0.06]">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 text-xs font-medium transition-all duration-200
                  ${activeTab === tab.id
                    ? 'text-white bg-white/[0.06]'
                    : 'text-fg-disabled hover:text-fg-secondary'
                  }`}
              >
                <span className="mr-1">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'consensus' && (
              <LensConsensus prediction={prediction} homeTeam={homeTeam} awayTeam={awayTeam} />
            )}

            {activeTab === 'form' && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white">Forma Reciente</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{homeFlag}</span>
                      <span className="text-sm text-white font-medium">{homeTeam}</span>
                    </div>
                    <FormBubbles form={prediction.homeFormLast5} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{awayFlag}</span>
                      <span className="text-sm text-white font-medium">{awayTeam}</span>
                    </div>
                    <FormBubbles form={prediction.awayFormLast5} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'stats' && (
              <ComparisonBars
                homeTeam={homeTeam}
                awayTeam={awayTeam}
                prediction={prediction}
              />
            )}

            {activeTab === 'analysis' && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white">Análisis Táctico</h4>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                  <p className="text-sm text-fg-secondary leading-relaxed">
                    {prediction.analysis || 'Sin análisis disponible.'}
                  </p>
                </div>
                {allKeyPlayers.length > 0 && (
                  <div>
                    <h5 className="text-[10px] uppercase tracking-wider text-fg-disabled mb-2">Jugadores Clave</h5>
                    <div className="flex flex-wrap gap-2">
                      {allKeyPlayers.map((player, i) => (
                        <span key={i} className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs text-fg-secondary">
                          {player}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ FOOTER ═══ */}
      <div className="px-6 py-2.5 bg-white/[0.02] border-t border-white/[0.04] flex items-center justify-center">
        <span className="text-[10px] text-fg-disabled font-mono">
          Poisson + Elo + xG · {prediction.confidence.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
