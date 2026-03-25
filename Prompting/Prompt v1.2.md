# Pádel Torneo Manager — Aplicación Full Stack v2.0

## Descripción General
Aplicación web full-stack para gestionar torneos de Pádel.
Se despliega en un VPS y se accede desde cualquier navegador con internet.
Cada club tiene su propia instancia independiente con su propia base de datos.
Todo el sistema está en castellano.

---

## Stack Tecnológico
- **Frontend:** React (Vite), React Router, Zustand para estado global
- **Backend:** Node.js + Express
- **Base de datos:** SQLite (archivo único `.db`, usando `better-sqlite3`)
- **Autenticación:** JWT (jsonwebtoken) + bcrypt para contraseñas
- **Estilos:** Tailwind CSS
- **Package manager:** npm con workspaces
- **Deploy:** VPS, el servidor escucha en `0.0.0.0` para acceso externo

---

## Autenticación y Usuarios

### Login
- Pantalla de login como punto de entrada al sistema
- Usuario + contraseña
- JWT almacenado en localStorage con expiración de 8 horas
- Todas las rutas de la API requieren token válido (middleware de auth)

### ABM de Usuarios
- Rol **admin**: acceso completo, incluyendo creación y eliminación de usuarios
- Rol **asistente**: acceso completo excepto ABM de usuarios y configuración general
- El sistema arranca con un usuario admin por defecto (configurable en `.env`)
- La tabla de usuarios está preparada para roles con permisos granulares
  en el futuro, pero hoy solo se implementan los dos roles descritos

### Schema usuarios
```sql
users
  id, username, password_hash, role (admin|asistente),
  nombre, activo (boolean), created_at
```

---

## Configuración General
Solo accesible para el rol admin.

### 2.1 Canchas
- Se configuran por torneo (cada torneo define sus propias canchas)
- Cada cancha tiene: identificador (texto libre, ej: "Cancha 1", "Court A")
- Estado en tiempo real: Libre / Ocupada
- Una cancha ocupada no puede asignarse a otro partido

### 2.2 Medios de Pago
- Configuración global, reutilizable en todos los torneos
- Cada medio tiene: nombre (ej: "Transferencia", "Efectivo", "Mercado Pago")
  y descripción opcional
- Son completamente configurables — no hay valores fijos en el sistema
- El admin puede crear, editar y eliminar medios de pago

### Schema configuración
```sql
payment_methods
  id, nombre, descripcion, activo (boolean), created_at

courts
  id, tournament_id, identificador, created_at
```

---

## Flujo General de la Aplicación

1. Login → pantalla de inicio
2. Crear torneo → nombre + cantidad de parejas + configurar canchas
3. Cargar parejas inscriptas
4. Pantalla de presentismo y pagos (antes de iniciar el torneo)
5. Sistema genera zonas y cruces automáticamente
6. Jugar fase de grupos → asignar canchas → cargar resultados
7. Sistema genera cuadro eliminatorio con siembra
8. Jugar fases eliminatorias → asignar canchas → cargar resultados
9. Finalizar torneo al cargar el resultado de la Final

---

## Creación del Torneo — Selección de Parejas

Al crear un torneo, el usuario NO tipea un número libre.
El sistema presenta un selector con las siguientes opciones válidas:

  6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24 parejas

Cada opción muestra la distribución de zonas resultante.
Ejemplo: "12 parejas — 4 zonas de 3" / "14 parejas — 2 zonas de 4 + 2 zonas de 3"

Al crear el torneo, el organizador también configura cuántas parejas
clasifican por zona (ver sección "Clasificación a eliminatorias").
Los valores por defecto son: zonas de 3 → pasan 2, zonas de 4 → pasan 3.

Al crear el torneo, el organizador también configura las canchas
que se usarán para ese torneo (identificador de cada una).

---

## Registro de Parejas

Cada pareja tiene:
- Nombre y Apellido del Jugador 1
- Nombre y Apellido del Jugador 2
- Teléfono de contacto (con código de país, para WhatsApp)

---

## Módulo de Presentismo y Pagos

Pantalla accesible una vez cargadas todas las parejas,
antes y durante el torneo. Muestra la lista completa de parejas con
el estado de cada jugador.

### 3.1 Pagos
El pago se registra **por jugador** (no por pareja).
Cada jugador tiene su propio estado de pago independiente.

**Modelo de pagos múltiples:**
Un jugador puede pagar en varias transacciones hasta cubrir su total.
No hay monto fijo predefinido — el cobrador ingresa el monto en cada transacción.

Ejemplo:
Jugador 1 — García:
Transacción 1: $3.000 — Efectivo
Transacción 2: $2.000 — Transferencia
Total pagado:  $5.000
Jugador 2 — López:
Transacción 1: $5.000 — Mercado Pago
Total pagado:  $5.000

**Estados de pago por jugador:**
- Sin pago
- Pago parcial (pagó algo pero no se cerró el total)
- Pagado (el cobrador marcó el pago como completo)

**Flujo de carga de pago:**
1. El cobrador selecciona al jugador
2. Agrega una transacción: medio de pago + monto
3. Puede agregar más transacciones ("Pagos múltiples")
4. Cuando el pago está completo, marca al jugador como "Pagado"

**Advertencia de pago:**
Si una pareja tiene algún jugador sin pagar o con pago parcial,
se muestra un warning visible en la lista. El torneo puede continuar igual —
el warning es informativo, no bloqueante.

### Schema pagos
```sql
payments
  id, tournament_id, player_id (referencia a pairs.player1 o player2),
  pair_id, estado (sin_pago|parcial|pagado), created_at

payment_transactions
  id, payment_id, payment_method_id, monto, created_at
```

### 3.2 Presentismo
Cada pareja puede marcarse como:
- **Presente** — llegó al predio, puede jugar
- **Ausente** — no llegó

**Si una pareja se marca como Ausente:**
- En cada partido que le corresponda jugar se marca automáticamente como W.O.
- El partido se da por ganado a la pareja rival con resultado 6-0
- La pareja ausente recibe 0 puntos en ese partido
- El W.O. se refleja visualmente en el cuadro y en las zonas

**Advertencia de presentismo:**
Si una pareja tiene jugadores sin pagar y se intenta marcar como Presente,
se muestra un warning visible. Se puede confirmar igual — no es bloqueante.

### Schema presentismo
```sql
-- Agregar columnas a tabla pairs:
pairs
  ... (campos existentes)
  presente (boolean, default null — null = no marcado aún)
  presente_at (timestamp)
```

---

## Lógica de Zonas

### Cálculo automático de zonas
| Parejas | Zonas |
|---------|-------|
| 6–8     | 2     |
| 9–11    | 3     |
| 12–16   | 4     |
| 17, 20  | 5     |
| 18, 19, 21–24 | 6 |

Distribución: zonas de 3 o 4 parejas únicamente.
Las zonas de 4 se asignan primero, el resto son de 3.

### Formato de partidos en zona — REGLA FIJA

**Zonas de 3 parejas → round-robin:**
- 3 partidos, cada pareja juega exactamente 2

**Zonas de 4 parejas → formato copa:**
- Ronda 1: Pareja 1 vs Pareja 3  y  Pareja 2 vs Pareja 4
- Ronda 2: Ganador vs Ganador / Perdedor vs Perdedor
- Cada pareja juega exactamente 2 partidos

### Puntuación
- Victoria: 2 puntos / Derrota: 0 puntos

### Resolución de empates
- El sistema NO resuelve empates automáticamente
- Warning: ⚠️ "Empate en Zona X — Definir posiciones manualmente"
- El organizador reordena con flechas ↑↓ o drag & drop
- Mientras haya empate sin resolver, el avance a eliminatorias está BLOQUEADO

---

## Módulo de Canchas y Partidos

### 4. Gestión de partidos y canchas

**Inicio de partido:**
Al iniciar un partido el organizador selecciona el partido y le asigna
una cancha disponible. La cancha queda ocupada con timestamp de inicio.
Al cargar el resultado, la cancha se libera y el siguiente partido
de la cola pasa automáticamente a estado "Próximo 1".

**Pre-asignación de cancha (cola sin límite):**
Cualquier partido pendiente del torneo puede pre-asignarse a una cancha,
incluso si aún no se conocen las parejas (ej: "Semifinal 1 — por definir").
Cada cancha maneja una cola ordenada de partidos. El organizador
define el orden al asignar. Cuando se resuelven las parejas de un
partido pre-asignado (porque terminaron los partidos anteriores),
los nombres se actualizan automáticamente sin cambiar la posición en la cola.

**Reglas:**
- Un partido solo puede estar en la cola de UNA cancha a la vez
- Un partido en curso no puede reasignarse
- La cola se puede reordenar manualmente (drag & drop)
- Se puede quitar un partido de la cola en cualquier momento

### Schema actualizado
```sql
court_queue
  id, court_id, match_id, orden (integer), assigned_at
  -- Un match solo puede aparecer una vez en toda la tabla
  -- UNIQUE constraint en match_id
```

---

### 5. Dashboard de canchas 

Panel en tiempo real por torneo activo.
Muestra todas las canchas del torneo con su estado completo, con colores tipo semáforo.
- Rojo = Cancha Ocupada
- Amarillo = Cancha con partido en cola
- Verde = Cancha Libre

**Cancha libre:**
- Identificador + badge verde "Libre"
- Botón para asignar partido desde lista de pendientes

**Cancha ocupada:**
- Identificador + badge rojo "En juego"
- Parejas jugando (o "Por definir" si aún no están determinadas)
- Ronda del partido (ej: "Zona A", "Cuartos de Final")
- Tiempo transcurrido en vivo (se actualiza cada minuto)
- Lista de cola: Próximo 1, Próximo 2, etc. con nombre de parejas
  o "Por definir" si aún no están determinadas

El dashboard hace polling cada 30 segundos.

---

### 6. Vista general de zonas (nueva sección)

Panel adicional dentro de la vista de torneo que muestra
el estado operativo de todos los partidos pendientes.

**Sección A — Partidos sin cancha asignada:**
Lista de todos los partidos pendientes que no tienen cancha.
Por cada partido muestra:
- Zona o ronda
- Parejas (o "Por definir")
- Botón para asignar cancha

**Sección B — Partidos con cancha asignada:**
Lista de todos los partidos en cola (no en juego aún).
Por cada partido muestra:
- Zona o ronda
- Parejas (o "Por definir")
- Cancha asignada + posición en la cola (ej: "Cancha 2 — Próximo 1")
- Botón para quitar de la cola o mover a otra cancha

Esta vista le permite al organizador tener una visión completa
de la operación del torneo en un solo lugar, complementando
el dashboard de canchas.

---

### Actualización API endpoints
-- Cola de canchas
GET    /api/torneos/:id/canchas/estado     → dashboard completo en tiempo real
POST   /api/canchas/:canchaId/cola         → agregar partido a la cola
DELETE /api/canchas/:canchaId/cola/:matchId → quitar partido de la cola
PUT    /api/canchas/:canchaId/cola/orden   → reordenar cola (array de match_ids)
-- Vista general de partidos
GET    /api/torneos/:id/partidos/pendientes → todos los partidos pendientes
separados por con/sin cancha

---

### Actualización /server/logic/

Agregar:
- courts.js → manejar cola, validar unicidad de asignación,
  liberar cancha y promover siguiente en cola automáticamente
---

## Lógica del Cuadro Eliminatorio

### Principio general
Pasan TODAS las parejas. El cuadro se completa a la siguiente potencia de 2.
La diferencia se cubre con BYES.

### Tabla de cuadros
| Parejas | Cuadro | Byes | Partidos 1ra ronda |
|---------|--------|------|--------------------|
| 6       | 8      | 2    | 2 partidos         |
| 7       | 8      | 1    | 3 partidos         |
| 8       | 8      | 0    | 4 partidos         |
| 9       | 16     | 7    | 1 partido          |
| 10      | 16     | 6    | 2 partidos         |
| 11      | 16     | 5    | 3 partidos         |
| 12      | 16     | 4    | 4 partidos         |
| 13      | 16     | 3    | 5 partidos         |
| 14      | 16     | 2    | 6 partidos         |
| 15      | 16     | 1    | 7 partidos         |
| 16      | 16     | 0    | 8 partidos         |
| 17      | 32     | 15   | 1 partido          |
| 18      | 32     | 14   | 2 partidos         |
| 19      | 32     | 13   | 3 partidos         |
| 20      | 32     | 12   | 4 partidos         |
| 21      | 32     | 11   | 5 partidos         |
| 22      | 32     | 10   | 6 partidos         |
| 23      | 32     | 9    | 7 partidos         |
| 24      | 32     | 8    | 8 partidos         |

### Asignación de Byes (por mérito, sin sorteo)

Los byes se asignan según un ranking de clasificados que se calcula
en dos capas separadas. Esta separación es intencional para permitir
en el futuro incorporar un ranking histórico de jugadores sin modificar
la lógica de siembra.

**Capa 1 — Criterio de ranking (configurable a futuro)**
Hoy el ranking se calcula con los puntos obtenidos en la fase de grupos
del torneo actual. La función getRankingScore(pair, tournament) en
/server/logic/seeding.js debe ser la ÚNICA función que define este criterio.
En el futuro, esta función se reemplaza para incorporar puntos históricos
sin tocar nada más del sistema.

**Capa 2 — Orden de asignación (fijo)**
Con el ranking calculado, los byes se asignan en este orden:
1. Todos los 1° de zona, rankeados por score de mayor a menor
2. Si quedan byes: los mejores 2° de zona, rankeados por score
3. Si quedan byes: los mejores 3° de zona, rankeados por score

Desempate dentro del mismo score: diferencia de games
(games ganados - games perdidos en zona).
Si persiste el empate: el organizador define manualmente.

**Estructura preparada para ranking histórico**
La tabla de jugadores debe estar preparada desde el inicio
para acumular puntos históricos. La configuración de puntos
por instancia (cuánto suma llegar a cuartos, semis, final, etc.)
se define en una tabla de configuración separada.

### Schema preparado para ranking futuro
```sql
players
  id, nombre, apellido, telefono,
  ranking_points (integer, default 0),
  created_at

-- Relación jugador ↔ pareja (un jugador puede participar
-- en múltiples torneos con distintas parejas)
pair_players
  id, pair_id, player_id, player_num (1|2)

ranking_config
  id, instancia (zona|octavos|cuartos|semis|final|campeon),
  puntos (integer), activo (boolean)

ranking_history
  id, player_id, tournament_id, instancia, puntos_ganados,
  created_at
```

**Nota para el agente:**
Hoy la tabla players puede estar vacía o no usarse — las parejas
se registran igual con nombre/apellido directo en la tabla pairs
como está definido. La arquitectura de players queda creada y lista
para cuando se implemente el módulo de ranking histórico.
La función getRankingScore() en /server/logic/seeding.js
debe leer de pair.points_zona por ahora, con un comentario
explícito indicando dónde enchufar el ranking histórico.

### Clasificación a eliminatorias — Configurable por torneo

**Regla actual (v2):**
Por defecto el sistema clasifica:
- Zonas de 3 parejas → pasan 2 (1° y 2°)
- Zonas de 4 parejas → pasan 3 (1°, 2° y 3°)

Esta configuración se define al crear el torneo y puede modificarse
antes de que empiecen los partidos. No se puede cambiar una vez
iniciada la fase de grupos.

**Configuración:**
Al crear el torneo, el organizador define cuántos clasifican
según el tamaño de zona. El sistema sugiere los valores por defecto
pero permite modificarlos:

  Zona de 3 parejas → clasifican: [1 / 2 / 3*] (*todos)
  Zona de 4 parejas → clasifican: [1 / 2 / 3 / 4*] (*todos)

Si en un torneo hay zonas de distinto tamaño (ej: 2 zonas de 4
y 2 zonas de 3), se configura independientemente para cada tamaño.

**Impacto en el cuadro:**
El tamaño del cuadro se calcula DESPUÉS de aplicar la configuración
de clasificados. El sistema calcula cuántas parejas clasifican en total
y busca la siguiente potencia de 2 para armar el cuadro.

Ejemplo:
  12 parejas → 4 zonas de 3 → pasan 2 por zona → 8 clasificados
  → cuadro de 8 → 0 byes → cuadro limpio sin byes

**Las parejas que no clasifican simplemente no juegan más.**
No hay torneo de consolación. Se registra su posición final
dentro de la zona (3° de Zona A, 4° de Zona B, etc.)

**Schema preparado:**
```sql
-- Agregar a tournaments:
tournaments
  ... (campos existentes)
  clasifican_de_zona_3 (integer, default 2)
  clasifican_de_zona_4 (integer, default 3)

-- La posición final de los no clasificados queda en group_standings
-- con su posición dentro de la zona pero sin entrada en el cuadro
```

**Nota para el agente:**
La función buildSlots() en /server/logic/bracket.js debe recibir
el parámetro de clasificados por zona del torneo en lugar de
asumir que pasan todos. Dejar un comentario explícito indicando
que este parámetro viene de tournament.clasifican_de_zona_3
y tournament.clasifican_de_zona_4.

La función calcTorneo() en /server/logic/zonas.js también debe
actualizarse para calcular el tamaño del cuadro en base a los
clasificados reales, no al total de parejas.

### Siembra en el cuadro
- Clasificados rankeados globalmente: 1°s → 2°s → 3°s → 4°s
- Patrón de siembra clásico recursivo
- S1 y S2 en ramas opuestas → se cruzan en la Final si ganan todo
- Los 1° de zona nunca se cruzan antes de lo necesario
- Pareja con BYE espera al ganador del partido de su rama

---

## Integración WhatsApp
En todo lugar donde aparezca el nombre de una pareja → link clickeable.
Formato: https://wa.me/<telefono>

---

## Carga de Resultados
- Cada partido: Set 1, Set 2, Super Tiebreak (opcional)
- W.O.: se puede marcar manualmente o se asigna automáticamente
  si la pareja está marcada como Ausente
- Al guardar resultado: posiciones y cuadro se actualizan automáticamente
- Al guardar resultado: la cancha asignada se libera automáticamente

---

## Gestión de Múltiples Torneos
- Varios torneos el mismo día
- Navegación superior con selector de torneo activo
- Tabs progresivas por torneo:
  [Parejas] → [Presentismo] → [Zonas] → [Eliminatorias] → [Final]
- Botón "Finalizar Torneo" solo se habilita al cargar el resultado de la Final

---

## UI/UX
- Diseño responsivo, mobile-friendly
- Warning amarillo/naranja para: empates sin resolver, pagos pendientes,
  parejas sin marcar presencia
- Todos los warnings son visibles pero no bloqueantes
  (excepto empates de zona que bloquean el avance a eliminatorias)
- Dashboard de canchas accesible desde cualquier pantalla del torneo activo

---

## Schema de Base de Datos Completo (SQLite)
```sql
users
  id, username, password_hash, role (admin|asistente),
  nombre, activo, created_at

payment_methods
  id, nombre, descripcion, activo, created_at

tournaments
  id, name, status (activo|finalizado), created_at,
    clasifican_de_zona_3 (integer, default 2),
  clasifican_de_zona_4 (integer, default 3)

courts
  id, tournament_id, identificador, created_at

pairs
  id, tournament_id, player1_name, player1_surname,
  player2_name, player2_surname, phone, group_id, seed_rank,
  presente (boolean nullable), presente_at

payments
  id, tournament_id, pair_id, player_num (1|2),
  estado (sin_pago|parcial|pagado), created_at

payment_transactions
  id, payment_id, payment_method_id, monto, created_at

groups
  id, tournament_id, name (A|B|C|D|E|F), size (3|4)

matches
  id, tournament_id, stage (zona|eliminatoria),
  round (null|r1|octavos|cuartos|semis|final),
  group_id (nullable),
  pair1_id, pair2_id (nullable si BYE),
  set1_pair1, set1_pair2,
  set2_pair1, set2_pair2,
  supertb_pair1, supertb_pair2,
  winner_id (nullable),
  is_bye (boolean),
  is_wo (boolean),
  court_id (nullable),
  started_at (nullable),
  finished_at (nullable),
  played_at

group_standings
  id, group_id, pair_id,
  points, games_won, games_lost,
  position (nullable),
  position_override (boolean)
```

---

## API Endpoints (REST)
-- Auth
POST   /api/auth/login
POST   /api/auth/logout
-- Usuarios (solo admin)
GET    /api/usuarios
POST   /api/usuarios
PUT    /api/usuarios/:id
DELETE /api/usuarios/:id
-- Configuración (solo admin)
GET    /api/medios-pago
POST   /api/medios-pago
PUT    /api/medios-pago/:id
DELETE /api/medios-pago/:id
-- Torneos
POST   /api/torneos
GET    /api/torneos
GET    /api/torneos/:id
PUT    /api/torneos/:id/finalizar
-- Canchas del torneo
POST   /api/torneos/:id/canchas
GET    /api/torneos/:id/canchas
DELETE /api/torneos/:id/canchas/:canchaId
-- Parejas
POST   /api/torneos/:id/parejas
GET    /api/torneos/:id/parejas
PUT    /api/torneos/:id/parejas/:pairId/presente
PUT    /api/torneos/:id/parejas/:pairId/ausente
-- Pagos
GET    /api/torneos/:id/pagos
POST   /api/torneos/:id/pagos/:pairId/jugador/:playerNum/transaccion
PUT    /api/torneos/:id/pagos/:pairId/jugador/:playerNum/estado
-- Zonas
GET    /api/torneos/:id/zonas
PUT    /api/torneos/:id/zonas/:zonaId/posiciones
-- Cuadro
GET    /api/torneos/:id/cuadro
-- Partidos
PUT    /api/partidos/:id/iniciar        → asigna cancha + timestamp inicio
PUT    /api/partidos/:id/resultado      → carga resultado + libera cancha
PUT    /api/partidos/:id/wo             → marca W.O.
-- Dashboard canchas
GET    /api/torneos/:id/canchas/estado  → estado en tiempo real de todas las canchas

---

## Lógica de Negocio — Ubicación
/server/logic/
zonas.js        → generación de zonas y partidos
standings.js    → posiciones y detección de empates
bracket.js      → generación del cuadro eliminatorio
seeding.js      → patrón de siembra clásico recursivo
courts.js       → asignación y liberación de canchas
wo.js           → lógica de walkover y ausencias
payments.js     → cálculo de estado de pago por jugador

---

## Estructura del Proyecto
/client
/src
/components
/pages
/auth          → Login
/config        → ABM usuarios, medios de pago
/torneos       → Crear, lista, detalle
/presentismo   → Pagos y presencia
/zonas         → Fase de grupos
/eliminatorias → Cuadro
/canchas       → Dashboard en tiempo real
/store           → Zustand
/server
/db              → torneo.db + migraciones
/middleware      → auth JWT
/routes
/logic
package.json       → npm workspaces
.env               → JWT_SECRET, ADMIN_USER, ADMIN_PASSWORD

---

## Setup

- `npm install` desde la raíz
- Configurar `.env` con credenciales del admin inicial
- `npm run dev` → levanta frontend y backend
- `npm run start` → modo producción para VPS
- README en castellano con instrucciones de instalación y deploy en VPS

---

## Archivos de Referencia en /MockUps

- **padel-cuadro.html** → Lógica funcional de zonas, byes y siembra en JS.
  Migrar calcTorneo(), buildSlots() y seedingPositions() a /server/logic/
- **mockup_inicio.html** → Referencia visual pantalla de inicio
- **mockup_crear_torneo.html** → Referencia visual creación de torneo y carga de parejas
- **mockup_zonas.html** → Referencia visual zonas y resultados
- **mockup_eliminatorias.html** → Referencia visual cuadro eliminatorio

Los mockups son solo referencia de diseño. El HTML del cuadro
contiene lógica real que debe migrarse al backend.

---

## Notas Importantes para el Agente

1. Arrancar por `/server/logic/` y `/server/middleware/auth.js` antes del frontend
2. El usuario admin inicial se crea automáticamente al levantar el servidor
   si no existe ningún usuario en la base de datos
3. La lógica de canchas es crítica: nunca permitir asignar una cancha ocupada
4. El W.O. por ausencia se propaga automáticamente a todos los partidos
   pendientes de esa pareja al marcarla como Ausente
5. El dashboard de canchas requiere datos en tiempo real —
   implementar polling cada 30 segundos desde el frontend
6. Los warnings de pago y presentismo son visibles pero nunca bloqueantes
7. Solo los empates de zona bloquean el avance al cuadro eliminatorio
8. El sistema de roles está preparado para escalar:
   usar una tabla de permisos o un objeto de configuración de roles
   que sea fácil de extender en el futuro