const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

// Si existe DB_PATH usamos ese (Railway)
// sino usamos la carpeta local
const dbPath = process.env.DB_PATH
  ? process.env.DB_PATH
  : path.resolve(__dirname, "../../data/torneo.db");

// Crear carpeta solo si es entorno local
if (!process.env.DB_PATH) {
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

console.log("📦 DB path:", dbPath);

module.exports = { db };
