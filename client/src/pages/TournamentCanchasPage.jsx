import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import { useTournamentStore } from "../store/tournamentStore";

export default function TournamentCanchasPage() {
  const { id } = useParams();
  const tournamentVersion = useTournamentStore((s) => s.tournamentVersion);
  const [torneo, setTorneo] = useState(null);
  const [parejas, setParejas] = useState([]);
  const [canchas, setCanchas] = useState([]);
  const [canchasList, setCanchasList] = useState([]);
  const [pending, setPending] = useState({ sinCancha: [], conCancha: [] });
  const [queueCourtByMatch, setQueueCourtByMatch] = useState({});
  const [dragQueueMatch, setDragQueueMatch] = useState(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const load = async () => {
    const [t, p, ce, cl, pp] = await Promise.all([
      api.get(`/torneos/${id}`),
      api.get(`/torneos/${id}/parejas`),
      api.get(`/torneos/${id}/canchas/estado`),
      api.get(`/torneos/${id}/canchas`),
      api.get(`/torneos/${id}/partidos/pendientes`),
    ]);
    setTorneo(t.data);
    setParejas(p.data || []);
    setCanchas(ce.data || []);
    setCanchasList(cl.data || []);
    setPending(pp.data || { sinCancha: [], conCancha: [] });
  };

  useEffect(() => {
    load().catch(() => setError("No se pudo cargar canchas"));
    const timer = setInterval(() => {
      api.get(`/torneos/${id}/canchas/estado`).then((r) => setCanchas(r.data || [])).catch(() => {});
    }, 30000);
    return () => clearInterval(timer);
  }, [id, tournamentVersion]);

  const pairNameMap = useMemo(() => {
    const map = new Map();
    parejas.forEach((p) => {
      map.set(p.id, `${p.player1_nombre} ${p.player1_apellido} / ${p.player2_nombre} ${p.player2_apellido}`);
    });
    return map;
  }, [parejas]);

  const reorderListByIds = (list, dragId, targetId) => {
    const from = list.findIndex((x) => x === dragId);
    const to = list.findIndex((x) => x === targetId);
    if (from < 0 || to < 0 || from === to) return list;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  };

  const queueMatch = async (matchId) => {
    const courtId = Number(queueCourtByMatch[matchId]);
    if (!courtId) return;
    setError("");
    try {
      await api.post(`/torneos/canchas/${courtId}/cola`, { match_id: matchId });
      setInfo("Partido asignado a cola de cancha");
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo asignar a la cola");
    }
  };

  const removeFromQueue = async (courtId, matchId) => {
    try {
      await api.delete(`/torneos/canchas/${courtId}/cola/${matchId}`);
      setInfo("Partido quitado de la cola");
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

  if (!torneo) return <p>Cargando...</p>;

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <h1 className="text-2xl font-bold">Canchas y operacion</h1>
        <p className="text-slate-600 mt-1">Asignacion, cola y estado actual de juego.</p>
      </section>

      {(error || info) && (
        <section className="card p-4">
          {error && <p className="text-red-600">{error}</p>}
          {info && <p className="text-emerald-700">{info}</p>}
        </section>
      )}

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
                    <select className="input" value={queueCourtByMatch[m.id] || ""} onChange={(e) => setQueueCourtByMatch((s) => ({ ...s, [m.id]: e.target.value }))}>
                      <option value="">Cancha</option>
                      {canchasList.map((court) => (
                        <option key={court.id} value={court.id}>{court.identificador}</option>
                      ))}
                    </select>
                    <button className="btn-primary" onClick={() => queueMatch(m.id)}>Asignar</button>
                  </div>
                </div>
              ))}
              {!pending.sinCancha.length && <p className="text-xs text-slate-500">No hay partidos pendientes sin cancha.</p>}
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
              {!pending.conCancha.length && <p className="text-xs text-slate-500">No hay partidos en cola.</p>}
            </div>
          </div>
        </div>
      </section>

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
    </div>
  );
}
