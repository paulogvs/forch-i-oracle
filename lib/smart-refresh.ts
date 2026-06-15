/**
 * Smart auto-refresh intervals based on match schedules.
 * During match windows (10-22 CDT), polls every 2 minutes.
 * Otherwise, polls every 30 minutes.
 * Re-checks each cycle in case match hour starts/ends.
 */

const MATCH_WINDOWS: [number, number][] = [
  [10, 14], // Morning matches
  [14, 18], // Afternoon matches
  [18, 22], // Evening matches
];

const ACTIVE_INTERVAL = 2 * 60 * 1000;   // 2 minutes during match windows
const IDLE_INTERVAL = 30 * 60 * 1000;    // 30 minutes otherwise

function isMatchHour(now: Date): boolean {
  const hour = now.getUTCHours() - 6; // CDT = UTC-6
  return MATCH_WINDOWS.some(([start, end]) => hour >= start && hour < end);
}

/**
 * Returns the appropriate refresh interval based on current time.
 * Call this on each interval cycle so it adapts when match windows start/end.
 */
export function getRefreshInterval(): number {
  return isMatchHour(new Date()) ? ACTIVE_INTERVAL : IDLE_INTERVAL;
}

/**
 * Sets up a smart interval that re-evaluates its own interval each cycle.
 * Returns a cleanup function to clear the interval.
 */
export function createSmartInterval(callback: () => void): () => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  function schedule() {
    const interval = getRefreshInterval();
    timeoutId = setTimeout(() => {
      callback();
      schedule(); // Re-check interval each cycle
    }, interval);
  }

  schedule();
  return () => { if (timeoutId) clearTimeout(timeoutId); };
}
