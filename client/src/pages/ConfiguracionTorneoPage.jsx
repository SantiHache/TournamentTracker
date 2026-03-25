import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import api from "../api";
import { useTournamentStore } from "../store/tournamentStore";
import "./ConfiguracionPage.css";

function navClass({ isActive }) {
  return `config-nav-link ${isActive ? "config-nav-link-active" : ""}`;
}

export default function ConfiguracionTorneoPage() {
  const activeTournamentId = useTournamentStore((s) => s.activeTournamentId);
  const setActiveTournamentId = useTournamentStore((s) => s.setActiveTournamentId);

  const [torneos, setTorneos] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState(activeTournamentId || "");
  const [globalMethods, setGlobalMethods] = useState([]);
  const [enabledMethodIds, setEnabledMethodIds] = useState([]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const selectedTournament = useMemo(
    () => torneos.find((t) => String(t.id) === String(selectedTournamentId)) || null,
    [torneos, selectedTournamentId]
  );

  const loadTorneos = async () => {
    const { data } = await api.get("/torneos");
    const all = data || [];
    setTorneos(all);

    if (!selectedTournamentId && all.length) {
      const nextId = String(activeTournamentId || all[0].id);
      setSelectedTournamentId(nextId);
    }
  };

  const loadPaymentMethods = async (tournamentId) => {
    if (!tournamentId) {
      setGlobalMethods([]);
      setEnabledMethodIds([]);
      return;
    }

    const { data } = await api.get(`/torneos/${tournamentId}/medios-pago`);
    const rows = data || [];
    setGlobalMethods(rows);
    setEnabledMethodIds(rows.filter((m) => Number(m.enabled) === 1).map((m) => Number(m.id)));
  };

  useEffect(() => {
    loadTorneos().catch(() => setError("No se pudo cargar configuracion"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Promise.all([loadPaymentMethods(selectedTournamentId)]).catch(() =>
      setError("No se pudieron cargar datos de configuracion del torneo")
    );
  }, [selectedTournamentId]);

  const pushToast = (type, message) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  useEffect(() => {
    if (!error) return;
    pushToast("error", error);
    setError("");
  }, [error]);

  useEffect(() => {
    if (!info) return;
    pushToast("success", info);
    setInfo("");
  }, [info]);

  const onTournamentChange = (value) => {
    setSelectedTournamentId(value);
    setActiveTournamentId(value || "");
  };

  const toggleMethod = (methodId) => {
    setEnabledMethodIds((prev) =>
      prev.includes(methodId) ? prev.filter((id) => id !== methodId) : [...prev, methodId]
    );
  };

  const saveMethodConfig = async () => {
    if (!selectedTournamentId) return;
    try {
      await api.put(`/torneos/${selectedTournamentId}/medios-pago`, { enabled_ids: enabledMethodIds });
      setInfo("Medios de pago del torneo actualizados");
      await loadPaymentMethods(selectedTournamentId);
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo guardar medios de pago del torneo");
    }
  };

  return (
    <div className="config-page">
      <section className="card p-6">
        <div className="config-header-top">
          <div>
            <h1 className="config-header-title">Configuracion de Torneo</h1>
            <p className="config-header-subtitle">Seleccion de medios de pago habilitados para cada torneo.</p>
          </div>
          <nav className="config-nav-switch">
            <NavLink to="/configuracion" className={navClass} end>
              Global
            </NavLink>
            <NavLink to="/configuracion/torneo" className={navClass}>
              Torneo
            </NavLink>
          </nav>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="config-section-title">Seleccion de torneo</h2>

        <div className="config-tournament-row">
          <div>
            <label className="config-field-label">Torneo</label>
            <select className="input mt-1" value={selectedTournamentId} onChange={(e) => onTournamentChange(e.target.value)}>
              <option value="">Seleccionar torneo</option>
              {torneos.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          {selectedTournament && <span className="config-tournament-status">{selectedTournament.status}</span>}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="config-section-title">Medios de pago del torneo</h2>
        <p className="config-section-hint">Solo estos medios se mostraran al registrar pagos.</p>

        <div className="config-method-grid mt-3">
          {globalMethods.map((m) => (
            <label key={m.id} className="config-method-card">
              <input
                type="checkbox"
                checked={enabledMethodIds.includes(Number(m.id))}
                onChange={() => toggleMethod(Number(m.id))}
                disabled={!selectedTournamentId || Number(m.activo) !== 1}
              />
              <div>
                <p className="config-method-name">{m.nombre}</p>
                <p className="config-method-description">{m.descripcion || "Sin descripcion"}</p>
                {Number(m.activo) !== 1 && <p className="config-method-inactive">Inactivo globalmente</p>}
              </div>
            </label>
          ))}

          {!!selectedTournamentId && !globalMethods.length && (
            <p className="config-empty-state">No hay medios de pago globales cargados.</p>
          )}

          {!selectedTournamentId && <p className="config-empty-state">Selecciona un torneo para configurar medios.</p>}
        </div>

        <div className="config-method-actions">
          <button className="btn-primary" type="button" disabled={!selectedTournamentId} onClick={saveMethodConfig}>
            Guardar medios del torneo
          </button>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="config-section-title">Canchas del torneo</h2>
        <p className="config-section-hint">Las canchas ahora se administran desde Configuracion Global y se copian al crear el torneo.</p>
      </section>

      <div className="config-toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`config-toast ${t.type === "error" ? "config-toast-error" : "config-toast-success"}`}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
