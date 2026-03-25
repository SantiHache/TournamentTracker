PRAGMA foreign_keys = OFF;

-- Create categories table
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('Caballeros', 'Damas')),
  number INTEGER NOT NULL,
  ordinal TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert all categories
INSERT INTO categories (type, number, ordinal, code) VALUES
('Caballeros', 2, '2da', 'C2'),
('Caballeros', 3, '3ra', 'C3'),
('Caballeros', 4, '4ta', 'C4'),
('Caballeros', 5, '5ta', 'C5'),
('Caballeros', 6, '6ta', 'C6'),
('Caballeros', 7, '7ma', 'C7'),
('Caballeros', 8, '8va', 'C8'),
('Damas', 2, '2da', 'D2'),
('Damas', 3, '3ra', 'D3'),
('Damas', 4, '4ta', 'D4'),
('Damas', 5, '5ta', 'D5'),
('Damas', 6, '6ta', 'D6'),
('Damas', 7, '7ma', 'D7'),
('Damas', 8, '8va', 'D8');

-- Migrate players.categoria string to reference
CREATE TABLE players_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  telefono TEXT NOT NULL,
  dni TEXT UNIQUE,
  email TEXT UNIQUE,
  category_id INTEGER,
  fecha_nacimiento TEXT,
  ranking_points INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  UNIQUE(nombre, apellido, telefono)
);

-- Copy data
INSERT INTO players_new (
  id, user_id, nombre, apellido, telefono, dni, email, category_id, fecha_nacimiento, ranking_points, created_at
)
SELECT
  p.id,
  p.user_id,
  p.nombre,
  p.apellido,
  p.telefono,
  p.dni,
  p.email,
  CASE
    WHEN p.categoria IS NOT NULL THEN (SELECT id FROM categories WHERE code = p.categoria)
    ELSE NULL
  END,
  p.fecha_nacimiento,
  p.ranking_points,
  p.created_at
FROM players p;

DROP TABLE players;
ALTER TABLE players_new RENAME TO players;

CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);
CREATE INDEX IF NOT EXISTS idx_players_category_id ON players(category_id);

PRAGMA foreign_keys = ON;
