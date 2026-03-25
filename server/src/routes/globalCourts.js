const express = require("express");
const { z } = require("zod");
const { db } = require("../db/connection");
const { requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { logAudit } = require("../services/audit");

const router = express.Router();

const courtSchema = z.object({
  body: z.object({
    nombre: z.string().min(1),
    descripcion: z.string().optional(),
    activo: z.boolean().default(true),
  }),
  params: z.object({}),
  query: z.object({}),
});

const updateSchema = z.object({
  body: z.object({
    nombre: z.string().min(1),
    descripcion: z.string().nullable().optional(),
    activo: z.boolean(),
  }),
  params: z.object({ id: z.coerce.number().positive() }),
  query: z.object({}),
});

router.get("/", (req, res) => {
  const activeOnly = String(req.query.activeOnly || "") === "1";
  const rows = db.prepare("SELECT * FROM global_courts ORDER BY id ASC").all();
  const data = activeOnly ? rows.filter((row) => Number(row.activo) === 1) : rows;
  res.json(data);
});

router.post("/", requireRole("admin"), validate(courtSchema), (req, res) => {
  const { nombre, descripcion, activo } = req.validated.body;
  const result = db
    .prepare("INSERT INTO global_courts (nombre, descripcion, activo) VALUES (?, ?, ?)")
    .run(nombre.trim(), (descripcion || "").trim() || null, activo ? 1 : 0);

  logAudit({
    actorUserId: req.user.id,
    action: "create",
    entity: "global_courts",
    entityId: result.lastInsertRowid,
    after: { nombre, descripcion, activo },
  });

  res.status(201).json({ id: result.lastInsertRowid });
});

router.put("/:id", requireRole("admin"), validate(updateSchema), (req, res) => {
  const id = req.validated.params.id;
  const { nombre, descripcion, activo } = req.validated.body;
  const before = db.prepare("SELECT * FROM global_courts WHERE id = ?").get(id);
  if (!before) return res.status(404).json({ error: "Cancha global no encontrada" });

  db.prepare("UPDATE global_courts SET nombre = ?, descripcion = ?, activo = ? WHERE id = ?").run(
    nombre.trim(),
    (descripcion || "").trim() || null,
    activo ? 1 : 0,
    id
  );

  logAudit({
    actorUserId: req.user.id,
    action: "update",
    entity: "global_courts",
    entityId: id,
    before,
    after: { nombre, descripcion, activo },
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