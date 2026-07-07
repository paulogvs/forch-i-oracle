'use client';
import { create } from 'zustand';

interface TournamentState {
  lastUpdated: string | null;
  isLive: boolean;
  refreshKey: number;
  fixture: any[] | null;
  bracket: any | null;
  standings: any | null;
  top8: any[] | null;
  loading: boolean;
  error: string | null;

  setLastUpdated: (iso: string) => void;
  setLive: (v: boolean) => void;
  bumpRefresh: () => void;
  setTournamentData: (data: { fixture?: any[], bracket?: any, standings?: any, top8?: any[] }) => void;
  setLoading: (v: boolean) => void;
  refresh: () => Promise<void>;
}

export const useTournamentStore = create<TournamentState>((set) => ({
  lastUpdated: null,
  isLive: false,
  refreshKey: 0,
  fixture: null,
  bracket: null,
  standings: null,
  top8: null,
  loading: false,
  error: null,

  setLastUpdated: (iso) => set({ lastUpdated: iso }),
  setLive: (v) => set({ isLive: v }),
  bumpRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
  setTournamentData: (data) => set((s) => ({ ...s, ...data, lastUpdated: new Date().toISOString() })),
  setLoading: (v) => set({ loading: v }),

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      // Unified call to /api/fixture which now acts as the orchestrator for all panels
      const res = await fetch('/api/fixture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();

      if (data.success) {
        set({
          fixture: data.fixture,
          top8: data.top8,
          bracket: data.bracket, // Fixture now includes bracket
          standings: data.groupStandings,
          loading: false,
          lastUpdated: new Date().toISOString()
        });
      } else {
        set({ error: 'Failed to fetch data', loading: false });
      }
    } catch (e) {
      set({ error: 'Network error', loading: false });
    }
  }
}));
