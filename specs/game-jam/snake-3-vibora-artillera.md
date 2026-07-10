# SPEC — Integración del juego VÍBORA ARTILLERA

> **Estado:** Borrador (candidato game-jam)
> **Depende de:** 06-games-table-leaderboard-supabase
> **Fecha:** 2026-07-09
> **Objetivo:** Integrar VÍBORA ARTILLERA como juego jugable en Arcade Vault: una reinterpretación shooter del tema "Snake" del game jam, donde cada segmento de la cola dispara solo.

---

## Scope

**In:**

- Insertar la fila `vibora-artillera` en la tabla `games` de Supabase (seed manual vía SQL).
- Crear `components/games/ViboraArtilleraGame.tsx` — componente React `"use client"` que encapsula el canvas 800×600 y el game loop, escrito desde cero para este spec. Acepta props: `paused`, `onScoreChange`, `onLevelChange`, `onGameOver`.
- Crear `app/games/vibora-artillera/play/page.tsx` — play-page específica para este juego. Gestiona el estado (`score`, `level`, pausa, game over) y pasa callbacks al componente canvas.
- Wiring del modal de game over: pre-rellenar nombre desde `localStorage.getItem('av_player_name')`; al confirmar, guardar nombre en localStorage e insertar score en la tabla `scores` vía cliente browser.
- Botón de pausa de la plataforma pasa el flag `paused` al componente canvas, que congela el game loop (movimiento, disparo automático y de enemigos).
- El HUD interno del canvas (score, nivel/longitud) se dibuja dentro del canvas y se conserva.

**Fuera de alcance:**

- Crear las tablas `games` o `scores` en Supabase — ya existen (spec 06).
- Supabase Auth — `user_id` se almacena como `null` en todos los scores.
- RLS (Row Level Security) — se configura en un spec futuro de seguridad.
- Realtime — el leaderboard no se actualiza en vivo; solo al cargar la página.
- Paginación del leaderboard — se muestran los top 10 fijos.
- Controles táctiles o mobile.
- Actualización automática de `best` y `plays` en la tabla `games` — campos estáticos.
- Multijugador o modos alternativos (solo un modo de partida individual).

---

## Diseño del juego

Reinterpretación del "Snake" clásico dentro de la categoría SHOOTER: en vez de que la cola sea solo un obstáculo pasivo, **cada segmento de la cola es una torreta que dispara sola** al enemigo más cercano dentro de su radio, mientras la cabeza dispara automáticamente hacia adelante. El jugador sigue dirigiendo el movimiento en grilla como en Snake (girar, no invertir), pero la tensión ahora es doble: maniobrar para no chocar contra la pared o la propia cola, **y** posicionar el cuerpo para maximizar la cobertura de fuego contra los enemigos que avanzan. La velocidad del movimiento aumenta con la longitud de la cola, igual que en la premisa original, haciendo cada vez más difícil esquivar mientras la potencia de fuego crece.

- `id`: `vibora-artillera`
- `title`: `VÍBORA ARTILLERA`
- `short`: `Cada segmento dispara; un giro en falso te mata.` (48 caracteres)
- `long`: `Guías una serpiente de energía que crece al devorar núcleos y dispara sola desde cada segmento de su cola. Cuanto más larga y letal se vuelve, más rápido se mueve — y un giro en falso contra tu propia cola o la pared termina la partida al instante.`
- `cat`: `SHOOTER` (fijada por la variante 3)
- `color`: `green` — evoca el veneno/energía de la serpiente y distingue el juego de los cyan/yellow ya usados en Asteroids/Tetris/Arkanoid.
- `cover`: `cover-snake` — clase ya existente en `app/globals.css`, temáticamente exacta (fondo verde oscuro tipo serpiente) y sin usar todavía por ningún juego implementado.
- Canvas: **800×600 px**, grilla lógica de 40×30 celdas de 20×20 px.
- Controles: **Flechas / WASD** para girar la dirección de la cabeza (no se permite invertir 180° directamente sobre la propia cola). **Espacio** dispara una ráfaga extra inmediata desde la cabeza (con cooldown corto), como refuerzo manual sobre el disparo automático.
- HUD expuesto: `score` (puntos por enemigo destruido) y `level` (nivel de longitud/velocidad de la serpiente, sube cada 3 segmentos de cola ganados).
- Condición de game over: la cabeza colisiona con una pared, con cualquier segmento de su propia cola, o con un enemigo (contacto directo).

---

## Data model

### Seed en Supabase — tabla `games`

Ejecutar en el SQL Editor de Supabase:

```sql
INSERT INTO games (id, title, short, long, cat, cover, color)
VALUES (
  'vibora-artillera', 'VÍBORA ARTILLERA', 'Cada segmento dispara; un giro en falso te mata.',
  'Guías una serpiente de energía que crece al devorar núcleos y dispara sola desde cada segmento de su cola. Cuanto más larga y letal se vuelve, más rápido se mueve — y un giro en falso contra tu propia cola o la pared termina la partida al instante.',
  'SHOOTER', 'cover-snake', 'green'
);
```

### Props del componente `ViboraArtilleraGame`

```ts
interface ViboraArtilleraGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}
```

No se introducen nuevas tablas ni tipos TypeScript — se reutilizan `GameRow` y `ScoreRow` de `app/lib/supabase/types.ts`.

---

## Implementation plan

1. **Seed en Supabase** — ejecutar el INSERT de la fila `vibora-artillera` en el SQL Editor de Supabase.
   Verificación: la card de VÍBORA ARTILLERA aparece en `/games`.

2. **Crear `components/games/ViboraArtilleraGame.tsx`** — componente `"use client"` que:
   - Renderiza un `<canvas>` de 800×600 sobre una grilla lógica de 40×30 celdas.
   - Implementa el game loop de movimiento en grilla tipo Snake: la cabeza avanza una celda por tick (el intervalo del tick decrece a medida que crece la longitud de la cola), gira con flechas/WASD, y arrastra los segmentos de cola siguiendo la trayectoria de la cabeza.
   - Cada tick, la cabeza dispara automáticamente un proyectil hacia su dirección de avance; cada segmento de la cola dispara automáticamente al enemigo vivo más cercano dentro de un radio fijo, con su propio cooldown independiente.
   - `Espacio` dispara una ráfaga extra inmediata desde la cabeza, sujeta a un cooldown corto propio (no reemplaza el disparo automático).
   - Spawea enemigos ("plagas") en los bordes de la grilla que avanzan hacia el jugador o deambulan; mueren con un solo impacto de proyectil y otorgan puntos al `score`.
   - Spawea núcleos de energía en celdas libres; al ser tocados por la cabeza, añaden un segmento a la cola y aumentan `level` cada 3 segmentos ganados (lo que a su vez sube la velocidad de tick y el rango de disparo de las torretas).
   - Recibe prop `paused: boolean` — si es `true`, el loop llama a `draw()` pero no avanza el tick de movimiento, disparo ni spawns.
   - Llama a `onScoreChange` y `onLevelChange` cada vez que esos valores cambian dentro del loop (comparando con el valor anterior antes de disparar el callback).
   - Llama a `onGameOver(score)` cuando la cabeza colisiona con una pared, con su propia cola o con un enemigo.
   - El HUD interno del canvas (score, nivel) se dibuja en una esquina, sin overlay de "GAME OVER" (el modal React lo reemplaza).
   - Limpia los event listeners de teclado en el `return` del `useEffect`.
     Verificación: el juego arranca en `/games/vibora-artillera/play` y es jugable con flechas/WASD y Espacio.

3. **Crear `app/games/vibora-artillera/play/page.tsx`** — play-page específica:
   - Importa `ViboraArtilleraGame` con `dynamic(..., { ssr: false })`.
   - Estado local: `score`, `level`, `paused`, `over`, `name`, `saved`, `gameKey`.
   - Al montar el modal de game over (`over === true`), lee `localStorage.getItem('av_player_name')` y pre-rellena el campo `name`.
   - Al confirmar, persiste el nombre en `av_player_name` e inserta en `scores`: `{ game_id: 'vibora-artillera', player_name: name, score, user_id: null }`.
   - Marca `saved: true` para deshabilitar el botón y evitar doble inserción.
   - Reutiliza el mismo layout visual (HUD React + CRT + modal game over) que `app/games/arkanoid/play/page.tsx`.
     Verificación: el HUD React muestra score y nivel en tiempo real; tras una partida el score aparece en `/games/vibora-artillera` y en `/hall-of-fame` al recargar.

4. **Verificación final** — `npm run build` completa sin errores de TypeScript. Ninguna ruta existente devuelve 500.

---

## Acceptance criteria

- [ ] La card de VÍBORA ARTILLERA aparece en `/games`.
- [ ] `/games/vibora-artillera` carga con los datos reales del juego y el leaderboard top 10.
- [ ] `/games/vibora-artillera/play` carga sin errores de SSR ni de TypeScript.
- [ ] El canvas renderiza el juego y es jugable con flechas/WASD y Espacio.
- [ ] La cabeza avanza en grilla, gira con las teclas de dirección y no puede invertirse 180° directamente sobre su propia cola.
- [ ] La velocidad de movimiento aumenta a medida que crece la longitud de la cola.
- [ ] La cabeza dispara automáticamente hacia adelante y cada segmento de la cola dispara automáticamente al enemigo más cercano en su radio.
- [ ] `Espacio` dispara una ráfaga extra desde la cabeza sujeta a cooldown.
- [ ] Los enemigos mueren con un impacto de proyectil y otorgan puntos.
- [ ] Tocar un núcleo de energía añade un segmento a la cola y sube `level` cada 3 segmentos.
- [ ] El HUD interno del canvas se dibuja correctamente durante la partida.
- [ ] El HUD React de la plataforma refleja en tiempo real `score` y `level`.
- [ ] El botón "PAUSA" congela el game loop (movimiento, disparo y spawns); "REANUDAR" lo reanuda.
- [ ] Al colisionar con pared, cola propia o enemigo, aparece el modal React de game over con la puntuación final.
- [ ] El overlay "GAME OVER" del canvas no existe (el modal React lo reemplaza).
- [ ] El botón "JUGAR DE NUEVO" reinicia la partida desde cero (longitud inicial, score 0, nivel 1).
- [ ] Al abrir el modal, el campo de nombre se pre-rellena con `av_player_name` de localStorage si existe.
- [ ] Al confirmar, el score se inserta en Supabase y el nombre se persiste en localStorage.
- [ ] El botón "GUARDAR PUNTUACIÓN" se deshabilita tras el primer envío (sin doble inserción).
- [ ] El score guardado aparece en `/games/vibora-artillera` y en `/hall-of-fame` al recargar.
- [ ] Cuando no hay scores, el leaderboard muestra "Sé el primero en entrar al salón de la fama".
- [ ] `/hall-of-fame` muestra un tab para VÍBORA ARTILLERA.
- [ ] `npm run build` completa sin errores de TypeScript.
- [ ] Ninguna ruta existente devuelve 500.

---

## Decisions

- **Sí: Doble HUD** — el canvas conserva su HUD interno (score, nivel) y React muestra los mismos valores en el HUD de la plataforma. Razón: el juego funciona visualmente como standalone dentro del canvas, y la plataforma necesita los valores para integraciones futuras.

- **Sí: Callbacks como interfaz de comunicación** — el componente canvas llama a `onScoreChange`, `onLevelChange`, `onGameOver` cuando el estado cambia. Razón: desacoplamiento limpio; el juego no sabe nada de React ni de la plataforma.

- **Sí: `dynamic(..., { ssr: false })`** — el componente canvas se carga solo en cliente. Razón: `canvas` y `requestAnimationFrame` no existen en el entorno Node.js de Next.js SSR.

- **Sí: Play-page específica `app/games/vibora-artillera/play/page.tsx`** — en lugar de modificar la ruta genérica `[id]/play`. Razón: evita condicionales en la ruta genérica; Next.js App Router da prioridad a rutas estáticas sobre dinámicas.

- **Sí: Disparo automático de la cola como mecánica central** — las torretas de cola disparan solas sin input adicional del jugador. Razón: es la reinterpretación shooter del tema Snake que diferencia este juego de un clon directo; el jugador sigue teniendo agencia vía el giro y la ráfaga manual de Espacio.

- **Sí: Un único spec combinado (juego + leaderboard)** — las tablas `games` y `scores` ya existen; solo se añade la fila del juego y el wiring. Separarlos no aportaría valor visible.

- **No: Sistema de vidas múltiples** — cualquier colisión (pared, cola propia o enemigo) termina la partida al instante. Razón: mantiene la tensión clásica de Snake (un error = fin) en vez de diluirla con vidas extra, coherente con el género shooter de reflejos donde un impacto también es letal.

- **No: Crear tablas nuevas por juego** — se reutilizan `games` y `scores` del spec 06. Razón: el modelo es suficientemente genérico para cualquier juego con score numérico.

- **No: RLS en este spec** — las tablas quedan abiertas (INSERT y SELECT públicos). Razón: se mitiga en el spec futuro de seguridad.

- **No: Realtime en leaderboards** — los scores se ven al recargar. Razón: la complejidad de subscriptions no aporta valor mientras haya pocos jugadores activos.

- **No: Componente genérico `CanvasGame`** — cada juego tiene su componente propio. Razón: YAGNI; generalizar ahora sería abstraer sin caso de uso suficientemente confirmado.
