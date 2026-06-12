'use client';
import { create } from 'zustand';

interface TournamentState {
  lastUpdated: string | null;
  isLive: boolean;
  refreshKey: number;
  setLastUpdated: (iso: string) => void;
  setLive: (v: boolean) => void;
  bumpRefresh: () => void;
}

export const useTournamentStore = create<TournamentState>((set) => ({
  lastUpdated: null,
  isLive: false,
  refreshKey: 0,
  setLastUpdated: (iso) => set({ lastUpdated: iso }),
  setLive: (v) => set({ isLive: v }),
  bumpRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}));
