'use client';

/**
 * MatchSeal — Visual stamp for match status
 * - POR JUGAR: match not yet played
 * - ACERTADO: correct prediction, green glow
 * - EQUIVOCADO: incorrect prediction, red glow
 */

interface MatchSealProps {
  /** 'pending' = POR JUGAR, 'correct' = ACERTADO, 'incorrect' = EQUIVOCADO */
  status: 'pending' | 'correct' | 'incorrect';
  /** Optional: hide the text, show only the dot */
  compact?: boolean;
  /** Optional: animation delay in ms */
  delay?: number;
}

const sealConfig = {
  pending: {
    text: 'POR JUGAR',
    className: 'seal seal-played',
  },
  correct: {
    text: 'ACERTADO',
    className: 'seal seal-correct',
  },
  incorrect: {
    text: 'EQUIVOCADO',
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
