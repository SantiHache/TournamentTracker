import axios from "axios";

const rawBackendUrl =
  import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || "";

const normalizedBackendUrl = rawBackendUrl.replace(/\/+$/, "");

const apiBaseUrl = normalizedBackendUrl
  ? normalizedBackendUrl.endsWith("/api")
    ? normalizedBackendUrl
    : `${normalizedBackendUrl}/api`
  : "/api";

const api = axios.create({
  baseURL: apiBaseUrl,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("tt_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de respuesta para manejar errores 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token inválido o expirado - limpiar sesión y redirigir a login
      localStorage.removeItem("tt_token");
      localStorage.removeItem("tt_user");
      
      // Solo redirigir si no estamos ya en login
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
