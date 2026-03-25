const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");

const dbPath = path.join(__dirname, "server/data/torneo.db");
const db = new Database(dbPath);

console.log("🔍 Verificando credenciales...\n");

try {
  // Check superadmin
  const superadmin = db.prepare("SELECT * FROM users WHERE role = 'superadmin'").get();
  
  if (!superadmin) {
    console.log("❌ No existe usuario superadmin");
    process.exit(1);
  }

  console.log("📋 Usuario SuperAdmin encontrado:");
  console.log(`   Username: ${superadmin.username}`);
  console.log(`   Role: ${superadmin.role}`);
  console.log(`   Active: ${superadmin.activo}`);
  
  // Test password
  const testPasswords = [
    "simpleline123",
    "simpleline",
    "admin123"
  ];

  console.log("\n🔐 Probando contraseñas:");
  for (const pwd of testPasswords) {
    const match = bcrypt.compareSync(pwd, superadmin.password_hash);
    console.log(`   "${pwd}": ${match ? "✓ CORRECTA" : "✗ Incorrecta"}`);
  }

  // Update with known password
  console.log("\n🔄 Actualizando contraseña a 'simpleline123'...");
  const newHash = bcrypt.hashSync("simpleline123", 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE role = 'superadmin'").run(newHash);
  console.log("✓ Contraseña actualizada");

  db.close();
  
} catch (err) {
  console.error(`❌ Error: ${err.message}`);
  process.exit(1);
}
