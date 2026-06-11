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
    <div className="max-w-6xl mx-auto">
      {/* ═══ HERO ═══ */}
      <section className="mb-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1">
              📊 Panel de Precisión
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary">
              Qué tan acertadas son nuestras predicciones · Motor Poisson + Elo + xG
            </p>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <div className="text-right">
              <div className="text-[10px] text-text-muted uppercase tracking-wider">Mundial 2026</div>
              <div className="text-lg sm:text-xl font-bold text-gradient-gold font-mono">
                {countdown.days}<span className="text-xs text-text-secondary">d</span> {countdown.hours}<span className="text-xs text-text-secondary">h</span> {countdown.minutes}<span className="text-xs text-text-secondary">m</span>
              </div>
            </div>
          </div>
        </div>

        {/* Accuracy hero cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Acierto Ganador" value={acc ? `${acc.winnerAccuracy}%` : '—'} color="gold" />
          <StatCard label="Error en Goles" value={acc ? `${acc.avgGoalError}` : '—'} color="blue" />
          <StatCard label="Over 2.5" value={acc ? `${acc.over25Accuracy}%` : '—'} color="emerald" />
          <StatCard label="Partidos Jugados" value={acc ? String(acc.totalMatched) : '0'} color="amber" />
        </div>

        {/* Prediction bar */}
        <div className="glass-card p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm text-white">
              <span className="font-bold text-accent-blue">{accuracyData?.totalPredictions || 0}</span>
              <span className="text-text-secondary"> / {accuracyData?.totalMatches || 128} predicciones</span>
            </div>
            <div className="text-[11px] text-text-muted mt-0.5 truncate">
              {acc && acc.totalMatched > 0
                ? `${acc.exactScoreHits} marcadores exactos · ${acc.withinOneGoal} dentro de 1 gol`
                : 'Genera predicciones para ver la precisión'}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={generatePredictions}
              disabled={generating}
              className="btn-premium text-xs px-4 py-2 disabled:opacity-50 whitespace-nowrap"
            >
              {generating ? '⏳...' : '⚡ Generar'}
            </button>
            <button
              onClick={loadDashboard}
              className="px-3 py-2 text-xs font-semibold text-text-secondary border border-white/[0.08] rounded-lg hover:text-white hover:border-white/[0.15] transition-all"
            >
              🔄
            </button>
          </div>
        </div>
      </section>

      {/* ═══ Trend Graph ═══ */}
      {trend.length > 0 && (
        <section className="mb-6 animate-fade-in-up">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
            📈 Tendencia de Precisión
          </h3>
          <div className="glass-card p-3 sm:p-4">
            <div className="flex items-end gap-0.5 h-28 sm:h-32">
              {trend.map((point, i) => {
                const height = Math.max(4, (point.winnerAccuracy / 100) * 112);
                const isLast = i === trend.length - 1;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t-sm transition-all ${isLast ? 'bg-accent-gold' : 'bg-accent-blue/40'}`}
                      style={{ height: `${height}px` }}
                      title={`${point.date}: ${point.winnerAccuracy}%`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-text-muted mt-2">
              <span>Precisión del modelo</span>
              <span>{trend.length} días</span>
            </div>
          </div>
        </section>
      )}

      {/* ═══ Match Comparisons ═══ */}
      {comparisons.length > 0 && (
        <section className="mb-6 animate-fade-in-up">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
            ⚽ Predicho vs Real
          </h3>
          <div className="space-y-1.5">
            {comparisons.slice(0, 20).map((c) => {
              const winnerIcon = c.winnerCorrect === true ? '✅' : c.winnerCorrect === false ? '❌' : '⏳';
              return (
                <div key={c.matchId} className="glass-card p-2.5 sm:p-3 flex items-center gap-3">
                  <span className="text-base w-5 text-center shrink-0">{winnerIcon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs mb-0.5">
                      <span className="text-text-muted font-mono w-8 sm:w-10 text-[10px]">{c.matchId}</span>
                      <span className="text-white truncate">{c.homeTeam}</span>
                      <span className="text-text-muted shrink-0">vs</span>
                      <span className="text-white truncate">{c.awayTeam}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px]">
                      <span className="text-accent-blue">Pred: {c.predictedHomeGoals}-{c.predictedAwayGoals}</span>
                      {c.isPlayed && c.realHomeGoals !== null && (
                        <span className={`font-medium ${c.winnerCorrect ? 'text-accent-emerald' : 'text-accent-crimson'}`}>
                          Real: {c.realHomeGoals}-{c.realAwayGoals}
                        </span>
                      )}
                      {c.goalError !== null && (
                        <span className="text-text-muted">Error: {c.goalError}g</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══ Quick Nav ═══ */}
      <section className="mb-6 animate-fade-in-up">
        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
          Navegación Rápida
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {[
            { href: '/fixture', icon: '⚡', label: 'Pronósticos', desc: '128 partidos' },
            { href: '/live', icon: '📈', label: 'En Vivo', desc: 'Resultados reales' },
            { href: '/veredicto', icon: '🏆', label: 'Veredicto', desc: 'Probabilidades' },
            { href: '/torneo', icon: '🎮', label: 'Simulador', desc: 'Bracket' },
            { href: '/pronostico', icon: '🎯', label: 'Predecir', desc: 'Individual' },
            { href: '/admin', icon: '⚙️', label: 'Admin', desc: 'Resultados' },
          ].map(link => (
            <Link key={link.href} href={link.href} className="glass-card p-3 sm:p-4 hover:border-white/[0.1] transition-colors group">
              <div className="text-xl sm:text-2xl mb-1.5">{link.icon}</div>
              <div className="text-xs sm:text-sm font-semibold text-white group-hover:text-accent-blue transition-colors">{link.label}</div>
              <div className="text-[10px] text-text-muted">{link.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══ Top 8 Elo ═══ */}
      <section className="mb-6 animate-fade-in-up">
        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
          🌍 Top 8 · Rating Elo
        </h3>
        <div className="glass-card overflow-hidden divide-y divide-white/[0.04]">
          {topTeams.map((team, i) => (
            <div key={team.name} className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className={`w-5 text-center text-[10px] sm:text-xs font-bold shrink-0 ${
                  i === 0 ? 'text-accent-gold' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-text-muted'
                }`}>
                  {i + 1}
                </span>
                <span className="text-base sm:text-lg shrink-0">{team.flag}</span>
                <span className="text-xs sm:text-sm text-white truncate">{team.name}</span>
              </div>
              <span className="text-xs sm:text-sm font-bold font-mono text-accent-blue shrink-0 ml-2">{team.elo}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-4 text-[11px] text-text-muted border-t border-white/[0.04]">
        <p>Built with FORCH.i by Paulo Velasco · Poisson + Dixon-Coles + Elo · WC2026</p>
      </footer>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    gold: 'text-gradient-gold',
    blue: 'text-accent-blue',
    emerald: 'text-accent-emerald',
    amber: 'text-accent-amber',
  };
  return (
    <div className="glass-card p-3 sm:p-4 text-center">
      <div className={`text-2xl sm:text-3xl font-bold ${colorMap[color] || 'text-white'} mb-0.5`}>{value}</div>
      <div className="text-[10px] sm:text-xs text-text-secondary">{label}</div>
    </div>
  );
}
