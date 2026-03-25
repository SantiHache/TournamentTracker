const { db } = require("../db/connection");

function ensureMatchNotPlaying(matchId) {
  const match = db.prepare("SELECT started_at, finished_at FROM matches WHERE id = ?").get(matchId);
  if (!match) throw new Error("Partido no encontrado");
  if (match.finished_at) {
    throw new Error("No se puede reasignar un partido finalizado");
  }
  if (match.started_at && !match.finished_at) {
    throw new Error("No se puede reasignar un partido en juego");
  }
}

function normalizeQueue(courtId) {
  const rows = db
    .prepare("SELECT id FROM court_queue WHERE court_id = ? ORDER BY orden ASC, id ASC")
    .all(courtId);

  rows.forEach((row, index) => {
    db.prepare("UPDATE court_queue SET orden = ? WHERE id = ?").run(index + 1, row.id);
  });
}

function queueMatch(courtId, matchId) {
  ensureMatchNotPlaying(matchId);

  const existing = db.prepare("SELECT id FROM court_queue WHERE match_id = ?").get(matchId);
  if (existing) throw new Error("El partido ya esta asignado a una cancha");

  const maxOrder = db
    .prepare("SELECT COALESCE(MAX(orden), 0) as max_orden FROM court_queue WHERE court_id = ?")
    .get(courtId).max_orden;

  db.prepare("INSERT INTO court_queue (court_id, match_id, orden) VALUES (?, ?, ?)").run(
    courtId,
    matchId,
    maxOrder + 1
  );
}

function upsertQueuedMatch(courtId, matchId) {
  ensureMatchNotPlaying(matchId);

  const existing = db.prepare("SELECT court_id FROM court_queue WHERE match_id = ?").get(matchId);
  if (existing?.court_id === courtId) return;

  const tx = db.transaction(() => {
    if (existing) {
      db.prepare("DELETE FROM court_queue WHERE match_id = ?").run(matchId);
      normalizeQueue(existing.court_id);
    }
    queueMatch(courtId, matchId);
  });

  tx();
}

function removeFromQueue(courtId, matchId) {
  db.prepare("DELETE FROM court_queue WHERE court_id = ? AND match_id = ?").run(courtId, matchId);
  normalizeQueue(courtId);
}

function removeQueuedMatch(matchId) {
  const existing = db.prepare("SELECT court_id FROM court_queue WHERE match_id = ?").get(matchId);
  if (!existing) return;

  db.prepare("DELETE FROM court_queue WHERE match_id = ?").run(matchId);
  normalizeQueue(existing.court_id);
}

function reorderQueue(courtId, matchIds) {
  const tx = db.transaction(() => {
    matchIds.forEach((matchId, idx) => {
      db.prepare("UPDATE court_queue SET orden = ? WHERE court_id = ? AND match_id = ?").run(
        idx + 1,
        courtId,
        matchId
      );
    });
  });
  tx();
}

function promoteNext(courtId) {
  const next = db
    .prepare(
      `SELECT cq.match_id
       FROM court_queue cq
       WHERE cq.court_id = ?
       ORDER BY cq.orden ASC
       LIMIT 1`
    )
    .get(courtId);

  if (!next) return null;

  return next.match_id;
}

module.exports = {
  queueMatch,
  upsertQueuedMatch,
  removeFromQueue,
  removeQueuedMatch,
  reorderQueue,
  promoteNext,
};
