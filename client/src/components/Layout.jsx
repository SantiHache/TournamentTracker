import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuthStore } from "../store/authStore";

export default function Layout({ children }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const onLogout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      logout();
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brandGreen to-brandViolet" />
            <div>
              <p className="font-bold text-lg leading-none">Tournament Tracker</p>
              <p className="text-xs text-slate-500">Padel Torneo Manager</p>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <Link className="px-3 py-2 rounded-lg hover:bg-slate-100" to="/">
              Inicio
            </Link>
            <button className="btn-secondary" onClick={onLogout}>
              Salir
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4 text-sm text-slate-600">Usuario: {user?.nombre} ({user?.role})</div>
        {children}
      </main>
    </div>
  );
}
