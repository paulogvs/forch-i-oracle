'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { WORLD_CUP_TEAMS, ELO_RATINGS } from '@/lib/teams';

interface AccuracyData {
  accuracy: {
    winnerAccuracy: number;
    drawAccuracy: number;
    totalMatched: number;
    avgGoalError: number;
    homeGoalError: number;
    awayGoalError: number;
    over25Accuracy: number;
    bttsAccuracy: number;
    exactScoreHits: number;
    withinOneGoal: number;
    groupAccuracy: number;
    knockoutAccuracy: number;
  };
  comparisons: any[];
  totalComparisons: number;
  trend: { date: string; matchesPlayed: number; winnerAccuracy: number; avgGoalError: number }[];
  totalPredictions: number;
  totalMatches: number;
}

export default function HomePage() {
  const [accuracyData, setAccuracyData] = useState<AccuracyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [topTeams, setTopTeams] = useState<{ name: string; elo: number; flag: string }[]>([]);

  useEffect(() => {
    loadDashboard();
    // Top 8 teams by Elo
    const sorted = WORLD_CUP_TEAMS
      .map(t => ({ name: t.name, elo: ELO_RATINGS[t.name]?.elo || 1500, flag: t.flag }))
      .sort((a, b) => b.elo - a.elo)
      .slice(0, 8);
    setTopTeams(sorted);
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await fetch('/api/accuracy');
      const data = await res.json();
      if (data.success) setAccuracyData(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const generatePredictions = async () => {
    setGenerating(true);
    try {
      await fetch('/api/accuracy', { method: 'POST' });
      await loadDashboard();
    } catch { /* ignore */ }
    finally { setGenerating(false); }
  };

  const countdown = (() => {
    const now = new Date();
    const target = new Date('2026-06-11T19:00:00Z');
    const diff = Math.max(0, target.getTime() - now.getTime());
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
    };
  })();

  const acc = accuracyData?.accuracy;
  const trend = accuracyData?.trend || [];
  const comparisons = accuracyData?.comparisons || [];

  return (
    <div className="min-h-screen px-4 md:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      {/* ═══ HERO: Accuracy Dashboard ═══ */}
      <section className="mb-8 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
              📊 Panel de Precisión
            </h1>
            <p className="text-sm text-text-secondary">
              Qué tan acertadas son nuestras predicciones · Motor Poisson + Elo + xG
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-text-muted">Mundial 2026</div>
            <div className="text-sm font-bold text-accent-gold">{countdown.days}d {countdown.hours}h</div>
          </div>
        </div>

        {/* Accuracy hero cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="glass-card p-4 text-center">
            <div className="text-3xl font-bold text-gradient-gold mb-1">
              {acc ? `${acc.winnerAccuracy}%` : '—'}
            </div>
            <div className="text-xs text-text-secondary">Acierto Ganador</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-3xl font-bold text-accent-blue mb-1">
              {acc ? `${acc.avgGoalError}` : '—'}
            </div>
            <div className="text-xs text-text-secondary">Error en Goles</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-3xl font-bold text-accent-emerald mb-1">
              {acc ? `${acc.over25Accuracy}%` : '—'}
            </div>
            <div className="text-xs text-text-secondary">Over 2.5</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-3xl font-bold text-accent-amber mb-1">
              {acc ? acc.totalMatched : 0}
            </div>
            <div className="text-xs text-text-secondary">Partidos Jugados</div>
          </div>
        </div>

        {/* Prediction count + generate button */}
        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-white">
              <span className="font-bold text-accent-blue">{accuracyData?.totalPredictions || 0}</span>
              <span className="text-text-secondary"> / {accuracyData?.totalMatches || 128} predicciones</span>
            </div>
            <div className="text-xs text-text-muted">
              {acc && acc.totalMatched > 0
                ? `${acc.exactScoreHits} marcadores exactos · ${acc.withinOneGoal} dentro de 1 gol`
                : 'Genera predicciones para ver la precisión'}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={generatePredictions}
              disabled={generating}
              className="btn-premium text-xs px-4 py-2 disabled:opacity-50"
            >
              {generating ? '⏳...' : '⚡ Generar Predicciones'}
            </button>
            <button
              onClick={loadDashboard}
              className="px-4 py-2 text-xs font-semibold text-text-secondary border border-white/[0.1] rounded-xl hover:text-white transition-all"
            >
              🔄 Actualizar
            </button>
          </div>
        </div>
      </section>

      {/* ═══ Accuracy Trend Graph ═══ */}
      {trend.length > 0 && (
        <section className="mb-8 animate-fade-in-up">
          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4">
            📈 Tendencia de Precisión
          </h3>
          <div className="glass-card p-4">
            <div className="flex items-end gap-1 h-32">
              {trend.map((point, i) => {
                const height = Math.max(4, (point.winnerAccuracy / 100) * 120);
                const isLast = i === trend.length - 1;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t transition-all ${
                        isLast ? 'bg-accent-gold' : 'bg-accent-blue/40'
                      }`}
                      style={{ height: `${height}px` }}
                      title={`${point.date}: ${point.winnerAccuracy}% · ${point.matchesPlayed} partidos`}
                    />
                    <span className="text-[8px] text-text-muted truncate w-full text-center">
                      {new Date(point.date + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric' })}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-text-muted mt-2">
              <span>Precisión del modelo a lo largo del torneo</span>
              <span>{trend.length} días</span>
            </div>
          </div>
        </section>
      )}

      {/* ═══ Match-by-Match Comparison ═══ */}
      {comparisons.length > 0 && (
        <section className="mb-8 animate-fade-in-up stagger-1">
          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4">
            ⚽ Predicho vs Real ({comparisons.length} partidos)
          </h3>
          <div className="space-y-1">
            {comparisons.slice(0, 30).map((c) => {
              const winnerIcon = c.winnerCorrect === true ? '✅' : c.winnerCorrect === false ? '❌' : '⏳';
              return (
                <div key={c.matchId} className="glass-card p-3 flex items-center gap-4">
                  <span className="text-lg w-6 text-center">{winnerIcon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-muted font-mono w-10">{c.matchId}</span>
                      <span className="text-white truncate">{c.homeTeam}</span>
                      <span className="text-text-muted">vs</span>
                      <span className="text-white truncate text-right">{c.awayTeam}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-accent-blue">
                        Pred: {c.predictedHomeGoals}-{c.predictedAwayGoals}
                      </span>
                      {c.isPlayed && c.realHomeGoals !== null && (
                        <span className="text-[10px] text-accent-emerald">
                          Real: {c.realHomeGoals}-{c.realAwayGoals}
                        </span>
                      )}
                      {c.goalError !== null && (
                        <span className="text-[10px] text-text-muted">
                          Error: {c.goalError} goles
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══ Quick Navigation ═══ */}
      <section className="mb-8 animate-fade-in-up stagger-2">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4">
          Navegación Rápida
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { href: '/fixture', icon: '⚡', label: 'Pronósticos', desc: '128 partidos predichos' },
            { href: '/veredicto', icon: '📊', label: 'Veredicto Vivo', desc: 'Probabilidades actuales' },
            { href: '/torneo', icon: '🏆', label: 'Simulador', desc: 'Bracket completo' },
            { href: '/pronostico', icon: '🎯', label: 'Predecir', desc: 'Partido individual' },
            { href: '/admin', icon: '⚙️', label: 'Admin', desc: 'Resultados reales' },
            { href: '/benchmark', icon: '🤖', label: 'Benchmark', desc: 'Comparar modelos' },
          ].map(link => (
            <Link key={link.href} href={link.href} className="glass-card p-4 hover:border-white/[0.1] transition-colors group">
              <div className="text-2xl mb-2">{link.icon}</div>
              <div className="text-sm font-semibold text-white group-hover:text-accent-blue transition-colors">{link.label}</div>
              <div className="text-[10px] text-text-muted">{link.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══ Top 8 Elo ═══ */}
      <section className="mb-8 animate-fade-in-up stagger-3">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4">
          🌍 Top 8 · Rating Elo
        </h3>
        <div className="glass-card overflow-hidden">
          {topTeams.map((team, i) => (
            <div key={team.name} className={`flex items-center justify-between px-4 py-2.5 ${i !== topTeams.length - 1 ? 'border-b border-white/[0.04]' : ''}`}>
              <div className="flex items-center gap-3">
                <span className={`w-5 text-center text-xs font-bold ${i === 0 ? 'text-accent-gold' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-text-muted'}`}>
                  {i + 1}
                </span>
                <span className="text-base">{team.flag}</span>
                <span className="text-sm text-white">{team.name}</span>
              </div>
              <span className="text-sm font-bold font-mono text-accent-blue">{team.elo}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-text-muted border-t border-white/[0.04]">
        <p>Built with FORCH.i by Paulo Velasco · Poisson + Dixon-Coles + Elo · WC2026</p>
      </footer>
    </div>
  );
}
