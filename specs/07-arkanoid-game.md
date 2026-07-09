# SPEC 07 — Integración del juego ARKANOID

> **Estado:** Implementado
> **Depende de:** 06-games-table-leaderboard-supabase
> **Fecha:** 2026-07-09
> **Objetivo:** Integrar ARKANOID como juego jugable en Arcade Vault, adaptando su canvas (proveniente de `references/started-games/04-arkanoid/`) a React y conectando el leaderboard de Supabase.

---

## Scope

**In:**

- Insertar la fila `arkanoid` en la tabla `games` de Supabase (seed manual vía SQL).
- Crear `components/games/ArkanoidGame.tsx` — componente React `"use client"` que encapsula el canvas 800×600 y el game loop, portado desde `references/started-games/04-arkanoid/game.js` y `levels.js`. Acepta props: `paused`, `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`.
- Crear `app/games/arkanoid/play/page.tsx` — play-page específica para este juego. Gestiona el estado (`score`, `lives`, `level`, pausa, game over) y pasa callbacks al componente canvas.
- Wiring del modal de game over: pre-rellenar nombre desde `localStorage.getItem('av_player_name')`; al confirmar, guardar nombre en localStorage e insertar score en la tabla `scores` vía cliente browser.
- Botón de pausa de la plataforma pasa el flag `paused` al componente canvas, que congela `update()` (sigue llamando `draw()`).
- Eliminar del `draw()` los overlays "GAME OVER" y "¡Completaste el juego!" — el modal React los reemplaza en ambos casos (game over por vidas agotadas o victoria tras el nivel 5).
- Eliminar por completo el overlay de pausa con selector de nivel y su manejo de click en canvas — la pausa pasa a ser controlada únicamente por el prop `paused` de React.
- El HUD interno del canvas (score, nivel, vidas dibujadas como sprites de pelota) se conserva sin cambios.
- Portar `assets/spritesheet.js`, `assets/spritesheet-breakout.png` y los sonidos (`ball-bounce.mp3`, `break-sound.mp3`) a `public/games/arkanoid/` para que el componente los cargue en el navegador.
- Portar `levels.js` (5 niveles) como módulo TypeScript importado por `ArkanoidGame.tsx`.

**Fuera de alcance:**

- Crear las tablas `games` o `scores` en Supabase — ya existen (spec 06).
- Supabase Auth — `user_id` se almacena como `null` en todos los scores.
- RLS (Row Level Security) — se configura en un spec futuro de seguridad.
- Realtime — el leaderboard no se actualiza en vivo; solo al cargar la página.
- Paginación del leaderboard — se muestran los top 10 fijos.
- Controles táctiles o mobile.
- Actualización automática de `best` y `plays` en la tabla `games` — campos estáticos.
- El selector de nivel manual (saltar a nivel 1–5) presente en el overlay de pausa original — se elimina, no se reimplementa en React.
- Distinguir en el leaderboard o en el modal si la partida terminó por game over o por victoria — ambos casos usan el mismo modal de guardado de score.

---

## Data model

### Seed en Supabase — tabla `games`

Ejecutar en el SQL Editor de Supabase:

```sql
INSERT INTO games (id, title, short, long, cat, cover, color)
VALUES (
  'arkanoid', 'ARKANOID', 'Destruye bloques antes de perder la pelota.',
  'Controla la paleta y evita que la pelota caiga. Rompe los bloques de los 5 niveles, acumula puntos y sobrevive con tus 3 vidas.',
  'ARCADE', 'cover-bricks', 'cyan'
);
```

### Props del componente `ArkanoidGame`

```ts
interface ArkanoidGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}
```

No se introducen nuevas tablas ni tipos TypeScript — se reutilizan `GameRow` y `ScoreRow` de `app/lib/supabase/types.ts`.

---

## Implementation plan

1. **Seed en Supabase** — ejecutar el INSERT de la fila `arkanoid` en el SQL Editor de Supabase.
   Verificación: la card de ARKANOID aparece en `/games`.

2. **Portar assets** — copiar `assets/spritesheet-breakout.png`, `assets/sounds/ball-bounce.mp3` y `assets/sounds/break-sound.mp3` de `references/started-games/04-arkanoid/` a `public/games/arkanoid/`. Portar `levels.js` (definición `LEVELS`, 5 niveles con `blocks[]` y multiplicador de velocidad) a un módulo TypeScript, por ejemplo `components/games/arkanoid-levels.ts`.
   Verificación: los archivos existen en `public/games/arkanoid/` y el módulo de niveles compila sin errores de TypeScript.

3. **Crear `components/games/ArkanoidGame.tsx`** — componente `"use client"` que:
   - Renderiza un `<canvas>` de 800×600.
   - Contiene el game loop completo portado de `game.js`: paddle, pelota, colisiones AABB con bloques, explosiones animadas, física de rebote en paredes/paddle/bloques.
   - Recibe prop `paused: boolean` — si es `true`, el loop llama a `draw()` pero no a `update()`.
   - Llama a `onScoreChange`, `onLivesChange`, `onLevelChange` cada vez que esos valores cambian dentro del loop (comparando con el valor anterior antes de disparar el callback).
   - Llama a `onGameOver(score)` cuando `lives` llega a 0 o cuando se completan los 5 niveles (victoria).
   - Elimina del `draw()` los overlays "GAME OVER" y "¡Completaste el juego!".
   - Elimina el overlay de pausa con selector de nivel y su listener de `click` en el canvas.
   - Elimina el listener de teclado que alternaba pausa con `P`/`Escape` — la pausa la controla solo el prop `paused`.
   - Conserva el listener de `mousemove` para mover el paddle y el de `keydown`/`keyup` para `ArrowLeft`/`ArrowRight`.
   - El HUD interno del canvas (score, nivel, vidas) se mantiene sin cambios.
   - Limpia todos los event listeners en el `return` del `useEffect`.
     Verificación: el juego arranca en `/games/arkanoid/play` y es jugable con mouse o flechas ← →.

4. **Crear `app/games/arkanoid/play/page.tsx`** — play-page específica:
   - Importa `ArkanoidGame` con `dynamic(..., { ssr: false })`.
   - Estado local: `score`, `lives`, `level`, `paused`, `over`, `name`, `saved`, `gameKey`.
   - Al montar el modal de game over (`over === true`), lee `localStorage.getItem('av_player_name')` y pre-rellena el campo `name`.
   - Al confirmar, persiste el nombre en `av_player_name` e inserta en `scores`: `{ game_id: 'arkanoid', player_name: name, score, user_id: null }`.
   - Marca `saved: true` para deshabilitar el botón y evitar doble inserción.
   - Reutiliza el mismo layout visual (HUD React + CRT + modal game over) que `app/games/tetris/play/page.tsx`.
     Verificación: el HUD React muestra score/vidas/nivel en tiempo real; tras una partida (por game over o por completar el nivel 5) el score aparece en `/games/arkanoid` y en `/hall-of-fame` al recargar.

5. **Verificación final** — `npm run build` completa sin errores de TypeScript. Ninguna ruta existente devuelve 500.

---

## Acceptance criteria

- [ ] La card de ARKANOID aparece en `/games`.
- [ ] `/games/arkanoid` carga con los datos reales del juego y el leaderboard top 10.
- [ ] `/games/arkanoid/play` carga sin errores de SSR ni de TypeScript.
- [ ] El canvas renderiza el juego y es jugable con mouse o flechas ← →.
- [ ] El HUD interno del canvas (score, nivel, vidas) se dibuja correctamente durante la partida.
- [ ] El HUD React de la plataforma refleja en tiempo real score, vidas y nivel.
- [ ] El botón "PAUSA" congela el game loop (paddle y pelota se detienen); "REANUDAR" lo reanuda.
- [ ] Al agotar las 3 vidas, aparece el modal React de game over con la puntuación final.
- [ ] Al completar el nivel 5 (victoria), aparece el mismo modal React de game over con la puntuación final.
- [ ] Los overlays "GAME OVER" y "¡Completaste el juego!" del canvas ya no se dibujan (el modal React los reemplaza).
- [ ] El overlay de pausa con selector de nivel del canvas original ya no existe.
- [ ] El botón "JUGAR DE NUEVO" reinicia la partida desde el nivel 1 con 3 vidas y score 0.
- [ ] Al abrir el modal, el campo de nombre se pre-rellena con `av_player_name` de localStorage si existe.
- [ ] Al confirmar, el score se inserta en Supabase y el nombre se persiste en localStorage.
- [ ] El botón "GUARDAR PUNTUACIÓN" se deshabilita tras el primer envío (sin doble inserción).
- [ ] El score guardado aparece en `/games/arkanoid` y en `/hall-of-fame` al recargar.
- [ ] Cuando no hay scores, el leaderboard muestra "Sé el primero en entrar al salón de la fama".
- [ ] `/hall-of-fame` muestra un tab para ARKANOID.
- [ ] `npm run build` completa sin errores de TypeScript.
- [ ] Ninguna ruta existente devuelve 500.

---

## Decisions

- **Sí: Doble HUD** — el canvas conserva su HUD interno (score, nivel, vidas) y React muestra los mismos valores en el HUD de la plataforma. Razón: el juego funciona visualmente como standalone dentro del canvas, y la plataforma necesita los valores para integraciones futuras.

- **Sí: Callbacks como interfaz de comunicación** — el componente canvas llama a `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver` cuando el estado cambia. Razón: desacoplamiento limpio; el juego no sabe nada de React ni de la plataforma.

- **Sí: `dynamic(..., { ssr: false })`** — el componente canvas se carga solo en cliente. Razón: `canvas`, `Audio` y `requestAnimationFrame` no existen en el entorno Node.js de Next.js SSR.

- **Sí: Play-page específica `app/games/arkanoid/play/page.tsx`** — en lugar de modificar la ruta genérica `[id]/play`. Razón: evita condicionales en la ruta genérica; Next.js App Router da prioridad a rutas estáticas sobre dinámicas.

- **Sí: Un único spec combinado (juego + leaderboard)** — las tablas `games` y `scores` ya existen; solo se añade la fila del juego y el wiring. Separarlos no aportaría valor visible.

- **Sí: Un mismo modal para game over y victoria** — ambos casos terminan la partida y permiten guardar el score. Razón: la plataforma trata "fin de partida" de forma uniforme; distinguir victoria de derrota en la UI no aporta valor sin más juegos con múltiples finales.

- **No: Selector de nivel manual en el overlay de pausa** — el original permitía saltar a cualquiera de los 5 niveles al pausar. Razón: es una herramienta de testing del juego standalone, no una feature del producto; la plataforma solo expone pausa/reanudar.

- **No: Crear tablas nuevas por juego** — se reutilizan `games` y `scores` del spec 06. Razón: el modelo es suficientemente genérico para cualquier juego con score numérico.

- **No: RLS en este spec** — las tablas quedan abiertas (INSERT y SELECT públicos). Razón: se mitiga en el spec futuro de seguridad.

- **No: Realtime en leaderboards** — los scores se ven al recargar. Razón: la complejidad de subscriptions no aporta valor mientras haya pocos jugadores activos.

- **No: Componente genérico `CanvasGame`** — cada juego tiene su componente propio. Razón: YAGNI; generalizar ahora sería abstraer sin caso de uso suficientemente confirmado.
