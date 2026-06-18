'use client';

// FORCH.i ORACLE — Model vs Reality Verdict Card
// Compares ORACLE prediction against actual match result.
// Shows whether the model was correct and by how much.

import { motion } from 'motion/react';
import { Check, X, Minus, TrendingUp, TrendingDown } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface VerdictData {
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;

  // ORACLE prediction
  oracleHomeWin: number;
  oracleDraw: number;
  oracleAwayWin: number;
  oracleScoreHome: number;
  oracleScoreAway: number;
  oracleConfidence: 'alta' | 'media' | 'baja';

  // Actual result
  actualHomeGoals: number;
  actualAwayGoals: number;
  actualResult: 'home' | 'draw' | 'away';

  // Verification
  correctWinner: boolean;
  exactScore: boolean;
  goalDifference: number; // abs(predicted - actual) total goals
}

// ═══════════════════════════════════════════════════════════════
// VERDICT COMPUTATION
// ═══════════════════════════════════════════════════════════════

export function computeVerdict(data: Omit<VerdictData, 'correctWinner' | 'exactScore' | 'goalDifference'>): VerdictData {
  const predictedWinner =
    data.oracleHomeWin > data.oracleAwayWin && data.oracleHomeWin > data.oracleDraw ? 'home' :
    data.oracleAwayWin > data.oracleDraw ? 'away' : 'draw';

  const correctWinner = predictedWinner === data.actualResult;
  const exactScore = data.oracleScoreHome === data.actualHomeGoals && data.oracleScoreAway === data.actualAwayGoals;
  const goalDifference = Math.abs(data.oracleScoreHome - data.actualHomeGoals) + Math.abs(data.oracleScoreAway - data.actualAwayGoals);

  return { ...data, correctWinner, exactScore, goalDifference };
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

interface VerdictCardProps {
  verdict: VerdictData;
  compact?: boolean;
}

export default function VerdictCard({ verdict, compact = false }: VerdictCardProps) {
  const { homeTeam, awayTeam, homeFlag, awayFlag, correctWinner, exactScore, goalDifference,
    oracleHomeWin, oracleDraw, oracleAwayWin, oracleScoreHome, oracleScoreAway,
    actualHomeGoals, actualAwayGoals, actualResult, oracleConfidence } = verdict;

  const verdictColor = exactScore ? '#D4A843' : correctWinner ? '#22C55E' : '#EF4444';
  const verdictLabel = exactScore ? 'Exacto' : correctWinner ? 'Correcto' : 'Incorrecto';
  const verdictIcon = exactScore ? <Check size={16} /> : correctWinner ? <Check size={16} /> : <X size={16} />;

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-3 px-3 py-2 rounded-lg border"
        style={{ borderColor: `${verdictColor}40`, background: `${verdictColor}10` }}
      >
        <div className="flex items-center gap-1.5" style={{ color: verdictColor }}>
          {verdictIcon}
          <span className="text-xs font-semibold uppercase">{verdictLabel}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span>{homeFlag} {oracleScoreHome}</span>
          <span className="text-fg-tertiary">-</span>
          <span>{oracleScoreAway} {awayFlag}</span>
        </div>
        <div className="text-xs text-fg-tertiary ml-auto">
          Real: {actualHomeGoals}-{actualAwayGoals}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border p-4"
      style={{ borderColor: `${verdictColor}30`, background: 'var(--surface)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold"
            style={{ background: `${verdictColor}20`, color: verdictColor }}
          >
            {verdictIcon}
            {verdictLabel}
          </div>
          {exactScore && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold">
              Marcador exacto
            </span>
          )}
        </div>
        <span className="text-xs text-fg-tertiary">Confianza: {oracleConfidence}</span>
      </div>

      {/* Teams + Scores */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-lg">{homeFlag}</span>
          <span className="font-medium text-sm">{homeTeam}</span>
        </div>
        <div className="flex items-center gap-2 mx-4">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ fontFamily: 'JetBrains Mono' }}>
              {oracleScoreHome}
            </div>
            <div className="text-[10px] text-fg-tertiary uppercase">ORACLE</div>
          </div>
          <div className="text-fg-tertiary text-sm">-</div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ fontFamily: 'JetBrains Mono' }}>
              {oracleScoreAway}
            </div>
            <div className="text-[10px] text-fg-tertiary uppercase">ORACLE</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="font-medium text-sm">{awayTeam}</span>
          <span className="text-lg">{awayFlag}</span>
        </div>
      </div>

      {/* Real Result */}
      <div className="flex items-center justify-center gap-2 mb-3 py-2 rounded-lg bg-elevated/50">
        <span className="text-xs text-fg-tertiary">Resultado real:</span>
        <span className="font-bold" style={{ color: verdictColor }}>
          {actualHomeGoals} - {actualAwayGoals}
        </span>
        <span className="text-xs text-fg-tertiary">
          ({actualResult === 'home' ? homeTeam : actualResult === 'away' ? awayTeam : 'Empate'})
        </span>
      </div>

      {/* Probability Bars */}
      <div className="space-y-1.5">
        <ProbBar label="Local" pct={oracleHomeWin} color="var(--accent-primary)"
          isWinner={actualResult === 'home'} isCorrect={correctWinner && actualResult === 'home'} />
        <ProbBar label="Empate" pct={oracleDraw} color="var(--accent-secondary)"
          isWinner={actualResult === 'draw'} isCorrect={correctWinner && actualResult === 'draw'} />
        <ProbBar label="Visitante" pct={oracleAwayWin} color="var(--accent-emerald)"
          isWinner={actualResult === 'away'} isCorrect={correctWinner && actualResult === 'away'} />
      </div>

      {/* Goal Difference Indicator */}
      {goalDifference > 0 && (
        <div className="flex items-center justify-center gap-1 mt-3 text-xs text-fg-tertiary">
          {goalDifference <= 1 ? <TrendingUp size={12} className="text-emerald-400" /> : <TrendingDown size={12} className="text-red-400" />}
          Error total: {goalDifference} {goalDifference === 1 ? 'gol' : 'goles'}
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROBABILITY BAR
// ═══════════════════════════════════════════════════════════════

function ProbBar({ label, pct, color, isWinner, isCorrect }: {
  label: string; pct: number; color: string; isWinner: boolean; isCorrect: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-fg-tertiary w-14 text-right uppercase">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-overlay/50 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{
            background: isWinner ? color : `${color}60`,
            boxShadow: isCorrect ? `0 0 8px ${color}` : 'none',
          }}
        />
      </div>
      <span className="text-xs font-mono w-8" style={{ color: isWinner ? color : 'var(--text-secondary)' }}>
        {pct}%
      </span>
      {isWinner && <Minus size={10} className="text-fg-tertiary" />}
    </div>
  );
}
