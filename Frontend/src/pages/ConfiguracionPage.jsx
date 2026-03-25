import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import api from "../api";
import "./ConfiguracionGlobalPage.css";

function navClass({ isActive }) {
  return isActive ? "active" : "";
}

export default function ConfiguracionPage() {
  const [methods, setMethods] = useState([]);
  const [courts, setCourts] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [defaultType, setDefaultType] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newActive, setNewActive] = useState(true);
  const [newCourtName, setNewCourtName] = useState("");
  const [newCourtDesc, setNewCourtDesc] = useState("");
  const [newCourtActive, setNewCourtActive] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const loadData = async () => {
    const [{ data: methodsData }, { data: courtsData }, { data: optionsData }] = await Promise.all([
      api.get("/medios-pago"),
      api.get("/canchas-globales"),
      api.get("/torneos/opciones-creacion"),
    ]);

    setMethods(methodsData || []);
    setCourts(courtsData || []);
    setProfiles(optionsData?.tournament_types || []);
    setDefaultType(optionsData?.default_tournament_type || "");
  };

  useEffect(() => {
    loadData().catch(() => setError("No se pudo cargar configuracion global"));
  }, []);

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

  const addMethod = async (e) => {
    e.preventDefault();
    if (!newName.trim()) {
      setError("Ingresa un nombre para el medio de pago");
      return;
    }

    try {
      await api.post("/medios-pago", {
        nombre: newName.trim(),
        descripcion: newDesc.trim(),
        activo: newActive,
      });
      setNewName("");
      setNewDesc("");
      setNewActive(true);
      setInfo("Medio de pago creado");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo crear el medio de pago");
    }
  };

  const addCourt = async (e) => {
    e.preventDefault();
    if (!newCourtName.trim()) {
      setError("Ingresa un nombre para la cancha");
      return;
    }

    try {
      await api.post("/canchas-globales", {
        nombre: newCourtName.trim(),
        descripcion: newCourtDesc.trim(),
        activo: newCourtActive,
      });
      setNewCourtName("");
      setNewCourtDesc("");
      setNewCourtActive(true);
      setInfo("Cancha global creada");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo crear la cancha global");
    }
  };

  const toggleMethodActive = async (method) => {
    try {
      await api.put(`/medios-pago/${method.id}`, {
        nombre: method.nombre,
        descripcion: method.descripcion || null,
        activo: Number(method.activo) !== 1,
      });
      setInfo(`Medio ${Number(method.activo) === 1 ? "desactivado" : "activado"}`);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo actualizar el medio");
    }
  };

  const toggleCourtActive = async (court) => {
    try {
      await api.put(`/canchas-globales/${court.id}`, {
        nombre: court.nombre,
        descripcion: court.descripcion || null,
        activo: Number(court.activo) !== 1,
      });
      setInfo(`Cancha ${Number(court.activo) === 1 ? "desactivada" : "activada"}`);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo actualizar la cancha global");
    }
  };

  const removeMethod = async (id) => {
    try {
      await api.delete(`/medios-pago/${id}`);
      setInfo("Medio eliminado");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo eliminar el medio");
    }
  };

  const removeCourt = async (id) => {
    try {
      await api.delete(`/canchas-globales/${id}`);
      setInfo("Cancha global eliminada");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo eliminar la cancha global");
    }
  };

  return (
    <div className="config-global-page">
      <section className="card p-6">
        <div className="config-global-header">
          <div>
            <h1 className="config-global-title">Configuracion Global</h1>
            <p className="config-global-subtitle">Catalogos maestros de la instalacion: tipos habilitados, canchas y medios de pago.</p>
          </div>

          <nav className="config-global-nav">
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
        <h2 className="font-bold text-lg">Tipos de torneo habilitados</h2>
        <div className="config-global-profile-grid">
          {profiles.map((profile) => (
            <div key={profile.code} className={`config-global-profile-card ${defaultType === profile.code ? "config-global-profile-card-default" : ""}`}>
              <div className="config-global-item-top">
                <p className="config-global-item-name">{profile.label}</p>
                {defaultType === profile.code && <span className="config-global-default-badge">Default</span>}
              </div>
              <p className="config-global-item-desc">{profile.description || "Sin descripcion"}</p>
              <div className="config-global-profile-meta">
                <span>{profile.match_format}</span>
                <span>{profile.play_mode}</span>
              </div>
            </div>
          ))}

          {!profiles.length && <p className="config-global-empty">No hay perfiles de torneo configurados.</p>}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-bold text-lg">Canchas globales</h2>

        <form className="config-global-form" onSubmit={addCourt}>
          <input
            className="input"
            placeholder="Nombre (ej: Cancha 1)"
            value={newCourtName}
            onChange={(e) => setNewCourtName(e.target.value)}
          />
          <input
            className="input"
            placeholder="Descripcion (opcional)"
            value={newCourtDesc}
            onChange={(e) => setNewCourtDesc(e.target.value)}
          />
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={newCourtActive} onChange={(e) => setNewCourtActive(e.target.checked)} />
            Activa
          </label>
          <button className="btn-primary" type="submit">Agregar cancha</button>
        </form>

        <div className="config-global-list">
          {courts.map((court) => (
            <div key={court.id} className="config-global-item">
              <div className="config-global-item-top">
                <p className="config-global-item-name">{court.nombre}</p>
                <span className={`text-xs px-2 py-1 rounded-full ${Number(court.activo) === 1 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {Number(court.activo) === 1 ? "Activa" : "Inactiva"}
                </span>
              </div>
              <p className="config-global-item-desc">{court.descripcion || "Sin descripcion"}</p>

              <div className="config-global-actions">
                <button className="config-global-btn" type="button" onClick={() => toggleCourtActive(court)}>
                  {Number(court.activo) === 1 ? "Desactivar" : "Activar"}
                </button>
                <button className="config-global-btn config-global-btn-danger" type="button" onClick={() => removeCourt(court.id)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}

          {!courts.length && <p className="config-global-empty">Aun no hay canchas globales.</p>}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-bold text-lg">Medios de pago</h2>

        <form className="config-global-form" onSubmit={addMethod}>
          <input
            className="input"
            placeholder="Nombre (ej: Transferencia)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            className="input"
            placeholder="Descripcion (opcional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={newActive} onChange={(e) => setNewActive(e.target.checked)} />
            Activo
          </label>
          <button className="btn-primary" type="submit">Agregar medio</button>
        </form>

        <div className="config-global-list">
          {methods.map((m) => (
            <div key={m.id} className="config-global-item">
              <div className="config-global-item-top">
                <p className="config-global-item-name">{m.nombre}</p>
                <span className={`text-xs px-2 py-1 rounded-full ${Number(m.activo) === 1 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {Number(m.activo) === 1 ? "Activo" : "Inactivo"}
                </span>
              </div>
              <p className="config-global-item-desc">{m.descripcion || "Sin descripcion"}</p>

              <div className="config-global-actions">
                <button className="config-global-btn" type="button" onClick={() => toggleMethodActive(m)}>
                  {Number(m.activo) === 1 ? "Desactivar" : "Activar"}
                </button>
                <button className="config-global-btn config-global-btn-danger" type="button" onClick={() => removeMethod(m.id)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}

          {!methods.length && <p className="config-global-empty">Aun no hay medios de pago globales.</p>}
        </div>
      </section>

      <div className="config-global-toast-stack">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`config-global-toast ${
              t.type === "error" ? "config-global-toast-error" : "config-global-toast-success"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
