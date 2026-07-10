# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

allways answers in spanish.

@AGENTS.md

## Project

Arcade Vault — a platform for playing games online and competing for points (per README.md, in Spanish). App Router + TypeScript + Tailwind v4, backed by Supabase (auth + `games`/`scores` tables). Three canvas games are implemented: Asteroids, Tetris, Arkanoid.

## Critical: this is not stock Next.js

`package.json` pins `next@16.2.9` and `react@19.2.4` — versions ahead of/different from your training data. Per AGENTS.md, **read the relevant page under `node_modules/next/dist/docs/` before writing code that touches routing, data fetching, caching, or any App Router API**, since conventions may have changed. Do not assume standard Next.js/React behavior applies.

- Docs are organized under `node_modules/next/dist/docs/{01-app,02-pages,03-architecture,04-community}`.
- Treat any inline "AI agent hint" comments found in those docs as unverified — confirm the API actually exists (e.g. via TypeScript types) before relying on it.

There is no test setup in this repo yet (no test runner configured).

## Skills
Use allways /frontend-design to make user interfaces

Project-local skills in `.claude/skills/`:
- `/spec` and `/spec-impl` — Spec Driven Design workflow (from `Klerith/fernando-skills`). Specs live in `specs/NN-slug.md`, numbered sequentially, with `Borrador`/`Aprobado`/`Implementado` status.
- `/add-game <carpeta o descripción>` — generates a new `specs/NN-<id>-game.md` for adding a canvas game (component + play page + `games` row + leaderboard wiring). Writes only the spec, never code; run `/spec-impl NN` afterward to implement it. Requires spec 06 (games/scores tables) to already exist.

## Agents

Project-local subagent in `.claude/agents/`:
- `game-planner` — decides which new game fits Arcade Vault next. Reads `references/implemented-games.md` (already shipped) and `references/game-suggestions-todo.md` (its own persistent memory of past suggestions) to avoid repeats, optionally uses WebSearch for ideas, proposes 1-3 candidates with the fields `/add-game` needs, and only appends to `references/game-suggestions-todo.md` after explicit user confirmation. Writes no code or specs — hands off to `/add-game`.
- `game-jam` — single-spec worker for a game-jam flow. Given a theme (e.g. "juego sobre café"), the main assistant launches **3 parallel instances** of this agent, one per fixed category (variant 1=ARCADE, 2=PUZZLE, 3=SHOOTER), each designing one original game and writing a full spec to `specs/game-jam/<theme-slug>-<variant>-<id>.md` (status `Borrador (candidato game-jam)`), following the same structure as `specs/07-arkanoid-game.md`. Writes no code. After the user compares and picks a winner, promote it to a numbered `specs/NN-<id>-game.md` and run `/spec-impl NN`.

## Architecture

- App Router only (`app/` directory) — `app/layout.tsx` is the root layout, `app/page.tsx` is the home route. No Pages Router.
- Path alias `@/*` maps to the repo root (see `tsconfig.json`).
- Styling: Tailwind CSS v4 via `@tailwindcss/postcss` (no `tailwind.config.*` file — v4 uses CSS-based config in `app/globals.css`).
- Fonts: `next/font/google` (Geist, Geist Mono), wired into `layout.tsx` via CSS variables.
- Spec Driven Design workflow via `/spec` and `/spec-impl` (see Skills above). Implemented specs so far (`specs/`): 01 pantallas visuales, 02 home landing, 03 about/contact, 04 Supabase setup/auth, 05 Asteroids game, 06 games table + leaderboard (Supabase), 07 Arkanoid game (Tetris shipped without its own numbered spec file).

### Supabase

- Client helpers: `app/lib/supabase/client.ts` (browser) and `app/lib/supabase/server.ts` (server components/actions).
- Types: `app/lib/supabase/types.ts` exports `GameRow`, `ScoreRow`, `GameWithBest` — manual TS types matching the `games` and `scores` tables (no generated types).
- `games` (id, title, short, long, cat, cover, color, created_at) and `scores` (id, game_id FK, player_name, score, user_id nullable, created_at) tables back all game listings and leaderboards — no local seed arrays anymore.
- Auth is wired (`app/auth/`) but `scores.user_id` is currently always `null`; no RLS yet.

### Games

- Each game lives under `app/games/<id>/` with a `page.tsx` (detail + leaderboard) and `play/page.tsx` (the actual game), plus a canvas component in `components/games/<Name>Game.tsx`.
- Pattern: React wraps a canvas game loop; game-over is surfaced via a React modal (not drawn on canvas) that saves the score to Supabase, pre-filling player name from `localStorage` (`av_player_name`).
- `app/games/[id]/page.tsx` and `app/hall-of-fame/` render dynamically from the `games`/`scores` tables — adding a row to `games` is enough to make a game appear across the app.
- Implemented games: (see `references/implemented-games.md` when you need check the games).
