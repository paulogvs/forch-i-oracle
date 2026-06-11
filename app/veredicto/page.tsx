'use client';

import { useState, useEffect } from 'react';
import { getTeamByName } from '@/lib/teams';

interface TeamPrediction {
  teamId: string;
  championProb: number;
  simulationsCount: number;
  totalSimulations: number;
}

interface PredictionHistory {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeWin: number;
  draw: number;
  awayWin: number;
  confidence: string;
  updatedAt: string;
}

export default function VeredictoPage() {
  const [topTeams, setTopTeams] = useState<TeamPrediction[]>([]);
  const [predictions, setPredictions] = useState<PredictionHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('');
  const [totalMatches, setTotalMatches] = useState(0);
  const [totalPredictions, setTotalPredictions] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [predRes, simRes] = await Promise.all([
        fetch('/api/predictions/all'),
        fetch('/api/simulate-tournament'),
      ]);

      const predData = await predRes.json();
      const simData = await simRes.json();

      if (predData.success) {
        setPredictions(
          (predData.matches || [])
            .filter((m: any) => m.prediction)
            .map((m: any) => ({
              matchId: m.id,
              homeTeam: m.homeTeamId || m.homeTeam,
              awayTeam: m.awayTeamId || m.awayTeam,
              homeWin: m.prediction.homeWin,
              draw: m.prediction.draw,
              awayWin: m.prediction.awayWin,
              confidence: m.prediction.confidence || 'media',
              updatedAt: m.prediction.predictedAt || new Date().toISOString(),
            }))
        );
        setTotalMatches(predData.totalMatches || 0);
        setTotalPredictions(predData.totalPredictions || 0);
      }

      if (simData.success) {
        setTopTeams(simData.tournamentProbs || simData.top8 || []);
        setLastUpdate(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (err) {
      console.error('Error loading veredicto:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFlag = (name: string) => getTeamByName(name)?.flag || '❓';

  // Sort predictions by confidence (most certain first)
  const sortedPredictions = [...predictions].sort((a, b) => {
    const maxA = Math.max(a.homeWin, a.draw, a.awayWin);
    const maxB = Math.max(b.homeWin, b.draw, b.awayWin);
    return maxB - maxA;
  }).slice(0, 20);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-5 animate-fade-in">
        <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">📊 Veredicto Vivo</h1>
        <p className="text-xs sm:text-sm text-text-secondary">
          Estado actual del torneo · Predicciones basadas en Poisson + Elo + xG
        </p>
        {lastUpdate && (
          <p className="text-xs text-text-muted mt-1">
            Última actualización: {lastUpdate}
          </p>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 mb-8 animate-fade-in-up">
        <div className="glass-card p-4 text-center">
          <div className="text-xl font-bold text-white">{totalMatches}</div>
          <div className="text-xs text-text-secondary">Partidos totales</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-xl font-bold text-accent-blue">{totalPredictions}</div>
          <div className="text-xs text-text-secondary">Predicciones</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-xl font-bold text-accent-gold">{topTeams.length}</div>
          <div className="text-xs text-text-secondary">Equipos rankeados</div>
        </div>
      </div>

      {/* Top 8 Champion Probability */}
      <section className="mb-10 animate-fade-in-up stagger-1">
        <h3 className="text-sm font-bold text-accent-gold uppercase tracking-wider mb-4">
          🏆 Probabilidad de Campeón
        </h3>
        {topTeams.length > 0 ? (
          <div className="space-y-2">
            {topTeams.slice(0, 8).map((team, i) => {
              const name = team.teamId || (team as any).team || '';
              const pct = team.championProb || (team as any).pct || 0;
              return (
                <div key={name} className="glass-card p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 text-center text-sm font-bold ${
                        i === 0 ? 'text-accent-gold' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-text-muted'
                      }`}>
                        {i + 1}
                      </span>
                      <span className="text-xl">{getFlag(name)}</span>
                      <span className="text-sm text-white font-medium">{name}</span>
                    </div>
                    <span className="text-lg font-bold text-accent-blue font-mono">{pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: i === 0
                          ? 'linear-gradient(90deg, #D4AF37, #E6C84A)'
                          : i < 3
                            ? 'rgba(43, 127, 255, 0.5)'
                            : 'rgba(43, 127, 255, 0.25)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-card p-8 text-center">
            <p className="text-text-secondary text-sm mb-4">
              Aún no hay simulaciones ejecutadas
            </p>
            <button onClick={loadData} className="btn-premium text-sm px-4 py-2">
              🔄 Actualizar datos
            </button>
          </div>
        )}
      </section>

      {/* Top predictions by confidence */}
      <section className="mb-10 animate-fade-in-up stagger-2">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4">
          🔥 Predicciones Más Ciertas
        </h3>
        {sortedPredictions.length > 0 ? (
          <div className="space-y-2">
            {sortedPredictions.map((pred) => {
              const maxProb = Math.max(pred.homeWin, pred.draw, pred.awayWin);
              const likelyOutcome = maxProb === pred.homeWin ? pred.homeTeam :
                maxProb === pred.draw ? 'Empate' : pred.awayTeam;
              return (
                <div key={pred.matchId} className="glass-card p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{getFlag(pred.homeTeam)}</span>
                      <span className="text-xs text-white">{pred.homeTeam}</span>
                      <span className="text-text-muted">vs</span>
                      <span className="text-xs text-white">{pred.awayTeam}</span>
                      <span className="text-base">{getFlag(pred.awayTeam)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-accent-emerald">{likelyOutcome}</span>
                      <span className="text-xs text-text-muted ml-2">{maxProb}%</span>
                    </div>
                  </div>
                  <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden mt-2">
                    <div style={{ width: `${pred.homeWin}%` }} className="bg-accent-blue/60" />
                    <div style={{ width: `${pred.draw}%` }} className="bg-white/20" />
                    <div style={{ width: `${pred.awayWin}%` }} className="bg-accent-crimson/60" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-card p-6 text-center text-sm text-text-secondary">
            No hay predicciones disponibles aún
          </div>
        )}
      </section>
    </div>
  );
}
