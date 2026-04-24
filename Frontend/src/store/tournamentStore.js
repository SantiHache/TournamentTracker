import { create } from "zustand";
import api from "../api";

const STORAGE_KEY = "tt_active_tournament_id";

export const useTournamentStore = create((set, get) => ({
  activeTournamentId: localStorage.getItem(STORAGE_KEY) || "",
  tournamentVersion: 0,

  // Shared data loaded once at layout level
  torneo: null,
  parejas: [],
  _loadingTorneo: false,
  _loadingParejas: false,

  setActiveTournamentId(id) {
    const value = id ? String(id) : "";
    const prev = get().activeTournamentId;
    if (value) {
      localStorage.setItem(STORAGE_KEY, value);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    if (value !== prev) {
      set({ activeTournamentId: value, torneo: null, parejas: [] });
    }
  },

  bumpTournamentVersion() {
    set((state) => ({ tournamentVersion: state.tournamentVersion + 1 }));
  },

  /** Fetch tournament + pairs at layout level; children consume from store. */
  async fetchSharedData(tournamentId) {
    set({ _loadingTorneo: true, _loadingParejas: true });
    try {
      const [t, p] = await Promise.all([
        api.get(`/torneos/${tournamentId}`),
        api.get(`/torneos/${tournamentId}/parejas`),
      ]);
      set({
        torneo: t.data,
        parejas: p.data || [],
        _loadingTorneo: false,
        _loadingParejas: false,
      });
    } catch {
      set({ torneo: null, parejas: [], _loadingTorneo: false, _loadingParejas: false });
    }
  },

  /** Refresh only tournament data (lightweight). */
  async refreshTorneo(tournamentId) {
    try {
      const { data } = await api.get(`/torneos/${tournamentId}`);
      set({ torneo: data });
    } catch {
      /* keep existing */
    }
  },

  /** Refresh only pairs data. */
  async refreshParejas(tournamentId) {
    try {
      const { data } = await api.get(`/torneos/${tournamentId}/parejas`);
      set({ parejas: data || [] });
    } catch {
      /* keep existing */
    }
  },
}));
