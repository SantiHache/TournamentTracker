const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "server/data/torneo.db");
const db = new Database(dbPath);

console.log("🔍 Diagnostico de datos en BD...\n");

try {
  // Check tournaments
  const tournaments = db.prepare("SELECT * FROM tournaments").all();
  console.log(`📊 Torneos: ${tournaments.length}`);
  tournaments.forEach(t => console.log(`  - ${t.name} (${t.tipo_torneo})`));

  // Check categories
  const categories = db.prepare("SELECT COUNT(*) as total FROM categories").get();
  console.log(`\n📋 Categorías: ${categories.total}`);

  // Check players
  const players = db.prepare("SELECT * FROM players").all();
  console.log(`\n🎾 Jugadores TOTALES: ${players.length}`);
  
  console.log("\n🔎 Detalles de jugadores:");
  if (players.length > 0) {
    console.log("  Primeros 3:");
    players.slice(0, 3).forEach(p => {
      console.log(`    - ${p.nombre} ${p.apellido} | user_id: ${p.user_id} | category_id: ${p.category_id}`);
    });
  }
  
  // Check players with user_id (what the API filters)
  const playersWithUser = db.prepare("SELECT COUNT(*) as total FROM players WHERE user_id IS NOT NULL").get();
  console.log(`\n🔐 Jugadores CON user_id (visibles en API): ${playersWithUser.total}`);
  
  // Check users
  const users = db.prepare("SELECT * FROM users WHERE role = 'jugador'").all();
  console.log(`\n👤 Usuarios 'jugador': ${users.length}`);
  
  db.close();
  
} catch (err) {
  console.error(`❌ Error: ${err.message}`);
}
