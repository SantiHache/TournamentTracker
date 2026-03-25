const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");

const dbPath = path.join(__dirname, "server/data/torneo.db");
const db = new Database(dbPath);

console.log("🔑 Creando usuario SuperAdmin...\n");

try {
  // Check if superadmin exists
  const existing = db.prepare("SELECT id FROM users WHERE role = 'superadmin'").get();
  
  if (existing) {
    console.log("✓ SuperAdmin ya existe");
    db.close();
    process.exit(0);
  }

  // Create superadmin
  const username = "simpleline";
  const password = "simpleline123"; // Default password
  const passwordHash = bcrypt.hashSync(password, 10);
  const nombre = "Simple Line Solutions";

  db.prepare(
    "INSERT INTO users (username, password_hash, role, nombre, activo) VALUES (?, ?, 'superadmin', ?, 1)"
  ).run(username, passwordHash, nombre);

  console.log("✅ SuperAdmin creado:");
  console.log(`   Username: ${username}`);
  console.log(`   Password: ${password}`);
  console.log(`   Name: ${nombre}`);

  db.close();

} catch (err) {
  console.error(`❌ Error: ${err.message}`);
  process.exit(1);
}
