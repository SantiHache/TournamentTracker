const express = require("express");
const { db } = require("../db/connection");
const { requireRole } = require("../middleware/auth");
const { config } = require("../config");

const router = express.Router();

// Todas las rutas aquí requieren auth + circuit mode + admin/asistente/superadmin roles

router.use(requireRole("admin", "asistente", "superadmin"));

router.use((req, res, next) => {
  if (!config.isCircuitMode) {
    return res.status(403).json({ error: "Disponible solo en modo circuito" });
  }
  next();
});

// GET /api/jugadores?q=texto&categoria=C3,D4
router.get("/", (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const categoriaFilters = String(req.query.categoria || "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    let sql = `
      SELECT 
        p.id, 
        p.nombre, 
        p.apellido, 
        p.telefono, 
        p.dni, 
        p.email, 
        c.type as categoria_type,
        c.ordinal as categoria_ordinal,
        c.code as categoria_code,
        c.id as category_id,
        p.fecha_nacimiento, 
        p.ranking_points
      FROM players p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.user_id IS NOT NULL
    `;
    const params = [];

    if (q) {
      sql += ` AND (p.nombre LIKE ? OR p.apellido LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`);
    }

    if (categoriaFilters.length) {
      sql += ` AND c.code IN (${categoriaFilters.map(() => "?").join(",")})`;
      params.push(...categoriaFilters);
    }

    sql += " ORDER BY p.apellido, p.nombre";

    const players = db.prepare(sql).all(...params);
    res.json(players);
  } catch (err) {
    console.error("[/api/jugadores] Error:", err.message);
    res.status(500).json({ error: "Error al cargar jugadores: " + err.message });
  }
});

module.exports = router;
