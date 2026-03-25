import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";

export default function TournamentPage({ view = "all" }) {
  const { id } = useParams();
  const [torneo, setTorneo] = useState(null);
  const [parejas, setParejas] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [cuadroData, setCuadroData] = useState({ blocked: false, message: null, matches: [] });
  const [canchas, setCanchas] = useState([]);
  const [canchasList, setCanchasList] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [mediosPago, setMediosPago] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [pending, setPending] = useState({ sinCancha: [], conCancha: [] });
  const [zoneOrders, setZoneOrders] = useState({});
  const [paymentForms, setPaymentForms] = useState({});
  const [resultForms, setResultForms] = useState({});
  const [queueCourtByMatch, setQueueCourtByMatch] = useState({});
  const [startCourtByMatch, setStartCourtByMatch] = useState({});
  const [txEdit, setTxEdit] = useState({});
  const [nuevoPar, setNuevoPar] = useState({
    player1: { nombre: "", apellido: "", telefono: "+54" },
    player2: { nombre: "", apellido: "", telefono: "+54" },
  });
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [editingPairId, setEditingPairId] = useState(null);
  const [editPairForm, setEditPairForm] = useState(null);
  const [dragZonePair, setDragZonePair] = useState(null);
  const [dragQueueMatch, setDragQueueMatch] = useState(null);

  const load = async () => {
    const [t, p, z, c, ce, cl, pg, mp, pd, pp] = await Promise.all([
      api.get(`/torneos/${id}`),
      api.get(`/torneos/${id}/parejas`),
      api.get(`/torneos/${id}/zonas`),
      api.get(`/torneos/${id}/cuadro`),
      api.get(`/torneos/${id}/canchas/estado`),
      api.get(`/torneos/${id}/canchas`),
      api.get(`/torneos/${id}/pagos`),
      api.get("/medios-pago"),
      api.get(`/torneos/${id}/partidos`),
      api.get(`/torneos/${id}/partidos/pendientes`),
    ]);
    setTorneo(t.data);
    setParejas(p.data);
    setZonas(z.data);
    setCuadroData(c.data || { blocked: false, message: null, matches: [] });
    setCanchas(ce.data);
    setCanchasList(cl.data || []);
    setPagos(pg.data || []);
    setMediosPago(mp.data || []);
    setPartidos(pd.data || []);
    setPending(pp.data || { sinCancha: [], conCancha: [] });

    const nextOrder = {};
    (z.data || []).forEach((zone) => {
      nextOrder[zone.group.id] = [...zone.standings]
        .sort((a, b) => (a.position || 999) - (b.position || 999))
        .map((s) => s.pair_id);
    });
    setZoneOrders(nextOrder);
  };

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      api
        .get(`/torneos/${id}/canchas/estado`)
        .then((x) => setCanchas(x.data))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(timer);
  }, [id]);

  const pairNameMap = useMemo(() => {
    const map = new Map();
    parejas.forEach((p) => {
      map.set(p.id, `${p.player1_nombre} ${p.player1_apellido} / ${p.player2_nombre} ${p.player2_apellido}`);
    });
    return map;
  }, [parejas]);

  const paymentsByPairPlayer = useMemo(() => {
    const map = new Map();
    pagos.forEach((row) => {
      const key = `${row.pair_id}-${row.player_num}`;
      if (!map.has(key)) {
        map.set(key, {
          paymentId: row.id,
          estado: row.estado,
          transacciones: [],
        });
      }
      const group = map.get(key);
      group.estado = row.estado;
      if (row.tx_id) {
        group.transacciones.push({
          id: row.tx_id,
          payment_method_id: row.payment_method_id,
          monto: row.monto,
          created_at: row.tx_created_at,
        });
      }
    });
    return map;
  }, [pagos]);

  const groupedBracket = useMemo(() => {
    const groups = {};
    (cuadroData.matches || []).forEach((m) => {
      if (!groups[m.round || "r1"]) groups[m.round || "r1"] = [];
      groups[m.round || "r1"].push(m);
    });
    return groups;
  }, [cuadroData]);

  const orderedRounds = useMemo(() => {
    const priority = {
      r1: 1,
      octavos: 2,
      cuartos: 3,
      semis: 4,
      final: 5,
    };
    return Object.keys(groupedBracket).sort((a, b) => (priority[a] || 99) - (priority[b] || 99));
  }, [groupedBracket]);

  const reorderListByIds = (list, dragId, targetId) => {
    const from = list.findIndex((x) => x === dragId);
    const to = list.findIndex((x) => x === targetId);
    if (from < 0 || to < 0 || from === to) return list;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  };

  const addPair = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post(`/torneos/${id}/parejas`, nuevoPar);
      setNuevoPar({
        player1: { nombre: "", apellido: "", telefono: "+54" },
        player2: { nombre: "", apellido: "", telefono: "+54" },
      });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo crear la pareja");
    }
  };

  const setPresencia = async (pairId, present) => {
    setInfo("");
    try {
      await api.put(`/torneos/${id}/parejas/${pairId}/${present ? "presente" : "ausente"}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo cambiar presencia");
    }
  };

  const startEditPair = (pair) => {
    setEditingPairId(pair.id);
    setEditPairForm({
      player1: {
        nombre: pair.player1_nombre,
        apellido: pair.player1_apellido,
        telefono: pair.player1_telefono,
      },
      player2: {
        nombre: pair.player2_nombre,
        apellido: pair.player2_apellido,
        telefono: pair.player2_telefono,
      },
    });
  };

  const saveEditPair = async (pairId) => {
    try {
      await api.put(`/torneos/${id}/parejas/${pairId}`, editPairForm);
      setEditingPairId(null);
      setEditPairForm(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo editar la pareja");
    }
  };

  const deletePair = async (pairId) => {
    try {
      await api.delete(`/torneos/${id}/parejas/${pairId}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo eliminar la pareja");
    }
  };

  const paymentKey = (pairId, playerNum) => `${pairId}-${playerNum}`;

  const addTransaction = async (pairId, playerNum) => {
    const key = paymentKey(pairId, playerNum);
    const form = paymentForms[key] || {};
    if (!form.payment_method_id || form.monto === undefined) return;

    try {
      await api.post(`/torneos/${id}/pagos/${pairId}/jugador/${playerNum}/transaccion`, {
        payment_method_id: Number(form.payment_method_id),
        monto: Number(form.monto),
      });
      setPaymentForms((s) => ({ ...s, [key]: { payment_method_id: form.payment_method_id, monto: "" } }));
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo agregar transaccion");
    }
  };

  const setEstadoPago = async (pairId, playerNum, estado) => {
    try {
      await api.put(`/torneos/${id}/pagos/${pairId}/jugador/${playerNum}/estado`, { estado });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo actualizar estado de pago");
    }
  };

  const updateTransaction = async (txId) => {
    try {
      await api.put(`/torneos/${id}/pagos/transacciones/${txId}`, {
        monto: Number(txEdit[txId] || 0),
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo editar transaccion");
    }
  };

  const moveZonePosition = (zoneId, index, direction) => {
    const list = [...(zoneOrders[zoneId] || [])];
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    setZoneOrders((s) => ({ ...s, [zoneId]: list }));
  };

  const saveZonePositions = async (zoneId) => {
    try {
      await api.put(`/torneos/${id}/zonas/${zoneId}/posiciones`, {
        positions: zoneOrders[zoneId],
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo guardar posiciones");
    }
  };

  const queueMatch = async (matchId) => {
    const courtId = Number(queueCourtByMatch[matchId]);
    if (!courtId) return;
    try {
      await api.post(`/torneos/canchas/${courtId}/cola`, { match_id: matchId });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo asignar a la cola");
    }
  };

  const removeFromQueue = async (courtId, matchId) => {
    try {
      await api.delete(`/torneos/canchas/${courtId}/cola/${matchId}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo quitar de la cola");
    }
  };

  const moveQueue = async (courtId, queueRows, index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= queueRows.length) return;
    const ids = queueRows.map((x) => x.match_id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    try {
      await api.put(`/torneos/canchas/${courtId}/cola/orden`, { match_ids: ids });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo reordenar cola");
    }
  };

  const iniciarPartido = async (matchId) => {
    const courtId = Number(startCourtByMatch[matchId]);
    if (!courtId) return;
    try {
      await api.put(`/partidos/${matchId}/iniciar`, { court_id: courtId });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo iniciar partido");
    }
  };

  const guardarResultado = async (match) => {
    const form = resultForms[match.id] || {};
    if (!form.winner_id) return;

    const payload = {
      set1_pair1: Number(form.set1_pair1 ?? 0),
      set1_pair2: Number(form.set1_pair2 ?? 0),
      set2_pair1: form.set2_pair1 === "" || form.set2_pair1 === undefined ? null : Number(form.set2_pair1),
      set2_pair2: form.set2_pair2 === "" || form.set2_pair2 === undefined ? null : Number(form.set2_pair2),
      supertb_pair1:
        form.supertb_pair1 === "" || form.supertb_pair1 === undefined ? null : Number(form.supertb_pair1),
      supertb_pair2:
        form.supertb_pair2 === "" || form.supertb_pair2 === undefined ? null : Number(form.supertb_pair2),
      winner_id: Number(form.winner_id),
    };

    if (torneo.match_format === "one_set") {
      if (payload.set2_pair1 !== null || payload.set2_pair2 !== null || payload.supertb_pair1 !== null || payload.supertb_pair2 !== null) {
        setError("En formato 1 set, solo debes completar Set 1");
        return;
      }
    }

    if (torneo.match_format === "best_of_3") {
      if (payload.set2_pair1 === null || payload.set2_pair2 === null) {
        setError("En mejor de 3 sets, Set 1 y Set 2 son obligatorios");
        return;
      }
      if (payload.supertb_pair1 !== null || payload.supertb_pair2 !== null) {
        setError("En mejor de 3 sets, no debes cargar Super Tie-Break");
        return;
      }
    }

    if (torneo.match_format === "best_of_3_super_tb") {
      if (payload.set2_pair1 === null || payload.set2_pair2 === null) {
        setError("En mejor de 3 con Super Tie-Break, Set 1 y Set 2 son obligatorios");
        return;
      }
      const oneStbMissing = (payload.supertb_pair1 === null) !== (payload.supertb_pair2 === null);
      if (oneStbMissing) {
        setError("Si cargas Super Tie-Break, completa ambos valores");
        return;
      }
    }

    try {
      await api.put(`/partidos/${match.id}/resultado`, payload);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo cargar resultado");
    }
  };

  const onZoneDrop = (zoneId, targetPairId) => {
    if (!dragZonePair || dragZonePair.zoneId !== zoneId) return;
    const list = zoneOrders[zoneId] || [];
    const reordered = reorderListByIds(list, dragZonePair.pairId, targetPairId);
    setZoneOrders((s) => ({ ...s, [zoneId]: reordered }));
    setDragZonePair(null);
  };

  const onQueueDrop = async (courtId, targetMatchId, queueRows) => {
    if (!dragQueueMatch || dragQueueMatch.courtId !== courtId) return;
    const ids = queueRows.map((q) => q.match_id);
    const reordered = reorderListByIds(ids, dragQueueMatch.matchId, targetMatchId);
    setDragQueueMatch(null);
    try {
      await api.put(`/torneos/canchas/${courtId}/cola/orden`, { match_ids: reordered });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo reordenar cola por drag and drop");
    }
  };

  const marcarWO = async (matchId, winnerId) => {
    try {
      await api.put(`/partidos/${matchId}/wo`, { winner_id: winnerId });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo marcar W.O.");
    }
  };

  const finalizarTorneo = async () => {
    try {
      await api.put(`/torneos/${id}/finalizar`);
      setInfo("Torneo finalizado correctamente");
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo finalizar torneo");
    }
  };

  const warnings = useMemo(
    () => ({
      pagos: parejas.filter((p) => p.warning_pago).length,
      empates: zonas.filter((z) => z.has_tie_warning).length,
      presencia: parejas.filter((p) => p.presente === null).length,
    }),
    [parejas, zonas]
  );

  if (!torneo) return <p>Cargando...</p>;

  const partidosPendientes = partidos.filter((m) => !m.winner_id);
  const partidosEnJuego = partidos.filter((m) => m.started_at && !m.finished_at);
  const isParejasView = view === "parejas";
  const isPresentismoView = view === "presentismo-pagos";
  const isZonasView = view === "zonas";
  const isEliminatoriasView = view === "eliminatorias";
  const isCanchasView = view === "canchas";

  const viewMeta = {
    parejas: {
      title: "Parejas",
      subtitle: "Carga y gestion de parejas del torneo",
    },
    "presentismo-pagos": {
      title: "Presentismo y Pagos",
      subtitle: "Control de presencia y cobranzas por jugador",
    },
    zonas: {
      title: "Zonas",
      subtitle: "Seguimiento de posiciones y desempates manuales",
    },
    eliminatorias: {
      title: "Eliminatorias",
      subtitle: "Cuadro, progreso de llave y carga de resultados",
    },
    canchas: {
      title: "Canchas",
      subtitle: "Cola de partidos y operacion de canchas en tiempo real",
    },
  };

  const currentMeta = viewMeta[view] || {
    title: "Torneo",
    subtitle: "Gestion integral",
  };

  return (
    <div className="space-y-5">
      <section className="card p-5 flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold">{torneo.name}</h1>
          <p className="text-sm text-slate-500 mt-1">{currentMeta.title} · {currentMeta.subtitle}</p>
          <p className="text-slate-600">
            {torneo.status}
            {torneo.zonas_generadas ? ` · ${torneo.planned_pairs} parejas` : " · parejas abiertas"}
            {` · ${torneo.tipo_torneo} · ${torneo.match_format}`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-sm">Pagos pendientes: {warnings.pagos}</span>
          <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-sm">Empates: {warnings.empates}</span>
          <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm">Sin presencia: {warnings.presencia}</span>
          <button className="btn-secondary" onClick={finalizarTorneo} disabled={torneo.status === "finalizado"}>
            Finalizar torneo
          </button>
        </div>
      </section>

      {(error || info) && (
        <section className="card p-4">
          {error && <p className="text-red-600">{error}</p>}
          {info && <p className="text-emerald-700">{info}</p>}
        </section>
      )}

      {(isParejasView || isPresentismoView) && (
      <div className="grid lg:grid-cols-2 gap-5">
        <section className="card p-5">
          <h2 className="font-bold text-lg">Cargar pareja</h2>
          <form className="mt-3 grid grid-cols-2 gap-2" onSubmit={addPair}>
            <input className="input" placeholder="Nombre J1" value={nuevoPar.player1.nombre} onChange={(e) => setNuevoPar((s) => ({ ...s, player1: { ...s.player1, nombre: e.target.value } }))} />
            <input className="input" placeholder="Apellido J1" value={nuevoPar.player1.apellido} onChange={(e) => setNuevoPar((s) => ({ ...s, player1: { ...s.player1, apellido: e.target.value } }))} />
            <input className="input col-span-2" placeholder="Telefono J1 (+54...)" value={nuevoPar.player1.telefono} onChange={(e) => setNuevoPar((s) => ({ ...s, player1: { ...s.player1, telefono: e.target.value } }))} />
            <input className="input" placeholder="Nombre J2" value={nuevoPar.player2.nombre} onChange={(e) => setNuevoPar((s) => ({ ...s, player2: { ...s.player2, nombre: e.target.value } }))} />
            <input className="input" placeholder="Apellido J2" value={nuevoPar.player2.apellido} onChange={(e) => setNuevoPar((s) => ({ ...s, player2: { ...s.player2, apellido: e.target.value } }))} />
            <input className="input col-span-2" placeholder="Telefono J2 (+54...)" value={nuevoPar.player2.telefono} onChange={(e) => setNuevoPar((s) => ({ ...s, player2: { ...s.player2, telefono: e.target.value } }))} />
            {error && <p className="text-red-600 text-sm col-span-2">{error}</p>}
            <button className="btn-primary col-span-2">Agregar pareja</button>
          </form>
        </section>

        <section className="card p-5">
          <h2 className="font-bold text-lg">Parejas ({parejas.length}{torneo.zonas_generadas ? `/${torneo.planned_pairs}` : ""})</h2>
          <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
            {parejas.map((p) => (
              <div key={p.id} className="rounded-xl border border-slate-200 p-3">
                <p className="font-semibold">{p.player1_nombre} {p.player1_apellido} / {p.player2_nombre} {p.player2_apellido}</p>
                <div className="flex flex-wrap gap-2 mt-2 text-xs">
                  <a className="text-brandGreen" href={`https://wa.me/${p.player1_telefono.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">WhatsApp J1</a>
                  <a className="text-brandViolet" href={`https://wa.me/${p.player2_telefono.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">WhatsApp J2</a>
                </div>
                <div className="flex gap-2 mt-2">
                  {isPresentismoView && (
                    <>
                      <button className="btn-primary" onClick={() => setPresencia(p.id, true)}>Presente</button>
                      <button className="btn-secondary" onClick={() => setPresencia(p.id, false)}>Ausente</button>
                    </>
                  )}
                  {!torneo.zonas_generadas && (
                    <button className="px-3 py-2 rounded-lg bg-slate-200" onClick={() => startEditPair(p)}>Editar</button>
                  )}
                  {!torneo.zonas_generadas && (
                    <button className="px-3 py-2 rounded-lg bg-red-100" onClick={() => deletePair(p.id)}>Eliminar</button>
                  )}
                </div>

                {editingPairId === p.id && editPairForm && (
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3">
                    <input className="input" value={editPairForm.player1.nombre} onChange={(e) => setEditPairForm((s) => ({ ...s, player1: { ...s.player1, nombre: e.target.value } }))} />
                    <input className="input" value={editPairForm.player1.apellido} onChange={(e) => setEditPairForm((s) => ({ ...s, player1: { ...s.player1, apellido: e.target.value } }))} />
                    <input className="input col-span-2" value={editPairForm.player1.telefono} onChange={(e) => setEditPairForm((s) => ({ ...s, player1: { ...s.player1, telefono: e.target.value } }))} />
                    <input className="input" value={editPairForm.player2.nombre} onChange={(e) => setEditPairForm((s) => ({ ...s, player2: { ...s.player2, nombre: e.target.value } }))} />
                    <input className="input" value={editPairForm.player2.apellido} onChange={(e) => setEditPairForm((s) => ({ ...s, player2: { ...s.player2, apellido: e.target.value } }))} />
                    <input className="input col-span-2" value={editPairForm.player2.telefono} onChange={(e) => setEditPairForm((s) => ({ ...s, player2: { ...s.player2, telefono: e.target.value } }))} />
                    <div className="col-span-2 flex gap-2">
                      <button className="btn-primary" onClick={() => saveEditPair(p.id)}>Guardar cambios</button>
                      <button className="px-3 py-2 rounded-lg bg-slate-200" onClick={() => { setEditingPairId(null); setEditPairForm(null); }}>Cancelar</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
      )}

      {isPresentismoView && (
      <section className="card p-5">
        <h2 className="font-bold text-lg">Pagos por jugador</h2>
        <div className="mt-3 space-y-4">
          {parejas.map((p) => (
            <div key={`pay-${p.id}`} className="rounded-xl border border-slate-200 p-3">
              <p className="font-semibold">{pairNameMap.get(p.id)}</p>
              {[1, 2].map((num) => {
                const key = paymentKey(p.id, num);
                const bucket = paymentsByPairPlayer.get(key) || { estado: "sin_pago", transacciones: [] };
                return (
                  <div key={key} className="mt-2 rounded-lg bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">Jugador {num} · Estado: {bucket.estado}</p>
                      <div className="flex gap-2">
                        <button className="px-2 py-1 rounded bg-slate-200" onClick={() => setEstadoPago(p.id, num, "sin_pago")}>Sin pago</button>
                        <button className="px-2 py-1 rounded bg-amber-200" onClick={() => setEstadoPago(p.id, num, "parcial")}>Parcial</button>
                        <button className="px-2 py-1 rounded bg-emerald-200" onClick={() => setEstadoPago(p.id, num, "pagado")}>Pagado</button>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-2 mt-2">
                      <select
                        className="input"
                        value={paymentForms[key]?.payment_method_id || ""}
                        onChange={(e) =>
                          setPaymentForms((s) => ({
                            ...s,
                            [key]: { ...(s[key] || {}), payment_method_id: e.target.value },
                          }))
                        }
                      >
                        <option value="">Medio de pago</option>
                        {mediosPago.map((m) => (
                          <option key={m.id} value={m.id}>{m.nombre}</option>
                        ))}
                      </select>
                      <input
                        className="input"
                        type="number"
                        placeholder="Monto"
                        value={paymentForms[key]?.monto || ""}
                        onChange={(e) =>
                          setPaymentForms((s) => ({
                            ...s,
                            [key]: { ...(s[key] || {}), monto: e.target.value },
                          }))
                        }
                      />
                      <button className="btn-primary" onClick={() => addTransaction(p.id, num)}>
                        Agregar transaccion
                      </button>
                    </div>

                    <div className="mt-2 space-y-1 text-sm">
                      {bucket.transacciones.map((tx) => (
                        <div key={tx.id} className="flex flex-wrap items-center gap-2">
                          <span>Tx #{tx.id}</span>
                          <span>$ {tx.monto}</span>
                          <input
                            className="input max-w-28"
                            type="number"
                            value={txEdit[tx.id] ?? tx.monto}
                            onChange={(e) => setTxEdit((s) => ({ ...s, [tx.id]: e.target.value }))}
                          />
                          <button className="px-2 py-1 rounded bg-slate-200" onClick={() => updateTransaction(tx.id)}>
                            Guardar
                          </button>
                          <button className="px-2 py-1 rounded bg-red-100" onClick={() => {
                            setTxEdit((s) => ({ ...s, [tx.id]: 0 }));
                            setTimeout(() => updateTransaction(tx.id), 0);
                          }}>
                            Poner en 0
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>
      )}

      {isZonasView && (
      <section className="card p-5">
        <h2 className="font-bold text-lg">Zonas</h2>
        <div className="mt-3 grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {zonas.map((z) => (
            <div key={z.group.id} className="rounded-xl border border-slate-200 p-3">
              <p className="font-semibold">Zona {z.group.name}</p>
              <p className="text-sm text-slate-600">Tamano: {z.group.size}</p>
              {z.has_tie_warning && <p className="mt-2 text-xs text-orange-700">Empate sin resolver</p>}
              <div className="mt-2 space-y-1">
                {(zoneOrders[z.group.id] || []).map((pairId, idx) => (
                  <div
                    key={`${z.group.id}-${pairId}`}
                    className="flex items-center justify-between gap-2 text-sm rounded bg-slate-50 p-2"
                    draggable
                    onDragStart={() => setDragZonePair({ zoneId: z.group.id, pairId })}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onZoneDrop(z.group.id, pairId)}
                  >
                    <span>{idx + 1}. {pairNameMap.get(pairId) || `Pareja ${pairId}`}</span>
                    <div className="flex gap-1">
                      <button className="px-2 py-1 rounded bg-slate-200" onClick={() => moveZonePosition(z.group.id, idx, -1)}>↑</button>
                      <button className="px-2 py-1 rounded bg-slate-200" onClick={() => moveZonePosition(z.group.id, idx, 1)}>↓</button>
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn-secondary mt-3" onClick={() => saveZonePositions(z.group.id)}>
                Guardar posiciones
              </button>
            </div>
          ))}
        </div>
      </section>
      )}

      {isEliminatoriasView && (
      <section className="card p-5">
        <h2 className="font-bold text-lg">Cuadro eliminatorio</h2>
        {cuadroData.blocked && <p className="text-orange-700 text-sm">{cuadroData.message}</p>}
        <div className="mt-3 grid md:grid-cols-2 xl:grid-cols-5 gap-3">
          {orderedRounds.map((round) => (
            <div key={round} className="rounded-xl border border-slate-200 p-3 bg-gradient-to-b from-white to-slate-50">
              <p className="font-semibold uppercase text-xs tracking-wider text-slate-500">{round}</p>
              <div className="mt-2 space-y-2 text-sm">
                {groupedBracket[round].map((m) => (
                  <div key={m.id} className="rounded-xl bg-white border border-slate-200 p-2 shadow-sm">
                    <p className={`truncate ${m.winner_id === m.pair1_id ? "font-bold text-brandGreen" : "text-slate-700"}`}>
                      {pairNameMap.get(m.pair1_id) || "Por definir"}
                    </p>
                    <p className={`truncate ${m.winner_id === m.pair2_id ? "font-bold text-brandGreen" : "text-slate-700"}`}>
                      {pairNameMap.get(m.pair2_id) || "Por definir"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Partido #{m.id}{m.is_bye ? " · BYE" : ""}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      {isEliminatoriasView && (
      <section className="card p-5">
        <h2 className="font-bold text-lg">Partidos pendientes y en juego</h2>
        <p className="text-sm text-slate-600">Pendientes: {partidosPendientes.length} · En juego: {partidosEnJuego.length}</p>
        <div className="mt-3 space-y-3">
          {partidosPendientes.map((m) => (
            <div key={m.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-semibold">Partido #{m.id} · {m.stage} · {m.round || "-"}</p>
                  <p className="text-sm">{pairNameMap.get(m.pair1_id) || "Por definir"}</p>
                  <p className="text-sm">{pairNameMap.get(m.pair2_id) || "Por definir"}</p>
                </div>
                {!m.started_at && (
                  <div className="flex items-center gap-2">
                    <select
                      className="input min-w-40"
                      value={startCourtByMatch[m.id] || ""}
                      onChange={(e) => setStartCourtByMatch((s) => ({ ...s, [m.id]: e.target.value }))}
                    >
                      <option value="">Cancha para iniciar</option>
                      {canchasList.map((court) => (
                        <option key={court.id} value={court.id}>{court.identificador}</option>
                      ))}
                    </select>
                    <button className="btn-primary" onClick={() => iniciarPartido(m.id)}>Iniciar</button>
                  </div>
                )}
              </div>

              {m.started_at && !m.finished_at && (
                <div className="mt-3 grid md:grid-cols-4 gap-2">
                  <input className="input" placeholder="Set1 P1" value={resultForms[m.id]?.set1_pair1 ?? ""} onChange={(e) => setResultForms((s) => ({ ...s, [m.id]: { ...(s[m.id] || {}), set1_pair1: e.target.value } }))} />
                  <input className="input" placeholder="Set1 P2" value={resultForms[m.id]?.set1_pair2 ?? ""} onChange={(e) => setResultForms((s) => ({ ...s, [m.id]: { ...(s[m.id] || {}), set1_pair2: e.target.value } }))} />
                  <input className="input" placeholder="Set2 P1" value={resultForms[m.id]?.set2_pair1 ?? ""} onChange={(e) => setResultForms((s) => ({ ...s, [m.id]: { ...(s[m.id] || {}), set2_pair1: e.target.value } }))} />
                  <input className="input" placeholder="Set2 P2" value={resultForms[m.id]?.set2_pair2 ?? ""} onChange={(e) => setResultForms((s) => ({ ...s, [m.id]: { ...(s[m.id] || {}), set2_pair2: e.target.value } }))} />
                  <input className="input" placeholder="STB P1" value={resultForms[m.id]?.supertb_pair1 ?? ""} onChange={(e) => setResultForms((s) => ({ ...s, [m.id]: { ...(s[m.id] || {}), supertb_pair1: e.target.value } }))} />
                  <input className="input" placeholder="STB P2" value={resultForms[m.id]?.supertb_pair2 ?? ""} onChange={(e) => setResultForms((s) => ({ ...s, [m.id]: { ...(s[m.id] || {}), supertb_pair2: e.target.value } }))} />
                  <select
                    className="input"
                    value={resultForms[m.id]?.winner_id || ""}
                    onChange={(e) => setResultForms((s) => ({ ...s, [m.id]: { ...(s[m.id] || {}), winner_id: e.target.value } }))}
                  >
                    <option value="">Ganador</option>
                    {m.pair1_id && <option value={m.pair1_id}>{pairNameMap.get(m.pair1_id) || `Pareja ${m.pair1_id}`}</option>}
                    {m.pair2_id && <option value={m.pair2_id}>{pairNameMap.get(m.pair2_id) || `Pareja ${m.pair2_id}`}</option>}
                  </select>
                  <div className="flex gap-2">
                    <button className="btn-primary" onClick={() => guardarResultado(m)}>Guardar resultado</button>
                    {m.pair1_id && m.pair2_id && (
                      <button className="btn-secondary" onClick={() => marcarWO(m.id, m.pair1_id)}>W.O. P1</button>
                    )}
                    {m.pair1_id && m.pair2_id && (
                      <button className="btn-secondary" onClick={() => marcarWO(m.id, m.pair2_id)}>W.O. P2</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
      )}

      {isCanchasView && (
      <section className="card p-5">
        <h2 className="font-bold text-lg">Vista general de pendientes</h2>
        <div className="grid lg:grid-cols-2 gap-4 mt-3">
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="font-semibold">Sin cancha asignada</p>
            <div className="mt-2 space-y-2">
              {pending.sinCancha.map((m) => (
                <div key={`sc-${m.id}`} className="rounded bg-slate-50 p-2">
                  <p className="text-sm">#{m.id} · {m.stage} · {m.round || "-"}</p>
                  <p className="text-xs">{pairNameMap.get(m.pair1_id) || "Por definir"}</p>
                  <p className="text-xs">{pairNameMap.get(m.pair2_id) || "Por definir"}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <select
                      className="input"
                      value={queueCourtByMatch[m.id] || ""}
                      onChange={(e) => setQueueCourtByMatch((s) => ({ ...s, [m.id]: e.target.value }))}
                    >
                      <option value="">Cancha</option>
                      {canchasList.map((court) => (
                        <option key={court.id} value={court.id}>{court.identificador}</option>
                      ))}
                    </select>
                    <button className="btn-primary" onClick={() => queueMatch(m.id)}>Asignar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-3">
            <p className="font-semibold">Con cancha asignada (cola)</p>
            <div className="mt-2 space-y-2">
              {pending.conCancha.map((m) => (
                <div key={`cc-${m.id}`} className="rounded bg-slate-50 p-2">
                  <p className="text-sm">#{m.id} · Cancha {m.queue_court_id} · Proximo {m.queue_orden}</p>
                  <p className="text-xs">{pairNameMap.get(m.pair1_id) || "Por definir"}</p>
                  <p className="text-xs">{pairNameMap.get(m.pair2_id) || "Por definir"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      )}

      {isCanchasView && (
      <section className="card p-5">
        <h2 className="font-bold text-lg">Dashboard de canchas</h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mt-3">
          {canchas.map((c) => (
            <div key={c.court.id} className="rounded-xl border border-slate-200 p-3">
              <p className="font-semibold">{c.court.identificador}</p>
              <p className="text-sm mt-1">
                Estado: {c.estado === "ocupada" ? "En juego" : c.estado === "cola" ? "Con cola" : "Libre"}
              </p>
              <p className="text-xs text-slate-500 mt-2">Cola: {c.queue.length}</p>
              <div className="mt-2 space-y-1">
                {c.queue.map((row, index) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between text-xs rounded bg-slate-50 p-2"
                    draggable
                    onDragStart={() => setDragQueueMatch({ courtId: c.court.id, matchId: row.match_id })}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onQueueDrop(c.court.id, row.match_id, c.queue)}
                  >
                    <span>#{row.match_id} · {pairNameMap.get(row.pair1_id) || "Por definir"}</span>
                    <div className="flex gap-1">
                      <button className="px-2 py-1 rounded bg-slate-200" onClick={() => moveQueue(c.court.id, c.queue, index, -1)}>↑</button>
                      <button className="px-2 py-1 rounded bg-slate-200" onClick={() => moveQueue(c.court.id, c.queue, index, 1)}>↓</button>
                      <button className="px-2 py-1 rounded bg-red-100" onClick={() => removeFromQueue(c.court.id, row.match_id)}>Quitar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      )}
    </div>
  );
}
