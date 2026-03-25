const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, 'server', 'data', 'torneo.db');
const db = new Database(dbPath);

console.log('🔧 Poblando base de datos con datos de prueba...\n');

// Create default administrative users
console.log('👤 Creando usuarios administrativos por defecto...');

const insertUser = db.prepare(`
  INSERT INTO users (username, password_hash, role, nombre, activo, created_at)
  VALUES (?, ?, ?, ?, 1, datetime('now'))
`);

try {
  const superadminHash = bcrypt.hashSync('simpleline123', 10);
  insertUser.run('simpleline', superadminHash, 'superadmin', 'Simple Line');
  console.log(`✓ Usuario superadmin creado: simpleline / simpleline123`);
} catch (e) {
  console.log(`ℹ️  SuperAdmin ya existe`);
}

try {
  const adminHash = bcrypt.hashSync('admin123', 10);
  insertUser.run('admin', adminHash, 'admin', 'Administrador');
  console.log(`✓ Usuario admin creado: admin / admin123`);
} catch (e) {
  console.log(`ℹ️  Admin ya existe`);
}

console.log('');

// Test tournaments
const tournaments = [
  {
    name: 'Torneo Open Marzo',
    status: 'activo',
    planned_pairs: 32,
    tipo_torneo: 'americano',
    match_format: 'one_set'
  },
  {
    name: 'Torneo Largo Abril',
    status: 'activo',
    planned_pairs: 16,
    tipo_torneo: 'largo',
    match_format: 'best_of_3'
  }
];

// Insert tournaments
const insertTournament = db.prepare(`
  INSERT INTO tournaments (name, status, planned_pairs, tipo_torneo, match_format, created_at)
  VALUES (?, ?, ?, ?, ?, datetime('now'))
`);

const tournamentIds = [];
tournaments.forEach(t => {
  const result = insertTournament.run(t.name, t.status, t.planned_pairs, t.tipo_torneo, t.match_format);
  tournamentIds.push(result.lastInsertRowid);
  console.log(`✓ Torneo creado: ${t.name} (ID: ${result.lastInsertRowid})`);
});

// Test players with categories
const playersData = [
  { nombre: 'Juan', apellido: 'Torres', email: 'juan@example.com', phone: '+5491111111', category: 1 }, // C2
  { nombre: 'Carlos', apellido: 'Mendez', email: 'carlos@example.com', phone: '+5491111112', category: 2 }, // C3
  { nombre: 'Diego', apellido: 'Garcia', email: 'diego@example.com', phone: '+5491111113', category: 3 }, // C4
  { nombre: 'Fernando', apellido: 'Lopez', email: 'fernando@example.com', phone: '+5491111114', category: 4 }, // C5
  { nombre: 'Roberto', apellido: 'Martinez', email: 'roberto@example.com', phone: '+5491111115', category: 5 }, // C6
  { nombre: 'Gustavo', apellido: 'Rodriguez', email: 'gustavo@example.com', phone: '+5491111116', category: 6 }, // C7
  { nombre: 'Alberto', apellido: 'Sanchez', email: 'alberto@example.com', phone: '+5491111117', category: 7 }, // C8
  { nombre: 'Julio', apellido: 'Perez', email: 'julio@example.com', phone: '+5491111118', category: 8 }, // D2
  { nombre: 'Mariana', apellido: 'Gonzalez', email: 'mariana@example.com', phone: '+5491111119', category: 9 }, // D3
  { nombre: 'Laura', apellido: 'Silva', email: 'laura@example.com', phone: '+54911111110', category: 10 }, // D4
  { nombre: 'Sofia', apellido: 'Diaz', email: 'sofia@example.com', phone: '+54911111111', category: 11 }, // D5
  { nombre: 'Valentina', apellido: 'Castro', email: 'valentina@example.com', phone: '+54911111112', category: 12 }, // D6
  { nombre: 'Carolina', apellido: 'Ruiz', email: 'carolina@example.com', phone: '+54911111113', category: 13 }, // D7
  { nombre: 'Francisca', apellido: 'Vargas', email: 'francisca@example.com', phone: '+54911111114', category: 14 }, // D8
  { nombre: 'Hector', apellido: 'Vazquez', email: 'hector@example.com', phone: '+54911111115', category: 1 }, // C2
  { nombre: 'Miguel', apellido: 'Morales', email: 'miguel@example.com', phone: '+54911111116', category: 2 }, // C3
  { nombre: 'Andres', apellido: 'Nunez', email: 'andres@example.com', phone: '+54911111117', category: 3 }, // C4
  { nombre: 'Sergio', apellido: 'Romero', email: 'sergio@example.com', phone: '+54911111118', category: 4 }, // C5
  { nombre: 'Pablo', apellido: 'Salazar', email: 'pablo@example.com', phone: '+54911111119', category: 5 }, // C6
  { nombre: 'Ricardo', apellido: 'Toledo', email: 'ricardo@example.com', phone: '+54911111120', category: 6 } // C7
];

console.log('\n📋 Creando jugadores...');

// Insert players (first without users)
const insertPlayer = db.prepare(`
  INSERT INTO players (nombre, apellido, telefono, email, category_id, created_at)
  VALUES (?, ?, ?, ?, ?, datetime('now'))
`);

const playerIds = [];
playersData.forEach(p => {
  const result = insertPlayer.run(p.nombre, p.apellido, p.phone, p.email, p.category);
  playerIds.push(result.lastInsertRowid);
  console.log(`✓ Jugador creado: ${p.nombre} ${p.apellido} (ID: ${result.lastInsertRowid})`);
});

// Now create player users and link them
console.log('\n🔗 Vinculando jugadores a usuarios con rol Player...');

const selectPlayers = db.prepare('SELECT id, nombre, apellido FROM players WHERE user_id IS NULL');
const playersWithoutUsers = selectPlayers.all();

const insertPlayerUser = db.prepare(`
  INSERT INTO users (username, password_hash, role, nombre, activo, created_at)
  VALUES (?, ?, ?, ?, 1, datetime('now'))
`);

const updatePlayerUser = db.prepare('UPDATE players SET user_id = ? WHERE id = ?');

let createdCount = 0;
playersWithoutUsers.forEach(player => {
  const username = `${player.nombre.toLowerCase()}${player.apellido.toLowerCase()}`;
  const password = `${player.nombre.toLowerCase()}${player.apellido.toLowerCase()}`;
  const hash = bcrypt.hashSync(password, 10);

  try {
    const userResult = insertPlayerUser.run(username, hash, 'Player', `${player.nombre} ${player.apellido}`);
    updatePlayerUser.run(userResult.lastInsertRowid, player.id);
    createdCount++;
    console.log(`✓ Usuario 'Player' creado: ${username}`);
  } catch (e) {
    console.log(`⚠️  Error creando usuario para ${player.nombre}: ${e.message}`);
  }
});

console.log(`\n✓ Base de datos poblada completamente`);
console.log(`   - Usuarios administrativos: simpleline (superadmin) + admin`);
console.log(`   - ${tournaments.length} torneos creados`);
console.log(`   - ${playerIds.length} jugadores creados`);
console.log(`   - ${createdCount} usuarios 'Player' vinculados`);
console.log(`\n🔐 Credenciales:`);
console.log(`   - SuperAdmin: simpleline / simpleline123`);
console.log(`   - Admin: admin / admin123`);

db.close();
