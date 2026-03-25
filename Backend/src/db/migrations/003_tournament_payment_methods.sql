CREATE TABLE IF NOT EXISTS tournament_payment_methods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  payment_method_id INTEGER NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE CASCADE,
  UNIQUE(tournament_id, payment_method_id)
);

INSERT OR IGNORE INTO tournament_payment_methods (tournament_id, payment_method_id, enabled, sort_order)
SELECT t.id, pm.id, CASE WHEN pm.activo = 1 THEN 1 ELSE 0 END, pm.id
FROM tournaments t
CROSS JOIN payment_methods pm;
