import { create } from "zustand";

export const useAuthStore = create((set) => ({
  token: localStorage.getItem("tt_token"),
  user: (() => {
    const raw = localStorage.getItem("tt_user");
    return raw ? JSON.parse(raw) : null;
  })(),
  login(payload) {
    localStorage.setItem("tt_token", payload.token);
    localStorage.setItem("tt_user", JSON.stringify(payload.user));
    set({ token: payload.token, user: payload.user });
  },
  logout() {
    localStorage.removeItem("tt_token");
    localStorage.removeItem("tt_user");
    set({ token: null, user: null });
  },
}));
