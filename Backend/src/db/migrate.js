const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { db } = require("./connection");
const { config } = require("../config");

function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      executed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const migrationsDir = path.resolve(__dirname, "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const exists = db
      .prepare("SELECT id FROM schema_migrations WHERE name = ?")
      .get(file);
    if (exists) {
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");

    // Some structural migrations rebuild tables referenced by FKs.
    // In SQLite, toggling PRAGMA foreign_keys inside a transaction has no effect,
    // so execute those migrations outside BEGIN/COMMIT with FKs temporarily disabled.
    const needsForeignKeysOff = ["006_superadmin.sql", "007_circuit_players.sql", "008_circuit_categories.sql", "009_player_role.sql"].includes(file);

    if (needsForeignKeysOff) {
      db.pragma("foreign_keys = OFF");
      try {
        db.exec(sql);
        db.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(file);
      } finally {
        db.pragma("foreign_keys = ON");
      }
      continue;
    }

    db.exec("BEGIN");
    try {
      db.exec(sql);
      db.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(file);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }

  const usersCount = db.prepare("SELECT COUNT(*) as total FROM users").get().total;
  if (usersCount === 0) {
    const hash = bcrypt.hashSync(config.adminPassword, 10);
    db.prepare(
      "INSERT INTO users (username, password_hash, role, nombre, activo) VALUES (?, ?, 'admin', ?, 1)"
    ).run(config.adminUser, hash, config.adminName);
  }

  // Ensure superadmin exists
  const superadminExists = db
    .prepare("SELECT id FROM users WHERE role = 'superadmin' LIMIT 1")
    .get();
  if (!superadminExists) {
    let superPassword = config.superadminPassword;
    if (!superPassword) {
      const rnd = () => Math.random().toString(36).slice(2, 8);
      superPassword = `${rnd()}-${rnd()}-${rnd()}`;
      console.warn(
        "\n⚠️  SUPERADMIN_PASSWORD no configurado en variables de entorno." +
        `\n   Contraseña de primer acceso: ${superPassword}` +
        "\n   Cambiala desde la aplicación ni bien ingreses.\n"
      );
    }
    const superHash = bcrypt.hashSync(superPassword, 10);
    db.prepare(
      "INSERT INTO users (username, password_hash, role, nombre, activo) VALUES (?, ?, 'superadmin', ?, 1)"
    ).run(config.superadminUser, superHash, config.superadminName);
  }
}

module.exports = { runMigrations };
