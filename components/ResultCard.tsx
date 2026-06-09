'use client';

interface Prediction {
  homeWin: number;
  draw: number;
  awayWin: number;
  analysis: string;
}

interface ResultCardProps {
  prediction: Prediction;
  homeTeam: string;
  awayTeam: string;
}

export default function ResultCard({ prediction, homeTeam, awayTeam }: ResultCardProps) {
  const { homeWin, draw, awayWin, analysis } = prediction;

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 animate-fade-in">
      {/* Header del resultado */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          {homeTeam} vs {awayTeam}
        </h2>
        <p className="text-sm text-gray-400">Análisis generado por FORCH.i Oracle</p>
      </div>

      {/* Barras de probabilidad */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
        <div className="space-y-4">
          {/* Victoria Local */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-white font-medium">{homeTeam}</span>
              <span className="text-forch-gold font-bold">{homeWin}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-forch-gold to-yellow-500 h-3 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${homeWin}%` }}
              />
            </div>
          </div>

          {/* Empate */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-white font-medium">Empate</span>
              <span className="text-gray-400 font-bold">{draw}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-gray-500 to-gray-400 h-3 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${draw}%` }}
              />
            </div>
          </div>

          {/* Victoria Visitante */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-white font-medium">{awayTeam}</span>
              <span className="text-forch-gold font-bold">{awayWin}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-forch-gold to-yellow-500 h-3 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${awayWin}%` }}
              />
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
