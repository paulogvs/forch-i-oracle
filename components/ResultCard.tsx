'use client';

import { useState } from 'react';
import type { Prediction } from '@/lib/gemini';
import { getTeamByName } from '@/lib/teams';
import ConfidenceMeter from './ConfidenceMeter';
import FormBubbles from './FormBubbles';
import ComparisonBars from './ComparisonBars';
import KeyFactors from './KeyFactors';

interface ResultCardProps {
  prediction: Prediction;
  homeTeam: string;
  awayTeam: string;
}

function getTeamFlag(teamName: string): string {
  const team = getTeamByName(teamName);
  return team?.flag || '🏳️';
}

function getStarPlayers(teamName: string, fromPrediction: string[]): string[] {
  if (fromPrediction.length > 0) return fromPrediction;
  const team = getTeamByName(teamName);
  return team?.starPlayers?.slice(0, 2) || [];
}

export default function ResultCard({ prediction, homeTeam, awayTeam }: ResultCardProps) {
  const [copied, setCopied] = useState(false);

  const {
    homeWin, draw, awayWin,
    predictedScoreHome, predictedScoreAway,
    confidence, analysis, keyFactors,
    homeKeyPlayers, awayKeyPlayers,
    homeFormLast5, awayFormLast5,
  } = prediction;

  const homeFlag = getTeamFlag(homeTeam);
  const awayFlag = getTeamFlag(awayTeam);
  const homeStars = getStarPlayers(homeTeam, homeKeyPlayers);
  const awayStars = getStarPlayers(awayTeam, awayKeyPlayers);

  const shareText = `🔮 FORCH.i Oracle\n${homeFlag} ${homeTeam} ${predictedScoreHome} - ${predictedScoreAway} ${awayTeam} ${awayFlag}\nVictoria: ${homeTeam} (${homeWin}%)\nConfianza: ${confidence}\n\n${analysis}`;

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = shareText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 animate-fade-in">
      {/* Encabezado del resultado */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          {homeTeam} vs {awayTeam}
        </h2>
        <p className="text-sm text-gray-400">Análisis generado por FORCH.i Oracle</p>
      </div>

      {/* Marcador predicho + Confianza */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-4">
        <div className="flex items-center justify-between mb-6">
          <ConfidenceMeter confidence={confidence} />
          <button
            onClick={handleShare}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-white/10 hover:border-forch-gold/30
                       rounded-lg transition-all duration-200 flex items-center gap-1.5"
          >
            {copied ? '✅ Copiado' : '📋 Compartir'}
          </button>
        </div>

        {/* Marcador grande */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="flex-1 text-right">
            <span className="text-4xl">{homeFlag}</span>
            <p className="text-white font-bold mt-2">{homeTeam}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-5xl font-black text-forch-gold">{predictedScoreHome}</span>
            <span className="text-2xl text-gray-600">—</span>
            <span className="text-5xl font-black text-forch-gold">{predictedScoreAway}</span>
          </div>
          <div className="flex-1 text-left">
            <span className="text-4xl">{awayFlag}</span>
            <p className="text-white font-bold mt-2">{awayTeam}</p>
          </div>
        </div>

        {/* Barras de probabilidad */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-white font-medium">{homeFlag} {homeTeam}</span>
              <span className="text-forch-gold font-bold">{homeWin}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-forch-gold to-yellow-500 h-3 rounded-full transition-all duration-1000"
                style={{ width: `${homeWin}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-white font-medium">Empate</span>
              <span className="text-gray-400 font-bold">{draw}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-gray-500 to-gray-400 h-3 rounded-full transition-all duration-1000"
                style={{ width: `${draw}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-white font-medium">{awayTeam} {awayFlag}</span>
              <span className="text-forch-gold font-bold">{awayWin}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-forch-gold to-yellow-500 h-3 rounded-full transition-all duration-1000"
                style={{ width: `${awayWin}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Forma reciente */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          📊 Forma Reciente (Últimos 5 partidos)
        </h3>
        <div className="space-y-3">
          <FormBubbles form={homeFormLast5} label={homeFlag} />
          <FormBubbles form={awayFormLast5} label={awayFlag} />
        </div>
      </div>

      {/* Comparativa lado a lado */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-4">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          ⚡ Comparativa de Equipos
        </h3>
        <ComparisonBars homeTeam={homeTeam} awayTeam={awayTeam} prediction={prediction} />
      </div>

      {/* Factores clave */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-4">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          🔑 Factores Clave
        </h3>
        <KeyFactors factors={keyFactors} />
      </div>

      {/* Jugadores estrella */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-4">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          ⭐ Jugadores Clave
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-2">{homeFlag} {homeTeam}</p>
            <div className="space-y-1.5">
              {homeStars.map((player, i) => (
                <div key={i} className="text-sm text-white flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-forch-gold" />
                  {player}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-2">{awayFlag} {awayTeam}</p>
            <div className="space-y-1.5">
              {awayStars.map((player, i) => (
                <div key={i} className="text-sm text-white flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                  {player}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Análisis táctico */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🧠</span>
          <h3 className="text-lg font-semibold text-white">Análisis Táctico</h3>
        </div>
        <p className="text-gray-300 leading-relaxed">{analysis}</p>
      </div>

      {/* Footer */}
      <div className="text-center mt-4 text-xs text-gray-500">
        Datos: API-Football + Groq Llama 3.3 · FORCH.i by Paulo Velasco
      </div>
    </div>
  );
}
