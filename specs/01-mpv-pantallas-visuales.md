# Spec 01 — Pantallas visuales de Arcade Vault

- **Estado:** aprobado
- **Dependencias:** Ninguna (primer spec del proyecto)
- **Fecha:** 2026-07-01
- **Objetivo:** Implementar las 5 pantallas de Arcade Vault (biblioteca, detalle de juego, reproductor placeholder, autenticación y salón de la fama) en Next.js App Router con Tailwind v4, replicando el diseño visual y las interacciones simuladas del prototipo en `references/templates/`, sin implementar lógica de juego real.

## Scope

**Dentro del alcance:**
- 5 pantallas visuales replicando el prototipo de `references/templates/`:
  - Biblioteca (`/`) — grid de juegos, búsqueda, filtro por categoría.
  - Detalle de juego (`/games/[id]`) — info del juego + leaderboard mock.
  - Reproductor placeholder (`/games/[id]/play`) — HUD (score/vidas/nivel), simulación de partida con score incremental automático, pausa, modal de fin con guardado de puntuación e iniciales.
  - Autenticación (`/auth`) — login, registro, "jugar como invitado".
  - Salón de la fama (`/hall-of-fame`) — podio + tabla de puntuaciones por juego, tabs por juego.
- Navegación (`Nav`) desktop + panel móvil (hamburguesa), coherente en todas las pantallas.
- Migración del tema visual (`styles.css`) a Tailwind v4 (variables/tokens en `app/globals.css`).
- Fuentes del template (Press Start 2P, JetBrains Mono, Courier Prime) vía `next/font/google`, reemplazando Geist.
- Datos mock en `app/data` (juegos, categorías, jugadores, generador de puntuaciones), simulando que eventualmente vendrán de una DB.
- Estado simulado client-side: usuario "logueado" y puntuaciones guardadas en `localStorage`, igual que el prototipo.

**Fuera del alcance (no se implementa en este spec):**
- Lógica real de cualquier juego (canvas, física, colisiones, input real). El "reproductor" sigue siendo una animación/HUD placeholder con score aleatorio, no un juego jugable.
- Backend, base de datos o API real. Ningún dato persiste fuera del navegador.
- Autenticación real (hash de contraseñas, sesiones server-side, OAuth con Google/GitHub — los botones sociales son solo visuales, no funcionales).
- Sistema de créditos real (el contador "CRÉDITOS · 03" del Nav es estático, no descuenta ni se recarga).
- Leaderboard agregado real entre usuarios (los rankings son datos mock generados por semilla, no puntuaciones reales de otros jugadores).
- Responsive/accesibilidad más allá de replicar el comportamiento del template (grid + menú móvil ya incluidos).

## Modelo de datos

Toda la data vive en `app/data/` como si eventualmente viniera de una DB (funciones y estructuras planas, sin lógica de fetch).

### `app/data/games.ts`
```ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export type Game = {
  id: string;          // slug, ej. "bloque-buster"
  title: string;
  short: string;        // descripción corta (card)
  long: string;         // descripción larga (detalle)
  category: GameCategory;
  cover: string;        // clase/id de fondo ilustrativo (cover-bricks, etc.)
  color: "cyan" | "magenta" | "green" | "yellow";
  best: number;          // mejor puntuación global (mock)
  plays: string;         // ej. "12.4K"
};

export const GAMES: Game[];
export const CATEGORIES: ("TODOS" | GameCategory)[];
```

### `app/data/leaderboard.ts`
```ts
export type LeaderboardRow = {
  rank: number;
  name: string;
  score: number;
  date: string; // dd/mm/aaaa
};

export const PLAYERS: string[];
export function seededScores(seed: number, count?: number): LeaderboardRow[];
```

### Estado client-side (no en `app/data`, vive en `localStorage`)
```ts
type StoredUser = { name: string };          // clave: "av_user"
type StoredScore = {                          // clave: "av_scores" (array)
  game: string;   // Game.id
  score: number;
  name: string;
  at: number;     // Date.now()
};
```

Estas dos últimas estructuras se leen/escriben directamente en `localStorage` desde los componentes cliente (auth, reproductor), igual que en el template — no requieren archivo en `app/data` porque no son "seed data", son estado de sesión simulado.

## Plan de implementación

1. **Datos mock** — Crear `app/data/games.ts` y `app/data/leaderboard.ts` portando `GAMES`, `CATEGORIES`, `PLAYERS` y `seededScores()` desde `references/templates/data.jsx` a TypeScript tipado.
2. **Tema y fuentes** — Actualizar `app/globals.css` con los tokens de color/tema de `references/templates/styles.css` (fondo, neón cyan/magenta/yellow, líneas, tipografía) como config Tailwind v4 (`@theme`). Actualizar `app/layout.tsx` para cargar Press Start 2P, JetBrains Mono y Courier Prime vía `next/font/google` en lugar de Geist, y montar los fondos decorativos (`av-bg`, `av-noise`).
3. **Nav global** — Crear componente `Nav` (client component, usa `usePathname`/`useRouter` de `next/navigation`) con versión desktop y panel móvil (hamburguesa), leyendo el usuario simulado desde `localStorage`. Montarlo en `app/layout.tsx`.
4. **Biblioteca** (`app/page.tsx`) — Grid de juegos desde `GAMES`, buscador y chips de categoría (client component), `GameCard` con tilt on hover, estado vacío "no hay resultados".
5. **Detalle** (`app/games/[id]/page.tsx`) — Info del juego + tags + stats + leaderboard mock (`seededScores`) + botones "Jugar ahora" / "Volver al Vault".
6. **Reproductor** (`app/games/[id]/play/page.tsx`) — Client component con HUD (score/vidas/nivel), simulación de partida (`setInterval` incrementando score), pausa, botón fin, modal de fin con input de iniciales y guardado del score en `localStorage` (`av_scores`).
7. **Autenticación** (`app/auth/page.tsx`) — Tabs login/registro, botón "jugar como invitado", botones sociales visuales (no funcionales); al enviar, guarda usuario simulado en `localStorage` (`av_user`) y redirige a `/`.
8. **Salón de la fama** (`app/hall-of-fame/page.tsx`) — Tabs por juego, podio top 3, tabla de puntuaciones, fila "tu mejor marca" si hay usuario logueado.
9. **Verificación visual** — Recorrer las 5 pantallas en navegador comparando contra `references/templates/`, confirmar navegación, estado responsive (mobile nav) y que login/reproductor/hall-of-fame reflejan el estado guardado en `localStorage`.

Cada paso deja la app compilando y navegable (rutas no implementadas aún devuelven 404 de Next, sin romper el resto).

## Criterios de aceptación

- [ ] `app/data/games.ts` exporta `GAMES` y `CATEGORIES` con los 8 juegos del template y tipado TypeScript.
- [ ] `app/data/leaderboard.ts` exporta `PLAYERS` y `seededScores()` con la misma lógica determinística del template.
- [ ] `app/globals.css` define los tokens de color/tema (cyan, magenta, yellow, fondo, líneas) usados por todas las pantallas.
- [ ] `app/layout.tsx` carga Press Start 2P, JetBrains Mono y Courier Prime vía `next/font/google` y monta `Nav` + footer en todas las rutas.
- [ ] `Nav` se muestra en desktop con links a Biblioteca y Salón de la Fama, y colapsa a panel móvil con hamburguesa por debajo de un breakpoint.
- [ ] `/` renderiza el grid de juegos, filtra por búsqueda de texto y por categoría, y muestra el estado "no hay resultados" cuando el filtro no matchea.
- [ ] `/games/[id]` muestra info del juego seleccionado y su leaderboard mock; con un `id` inexistente no rompe la app.
- [ ] `/games/[id]/play` incrementa el score automáticamente, permite pausar/reanudar, y al terminar la partida muestra modal con input de iniciales que guarda el score en `localStorage` bajo `av_scores`.
- [ ] `/auth` permite alternar entre login/registro, y cualquiera de las tres acciones (login, registro, invitado) guarda un usuario en `localStorage` bajo `av_user` y redirige a `/`.
- [ ] Tras loguearse, `Nav` refleja el nombre de usuario en vez del botón "Iniciar Sesión".
- [ ] `/hall-of-fame` muestra podio + tabla por juego (tabs), y si hay usuario logueado agrega la fila "tu mejor marca".
- [ ] Ninguna pantalla implementa lógica de juego real (canvas, colisiones, input de juego) — el reproductor es una simulación visual.
- [ ] `npm run build` compila sin errores de tipo ni de lint.

## Decisiones tomadas y descartadas

- **Tailwind v4 en vez de CSS plano importado** — se descartó copiar `styles.css` tal cual porque el proyecto ya está configurado con Tailwind v4 (CSS-based config); portar tokens mantiene consistencia con el resto del repo.
- **Rutas reales de App Router en vez de hash-router** — se descartó replicar el `location.hash` + `JSON.parse` del template porque no aprovecha las convenciones de Next.js (`next/navigation`, layouts anidados, URLs indexables).
- **URLs en inglés (`/games/[id]`, `/hall-of-fame`) con copy en español** — mismo patrón que el resto del código base (identificadores en inglés, texto visible en español), separando estructura de contenido.
- **Fuentes del template reemplazan a Geist** — la estética "arcade retro" (Press Start 2P, JetBrains Mono) es parte central del diseño; mantener Geist rompería la identidad visual.
- **Reproductor mantiene la simulación de partida (score incremental automático)** — sirve como placeholder funcional del futuro juego real y preserva la experiencia completa (HUD, pausa, guardado de score) sin implementar mecánicas de juego.
- **`app/data` en vez de `lib/`** — decisión explícita del usuario: los mocks viven junto a `app/` simulando que eventualmente serán reemplazados por llamadas a una DB real.
- **Sin backend/DB real, sin auth real** — fuera de alcance por ser un spec puramente visual; se pospone a un spec futuro cuando se implementen juegos y persistencia real.
