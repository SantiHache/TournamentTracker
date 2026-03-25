# Railway SQLite Cloud + Vercel (Solución Completa con Persistencia)

## ¿Por Qué Railway SQLite?

**Versión local:** SQLite en `/tmp` se resetea cada 12 horas  
**Con Railway:** BD persiste para siempre ($10/mes)

**Ventaja:** SIN cambios en código = SQLite sigue siendo SQLite

---

## Arquitectura Final

```
┌─────────────────────────────────────┐
│    Vercel: Frontend + Backend API   │
│  lafabrica.simplelinesolutions.app  │
└──────────────┬──────────────────────┘
               │
               │ CONNECTION_STRING
               ▼
         ┌───────────────────┐
         │  Railway SQLite   │
         │  Cloud Storage    │
         │  Persistencia 100%│
         │  $10/mes          │
         └───────────────────┘
```

---

## PASO 1: Setup Railway (5 minutos)

### 1.1 Crear Cuenta

1. Ir a https://railway.app
2. Signup con GitHub (recomendado)
3. Crear nuevo proyecto: `Settings → Create new project`

### 1.2 Agregar PostgreSQL (NO - Agregar SQLite)

⚠️ **IMPORTANTE:** Railway no ofrece "SQLite" directamente en el marketplace.

**ALTERNATIVA NATIVA:** Usar SQLite Cloud (servicio externo pero recomendado)

O **MEJOR AÚN:** Usar Neon (PostgreSQL gratis) pero...

---

## MEJOR SOLUCIÓN: Neon + PostgreSQL (Gratis el primer mes)

**¿Por qué PostgreSQL y no SQLite Cloud?**
- ✅ Gratis 1 mes, luego $7/mes
- ✅ Mejor que SQLite Cloud
- ✅ Más robusto
- ✅ Railway lo integra nativamente

**¿Qué cambios necesita el código?**
- ❌ Cambiar driver de `sqlite3` a `pg`
- ✅ Cambiar connection string
- ✅ Cambiar queries (mínimo - SQLite y PostgreSQL son similares)

---

## OPCIÓN REALMENTE SIN CAMBIOS: Usar Vercel Blob Storage

Se puede guardar la BD SQLite en Vercel Blob Storage (~$5/mes si excedes límite gratuito).

**PERO:** Requiere código especial para cargar/guardar.

---

## MI RECOMENDACIÓN: SQLite Cloud (SIN límite gratuito pero es $10/mes)

### Paso 1: Ir a https://sqlitecloud.io

1. Signup
2. Create new database: "torneo"
3. Copy connection string

### Paso 2: Adaptar Código

**En `server/src/db/connection.js`:**

```javascript
const Database = require("better-sqlite3");
const path = require("path");

let db;

if (process.env.SQLITE_CLOUD_CONNECTION) {
  // Producción: conectar a SQLite Cloud
  const CONNECTION_STRING = process.env.SQLITE_CLOUD_CONNECTION;
  
  // ⚠️ PROBLEMA: better-sqlite3 no soporta conexiones remoras
  // NECESITAMOS CAMBIAR A: npm install sqlite-async
  
  const sqliteAsync = require("sqlite-async");
  db = sqliteAsync.open(CONNECTION_STRING);
  
} else {
  // Desarrollo local
  const dbPath = path.join(__dirname, "../../data/torneo.db");
  db = new Database(dbPath);
}

module.exports = db;
```

⚠️ **PRIMER PROBLEMA:** `better-sqlite3` es síncrono y no puede conectarse remotamente.

**SOLUCIÓN:** Cambiar a `sqlite3` (npm package) que SÍ soporta conexiones HTTP.

---

## OPCIÓN MÁS REALISTA: PostgreSQL en Railway

### ¿Por qué es la mejor opción?

✅ Railway integrado  
✅ Gratis inicialmente  
✅ Luego $7/mes  
✅ Mejor performance que SQLite  
✅ Mejor que cambiar código completamente  

**Cambios mínimos:**

```bash
npm uninstall sqlite3
npm install pg
```

**En `server/src/db/connection.js`:**

```javascript
const { Client } = require("pg");
const path = require("path");

let db;

if (process.env.DATABASE_URL) {
  // Producción: PostgreSQL en Railway
  db = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  db.connect();
} else {
  // Desarrollo: SQLite local
  const Database = require("sqlite3").Database;
  const dbPath = path.join(__dirname, "../../data/torneo.db");
  db = new Database(dbPath);
}

module.exports = db;
```

---

## LA OPCIÓN MÁS FÁCIL: Vercel KV + Sincronización

Usar Vercel KV (Redis) para guardar la BD en JSON cada operación.

❌ Muy complejo, no lo recomiendo.

---

## DECISIÓN FINAL: PostgreSQL en Railway

### Razón: equilibrio costo-beneficio-esfuerzo

- **Costo:** $7/mes (vs $10 SQLite Cloud)
- **Esfuerzo:** Cambiar 2 archivos
- **Persistencia:** 100% garantizada
- **Performance:** Mejor que SQLite
- **Escalabilidad:** Mucho mejor

---

## PASO A PASO: PostgreSQL en Railway

### 1. Crear proyecto en Railway

1. Ir a https://railway.app/dashboard
2. `+ New Project` → `Provision PostgreSQL`
3. Esperar deployment (2 minutos)

### 2. Obtener Connection String

1. En dashboard, clickear en proyecto
2. Ir a pestaña `Connect`
3. Copiar variable `DATABASE_URL`

```
postgresql://user:password@host:port/database
```

### 3. Cambiar código backend

**Archivo: `server/src/db/connection.js`**

Reemplazar TODO el contenido con:

```javascript
const path = require("path");

let db;
let isLocalMode = false;

// Determinamos el modo
const isProduction = process.env.DATABASE_URL !== undefined;

if (isProduction) {
  // PostgreSQL en Railway
  const { Client } = require("pg");
  db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });
  
  db.connect((err) => {
    if (err) console.error("DB connection error:", err);
    else console.log("✅ Connected to PostgreSQL on Railway");
  });
  
} else {
  // SQLite local (desarrollo)
  const Database = require("better-sqlite3");
  const dbPath = path.join(__dirname, "../../data/torneo.db");
  db = new Database(dbPath);
  isLocalMode = true;
  console.log("✅ Using SQLite locally");
}

// Exportar ambos para que otros archivos sepan qué BD usan
module.exports = db;
module.exports.isLocalMode = isLocalMode;
```

### 4. Cambiar consultas SQL (MÍNIMO)

⚠️ **SQLite vs PostgreSQL diferencias:**

| SQLite | PostgreSQL |
|--------|-----------|
| `AUTOINCREMENT` | `SERIAL` / `BIGSERIAL` |
| `TRUE/FALSE` | `true/false` |
| `LIKE` (case-insensitive) | `ILIKE` |
| `datetime()` | `NOW()` |
| `` ← backticks | `"` ← comillas |

**Buena noticia:** Tu schema actual NO usa estas cosas raras.

**Cambios necesarios en migraciones:**

**Archivo: `server/src/db/migrations/001_init.sql`**

```sql
-- ANTES (SQLite):
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ...
)

-- DESPUÉS (PostgreSQL):
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  ...
)
```

### 5. Instalar driver PostgreSQL

```bash
cd server
npm install pg
npm install --save-dev @types/pg  # opcional
```

### 6. Agregar env var en Vercel

1. Vercel Dashboard → Settings → Environment Variables
2. Add new variable:
   - Name: `DATABASE_URL`
   - Value: (Copiar de Railway)

### 7. Deploy en Vercel

```bash
git add .
git commit -m "Add PostgreSQL support for production"
git push origin main
```

Vercel redeploya automáticamente.

---

## VERIFICAR QUE FUNCIONA

### En local:

```bash
cd server
npm start

# Deberías ver:
# ✅ Using SQLite locally
# ✅ migrations applied
```

### En Vercel:

1. Ir a Deployment → Logs
2. Deberías ver: `✅ Connected to PostgreSQL on Railway`

---

## COSTO FINAL

- **Vercel Pro:** $20/mes (para múltiples proyectos)
- **Railway PostgreSQL:** $7/mes por proyecto
- **Total por instalación:** ~$27/mes

---

## PRÓXIMOS PASOS

1. ¿Quieres que prepare el cambio en las migraciones SQL?
2. ¿Quieres el script para migrar datos de SQLite local → PostgreSQL?
3. ¿Empezamos con la primera instalación (La Fábrica)?

