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
  const [topTeams, setTopTeams] = useState<{ name: string; elo: number; flag: string }[]>([]);
  const [dashError, setDashError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0 });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    loadDashboard();
    const sorted = WORLD_CUP_TEAMS
      .map(t => ({ name: t.name, elo: ELO_RATINGS[t.name]?.elo || 1500, flag: t.flag }))
      .sort((a, b) => b.elo - a.elo)
      .slice(0, 8);
    setTopTeams(sorted);

    // Live countdown
    const updateCountdown = () => {
      const now = new Date();
      const target = new Date('2026-06-11T19:00:00Z');
      const diff = Math.max(0, target.getTime() - now.getTime());
      setCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
      });
    };
    updateCountdown();
    const countdownInterval = setInterval(updateCountdown, 60000);

    // Auto-refresh every 30 minutes
    const refreshInterval = setInterval(() => {
      console.log('[dashboard] Auto-refreshing...');
      loadDashboard();
    }, 30 * 60 * 1000);

    return () => {
      clearInterval(countdownInterval);
      clearInterval(refreshInterval);
    };
  }, []);

  const loadDashboard = async () => {
    setDashError(null);
    try {
      const res = await fetch('/api/accuracy');
      const data = await res.json();
      if (data.success) {
        setAccuracyData(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('[dashboard] Error loading:', err);
      setDashError('No se pudieron cargar las métricas');
    }
    finally { setLoading(false); }
  };

  const acc = accuracyData?.accuracy;
  const trend = accuracyData?.trend || [];
  const comparisons = accuracyData?.comparisons || [];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Error */}
      {dashError && (
        <div className="glass-card p-3 text-center mb-4 border border-accent-crimson/20 animate-fade-in">
          <p className="text-accent-crimson text-sm">{dashError}</p>
          <button onClick={loadDashboard} className="btn-premium text-xs mt-2 px-3 py-1.5">🔄 Reintentar</button>
        </div>
      )}

      {/* ═══ HERO ═══ */}
      <section className="mb-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 flex items-center gap-2">
              <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-card-sm bg-accent-blue/10 flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </span>
              Panel de Precisión
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
          <StatCard label="Acierto Ganador" value={acc ? `${acc.winnerAccuracy}%` : '—'} color="gold" icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0116.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-2.27.52m0 0c-.26 0-.515.02-.77.054m0 0a6.003 6.003 0 01-2.27-.52" />
            </svg>
          } />
          <StatCard label="Error en Goles" value={acc ? `${acc.avgGoalError}` : '—'} color="blue" icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
            </svg>
          } />
          <StatCard label="Over 2.5" value={acc ? `${acc.over25Accuracy}%` : '—'} color="emerald" icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
          } />
          <StatCard label="Partidos Jugados" value={acc ? String(acc.totalMatched) : '0'} color="amber" icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          } />
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
                : 'Esperando resultados de partidos para calcular precisión'}
            </div>
          </div>
          <div className="text-[10px] text-text-muted shrink-0 text-right">
            {lastUpdated ? (
              <span>Actualizado: {lastUpdated.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}</span>
            ) : (
              <span className="animate-pulse">Cargando...</span>
            )}
          </div>
        </div>
      </section>

      {/* ═══ Trend Graph ═══ */}
      {trend.length > 0 && (
        <section className="mb-6 animate-fade-in-up">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
            Tendencia de Precisión
          </h3>
          <div className="glass-card p-3 sm:p-4">
            <div className="flex items-end gap-0.5 h-28 sm:h-32">
              {trend.map((point, i) => {
                const height = Math.max(4, (point.winnerAccuracy / 100) * 112);
                const isLast = i === trend.length - 1;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t-sm transition-all duration-500 ${isLast ? 'bg-accent-gold' : 'bg-accent-blue/40'}`}
                      style={{ height: `${height}px`, transitionDelay: `${i * 30}ms` }}
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
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-accent-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            Predicho vs Real
          </h3>
          <div className="space-y-1.5">
            {comparisons.slice(0, 20).map((c, i) => {
              const winnerIcon = c.winnerCorrect === true ? '✅' : c.winnerCorrect === false ? '❌' : '⏳';
              return (
                <div key={c.matchId} className="glass-card p-2.5 sm:p-3 flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: `${i * 30}ms` }}>
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
            { href: '/fixture', label: 'Predicción', desc: '128 partidos', color: 'accent-blue', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg> },
            { href: '/live', label: 'En Vivo', desc: 'Resultados reales', color: 'accent-emerald', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg> },
            { href: '/benchmark', label: 'Benchmark', desc: 'Comparar modelos', color: 'accent-amber', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" /></svg> },
          ].map(link => (
            <Link key={link.href} href={link.href} className="glass-card p-3 sm:p-4 hover:border-white/[0.1] transition-all duration-200 group">
              <div className={`w-8 h-8 rounded-lg bg-${link.color}/10 flex items-center justify-center mb-2 text-${link.color} group-hover:scale-110 transition-transform duration-200`}>
                {link.icon}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-white group-hover:text-accent-blue transition-colors">{link.label}</div>
              <div className="text-[10px] text-text-muted">{link.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══ Top 8 Elo ═══ */}
      <section className="mb-6 animate-fade-in-up">
        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-accent-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
          </svg>
          Top 8 · Rating Elo
        </h3>
        <div className="glass-card overflow-hidden divide-y divide-white/[0.04]">
          {topTeams.map((team, i) => (
            <div key={team.name} className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className={`w-5 text-center text-[10px] sm:text-xs font-bold shrink-0 ${
                  i === 0 ? 'text-accent-gold' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-text-muted'
                }`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
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

function StatCard({ label, value, color, icon }: { label: string; value: string; color: string; icon?: React.ReactNode }) {
  const colorMap: Record<string, string> = {
    gold: 'text-gradient-gold',
    blue: 'text-accent-blue',
    emerald: 'text-accent-emerald',
    amber: 'text-accent-amber',
  };
  const bgMap: Record<string, string> = {
    gold: 'bg-accent-gold/10',
    blue: 'bg-accent-blue/10',
    emerald: 'bg-accent-emerald/10',
    amber: 'bg-accent-amber/10',
  };
  return (
    <div className="glass-card p-3 sm:p-4 text-center animate-fade-in-up">
      {icon && (
        <div className={`w-8 h-8 rounded-lg ${bgMap[color] || 'bg-white/5'} flex items-center justify-center mx-auto mb-2 ${colorMap[color] || 'text-white'}`}>
          {icon}
        </div>
      )}
      <div className={`text-2xl sm:text-3xl font-bold ${colorMap[color] || 'text-white'} mb-0.5`}>{value}</div>
      <div className="text-[10px] sm:text-xs text-text-secondary">{label}</div>
    </div>
  );
}
