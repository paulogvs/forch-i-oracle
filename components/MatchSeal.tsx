'use client';

/**
 * MatchSeal — Visual stamp for match status
 * - YA JUGADO: played match, neutral
 * - ACERTADO: correct prediction, green glow
 * - NO ACERTADO: incorrect prediction, red glow
 */

interface MatchSealProps {
  /** 'played' = YA JUGADO, 'correct' = ACERTADO, 'incorrect' = NO ACERTADO */
  status: 'played' | 'correct' | 'incorrect';
  /** Optional: hide the text, show only the dot */
  compact?: boolean;
  /** Optional: animation delay in ms */
  delay?: number;
}

const sealConfig = {
  played: {
    text: 'YA JUGADO',
    className: 'seal seal-played',
  },
  correct: {
    text: 'ACERTADO',
    className: 'seal seal-correct',
  },
  incorrect: {
    text: 'NO ACERTADO',
    className: 'seal seal-incorrect',
  },
};

export default function MatchSeal({ status, compact = false, delay = 0 }: MatchSealProps) {
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
