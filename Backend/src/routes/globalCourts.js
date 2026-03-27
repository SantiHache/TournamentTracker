const express = require("express");
const { z } = require("zod");
const { db } = require("../db/connection");
const { config } = require("../config");
const { requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { logAudit } = require("../services/audit");

const router = express.Router();

const courtSchema = z.object({
  body: z.object({
    nombre: z.string().min(1),
    descripcion: z.string().optional(),
    club_id: z.coerce.number().positive().optional(),
    activo: z.boolean().default(true),
  }),
  params: z.object({}),
  query: z.object({}),
});

const updateSchema = z.object({
  body: z.object({
    nombre: z.string().min(1),
    descripcion: z.string().nullable().optional(),
    club_id: z.coerce.number().positive().nullable().optional(),
    activo: z.boolean(),
  }),
  params: z.object({ id: z.coerce.number().positive() }),
  query: z.object({}),
});

function resolveClubId(rawClubId) {
  const parsed = Number(rawClubId);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    if (config.isCircuitMode) {
      return { error: "En modo circuito, el club es obligatorio para cada cancha global" };
    }
    return { value: null };
  }

  const club = db.prepare("SELECT id FROM global_clubs WHERE id = ? AND activo = 1").get(parsed);
  if (!club) {
    return { error: "El club seleccionado no existe o esta inactivo" };
  }

  return { value: config.isCircuitMode ? parsed : null };
}

router.get("/", (req, res) => {
  const activeOnly = String(req.query.activeOnly || "") === "1";
  const rows = db
    .prepare(
      `SELECT gc.id, gc.nombre, gc.descripcion, gc.activo, gc.club_id, gcl.nombre AS club_nombre
       FROM global_courts gc
       LEFT JOIN global_clubs gcl ON gcl.id = gc.club_id
       ORDER BY gc.id ASC`
    )
    .all();
  const data = activeOnly ? rows.filter((row) => Number(row.activo) === 1) : rows;
  res.json(data);
});

router.post("/", requireRole("admin"), validate(courtSchema), (req, res) => {
  const { nombre, descripcion, club_id: clubIdInput, activo } = req.validated.body;
  const clubResolution = resolveClubId(clubIdInput);
  if (clubResolution?.error) {
    return res.status(400).json({ error: clubResolution.error });
  }
  let result;
  try {
    result = db
      .prepare("INSERT INTO global_courts (nombre, descripcion, club_id, activo) VALUES (?, ?, ?, ?)")
      .run(nombre.trim(), (descripcion || "").trim() || null, clubResolution?.value || null, activo ? 1 : 0);
  } catch (error) {
    if (error?.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(400).json({ error: "Ya existe una cancha con ese nombre en el club seleccionado" });
    }
    throw error;
  }

  logAudit({
    actorUserId: req.user.id,
    action: "create",
    entity: "global_courts",
    entityId: result.lastInsertRowid,
    after: { nombre, descripcion, club_id: clubResolution?.value || null, activo },
  });

  res.status(201).json({ id: result.lastInsertRowid });
});

router.put("/:id", requireRole("admin"), validate(updateSchema), (req, res) => {
  const id = req.validated.params.id;
  const { nombre, descripcion, club_id: clubIdInput, activo } = req.validated.body;
  const clubResolution = resolveClubId(clubIdInput);
  if (clubResolution?.error) {
    return res.status(400).json({ error: clubResolution.error });
  }
  const before = db.prepare("SELECT * FROM global_courts WHERE id = ?").get(id);
  if (!before) return res.status(404).json({ error: "Cancha global no encontrada" });

  try {
    db.prepare("UPDATE global_courts SET nombre = ?, descripcion = ?, club_id = ?, activo = ? WHERE id = ?").run(
      nombre.trim(),
      (descripcion || "").trim() || null,
      clubResolution?.value || null,
      activo ? 1 : 0,
      id
    );
  } catch (error) {
    if (error?.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(400).json({ error: "Ya existe una cancha con ese nombre en el club seleccionado" });
    }
    throw error;
  }

  logAudit({
    actorUserId: req.user.id,
    action: "update",
    entity: "global_courts",
    entityId: id,
    before,
    after: { nombre, descripcion, club_id: clubResolution?.value || null, activo },
  });

  res.json({ ok: true });
});

router.delete("/:id", requireRole("admin"), (req, res) => {
  const id = Number(req.params.id);
  const before = db.prepare("SELECT * FROM global_courts WHERE id = ?").get(id);
  if (!before) return res.status(404).json({ error: "Cancha global no encontrada" });

  db.prepare("DELETE FROM global_courts WHERE id = ?").run(id);
  logAudit({
    actorUserId: req.user.id,
    action: "delete",
    entity: "global_courts",
    entityId: id,
    before,
  });
  res.json({ ok: true });
});

module.exports = router;