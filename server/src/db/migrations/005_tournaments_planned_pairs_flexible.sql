PRAGMA foreign_keys = OFF;

CREATE TABLE tournaments_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'finalizado')),
  planned_pairs INTEGER NOT NULL DEFAULT 0 CHECK (planned_pairs >= 0),
  tipo_torneo TEXT NOT NULL CHECK (tipo_torneo IN ('americano', 'largo')),
  match_format TEXT NOT NULL CHECK (match_format IN ('one_set', 'best_of_3', 'best_of_3_super_tb')),
  clasifican_de_zona_3 INTEGER NOT NULL DEFAULT 2,
  clasifican_de_zona_4 INTEGER NOT NULL DEFAULT 3,
  zonas_generadas INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tournaments_new (
  id,
  name,
  status,
  planned_pairs,
  tipo_torneo,
  match_format,
  clasifican_de_zona_3,
  clasifican_de_zona_4,
  zonas_generadas,
  created_at
)
SELECT
  id,
  name,
  status,
  planned_pairs,
  tipo_torneo,
  match_format,
  clasifican_de_zona_3,
  clasifican_de_zona_4,
  zonas_generadas,
  created_at
FROM tournaments;

DROP TABLE tournaments;

ALTER TABLE tournaments_new RENAME TO tournaments;

PRAGMA foreign_keys = ON;
