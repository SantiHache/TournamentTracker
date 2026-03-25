const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcrypt");

const dbPath = path.join(__dirname, "server/data/torneo.db");
const migrationsDir = path.join(__dirname, "server/src/db/migrations");

console.log("🚀 Ejecutando reset COMPLETO de BD...\n");

try {
  const db = new Database(dbPath);
  
  // Disable foreign keys for cleanup
  db.pragma("foreign_keys = OFF");
  
  console.log("🗑️ Limpiando todas las tablas...");
  
  // Get all tables
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all();
  
  for (const row of tables) {
    try {
      db.exec(`DROP TABLE IF EXISTS ${row.name}`);
      console.log(`  ✓ ${row.name}`);
    } catch (e) {
      console.log(`  ⚠ ${row.name}: ${e.message}`);
    }
  }
  
  db.pragma("foreign_keys = ON");
  
  // Recreate schema_migrations
  db.exec(`
    CREATE TABLE schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      executed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("  ✓ schema_migrations recreada");
  
  // Get all migration files
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log("\n📋 Migraciones disponibles:");
  files.forEach(f => console.log(`  - ${f}`));
  
  console.log("\n🔄 Ejecutando TODAS las migraciones desde cero...");
  
  for (const file of files) {
    console.log(`  ⏳ ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");

    const needsForeignKeysOff = ["006_superadmin.sql", "007_circuit_players.sql", "008_circuit_categories.sql", "009_player_role.sql"].includes(file);

    if (needsForeignKeysOff) {
      db.pragma("foreign_keys = OFF");
      try {
        db.exec(sql);
        db.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(file);
        console.log(`  ✓ ${file}`);
      } catch (err) {
        console.error(`  ✗ ${file}: ${err.message}`);
        throw err;
      } finally {
        db.pragma("foreign_keys = ON");
      }
    } else {
      db.exec("BEGIN");
      try {
        db.exec(sql);
        db.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(file);
        db.exec("COMMIT");
        console.log(`  ✓ ${file}`);
      } catch (err) {
        db.exec("ROLLBACK");
        console.error(`  ✗ ${file}: ${err.message}`);
        throw err;
      }
    }
  }
  
  // Create default administrative users
  console.log("\n👤 Creando usuarios administrativos por defecto...");
  
  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, role, nombre, activo, created_at)
    VALUES (?, ?, ?, ?, 1, datetime('now'))
  `);
  
  try {
    const superadminHash = bcrypt.hashSync('simpleline123', 10);
    insertUser.run('simpleline', superadminHash, 'superadmin', 'Simple Line');
    console.log(`  ✓ SuperAdmin creado: simpleline / simpleline123`);
  } catch (e) {
    console.log(`  ⚠️  SuperAdmin ya existe`);
  }
  
  try {
    const adminHash = bcrypt.hashSync('admin123', 10);
    insertUser.run('admin', adminHash, 'admin', 'Administrador');
    console.log(`  ✓ Admin creado: admin / admin123`);
  } catch (e) {
    console.log(`  ⚠️  Admin ya existe`);
  }
  
  console.log("\n✅ Base de datos recreada completamente");
  console.log("   - Tabla 'categories' con 14 categorías (C2-C8, D2-D8)");
  console.log("   - Tabla 'players' con relación a categories");
  console.log("   - Usuarios administrativos: simpleline (superadmin) + admin");
  
  db.close();
  
} catch (err) {
  console.error(`\n❌ Error: ${err.message}`);
  process.exit(1);
}


