# Spec 02 — Home page (landing)

- **Estado:** aprobado
- **Dependencias:** Spec 01 (pantallas visuales)
- **Fecha:** 2026-07-01
- **Objetivo:** Reemplazar la ruta raíz `/` por la landing page del prototipo (`references/home-about/home.jsx`) —hero, features, preview de juegos, stats, actividad en vivo, pricing y CTA final—, moviendo la Biblioteca actual a `/biblioteca` y actualizando el Nav con el link "Inicio".

## Scope

**Dentro del alcance:**
- Nueva página `/` (`app/page.tsx`) con la landing completa de `references/home-about/home.jsx`:
  - Hero con título, subtítulo, CTAs ("Explorar juegos" → `/biblioteca`, "Crear cuenta" → `/auth`) y siluetas pixel-art flotantes decorativas.
  - Sección "¿Por qué Arcade Vault?" (feature grid de 4 tarjetas con iconos pixel SVG).
  - Sección "Juegos disponibles ahora" (mini-rail con los primeros 6 juegos de `GAMES`, cada uno navega a `/games/[id]`).
  - Sección de stats (3 bloques numéricos).
  - Sección "Actividad en vivo" (ticker de puntuaciones recientes + top jugadores del día, con link a `/hall-of-fame`).
  - Sección Pricing (card de plan único gratuito + FAQ).
  - CTA final.
  - Animaciones "reveal on scroll" (IntersectionObserver) en cada sección.
- Biblioteca actual se mueve de `app/page.tsx` a `app/biblioteca/page.tsx` (ruta `/biblioteca`), sin cambios de contenido/lógica.
- `app/data/activity.ts` — nuevo archivo mock con las puntuaciones recientes (ticker) y el top de jugadores del día, siguiendo el patrón de `games.ts`/`leaderboard.ts`.
- Actualización de `app/components/Nav.tsx`: se agrega el link "Inicio" (→ `/`) en desktop y panel móvil; "Biblioteca" pasa a apuntar a `/biblioteca`.
- Cualquier redirect/link interno que hoy apunte a `/` como Biblioteca (ej. dentro de `Nav`, botones "Volver al Vault" en detalle) se actualiza a `/biblioteca` donde corresponda.

**Fuera de alcance (no se implementa en este spec):**
- Pantalla "Acerca de" (`about.jsx`) — spec futuro.
- Datos reales de actividad/ranking (siguen siendo mock estático, no hay agregación real de partidas).
- Sistema de créditos real, autenticación real, backend/DB — igual que en Spec 01, sigue fuera de alcance.
- Cambios visuales/funcionales a la Biblioteca más allá de moverla de ruta.

## Modelo de datos

### `app/data/activity.ts` (nuevo)

```ts
export type ActivityEntry = {
  player: string;   // ej. "NEONFOX"
  game: string;      // nombre corto del juego, ej. "Caída"
  score: number;
  timeAgo: string;   // ej. "hace 2 min"
  color: "cyan" | "magenta" | "yellow" | "green";
};

export type TopPlayerToday = {
  rank: number;
  player: string;
  score: number;
};

export const RECENT_ACTIVITY: ActivityEntry[];
export const TOP_PLAYERS_TODAY: TopPlayerToday[];
```

No se introduce estado nuevo en `localStorage` ni se modifican `Game`/`LeaderboardRow` existentes. El resto del home (features, stats, pricing, siluetas) es contenido estático embebido en el componente, sin modelo de datos propio.

## Plan de implementación

1. **Mover Biblioteca** — Crear `app/biblioteca/page.tsx` con el contenido actual de `app/page.tsx` (grid, búsqueda, chips), sin cambios de lógica. Eliminar el contenido viejo de `app/page.tsx` (se sobrescribe en el paso 4).
2. **Datos de actividad** — Crear `app/data/activity.ts` con `RECENT_ACTIVITY` y `TOP_PLAYERS_TODAY`, portando los valores hardcodeados de `references/home-about/home.jsx`.
3. **Tema del home** — Portar a `app/globals.css` las clases CSS específicas del home que falten (`.home*`, `.feature-*`, `.mini-*`, `.stat-*`, `.activity-*`, `.top-*`, `.pricing-*`, `.faq-*`, `.reveal`) desde `references/home-about/styles.css` (líneas ~930 en adelante), siguiendo el mismo patrón de tokens ya usado en Spec 01.
4. **Componente Home** (`app/page.tsx`) — Client component que replica `home.jsx`: hero con `FloatingSilhouettes` y CTAs (`Link` a `/biblioteca` y `/auth`), hook `useReveal()` (IntersectionObserver) aplicado a las secciones con clase `reveal`, feature grid, mini-rail de juegos (`GAMES.slice(0, 6)`, cada `MiniCard` linkea a `/games/[id]`), stats, actividad en vivo (usando `RECENT_ACTIVITY`/`TOP_PLAYERS_TODAY`, link "Ver salón" → `/hall-of-fame`), pricing (CTA → `/auth`) y CTA final (→ `/biblioteca`).
5. **Nav actualizado** — En `app/components/Nav.tsx`: agregar link "Inicio" (→ `/`, activo cuando `pathname === "/"`) antes de "Biblioteca"; "Biblioteca" ahora apunta a `/biblioteca` y su `isActive` cubre `/biblioteca` y `/games/*`. Replicar en el panel móvil.
6. **Ajustar links internos** — Revisar `app/games/[id]/page.tsx` y cualquier otro botón "Volver al Vault"/similar que hoy navegue a `/` esperando la Biblioteca, y actualizarlo a `/biblioteca`.
7. **Verificación visual** — Recorrer `/` (home nuevo), `/biblioteca` (grid movido) y la navegación completa (Nav desktop + móvil) comparando contra `references/home-about/`; confirmar que el reveal-on-scroll funciona y que todos los CTAs navegan a la ruta correcta.

Cada paso deja la app compilando y navegable.

## Criterios de aceptación

- [ ] `/` renderiza la landing (hero, features, mini-rail de juegos, stats, actividad en vivo, pricing, CTA final), no la Biblioteca.
- [ ] `/biblioteca` renderiza el grid de juegos con búsqueda y filtro por categoría, igual que antes en `/`.
- [ ] El hero de `/` muestra las siluetas pixel-art flotantes y los botones "Explorar juegos" (→ `/biblioteca`) y "Crear cuenta" (→ `/auth`).
- [ ] Las secciones del home con clase `reveal` aparecen animadas al hacer scroll (IntersectionObserver), no todas visibles de entrada.
- [ ] El mini-rail muestra 6 juegos de `GAMES` y cada tarjeta navega a `/games/[id]` correspondiente.
- [ ] La sección "Actividad en vivo" lee de `app/data/activity.ts` (`RECENT_ACTIVITY`, `TOP_PLAYERS_TODAY`) y el link "Ver salón" navega a `/hall-of-fame`.
- [ ] La sección Pricing muestra el plan único gratuito y el FAQ, con CTA "Empezar gratis" → `/auth`.
- [ ] El CTA final navega a `/biblioteca`.
- [ ] `Nav` muestra "Inicio" (→ `/`) y "Biblioteca" (→ `/biblioteca`) como links distintos, cada uno resaltado como activo en su ruta correspondiente, en desktop y en el panel móvil.
- [ ] Ningún link interno de la app (Nav, detalle de juego, etc.) apunta a `/` esperando encontrar la Biblioteca.
- [ ] `npm run build` compila sin errores de tipo ni de lint.

## Decisiones tomadas y descartadas

- **`/` pasa a ser el home/landing y la Biblioteca se mueve a `/biblioteca`** — se descartó mantener `/` como Biblioteca y poner el home en otra ruta porque el prototipo trata "Inicio" y "Biblioteca" como conceptos distintos en el Nav; darle la raíz al home es lo esperado en un sitio con landing propia.
- **About (`about.jsx`) queda fuera de este spec** — aunque vive en la misma carpeta de referencia, el pedido inicial fue específicamente "home page"; se aborda en un spec futuro para no mezclar dos pantallas con objetivos distintos en un mismo spec.
- **`app/data/activity.ts` como archivo mock nuevo** — se descartó hardcodear el ticker y el top de jugadores directamente en el componente Home porque el proyecto ya sigue el patrón "toda la data mock vive en `app/data`" (establecido en Spec 01 con `games.ts`/`leaderboard.ts`); mantiene consistencia y facilita reemplazarlo por datos reales a futuro.
- **Se incluyen reveal-on-scroll y siluetas flotantes** — son parte central de la identidad visual "arcade retro" del prototipo; omitirlas dejaría el home visualmente plano respecto a la referencia.
- **Se incluye la sección Pricing tal cual** — aunque no hay planes de pago reales, la sección comunica el modelo "gratis para siempre" del producto y forma parte del contenido del prototipo aprobado.
