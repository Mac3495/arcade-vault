# SPEC game-jam — Integración del juego MUDA

> **Estado:** Borrador (candidato game-jam)
> **Depende de:** 06-games-table-leaderboard-supabase
> **Fecha:** 2026-07-09
> **Objetivo:** Integrar MUDA, un puzzle de reacomodo de serpiente para la game jam de tema "Snake", como juego jugable en Arcade Vault, conectando el leaderboard de Supabase.

---

## Concepto

La serpiente clásica avanza sola, come y crece hasta chocar contra algo. MUDA le da la vuelta:
no hay comida ni crecimiento — la serpiente tiene **largo fijo** desde el inicio del nivel y el
reto es puramente espacial: reubicar su cuerpo, casilla a casilla, hasta que ocupe **exactamente**
el molde de celdas objetivo marcado en la grilla (como si mudara de piel hacia esa forma exacta),
sin cruzarse a sí misma y dentro de un presupuesto de movimientos. Es un puzzle de planificación
(estilo Sokoban/Hamiltoniano), no un juego de reflejos.

---

## Scope

**In:**

- Insertar la fila `muda` en la tabla `games` de Supabase (seed manual vía SQL).
- Crear `components/games/MudaGame.tsx` — componente React `"use client"` que encapsula el
  canvas 640×640 y el motor de puzzle (grilla, serpiente de largo fijo, patrón objetivo,
  detección de nivel resuelto/atascado), construido desde cero para este spec. Acepta props:
  `paused`, `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`.
- Crear `app/games/muda/play/page.tsx` — play-page específica para este juego. Gestiona el
  estado (`score`, `lives`, `level`, pausa, game over) y pasa callbacks al componente canvas.
- Wiring del modal de game over: pre-rellenar nombre desde `localStorage.getItem('av_player_name')`;
  al confirmar, guardar nombre en localStorage e insertar score en la tabla `scores` vía cliente
  browser.
- Botón de pausa de la plataforma pasa el flag `paused` al componente canvas, que congela la
  entrada de teclado (el puzzle es por turnos: sin `paused` no hay animación continua que
  congelar, solo se ignoran las teclas).
- Mecánica de nivel: grilla `N×N` con `N = min(6 + floor((level - 1) / 3), 12)`; un patrón de
  celdas objetivo generado proceduralmente (garantizando conectividad, es decir que exista al
  menos un camino Hamiltoniano válido dentro del patrón); una serpiente cuyo largo inicial es
  igual a la cantidad de celdas objetivo, colocada sobre una porción conectada de esas celdas.
- Movimiento discreto: cada pulsación de flecha/WASD avanza la cabeza una celda y retrae la
  cola una celda (el largo nunca cambia — no hay ítems para comer).
- Detección de nivel resuelto: cuando el conjunto de celdas ocupadas por el cuerpo coincide
  exactamente con el conjunto de celdas objetivo, se otorgan puntos y se avanza al siguiente
  nivel con una grilla nueva.
- Detección de nivel fallido (atasco): si la cabeza no tiene ningún movimiento legal
  disponible (los 4 vecinos son borde de grilla, pared o cuerpo propio distinto de la cola
  que se retraería), o si `moves_used` supera el `par` del nivel (`par = 2 × cantidad de
  celdas objetivo`) sin resolver, se resta 1 vida, el nivel se reinicia desde su configuración
  inicial y el contador de movimientos vuelve a cero.
- Tecla `R`: reinicia manualmente el nivel actual desde su configuración inicial sin costar
  una vida (para cuando el jugador se da cuenta de que se atascó antes de que el motor lo
  detecte).
- HUD interno del canvas: `score`, `nivel`, `vidas`, movimientos usados / par del nivel actual.
- Eliminar únicamente el overlay "GAME OVER" del canvas — el modal React de la plataforma lo
  reemplaza. El resto del HUD interno se conserva intacto.

**Fuera de alcance:**

- Crear las tablas `games` o `scores` en Supabase — ya existen (spec 06).
- Supabase Auth — `user_id` se almacena como `null` en todos los scores.
- RLS (Row Level Security) — se configura en un spec futuro de seguridad.
- Realtime — el leaderboard no se actualiza en vivo; solo al cargar la página.
- Paginación del leaderboard — se muestran los top 10 fijos.
- Controles táctiles, mouse o mobile.
- Actualización automática de `best` y `plays` en la tabla `games` — campos estáticos.
- Un solver exhaustivo que verifique de forma matemáticamente garantizada que todo patrón
  generado proceduralmente admite solución óptima; basta con la heurística de generación por
  camino Hamiltoniano descrita arriba.
- Editor de niveles o niveles curados a mano — todos los patrones se generan
  proceduralmente en tiempo de ejecución.
- Animación de partículas de "muda de piel" — el redibujado del cuerpo entre celdas es
  instantáneo/discreto, sin easing ni efectos visuales adicionales.
- Deshacer movimientos individuales (undo paso a paso) — solo existe el reinicio completo
  del nivel vía `R`.

---

## Data model

### Seed en Supabase — tabla `games`

Ejecutar en el SQL Editor de Supabase:

```sql
INSERT INTO games (id, title, short, long, cat, cover, color)
VALUES (
  'muda', 'MUDA', 'Reacomoda tu cuerpo para calzar el molde exacto.',
  'Tu serpiente no come ni crece: solo se desliza, casilla a casilla, hasta ocupar exactamente el molde marcado en la grilla. Planifica cada paso antes de quedarte sin movimientos ni vidas.',
  'PUZZLE', 'cover-snake', 'green'
);
```

### Props del componente `MudaGame`

```ts
interface MudaGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}
```

No se introducen nuevas tablas ni tipos TypeScript — se reutilizan `GameRow` y `ScoreRow` de
`app/lib/supabase/types.ts`.

---

## Implementation plan

1. **Seed en Supabase** — ejecutar el INSERT de la fila `muda` en el SQL Editor de Supabase.
   Verificación: la card de MUDA aparece en `/games`.

2. **Crear `components/games/MudaGame.tsx`** — componente `"use client"` que:
   - Renderiza un `<canvas>` de 640×640.
   - Contiene el motor de puzzle completo, construido desde cero: generación procedural de
     la grilla `N×N` y del patrón de celdas objetivo por nivel, colocación inicial de la
     serpiente, movimiento discreto por tecla (flechas/WASD), detección de nivel resuelto y
     de atasco, cálculo de `par` y `moves_used`.
   - Recibe prop `paused: boolean` — si es `true`, el listener de teclado ignora las
     pulsaciones de movimiento (el juego es por turnos, no hay loop de animación que
     congelar).
   - Otorga puntaje al resolver un nivel: `+100` puntos base más `+10` por cada movimiento
     que quede por debajo del `par` al momento de resolver (sin penalización si se excede el
     `par` pero se resuelve antes del límite de atasco).
   - Llama a `onScoreChange`, `onLivesChange`, `onLevelChange` cada vez que esos valores
     cambian (comparando con el valor anterior antes de disparar el callback).
   - Llama a `onGameOver(score)` cuando `lives` llega a 0 tras un atasco.
   - Escucha `keydown` para flechas/WASD (mover) y `R` (reiniciar nivel actual sin costo de
     vida); limpia el listener en el `return` del `useEffect`.
   - El overlay canvas "GAME OVER" se elimina del `draw()`; el HUD interno (score, nivel,
     vidas, movimientos/par) se mantiene sin cambios.
     Verificación: el juego arranca en `/games/muda/play` y es jugable con flechas/WASD; al
     completar el patrón objetivo el nivel avanza y la grilla crece; al atascarse tres veces
     el juego termina.

3. **Crear `app/games/muda/play/page.tsx`** — play-page específica:
   - Importa `MudaGame` con `dynamic(..., { ssr: false })`.
   - Estado local: `score`, `lives`, `level`, `paused`, `over`, `name`, `saved`, `gameKey`.
   - Al montar el modal de game over (`over === true`), lee
     `localStorage.getItem('av_player_name')` y pre-rellena el campo `name`.
   - Al confirmar, persiste el nombre en `av_player_name` e inserta en `scores`:
     `{ game_id: 'muda', player_name: name, score, user_id: null }`.
   - Marca `saved: true` para deshabilitar el botón y evitar doble inserción.
   - Reutiliza el mismo layout visual (HUD React + CRT + modal game over) que
     `app/games/arkanoid/play/page.tsx`.
     Verificación: el HUD React muestra score/vidas/nivel en tiempo real; tras una partida el
     score aparece en `/games/muda` y en `/hall-of-fame` al recargar.

4. **Verificación final** — `npm run build` completa sin errores de TypeScript. Ninguna ruta
   existente devuelve 500.

---

## Acceptance criteria

- [ ] La card de MUDA aparece en `/games`.
- [ ] `/games/muda` carga con los datos reales del juego y el leaderboard top 10.
- [ ] `/games/muda/play` carga sin errores de SSR ni de TypeScript.
- [ ] El canvas renderiza la grilla, el patrón objetivo y la serpiente, y es jugable con
      flechas/WASD.
- [ ] Cada pulsación de movimiento avanza la cabeza y retrae la cola una sola celda (el largo
      de la serpiente nunca cambia).
- [ ] Al ocupar exactamente el patrón objetivo, el nivel se marca resuelto, se suman puntos y
      se genera una grilla nueva (más grande según corresponda) con nivel incrementado.
- [ ] Si la cabeza no tiene movimientos legales, o se supera el `par` de movimientos sin
      resolver, se resta 1 vida y el nivel se reinicia desde su configuración inicial.
- [ ] La tecla `R` reinicia el nivel actual sin restar vidas.
- [ ] El HUD interno del canvas (score, nivel, vidas, movimientos/par) se dibuja correctamente
      durante la partida.
- [ ] El HUD React de la plataforma refleja en tiempo real score, vidas y nivel.
- [ ] El botón "PAUSA" congela la entrada de teclado; "REANUDAR" la restaura.
- [ ] Al agotar las 3 vidas, aparece el modal React de game over con la puntuación final.
- [ ] El overlay "GAME OVER" del canvas ya no se dibuja (el modal React lo reemplaza).
- [ ] El botón "JUGAR DE NUEVO" reinicia la partida desde el nivel 1, 3 vidas y score 0.
- [ ] Al abrir el modal, el campo de nombre se pre-rellena con `av_player_name` de localStorage
      si existe.
- [ ] Al confirmar, el score se inserta en Supabase y el nombre se persiste en localStorage.
- [ ] El botón "GUARDAR PUNTUACIÓN" se deshabilita tras el primer envío (sin doble inserción).
- [ ] El score guardado aparece en `/games/muda` y en `/hall-of-fame` al recargar.
- [ ] Cuando no hay scores, el leaderboard muestra "Sé el primero en entrar al salón de la fama".
- [ ] `/hall-of-fame` muestra un tab para MUDA.
- [ ] `npm run build` completa sin errores de TypeScript.
- [ ] Ninguna ruta existente devuelve 500.

---

## Decisions

- **Sí: Doble HUD** — el canvas conserva su HUD interno (score, nivel, vidas, movimientos/par)
  y React muestra los mismos valores en el HUD de la plataforma. Razón: el juego funciona
  visualmente como standalone dentro del canvas, y la plataforma necesita los valores para
  integraciones futuras.

- **Sí: Callbacks como interfaz de comunicación** — el componente canvas llama a
  `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver` cuando el estado cambia.
  Razón: desacoplamiento limpio; el juego no sabe nada de React ni de la plataforma.

- **Sí: `dynamic(..., { ssr: false })`** — el componente canvas se carga solo en cliente.
  Razón: `canvas` no existe en el entorno Node.js de Next.js SSR.

- **Sí: Play-page específica `app/games/muda/play/page.tsx`** — en lugar de modificar la ruta
  genérica `[id]/play`. Razón: evita condicionales en la ruta genérica; Next.js App Router da
  prioridad a rutas estáticas sobre dinámicas.

- **Sí: Un único spec combinado (juego + leaderboard)** — las tablas `games` y `scores` ya
  existen; solo se añade la fila del juego y el wiring. Separarlos no aportaría valor visible.

- **Sí: Movimiento discreto por turnos en vez de tick continuo** — cada pulsación mueve una
  sola celda. Razón: es lo que convierte la premisa de "Snake" en un puzzle de planificación
  (categoría PUZZLE) en lugar de un juego de reflejos en tiempo real (categoría ARCADE).

- **Sí: Largo fijo sin comida** — la serpiente nunca crece. Razón: eliminar el crecimiento es
  la reinterpretación central del tema; el reto pasa de "sobrevivir creciendo" a "encajar una
  forma fija en un molde exacto".

- **No: Crear tablas nuevas por juego** — se reutilizan `games` y `scores` del spec 06. Razón:
  el modelo es suficientemente genérico para cualquier juego con score numérico.

- **No: RLS en este spec** — las tablas quedan abiertas (INSERT y SELECT públicos). Razón: se
  mitiga en el spec futuro de seguridad.

- **No: Realtime en leaderboards** — los scores se ven al recargar. Razón: la complejidad de
  subscriptions no aporta valor mientras haya pocos jugadores activos.

- **No: Componente genérico `CanvasGame`** — cada juego tiene su componente propio. Razón:
  YAGNI; generalizar ahora sería abstraer sin caso de uso suficientemente confirmado.
</content>
