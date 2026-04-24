import { useEffect, useState } from "react";
import { NavLink, Outlet, useParams } from "react-router-dom";
import api from "../api";
import { useTournamentStore } from "../store/tournamentStore";

function navClass({ isActive }) {
  return `px-4 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
    isActive
      ? "bg-brandViolet text-white shadow"
      : "text-slate-700 hover:bg-slate-100"
  }`;
}

export default function TournamentScopeLayout() {
  const { id } = useParams();
  const tournamentVersion = useTournamentStore((s) => s.tournamentVersion);
  const bumpTournamentVersion = useTournamentStore((s) => s.bumpTournamentVersion);
  const fetchSharedData = useTournamentStore((s) => s.fetchSharedData);
  const torneo = useTournamentStore((s) => s.torneo);
  const [startModal, setStartModal] = useState({
    open: false,
    message: "",
    warnings: { ausentes: 0, conSaldo: 0 },
  });
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    fetchSharedData(id);
  }, [id, tournamentVersion, fetchSharedData]);

  const pushToast = (type, message) => {
    const toastId = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id: toastId, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 3200);
  };

  const startTournament = async (force = false) => {
    try {
      const { data } = await api.put(`/torneos/${id}/iniciar`, { force });
      if (data?.requires_confirmation) {
        setStartModal({
          open: true,
          message:
            data.message ||
            "No todas las parejas estan presentes o al dia con los pagos. Queres continuar igual?",
          warnings: data.warnings || { ausentes: 0, conSaldo: 0 },
        });
        return;
      }

      setStartModal({ open: false, message: "", warnings: { ausentes: 0, conSaldo: 0 } });
      pushToast("success", "Torneo iniciado correctamente");
      bumpTournamentVersion();
    } catch (err) {
      pushToast("error", err.response?.data?.error || "No se pudo iniciar torneo");
    }
  };

  return (
    <div className="space-y-4">
      <section className="card p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xl font-bold text-slate-800">{torneo?.name || "Torneo"}</p>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-wrap justify-end">
            <nav className="flex items-center gap-2 overflow-x-auto pb-1">
              <NavLink className={navClass} to="inicio" end>
                Inicio
              </NavLink>
              <NavLink className={navClass} to="parejas" end>
                Parejas
              </NavLink>
              <NavLink className={navClass} to="zonas">
                Zonas
              </NavLink>
              <NavLink className={navClass} to="eliminatorias">
                Eliminatorias
              </NavLink>
            </nav>
            <button
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${torneo?.zonas_generadas ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
              type="button"
              disabled={Boolean(torneo?.zonas_generadas)}
              onClick={() => startTournament(false)}
            >
              Iniciar torneo
            </button>
          </div>
        </div>
      </section>

      <section className="min-w-0">
        <Outlet />
      </section>

      {startModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/35 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="p-5 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Confirmar inicio de torneo</h3>
              <p className="text-sm text-slate-600 mt-1">{startModal.message}</p>
            </div>
            <div className="p-5">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p>Parejas ausentes: {startModal.warnings.ausentes || 0}</p>
                <p>Parejas con saldo pendiente: {startModal.warnings.conSaldo || 0}</p>
              </div>
            </div>
            <div className="p-5 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-2 rounded-lg bg-slate-200"
                onClick={() => setStartModal({ open: false, message: "", warnings: { ausentes: 0, conSaldo: 0 } })}
              >
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={() => startTournament(true)}>
                Continuar igual
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed right-4 bottom-4 z-[60] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`min-w-[250px] max-w-[360px] rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg ${t.type === "error" ? "border-red-300 bg-red-50 text-red-800" : "border-emerald-300 bg-emerald-50 text-emerald-800"}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
