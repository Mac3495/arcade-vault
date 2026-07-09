---
name: add-game
description: Integrates a new canvas game into Arcade Vault with a working leaderboard. Adapts a vanilla-JS game.js (from references/started-games or supplied by the user) into a React component with a fixed callback interface, generates its play-page, and inserts the game row into Supabase. Use it whenever the user wants to add a new playable game to the platform.
disable-model-invocation: true
argument-hint: '<game-id> [path to reference game]'
allowed-tools: Bash(ls:*), Bash(cat:*), Bash(ln:*), Read, Write, Edit
---

# /add-game — Integrate a new game with leaderboard

This skill turns a vanilla-JS canvas game into a fully working Arcade Vault
game: playable at `/games/<id>/play`, listed at `/biblioteca`, detailed with a
leaderboard at `/games/<id>`, and showing up in `/hall-of-fame` — all without
touching those three routes, because they are data-driven off the Supabase
`games`/`scores` tables.

Read `game-component.template.tsx` and `play-page.template.tsx` (in the same
directory as this skill) before starting — they are the reusable skeletons
you will copy and fill in.

## Philosophy

Two specs already did this once, by hand, for Asteroids: `specs/05-asteroids-game.md`
(canvas → React component with callbacks) and `specs/06-games-table-leaderboard-supabase.md`
(Supabase `games`/`scores` tables + leaderboard wiring). This skill is that process,
made repeatable. Everything that made Asteroids "the reference implementation" —
`components/games/AsteroidsGame.tsx` and `app/games/asteroids/play/page.tsx` —
is the ground truth for the templates. When in doubt, open those two files.

**Your job is adaptation, not reinvention.** Reuse the templates' boilerplate
verbatim (RAF loop shape, refs, cleanup, HUD/CRT/modal markup, Supabase insert).
Only the game's internal logic (entities, `update`/`draw`, its own state model)
and a handful of named constants change per game.

## Command flow

Reply in the same language as the invoking prompt (this repo defaults to Spanish
per its `CLAUDE.md`).

### Phase 0 — Ground yourself

1. Read `CLAUDE.md` / `AGENTS.md` at the repo root. This project pins
   `next@16.2.9` / `react@19.2.4` — if this game's play-page touches routing,
   `dynamic()`, or any App Router API in a way you're not sure about, check
   `node_modules/next/dist/docs/` first. Don't assume stock Next.js behavior.
2. Confirm `components/games/AsteroidsGame.tsx` and
   `app/games/asteroids/play/page.tsx` exist — they are the live reference.
   If they don't, stop and tell the user something is off before continuing.

### Phase 1 — Pick the game and read its source

If `$ARGUMENTS` includes a path (e.g. `references/started-games/03-tetris`),
list and read that folder. Otherwise ask the user for the game's source
(a `game.js`/`index.html` they paste or point you to, or a description of
one they want built from scratch).

While reading the source, extract:

- **Canvas size** (width × height) — becomes the fixed dims of the new
  `<canvas>`. Games with a DOM-rendered HUD (like tetris) may also have a
  second small canvas (next-piece preview) — note it, it stays DOM-side.
- **State variables**: score, a "lives"-equivalent, a "level"-equivalent,
  and how game-over is represented (a string state machine like Asteroids'
  `state: 'playing'|'dead'|'gameover'`, or boolean flags like tetris'
  `gameOver`/`paused`, or both like arkanoid's `gameState`+`isPaused`).
- **`dt` units** — seconds (asteroids, arkanoid) or milliseconds (tetris).
  The template's loop works in seconds; convert if the source uses ms.
- **Pause model** — does the source already gate `update()` behind a flag
  (arkanoid's `isPaused`), cancel/reschedule its RAF (tetris' `animId`), or
  have no pause at all (asteroids)? The template's `pausedRef` approach
  (never cancel RAF, just skip `update()`) replaces whichever of these exists.
- **Input** — keys via `e.code` (asteroids, tetris) vs `e.key` (arkanoid);
  any mouse listeners (arkanoid's `mousemove`/`click` for paddle & pause menu).
  All must be attached in the effect and removed in its cleanup.
  **Never trigger `alert`/`confirm`/`prompt`** if the source has any — strip them.
  **Preserve the internal on-canvas HUD** if the source draws one (score/level/
  lives text) — only remove any on-canvas "GAME OVER" overlay, since the React
  modal replaces it.
- **External load-time deps** — e.g. arkanoid needs a spritesheet image, a
  `levels.js`, and audio files loaded *before* the loop starts
  (`loadSpritesheet(callback)`). Flag these: assets must be copied under
  `public/games/<id>/` and the component must wait for them (mirror the
  source's own load-then-start pattern) before calling `requestAnimationFrame`.

### Phase 2 — Collect game metadata

Ask the user (in one block, following the `/spec` question style — concrete,
2-4 options with a recommendation where relevant):

1. **`id`** (kebab-case, e.g. `tetris`) — becomes the Supabase PK, the route
   segment, and the component name (PascalCase of it, e.g. `TetrisGame`).
2. **`title`**, **`short`** (one line), **`long`** (paragraph) — copy for the
   biblioteca card and detail page.
3. **`cat`** — one of `ARCADE | PUZZLE | SHOOTER`. If none fits, confirm
   adding a new category: requires extending the union in
   `app/lib/supabase/types.ts` (`GameRow.cat`) and `CATEGORIES` in
   `app/data/games.ts`.
4. **`cover`** — a CSS cover class. Reuse an existing one from `app/globals.css`
   if visually fitting, or confirm adding a new `.cover-*` class (ask if the
   user wants a specific look; don't invent art direction silently — for
   anything more than a flat color/gradient, consider suggesting the
   `frontend-design` skill).
5. **`color`** — one of `cyan | magenta | yellow | green` (accent used across
   HUD/leaderboard chips).
6. **Callback mapping** — the interface is always the same 4 callbacks
   (`onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`), matching
   `AsteroidsGameProps` exactly, for maximum play-page template reuse. Map the
   source's own concepts onto them and say the mapping out loud before coding:
   - No real "lives" (e.g. tetris)? Map something meaningful (e.g. lines
     cleared) or fire it once with a constant/0 if truly inapplicable.
   - "Level" derived rather than a literal counter (tetris: `floor(lines/10)+1`)?
     Fine — just call `onLevelChange` when the derived value changes.
   - Never drop a callback from the props interface even if unused; call it
     with a sensible constant instead, so the play-page template needs zero
     conditional logic.

### Phase 3 — Generate the canvas component

Create `components/games/<Name>Game.tsx` from `game-component.template.tsx`:

1. Copy the template's boilerplate untouched: props interface, `canvasRef`,
   `pausedRef` + its sync effect, `callbacksRef` + its sync effect, the
   `useEffect([])` shell, cleanup (`cancelAnimationFrame` + listener removal),
   and the state-diff bridge (`prevScore`/`prevLives`/`prevLevel`/
   `gameOverNotified`) inside `loop(ts)`.
2. Inside the `// >>> GAME-SPECIFIC` markers, paste the adapted source:
   entity classes, constants, `initGame`/`update`/`draw` (and any
   `nextLevel`-equivalent), sized to the canvas dims you found in Phase 1.
   - Rename the source's own state vars to feed the bridge: the bridge reads
     module-scope `let score`, `let lives`, `let level`, and a comparison
     `state === 'gameover'` (or equivalent) each frame — adapt the source's
     names/derivations to satisfy that shape rather than rewriting the bridge.
   - Convert `dt` to seconds if the source used ms.
   - Drop the source's own pause flag/RAF-cancel logic — `pausedRef` replaces it.
   - Remove any on-canvas game-over overlay text; keep the internal HUD draw call.
   - Re-attach input listeners to `window` (or `document`, matching the
     source) inside the effect, and remove them in the cleanup.
   - If there are load-time assets (spritesheet/audio), gate `initGame()` +
     the first `requestAnimationFrame(loop)` behind their load callback, and
     put the asset files under `public/games/<id>/`, referenced by absolute
     `/games/<id>/...` paths.

### Phase 4 — Generate the play-page

Create `app/games/<id>/play/page.tsx` from `play-page.template.tsx`,
replacing only `__GAME_ID__`, `__GAME_TITLE__`, and the `dynamic()` import
path/component name. Everything else — HUD (Jugador/Puntuación/Vidas/Nivel),
pausa/fin/salir buttons, CRT frame, pause overlay, game-over modal with the
initials input, `av_player_name` localStorage read/write, and the `scores`
insert — is reused verbatim because of the fixed callback interface from
Phase 2.

### Phase 5 — Register the game in Supabase (via MCP)

1. Call `mcp__supabase__list_tables` to confirm the `games` schema matches
   `GameRow` (`id, title, short, long, cat, cover, color, created_at`).
2. Insert the row with `mcp__supabase__execute_sql`:
   ```sql
   INSERT INTO games (id, title, short, long, cat, cover, color)
   VALUES ('<id>', '<title>', '<short>', '<long>', '<cat>', '<cover>', '<color>');
   ```
3. Verify with a `SELECT * FROM games WHERE id = '<id>'`.
4. If Supabase MCP isn't connected/available, degrade gracefully: print the
   exact SQL block above and tell the user to run it in the Supabase SQL Editor.

If the metadata step introduced a new `cat` or `color` value, also update:
`app/lib/supabase/types.ts` (the `GameRow.cat`/`GameRow.color` unions) and
`app/data/games.ts` (`CATEGORIES`), and add any new `.cover-*` class to
`app/globals.css`.

### Phase 6 — Verify

1. `npm run build` — must complete with no TypeScript errors touching the
   new files.
2. `/biblioteca` shows the new game's card.
3. `/games/<id>` loads the detail page; leaderboard shows the empty state
   ("Sé el primero en entrar al salón de la fama") since no scores exist yet.
4. `/games/<id>/play` is playable with the original controls; PAUSA freezes
   the loop, REANUDAR resumes it; losing triggers the game-over modal.
5. Save a test score through the modal; confirm it now appears on
   `/games/<id>` and on the matching tab of `/hall-of-fame`.
6. Confirm no existing route (`/biblioteca`, other games' `/play` pages,
   `/hall-of-fame`) regressed.

## Hard rules

- **Never reimplement `/biblioteca`, `/games/[id]`, or `/hall-of-fame`.** They
  are already data-driven off Supabase; a correctly inserted `games` row is
  the only integration point needed.
- **Never change the 4-callback interface** (`onScoreChange`, `onLivesChange`,
  `onLevelChange`, `onGameOver`) — even for games where one concept doesn't
  map cleanly. Map it to something reasonable instead of dropping it.
- **Always** `dynamic(..., { ssr: false })` for the canvas component import —
  canvas/RAF don't exist in Next's SSR environment.
- **Always** clean up RAF and all input listeners in the effect's return.
- **Never** trigger `alert`/`confirm`/`prompt` — some reference games' pause
  menus or restart flows may use them; strip and replace with the React modal
  / HUD buttons instead.
- **Don't invent visual design** (new cover art, unusual color choices) without
  asking — recommend the `frontend-design` skill for anything beyond reusing
  an existing `.cover-*` class or accent color.

## Arguments

- `/add-game tetris references/started-games/03-tetris` — use `tetris` as the
  id, and read that folder as the source in Phase 1, skipping the "ask for
  source" step.
- `/add-game <id>` (no path) — ask the user for the game's source in Phase 1.
- `/add-game` (no arguments) — ask for both the id and the source before
  proceeding.
