// FORCH.i ORACLE — Seeded Pseudo-Random Number Generator
// Implements mulberry32 — a fast, seedable 32-bit PRNG.
// Ensures tournament simulations are reproducible across runs.
// No external dependencies — pure math.

/**
 * Create a seedable random number generator using the mulberry32 algorithm.
 * Returns a function that produces deterministic floats in [0, 1).
 *
 * Usage:
 *   const rng = createRNG(42);
 *   rng(); // → 0.892...
 *   rng(); // → 0.123...
 *
 * To generate a seed from a string (e.g. matchId + sim number):
 *   const seed = hashString("ARG_vs_BRA_42");
 *   const rng = createRNG(seed);
 */
export function createRNG(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s |= 0;
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Simple string → integer hash for generating seeds from match IDs, dates, etc.
 * Uses DJB2a algorithm — fast, good distribution for short strings.
 */
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash & 0xFFFFFFFF; // Keep as 32-bit
  }
  return hash >>> 0; // Ensure unsigned
}

/**
 * Sample from a Poisson distribution with given lambda using the seeded RNG.
 * Uses the Knuth algorithm (exponential inter-arrival times).
 */
export function samplePoisson(lambda: number, rng: () => number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}

/**
 * Return true with probability `prob` using the seeded RNG.
 */
export function bernoulli(prob: number, rng: () => number): boolean {
  return rng() < prob;
}

/**
 * Pick a random element from an array using the seeded RNG.
 */
export function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}
