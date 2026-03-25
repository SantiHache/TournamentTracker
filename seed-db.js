const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "server/data/torneo.db");
const db = new Database(dbPath);

console.log("📝 Insertando datos de prueba...\n");

try {
  db.pragma("foreign_keys = OFF");

  // Insert test tournaments
  console.log("🏆 Creando torneos de prueba...");
  db.prepare(`
    INSERT INTO tournaments (name, tipo_torneo, match_format, planned_pairs, status)
    VALUES 
      ('Torneo Open Marzo', 'americano', 'one_set', 16, 'activo'),
      ('Torneo Largo Abril', 'largo', 'best_of_3', 12, 'activo')
  `).run();
  console.log("  ✓ 2 torneos creados");

  // Insert test players for circuit (with category_id)
  console.log("\n🎾 Creando jugadores del circuito...");
  
  const categories = db.prepare("SELECT id, code FROM categories ORDER BY id").all();
  
  const playerNames = [
    { nombre: "Juan", apellido: "García", telefono: "1234567890" },
    { nombre: "María", apellido: "López", telefono: "1234567891" },
    { nombre: "Carlos", apellido: "Rodríguez", telefono: "1234567892" },
    { nombre: "Ana", apellido: "Martínez", telefono: "1234567893" },
    { nombre: "Pedro", apellido: "Sánchez", telefono: "1234567894" },
    { nombre: "Laura", apellido: "González", telefono: "1234567895" },
    { nombre: "Roberto", apellido: "Pérez", telefono: "1234567896" },
    { nombre: "Sofia", apellido: "Fernández", telefono: "1234567897" },
    { nombre: "Miguel", apellido: "Díaz", telefono: "1234567898" },
    { nombre: "Isabel", apellido: "Torres", telefono: "1234567899" },
    { nombre: "Diego", apellido: "Flores", telefono: "1234567900" },
    { nombre: "Elena", apellido: "Moreno", telefono: "1234567901" },
    { nombre: "Felipe", apellido: "Ruiz", telefono: "1234567902" },
    { nombre: "Martina", apellido: "Castillo", telefono: "1234567903" },
    { nombre: "Andrés", apellido: "Vargas", telefono: "1234567904" },
    { nombre: "Gabriela", apellido: "Jiménez", telefono: "1234567905" },
    { nombre: "Tomás", apellido: "Navarro", telefono: "1234567906" },
    { nombre: "Valentina", apellido: "Ortiz", telefono: "1234567907" },
    { nombre: "Lucas", apellido: "Reyes", telefono: "1234567908" },
    { nombre: "Catalina", apellido: "Vega", telefono: "1234567909" },
  ];

  // Distribute players across categories
  const insertPlayer = db.prepare(`
    INSERT INTO players (nombre, apellido, telefono, email, category_id, ranking_points)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  let playerIdx = 0;
  for (const category of categories) {
    // Insert 2-3 players per category
    const playersInCat = playerIdx < 10 ? 3 : 2;
    for (let i = 0; i < playersInCat && playerIdx < playerNames.length; i++) {
      const player = playerNames[playerIdx];
      const email = `${player.nombre.toLowerCase()}.${player.apellido.toLowerCase()}@example.com`;
      const ranking = Math.floor(Math.random() * 5000) + 100;
      
      insertPlayer.run(
        player.nombre,
        player.apellido,
        player.telefono,
        email,
        category.id,
        ranking
      );
      playerIdx++;
    }
  }
  
  console.log(`  ✓ ${playerIdx} jugadores del circuito creados`);

  db.pragma("foreign_keys = ON");
  
  console.log("\n✅ Datos de prueba insertados correctamente");
  console.log("   - 2 torneos");
  console.log(`   - ${playerIdx} jugadores distribuidos en todas las categorías`);
  
  db.close();
  
} catch (err) {
  console.error(`❌ Error: ${err.message}`);
  process.exit(1);
}
