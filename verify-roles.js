const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'data', 'torneo.db');
const db = new Database(dbPath);

console.log('🔍 Verificando roles en la BD...\n');

const roles = db.prepare('SELECT DISTINCT role FROM users').all();
console.log('Roles en la BD:');
roles.forEach(r => console.log(`  - ${r.role}`));

console.log('\n📋 Usuarios en la BD:');
const users = db.prepare('SELECT id, username, role, nombre FROM users ORDER BY role, username').all();
users.forEach(u => {
  console.log(`  [${u.id}] ${u.username} (${u.role}) - ${u.nombre}`);
});

console.log('\n✓ Verificación completada');
db.close();
