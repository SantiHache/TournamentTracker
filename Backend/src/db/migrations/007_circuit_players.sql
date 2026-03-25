PRAGMA foreign_keys = OFF;

CREATE TABLE users_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'asistente', 'superadmin', 'Player')),
  nombre TEXT NOT NULL,
  activo INTEGER NOT NULL DEFAULT 1,
  session_version INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users_new (
  id, username, password_hash, role, nombre, activo, session_version, created_at
)
SELECT
  id, username, password_hash, role, nombre, activo, session_version, created_at
FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

CREATE TABLE players_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  telefono TEXT NOT NULL,
  dni TEXT UNIQUE,
  email TEXT UNIQUE,
  categoria TEXT,
  fecha_nacimiento TEXT,
  ranking_points INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(nombre, apellido, telefono)
);

INSERT INTO players_new (
  id, nombre, apellido, telefono, ranking_points, created_at
)
SELECT
  id, nombre, apellido, telefono, ranking_points, created_at
FROM players;

DROP TABLE players;
ALTER TABLE players_new RENAME TO players;

CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);
CREATE INDEX IF NOT EXISTS idx_players_dni ON players(dni);
CREATE INDEX IF NOT EXISTS idx_players_email ON players(email);

PRAGMA foreign_keys = ON;