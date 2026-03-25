PRAGMA foreign_keys = OFF;

-- Update users table CHECK constraint to include 'Player' and use it instead of 'jugador'
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
  id, username, password_hash, 
  CASE WHEN role = 'jugador' THEN 'Player' ELSE role END,
  nombre, activo, session_version, created_at
FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

PRAGMA foreign_keys = ON;
