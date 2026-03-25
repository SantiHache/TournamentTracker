# Pádel Torneo Manager — Aplicación Full Stack

## Descripción General
Aplicación web full-stack para gestionar torneos de Pádel.
Se instala localmente y se accede desde el navegador.
Todo el sistema está en castellano: labels, botones, mensajes, errores y notificaciones.

---


## Stack Tecnológico
- **Frontend:** React (Vite), React Router, Zustand para estado global
- **Backend:** Node.js + Express
- **Base de datos:** SQLite (archivo único `.db`, usando `better-sqlite3`)
- **Estilos:** Tailwind CSS
- **Package manager:** npm con workspaces

---

## Flujo General de la Aplicación

1. Pantalla de inicio → lista de torneos creados + botón "Nuevo Torneo"
2. Crear torneo → nombre + selección de cantidad de parejas (ver opciones válidas abajo)
3. Cargar parejas → formulario hasta completar todas
4. Sistema genera zonas y cruces automáticamente
5. Jugar fase de grupos → cargar resultados
6. Sistema genera cuadro eliminatorio con siembra
7. Jugar fases eliminatorias → cargar resultados
8. Finalizar torneo al cargar el resultado de la Final

---

## Creación del Torneo — Selección de Parejas

Al crear un torneo, el usuario NO tipea un número libre.
El sistema presenta un selector con las siguientes opciones válidas únicamente:

  6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24 parejas

Cada opción muestra también la distribución de zonas resultante.
Ejemplo: "12 parejas — 4 zonas de 3" / "14 parejas — 2 zonas de 4 + 2 zonas de 3"

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

Distribución: se divide en zonas de 3 o 4 parejas únicamente.
Las zonas de 4 se asignan primero, el resto son de 3.
Ejemplo: 14 parejas → 4 zonas → 2 zonas de 4 + 2 zonas de 3.

### Formato de partidos en zona — REGLA FIJA

**Zonas de 3 parejas → round-robin (todos contra todos):**
- Partido 1: Pareja 1 vs Pareja 2
- Partido 2: Pareja 1 vs Pareja 3
- Partido 3: Pareja 2 vs Pareja 3
- Cada pareja juega exactamente 2 partidos

**Zonas de 4 parejas → formato copa (siempre 2 partidos por pareja):**
- Ronda 1: Pareja 1 vs Pareja 3  y  Pareja 2 vs Pareja 4
  (posiciones 1,2,3,4 asignadas aleatoriamente al crear la zona)
- Ronda 2: Ganador P1 vs Ganador P2  (define 1° y 2° de zona)
            Perdedor P1 vs Perdedor P2 (define 3° y 4° de zona)
- Cada pareja juega exactamente 2 partidos

En ambos formatos cada pareja juega SIEMPRE exactamente 2 partidos de zona.

### Puntuación en zona
- Victoria: 2 puntos
- Derrota: 0 puntos
- Cada pareja acumula 0, 2 o 4 puntos al final de la zona

### Resolución de empates
- El sistema NO resuelve empates automáticamente
- Al finalizar todos los partidos de una zona, si dos o más parejas
  tienen los mismos puntos, se muestra:
  ⚠️ "Empate en Zona X — Definir posiciones manualmente"
- El organizador reordena con flechas ↑↓ o drag & drop
- Confirma con "Confirmar posiciones"
- Mientras haya empate sin resolver, el avance a eliminatorias está BLOQUEADO

---

## Lógica del Cuadro Eliminatorio

### Principio general
Pasan TODAS las parejas de todos los grupos a la fase eliminatoria.
El cuadro se completa a la siguiente potencia de 2.
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
Los byes se asignan en este orden de prioridad:
1. Todos los 1° de zona, rankeados por puntos de mayor a menor
2. Si quedan byes: los mejores 2° de zona, rankeados por puntos
3. Si quedan byes: los mejores 3° de zona, rankeados por puntos

Desempate para rankear: diferencia de games (games ganados - games perdidos).
Si persiste el empate: el organizador define manualmente (mismo mecanismo que empates de zona).

### Siembra en el cuadro (seeding)
Los clasificados se rankean globalmente:
  1°s (mejor a peor) → 2°s (mejor a peor) → 3°s → 4°s

El cuadro se arma con el patrón de siembra clásico:
- El sembrado S1 (mejor clasificado) va al slot 0
- El sembrado S2 va al slot opuesto (mitad inferior)
- S3 y S4 en las ramas intermedias opuestas entre sí
- Y así recursivamente

Resultado garantizado: si todos los sembrados ganan,
S1 vs S2 se da en la Final, S1 vs S3 y S2 vs S4 en Semis, etc.
Los primeros de zona NUNCA se cruzan antes de lo necesario.

### Byes en el cuadro
- Los `byes` mejores sembrados reciben BYE
- El sembrado con BYE pasa directo a la siguiente ronda
- En el cuadro visual, su slot inferior muestra "Ganador del partido ↓"
  indicando que espera al ganador del partido que se juega en esa rama
- Cada pareja aparece UNA SOLA VEZ en todo el cuadro

---

## Registro de Parejas

Cada pareja tiene:
- Nombre del Jugador 1 (nombre + apellido)
- Nombre del Jugador 2 (nombre + apellido)
- Teléfono de contacto (con código de país, sin formato)

Al completar TODAS las parejas del torneo, el sistema genera
automáticamente las zonas (asignación aleatoria) y los cruces.

---

## Integración WhatsApp

En todo lugar donde aparezca el nombre de una pareja → link clickeable.
Formato: https://wa.me/<telefono>
Abre WhatsApp Web directamente.

---

## Carga de Resultados

- Cada partido tiene campos: Set 1, Set 2, Super Tiebreak (opcional)
- Formato por set: número simple (ej: 6, 4, 7)
- Al guardar un resultado, posiciones y cuadro se actualizan automáticamente
- Partidos jugados se distinguen visualmente de los pendientes
- No se puede cargar resultado de una fase si la anterior no está completa
  (excepción: dentro de la misma zona los partidos son independientes)

---

## Gestión de Múltiples Torneos

- Se pueden crear varios torneos el mismo día
- Navegación superior muestra lista de todos los torneos
- Se puede cambiar de torneo en cualquier momento sin perder datos
- Cada torneo tiene estado: Activo / Finalizado
- Botón "Finalizar Torneo" solo se habilita al cargar el resultado de la Final
- Torneos finalizados muestran badge o trofeo

---

## UI/UX

- Diseño responsivo, mobile-friendly
- Navegación superior: nombre de la app + selector de torneo activo
- Vista de torneo con tabs progresivas:
  [Parejas] → [Zonas] → [Eliminatorias] → [Final]
- Las tabs se habilitan a medida que avanza el torneo
- Nombres de parejas siempre como links de WhatsApp
- WARNING visible (color amarillo/naranja) para empates sin resolver
- Mientras hay empate sin resolver, botón de avance deshabilitado con mensaje explicativo

---

## Schema de Base de Datos (SQLite)
```sql
tournaments
  id, name, status (activo|finalizado), created_at

pairs
  id, tournament_id, player1_name, player1_surname,
  player2_name, player2_surname, phone, group_id, seed_rank

groups
  id, tournament_id, name (A|B|C|D|E|F), size (3|4)

matches
  id, tournament_id, stage (zona|eliminatoria),
  round (null para zona | r1|octavos|cuartos|semis|final),
  group_id (null si es eliminatoria),
  pair1_id, pair2_id (null si es BYE),
  set1_pair1, set1_pair2,
  set2_pair1, set2_pair2,
  supertb_pair1, supertb_pair2,
  winner_id (null hasta que se cargue resultado),
  is_bye (boolean),
  played_at

group_standings
  id, group_id, pair_id,
  points, games_won, games_lost,
  position (null hasta resolver empates),
  position_override (boolean, true si fue definida manualmente)
```

---

## API Endpoints (REST)
POST   /api/torneos                              → crear torneo
GET    /api/torneos                              → listar todos
GET    /api/torneos/:id                          → torneo completo
PUT    /api/torneos/:id/finalizar                → marcar finalizado
POST   /api/torneos/:id/parejas                  → agregar pareja
GET    /api/torneos/:id/parejas                  → listar parejas
GET    /api/torneos/:id/zonas                    → zonas + partidos + posiciones
PUT    /api/torneos/:id/zonas/:zonaId/posiciones → resolver empate manualmente
GET    /api/torneos/:id/cuadro                   → cuadro eliminatorio completo
PUT    /api/partidos/:id/resultado               → cargar resultado (avanza el cuadro)

---

## Lógica de Negocio — Ubicación

Toda la lógica debe vivir en `/server/logic/` como funciones puras y testeables:

- `zonas.js`      → generación de zonas, asignación aleatoria, partidos de zona
- `standings.js`  → cálculo de posiciones, detección de empates
- `bracket.js`    → generación del cuadro, algoritmo de siembra, asignación de byes
- `seeding.js`    → patrón de siembra clásico (recursivo), distribución en ramas opuestas

El frontend NUNCA calcula posiciones ni genera cuadros.
Siempre consulta la API.

---

## Estructura del Proyecto
/client                   → Frontend React (Vite)
/src/components
/src/pages
/src/store              → Zustand
/server
/db                     → torneo.db + migraciones
/routes                 → endpoints REST
/logic                  → funciones puras de negocio
package.json              → npm workspaces

---

## Setup

- `npm install` desde la raíz instala todo
- `npm run dev` levanta frontend y backend simultáneamente (concurrently)
- README en castellano con instrucciones de instalación paso a paso

---

## Notas Importantes para el Agente

1. Empezar por `/server/logic/` — construir y testear la lógica pura antes del frontend
2. La generación del cuadro eliminatorio es la parte más crítica: respetar exactamente
   el algoritmo de siembra y la lógica de byes descripta arriba
3. En zonas de 4: los 4 partidos son dependientes (ronda 2 depende de ronda 1).
   En zonas de 3: los 3 partidos son independientes entre sí.
4. Validar siempre que cada pareja aparezca exactamente una vez en el cuadro
5. El avance de fases siempre lo controla el backend
6. Manejar correctamente el caso de BYE: pair2_id = null, is_bye = true,
   winner_id = pair1_id automáticamente
   
###Adjunto los siguientes archivos de referencia:

- **padel-cuadro.html** — Visualizador funcional del cuadro eliminatorio.
   Contiene la lógica de zonas, byes y siembra ya implementada en JS.
   Usá el código de las funciones calcTorneo(), buildSlots() y
   seedingPositions() como base para implementar los equivalentes
   en /server/logic/bracket.js y /server/logic/seeding.js

- **mockup-inicio.html** — Referencia visual de la pantalla de inicio.
- **mockup-crear.html** — Referencia visual de creación de torneo y carga de parejas.
- **mockup-zonas.html** — Referencia visual de zonas y carga de resultados.
- **mockup-eliminatorias.html** — Referencia visual del cuadro eliminatorio.

Los mockups son solo referencia de diseño. El HTML del cuadro
contiene lógica real que debe migrarse al backend.
