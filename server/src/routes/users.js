const express = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const { db } = require("../db/connection");
const { requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { logAudit } = require("../services/audit");

const router = express.Router();

router.get("/", requireRole("admin", "superadmin"), (req, res) => {
  const users = db
    .prepare("SELECT id, username, role, nombre, activo, created_at FROM users ORDER BY id DESC")
    .all();
  res.json(users);
});

router.post(
  "/",
  requireRole("admin", "superadmin"),
  validate(
    z.object({
      body: z.object({
        username: z.string().min(3),
        password: z.string().min(6),
        role: z.enum(["admin", "asistente", "superadmin", "Player"]),
        nombre: z.string().min(1),
        activo: z.boolean().default(true),
      }),
      params: z.object({}),
      query: z.object({}),
    })
  ),
  (req, res) => {
    const { username, password, role, nombre, activo } = req.validated.body;

    if (req.user.role !== "superadmin" && role === "superadmin") {
      return res.status(403).json({ error: "Sin permisos para crear usuario superadmin" });
    }

    const hash = bcrypt.hashSync(password, 10);
    const result = db
      .prepare(
        "INSERT INTO users (username, password_hash, role, nombre, activo) VALUES (?, ?, ?, ?, ?)"
      )
      .run(username, hash, role, nombre, activo ? 1 : 0);

    logAudit({
      actorUserId: req.user.id,
      action: "create",
      entity: "users",
      entityId: result.lastInsertRowid,
      after: { username, role, nombre, activo },
    });

    res.status(201).json({ id: result.lastInsertRowid });
  }
);

router.put(
  "/:id",
  requireRole("admin", "superadmin"),
  validate(
    z.object({
      body: z.object({
        nombre: z.string().min(1),
        role: z.enum(["admin", "asistente", "superadmin", "Player"]),
        activo: z.boolean(),
        password: z.string().min(6).optional(),
      }),
      params: z.object({ id: z.coerce.number().int().positive() }),
      query: z.object({}),
    })
  ),
  (req, res) => {
    const { id } = req.validated.params;
    const { nombre, role, activo, password } = req.validated.body;
    const before = db.prepare("SELECT id, nombre, role, activo FROM users WHERE id = ?").get(id);
    if (!before) return res.status(404).json({ error: "Usuario no encontrado" });

    if (req.user.role !== "superadmin" && before.role === "superadmin") {
      return res.status(403).json({ error: "Sin permisos para editar usuario superadmin" });
    }
    if (req.user.role !== "superadmin" && role === "superadmin") {
      return res.status(403).json({ error: "Sin permisos para asignar rol superadmin" });
    }

    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      db.prepare(
        "UPDATE users SET nombre = ?, role = ?, activo = ?, password_hash = ?, session_version = session_version + 1 WHERE id = ?"
      ).run(nombre, role, activo ? 1 : 0, hash, id);
    } else {
      db.prepare("UPDATE users SET nombre = ?, role = ?, activo = ? WHERE id = ?").run(
        nombre,
        role,
        activo ? 1 : 0,
        id
      );
    }

    logAudit({
      actorUserId: req.user.id,
      action: "update",
      entity: "users",
      entityId: id,
      before,
      after: { nombre, role, activo },
    });

    res.json({ ok: true });
  }
);

router.delete("/:id", requireRole("admin", "superadmin"), (req, res) => {
  const id = Number(req.params.id);
  const before = db.prepare("SELECT id, username, role FROM users WHERE id = ?").get(id);
  if (!before) return res.status(404).json({ error: "Usuario no encontrado" });

  if (req.user.role !== "superadmin" && before.role === "superadmin") {
    return res.status(403).json({ error: "Sin permisos para eliminar usuario superadmin" });
  }
  if (before.id === req.user.id) {
    return res.status(400).json({ error: "No puedes eliminar tu propia cuenta" });
  }

  db.prepare("DELETE FROM users WHERE id = ?").run(id);

  logAudit({
    actorUserId: req.user.id,
    action: "delete",
    entity: "users",
    entityId: id,
    before,
  });

  res.json({ ok: true });
});

module.exports = router;
