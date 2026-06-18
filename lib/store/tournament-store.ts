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

  setLastUpdated: (iso: string) => void;
  setLive: (v: boolean) => void;
  bumpRefresh: () => void;
  setTournamentData: (data: { fixture?: any[], bracket?: any, standings?: any, top8?: any[] }) => void;
  setLoading: (v: boolean) => void;
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

  setLastUpdated: (iso) => set({ lastUpdated: iso }),
  setLive: (v) => set({ isLive: v }),
  bumpRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
  setTournamentData: (data) => set((s) => ({ ...s, ...data })),
  setLoading: (v) => set({ loading: v }),
}));
