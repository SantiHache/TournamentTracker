import { useEffect, useRef, useState } from "react";
import api from "../api";

const ENTITIES = ["", "users", "players", "tournaments", "matches", "auth"];
const ACTIONS = [
  "", "create", "update", "delete", "login", "logout",
  "force_result", "update_pairs", "cancelar", "reset",
];

export default function SuperAdminAuditoriaPage() {
  const [data, setData] = useState({ rows: [], total: 0, page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [filterEntity, setFilterEntity] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const pushToast = (type, message) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  };

  const load = async (p = 1) => {
    try {
      const params = { page: p };
      if (filterEntity) params.entity = filterEntity;
      if (filterAction) params.action = filterAction;
      const { data: res } = await api.get("/superadmin/auditoria", { params });
      setData(res);
      setPage(p);
    } catch {
      pushToast("error", "No se pudo cargar la auditoría");
    }
  };

  useEffect(() => { load(1); }, [filterEntity, filterAction]);

  const formatDate = (str) => {
    if (!str) return "-";
    return new Date(str).toLocaleString("es-AR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const selectClass =
    "rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brandViolet/30";

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <h1 className="text-2xl font-bold">Auditoría del sistema</h1>
        <p className="mt-1 text-sm text-slate-500">SuperAdmin · Log de todas las acciones</p>

        <div className="mt-4 flex flex-wrap gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Entidad</label>
            <select
              className={selectClass}
              value={filterEntity}
              onChange={(e) => { setFilterEntity(e.target.value); setPage(1); }}
            >
              {ENTITIES.map((e) => (
                <option key={e} value={e}>{e || "Todas"}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Acción</label>
            <select
              className={selectClass}
              value={filterAction}
              onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
            >
              {ACTIONS.map((a) => (
                <option key={a} value={a}>{a || "Todas"}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <span className="text-sm text-slate-500">Total: {data.total} registros</span>
          </div>
        </div>
      </section>

      <section className="card p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="pb-3 pr-4">#</th>
                <th className="pb-3 pr-4">Fecha</th>
                <th className="pb-3 pr-4">Actor</th>
                <th className="pb-3 pr-4">Acción</th>
                <th className="pb-3 pr-4">Entidad</th>
                <th className="pb-3 pr-4">ID</th>
                <th className="pb-3">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">Sin registros</td>
                </tr>
              )}
              {data.rows.map((row) => (
                <>
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="py-2 pr-4 text-slate-400">{row.id}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{formatDate(row.created_at)}</td>
                    <td className="py-2 pr-4">
                      <span className="font-medium">{row.actor_nombre || "—"}</span>
                      {row.username && (
                        <span className="ml-1 text-slate-400 text-xs">@{row.username}</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      <span className="rounded px-1.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-mono">
                        {row.action}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-slate-600">{row.entity}</td>
                    <td className="py-2 pr-4 text-slate-400">{row.entity_id ?? "—"}</td>
                    <td className="py-2">
                      {(row.before_json || row.after_json) && (
                        <button
                          className="text-xs text-brandViolet underline underline-offset-2"
                          onClick={() => setExpanded((v) => (v === row.id ? null : row.id))}
                        >
                          {expanded === row.id ? "ocultar" : "ver"}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expanded === row.id && (
                    <tr key={`${row.id}-detail`} className="bg-slate-50">
                      <td colSpan={7} className="px-4 pb-3">
                        <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-2">
                          {row.before_json && (
                            <div>
                              <p className="mb-1 text-xs font-semibold text-slate-500">Antes</p>
                              <pre className="rounded bg-white border border-slate-200 p-2 text-xs overflow-x-auto">
                                {JSON.stringify(JSON.parse(row.before_json), null, 2)}
                              </pre>
                            </div>
                          )}
                          {row.after_json && (
                            <div>
                              <p className="mb-1 text-xs font-semibold text-slate-500">Después</p>
                              <pre className="rounded bg-white border border-slate-200 p-2 text-xs overflow-x-auto">
                                {JSON.stringify(JSON.parse(row.after_json), null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {data.pages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <button
              className="btn-secondary py-1 px-3 text-sm disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => load(page - 1)}
            >
              ← Anterior
            </button>
            <span className="text-sm text-slate-500">
              Página {page} de {data.pages}
            </span>
            <button
              className="btn-secondary py-1 px-3 text-sm disabled:opacity-40"
              disabled={page >= data.pages}
              onClick={() => load(page + 1)}
            >
              Siguiente →
            </button>
          </div>
        )}
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
