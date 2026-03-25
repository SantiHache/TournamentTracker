import { create } from "zustand";

const STORAGE_KEY = "tt_active_tournament_id";

export const useTournamentStore = create((set) => ({
  activeTournamentId: localStorage.getItem(STORAGE_KEY) || "",
  tournamentVersion: 0,
  setActiveTournamentId(id) {
    const value = id ? String(id) : "";
    if (value) {
      localStorage.setItem(STORAGE_KEY, value);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    set({ activeTournamentId: value });
  },
  bumpTournamentVersion() {
    set((state) => ({ tournamentVersion: state.tournamentVersion + 1 }));
  },
}));
