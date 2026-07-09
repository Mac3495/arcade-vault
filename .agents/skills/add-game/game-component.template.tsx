"use client";

// Template for components/games/<Name>Game.tsx
// Copy this file, rename the component, and fill in the
// "// >>> GAME-SPECIFIC" blocks with the adapted source game logic.
// Everything outside those blocks is reusable boilerplate — copy it verbatim.
//
// Reference implementation: components/games/AsteroidsGame.tsx

import { useEffect, useRef } from "react";

// Keep this interface identical across every game — the play-page template
// depends on exactly these four callbacks existing, even if a given game
// maps some of them to a constant (e.g. a game with no "lives" concept can
// call onLivesChange(0) once and never again).
interface __Name__GameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

export function __Name__Game({
  paused,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
}: __Name__GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Mirrors the `paused` prop into a ref so the RAF loop always reads the
  // latest value without needing to be a dependency (and without restarting).
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Same trick for callbacks: updated every render, read fresh inside the loop.
  const callbacksRef = useRef({ onScoreChange, onLivesChange, onLevelChange, onGameOver });
  useEffect(() => {
    callbacksRef.current = { onScoreChange, onLivesChange, onLevelChange, onGameOver };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // >>> GAME-SPECIFIC: canvas dimensions (match the source game's canvas).
    const W = 800;
    const H = 600;

    // ── Input ─────────────────────────────────────────────────────────────
    // Keep this shape (keys map + justPressed map + pressed() helper) unless
    // the source game needs mouse input too (e.g. arkanoid) — in that case
    // add mousemove/click listeners here and remove them in the cleanup below.
    const keys: Record<string, boolean> = {};
    const justPressed: Record<string, boolean> = {};

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!keys[e.code]) justPressed[e.code] = true;
      keys[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    function pressed(code: string) {
      const val = justPressed[code];
      justPressed[code] = false;
      return val;
    }

    // >>> GAME-SPECIFIC: utils, constants, entity classes (Bullet/Asteroid/
    // Ship/Piece/Ball/Paddle/... — whatever the source game has), adapted to
    // use W/H and ctx as in the reference implementation.

    // >>> GAME-SPECIFIC: module-scope game state. The bridge below expects
    // these exact names/shapes:
    //   - `score: number`
    //   - `lives: number`   (map to something equivalent if the game has none)
    //   - `level: number`   (map to something equivalent, e.g. derived value)
    //   - a way to test "is the game over now", e.g. `state === "gameover"`
    //     or a `gameOver: boolean` flag — adjust the condition inside loop()
    //     accordingly, but keep the single-fire `gameOverNotified` guard.
    let score = 0;
    let lives = 3;
    let level = 1;
    let state: "playing" | "dead" | "gameover" = "playing";

    let prevScore = 0;
    let prevLives = 3;
    let prevLevel = 1;
    let gameOverNotified = false;

    // >>> GAME-SPECIFIC: initGame() / nextLevel() / any other setup functions.
    function initGame() {
      score = 0;
      lives = 3;
      level = 1;
      state = "playing";
      // ... spawn entities, reset ship/board/etc.
    }

    // >>> GAME-SPECIFIC: update(dt). dt is in SECONDS (convert if the source
    // used milliseconds). Gate real game logic — this function is only called
    // when NOT paused (see loop() below), so don't re-check pausedRef here.
    // Use `pressed(code)` for edge-triggered input (shoot/rotate/hard-drop)
    // and `keys[code]` for held input (movement).
    function update(dt: number) {
      // ... adapted source logic. Mutate score/lives/level/state as the game
      // plays; the loop below diffs them against prev* and fires callbacks.
      void dt;
      void pressed;
      void keys;
    }

    // >>> GAME-SPECIFIC: draw(). Keep the source's internal HUD rendering
    // (score/level/lives drawn on canvas) if it has one — only remove any
    // on-canvas "GAME OVER" overlay/restart text, since the React modal in
    // the play-page replaces it.
    function draw() {
      ctx!.fillStyle = "#000";
      ctx!.fillRect(0, 0, W, H);
      // ... draw entities + internal HUD.
    }

    initGame();

    let rafId = 0;
    let lastTime: number | null = null;

    function loop(ts: number) {
      const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;

      if (!pausedRef.current) {
        update(dt);
      }
      draw();

      if (score !== prevScore) {
        prevScore = score;
        callbacksRef.current.onScoreChange(score);
      }
      if (lives !== prevLives) {
        prevLives = lives;
        callbacksRef.current.onLivesChange(lives);
      }
      if (level !== prevLevel) {
        prevLevel = level;
        callbacksRef.current.onLevelChange(level);
      }
      // >>> GAME-SPECIFIC: adjust this condition to match the source's own
      // game-over representation (boolean flag, string state, etc.).
      if (state === "gameover" && !gameOverNotified) {
        gameOverNotified = true;
        callbacksRef.current.onGameOver(score);
      }

      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      // >>> GAME-SPECIFIC: remove any additional listeners added above
      // (mousemove/click) and stop any audio here too.
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      style={{ width: "100%", height: "100%", objectFit: "contain" }}
    />
  );
}
