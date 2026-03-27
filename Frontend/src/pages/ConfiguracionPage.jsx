import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import api from "../api";
import { useAuthStore } from "../store/authStore";
import "./ConfiguracionGlobalPage.css";

function navClass({ isActive }) {
  return isActive ? "active" : "";
}

export default function ConfiguracionPage() {
  const user = useAuthStore((s) => s.user);
  const canEditGlobalConfig = user?.role === "admin";
  const [methods, setMethods] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [courts, setCourts] = useState([]);
  const [courtClubDrafts, setCourtClubDrafts] = useState({});
  const [profiles, setProfiles] = useState([]);
  const [defaultType, setDefaultType] = useState("");
  const [installationMode, setInstallationMode] = useState(null);
  const [circuitEnabled, setCircuitEnabled] = useState(false);
  const isCircuitMode = installationMode === "circuit" && circuitEnabled;
  const [newClubName, setNewClubName] = useState("");
  const [newClubDesc, setNewClubDesc] = useState("");
  const [newClubActive, setNewClubActive] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newActive, setNewActive] = useState(true);
  const [newCourtName, setNewCourtName] = useState("");
  const [newCourtDesc, setNewCourtDesc] = useState("");
  const [newCourtClubId, setNewCourtClubId] = useState("");
  const [newCourtActive, setNewCourtActive] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const loadData = async () => {
    const [{ data: methodsData }, { data: courtsData }, { data: clubsData }, { data: optionsData }, { data: appConfigData }] = await Promise.all([
      api.get("/medios-pago"),
      api.get("/canchas-globales"),
      api.get("/clubs-globales"),
      api.get("/torneos/opciones-creacion"),
      api.get("/public/app-config"),
    ]);

    setMethods(methodsData || []);
    setClubs(clubsData || []);
    const normalizedCourts = courtsData || [];
    setCourts(normalizedCourts);
    setCourtClubDrafts(
      Object.fromEntries(normalizedCourts.map((court) => [court.id, court.club_id ? String(court.club_id) : ""]))
    );
    setProfiles(optionsData?.tournament_types || []);
    setDefaultType(optionsData?.default_tournament_type || "");
    setInstallationMode(appConfigData?.installationMode || null);
    setCircuitEnabled(Boolean(appConfigData?.circuitEnabled));
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

  const addClub = async (e) => {
    e.preventDefault();
    if (!canEditGlobalConfig) {
      setError("Solo el admin de la instalacion puede editar clubes");
      return;
    }
    if (!newClubName.trim()) {
      setError("Ingresa un nombre para el club");
      return;
    }

    try {
      await api.post("/clubs-globales", {
        nombre: newClubName.trim(),
        descripcion: newClubDesc.trim(),
        activo: newClubActive,
      });
      setNewClubName("");
      setNewClubDesc("");
      setNewClubActive(true);
      setInfo("Club creado");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo crear el club");
    }
  };

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
    if (!canEditGlobalConfig) {
      setError("Solo el admin de la instalacion puede editar canchas globales");
      return;
    }
    if (!newCourtName.trim()) {
      setError("Ingresa un nombre para la cancha");
      return;
    }
    if (isCircuitMode && !newCourtClubId) {
      setError("En modo circuito, la cancha debe tener un club seleccionado");
      return;
    }

    try {
      await api.post("/canchas-globales", {
        nombre: newCourtName.trim(),
        descripcion: newCourtDesc.trim(),
        club_id: isCircuitMode ? Number(newCourtClubId) : null,
        activo: newCourtActive,
      });
      setNewCourtName("");
      setNewCourtDesc("");
      setNewCourtClubId("");
      setNewCourtActive(true);
      setInfo("Cancha global creada");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo crear la cancha global");
    }
  };

  const toggleClubActive = async (club) => {
    if (!canEditGlobalConfig) {
      setError("Solo el admin de la instalacion puede editar clubes");
      return;
    }
    try {
      await api.put(`/clubs-globales/${club.id}`, {
        nombre: club.nombre,
        descripcion: club.descripcion || null,
        activo: Number(club.activo) !== 1,
      });
      setInfo(`Club ${Number(club.activo) === 1 ? "desactivado" : "activado"}`);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo actualizar el club");
    }
  };

  const saveCourtClub = async (court) => {
    if (!canEditGlobalConfig) {
      setError("Solo el admin de la instalacion puede editar canchas globales");
      return;
    }
    const selectedClubId = courtClubDrafts[court.id] || "";
    if (isCircuitMode && !selectedClubId) {
      setError("Selecciona un club para la cancha");
      return;
    }

    try {
      await api.put(`/canchas-globales/${court.id}`, {
        nombre: court.nombre,
        descripcion: court.descripcion || null,
        club_id: isCircuitMode ? Number(selectedClubId) : null,
        activo: Number(court.activo) === 1,
      });
      setInfo("Club de la cancha actualizado");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo actualizar el club de la cancha");
    }
  };

  const toggleMethodActive = async (method) => {
    if (!canEditGlobalConfig) {
      setError("Solo el admin de la instalacion puede editar medios de pago");
      return;
    }
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
    if (!canEditGlobalConfig) {
      setError("Solo el admin de la instalacion puede editar canchas globales");
      return;
    }
    try {
      await api.put(`/canchas-globales/${court.id}`, {
        nombre: court.nombre,
        descripcion: court.descripcion || null,
        club_id: isCircuitMode ? Number(courtClubDrafts[court.id] || court.club_id || 0) : null,
        activo: Number(court.activo) !== 1,
      });
      setInfo(`Cancha ${Number(court.activo) === 1 ? "desactivada" : "activada"}`);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo actualizar la cancha global");
    }
  };

  const removeClub = async (id) => {
    if (!canEditGlobalConfig) {
      setError("Solo el admin de la instalacion puede editar clubes");
      return;
    }
    try {
      await api.delete(`/clubs-globales/${id}`);
      setInfo("Club eliminado");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo eliminar el club");
    }
  };

  const removeMethod = async (id) => {
    if (!canEditGlobalConfig) {
      setError("Solo el admin de la instalacion puede editar medios de pago");
      return;
    }
    try {
      await api.delete(`/medios-pago/${id}`);
      setInfo("Medio eliminado");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo eliminar el medio");
    }
  };

  const removeCourt = async (id) => {
    if (!canEditGlobalConfig) {
      setError("Solo el admin de la instalacion puede editar canchas globales");
      return;
    }
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

      {isCircuitMode && (
        <section className="card p-5">
          <h2 className="font-bold text-lg">Clubes globales</h2>

          {canEditGlobalConfig && (
            <form className="config-global-form" onSubmit={addClub}>
              <input
                className="input"
                placeholder="Nombre del club"
                value={newClubName}
                onChange={(e) => setNewClubName(e.target.value)}
              />
              <input
                className="input"
                placeholder="Descripcion (opcional)"
                value={newClubDesc}
                onChange={(e) => setNewClubDesc(e.target.value)}
              />
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={newClubActive} onChange={(e) => setNewClubActive(e.target.checked)} />
                Activo
              </label>
              <button className="btn-primary" type="submit">Agregar club</button>
            </form>
          )}

          <div className="config-global-list">
            {clubs.map((club) => (
              <div key={club.id} className="config-global-item">
                <div className="config-global-item-top">
                  <p className="config-global-item-name">{club.nombre}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${Number(club.activo) === 1 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {Number(club.activo) === 1 ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <p className="config-global-item-desc">{club.descripcion || "Sin descripcion"}</p>

                {canEditGlobalConfig && (
                  <div className="config-global-actions">
                    <button className="config-global-btn" type="button" onClick={() => toggleClubActive(club)}>
                      {Number(club.activo) === 1 ? "Desactivar" : "Activar"}
                    </button>
                    <button className="config-global-btn config-global-btn-danger" type="button" onClick={() => removeClub(club.id)}>
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            ))}

            {!clubs.length && <p className="config-global-empty">Aun no hay clubes globales.</p>}
          </div>
        </section>
      )}

      <section className="card p-5">
        <h2 className="font-bold text-lg">Canchas globales</h2>

        {canEditGlobalConfig && (
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
            {isCircuitMode && (
              <select
                className="input"
                value={newCourtClubId}
                onChange={(e) => setNewCourtClubId(e.target.value)}
              >
                <option value="">Seleccionar club</option>
                {clubs
                  .filter((club) => Number(club.activo) === 1)
                  .map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.nombre}
                    </option>
                  ))}
              </select>
            )}
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={newCourtActive} onChange={(e) => setNewCourtActive(e.target.checked)} />
              Activa
            </label>
            <button className="btn-primary" type="submit">Agregar cancha</button>
          </form>
        )}

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
              {isCircuitMode ? (
                <p className="config-global-item-desc">Club: {court.club_nombre || "Sin club"}</p>
              ) : (
                <p className="config-global-item-desc">Tipo: Cancha local del club</p>
              )}

              {canEditGlobalConfig && (
                <>
                  {isCircuitMode && (
                    <div className="config-global-actions">
                      <select
                        className="input"
                        value={courtClubDrafts[court.id] || ""}
                        onChange={(e) =>
                          setCourtClubDrafts((prev) => ({
                            ...prev,
                            [court.id]: e.target.value,
                          }))
                        }
                      >
                        <option value="">Seleccionar club</option>
                        {clubs
                          .filter((club) => Number(club.activo) === 1)
                          .map((club) => (
                            <option key={club.id} value={club.id}>
                              {club.nombre}
                            </option>
                          ))}
                      </select>
                      <button className="config-global-btn" type="button" onClick={() => saveCourtClub(court)}>
                        Guardar club
                      </button>
                    </div>
                  )}

                  <div className="config-global-actions">
                    <button className="config-global-btn" type="button" onClick={() => toggleCourtActive(court)}>
                      {Number(court.activo) === 1 ? "Desactivar" : "Activar"}
                    </button>
                    <button className="config-global-btn config-global-btn-danger" type="button" onClick={() => removeCourt(court.id)}>
                      Eliminar
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {!courts.length && <p className="config-global-empty">Aun no hay canchas globales.</p>}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-bold text-lg">Medios de pago</h2>

        {canEditGlobalConfig && (
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
        )}

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

              {canEditGlobalConfig && (
                <div className="config-global-actions">
                  <button className="config-global-btn" type="button" onClick={() => toggleMethodActive(m)}>
                    {Number(m.activo) === 1 ? "Desactivar" : "Activar"}
                  </button>
                  <button className="config-global-btn config-global-btn-danger" type="button" onClick={() => removeMethod(m.id)}>
                    Eliminar
                  </button>
                </div>
              )}
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
