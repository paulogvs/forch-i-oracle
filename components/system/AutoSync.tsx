'use client';
import { useEffect } from 'react';
import { mutate } from 'swr';
import { useTournamentStore } from '@/lib/store/tournament-store';

export function AutoSync() {
  const { setLastUpdated, setTournamentData, setLoading } = useTournamentStore();

  // Sync SWR data to Zustand Store for global cache
  useEffect(() => {
    async function syncStore() {
      setLoading(true);
      try {
        const [fixtureRes, simRes] = await Promise.all([
          fetch('/api/fixture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then(r => r.json()),
          fetch('/api/simulate-tournament').then(r => r.json())
        ]);

        if (fixtureRes.success && simRes.success) {
          setTournamentData({
            fixture: fixtureRes.fixture,
            bracket: simRes.bracket,
            standings: fixtureRes.groupStandings,
            top8: simRes.top8
          });
        }
      } catch (e) {
        console.error('Store sync failed', e);
      } finally {
        setLoading(false);
      }
    }
    syncStore();
  }, [setTournamentData, setLoading]);

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
            mutate('/api/live-scores'),
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
