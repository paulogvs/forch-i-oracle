'use client';

/**
 * MatchSeal — Visual stamp for match status (v2 — 5 categories with dual badges)
 *
 * Categories:
 * - pending: POR JUGAR (not played yet)
 * - correct-winner: GANADOR ACERTADO (correct winner, wrong score)
 * - incorrect-winner: GANADOR NO ACERTADO (wrong winner)
 * - exact-score: SCORE ACERTADO (correct exact score)
 * - incorrect-score: SCORE NO ACERTADO (correct winner but wrong score)
 */

export type SealStatus = 'pending' | 'correct-winner' | 'incorrect-winner' | 'exact-score' | 'incorrect-score';

interface MatchSealProps {
  /** 'pending' | 'correct-winner' | 'incorrect-winner' | 'exact-score' | 'incorrect-score' */
  status?: SealStatus;
  /** Optional: hide the text, show only the dot */
  compact?: boolean;
  /** Optional: animation delay in ms */
  delay?: number;
  /** Show both winner + score badges side by side */
  dual?: boolean;
  /** Winner seal status (for dual mode) */
  winnerStatus?: 'correct' | 'incorrect' | null;
  /** Score seal status (for dual mode) */
  scoreStatus?: 'correct' | 'incorrect' | null;
}

const sealConfig: Record<SealStatus, { text: string; className: string; dotColor: string }> = {
  pending: {
    text: 'POR JUGAR',
    className: 'seal seal-played',
    dotColor: 'bg-fg-tertiary',
  },
  'correct-winner': {
    text: 'GANADOR ✓',
    className: 'seal seal-correct',
    dotColor: 'bg-state-success',
  },
  'incorrect-winner': {
    text: 'GANADOR ✗',
    className: 'seal seal-incorrect',
    dotColor: 'bg-state-danger',
  },
  'exact-score': {
    text: 'SCORE ✓✓',
    className: 'seal seal-exact',
    dotColor: 'bg-accent-premium',
  },
  'incorrect-score': {
    text: 'SCORE ✗',
    className: 'seal seal-score-wrong',
    dotColor: 'bg-state-warning',
  },
};

/** Single badge (original behavior) */
function SingleBadge({ status, compact, delay }: { status: SealStatus; compact?: boolean; delay?: number }) {
  const config = sealConfig[status];

  if (compact) {
    return (
      <span
        className={`${config.className} animate-seal-stamp`}
        style={{ animationDelay: `${delay}ms` }}
        aria-label={config.text}
      >
        <span className="seal-dot" />
      </span>
    );
  }

  return (
    <span
      className={`${config.className} animate-seal-stamp`}
      style={{ animationDelay: `${delay}ms` }}
      role="status"
      aria-label={config.text}
    >
      <span className="seal-dot" />
      {config.text}
    </span>
  );
}

/** Dual badge: winner + score side by side */
function DualBadge({
  winnerStatus,
  scoreStatus,
  compact,
  delay,
}: {
  winnerStatus: 'correct' | 'incorrect';
  scoreStatus: 'correct' | 'incorrect' | null;
  compact?: boolean;
  delay?: number;
}) {
  const wConfig = winnerStatus === 'correct' ? sealConfig['correct-winner'] : sealConfig['incorrect-winner'];
  const sConfig = scoreStatus === 'correct' ? sealConfig['exact-score'] : scoreStatus === 'incorrect' ? sealConfig['incorrect-score'] : null;

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1">
        <span
          className={`${wConfig.className} animate-seal-stamp`}
          style={{ animationDelay: `${delay}ms` }}
          aria-label={wConfig.text}
        >
          <span className="seal-dot" />
        </span>
        {sConfig && (
          <span
            className={`${sConfig.className} animate-seal-stamp`}
            style={{ animationDelay: `${(delay || 0) + 100}ms` }}
            aria-label={sConfig.text}
          >
            <span className="seal-dot" />
          </span>
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`${wConfig.className} animate-seal-stamp`}
        style={{ animationDelay: `${delay}ms` }}
        role="status"
        aria-label={wConfig.text}
      >
        <span className="seal-dot" />
        {wConfig.text}
      </span>
      {sConfig && (
        <span
          className={`${sConfig.className} animate-seal-stamp`}
          style={{ animationDelay: `${(delay || 0) + 100}ms` }}
          role="status"
          aria-label={sConfig.text}
        >
          <span className="seal-dot" />
          {sConfig.text}
        </span>
      )}
    </span>
  );
}

export default function MatchSeal({
  status,
  compact = false,
  delay = 0,
  dual = false,
  winnerStatus = null,
  scoreStatus = null,
}: MatchSealProps) {
  // Dual mode: show winner + score badges side by side
  if (dual && winnerStatus !== null) {
    return (
      <DualBadge
        winnerStatus={winnerStatus}
        scoreStatus={scoreStatus}
        compact={compact}
        delay={delay}
      />
    );
  }

  // Single mode (original behavior)
  return <SingleBadge status={status || 'pending'} compact={compact} delay={delay} />;
}

/** Helper: compute seal status from prediction vs real result */
export function computeSealStatus(
  predHome: number | null,
  predAway: number | null,
  realHome: number | null,
  realAway: number | null,
): { winnerStatus: 'correct' | 'incorrect'; scoreStatus: 'correct' | 'incorrect' | null } | null {
  if (predHome === null || predAway === null || realHome === null || realAway === null) return null;

  const predWinner = predHome > predAway ? 'home' : predHome < predAway ? 'away' : 'draw';
  const realWinner = realHome > realAway ? 'home' : realHome < realAway ? 'away' : 'draw';

  const winnerCorrect = predWinner === realWinner;
  const scoreCorrect = predHome === realHome && predAway === realAway;

  return {
    winnerStatus: winnerCorrect ? 'correct' : 'incorrect',
    scoreStatus: scoreCorrect ? 'correct' : winnerCorrect ? 'incorrect' : null,
  };
}
