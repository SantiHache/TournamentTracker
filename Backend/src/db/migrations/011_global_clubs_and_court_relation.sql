CREATE TABLE IF NOT EXISTS global_clubs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE global_courts ADD COLUMN club_id INTEGER REFERENCES global_clubs(id);

INSERT OR IGNORE INTO global_clubs (nombre, descripcion, activo)
SELECT DISTINCT TRIM(club), NULL, 1
FROM global_courts
WHERE club IS NOT NULL
  AND TRIM(club) <> '';

UPDATE global_courts
SET club_id = (
  SELECT gc.id
  FROM global_clubs gc
  WHERE LOWER(gc.nombre) = LOWER(TRIM(global_courts.club))
  LIMIT 1
)
WHERE club_id IS NULL
  AND club IS NOT NULL
  AND TRIM(club) <> '';