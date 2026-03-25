const express = require("express");
const { db } = require("../db/connection");
const { requireRole } = require("../middleware/auth");
const { logAudit } = require("../services/audit");
const { recalcGroupStandings } = require("../logic/standings");
const { removeQueuedMatch, upsertQueuedMatch } = require("../logic/courts");
const { syncBracketFirstRound } = require("../services/tournamentSetup");

const router = express.Router();

function hasNumber(value) {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}

function validateByFormat(format, payload) {
  const s1ok = hasNumber(payload.set1_pair1) && hasNumber(payload.set1_pair2);
  const s2ok = hasNumber(payload.set2_pair1) && hasNumber(payload.set2_pair2);
  const stbok = hasNumber(payload.supertb_pair1) && hasNumber(payload.supertb_pair2);

  if (format === "one_set") {
    if (!s1ok) return "En formato 1 set, el Set 1 es obligatorio";
    if (payload.set2_pair1 !== null || payload.set2_pair2 !== null) {
      return "En formato 1 set, Set 2 debe estar vacio";
    }
    if (payload.supertb_pair1 !== null || payload.supertb_pair2 !== null) {
      return "En formato 1 set, Super Tie-Break debe estar vacio";
    }
    return null;
  }

  if (format === "best_of_3") {
    if (!s1ok || !s2ok) return "En mejor de 3 sets, Set 1 y Set 2 son obligatorios";
    if (payload.supertb_pair1 !== null || payload.supertb_pair2 !== null) {
      return "En mejor de 3 sets, Super Tie-Break debe estar vacio";
    }
    return null;
  }

  if (format === "best_of_3_super_tb") {
    if (!s1ok || !s2ok) return "En mejor de 3 con Super Tie-Break, Set 1 y Set 2 son obligatorios";
    if ((payload.supertb_pair1 === null) !== (payload.supertb_pair2 === null)) {
      return "Si informas Super Tie-Break, debes completar ambos valores";
    }
    if (payload.supertb_pair1 !== null && !stbok) {
      return "Super Tie-Break invalido";
    }
    return null;
  }

  return null;
}

function pair1WonSet(a, b) {
  if (!hasNumber(a) || !hasNumber(b)) return null;
  const n1 = Number(a);
  const n2 = Number(b);
  if (n1 === n2) return null;
  return n1 > n2;
}

function inferWinnerId(match, format, payload) {
  const s1 = pair1WonSet(payload.set1_pair1, payload.set1_pair2);
  if (s1 === null) return { error: "Set 1 invalido: no puede terminar empatado" };

  if (format === "one_set") {
    return { winnerId: s1 ? match.pair1_id : match.pair2_id };
  }

  const s2 = pair1WonSet(payload.set2_pair1, payload.set2_pair2);
  if (s2 === null) return { error: "Set 2 invalido: no puede terminar empatado" };

  let pair1Sets = 0;
  let pair2Sets = 0;
  if (s1) pair1Sets += 1;
  else pair2Sets += 1;
  if (s2) pair1Sets += 1;
  else pair2Sets += 1;

  if (pair1Sets !== pair2Sets) {
    return { winnerId: pair1Sets > pair2Sets ? match.pair1_id : match.pair2_id };
  }

  if (format === "best_of_3_super_tb") {
    const stb = pair1WonSet(payload.supertb_pair1, payload.supertb_pair2);
    if (stb === null) {
      return { error: "Con sets empatados, debes informar un Super Tie-Break valido" };
    }
    return { winnerId: stb ? match.pair1_id : match.pair2_id };
  }

  return { error: "No se puede determinar ganador con sets empatados" };
}

function setZoneRound2Participants(groupId) {
  const r1 = db
    .prepare(
      `SELECT * FROM matches
       WHERE group_id = ? AND round = 'r1'
       ORDER BY id ASC`
    )
    .all(groupId);

  if (r1.length !== 2 || !r1[0].winner_id || !r1[1].winner_id) return;

  const r2w = db
    .prepare("SELECT * FROM matches WHERE group_id = ? AND round = 'r2w' LIMIT 1")
    .get(groupId);
  const r2l = db
    .prepare("SELECT * FROM matches WHERE group_id = ? AND round = 'r2l' LIMIT 1")
    .get(groupId);

  if (!r2w || !r2l) return;

  const loser1 = r1[0].pair1_id === r1[0].winner_id ? r1[0].pair2_id : r1[0].pair1_id;
  const loser2 = r1[1].pair1_id === r1[1].winner_id ? r1[1].pair2_id : r1[1].pair1_id;

  db.prepare("UPDATE matches SET pair1_id = ?, pair2_id = ? WHERE id = ?").run(
    r1[0].winner_id,
    r1[1].winner_id,
    r2w.id
  );
  db.prepare("UPDATE matches SET pair1_id = ?, pair2_id = ? WHERE id = ?").run(
    loser1,
    loser2,
    r2l.id
  );
}

function setNextMatchParticipant(matchId, winnerId) {
  const next = db
    .prepare(
      `SELECT * FROM matches
       WHERE slot1_source_match_id = ? OR slot2_source_match_id = ?
       LIMIT 1`
    )
    .get(matchId, matchId);

  if (!next) return;

  if (next.slot1_source_match_id === matchId) {
    db.prepare("UPDATE matches SET pair1_id = ? WHERE id = ?").run(winnerId, next.id);
  }
  if (next.slot2_source_match_id === matchId) {
    db.prepare("UPDATE matches SET pair2_id = ? WHERE id = ?").run(winnerId, next.id);
  }
}

router.put("/:id/iniciar", (req, res) => {
  const id = Number(req.params.id);
  const { court_id } = req.body;

  const match = db.prepare("SELECT * FROM matches WHERE id = ?").get(id);
  if (!match) return res.status(404).json({ error: "Partido no encontrado" });
  if (match.started_at && !match.finished_at) return res.status(400).json({ error: "Partido ya iniciado" });
  if (!match.pair1_id || !match.pair2_id) {
    return res.status(400).json({ error: "No se puede iniciar un partido con parejas por definir" });
  }

  const queuedCourt = db
    .prepare("SELECT court_id FROM court_queue WHERE match_id = ? LIMIT 1")
    .get(id);
  const effectiveCourtId = Number(court_id || queuedCourt?.court_id || 0);
  if (!effectiveCourtId) {
    return res.status(400).json({ error: "Debes asignar una cancha antes de iniciar" });
  }

  const courtInUse = db
    .prepare(
      "SELECT id FROM matches WHERE court_id = ? AND started_at IS NOT NULL AND finished_at IS NULL LIMIT 1"
    )
    .get(effectiveCourtId);
  if (courtInUse) return res.status(400).json({ error: "Cancha ocupada" });

  db.prepare(
    "UPDATE matches SET court_id = ?, started_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(effectiveCourtId, id);

  removeQueuedMatch(id);
  res.json({ ok: true });
});

router.put("/:id/cancha", (req, res) => {
  const id = Number(req.params.id);
  const courtId = Number(req.body?.court_id || 0);

  const match = db.prepare("SELECT * FROM matches WHERE id = ?").get(id);
  if (!match) return res.status(404).json({ error: "Partido no encontrado" });
  if (match.started_at && !match.finished_at) {
    return res.status(400).json({ error: "No se puede reasignar un partido en juego" });
  }
  if (match.finished_at) {
    return res.status(400).json({ error: "No se puede reasignar un partido finalizado" });
  }

  try {
    if (!courtId) {
      removeQueuedMatch(id);
      db.prepare("UPDATE matches SET court_id = NULL WHERE id = ? AND started_at IS NULL").run(id);
      return res.json({ ok: true, queue_court_id: null });
    }

    if (!match.pair1_id || !match.pair2_id) {
      return res.status(400).json({ error: "No se puede asignar cancha con parejas por definir" });
    }

    upsertQueuedMatch(courtId, id);
    db.prepare("UPDATE matches SET court_id = NULL WHERE id = ? AND started_at IS NULL").run(id);
    return res.json({ ok: true, queue_court_id: courtId });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.put("/:id/resultado", (req, res) => {
  const id = Number(req.params.id);
  const {
    set1_pair1,
    set1_pair2,
    set2_pair1 = null,
    set2_pair2 = null,
    supertb_pair1 = null,
      supertb_pair2 = null,
  } = req.body;

  const match = db.prepare("SELECT * FROM matches WHERE id = ?").get(id);
  if (!match) return res.status(404).json({ error: "Partido no encontrado" });
  if (match.finished_at) return res.status(400).json({ error: "El partido ya tiene resultado cargado" });
  if (!match.started_at) return res.status(400).json({ error: "Debes iniciar el partido antes de cargar el resultado" });
  if (!match.pair1_id || !match.pair2_id) {
    return res.status(400).json({ error: "No se puede cargar resultado con parejas por definir" });
  }
  const tournament = db
    .prepare("SELECT tipo_torneo, match_format FROM tournaments WHERE id = ?")
    .get(match.tournament_id);
  const formatError = validateByFormat(tournament?.match_format, {
    set1_pair1,
    set1_pair2,
    set2_pair1,
    set2_pair2,
    supertb_pair1,
    supertb_pair2,
  });
  if (formatError) return res.status(400).json({ error: formatError });

  const inferred = inferWinnerId(match, tournament?.match_format, {
    set1_pair1,
    set1_pair2,
    set2_pair1,
    set2_pair2,
    supertb_pair1,
    supertb_pair2,
  });
  if (inferred.error) return res.status(400).json({ error: inferred.error });
  const winner_id = inferred.winnerId;

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE matches SET
        set1_pair1 = ?, set1_pair2 = ?,
        set2_pair1 = ?, set2_pair2 = ?,
        supertb_pair1 = ?, supertb_pair2 = ?,
        winner_id = ?, finished_at = CURRENT_TIMESTAMP, played_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      set1_pair1,
      set1_pair2,
      set2_pair1,
      set2_pair2,
      supertb_pair1,
      supertb_pair2,
      winner_id,
      id
    );

    if (match.group_id) {
      if (tournament?.tipo_torneo === "americano" || tournament?.match_format === "one_set") {
        // En Americano las posiciones de zona deben reflejar siempre los resultados cargados.
        db.prepare("UPDATE group_standings SET position_override = 0 WHERE group_id = ?").run(match.group_id);
      }
      recalcGroupStandings(match.group_id);
      if (match.round === "r1") {
        setZoneRound2Participants(match.group_id);
      }
      syncBracketFirstRound(match.tournament_id);
    }

    if (match.stage === "eliminatoria") {
      setNextMatchParticipant(id, winner_id);
    }

    if (match.court_id) {
      const rows = db
        .prepare("SELECT id FROM court_queue WHERE court_id = ? ORDER BY orden ASC")
        .all(match.court_id);
      rows.forEach((row, index) => {
        db.prepare("UPDATE court_queue SET orden = ? WHERE id = ?").run(index + 1, row.id);
      });
    }
  });

  tx();
  res.json({ ok: true });
});

router.put("/:id/wo", (req, res) => {
  const id = Number(req.params.id);
  const { winner_id } = req.body;
  const match = db.prepare("SELECT * FROM matches WHERE id = ?").get(id);
  if (!match) return res.status(404).json({ error: "Partido no encontrado" });
  if (!match.pair1_id || !match.pair2_id) {
    return res.status(400).json({ error: "No se puede marcar W.O. con parejas por definir" });
  }
  if (![match.pair1_id, match.pair2_id].includes(Number(winner_id))) {
    return res.status(400).json({ error: "Ganador invalido para el partido" });
  }

  db.prepare(
    `UPDATE matches SET
      set1_pair1 = ?, set1_pair2 = ?,
      winner_id = ?, is_wo = 1,
      finished_at = CURRENT_TIMESTAMP, played_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(
    match.pair1_id === winner_id ? 6 : 0,
    match.pair2_id === winner_id ? 6 : 0,
    winner_id,
    id
  );

  if (match.group_id) {
    recalcGroupStandings(match.group_id);
    if (match.round === "r1") {
      setZoneRound2Participants(match.group_id);
    }
    syncBracketFirstRound(match.tournament_id);
  }

  if (match.stage === "eliminatoria") {
    setNextMatchParticipant(id, winner_id);
  }

  res.json({ ok: true });
});

// ── SuperAdmin: limpiar resultado y parejas dependientes ────────────
function clearMatchResult(matchId) {
  db.prepare(
    `UPDATE matches SET
      set1_pair1 = NULL, set1_pair2 = NULL,
      set2_pair1 = NULL, set2_pair2 = NULL,
      supertb_pair1 = NULL, supertb_pair2 = NULL,
      winner_id = NULL, is_wo = 0,
      started_at = NULL, finished_at = NULL, played_at = NULL
     WHERE id = ?`
  ).run(matchId);
}

function clearDependentMatches(matchId) {
  const deps = db
    .prepare("SELECT * FROM matches WHERE slot1_source_match_id = ? OR slot2_source_match_id = ?")
    .all(matchId, matchId);
  for (const dep of deps) {
    if (dep.slot1_source_match_id === matchId) {
      db.prepare("UPDATE matches SET pair1_id = NULL WHERE id = ?").run(dep.id);
    }
    if (dep.slot2_source_match_id === matchId) {
      db.prepare("UPDATE matches SET pair2_id = NULL WHERE id = ?").run(dep.id);
    }
    clearMatchResult(dep.id);
    clearDependentMatches(dep.id);
  }
}

// SuperAdmin: sobrescribir resultado aunque ya esté finalizado
router.put("/:id/resultado-forzado", requireRole("superadmin"), (req, res) => {
  const id = Number(req.params.id);
  const {
    set1_pair1,
    set1_pair2,
    set2_pair1 = null,
    set2_pair2 = null,
    supertb_pair1 = null,
    supertb_pair2 = null,
  } = req.body;

  const match = db.prepare("SELECT * FROM matches WHERE id = ?").get(id);
  if (!match) return res.status(404).json({ error: "Partido no encontrado" });
  if (!match.pair1_id || !match.pair2_id) {
    return res.status(400).json({ error: "El partido no tiene parejas definidas" });
  }

  const tournament = db
    .prepare("SELECT tipo_torneo, match_format FROM tournaments WHERE id = ?")
    .get(match.tournament_id);

  const formatError = validateByFormat(tournament?.match_format, {
    set1_pair1, set1_pair2, set2_pair1, set2_pair2, supertb_pair1, supertb_pair2,
  });
  if (formatError) return res.status(400).json({ error: formatError });

  const inferred = inferWinnerId(match, tournament?.match_format, {
    set1_pair1, set1_pair2, set2_pair1, set2_pair2, supertb_pair1, supertb_pair2,
  });
  if (inferred.error) return res.status(400).json({ error: inferred.error });
  const winner_id = inferred.winnerId;

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE matches SET
        set1_pair1 = ?, set1_pair2 = ?,
        set2_pair1 = ?, set2_pair2 = ?,
        supertb_pair1 = ?, supertb_pair2 = ?,
        winner_id = ?, is_wo = 0,
        started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
        finished_at = CURRENT_TIMESTAMP, played_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      set1_pair1, set1_pair2, set2_pair1, set2_pair2,
      supertb_pair1, supertb_pair2, winner_id, id
    );

    if (match.group_id) {
      if (tournament?.tipo_torneo === "americano" || tournament?.match_format === "one_set") {
        db.prepare("UPDATE group_standings SET position_override = 0 WHERE group_id = ?").run(match.group_id);
      }
      recalcGroupStandings(match.group_id);
      if (match.round === "r1") {
        setZoneRound2Participants(match.group_id);
      }
      syncBracketFirstRound(match.tournament_id);
    }

    if (match.stage === "eliminatoria") {
      setNextMatchParticipant(id, winner_id);
    }
  });

  tx();

  logAudit({
    actorUserId: req.user.id,
    action: "force_result",
    entity: "matches",
    entityId: id,
    before: { winner_id: match.winner_id, set1_pair1: match.set1_pair1, set1_pair2: match.set1_pair2 },
    after: { winner_id, set1_pair1, set1_pair2 },
  });

  res.json({ ok: true });
});

// SuperAdmin: cambiar las parejas de un partido y limpiar dependientes
router.put("/:id/parejas", requireRole("superadmin"), (req, res) => {
  const id = Number(req.params.id);
  const { pair1_id, pair2_id } = req.body;

  const match = db.prepare("SELECT * FROM matches WHERE id = ?").get(id);
  if (!match) return res.status(404).json({ error: "Partido no encontrado" });

  if (pair1_id) {
    const p1 = db.prepare("SELECT id FROM pairs WHERE id = ? AND tournament_id = ?").get(pair1_id, match.tournament_id);
    if (!p1) return res.status(400).json({ error: "Pareja 1 no encontrada en este torneo" });
  }
  if (pair2_id) {
    const p2 = db.prepare("SELECT id FROM pairs WHERE id = ? AND tournament_id = ?").get(pair2_id, match.tournament_id);
    if (!p2) return res.status(400).json({ error: "Pareja 2 no encontrada en este torneo" });
  }
  if (pair1_id && pair2_id && Number(pair1_id) === Number(pair2_id)) {
    return res.status(400).json({ error: "Las parejas no pueden ser la misma" });
  }

  const tx = db.transaction(() => {
    db.prepare("UPDATE matches SET pair1_id = ?, pair2_id = ? WHERE id = ?").run(
      pair1_id || null,
      pair2_id || null,
      id
    );
    clearMatchResult(id);
    clearDependentMatches(id);
  });
  tx();

  logAudit({
    actorUserId: req.user.id,
    action: "update_pairs",
    entity: "matches",
    entityId: id,
    before: { pair1_id: match.pair1_id, pair2_id: match.pair2_id },
    after: { pair1_id: pair1_id || null, pair2_id: pair2_id || null },
  });

  res.json({ ok: true });
});

module.exports = router;
