import { useEffect, useRef, useState } from "react";
import api from "../api";

export default function SuperAdminJugadoresPage() {
  const [players, setPlayers] = useState([]);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const pushToast = (type, message) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  };

  const load = async (q = "") => {
    try {
      const { data } = await api.get("/superadmin/jugadores", { params: q ? { q } : {} });
      setPlayers(data || []);
    } catch {
      pushToast("error", "No se pudieron cargar los jugadores");
    }
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    load(query);
  };

  const startEdit = (player) => {
    setEditingId(player.id);
    setEditForm({ nombre: player.nombre, apellido: player.apellido, telefono: player.telefono });
  };

  const saveEdit = async (playerId) => {
    try {
      await api.put(`/superadmin/jugadores/${playerId}`, editForm);
      setEditingId(null);
      pushToast("success", "Jugador actualizado");
      load(query);
    } catch (err) {
      pushToast("error", err.response?.data?.error || "No se pudo actualizar el jugador");
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brandViolet/30";

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <h1 className="text-2xl font-bold">Gestión de Jugadores</h1>
        <p className="mt-1 text-sm text-slate-500">SuperAdmin · Editar datos de jugadores</p>

        <form onSubmit={handleSearch} className="mt-4 flex gap-2">
          <input
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brandViolet/30"
            placeholder="Buscar por nombre o apellido..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="btn-primary px-4">Buscar</button>
          {query && (
            <button
              type="button"
              className="btn-secondary px-3"
              onClick={() => { setQuery(""); load(""); }}
            >
              ✕
            </button>
          )}
        </form>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-bold text-lg">
          Jugadores ({players.length})
        </h2>
        {players.length === 0 && (
          <p className="text-slate-400 text-sm">
            {query ? "Sin resultados para la búsqueda." : "No hay jugadores registrados."}
          </p>
        )}
        <div className="space-y-2">
          {players.map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-200 p-4">
              {editingId === p.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Nombre</label>
                      <input
                        className={inputClass}
                        value={editForm.nombre}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, nombre: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Apellido</label>
                      <input
                        className={inputClass}
                        value={editForm.apellido}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, apellido: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Teléfono</label>
                      <input
                        className={inputClass}
                        value={editForm.telefono}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, telefono: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-primary" onClick={() => saveEdit(p.id)}>Guardar</button>
                    <button className="btn-secondary" onClick={() => setEditingId(null)}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold">{p.apellido}, {p.nombre}</span>
                    <span className="ml-3 text-sm text-slate-500">{p.telefono}</span>
                    <span className="ml-3 text-xs text-slate-400">#{p.id}</span>
                  </div>
                  <button
                    className="btn-secondary py-1 px-3 text-sm"
                    onClick={() => startEdit(p)}
                  >
                    Editar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-xl border px-4 py-3 text-sm shadow-lg ${
              t.type === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
