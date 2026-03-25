const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, 'server', 'data', 'torneo.db');
const db = new Database(dbPath);

console.log('🔧 Restaurando usuarios administrativos...\n');

const insertUser = db.prepare(`
  INSERT INTO users (username, password_hash, role, nombre, activo, created_at)
  VALUES (?, ?, ?, ?, 1, datetime('now'))
`);

try {
  // Admin user
  const adminHash = bcrypt.hashSync('admin123', 10);
  insertUser.run('admin', adminHash, 'admin', 'Administrador');
  console.log('✓ Usuario admin creado: admin / admin123');
} catch (e) {
  if (e.message.includes('UNIQUE constraint failed')) {
    console.log('ℹ️  Usuario admin ya existe');
  } else {
    console.log(`❌ Error creando admin: ${e.message}`);
  }
}

try {
  // Asistente user
  const asistenteHash = bcrypt.hashSync('asistente123', 10);
  insertUser.run('asistente', asistenteHash, 'asistente', 'Asistente');
  console.log('✓ Usuario asistente creado: asistente / asistente123');
} catch (e) {
  if (e.message.includes('UNIQUE constraint failed')) {
    console.log('ℹ️  Usuario asistente ya existe');
  } else {
    console.log(`❌ Error creando asistente: ${e.message}`);
  }
}

console.log('\n📋 Verificando roles en la BD:');
const roles = db.prepare('SELECT DISTINCT role FROM users ORDER BY role').all();
console.log(`Total de roles: ${roles.length}`);
roles.forEach(r => console.log(`  - ${r.role}`));

console.log('\n👥 Todos los usuarios:');
const users = db.prepare('SELECT id, username, role, nombre FROM users ORDER BY role, username').all();
users.forEach(u => {
  console.log(`  [${u.id}] ${u.username.padEnd(20)} (${u.role.padEnd(10)}) - ${u.nombre}`);
});

db.close();
console.log('\n✓ Restauración completada');
