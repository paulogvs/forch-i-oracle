'use client';

import { useState } from 'react';
import type { Prediction } from '@/lib/groq';
import { getTeamByName } from '@/lib/teams';
import FormBubbles from './FormBubbles';
import ComparisonBars from './ComparisonBars';
import LensConsensus from './LensConsensus';

interface ResultCardProps {
  prediction: Prediction;
  homeTeam: string;
  awayTeam: string;
}

type Tab = 'consensus' | 'form' | 'stats' | 'analysis';

const confidenceMap: Record<string, number> = { alta: 85, media: 60, baja: 40 };

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

export default function ResultCard({ prediction, homeTeam, awayTeam }: ResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('consensus');

  const homeFlag = getTeamByName(homeTeam)?.flag || '🏳️';
  const awayFlag = getTeamByName(awayTeam)?.flag || '🏳️';
  const homeCode = getTeamByName(homeTeam)?.code || homeTeam.slice(0, 3).toUpperCase();
  const awayCode = getTeamByName(awayTeam)?.code || awayTeam.slice(0, 3).toUpperCase();

  const winner = prediction.homeWin > prediction.awayWin ? homeTeam : prediction.awayWin > prediction.homeWin ? awayTeam : null;
  const winnerFlag = winner === homeTeam ? homeFlag : winner === awayTeam ? awayFlag : '';
  const isDraw = !winner;
  const confidencePct = confidenceMap[prediction.confidence] || 50;

  const allKeyPlayers = [...prediction.homeKeyPlayers, ...prediction.awayKeyPlayers].slice(0, 6);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'consensus', label: 'Consenso', icon: '🔮' },
    { id: 'form', label: 'Forma', icon: '📈' },
    { id: 'stats', label: 'Stats', icon: '⚡' },
    { id: 'analysis', label: 'Análisis', icon: '📝' },
  ];

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
      {/* ═══════════════════════════════════════════
          HERO — Predicted Score (always visible)
         ═══════════════════════════════════════════ */}
      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Predicción FORCH.i
          </h2>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-forch-gold/10 border border-forch-gold/20">
            <span className="w-2 h-2 rounded-full bg-forch-gold animate-pulse" />
            <span className="text-xs font-semibold text-forch-gold">{confidencePct}% confianza</span>
          </div>
        </div>

        {/* Score Display */}
        <div className="flex items-center justify-center gap-4 md:gap-8 mb-6">
          {/* Home */}
          <div className="text-center flex-1">
            <div className="text-4xl md:text-5xl mb-2">{homeFlag}</div>
            <div className="text-sm md:text-base font-bold text-white truncate">{homeTeam}</div>
            <div className="text-xs text-gray-500 mt-0.5">{homeCode}</div>
          </div>

          {/* Score */}
          <div className="text-center px-4 md:px-8">
            <div className="flex items-center gap-2 md:gap-4">
              <span className="text-5xl md:text-7xl font-black text-forch-gold font-mono">
                {prediction.predictedScoreHome}
              </span>
              <span className="text-2xl md:text-3xl text-gray-600 font-light">—</span>
              <span className="text-5xl md:text-7xl font-black text-forch-gold font-mono">
                {prediction.predictedScoreAway}
              </span>
            </div>
            {isDraw && (
              <span className="text-xs text-gray-500 mt-2 block">Empate</span>
            )}
            {winner && (
              <span className="text-xs text-forch-gold mt-2 block">
                {winnerFlag} {winner}
              </span>
            )}
          </div>

          {/* Away */}
          <div className="text-center flex-1">
            <div className="text-4xl md:text-5xl mb-2">{awayFlag}</div>
            <div className="text-sm md:text-base font-bold text-white truncate">{awayTeam}</div>
            <div className="text-xs text-gray-500 mt-0.5">{awayCode}</div>
          </div>
        </div>

        {/* Win Probabilities Bar */}
        <div className="flex rounded-full overflow-hidden h-2 mb-4 bg-white/5">
          <div className="bg-forch-gold transition-all duration-700" style={{ width: `${prediction.homeWin}%` }} />
          <div className="bg-gray-600 transition-all duration-700" style={{ width: `${prediction.draw}%` }} />
          <div className="bg-gray-500 transition-all duration-700" style={{ width: `${prediction.awayWin}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-gray-500 mb-6 font-mono">
          <span>{homeTeam} {prediction.homeWin}%</span>
          <span>Empate {prediction.draw}%</span>
          <span>{awayTeam} {prediction.awayWin}%</span>
        </div>

        {/* Key Factors (inline, compact) */}
        {prediction.keyFactors.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            {prediction.keyFactors.slice(0, 4).map((factor, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-3 text-center">
                <div className="text-lg mb-1">{factorIcons[factor.label] || '📊'}</div>
                <div className="text-[10px] text-gray-400 truncate">{factor.label}</div>
                <div className="text-xs font-bold text-white mt-0.5">
                  {factor.homeAdvantage > 0 ? `+${factor.homeAdvantage}%` : `${factor.homeAdvantage}%`}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-3 rounded-xl bg-white/5 border border-white/10
                     text-sm text-gray-400 hover:text-white hover:bg-white/10
                     transition-all duration-200 flex items-center justify-center gap-2"
        >
          <span>{expanded ? 'Ver menos' : 'Ver análisis completo'}</span>
          <span className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════
          EXPANDED CONTENT — Progressive disclosure
         ═══════════════════════════════════════════ */}
      {expanded && (
        <div className="border-t border-white/10">
          {/* Tabs */}
          <div className="flex border-b border-white/10">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 text-xs font-medium transition-all duration-200
                  ${activeTab === tab.id
                    ? 'text-forch-gold border-b-2 border-forch-gold bg-white/5'
                    : 'text-gray-500 hover:text-gray-300'
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
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {prediction.analysis || 'Sin análisis disponible.'}
                  </p>
                </div>
                {allKeyPlayers.length > 0 && (
                  <div>
                    <h5 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Jugadores Clave</h5>
                    <div className="flex flex-wrap gap-2">
                      {allKeyPlayers.map((player, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 rounded-full bg-white/5 border border-white/10
                                     text-xs text-gray-300"
                        >
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

      {/* Footer */}
      <div className="px-6 py-3 bg-white/5 border-t border-white/10 flex items-center justify-center">
        <span className="text-[10px] text-gray-600">
          Motor estadístico Poisson + Elo + xG · {prediction.confidence.toUpperCase()} confianza
        </span>
      </div>
    </div>
  );
}
