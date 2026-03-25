# Tournament Tracker v2.0

Aplicacion full stack para gestion de torneos de padel.

## Stack
- Frontend: React + Vite + Tailwind
- Backend: Node.js + Express
- DB: SQLite + better-sqlite3
- Auth: JWT + bcrypt

## Requisitos
- Node.js 20+
- npm 10+

## Setup
1. Copiar `.env.example` a `.env` y completar valores.
2. Instalar dependencias:
   - `npm install`
3. Desarrollo:
   - `npm run dev`
4. Produccion (backend):
   - `npm run start`

El backend escucha en `0.0.0.0` y usa SQLite en `server/data/torneo.db`.

## Configuracion de instalacion (nivel club)
Se define en `server/installation.config.js` y no se expone como configuracion editable en el frontend del club.

Perfiles incluidos:
- `americano`: 1 set, juego en el dia, un club.
- `largo`: mejor de 3 con super tie-break, multi dia y multi club.

Configuracion principal:
- `defaultTournamentType`: tipo por defecto para alta de torneos.
- `tournamentTypes.<codigo>.enabled`: habilita o deshabilita cada tipo.
- `tournamentTypes.<codigo>.matchFormat`: formato real de partido aplicado al torneo.

Ejemplo para una instalacion solo Americano:
- `defaultTournamentType: "americano"`
- `tournamentTypes.americano.enabled: true`
- `tournamentTypes.largo.enabled: false`

## Estado funcional actual
- Login JWT con invalidez por logout.
- ABM de usuarios (admin) y medios de pago (admin para escribir).
- Alta de torneos con zonas, cuadro persistido y canchas.
- Registro de parejas con jugadores unicos por torneo y validacion de telefono.
- Presentismo, W.O. automatico en pendientes y bloqueo de cambios si la pareja esta en juego.
- Pagos por jugador, multiples transacciones y ajuste de transaccion (incluye monto 0).
- Zonas con orden manual de posiciones.
- Gestion de pendientes, cola de canchas, inicio de partidos y carga de resultados.
- Dashboard de canchas con polling en frontend.
