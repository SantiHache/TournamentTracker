const express = require("express");
const { z } = require("zod");
const { db } = require("../db/connection");
const { requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { logAudit } = require("../services/audit");

const router = express.Router();

// Todas las rutas de este router requieren rol superadmin
router.use(requireRole("superadmin"));

// ─── Jugadores ────────────────────────────────────────────────────────────────

router.get("/jugadores", (req, res) => {
  const q = String(req.query.q || "").trim();
  const players = q
    ? db
        .prepare(
          `SELECT * FROM players
           WHERE nombre LIKE ? OR apellido LIKE ? OR dni LIKE ? OR email LIKE ?
           ORDER BY apellido, nombre`
        )
        .all(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`)
    : db.prepare("SELECT * FROM players ORDER BY apellido, nombre").all();
  res.json(players);
});

router.put(
  "/jugadores/:id",
  validate(
    z.object({
      body: z.object({
        nombre: z.string().min(1),
        apellido: z.string().min(1),
        telefono: z.string().min(1),
        dni: z.string().min(1).nullable().optional(),
        email: z.string().email().nullable().optional(),
        categoria: z.string().min(1).nullable().optional(),
        fecha_nacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      }),
      params: z.object({ id: z.coerce.number().int().positive() }),
      query: z.object({}),
    })
  ),
  (req, res) => {
    const { id } = req.validated.params;
    const { nombre, apellido, telefono, dni = null, email = null, categoria = null, fecha_nacimiento = null } = req.validated.body;

    const before = db.prepare("SELECT * FROM players WHERE id = ?").get(id);
    if (!before) return res.status(404).json({ error: "Jugador no encontrado" });

    db.prepare(
      `UPDATE players
       SET nombre = ?, apellido = ?, telefono = ?, dni = ?, email = ?, categoria = ?, fecha_nacimiento = ?
       WHERE id = ?`
    ).run(nombre, apellido, telefono, dni, email, categoria, fecha_nacimiento, id);

    logAudit({
      actorUserId: req.user.id,
      action: "update",
      entity: "players",
      entityId: id,
      before,
      after: { nombre, apellido, telefono, dni, email, categoria, fecha_nacimiento },
    });

    res.json({ ok: true });
  }
);

// ─── Auditoría ────────────────────────────────────────────────────────────────

router.get("/auditoria", (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = 50;
  const offset = (page - 1) * limit;
  const entity = req.query.entity || null;
  const action = req.query.action || null;

  const conditions = [];
  const whereParams = [];
  if (entity) {
    conditions.push("a.entity = ?");
    whereParams.push(entity);
  }
  if (action) {
    conditions.push("a.action = ?");
    whereParams.push(action);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const total = db
    .prepare(`SELECT COUNT(*) as c FROM audit_logs a ${where}`)
    .get(...whereParams).c;

  const rows = db
    .prepare(
      `SELECT a.id, a.created_at, a.action, a.entity, a.entity_id,
              a.before_json, a.after_json,
              u.username, u.nombre as actor_nombre
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.actor_user_id
       ${where}
       ORDER BY a.id DESC
       LIMIT ? OFFSET ?`
    )
    .all(...whereParams, limit, offset);

  res.json({ rows, total, page, pages: Math.ceil(total / limit) });
});

// ─── Torneos ─────────────────────────────────────────────────────────────────

router.post("/torneos/:id/cancelar", (req, res) => {
  const id = Number(req.params.id);
  const t = db.prepare("SELECT * FROM tournaments WHERE id = ?").get(id);
  if (!t) return res.status(404).json({ error: "Torneo no encontrado" });
  if (t.status === "cancelado") {
    return res.status(400).json({ error: "El torneo ya está cancelado" });
  }

  db.prepare("UPDATE tournaments SET status = 'cancelado' WHERE id = ?").run(id);

  logAudit({
    actorUserId: req.user.id,
    action: "cancelar",
    entity: "tournaments",
    entityId: id,
    before: { status: t.status },
    after: { status: "cancelado" },
  });

  res.json({ ok: true });
});

router.post("/torneos/:id/reset", (req, res) => {
  const id = Number(req.params.id);
  const t = db.prepare("SELECT * FROM tournaments WHERE id = ?").get(id);
  if (!t) return res.status(404).json({ error: "Torneo no encontrado" });

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM matches WHERE tournament_id = ?").run(id);
    db.prepare(
      "DELETE FROM group_standings WHERE group_id IN (SELECT id FROM groups WHERE tournament_id = ?)"
    ).run(id);
    db.prepare("DELETE FROM groups WHERE tournament_id = ?").run(id);
    db.prepare(
      "UPDATE pairs SET group_id = NULL, seed_rank = NULL WHERE tournament_id = ?"
    ).run(id);
    db.prepare(
      "UPDATE tournaments SET zonas_generadas = 0, status = 'activo' WHERE id = ?"
    ).run(id);
  });

  tx();

  logAudit({
    actorUserId: req.user.id,
    action: "reset",
    entity: "tournaments",
    entityId: id,
    before: { status: t.status, zonas_generadas: t.zonas_generadas },
    after: { status: "activo", zonas_generadas: 0 },
  });

  res.json({ ok: true });
});

module.exports = router;
