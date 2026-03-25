import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useAuthStore } from "../store/authStore";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/login", { username, password });
      login(data);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo iniciar sesion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-3xl font-extrabold">Ingreso</h1>
        <p className="text-slate-600 mt-2">Gestiona torneos de padel en un solo lugar.</p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div>
            <label className="text-sm">Usuario</label>
            <input className="input mt-1" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Contrasena</label>
            <input
              type="password"
              className="input mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
