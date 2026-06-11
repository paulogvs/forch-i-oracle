'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
}

/**
 * Animates a number from 0 to its target value using requestAnimationFrame.
 * Apple-style count-up effect for scores, probabilities, and stats.
 */
export default function AnimatedNumber({
  value,
  decimals = 0,
  duration = 800,
  className = '',
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number | null>(null);
  const prevValue = useRef(0);

  useEffect(() => {
    const start = prevValue.current;
    const end = value;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      setDisplay(current);

      if (progress < 1) {
        ref.current = requestAnimationFrame(tick);
      } else {
        prevValue.current = end;
      }
    }

    ref.current = requestAnimationFrame(tick);

    return () => {
      if (ref.current) cancelAnimationFrame(ref.current);
    };
  }, [value, duration]);

  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {display.toFixed(decimals)}
    </span>
  );
}
