'use client';
import { useEffect } from 'react';
import { mutate } from 'swr';
import { useTournamentStore } from '@/lib/store/tournament-store';

export function AutoSync() {
  const { setLastUpdated } = useTournamentStore();

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch('/api/system/heartbeat', { cache: 'no-store' });
        if (cancelled) return;
        const data = await res.json();
        if (data.changed) {
          await Promise.all([
            mutate('/api/fixture'),
            mutate('/api/accuracy'),
            mutate('/api/simulate-tournament'),
          ]);
          setLastUpdated(data.timestamp);
        }
      } catch {
        // Silently fail — next poll will retry
      }
    }
    const id = setInterval(poll, 60_000);
    poll();
    return () => { cancelled = true; clearInterval(id); };
  }, [setLastUpdated]);

  return null;
}
