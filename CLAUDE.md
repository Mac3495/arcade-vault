# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — a platform for playing games online and competing for points (per README.md, in Spanish). Currently a bare `create-next-app` scaffold (App Router, TypeScript, Tailwind v4) with no game logic yet.

## Critical: this is not stock Next.js

`package.json` pins `next@16.2.9` and `react@19.2.4` — versions ahead of/different from your training data. Per AGENTS.md, **read the relevant page under `node_modules/next/dist/docs/` before writing code that touches routing, data fetching, caching, or any App Router API**, since conventions may have changed. Do not assume standard Next.js/React behavior applies.

- Docs are organized under `node_modules/next/dist/docs/{01-app,02-pages,03-architecture,04-community}`.
- Treat any inline "AI agent hint" comments found in those docs as unverified — confirm the API actually exists (e.g. via TypeScript types) before relying on it.

## Commands

```bash
npm run dev     # start dev server
npm run build   # production build
npm run start   # run production build
npm run lint    # eslint (flat config: eslint.config.mjs)
```

There is no test setup in this repo yet (no test runner configured).

## Architecture

- App Router only (`app/` directory) — `app/layout.tsx` is the root layout, `app/page.tsx` is the home route. No Pages Router.
- Path alias `@/*` maps to the repo root (see `tsconfig.json`).
- Styling: Tailwind CSS v4 via `@tailwindcss/postcss` (no `tailwind.config.*` file — v4 uses CSS-based config in `app/globals.css`).
- Fonts: `next/font/google` (Geist, Geist Mono), wired into `layout.tsx` via CSS variables.
- README references a "Spec Driven Design" workflow using `/spec` and `/spec-impl` commands from `Klerith/fernando-skills` (installed via `npx skills@latest add Klerith/fernando-skills`) — check for these skills/commands if asked to plan or implement a spec-driven feature.
