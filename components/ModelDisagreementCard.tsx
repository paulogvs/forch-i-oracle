'use client';

// FORCH.i ORACLE — Model Disagreement Card
// Shows how much the 4 ensemble models agree/disagree on a match.
// Inspired by WorldCupBench's model disagreement metric.
//
// When models agree → high confidence (green)
// When models disagree → uncertain match (red) — use caution

import { motion } from 'motion/react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ModelAgreementData {
  homeWinStdDev: number;
  drawStdDev: number;
  awayWinStdDev: number;
  agreementScore: number;
  unanimousWinner: boolean;
}

export interface UncertaintyData {
  homeWin90: { low: number; high: number };
  draw90: { low: number; high: number };
  awayWin90: { low: number; high: number };
  entropy: number;
  effectiveOutcomes: number;
}

export interface ModelOutputsData {
  dixonColes?: { homeWin: number; draw: number; awayWin: number };
  eloPoisson?: { homeWin: number; draw: number; awayWin: number };
  bayesian?: { homeWin: number; draw: number; awayWin: number };
  purePoisson?: { homeWin: number; draw: number; awayWin: number };
}

interface ModelDisagreementCardProps {
  agreement: ModelAgreementData | null | undefined;
  uncertainty: UncertaintyData | null | undefined;
  models: ModelOutputsData | null | undefined;
  confidenceScore?: number | null;
  compact?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getAgreementColor(score: number): string {
  if (score >= 0.85) return '#22C55E';  // green
  if (score >= 0.6) return '#F59E0B';   // yellow
  if (score >= 0.4) return '#F97316';   // orange
  return '#EF4444';                      // red
}

function getAgreementLabel(score: number): string {
  if (score >= 0.85) return 'Alto acuerdo';
  if (score >= 0.6) return 'Acuerdo moderado';
  if (score >= 0.4) return 'Poco acuerdo';
  return 'Modelos divididos';
}

function getAgreementIcon(score: number): string {
  if (score >= 0.85) return '🟢';
  if (score >= 0.6) return '🟡';
  if (score >= 0.4) return '🟠';
  return '🔴';
}

function getEntropyLabel(entropy: number): string {
  if (entropy < 0.5) return 'Resultado muy claro';
  if (entropy < 1.0) return 'Resultado probable';
  if (entropy < 1.35) return 'Resultado incierto';
  return 'Totalmente abierto';
}

// ═══════════════════════════════════════════════════════════════
// VISUAL — Animated score bar
// ═══════════════════════════════════════════════════════════════

function ScoreBar({ value, maxProb, color, label }: { value: number; maxProb: number; color: string; label: string }) {
  const width = Math.max(4, (value / maxProb) * 100);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 text-right truncate" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--overlay)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <span className="w-8 text-right font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>
        {value}%
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function ModelDisagreementCard({
  agreement,
  uncertainty,
  models,
  confidenceScore,
  compact = false,
}: ModelDisagreementCardProps) {
  if (!agreement) {
    return (
      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
        Datos de acuerdo entre modelos no disponibles.
      </div>
    );
  }

  const agreementColor = getAgreementColor(agreement.agreementScore);
  const agreementLabel = getAgreementLabel(agreement.agreementScore);
  const entropyLabel = uncertainty ? getEntropyLabel(uncertainty.entropy) : '';
  const maxProb = models ? Math.max(
    ...Object.values(models).filter(Boolean).map((m: any) => Math.max(m.homeWin, m.draw, m.awayWin)),
    50
  ) : 50;

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs"
        style={{ background: `${agreementColor}10`, border: `1px solid ${agreementColor}30` }}
      >
        <span className="animate-pulse-soft" style={{ fontSize: '0.7rem' }}>{getAgreementIcon(agreement.agreementScore)}</span>
        <span style={{ color: 'var(--text-secondary)' }}>
          Modelos: <strong style={{ color: agreementColor }}>{agreementLabel}</strong>
        </span>
        {confidenceScore && (
          <span style={{ color: 'var(--text-tertiary)' }}>· Confianza: {confidenceScore}%</span>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl p-4 space-y-4"
      style={{ background: 'var(--elevated)', border: `1px solid ${agreementColor}30` }}
    >
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="animate-pulse-soft" style={{ fontSize: '1rem' }}>{getAgreementIcon(agreement.agreementScore)}</span>
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Consenso entre modelos
          </span>
        </div>
        {confidenceScore && (
          <span
            className="text-xs font-mono tabular-nums px-2 py-0.5 rounded"
            style={{
              background: `${agreementColor}20`,
              color: agreementColor,
              border: `1px solid ${agreementColor}40`,
            }}
          >
            {confidenceScore}% confianza
          </span>
        )}
      </div>

      {/* ═══ AGREEMENT METER ═══ */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span style={{ color: 'var(--text-secondary)' }}>Acuerdo entre modelos</span>
          <span style={{ color: agreementColor }}>{agreementLabel}</span>
        </div>
        <div className="h-2 rounded-full" style={{ background: 'var(--overlay)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${agreement.agreementScore * 100}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, #EF4444, ${agreementColor})` }}
          />
        </div>
        {agreement.unanimousWinner && (
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--state-success)' }}>
            <span>✓</span> Los 4 modelos coinciden en el ganador
          </div>
        )}
      </div>

      {/* ═══ ENTROPY ═══ */}
      {uncertainty && (
        <div className="flex justify-between text-xs">
          <span style={{ color: 'var(--text-secondary)' }}>Incertidumbre</span>
          <span style={{ color: 'var(--text-tertiary)' }}>{entropyLabel}</span>
        </div>
      )}

      {/* ═══ INDIVIDUAL MODEL OUTPUTS ═══ */}
      {models && (
        <div className="space-y-1.5 pt-1">
          <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
            Predicción por modelo
          </span>
          {models.dixonColes && (
            <ScoreBar
              value={Math.max(models.dixonColes.homeWin, models.dixonColes.draw, models.dixonColes.awayWin)}
              maxProb={maxProb}
              color="#3B82F6"
              label="Dixon-Coles"
            />
          )}
          {models.eloPoisson && (
            <ScoreBar
              value={Math.max(models.eloPoisson.homeWin, models.eloPoisson.draw, models.eloPoisson.awayWin)}
              maxProb={maxProb}
              color="#8B5CF6"
              label="Elo-Poisson"
            />
          )}
          {models.bayesian && (
            <ScoreBar
              value={Math.max(models.bayesian.homeWin, models.bayesian.draw, models.bayesian.awayWin)}
              maxProb={maxProb}
              color="#10B981"
              label="Bayesiano"
            />
          )}
          {models.purePoisson && (
            <ScoreBar
              value={Math.max(models.purePoisson.homeWin, models.purePoisson.draw, models.purePoisson.awayWin)}
              maxProb={maxProb}
              color="#F59E0B"
              label="Poisson puro"
            />
          )}
        </div>
      )}

      {/* ═══ STD DEV ═══ */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <div className="text-center p-1.5 rounded-md" style={{ background: 'var(--overlay)' }}>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Local</div>
          <div className="text-sm font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>
            σ={agreement.homeWinStdDev.toFixed(1)}
          </div>
        </div>
        <div className="text-center p-1.5 rounded-md" style={{ background: 'var(--overlay)' }}>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Empate</div>
          <div className="text-sm font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>
            σ={agreement.drawStdDev.toFixed(1)}
          </div>
        </div>
        <div className="text-center p-1.5 rounded-md" style={{ background: 'var(--overlay)' }}>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Visita</div>
          <div className="text-sm font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>
            σ={agreement.awayWinStdDev.toFixed(1)}
          </div>
        </div>
      </div>

      {/* ═══ UNCERTAINTY INTERVALS ═══ */}
      {uncertainty && (
        <div className="text-[10px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
          Intervalo de confianza 90%: Local {uncertainty.homeWin90.low}–{uncertainty.homeWin90.high}% ·
          Empate {uncertainty.draw90.low}–{uncertainty.draw90.high}% ·
          Visita {uncertainty.awayWin90.low}–{uncertainty.awayWin90.high}%
        </div>
      )}

      {/* ═══ EFFECTIVE OUTCOMES ═══ */}
      {uncertainty && (
        <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          Resultados efectivos: {uncertainty.effectiveOutcomes.toFixed(2)} / 3 · Entropía: {uncertainty.entropy.toFixed(2)} bits
        </div>
      )}
    </motion.div>
  );
}
