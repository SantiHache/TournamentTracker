const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");

const dbPath = path.join(__dirname, "server/data/torneo.db");
const db = new Database(dbPath);

console.log("👤 Creando usuarios para jugadores...\n");

try {
  // Get all players without user_id
  const playersWithoutUser = db.prepare(`
    SELECT id, nombre, apellido, email FROM players WHERE user_id IS NULL
  `).all();

  console.log(`📝 Procesando ${playersWithoutUser.length} jugadores sin usuario...\n`);

  const updatePlayer = db.prepare("UPDATE players SET user_id = ? WHERE id = ?");
  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, role, nombre, activo)
    VALUES (?, ?, 'jugador', ?, 1)
  `);

  let createdCount = 0;

  for (const player of playersWithoutUser) {
    try {
      // Create email-based username if not already set
      const username = player.email || `${player.nombre.toLowerCase()}.${player.apellido.toLowerCase()}@tournament-tracker.local`;
      
      // Check if username already exists
      const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
      if (existing) {
        console.log(`  ⚠ Usuario ya existe: ${username}`);
        updatePlayer.run(existing.id, player.id);
        createdCount++;
        continue;
      }

      // Create password: nombre+apellido lowercase
      const password = `${player.nombre}${player.apellido}`.toLowerCase();
      const passwordHash = bcrypt.hashSync(password, 10);
      const fullName = `${player.nombre} ${player.apellido}`;

      const result = insertUser.run(username, passwordHash, fullName);
      
      // Link player to user
      updatePlayer.run(result.lastInsertRowid, player.id);
      
      console.log(`  ✓ ${player.nombre} ${player.apellido}`);
      console.log(`    Email: ${username}`);
      console.log(`    Pass: ${password}\n`);
      
      createdCount++;
    } catch (err) {
      console.error(`  ✗ Error con ${player.nombre}: ${err.message}`);
    }
  }

  console.log(`\n✅ ${createdCount} usuarios 'jugador' creados y vinculados`);
  
  // Verify
  const finalCount = db.prepare("SELECT COUNT(*) as total FROM players WHERE user_id IS NOT NULL").get();
  console.log(`   Jugadores ahora visibles en API: ${finalCount.total}`);

  db.close();
  
} catch (err) {
  console.error(`❌ Error: ${err.message}`);
  process.exit(1);
}
