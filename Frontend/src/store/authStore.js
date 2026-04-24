import { create } from "zustand";
import api from "../api";

// Función para verificar si el token está expirado (decodificando el JWT)
function isTokenExpired(token) {
  if (!token) return true;
  
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    
    // exp viene en segundos, Date.now() en milisegundos
    return payload.exp * 1000 < Date.now();
  } catch (e) {
    return true;
  }
}

export const useAuthStore = create((set, get) => ({
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
  
  // Verificar si la sesión es válida al iniciar la app
  async checkAuth() {
    const token = get().token;
    
    // Si no hay token, simplemente retornar false sin hacer logout
    if (!token) {
      return false;
    }
    
    // Si el token está expirado, hacer logout
    if (isTokenExpired(token)) {
      get().logout();
      return false;
    }
    
    // Verificar con el backend que el token sigue siendo válido
    try {
      await api.get("/auth/verify");
      return true;
    } catch (error) {
      get().logout();
      return false;
    }
  },
}));
