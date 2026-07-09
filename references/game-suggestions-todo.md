# Sugerencias de juegos (TODO)

Memoria persistente de game-planner. Estado: `sugerido` | `descartado` | `implementado`.

## Space Invaders
- id: `space-invaders`
- title: `SPACE INVADERS`
- cat: `SHOOTER`
- color: `magenta`
- short: Repele la invasión alienígena antes de que aterricen
- long: Oleadas de invasores alienígenas descienden en formación mientras el jugador controla una nave en la base de la pantalla, disparando y esquivando proyectiles enemigos. La dificultad escala con la velocidad de la formación restante.
- por qué encaja: mecánica clásica de disparo con teclado (flechas + espacio), canvas simple de sprites/rectángulos, score creciente natural para leaderboard, llena el hueco de categoría SHOOTER.
- complejidad: media
- estado: sugerido

## Snake
- id: `snake`
- title: `SNAKE`
- cat: `ARCADE`
- color: `green`
- short: Crece sin chocar contra ti mismo ni los bordes
- long: El jugador controla una serpiente que se mueve en una grilla, comiendo ítems para crecer mientras evita colisionar con las paredes o su propia cola. Velocidad aumenta con el largo.
- por qué encaja: loop de canvas trivial (grilla + game tick), controles de teclado directos, estética retro/verde fosforescente CRT, complejidad baja.
- complejidad: baja
- estado: sugerido

## Slide 2048
- id: `slide-2048`
- title: `SLIDE 2048`
- cat: `PUZZLE`
- color: `yellow`
- short: Desliza y fusiona números hasta llegar a 2048
- long: Grilla 4x4 donde el jugador desliza fichas numeradas en 4 direcciones con el teclado; fichas iguales se fusionan sumando su valor. El juego termina cuando no hay más movimientos posibles.
- por qué encaja: refuerza categoría PUZZLE (hoy solo Tetris), controles simples, sin física ni colisiones complejas, game over apto para modal React.
- complejidad: baja-media
- estado: sugerido
