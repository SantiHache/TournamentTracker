import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useAuthStore } from "../store/authStore";
import "./HomePage.css";

const INITIAL_FORM = {
  name: "",
  tipo_torneo: "",
  clasifican_de_zona_3: 2,
  clasifican_de_zona_4: 3,
  global_court_ids: [],
  enabled_payment_method_ids: [],
};

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "superadmin";
  
  const [torneos, setTorneos] = useState([]);
  const [statusFilter, setStatusFilter] = useState("activo"); // "activo", "finalizado", "cancelado", "all"
  const [summaries, setSummaries] = useState({});
  const [loadingCards, setLoadingCards] = useState(false);
  const [loadingCreateOptions, setLoadingCreateOptions] = useState(false);
  const [createOptions, setCreateOptions] = useState({
    tournament_types: [],
    global_courts: [],
    payment_methods: [],
    default_tournament_type: "",
    default_clasifican_de_zona_3: 2,
    default_clasifican_de_zona_4: 3,
    min_pairs: 6,
    max_pairs: 24,
  });
  const [form, setForm] = useState(INITIAL_FORM);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedClubFilter, setSelectedClubFilter] = useState("all");
  const [error, setError] = useState("");
  const [cardsError, setCardsError] = useState("");
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const progressColor = (value) => {
    const pct = Math.max(0, Math.min(100, value || 0));
    const hue = Math.round(18 + (130 * pct) / 100);
    return {
      bar: `hsl(${hue} 72% 45%)`,
      soft: `hsl(${hue} 78% 95%)`,
      text: `hsl(${hue} 62% 34%)`,
    };
  };

  const load = async () => {
    setCardsError("");
    setLoadingCards(true);
    setLoadingCreateOptions(true);
    try {
      const [{ data: tournamentsData }, { data: optionsData }] = await Promise.all([
        api.get("/torneos"),
        api.get("/torneos/opciones-creacion"),
      ]);

      // Backend filtra automáticamente según rol (superadmin ve todos, otros ven solo activos)
      setTorneos(tournamentsData || []);

      const options = optionsData || {};
      const tournamentTypes = options.tournament_types || [];
      const globalCourts = options.global_courts || [];
      const paymentMethods = options.payment_methods || [];
      const defaultTournamentType = options.default_tournament_type || tournamentTypes[0]?.code || "";

      setCreateOptions({
        tournament_types: tournamentTypes,
        global_courts: globalCourts,
        payment_methods: paymentMethods,
        default_tournament_type: defaultTournamentType,
        default_clasifican_de_zona_3: Number(options.default_clasifican_de_zona_3 || 2),
        default_clasifican_de_zona_4: Number(options.default_clasifican_de_zona_4 || 3),
        min_pairs: Number(options.min_pairs || 6),
        max_pairs: Number(options.max_pairs || 24),
      });

      const defaultClasifica3 = Number(options.default_clasifican_de_zona_3 || 2);
      const defaultClasifica4 = Number(options.default_clasifican_de_zona_4 || 3);

      setForm((prev) => ({
        ...prev,
        tipo_torneo: prev.tipo_torneo || defaultTournamentType,
        clasifican_de_zona_3:
          prev.clasifican_de_zona_3 === INITIAL_FORM.clasifican_de_zona_3
            ? defaultClasifica3
            : prev.clasifican_de_zona_3,
        clasifican_de_zona_4:
          prev.clasifican_de_zona_4 === INITIAL_FORM.clasifican_de_zona_4
            ? defaultClasifica4
            : prev.clasifican_de_zona_4,
        global_court_ids: prev.global_court_ids.length ? prev.global_court_ids : globalCourts.map((court) => Number(court.id)),
        enabled_payment_method_ids: prev.enabled_payment_method_ids.length
          ? prev.enabled_payment_method_ids
          : paymentMethods.map((method) => Number(method.id)),
      }));

      const rows = await Promise.all(
        (tournamentsData || []).map(async (t) => {
          const [pairsRes, matchesRes] = await Promise.all([
            api.get(`/torneos/${t.id}/parejas`),
            api.get(`/torneos/${t.id}/partidos`),
          ]);

          const pairs = pairsRes.data || [];
          const matches = matchesRes.data || [];
          const pairNameById = new Map(
            pairs.map((pair) => [
              Number(pair.id),
              `${pair.player1_nombre} ${pair.player1_apellido} / ${pair.player2_nombre} ${pair.player2_apellido}`,
            ])
          );

          const finalMatch = matches.find((m) => {
            const stage = String(m.stage || "").toLowerCase();
            const round = String(m.round || "").toLowerCase();
            return stage === "eliminatoria" && round === "final";
          });

          const championPairName =
            finalMatch?.winner_id && t.status !== "finalizado"
              ? pairNameById.get(Number(finalMatch.winner_id)) || "Pareja campeona"
              : null;

          const played = matches.filter((m) => m.winner_id).length;
          const total = matches.length;
          const pct = total > 0 ? Math.round((played * 100) / total) : 0;

          return [
            t.id,
            {
              pairsCount: pairs.length,
              played,
              total,
              pct,
              championPairName,
            },
          ];
        })
      );

      setSummaries(Object.fromEntries(rows));
    } catch (err) {
      setCardsError(err.response?.data?.error || "No se pudieron cargar los torneos");
    } finally {
      setLoadingCards(false);
      setLoadingCreateOptions(false);
    }
  };

  useEffect(() => {
    load();
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
    if (!cardsError) return;
    pushToast("error", cardsError);
    setCardsError("");
  }, [cardsError]);

  const selectedType = useMemo(
    () => createOptions.tournament_types.find((type) => type.code === form.tipo_torneo) || null,
    [createOptions.tournament_types, form.tipo_torneo]
  );

  const selectedCourts = useMemo(
    () => createOptions.global_courts.filter((court) => form.global_court_ids.includes(Number(court.id))),
    [createOptions.global_courts, form.global_court_ids]
  );

  const selectedPaymentMethods = useMemo(
    () => createOptions.payment_methods.filter((method) => form.enabled_payment_method_ids.includes(Number(method.id))),
    [createOptions.payment_methods, form.enabled_payment_method_ids]
  );

  const hasClubDataInCourts = useMemo(
    () => createOptions.global_courts.some((court) => String(court.club_nombre || "").trim().length > 0),
    [createOptions.global_courts]
  );

  const availableClubs = useMemo(() => {
    const map = new Map();
    for (const court of createOptions.global_courts) {
      if (!court.club_id || !court.club_nombre) continue;
      map.set(String(court.club_id), court.club_nombre);
    }
    return Array.from(map.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));
  }, [createOptions.global_courts]);

  const hasLocalCourtsInOptions = useMemo(
    () => createOptions.global_courts.some((court) => String(court.scope_type || "") === "local" || !court.club_id),
    [createOptions.global_courts]
  );

  const filteredCourts = useMemo(() => {
    if (selectedClubFilter === "all") return createOptions.global_courts;
    return createOptions.global_courts.filter((court) => String(court.club_id || "") === selectedClubFilter);
  }, [createOptions.global_courts, selectedClubFilter]);

  const toggleSelection = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter((item) => item !== value) : [...prev[key], value],
    }));
  };

  const validateStep = (step) => {
    if (step === 1) {
      if (!form.name.trim()) {
        setError("Ingresa un nombre para el torneo");
        return false;
      }
      if (!form.tipo_torneo) {
        setError("Selecciona un tipo de torneo");
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (!form.global_court_ids.length) {
        setError("Selecciona al menos una cancha");
        return false;
      }
      return true;
    }

    if (step === 3) {
      if (!form.enabled_payment_method_ids.length) {
        setError("Selecciona al menos un medio de pago");
        return false;
      }
      return true;
    }

    return true;
  };

  const goToStep = (nextStep) => {
    for (let step = 1; step < nextStep; step += 1) {
      if (!validateStep(step)) return;
    }
    setWizardStep(nextStep);
  };

  const create = async (e) => {
    e.preventDefault();
    setError("");
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

    try {
      await api.post("/torneos", form);
      setForm({
        ...INITIAL_FORM,
        tipo_torneo: createOptions.default_tournament_type || createOptions.tournament_types[0]?.code || "",
        global_court_ids: createOptions.global_courts.map((court) => Number(court.id)),
        enabled_payment_method_ids: createOptions.payment_methods.map((method) => Number(method.id)),
      });
      setWizardStep(1);
      pushToast("success", "Torneo creado correctamente");
      load();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo crear el torneo");
    }
  };

  return (
    <div className="home-page">
      <section className="card p-5">
        <div className="home-create-header">
          <div>
            <h2 className="text-xl font-bold">Crear Torneo</h2>
            <p className="home-create-subtitle">Defini datos basicos, canchas habilitadas y medios de pago en tres pasos.</p>
          </div>
          <div className="home-step-pills">
            {[1, 2, 3].map((step) => (
              <button
                key={step}
                type="button"
                className={`home-step-pill ${wizardStep >= step ? "home-step-pill-active" : ""}`}
                onClick={() => goToStep(step)}
              >
                Paso {step}
              </button>
            ))}
          </div>
        </div>

        <form className="home-wizard-grid" onSubmit={create}>
          <article className="home-wizard-card home-wizard-card-active">
            <div className="home-wizard-card-top">
              <span className="home-wizard-badge">1</span>
              <div>
                <h3 className="home-wizard-title">Datos basicos</h3>
                <p className="home-wizard-text">Nombre, clasificados y tipo de torneo.</p>
              </div>
            </div>

            <div className="home-basic-grid">
              <label className="home-field">
                <span className="home-field-label">Nombre del torneo</span>
                <input
                  className="input"
                  placeholder="Ej: Mixto Otono"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </label>

              <label className="home-field">
                <span className="home-field-label">Tipo</span>
                <select
                  className="input"
                  value={form.tipo_torneo}
                  onChange={(e) => setForm((prev) => ({ ...prev, tipo_torneo: e.target.value }))}
                  disabled={!createOptions.tournament_types.length}
                >
                  {createOptions.tournament_types.map((type) => (
                    <option key={type.code} value={type.code}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="home-field">
                <span className="home-field-label">Clasifican en zonas de 3</span>
                <input
                  className="input"
                  type="number"
                  min="1"
                  max="3"
                  value={form.clasifican_de_zona_3}
                  onChange={(e) => setForm((prev) => ({ ...prev, clasifican_de_zona_3: Number(e.target.value) }))}
                />
              </label>

              <label className="home-field">
                <span className="home-field-label">Clasifican en zonas de 4</span>
                <input
                  className="input"
                  type="number"
                  min="1"
                  max="4"
                  value={form.clasifican_de_zona_4}
                  onChange={(e) => setForm((prev) => ({ ...prev, clasifican_de_zona_4: Number(e.target.value) }))}
                />
              </label>
            </div>

            {selectedType && (
              <div className="home-profile-card">
                <p className="home-profile-title">{selectedType.label}</p>
                <p className="home-profile-desc">{selectedType.description || "Perfil configurado a nivel instalacion."}</p>
                <div className="home-profile-meta">
                  <span>Formato: {selectedType.match_format}</span>
                  <span>Modo: {selectedType.play_mode}</span>
                </div>
              </div>
            )}

            <div className="home-wizard-actions">
              <button type="button" className="btn-primary" onClick={() => goToStep(2)}>
                Siguiente: Canchas
              </button>
            </div>
          </article>

          <article className={`home-wizard-card ${wizardStep >= 2 ? "home-wizard-card-active" : "home-wizard-card-locked"}`}>
            <div className="home-wizard-card-top">
              <span className="home-wizard-badge">2</span>
              <div>
                <h3 className="home-wizard-title">Canchas</h3>
                <p className="home-wizard-text">Selecciona en cuales se va a jugar este torneo.</p>
              </div>
            </div>

            {wizardStep < 2 ? (
              <div className="home-wizard-placeholder">Completa el paso 1 para habilitar la seleccion de canchas.</div>
            ) : (
              <>
                {hasClubDataInCourts && (
                  <div className="home-court-filter-wrap">
                    <label className="home-field">
                      <span className="home-field-label">Filtrar por club</span>
                      <select
                        className="input"
                        value={selectedClubFilter}
                        onChange={(e) => setSelectedClubFilter(e.target.value)}
                      >
                        <option value="all">Todos los clubes</option>
                        {availableClubs.map((club) => (
                          <option key={club.id} value={club.id}>
                            {club.nombre}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}

                <div className="home-selection-grid">
                  {filteredCourts.map((court) => {
                    const selected = form.global_court_ids.includes(Number(court.id));
                    return (
                      <button
                        key={court.id}
                        type="button"
                        className={`home-choice-card ${selected ? "home-choice-card-active" : ""}`}
                        onClick={() => toggleSelection("global_court_ids", Number(court.id))}
                      >
                        <span className="home-choice-check">{selected ? "Seleccionada" : "Disponible"}</span>
                        <strong>{court.nombre}</strong>
                        {hasClubDataInCourts ? (
                          <span className="home-choice-club">Club: {court.club_nombre || "Sin club"}</span>
                        ) : (
                          hasLocalCourtsInOptions && <span className="home-choice-club">Cancha local del club</span>
                        )}
                        <span>{court.descripcion || "Sin descripcion"}</span>
                      </button>
                    );
                  })}

                  {!loadingCreateOptions && !!createOptions.global_courts.length && !filteredCourts.length && (
                    <p className="home-empty-inline">No hay canchas para el club seleccionado.</p>
                  )}

                  {!loadingCreateOptions && !createOptions.global_courts.length && (
                    <p className="home-empty-inline">No hay canchas globales cargadas en Configuracion Global.</p>
                  )}
                </div>

                <p className="home-selection-summary">{selectedCourts.length} cancha{selectedCourts.length !== 1 ? "s" : ""} seleccionada{selectedCourts.length !== 1 ? "s" : ""}</p>

                <div className="home-wizard-actions">
                  <button type="button" className="btn-secondary" onClick={() => goToStep(1)}>
                    Volver
                  </button>
                  <button type="button" className="btn-primary" onClick={() => goToStep(3)}>
                    Siguiente: Medios de pago
                  </button>
                </div>
              </>
            )}
          </article>

          <article className={`home-wizard-card ${wizardStep >= 3 ? "home-wizard-card-active" : "home-wizard-card-locked"}`}>
            <div className="home-wizard-card-top">
              <span className="home-wizard-badge">3</span>
              <div>
                <h3 className="home-wizard-title">Medios de pago</h3>
                <p className="home-wizard-text">Define como se podra registrar el cobro del torneo.</p>
              </div>
            </div>

            {wizardStep < 3 ? (
              <div className="home-wizard-placeholder">Completa el paso 2 para habilitar la seleccion de medios de pago.</div>
            ) : (
              <>
                <div className="home-selection-grid">
                  {createOptions.payment_methods.map((method) => {
                    const selected = form.enabled_payment_method_ids.includes(Number(method.id));
                    return (
                      <button
                        key={method.id}
                        type="button"
                        className={`home-choice-card home-choice-card-payment ${selected ? "home-choice-card-active" : ""}`}
                        onClick={() => toggleSelection("enabled_payment_method_ids", Number(method.id))}
                      >
                        <span className="home-choice-check">{selected ? "Habilitado" : "Inactivo en este torneo"}</span>
                        <strong>{method.nombre}</strong>
                        <span>{method.descripcion || "Sin descripcion"}</span>
                      </button>
                    );
                  })}

                  {!loadingCreateOptions && !createOptions.payment_methods.length && (
                    <p className="home-empty-inline">No hay medios de pago globales activos.</p>
                  )}
                </div>

                <p className="home-selection-summary">{selectedPaymentMethods.length} medio{selectedPaymentMethods.length !== 1 ? "s" : ""} habilitado{selectedPaymentMethods.length !== 1 ? "s" : ""}</p>

                <div className="home-create-summary">
                  <p><strong>{form.name || "Nuevo torneo"}</strong></p>
                  <p>{selectedType?.label || "Sin tipo"}</p>
                  <p>{selectedCourts.length} canchas · {selectedPaymentMethods.length} medios de pago</p>
                  <p>Las parejas se cargan luego: minimo {createOptions.min_pairs} y maximo {createOptions.max_pairs}.</p>
                </div>

                <div className="home-wizard-actions">
                  <button type="button" className="btn-secondary" onClick={() => goToStep(2)}>
                    Volver
                  </button>
                  <button className="btn-primary home-submit" type="submit">
                    Crear torneo
                  </button>
                </div>
              </>
            )}
          </article>
        </form>
      </section>

      <section className="card p-5">
        <div className="home-active-header">
          <div>
            <h2 className="text-xl font-bold">
              {statusFilter === "activo" ? "Torneos en curso" : statusFilter === "finalizado" ? "Torneos finalizados" : statusFilter === "cancelado" ? "Torneos cancelados" : "Todos los torneos"}
            </h2>
            <span className="home-active-count">{torneos.filter((t) => statusFilter === "all" || t.status === statusFilter).length} torneos</span>
          </div>
          
          {isSuperAdmin && (
            <div className="flex gap-2">
              {["activo", "finalizado", "cancelado", "all"].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 rounded text-xs font-medium transition ${
                    statusFilter === status
                      ? "bg-brandViolet text-white"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {status === "all" ? "Todos" : status === "activo" ? "Activos" : status === "finalizado" ? "Finalizados" : "Cancelados"}
                </button>
              ))}
            </div>
          )}
        </div>

        {loadingCards && <p className="home-loading">Cargando torneos...</p>}

        <div className="home-card-grid">
          {torneos.filter((t) => statusFilter === "all" || t.status === statusFilter).map((t) => {
            const s = summaries[t.id] || { pairsCount: 0, played: 0, total: 0, pct: 0, championPairName: null };
            const tone = progressColor(s.pct);

            return (
              <Link
                key={t.id}
                to={`/torneos/${t.id}`}
                className="home-tournament-card"
              >
                <div className="home-card-top">
                  <h3 className="home-card-title">{t.name}</h3>
                  <span className={`home-card-status ${
                    t.status === "activo" ? "bg-emerald-100 text-emerald-700" : 
                    t.status === "finalizado" ? "bg-slate-100 text-slate-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {t.status}
                  </span>
                </div>

                <p className="home-card-row">
                  Parejas cargadas: <strong>{s.pairsCount}</strong>
                  {t.zonas_generadas ? ` / ${t.planned_pairs}` : ""}
                </p>

                {s.championPairName && (
                  <div className="home-champion-banner">
                    <p className="home-champion-label">🏆 Campeon definido</p>
                    <p className="home-champion-name">{s.championPairName}</p>
                    <p className="home-champion-note">Falta finalizar el torneo para cerrar oficialmente.</p>
                  </div>
                )}

                <p className="home-card-row">
                  Partidos jugados: <strong>{s.played}</strong> / {s.total}
                </p>

                <div className="home-progress-wrap">
                  <div className="home-progress-head">
                    <span className="home-progress-label">Progreso</span>
                    <span style={{ color: tone.text }} className="home-progress-value">{s.pct}%</span>
                  </div>

                  <div className="home-progress-track" style={{ backgroundColor: tone.soft }}>
                    <div
                      className="home-progress-fill"
                      style={{ width: `${s.pct}%`, backgroundColor: tone.bar }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {!loadingCards && !torneos.filter((t) => statusFilter === "all" || t.status === statusFilter).length && !cardsError && (
          <p className="home-empty">No hay torneos para mostrar en esta categoría.</p>
        )}
      </section>

      <div className="home-toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`home-toast ${t.type === "error" ? "home-toast-error" : "home-toast-success"}`}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
