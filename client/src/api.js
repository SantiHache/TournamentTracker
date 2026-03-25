import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:4002/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("tt_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
