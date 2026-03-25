import { useEffect, useRef, useState } from "react";
import api from "../api";

const STATUS_LABELS = {
  activo: { label: "Activo", cls: "bg-emerald-100 text-emerald-700" },
  finalizado: { label: "Finalizado", cls: "bg-slate-100 text-slate-600" },
  cancelado: { label: "Cancelado", cls: "bg-red-100 text-red-700" },
};

export default function SuperAdminTorneosPage() {
  const [torneos, setTorneos] = useState([]);
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const pushToast = (type, message) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  };

  const load = async () => {
    try {
      const { data } = await api.get("/torneos");
      setTorneos(data || []);
    } catch {
      pushToast("error", "No se pudieron cargar los torneos");
    }
  };

  useEffect(() => { load(); }, []);

  const cancelar = async (id, nombre) => {
    if (!window.confirm(`¿Cancelar el torneo "${nombre}"? Esta acción cambia el estado a Cancelado.`)) return;
    try {
      await api.post(`/superadmin/torneos/${id}/cancelar`);
      pushToast("success", `Torneo "${nombre}" cancelado`);
      load();
    } catch (err) {
      pushToast("error", err.response?.data?.error || "No se pudo cancelar el torneo");
    }
  };

  const reset = async (id, nombre) => {
    if (
      !window.confirm(
        `¿Resetear el torneo "${nombre}"?\n\nEsto eliminará todos los grupos, partidos y posiciones. Las parejas se conservan. El estado vuelve a Activo.\n\nEsta acción NO se puede deshacer.`
      )
    )
      return;
    try {
      await api.post(`/superadmin/torneos/${id}/reset`);
      pushToast("success", `Torneo "${nombre}" reseteado`);
      load();
    } catch (err) {
      pushToast("error", err.response?.data?.error || "No se pudo resetear el torneo");
    }
  };

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <h1 className="text-2xl font-bold">Gestión de Torneos</h1>
        <p className="mt-1 text-sm text-slate-500">
          SuperAdmin · Cancelar o resetear torneos
        </p>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-bold text-lg">Torneos ({torneos.length})</h2>
        {torneos.length === 0 && (
          <p className="text-slate-400 text-sm">No hay torneos registrados.</p>
        )}
        <div className="space-y-2">
          {torneos.map((t) => {
            const st = STATUS_LABELS[t.status] || STATUS_LABELS.activo;
            return (
              <div key={t.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="font-semibold">{t.name}</span>
                    <span className="ml-2 text-xs text-slate-400">#{t.id}</span>
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${st.cls}`}>
                      {st.label}
                    </span>
                    <span className="ml-2 text-xs text-slate-500 capitalize">{t.tipo_torneo}</span>
                    <span className="ml-2 text-xs text-slate-400">{t.planned_pairs} parejas</span>
                  </div>
                  <div className="flex gap-2">
                    {t.status !== "cancelado" && (
                      <button
                        className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1 text-sm text-amber-700 hover:bg-amber-100"
                        onClick={() => cancelar(t.id, t.name)}
                      >
                        Cancelar torneo
                      </button>
                    )}
                    <button
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-sm text-red-700 hover:bg-red-100"
                      onClick={() => reset(t.id, t.name)}
                    >
                      Reset total
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Creado: {new Date(t.created_at).toLocaleDateString("es-AR")} ·
                  Zonas generadas: {t.zonas_generadas ? "Sí" : "No"}
                </p>
              </div>
            );
          })}
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
