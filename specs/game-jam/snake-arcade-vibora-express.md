# SPEC — Integración del juego VÍBORA EXPRÉS (candidato game-jam "Snake")

> **Estado:** Borrador (candidato game-jam)
> **Depende de:** 06-games-table-leaderboard-supabase
> **Fecha:** 2026-07-09
> **Objetivo:** Integrar VÍBORA EXPRÉS, un arcade de reflejos inspirado en el tema de la game jam "Snake", como juego jugable en Arcade Vault, con canvas propio y leaderboard de Supabase.

---

## Scope

**In:**

- Insertar la fila `vibora-express` en la tabla `games` de Supabase (seed manual vía SQL).
- Crear `components/games/ViboraExpressGame.tsx` — componente React `"use client"` que encapsula
  el canvas 800×600 y el game loop completo, escrito desde cero (no hay referencia portada).
  Acepta props: `paused`, `onScoreChange`, `onLivesChange`, `onGameOver`.
- Crear `app/games/vibora-express/play/page.tsx` — play-page específica para este juego.
  Gestiona el estado (`score`, `lives`, pausa, game over) y pasa callbacks al componente canvas.
- Wiring del modal de game over: pre-rellenar nombre desde `localStorage.getItem('av_player_name')`;
  al confirmar, guardar nombre en localStorage e insertar score en la tabla `scores` vía cliente browser.
- Botón de pausa de la plataforma pasa el flag `paused` al componente canvas, que congela `update()`
  (sigue llamando `draw()`).
- El HUD interno del canvas (score, vidas, medidor de dash) se dibuja únicamente durante la partida;
  no se dibuja ningún overlay "GAME OVER" en el canvas — el modal React lo reemplaza.

**Fuera de alcance:**

- Crear las tablas `games` o `scores` en Supabase — ya existen (spec 06).
- Supabase Auth — `user_id` se almacena como `null` en todos los scores.
- RLS (Row Level Security) — se configura en un spec futuro de seguridad.
- Realtime — el leaderboard no se actualiza en vivo; solo al cargar la página.
- Paginación del leaderboard — se muestran los top 10 fijos.
- Controles táctiles o mobile.
- Actualización automática de `best` y `plays` en la tabla `games` — campos estáticos.
- Multijugador o modos alternativos (solo hay un modo de juego, un jugador).
- Cualquier reutilización de assets o código de `references/started-games/` — este juego se
  implementa desde cero, no hay fuente que portar.

---

## Diseño del juego

Reinterpretación del tema "Snake": en vez de una serpiente atada a una cuadrícula que muere al
tocar su propia cola, VÍBORA EXPRÉS es una serpiente de neón con **movimiento libre continuo**
(no discreto), dirigida con el mouse o las flechas, en una arena circular cerrada. La serpiente
crece al atravesar pulsos de luz ("chispas") que aparecen aleatoriamente. El giro es el desafío
central: cuanto más larga la serpiente, más difícil esquivar su propio cuerpo en un arena sin
cuadrícula, y la velocidad base aumenta con el largo (como en el Snake clásico) — pero se añaden
dos elementos arcade que le dan una vuelta original:

- **Dash de escape**: una barra de energía se llena con cada chispa comida; al presionar
  `Espacio` con la barra llena, la serpiente se vuelve translúcida un instante y puede atravesar
  su propia cola sin morir (pero no los muros de la arena). Fomenta jugadas arriesgadas cerca del
  propio cuerpo para maximizar el largo antes de usar el dash.
- **Halcones**: cada ~15s aparece un halcón que sobrevuela la arena en línea recta hacia la
  posición de la cabeza; si toca la cabeza, resta una vida (en vez de terminar la partida al
  instante), lo que hace el juego más indulgente y "arcade" que un Snake puro de una sola vida.

El juego no duplica ningún juego de `references/implemented-games.md` (asteroids, tetris,
arkanoid): no hay grilla, no hay piezas que encajar, no hay paleta/pelota. Encaja con `ARCADE`
por ser un juego de reflejos puros de control continuo y colisión, sin resolución de puzzles ni
disparo de proyectiles.

### Ficha

- `id`: `vibora-express`
- `title`: `VÍBORA EXPRÉS`
- `short`: `Serpiente de neón que crece a puro reflejo, sin cuadrícula.` (58 → recortar)
  → usar: `Serpiente de neón, reflejos puros, sin cuadrícula.` (48 caracteres)
- `long`: `Guía una serpiente de neón de movimiento libre por una arena circular, devora chispas de luz para crecer y usa tu dash para atravesar tu propia cola. Esquiva a los halcones que caen en picado antes de quedarte sin vidas.`
- `cat`: `ARCADE` (fijada por la variante 1)
- `color`: `green` — coherente con la paleta verde-neón de `cover-snake` (`#003a2a` a `#0a0a18`)
  ya presente en `app/globals.css`, y con la asociación visual serpiente/veneno.
- `cover`: `cover-snake` (clase ya existente, pensada para este tipo de juego)
- Canvas: 800×600 px
- Controles: mover el mouse dentro del canvas orienta la cabeza de la serpiente (steering
  continuo hacia el cursor); `Espacio` activa el dash cuando la barra está llena; alternativa de
  teclado `←`/`→` para girar y `↑` para acelerar ligeramente, por si el jugador prefiere no usar
  mouse.
- HUD: `score` (chispas devoradas × multiplicador de largo), `lives` (empieza en 3).
- Condición de game over: la serpiente choca contra el muro de la arena, o choca contra su propia
  cola sin el dash activo, restando una vida cada vez; al llegar a 0 vidas termina la partida.

---

## Data model

### Seed en Supabase — tabla `games`

Ejecutar en el SQL Editor de Supabase:

```sql
INSERT INTO games (id, title, short, long, cat, cover, color)
VALUES (
  'vibora-express', 'VÍBORA EXPRÉS', 'Serpiente de neón, reflejos puros, sin cuadrícula.',
  'Guía una serpiente de neón de movimiento libre por una arena circular, devora chispas de luz para crecer y usa tu dash para atravesar tu propia cola. Esquiva a los halcones que caen en picado antes de quedarte sin vidas.',
  'ARCADE', 'cover-snake', 'green'
);
```

### Props del componente `ViboraExpressGame`

```ts
interface ViboraExpressGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onGameOver: (finalScore: number) => void;
}
```

No se introducen nuevas tablas ni tipos TypeScript — se reutilizan `GameRow` y `ScoreRow` de
`app/lib/supabase/types.ts`.

---

## Implementation plan

1. **Seed en Supabase** — ejecutar el INSERT de la fila `vibora-express` en el SQL Editor de
   Supabase.
   Verificación: la card de VÍBORA EXPRÉS aparece en `/games`.

2. **Crear `components/games/ViboraExpressGame.tsx`** — componente `"use client"` escrito desde
   cero que:
   - Renderiza un `<canvas>` de 800×600 con una arena circular dibujada (borde de colisión).
   - Modela la serpiente como una lista de puntos (segmentos) que siguen la trayectoria de la
     cabeza con un `spacing` fijo; la cabeza avanza a velocidad constante en la dirección del
     ángulo de steering, que se interpola hacia la posición del mouse (o hacia `←`/`→` si se usa
     teclado) cada frame.
   - Genera chispas de luz en posiciones aleatorias dentro de la arena; al colisionar la cabeza
     con una chispa, añade un segmento a la cola, incrementa `score` y rellena parcialmente la
     barra de dash.
   - Genera un halcón cada ~15s que vuela en línea recta hacia la posición de la cabeza en el
     instante de su aparición; si colisiona con la cabeza, descuenta una vida y el halcón
     desaparece.
   - Detecta colisión cabeza-cola con distancia punto a punto contra los segmentos, ignorando los
     primeros N segmentos cercanos al cuello (para evitar falsos positivos al girar); si hay
     colisión y el dash no está activo, descuenta una vida y reinicia la posición de la serpiente
     (conservando largo y score).
   - Recibe prop `paused: boolean` — si es `true`, el loop llama a `draw()` pero no a `update()`.
   - Llama a `onScoreChange` y `onLivesChange` cada vez que esos valores cambian dentro del loop
     (comparando con el valor anterior antes de disparar el callback).
   - Llama a `onGameOver(score)` cuando `lives` llega a 0.
   - El HUD interno del canvas (score, vidas, barra de dash) se dibuja siempre que el juego está
     en curso; no se dibuja ningún overlay "GAME OVER" en el canvas.
   - Limpia los listeners de `mousemove`, `keydown`/`keyup` en el `return` del `useEffect`.
     Verificación: el juego arranca en `/games/vibora-express/play` y es jugable moviendo el mouse
     dentro del canvas o con `←`/`→`/`↑`, con dash activable en `Espacio`.

3. **Crear `app/games/vibora-express/play/page.tsx`** — play-page específica:
   - Importa `ViboraExpressGame` con `dynamic(..., { ssr: false })`.
   - Estado local: `score`, `lives`, `paused`, `over`, `name`, `saved`, `gameKey`.
   - Al montar el modal de game over (`over === true`), lee `localStorage.getItem('av_player_name')`
     y pre-rellena el campo `name`.
   - Al confirmar, persiste el nombre en `av_player_name` e inserta en `scores`:
     `{ game_id: 'vibora-express', player_name: name, score, user_id: null }`.
   - Marca `saved: true` para deshabilitar el botón y evitar doble inserción.
   - Reutiliza el mismo layout visual (HUD React + CRT + modal game over) que
     `app/games/arkanoid/play/page.tsx`.
     Verificación: el HUD React muestra score/vidas en tiempo real; tras una partida el score
     aparece en `/games/vibora-express` y en `/hall-of-fame` al recargar.

4. **Verificación final** — `npm run build` completa sin errores de TypeScript. Ninguna ruta
   existente devuelve 500.

---

## Acceptance criteria

- [ ] La card de VÍBORA EXPRÉS aparece en `/games`.
- [ ] `/games/vibora-express` carga con los datos reales del juego y el leaderboard top 10.
- [ ] `/games/vibora-express/play` carga sin errores de SSR ni de TypeScript.
- [ ] El canvas renderiza la arena, la serpiente, las chispas y los halcones; es jugable con mouse
      o flechas.
- [ ] El HUD interno del canvas (score, vidas, barra de dash) se dibuja correctamente durante la
      partida.
- [ ] El HUD React de la plataforma refleja en tiempo real score y vidas.
- [ ] El botón "PAUSA" congela el game loop (la serpiente se detiene); "REANUDAR" lo reanuda.
- [ ] El dash permite atravesar la propia cola sin restar vida solo cuando la barra está llena y
      se presiona `Espacio`.
- [ ] Chocar contra el muro de la arena, o contra la cola sin dash activo, resta una vida y
      reinicia la posición de la serpiente conservando score y largo.
- [ ] Al agotar las 3 vidas, aparece el modal React de game over con la puntuación final.
- [ ] Ningún overlay "GAME OVER" se dibuja en el canvas — solo el modal React lo muestra.
- [ ] El botón "JUGAR DE NUEVO" reinicia la partida desde cero (score 0, 3 vidas).
- [ ] Al abrir el modal, el campo de nombre se pre-rellena con `av_player_name` de localStorage si
      existe.
- [ ] Al confirmar, el score se inserta en Supabase y el nombre se persiste en localStorage.
- [ ] El botón "GUARDAR PUNTUACIÓN" se deshabilita tras el primer envío (sin doble inserción).
- [ ] El score guardado aparece en `/games/vibora-express` y en `/hall-of-fame` al recargar.
- [ ] Cuando no hay scores, el leaderboard muestra "Sé el primero en entrar al salón de la fama".
- [ ] `/hall-of-fame` muestra un tab para VÍBORA EXPRÉS.
- [ ] `npm run build` completa sin errores de TypeScript.
- [ ] Ninguna ruta existente devuelve 500.

---

## Decisions

- **Sí: Doble HUD** — el canvas conserva su HUD interno (score, vidas, barra de dash) y React
  muestra los mismos valores en el HUD de la plataforma. Razón: el juego funciona visualmente
  como standalone dentro del canvas, y la plataforma necesita los valores para integraciones
  futuras.

- **Sí: Callbacks como interfaz de comunicación** — el componente canvas llama a
  `onScoreChange`, `onLivesChange`, `onGameOver` cuando el estado cambia. Razón: desacoplamiento
  limpio; el juego no sabe nada de React ni de la plataforma.

- **Sí: `dynamic(..., { ssr: false })`** — el componente canvas se carga solo en cliente. Razón:
  `canvas` y `requestAnimationFrame` no existen en el entorno Node.js de Next.js SSR.

- **Sí: Play-page específica `app/games/vibora-express/play/page.tsx`** — en lugar de modificar la
  ruta genérica `[id]/play`. Razón: evita condicionales en la ruta genérica; Next.js App Router
  da prioridad a rutas estáticas sobre dinámicas.

- **Sí: Vidas en vez de muerte instantánea al chocar** — se aparta del Snake clásico (una sola
  colisión = fin) para dar 3 vidas con reinicio de posición. Razón: mantiene el ritmo arcade
  (partidas más largas, más oportunidad de acumular score) y diferencia el juego de una copia
  literal de Snake.

- **Sí: Movimiento libre continuo en vez de cuadrícula** — la serpiente gira suavemente en vez de
  moverse en pasos discretos de 90°. Razón: es el cambio mecánico central que reinterpreta el
  tema sin copiarlo; encaja mejor con la categoría ARCADE (reflejos de control continuo) que un
  clon de grilla.

- **Sí: Un único spec combinado (juego + leaderboard)** — las tablas `games` y `scores` ya
  existen; solo se añade la fila del juego y el wiring. Separarlos no aportaría valor visible.

- **No: Crear tablas nuevas por juego** — se reutilizan `games` y `scores` del spec 06. Razón: el
  modelo es suficientemente genérico para cualquier juego con score numérico.

- **No: RLS en este spec** — las tablas quedan abiertas (INSERT y SELECT públicos). Razón: se
  mitiga en el spec futuro de seguridad.

- **No: Realtime en leaderboards** — los scores se ven al recargar. Razón: la complejidad de
  subscriptions no aporta valor mientras haya pocos jugadores activos.

- **No: Componente genérico `CanvasGame`** — cada juego tiene su componente propio. Razón: YAGNI;
  generalizar ahora sería abstraer sin caso de uso suficientemente confirmado.
</content>
