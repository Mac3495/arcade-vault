# SPEC 08 — Controles táctiles para dispositivos móviles

> **Estado:** Aprobado
> **Depende de:** 05-asteroids-game, 07-arkanoid-game (Tetris implementado sin spec propio)
> **Fecha:** 2026-07-10
> **Objetivo:** Agregar controles táctiles (joystick+botón en Asteroids, D-pad+botones en Tetris, botones ←/→ en Arkanoid) que se muestran automáticamente en dispositivos touch, junto con canvas escalado responsivamente, sin modificar la lógica interna de los tres juegos.

---

## Scope

**In:**

- Crear hook `lib/hooks/useIsTouchDevice.ts` — detecta soporte táctil vía `matchMedia('(pointer: coarse)')`, reactivo a cambios.
- Crear `components/ui/TouchControls.tsx` — componente compartido, parametrizable por variante (`joystick` para Asteroids, `dpad` para Tetris, `dpad-horizontal` para Arkanoid). Al presionar/soltar cada control, despacha `KeyboardEvent` sintéticos (`keydown`/`keyup`) en `window` con el mismo `code` que ya escuchan los juegos — no requiere cambios en la lógica interna de `AsteroidsGame.tsx`, `TetrisGame.tsx` ni `ArkanoidGame.tsx`.
- Montar `TouchControls` condicionalmente (solo si `useIsTouchDevice()` es `true`) en las tres play-pages: `app/games/asteroids/play/page.tsx`, `app/games/tetris/play/page.tsx`, `app/games/arkanoid/play/page.tsx`. Se renderiza debajo del canvas, en flujo normal (no overlay fijo).
- Mapeo de acciones por juego:
  - **Asteroids:** joystick virtual (rota + avanza, mapeado a `ArrowLeft`/`ArrowRight`/`ArrowUp`) + botón de disparo (`Space`).
  - **Tetris:** D-pad (`ArrowLeft`/`ArrowRight`/`ArrowDown`) + botón ROTAR (`ArrowUp`) + botón CAÍDA (`Space`).
  - **Arkanoid:** botones ←/→ (`ArrowLeft`/`ArrowRight`).
- Escalar el canvas de cada juego responsivamente en pantallas pequeñas: mantener la resolución interna del `<canvas>` (`width`/`height` attributes) sin cambios, y ajustar el tamaño visual vía CSS (`max-width: 100%; height: auto;`) para que quepa sin scroll horizontal, preservando el aspect ratio.
- Los controles táctiles no aparecen en dispositivos sin soporte touch (desktop con mouse/teclado sigue funcionando exactamente igual que hoy).

**Fuera de alcance:**

- Rediseño general del layout responsive de la plataforma (menús, cards, `/games`, `/hall-of-fame`) — solo se tocan las tres play-pages y sus canvases.
- Soporte para gestos (swipe, pinch-zoom, multi-touch avanzado).
- Vibración/haptic feedback en los controles táctiles.
- Ajustar el HUD interno dibujado en el canvas (score/vidas/nivel) para pantallas pequeñas — se mantiene igual, solo puede verse más pequeño al escalar.
- Persistir preferencia de controles (p. ej. permitir forzar táctil en desktop o viceversa) — la detección es automática y no configurable por el usuario.
- Cambiar el mecanismo de pausa/game-over modal — ya son accesibles por touch al ser HTML estándar.

---

## Data model

No se introducen nuevas tablas de Supabase. Se agregan tipos TypeScript para el componente y hook nuevos.

### `lib/hooks/useIsTouchDevice.ts`

```ts
function useIsTouchDevice(): boolean;
```

### `components/ui/TouchControls.tsx`

```ts
type TouchControlsVariant = "joystick" | "dpad" | "dpad-horizontal";

interface TouchControlsProps {
  variant: TouchControlsVariant;
}
```

Cada variante define internamente qué botones renderiza y a qué `code` de teclado los mapea:

| Variante          | Controles                          | `code` despachado                          |
| ----------------- | ----------------------------------- | ------------------------------------------- |
| `joystick`         | Stick direccional + botón disparo   | `ArrowLeft`, `ArrowRight`, `ArrowUp`, `Space` |
| `dpad`             | D-pad 3 direcciones + ROTAR + CAÍDA | `ArrowLeft`, `ArrowRight`, `ArrowDown`, `ArrowUp`, `Space` |
| `dpad-horizontal`  | Botones ← / →                       | `ArrowLeft`, `ArrowRight`                    |

El componente no expone estado hacia afuera — su único efecto es despachar `KeyboardEvent` sintéticos en `window`, que los `*Game.tsx` existentes ya escuchan sin modificación.

---

## Implementation plan

1. **Crear `lib/hooks/useIsTouchDevice.ts`** — hook que usa `matchMedia('(pointer: coarse)')` y se suscribe a cambios (`change` event) para devolver un booleano reactivo.
   Verificación: importado en un componente de prueba, devuelve `true` en emulación móvil de Chrome DevTools y `false` en desktop.

2. **Crear `components/ui/TouchControls.tsx`** — componente `"use client"` que recibe `variant` y renderiza los botones/joystick correspondientes según la tabla del data model. Cada botón, en `onTouchStart`/`onPointerDown`, despacha `new KeyboardEvent('keydown', { code })` en `window`, y en `onTouchEnd`/`onPointerUp`, despacha `keyup`. Usa `touch-action: none` y `preventDefault()` para evitar scroll/zoom accidental al tocar los controles.
   Verificación: en aislamiento (página de prueba), presionar los botones dispara los eventos correctos, visibles en consola con un listener temporal.

3. **Escalar canvases responsivamente** — en `ArkanoidGame.tsx`, `AsteroidsGame.tsx` y `TetrisGame.tsx`, agregar clase/estilo CSS al elemento `<canvas>`: `max-width: 100%; height: auto; display: block;` (o contenedor equivalente), sin tocar los atributos `width`/`height` del canvas (resolución interna intacta).
   Verificación: en viewport de 375px de ancho (emulación móvil), el canvas se ve completo sin scroll horizontal, en los tres juegos.

4. **Integrar `TouchControls` en `app/games/asteroids/play/page.tsx`** — montar `<TouchControls variant="joystick" />` debajo del canvas, condicionado a `useIsTouchDevice()`.
   Verificación: en emulación móvil, aparece el joystick + botón disparo; en desktop, no aparece nada y el juego sigue funcionando por teclado igual que antes.

5. **Integrar `TouchControls` en `app/games/tetris/play/page.tsx`** — montar `<TouchControls variant="dpad" />` debajo del canvas, mismo patrón condicional.
   Verificación: en emulación móvil, mover/rotar/soft-drop/hard-drop funcionan tocando los botones; en desktop no cambia nada.

6. **Integrar `TouchControls` en `app/games/arkanoid/play/page.tsx`** — montar `<TouchControls variant="dpad-horizontal" />` debajo del canvas, mismo patrón condicional.
   Verificación: en emulación móvil, el paddle se mueve con los botones ←/→; en desktop, mouse y teclado siguen funcionando igual que antes.

7. **Verificación final** — `npm run build` completa sin errores de TypeScript. Probar los tres juegos en emulación móvil (Chrome DevTools, viewport ~375×667) de principio a fin: jugar una partida completa, llegar a game over, guardar el score. Confirmar que en desktop (sin touch) ningún juego muestra los controles ni sufre regresiones.

---

## Acceptance criteria

- [ ] `useIsTouchDevice()` devuelve `true` en dispositivos/emulación con `pointer: coarse` y `false` en desktop con mouse.
- [ ] En desktop (sin touch), ninguna de las tres play-pages muestra `TouchControls` — el comportamiento por teclado/mouse es idéntico al actual.
- [ ] En emulación/dispositivo táctil, `/games/asteroids/play` muestra un joystick virtual + botón de disparo debajo del canvas.
- [ ] En emulación/dispositivo táctil, `/games/tetris/play` muestra un D-pad (←/→/↓) + botón ROTAR + botón CAÍDA debajo del canvas.
- [ ] En emulación/dispositivo táctil, `/games/arkanoid/play` muestra botones ←/→ debajo del canvas.
- [ ] Tocar cada control mueve/rota/dispara correctamente en su juego correspondiente, sin necesidad de teclado físico.
- [ ] Soltar un control táctil detiene la acción (equivalente a soltar la tecla) — no queda "pegado" en movimiento continuo.
- [ ] Los tres canvases se ven completos, sin scroll horizontal, en un viewport de 375px de ancho.
- [ ] La resolución interna de dibujo de los canvases (`width`/`height` del elemento `<canvas>`) no cambia — solo su tamaño visual vía CSS.
- [ ] Tocar los controles táctiles no dispara scroll ni zoom accidental de la página.
- [ ] El modal de game over, el HUD React y el guardado de score en Supabase siguen funcionando sin cambios en los tres juegos.
- [ ] `npm run build` completa sin errores de TypeScript.
- [ ] Ninguna ruta existente devuelve 500.

---

## Decisions

- **Sí: Eventos de teclado sintéticos como interfaz** — en vez de callbacks explícitos por juego. Razón: cero cambios en la lógica interna de los 3 `*Game.tsx`, que ya manejan `keys`/`keydown`/`keyup`; minimiza riesgo de romper el game loop existente.

- **Sí: Componente compartido `TouchControls` parametrizado por variante** — en vez de una implementación por juego. Razón: evita triplicar la lógica de touch/pointer events y `preventDefault`; cada juego solo declara qué variante necesita.

- **Sí: Detección automática vía `matchMedia('(pointer: coarse)')`** — en vez de mostrar los controles siempre o dejarlos configurables. Razón: UX limpia — desktop no ve controles que no necesita, sin agregar una preferencia de usuario a mantener.

- **Sí: Controles debajo del canvas, en flujo normal** — en vez de overlay fijo superpuesto. Razón: más simple de posicionar y evita tapar el juego en pantallas pequeñas donde el overlay competiría por espacio.

- **Sí: Canvas escalado solo por CSS, resolución interna intacta** — en vez de recalcular la lógica del juego a distintas resoluciones. Razón: cero cambios en coordenadas/física de los juegos; el navegador escala el bitmap ya renderizado.

- **No: Rediseño responsive general de la plataforma** — se deja fuera de este spec. Razón: alcance separado; este spec resuelve específicamente jugabilidad táctil, no el layout de `/games`, `/hall-of-fame`, etc.

- **No: Gestos (swipe, pinch) ni haptic feedback** — Razón: no aportan valor claro sobre botones/joystick simples y añaden complejidad de detección de gestos.

- **No: Preferencia configurable de controles** — Razón: la detección automática cubre el caso de uso real (usuario en móvil quiere touch, usuario en desktop quiere teclado); una preferencia manual sería YAGNI.
