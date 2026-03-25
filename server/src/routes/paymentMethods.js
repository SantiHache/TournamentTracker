const express = require("express");
const { z } = require("zod");
const { db } = require("../db/connection");
const { requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { logAudit } = require("../services/audit");

const router = express.Router();

router.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM payment_methods ORDER BY id DESC").all();
  res.json(rows);
});

router.post(
  "/",
  requireRole("admin"),
  validate(
    z.object({
      body: z.object({
        nombre: z.string().min(1),
        descripcion: z.string().optional(),
        activo: z.boolean().default(true),
      }),
      params: z.object({}),
      query: z.object({}),
    })
  ),
  (req, res) => {
    const { nombre, descripcion, activo } = req.validated.body;
    const result = db
      .prepare("INSERT INTO payment_methods (nombre, descripcion, activo) VALUES (?, ?, ?)")
      .run(nombre, descripcion || null, activo ? 1 : 0);

    logAudit({
      actorUserId: req.user.id,
      action: "create",
      entity: "payment_methods",
      entityId: result.lastInsertRowid,
      after: { nombre, descripcion, activo },
    });

    res.status(201).json({ id: result.lastInsertRowid });
  }
);

router.put(
  "/:id",
  requireRole("admin"),
  validate(
    z.object({
      body: z.object({
        nombre: z.string().min(1),
        descripcion: z.string().nullable().optional(),
        activo: z.boolean(),
      }),
      params: z.object({ id: z.coerce.number().positive() }),
      query: z.object({}),
    })
  ),
  (req, res) => {
    const id = req.validated.params.id;
    const { nombre, descripcion, activo } = req.validated.body;
    const before = db.prepare("SELECT * FROM payment_methods WHERE id = ?").get(id);
    if (!before) return res.status(404).json({ error: "Medio no encontrado" });

    db.prepare("UPDATE payment_methods SET nombre = ?, descripcion = ?, activo = ? WHERE id = ?").run(
      nombre,
      descripcion || null,
      activo ? 1 : 0,
      id
    );

    logAudit({
      actorUserId: req.user.id,
      action: "update",
      entity: "payment_methods",
      entityId: id,
      before,
      after: { nombre, descripcion, activo },
    });

    res.json({ ok: true });
  }
);

router.delete("/:id", requireRole("admin"), (req, res) => {
  const id = Number(req.params.id);
  const before = db.prepare("SELECT * FROM payment_methods WHERE id = ?").get(id);
  if (!before) return res.status(404).json({ error: "Medio no encontrado" });

  db.prepare("DELETE FROM payment_methods WHERE id = ?").run(id);
  logAudit({
    actorUserId: req.user.id,
    action: "delete",
    entity: "payment_methods",
    entityId: id,
    before,
  });
  res.json({ ok: true });
});

module.exports = router;
