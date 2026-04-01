require("dotenv").config({ path: "./Backend/.env" });
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
const readline = require("readline");

// Configurar conexión PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createSuperAdmin() {
  console.log("🔑 Creando usuario SuperAdmin...\n");

  try {
    // Check if superadmin exists
    const existing = await pool.query("SELECT id FROM users WHERE role = 'superadmin'");
    
    if (existing.rows.length > 0) {
      console.log("✓ SuperAdmin ya existe");
      const recreate = await question("¿Quieres crear otro superadmin? (s/n): ");
      if (recreate.toLowerCase() !== 's') {
        rl.close();
        await pool.end();
        process.exit(0);
      }
    }

    // Get credentials
    const username = await question("Username: ");
    const nombre = await question("Nombre completo: ");
    const email = await question("Email: ");
    const password = await question("Password (mínimo 8 caracteres): ");

    if (password.length < 8) {
      console.error("❌ Error: El password debe tener al menos 8 caracteres");
      rl.close();
      await pool.end();
      process.exit(1);
    }

    // Create superadmin
    const passwordHash = bcrypt.hashSync(password, 10);

    await pool.query(
      `INSERT INTO users (username, password_hash, role, nombre, email, activo) 
       VALUES ($1, $2, 'superadmin', $3, $4, true)`,
      [username, passwordHash, nombre, email]
    );

    console.log("\n✅ SuperAdmin creado exitosamente:");
    console.log(`   Username: ${username}`);
    console.log(`   Name: ${nombre}`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log("\n⚠️  GUARDA ESTAS CREDENCIALES EN UN LUGAR SEGURO");

    rl.close();
    await pool.end();

  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    rl.close();
    await pool.end();
    process.exit(1);
  }
}

createSuperAdmin();
