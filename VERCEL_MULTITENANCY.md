# Multi-Tenancy con Vercel + SQLite (Sin Migration)

## Arquitectura Final

```
simplelinesolutions.vercel.app (Landing/Dashboard central)
│
├── lafabrica.simplelinesolutions.vercel.app   ← Proyecto Vercel 1 (La Fábrica)
│   ├── Frontend (React)
│   ├── Backend (Node.js Vercel Functions)
│   └── BD SQLite (Persiste con Vercel Storage)
│
├── otroclub.simplelinesolutions.vercel.app    ← Proyecto Vercel 2 (Otro Club)
│   ├── Frontend (React)
│   ├── Backend (Node.js Vercel Functions)
│   └── BD SQLite (Persiste con Vercel Storage)
│
└── ... más subdominios ...
```

## ¿Cómo Funciona?

### Opción A: Múltiples Proyectos Vercel Independientes (RECOMENDADO)

**Pros:**
- ✅ Cada proyecto es independiente
- ✅ Escalado separado
- ✅ SQLite sin problemas (archivos locales)
- ✅ Control total por instalación

**Contras:**
- ❌ Repos separados
- ❌ Mantener múltiples proyectos

**Workflow:**
```
GitHub
├── tournament-tracker-lafabrica/
│   ├── server/ (Node.js con SQLite)
│   └── client/ (React)
│
├── tournament-tracker-otroclub/
│   ├── server/ (Node.js con SQLite)
│   └── client/ (React)
```

### Opción B: Un Proyecto Multi-Tenant en Vercel (AVANZADO)

**Pros:**
- ✅ Un solo repo
- ✅ Centralizado
- ✅ Fácil agregar nuevas instalaciones

**Contras:**
- ❌ Más complejo
- ❌ Detectar subdominio dinámicamente

## Recomendación: OPCIÓN A (Proyectos Separados)

Es la más simple y escalable para tu caso.

---

## Setup para La Fábrica (Primera Instalación)

### Paso 1: Crear Repositorio

```bash
# En GitHub, crear: tournament-tracker-lafabrica
git clone <repo-url> tournament-tracker-lafabrica
cd tournament-tracker-lafabrica

# Copiar estructura base de tu proyecto actual
cp -r ../Tournament\ Tracker/* .
```

### Paso 2: Estructura de Carpetas

```
tournament-tracker-lafabrica/
├── server/
│   ├── src/
│   │   ├── app.js
│   │   ├── index.js
│   │   └── ... (todo igual)
│   ├── data/
│   │   └── torneo.db (generado)
│   └── package.json
│
├── client/
│   ├── src/
│   └── package.json
│
├── vercel.json (NUEVO - ver abajo)
└── .env.example
```

### Paso 3: Configurar vercel.json para API Serverless

**En la raíz del proyecto:**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "other",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/server/src/index.js"
    },
    {
      "source": "/(.*)",
      "destination": "/client/dist/index.html"
    }
  ]
}
```

### Paso 4: Adaptar Backend para Vercel Functions

Cambiar `server/src/index.js`:

```javascript
// ANTES (local):
app.listen(config.port, "0.0.0.0", () => {
  console.log(`Escuchando en ${config.port}`);
});

// DESPUÉS (Vercel):
module.exports = app;

// O para desarrollo local:
if (process.env.NODE_ENV !== "production") {
  app.listen(config.port, "0.0.0.0", () => {
    console.log(`Escuchando en ${config.port}`);
  });
}
```

### Paso 5: Package.json - Build

Actualizar `package.json` en raíz:

```json
{
  "name": "tournament-tracker-lafabrica",
  "version": "1.0.0",
  "scripts": {
    "build": "cd client && npm run build",
    "dev": "concurrently \"cd server && npm start\" \"cd client && npm run dev\"",
    "install-all": "npm install && cd server && npm install && cd ../client && npm install"
  },
  "devDependencies": {
    "concurrently": "^8.0.0"
  }
}
```

### Paso 6: Vercel Custom Domain

1. Ir a Vercel Dashboard → Settings → Domains
2. Agregar dominio: `lafabrica.simplelinesolutions.vercel.app`
3. ✅ Automáticamente validado

### Paso 7: Environment Variables en Vercel

Vercel Dashboard → Settings → Environment Variables:

```
INSTALLATION_MODE=club
CIRCUIT_ENABLED=false
ADMIN_PASSWORD=admin123
JWT_SECRET=tu_clave_segura_lafabrica
ALLOWED_TOURNAMENT_TYPES=americano
```

---

## SQLite Persistencia en Vercel (IMPORTANTE)

### Problema:
Vercel Functions son **stateless** = cada llamada es nueva instancia

### Soluciones:

#### ✅ Opción 1: Vercel KV (Recomendado para simplificar)
```bash
npm install @vercel/kv
```

Pero KV es Redis (NoSQL), no relacional.

#### ✅ Opción 2: Blob Storage (JSON serializado)
Guardar BD como JSON blob cada operación.

**PERO MEJOR:** SQLite en Vercel con `/tmp` + caché

```javascript
// server/src/db/connection.js
const path = require("path");
const isProduction = process.env.VERCEL === "1";

const dbPath = isProduction
  ? "/tmp/torneo.db"
  : path.join(__dirname, "../../data/torneo.db");

const db = new Database(dbPath);
```

⚠️ **Limitación:** Base de datos se resetea cada 12 horas en Vercel

---

## MEJOR ALTERNATIVA: Usar Railway SOLO para la BD

```
┌─────────────────────────────────────┐
│      Vercel: Frontend + Backend      │
│  (Node.js con trustrpc o Next.js)    │
│      lafabrica.vercel.app            │
└──────────────┬──────────────────────┘
               │
               ▼
         ┌───────────────┐
         │  Railway: DB  │
         │  SQLite Cloud │
         │  ($5-10/mes)  │
         └───────────────┘
```

Railway tiene un servicio **SQLite Cloud** ($10/mes, sin migración).

---

## Plan de Implementación (SIN RAILWAY)

### Fase 1: Setup Primera Instalación

1. Crear repo `tournament-tracker-lafabrica`
2. Copiar código actual
3. Adaptar `index.js` para Vercel
4. Agregar `vercel.json`
5. Push a GitHub
6. Deploy en Vercel
7. Agregar dominio: `lafabrica.simplelinesolutions.vercel.app`

### Fase 2: Para Nueva Instalación (Otro Club)

1. Crear repo `tournament-tracker-otroclub`
2. Copiar estructura de la-fabrica
3. Cambiar configuración (nombres, passwords, etc.)
4. Deploy nuevo proyecto
5. Nuevo subdominio: `otroclub.simplelinesolutions.vercel.app`

---

## Costo Estimado

- **Vercel Frontend:** $20/mes (Pro para múltiples proyectos)
- **Vercel Backend (Functions):** Incluido en Pro
- **SQLite Cloud (opcional, si necesitas persistencia):** $10/mes
- **Total:** ~$30/mes para múltiples instalaciones

vs. Railway: ~$40/mes por proyecto

---

## Ventajas del Enfoque

✅ **Vercel:** Infraestructura probada, fácil deploy con Git  
✅ **SQLite:** Sin cambios en código, funciona igual  
✅ **Subdominios:** Gestión centralizada en Vercel  
✅ **Escalable:** Agregar nuevas instalaciones en minutos  
✅ **Costo:** Económico para múltiples instalaciones  

---

## Limitaciones

⚠️ **SQLite en Functions:** DB se resetea cada 12 horas  
⚠️ **Mejor solución:** Railway SQLite Cloud ($10/mes extra)  
⚠️ **O:** Migrar a PostgreSQL (más robusto)  

---

## Siguiente Paso

¿Quieres que prepare:
1. **Repository template** para `tournament-tracker-lafabrica`?
2. **Instrucciones paso-a-paso** para deployar en Vercel?
3. **Script** para generar nuevas instalaciones automáticamente?

¿Qué te parece? ¿Vamos con esta arquitectura?
