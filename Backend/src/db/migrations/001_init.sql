CREATE TABLE IF NOT EXISTS schema_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  executed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'asistente')),
  nombre TEXT NOT NULL,
  activo INTEGER NOT NULL DEFAULT 1,
  session_version INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tournaments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'finalizado')),
  planned_pairs INTEGER NOT NULL CHECK (planned_pairs BETWEEN 6 AND 24),
  tipo_torneo TEXT NOT NULL CHECK (tipo_torneo IN ('americano', 'largo')),
  match_format TEXT NOT NULL CHECK (match_format IN ('one_set', 'best_of_3', 'best_of_3_super_tb')),
  clasifican_de_zona_3 INTEGER NOT NULL DEFAULT 2,
  clasifican_de_zona_4 INTEGER NOT NULL DEFAULT 3,
  zonas_generadas INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  telefono TEXT NOT NULL,
  ranking_points INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(nombre, apellido, telefono)
);

CREATE TABLE IF NOT EXISTS pairs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  group_id INTEGER,
  seed_rank INTEGER,
  presente INTEGER,
  presente_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pair_players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pair_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  player_num INTEGER NOT NULL CHECK (player_num IN (1,2)),
  FOREIGN KEY (pair_id) REFERENCES pairs(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id),
  UNIQUE(pair_id, player_num),
  UNIQUE(pair_id, player_id)
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  pair_id INTEGER NOT NULL,
  player_num INTEGER NOT NULL CHECK (player_num IN (1,2)),
  estado TEXT NOT NULL CHECK (estado IN ('sin_pago', 'parcial', 'pagado')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  FOREIGN KEY (pair_id) REFERENCES pairs(id) ON DELETE CASCADE,
  UNIQUE(tournament_id, pair_id, player_num)
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id INTEGER NOT NULL,
  payment_method_id INTEGER NOT NULL,
  monto REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
);

CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  size INTEGER NOT NULL CHECK (size IN (3,4)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('zona','eliminatoria')),
  round TEXT,
  group_id INTEGER,
  pair1_id INTEGER,
  pair2_id INTEGER,
  slot1_source_match_id INTEGER,
  slot2_source_match_id INTEGER,
  set1_pair1 INTEGER,
  set1_pair2 INTEGER,
  set2_pair1 INTEGER,
  set2_pair2 INTEGER,
  supertb_pair1 INTEGER,
  supertb_pair2 INTEGER,
  winner_id INTEGER,
  is_bye INTEGER NOT NULL DEFAULT 0,
  is_wo INTEGER NOT NULL DEFAULT 0,
  court_id INTEGER,
  started_at TEXT,
  finished_at TEXT,
  played_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (pair1_id) REFERENCES pairs(id),
  FOREIGN KEY (pair2_id) REFERENCES pairs(id),
  FOREIGN KEY (winner_id) REFERENCES pairs(id)
);

CREATE TABLE IF NOT EXISTS group_standings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  pair_id INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  games_won INTEGER NOT NULL DEFAULT 0,
  games_lost INTEGER NOT NULL DEFAULT 0,
  position INTEGER,
  position_override INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (pair_id) REFERENCES pairs(id) ON DELETE CASCADE,
  UNIQUE(group_id, pair_id)
);

CREATE TABLE IF NOT EXISTS courts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  identificador TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  UNIQUE(tournament_id, identificador)
);

CREATE TABLE IF NOT EXISTS court_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  court_id INTEGER NOT NULL,
  match_id INTEGER NOT NULL UNIQUE,
  orden INTEGER NOT NULL,
  assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ranking_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instancia TEXT NOT NULL,
  puntos INTEGER NOT NULL,
  activo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS ranking_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL,
  tournament_id INTEGER NOT NULL,
  instancia TEXT NOT NULL,
  puntos_ganados INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id),
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id INTEGER,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id INTEGER,
  before_json TEXT,
  after_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_user_id) REFERENCES users(id)
);
