'use client';

import { useEffect, useState, useCallback } from 'react';
import { Target, Zap, CheckCircle2, ArrowRight, TrendingUp, Activity, Trophy, BarChart3, Calendar } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { ALL_MATCHES } from '@/lib/matches';
import { getTeamByName } from '@/lib/teams';
import { createSmartInterval } from '@/lib/smart-refresh';

interface FixtureMatch {
  id: string; homeTeam: string; awayTeam: string; round: string; group: string;
  predictedScore: [number, number] | null; homeWinPct: number; drawPct: number; awayWinPct: number;
  confidence: string | null;
}
interface LiveMatch {
  homeTeam: string; awayTeam: string; homeScore: number; awayScore: number;
  isFinished: boolean; isLive: boolean; timeElapsed: string; group: string;
  homeScorers: string[]; awayScorers: string[];
}
interface SimResult {
  matchId: string; homeScore: number; awayScore: number; winner: string;
}

export default function DashboardPage() {
  const [predictions, setPredictions] = useState<Map<string, FixtureMatch>>(new Map());
  const [finishedMatches, setFinishedMatches] = useState<LiveMatch[]>([]);
  const [liveNow, setLiveNow] = useState<LiveMatch[]>([]);
  const [simResults, setSimResults] = useState<Map<string, SimResult>>(new Map());
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      const [fixtureRes, liveRes, simRes] = await Promise.all([
        fetch('/api/fixture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ useEnhanced: true }) }),
        fetch('/api/live-scores'),
        fetch('/api/simulate-tournament'),
      ]);
      const [fixtureData, liveData, simData] = await Promise.all([fixtureRes.json(), liveRes.json(), simRes.json()]);

      const predMap = new Map<string, FixtureMatch>();
      if (fixtureData.success && fixtureData.fixture) {
        for (const m of fixtureData.fixture) {
          predMap.set(m.id, {
            id: m.id, homeTeam: m.homeTeam, awayTeam: m.awayTeam, round: m.round, group: m.group || '',
            predictedScore: m.predictedScore ?? null,
            homeWinPct: m.homeWinPct ?? 0, drawPct: m.drawPct ?? 0, awayWinPct: m.awayWinPct ?? 0,
            confidence: m.confidence ?? null,
          });
        }
      }
      setPredictions(predMap);

      const finished: LiveMatch[] = [];
      const live: LiveMatch[] = [];
      if (liveData.success) {
        for (const m of (liveData.finished || [])) finished.push(m);
        for (const m of (liveData.live || [])) live.push(m);
      }
      setFinishedMatches(finished);
      setLiveNow(live);

      const resultMap = new Map<string, SimResult>();
      if (simData.success && simData.results) {
        for (const r of simData.results) resultMap.set(r.matchId, r);
      }
      setSimResults(resultMap);
      setLastUpdated(new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error('[dashboard] Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { return createSmartInterval(loadData); }, [loadData]);

  // Compute real stats
  const stats = (() => {
    let correct = 0, wrong = 0, totalPlayed = 0;
    let over25Correct = 0, over25Total = 0, exactScores = 0;
    const matchDetails: { home: string; away: string; pred: [number, number]; real: [number, number]; correct: boolean; exact: boolean }[] = [];

    for (const lm of finishedMatches) {
      const staticMatch = ALL_MATCHES.find(m => m.homeTeam === lm.homeTeam && m.awayTeam === lm.awayTeam);
      if (!staticMatch) continue;
      const pred = predictions.get(staticMatch.id);
      if (!pred?.predictedScore) continue;

      const [pH, pA] = pred.predictedScore;
      const rH = lm.homeScore;
      const rA = lm.awayScore;
      const predWinner = pH > pA ? 'home' : pH < pA ? 'away' : 'draw';
      const realWinner = rH > rA ? 'home' : rH < rA ? 'away' : 'draw';
      const isCorrect = predWinner === realWinner;
      const isExact = pH === rH && pA === rA;

      if (isCorrect) correct++; else wrong++;
      totalPlayed++;
      const predOver25 = (pH + pA) > 2;
      const realOver25 = (rH + rA) > 2;
      if (predOver25 === realOver25) over25Correct++;
      over25Total++;
      if (isExact) exactScores++;
      matchDetails.push({ home: lm.homeTeam, away: lm.awayTeam, pred: [pH, pA], real: [rH, rA], correct: isCorrect, exact: isExact });
    }

    return {
      winnerAccuracy: totalPlayed > 0 ? Math.round((correct / totalPlayed) * 100) : 0,
      errorCount: wrong, correctCount: correct, totalPlayed,
      over25Accuracy: over25Total > 0 ? Math.round((over25Correct / over25Total) * 100) : 0,
      exactScores, totalMatches: ALL_MATCHES.length,
      predictedCount: Array.from(predictions.values()).filter(p => p.predictedScore !== null).length,
      matchDetails,
    };
  })();

  const getFlag = (name: string) => getTeamByName(name)?.flag || '🏳️';

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade">
      {/* Header */}
      <header>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="premium">Panel de Control · WC2026</Badge>
          <span className="text-[10px] text-fg-tertiary">{lastUpdated && `↻ ${lastUpdated}`}</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Predicciones IA <span className="text-gold">Mundial 2026</span>
        </h1>
        <p className="text-xs text-fg-secondary mt-0.5">Poisson + Dixon-Coles + Elo + xG</p>
        {/* Progress */}
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-1.5 bg-raised/50 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-accent-primary via-accent-emerald to-accent-premium rounded-full transition-all duration-700"
              style={{ width: `${stats.totalMatches > 0 ? (stats.predictedCount / stats.totalMatches) * 100 : 0}%` }} />
          </div>
          <span className="text-[10px] text-fg-tertiary tabular-nums">{stats.predictedCount}/{stats.totalMatches}</span>
        </div>
      </header>

      {/* ═══ MÉTRICAS — 2x2 grid como mobile ═══ */}
      <div className="grid grid-cols-2 gap-2">
        <StatPill
          icon={<Target className="h-3.5 w-3.5" />}
          label="Acierto"
          value={stats.totalPlayed > 0 ? `${stats.winnerAccuracy}%` : '—'}
          sub={stats.totalPlayed > 0 ? `${stats.correctCount}/${stats.totalPlayed}` : 'Sin datos'}
          color={stats.totalPlayed > 0 ? (stats.winnerAccuracy >= 50 ? 'emerald' : 'red') : 'blue'}
        />
        <StatPill
          icon={<Zap className="h-3.5 w-3.5" />}
          label="Error Goles"
          value={stats.totalPlayed > 0 ? (Math.abs(stats.matchDetails.reduce((a, m) => a + Math.abs(m.pred[0] - m.real[0]) + Math.abs(m.pred[1] - m.real[1]), 0) / Math.max(1, stats.totalPlayed))).toFixed(1) : '—'}
          sub="MAE prom."
          color={stats.totalPlayed > 0 ? 'blue' : 'blue'}
        />
        <StatPill
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label="Over 2.5"
          value={stats.over25Accuracy > 0 ? `${stats.over25Accuracy}%` : '—'}
          sub={stats.totalPlayed > 0 ? `${stats.over25Accuracy}%` : 'Sin datos'}
          color="emerald"
        />
        <StatPill
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label="Jugados"
          value={`${stats.totalPlayed}`}
          sub={`${stats.exactScores} 🎯 exactos`}
          color="gold"
        />
      </div>

      {/* ═══ EVOLUCIÓN DE PRECISIÓN ═══ */}
      {stats.matchDetails.length > 0 && (() => {
        // Group matches by date and compute accuracy per day
        const byDate: Record<string, { correct: number; total: number }> = {};
        for (const m of stats.matchDetails) {
          const lm = finishedMatches.find(f => f.homeTeam === m.home && f.awayTeam === m.away);
          if (!lm) continue;
          // Use a simple date grouping based on order (since we don't have exact dates in matchDetails)
          const day = `Día ${Object.keys(byDate).length + 1}`;
          if (!byDate[day]) byDate[day] = { correct: 0, total: 0 };
          byDate[day].total++;
          if (m.correct) byDate[day].correct++;
        }
        const days = Object.entries(byDate);
        if (days.length < 2) return null;
        const maxPct = Math.max(...days.map(([, v]) => v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0));
        return (
          <section className="space-y-2">
            <h2 className="text-xs font-bold text-fg-primary flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-accent-premium" />
              Evolución de Precisión
            </h2>
            <div className="surface p-3 rounded-[var(--r-lg)]">
              <div className="space-y-2">
                {days.map(([day, { correct, total }]) => {
                  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
                  const barColor = pct >= 60 ? 'bg-accent-emerald/70' : pct >= 40 ? 'bg-accent-premium/70' : 'bg-state-danger/70';
                  return (
                    <div key={day} className="flex items-center gap-2">
                      <span className="text-[10px] text-fg-tertiary w-10 text-right font-mono">{day}</span>
                      <div className="flex-1 h-4 bg-raised/50 rounded overflow-hidden relative">
                        <div className={cn("h-full rounded transition-all duration-500", barColor)} style={{ width: `${pct}%` }} />
                        <span className="absolute inset-0 flex items-center justify-end pr-2 text-[9px] font-bold text-white drop-shadow">{correct}/{total}</span>
                      </div>
                      <span className="text-[10px] text-fg-tertiary w-8 text-right font-mono">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })()}

      {/* ═══ PARTIDO DEL DÍA ═══ */}
      {(() => {
        // Find upcoming matches with closest-to-50/50 combined probability
        const upcomingWithPred = Array.from(predictions.values()).filter(p =>
          p.predictedScore && !finishedMatches.some(f => f.homeTeam === p.homeTeam && f.awayTeam === p.awayTeam)
        );
        if (upcomingWithPred.length === 0) return null;
        // Score: closest to 50/50 home+away probability
        const scored = upcomingWithPred.map(p => {
          const balance = Math.abs(p.homeWinPct - p.awayWinPct); // lower = more balanced
          const scoreCloseness = Math.abs(p.predictedScore![0] - p.predictedScore![1]) <= 1 ? 0 : 2; // close scores preferred
          return { ...p, interestScore: balance + scoreCloseness };
        });
        scored.sort((a, b) => a.interestScore - b.interestScore);
        const best = scored[0];
        const [h, a] = best.predictedScore!;
        return (
          <section className="space-y-2">
            <h2 className="text-xs font-bold text-fg-primary flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-accent-premium" />
              Partido del Día
            </h2>
            <div className="surface-interactive p-4 rounded-[var(--r-lg)] border border-accent-premium/20">
              <div className="flex items-center gap-3">
                <div className="flex-1 text-center">
                  <span className="text-2xl">{getFlag(best.homeTeam)}</span>
                  <div className="text-xs font-bold text-fg-primary mt-1">{best.homeTeam}</div>
                </div>
                <div className="text-center px-4">
                  <div className="px-4 py-2 bg-accent-premium/15 rounded-[var(--r-md)] border border-accent-premium/20">
                    <span className="font-mono font-bold text-lg text-accent-premium tabular-nums">{h}-{a}</span>
                  </div>
                  <div className="text-[10px] text-fg-tertiary mt-1">Predicción</div>
                </div>
                <div className="flex-1 text-center">
                  <span className="text-2xl">{getFlag(best.awayTeam)}</span>
                  <div className="text-xs font-bold text-fg-primary mt-1">{best.awayTeam}</div>
                </div>
              </div>
              <p className="text-[10px] text-fg-tertiary text-center mt-2">⚡ Partido equilibrado — predicción ajustada</p>
            </div>
          </section>
        );
      })()}

      {/* ═══ RESULTADOS REALES ═══ */}
      {stats.matchDetails.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-bold text-fg-primary flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-accent-emerald" />
            Resultados Reales
          </h2>
          {stats.matchDetails.map((m, i) => (
              <div key={i} className={cn(
              "flex items-center gap-2 p-3 rounded-[var(--r-lg)] border",
              m.exact ? "bg-[#052E16] border-[#166534]"
              : m.correct ? "bg-[#14291E] border-[#1B6B3A]"
              : "bg-[#2A0A0A] border-[#991B1B]"
            )}>
              {/* Home */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="text-base shrink-0">{getFlag(m.home)}</span>
                <span className={cn("text-xs truncate", m.correct || m.exact ? "text-[#BBF7D0]" : "text-[#FECACA]")}>{m.home}</span>
              </div>
              {/* Score: Real TOP, Pred BOTTOM */}
              <div className="shrink-0 flex flex-col items-center gap-0.5">
                <div className={cn("px-2.5 py-0.5 rounded-[var(--r-sm)]", m.exact ? "bg-[#166534]" : m.correct ? "bg-[#1B6B3A]" : "bg-[#991B1B]")}>
                  <span className={cn("font-mono font-bold text-sm tabular-nums", m.exact ? "text-[#4ADE80]" : m.correct ? "text-[#FACC15]" : "text-[#FCA5A5]")}>{m.real[0]}-{m.real[1]}</span>
                </div>
                <span className="text-[9px] text-[#6B7280] font-mono">Pred: {m.pred[0]}-{m.pred[1]}</span>
              </div>
              {/* Status icon */}
              <span className="text-xs shrink-0">{m.exact ? '🎯' : m.correct ? '✅' : '❌'}</span>
              {/* Away */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                <span className={cn("text-xs truncate text-right", m.correct || m.exact ? "text-[#BBF7D0]" : "text-[#FECACA]")}>{m.away}</span>
                <span className="text-base shrink-0">{getFlag(m.away)}</span>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ═══ EN VIVO ═══ */}
      {liveNow.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="live-dot w-2 h-2 rounded-full bg-accent-emerald" />
            <h2 className="text-xs font-bold text-fg-primary">En vivo</h2>
          </div>
          <div className="surface-live p-3 space-y-2">
            {liveNow.slice(0, 4).map((m, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs"><span className="text-base">{getFlag(m.homeTeam)}</span><span className="font-medium text-fg-primary">{m.homeTeam}</span></div>
                <div className="px-2 py-0.5 bg-canvas/50 rounded-md"><span className="font-mono font-bold text-base text-accent-emerald tabular-nums">{m.homeScore} - {m.awayScore}</span></div>
                <div className="flex items-center gap-1.5 text-xs"><span className="font-medium text-fg-primary">{m.awayTeam}</span><span className="text-base">{getFlag(m.awayTeam)}</span></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ NAV ═══ */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold text-fg-primary">Explorar</h2>
        <div className="space-y-2">
          <QuickLink href="/fixture" icon="⚡" title="Predicción" desc={`${stats.predictedCount} partidos`} accent="accent-premium" />
          <QuickLink href="/live" icon="📡" title="En Vivo" desc="Resultados reales" accent="accent-emerald" highlight={liveNow.length > 0} />
          <QuickLink href="/benchmark" icon="🤖" title="Benchmark" desc="10 modelos IA" accent="accent-secondary" />
        </div>
      </section>
    </div>
  );
}

function StatPill({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; sub: string; color: 'blue' | 'emerald' | 'gold' | 'red';
}) {
  const c = {
    blue: { bg: 'bg-tint-blue', border: 'border-accent-primary/20', icon: 'text-accent-primary', val: 'text-accent-primary' },
    emerald: { bg: 'bg-tint-green', border: 'border-accent-emerald/20', icon: 'text-accent-emerald', val: 'text-accent-emerald' },
    gold: { bg: 'bg-tint-gold', border: 'border-accent-premium/20', icon: 'text-accent-premium', val: 'text-accent-premium' },
    red: { bg: 'bg-tint-red', border: 'border-state-danger/20', icon: 'text-state-danger', val: 'text-state-danger' },
  }[color];

  return (
    <div className={cn("p-3 rounded-[var(--r-lg)] border", c.bg, c.border)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-fg-tertiary uppercase tracking-wider font-semibold">{label}</span>
        <span className={c.icon}>{icon}</span>
      </div>
      <div className={cn("text-xl font-bold font-mono tabular-nums", c.val)}>{value}</div>
      <div className="text-[10px] text-fg-tertiary mt-0.5">{sub}</div>
    </div>
  );
}

function QuickLink({ href, icon, title, desc, accent, highlight }: {
  href: string; icon: string; title: string; desc: string; accent: string; highlight?: boolean;
}) {
  return (
    <Link href={href} className="block group">
      <div className="surface-interactive px-4 py-3 flex items-center gap-3">
        <span className={cn("w-8 h-8 rounded-[var(--r-md)] flex items-center justify-center text-base", `bg-${accent}/15`)}>{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-fg-primary">{title}</span>
            {highlight && <Badge variant="live">en vivo</Badge>}
          </div>
          <span className="text-[10px] text-fg-tertiary">{desc}</span>
        </div>
        <ArrowRight className={cn("h-4 w-4 text-fg-tertiary group-hover:translate-x-0.5 transition-transform", `text-${accent}`)} />
      </div>
    </Link>
  );
}
