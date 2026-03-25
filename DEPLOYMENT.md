# Guía de Instalación y Deployment

## 1. Arquitectura Recomendada para Producción

```
┌─────────────────────┐          ┌──────────────────┐
│  Vercel Frontend    │◄────────►│  Railway Backend │
│  (React + Vite)     │  HTTPS   │ (Node + Express) │
└─────────────────────┘          └──────────────────┘
                                        │
                                        ▼
                                  ┌──────────────┐
                                  │  PostgreSQL  │
                                  │  (Railway)   │
                                  └──────────────┘
```

## 2. Requisitos Previos

- Repositorio Git (GitHub recomendado)
- Cuenta en Vercel (https://vercel.com)
- Cuenta en Railway (https://railway.app) para backend + BD
- Variables de entorno configuradas

## 3. Paso 1: Preparar el Repositorio

```bash
# Inicializar git (si no está)
git init

# Crear .gitignore
node_modules/
.env
.env.local
dist/
server/data/
*.log

# Commit inicial
git add .
git commit -m "Initial commit: Tournament Tracker"
```

## 4. Paso 2: Deploy del Backend (Railway)

### 4.1 Crear proyecto en Railway
1. Ir a https://railway.app/new
2. Conectar repositorio GitHub
3. Seleccionar carpeta: `server`

### 4.2 Agregar PostgreSQL en Railway
1. Click en "New" → "Database" → "PostgreSQL"
2. Railway automáticamente crea la variabledeentorno `DATABASE_URL`

### 4.3 Configurar variables de entorno en Railway
Dashboard → Variables → Agregar:
```
JWT_SECRET=your_very_secure_secret_here
ADMIN_PASSWORD=admin123
INSTALLATION_MODE=club
CIRCUIT_ENABLED=false
ALLOWED_TOURNAMENT_TYPES=americano
MIN_TOURNAMENT_PAIRS=6
MAX_TOURNAMENT_PAIRS=24
PORT=4002
```

### 4.4 URL del Backend
Railway te proporciona una URL como:
```
https://tournament-tracker-backend.railway.app
```

## 5. Paso 3: Migrar de SQLite a PostgreSQL

El backend necesita cambios mínimos:

### 5.1 Instalar driver PostgreSQL
```bash
cd server
npm install pg
```

### 5.2 Actualizar conexión BD
Modificar `server/src/db/connection.js`:

```javascript
const Database = require("better-sqlite3");
// Cambiar a:
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
```

**Nota**: Esto requiere migrar toda la lógica de SQLite a PostgreSQL.
Alternativa más simple: Mantener SQLite en desarrollo, usar PostgreSQL en producción con un wrapper.

## 6. Paso 4: Deploy Frontend (Vercel)

### 6.1 Conectar repositorio en Vercel
1. Ir a https://vercel.com/new
2. Importar repositorio GitHub
3. Seleccionar carpeta: `client`

### 6.2 Configurar variables de entorno
En Vercel Dashboard → Settings → Environment Variables:
```
VITE_API_URL=https://tournament-tracker-backend.railway.app/api
```

### 6.3 Comandos de build
```
Build Command: npm run build
Output Directory: dist
```

Vercel auto-detecta Vite, pero verifica en `client/package.json`:
```json
{
  "scripts": {
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

## 7. Variables de Entorno - Resumen

### Frontend (.env.production)
```
VITE_API_URL=https://tu-backend.railway.app/api
```

### Backend (.env en Railway)
```
DATABASE_URL=postgresql://...
JWT_SECRET=secure_secret
PORT=4002
INSTALLATION_MODE=club
ADMIN_PASSWORD=admin123
```

## 8. Verificación Post-Deploy

1. **Testing Frontend**
   ```bash
   - Ir a https://tournament-tracker.vercel.app
   - Login con admin/admin123
   - Crear torneo de prueba
   ```

2. **Testing Backend**
   ```bash
   curl -X POST https://tu-backend.railway.app/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin123"}'
   ```

3. **Testing CORS**
   - Vercel Frontend debe poder comunicarse con Railway Backend
   - Backend debe permitir CORS desde dominio Vercel

## 9. CORS Configuration en Backend

Agregar en `server/src/app.js`:

```javascript
const cors = require("cors");

app.use(cors({
  origin: [
    "https://tournament-tracker.vercel.app",
    "http://localhost:5173"
  ],
  credentials: true
}));
```

## 10. Troubleshooting

### Error: "Cannot connect to backend"
- Verificar URL del backend en `.env`
- Verificar CORS en backend
- Verificar variables de entorno en Vercel

### Error: "Database connection failed"
- Verificar DATABASE_URL en Railway
- Verificar migraciones corridas en PostgreSQL
- Verificar credenciales PostgreSQL

### Error: "Port already in use"
- Railway asigna puerto dinámicamente
- Usar `process.env.PORT` en servidor

## 11. Archivo de Instalación desde Cero

Ver `INSTALLATION_FROM_SCRATCH.md` para proceso completo.
