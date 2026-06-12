'use client';

import { motion } from 'motion/react';
import { forwardRef } from 'react';

// ═══ ANIMATED CHECK (exact score) ═══
export const AnimatedCheck = forwardRef<SVGSVGElement, { className?: string; size?: number }>(
  ({ className, size = 20 }, ref) => (
    <motion.svg
      ref={ref}
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="hidden"
      animate="visible"
    >
      <motion.path
        d="M5 12l5 5L19 7"
        variants={{
          hidden: { pathLength: 0, opacity: 0 },
          visible: { pathLength: 1, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
        }}
      />
    </motion.svg>
  )
);
AnimatedCheck.displayName = 'AnimatedCheck';

// ═══ ANIMATED X (wrong prediction) ═══
export const AnimatedX = forwardRef<SVGSVGElement, { className?: string; size?: number }>(
  ({ className, size = 20 }, ref) => (
    <motion.svg
      ref={ref}
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="hidden"
      animate="visible"
    >
      <motion.path
        d="M6 6l12 12M6 18L18 6"
        variants={{
          hidden: { pathLength: 0, opacity: 0 },
          visible: { pathLength: 1, opacity: 1, transition: { duration: 0.3, ease: 'easeOut', delay: 0.1 } },
        }}
      />
    </motion.svg>
  )
);
AnimatedX.displayName = 'AnimatedX';

// ═══ ANIMATED TROPHY ═══
export const AnimatedTrophy = forwardRef<SVGSVGElement, { className?: string; size?: number }>(
  ({ className, size = 20 }, ref) => (
    <motion.svg
      ref={ref}
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0] }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </motion.svg>
  )
);
AnimatedTrophy.displayName = 'AnimatedTrophy';

// ═══ ANIMATED ZAP (confidence) ═══
export const AnimatedZap = forwardRef<SVGSVGElement, { className?: string; size?: number }>(
  ({ className, size = 20 }, ref) => (
    <motion.svg
      ref={ref}
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      animate={{ scale: [1, 1.1, 1] }}
      transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
    >
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </motion.svg>
  )
);
AnimatedZap.displayName = 'AnimatedZap';

// ═══ ANIMATED CLOCK (upcoming) ═══
export const AnimatedClock = forwardRef<SVGSVGElement, { className?: string; size?: number }>(
  ({ className, size = 20 }, ref) => (
    <motion.svg
      ref={ref}
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <motion.path
        d="M12 6v6l4 2"
        animate={{ rotate: [0, 360] }}
        transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
        style={{ transformOrigin: '12px 12px' }}
      />
    </motion.svg>
  )
);
AnimatedClock.displayName = 'AnimatedClock';

// ═══ ANIMATED TARGET ═══
export const AnimatedTarget = forwardRef<SVGSVGElement, { className?: string; size?: number }>(
  ({ className, size = 20 }, ref) => (
    <motion.svg
      ref={ref}
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      whileHover={{ scale: 1.1 }}
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </motion.svg>
  )
);
AnimatedTarget.displayName = 'AnimatedTarget';

// ═══ ANIMATED LIVE DOT ═══
export function AnimatedLiveDot({ className, size = 8 }: { className?: string; size?: number }) {
  return (
    <motion.span
      className={className}
      style={{ width: size, height: size, borderRadius: '50%', display: 'inline-block', backgroundColor: 'currentColor' }}
      animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
      transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
    />
  );
}

// ═══ ANIMATED ARROW ═══
export const AnimatedArrow = forwardRef<SVGSVGElement, { className?: string; size?: number }>(
  ({ className, size = 16 }, ref) => (
    <motion.svg
      ref={ref}
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      whileHover={{ x: 3 }}
      transition={{ type: 'spring', stiffness: 400 }}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </motion.svg>
  )
);
AnimatedArrow.displayName = 'AnimatedArrow';
