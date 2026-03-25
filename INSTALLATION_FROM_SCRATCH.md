# Instalación Desde Cero - Tournament Tracker

## Pre-requisitos para Cliente

- Node.js 16+ (https://nodejs.org)
- npm o yarn
- Git
- Editor de código (VS Code recomendado)

## Pre-requisitos para Servidor

- Node.js 16+
- SQLite (incluido en better-sqlite3) para desarrollo
- PostgreSQL para producción

## A. Setup Inicial en Local

### 1. Clonar o descargar el repositorio

```bash
git clone <tu-repo> tournament-tracker
cd tournament-tracker
```

### 2. Install Backend

```bash
cd server
npm install
```

### 3. Install Frontend

```bash
cd ../client
npm install
```

## B. Configuración Local

### 1. Backend Configuration

```bash
cd server
cp ../.env.example .env
```

Editar `server/.env`:
```
PORT=4002
JWT_SECRET=tu_clave_secreta_aqui
ADMIN_USER=admin
ADMIN_PASSWORD=admin123
INSTALLATION_MODE=club
CIRCUIT_ENABLED=false
ALLOWED_TOURNAMENT_TYPES=americano
```

### 2. Frontend Configuration

```bash
cd ../client
cat > .env.local << EOF
VITE_API_URL=http://localhost:4002/api
EOF
```

## C. Iniciar en Local

### Terminal 1: Backend

```bash
cd server
npm start
# Debe escuchar en 0.0.0.0:4002
```

### Terminal 2: Frontend

```bash
cd client
npm run dev
# Debe levantar en http://localhost:5173
```

## D. Verificar Setup

1. Abrir http://localhost:5173
2. Login con:
   - Usuario: `admin`
   - Contraseña: `admin123`
3. Crear torneo de prueba
4. Verificar que funcione completamente

## E. Estructura de Carpetas Post-Setup

```
tournament-tracker/
├── server/
│   ├── src/
│   │   ├── app.js         # Express app
│   │   ├── index.js       # Entry point
│   │   ├── config.js      # Configuración
│   │   ├── db/            # Database
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Auth, validation
│   │   │── services/      # Business logic
│   │   └── logic/         # Tournament logic
│   ├── data/
│   │   └── torneo.db      # SQLite database (generado)
│   ├── .env               # Variables de entorno
│   ├── package.json
│   └── installation.config.js  # Config de instalación
│
├── client/
│   ├── src/
│   │   ├── App.jsx        # Main component
│   │   ├── main.jsx
│   │   ├── api.js         # API client
│   │   ├── components/    # Componentes reutilizables
│   │   ├── pages/         # Páginas
│   │   ├── store/         # Zustand stores
│   │   └── styles.css
│   ├── .env.local         # Variables frontend
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
├── .git/                  # Git repository
├── .gitignore
├── DEPLOYMENT.md          # Guía de deployment
└── README.md
```

## F. Base de Datos - Primer Run

| Backend inicia automáticamente:
1. Verifica `schema_migrations` table
2. Ejecuta migraciones pendientes:
   - 001_init.sql
   - 002_courts_description.sql
   - ... hasta 009_player_role.sql
3. Crea usuarios default (simpleline, admin)
4. Genera DB schema completo

**Base de datos después:**
```
server/data/torneo.db (SQLite)
└── Tablas:
    ├── users              (admin, superadmin, asistente)
    ├── players            (jugadores con categorías)
    ├── categories         (C2-C8, D2-D8)
    ├── tournaments        (torneos)
    ├── pairs              (parejas)
    ├── matches            (partidos)
    ├── global_courts      (canchas)
    ├── zones              (zonas)
    ├── groups             (grupos)
    └── ... (más tablas)
```

## G. Primer Usuario y Credenciales

**Superadmin (creado automáticamente):**
```
Usuario: simpleline
Contraseña: simpleline123
Rol: superadmin (acceso a auditoria, usuarios, etc.)
```

**Admin (creado automáticamente):**
```
Usuario: admin
Contraseña: admin123
Rol: admin (acceso total excepto auditoria)
```

**Usuarios adicionales:**
- Se crean desde interfaz o scripts manuales
- Roles soportados: admin, asistente, superadmin, Player

## H. Modos de Instalación

### Modo Club (Default)
```
INSTALLATION_MODE=club
CIRCUIT_ENABLED=false
```
- Solo administradores crean usuarios
- Interfaz sin "Jugadores"
- Simplificado para clubes

### Modo Circuit
```
INSTALLATION_MODE=circuit
CIRCUIT_ENABLED=true
```
- Jugadores pueden self-registrarse
- Menú "Jugadores" visible
- Categorías de jugadores (C2-C8, D2-D8)
- Más funcionalidades

## I. Primeros Pasos en la App

### 1. Crear Canchas

1. Login como admin
2. Ir a "Configuración" → "Global"
3. Agregar canchas (Ej: "Cancha 1", "Cancha 2")
4. Guardar

### 2. Crear Medios de Pago

1. Ir a "Configuración" → "Pagos"
2. Agregar métodos (Ej: "Efectivo", "Transferencia")
3. Guardar

### 3. Crear Torneo

1. Ir a "Torneos" home
2. Llenar wizard 3 pasos:
   - Paso 1: Nombre, tipo, clasificación
   - Paso 2: Seleccionar canchas
   - Paso 3: Seleccionar medios de pago
3. Crear

### 4. Cargar Parejas

1. Entrar a torneo → "Parejas"
2. Agregar parejas manualmente
3. Marcar presentes/ausentes

### 5. Armar Torneo

1. Ir a "Configuración Torneo"
2. Generar zonas
3. Generar eliminatorias
4. Asignar canchas

### 6. Jugar Partidos

1. Ir a "Inicio"
2. Ver partido en progreso o en cola
3. Registrar resultado
4. Marcar como finalizado

## J. Comandos Útiles

### Desarrollo

```bash
# Backend
cd server
npm start              # Inicia en 0.0.0.0:4002
npm run dev            # Con nodemon (watch mode)

# Frontend
cd client
npm run dev            # Vite dev server
npm run build          # Build para producción
npm run preview        # Preview build local
```

### Utilities

```bash
# Resetear BD completamente
cd server
node reset-migrations.js

# Poblar con datos de prueba
node populate-test-data.js

# Verificar roles en BD
node verify-roles.js
```

## K. Troubleshooting Instalación

### Error: "Port 4002 already in use"
```bash
# Encontrar proceso en puerto
netstat -ano | findstr ":4002"
# Matar proceso
taskkill /PID <PID> /F
```

### Error: "Module not found: better-sqlite3"
```bash
cd server
npm install --build-from-source
```

### Error: "VITE_API_URL not defined"
- Crear `.env.local` en `client/`
- Incluir `VITE_API_URL=http://localhost:4002/api`

### Error: "Cannot GET /api/torneos"
- Verificar backend está corriendo
- Verificar URL en frontend `.env.local`
- Verificar CORS está habilitado

## L. Próximos Pasos

1. **Configurar SMTP** (para emails de recuperación)
2. **Configurar backups** (BD automáticos)
3. **Agregar más tipos de torneos** (en `installation.config.js`)
4. **Personalizar branding** (colores, logos)
5. **Deploy en Vercel** (ver `DEPLOYMENT.md`)

## M. Soporte

Para issues:
1. Verificar logs en consola backend/frontend
2. Limpiar caché y recargar (`Ctrl+Shift+Del`)
3. Resetear BD con `node reset-migrations.js`
4. Revisar `.env` correctamente configurado
