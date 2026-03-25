const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "server/data/torneo.db");

console.log("� Reseteando schema de circuito...\n");

try {
  const db = new Database(dbPath);
  
  console.log("📋 Estado actual:");
  const migrations = db.prepare("SELECT name FROM schema_migrations ORDER BY name").all();
  migrations.forEach(m => console.log(`  ✓ ${m.name}`));
  
  console.log("\n🗑️  Eliminando tablas antiguas...");
  
  // Drop tables if they exist
  db.pragma("foreign_keys = OFF");
  
  try {
    db.exec("DROP TABLE IF EXISTS players");
    console.log("  ✓ Tabla 'players' eliminada");
  } catch (e) {
    console.log(`  ⚠ Error al borrar players: ${e.message}`);
  }
  
  try {
    db.exec("DROP TABLE IF EXISTS categories");
    console.log("  ✓ Tabla 'categories' eliminada");
  } catch (e) {
    console.log(`  ⚠ Error al borrar categories: ${e.message}`);
  }
  
  db.pragma("foreign_keys = ON");
  
  // Remove migration records
  console.log("\n🗑️  Limpiando registros de migración...");
  db.prepare("DELETE FROM schema_migrations WHERE name IN (?, ?)").run(
    "007_circuit_players.sql",
    "008_circuit_categories.sql"
  );
  console.log("  ✓ Migraciones 007 y 008 marcadas para re-ejecutarse");
  
  db.close();
  
  console.log("\n✅ Schema reseteado correctamente");
  console.log("   Las tablas y migraciones se recrearán automáticamente al iniciar el servidor");
  
} catch (err) {
  console.error(`❌ Error: ${err.message}`);
  process.exit(1);
}




