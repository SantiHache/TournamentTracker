ALTER TABLE global_courts RENAME TO global_courts_old;

CREATE TABLE global_courts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  club TEXT,
  club_id INTEGER REFERENCES global_clubs(id),
  UNIQUE(nombre, club_id)
);

INSERT INTO global_courts (id, nombre, descripcion, activo, created_at, club, club_id)
SELECT id, nombre, descripcion, activo, created_at, club, club_id
FROM global_courts_old;

DROP TABLE global_courts_old;