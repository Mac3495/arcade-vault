"use client";

import { useEffect, useRef } from "react";
import { ARKANOID_LEVELS } from "./arkanoid-levels";

interface ArkanoidGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

export function ArkanoidGame({
  paused,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
}: ArkanoidGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const callbacksRef = useRef({ onScoreChange, onLivesChange, onLevelChange, onGameOver });
  useEffect(() => {
    callbacksRef.current = { onScoreChange, onLivesChange, onLevelChange, onGameOver };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 800;
    const H = 600;

    // ── Spritesheet ──────────────────────────────────────────────────────
    type SpriteRect = { sx: number; sy: number; sw: number; sh: number };

    const SPRITES: { paddle: SpriteRect; ball: SpriteRect; blocks: Record<string, SpriteRect> } = {
      paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
      ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
      blocks: {
        gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
        red: { sx: 32, sy: 176, sw: 32, sh: 16 },
        yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
        cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
        magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
        hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
        green: { sx: 32, sy: 208, sw: 32, sh: 16 },
      },
    };

    const EXPLOSION_FRAMES: Record<string, SpriteRect[]> = {
      red: [
        { sx: 256, sy: 176, sw: 32, sh: 16 },
        { sx: 288, sy: 176, sw: 32, sh: 16 },
        { sx: 320, sy: 176, sw: 32, sh: 16 },
        { sx: 352, sy: 176, sw: 32, sh: 16 },
      ],
      cyan: [
        { sx: 256, sy: 192, sw: 32, sh: 16 },
        { sx: 288, sy: 192, sw: 32, sh: 16 },
        { sx: 320, sy: 192, sw: 32, sh: 16 },
        { sx: 352, sy: 192, sw: 32, sh: 16 },
      ],
      green: [
        { sx: 256, sy: 208, sw: 32, sh: 16 },
        { sx: 288, sy: 208, sw: 32, sh: 16 },
        { sx: 320, sy: 208, sw: 32, sh: 16 },
        { sx: 352, sy: 208, sw: 32, sh: 16 },
      ],
      magenta: [
        { sx: 256, sy: 224, sw: 32, sh: 16 },
        { sx: 288, sy: 224, sw: 32, sh: 16 },
        { sx: 320, sy: 224, sw: 32, sh: 16 },
        { sx: 352, sy: 224, sw: 32, sh: 16 },
      ],
      yellow: [
        { sx: 256, sy: 240, sw: 32, sh: 16 },
        { sx: 288, sy: 240, sw: 32, sh: 16 },
        { sx: 320, sy: 240, sw: 32, sh: 16 },
        { sx: 352, sy: 240, sw: 32, sh: 16 },
      ],
      hotpink: [
        { sx: 256, sy: 256, sw: 32, sh: 16 },
        { sx: 288, sy: 256, sw: 32, sh: 16 },
        { sx: 320, sy: 256, sw: 32, sh: 16 },
        { sx: 352, sy: 256, sw: 32, sh: 16 },
      ],
      gray: [
        { sx: 256, sy: 176, sw: 32, sh: 16 },
        { sx: 288, sy: 176, sw: 32, sh: 16 },
        { sx: 320, sy: 176, sw: 32, sh: 16 },
        { sx: 352, sy: 176, sw: 32, sh: 16 },
      ],
    };

    const EXPLOSION_DURATION = 150;

    let ssLoaded = false;
    const ssImg = new Image();
    ssImg.onload = () => {
      ssLoaded = true;
    };
    ssImg.src = "/games/arkanoid/spritesheet-breakout.png";

    function drawSprite(name: "paddle" | "ball", x: number, y: number, w: number, h: number) {
      if (!ssLoaded) return;
      const sp = SPRITES[name];
      ctx!.drawImage(ssImg, sp.sx, sp.sy, sp.sw, sp.sh, x, y, w, h);
    }

    function drawBlockSprite(color: string, x: number, y: number, w: number, h: number) {
      if (!ssLoaded) return;
      const sp = SPRITES.blocks[color];
      if (!sp) return;
      ctx!.drawImage(ssImg, sp.sx, sp.sy, sp.sw, sp.sh, x, y, w, h);
    }

    function drawExplosionFrame(frame: SpriteRect, x: number, y: number, w: number, h: number) {
      if (!ssLoaded) return;
      ctx!.drawImage(ssImg, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h);
    }

    // ── Sonidos ──────────────────────────────────────────────────────────
    const bounceSound = new Audio("/games/arkanoid/sounds/ball-bounce.mp3");
    const breakSound = new Audio("/games/arkanoid/sounds/break-sound.mp3");

    // ── Constantes ───────────────────────────────────────────────────────
    const PADDLE_SPEED = 400;
    const BLOCK_COLS = 10;
    const BLOCK_W = 64;
    const BLOCK_H = 24;
    const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2;
    const BLOCKS_ORIGIN_Y = 80;
    const BASE_BALL_VX = 200;
    const BASE_BALL_VY = -300;

    type Block = { x: number; y: number; w: number; h: number; color: string; alive: boolean };
    type Explosion = { x: number; y: number; w: number; h: number; color: string; elapsed: number };

    const paddle = { x: 0, y: 560, w: 81, h: 14 };
    const ball = { x: 0, y: 0, w: 16, h: 16, vx: 200, vy: -300 };

    let blocks: Block[] = [];
    let explosions: Explosion[] = [];
    let lives = 3;
    let score = 0;
    let gameState: "playing" | "gameover" | "win" = "playing";
    let currentLevel = 1;

    // ── Input ────────────────────────────────────────────────────────────
    const keys: Record<string, boolean> = { ArrowLeft: false, ArrowRight: false };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key in keys) keys[e.key] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key in keys) keys[e.key] = false;
    };
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const mouseX = (e.clientX - rect.left) * scaleX;
      paddle.x = Math.max(0, Math.min(W - paddle.w, mouseX - paddle.w / 2));
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    canvas.addEventListener("mousemove", handleMouseMove);

    function initPaddle() {
      paddle.x = (W - paddle.w) / 2;
    }

    function initBall() {
      const speed = ARKANOID_LEVELS[currentLevel - 1].speed;
      ball.x = paddle.x + (paddle.w - ball.w) / 2;
      ball.y = paddle.y - ball.h;
      ball.vx = BASE_BALL_VX * speed;
      ball.vy = BASE_BALL_VY * speed;
    }

    function loadLevel(n: number) {
      currentLevel = n;
      const level = ARKANOID_LEVELS[n - 1];
      blocks = level.blocks.map((b) => ({
        x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
        y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
        w: BLOCK_W,
        h: BLOCK_H,
        color: b.color,
        alive: true,
      }));
      explosions = [];
      ball.x = paddle.x + (paddle.w - ball.w) / 2;
      ball.y = paddle.y - ball.h;
      ball.vx = BASE_BALL_VX * level.speed;
      ball.vy = BASE_BALL_VY * level.speed;
    }

    function collideAABB(block: Block) {
      return (
        ball.x < block.x + block.w &&
        ball.x + ball.w > block.x &&
        ball.y < block.y + block.h &&
        ball.y + ball.h > block.y
      );
    }

    function initGame() {
      lives = 3;
      score = 0;
      gameState = "playing";
      initPaddle();
      loadLevel(1);
    }

    // ── Update ───────────────────────────────────────────────────────────
    function update(dt: number) {
      if (gameState !== "playing") return;

      if (keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
      if (keys.ArrowRight) paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x <= 0) {
        ball.x = 0;
        ball.vx = Math.abs(ball.vx);
        void (bounceSound.cloneNode() as HTMLAudioElement).play();
      }
      if (ball.x + ball.w >= W) {
        ball.x = W - ball.w;
        ball.vx = -Math.abs(ball.vx);
        void (bounceSound.cloneNode() as HTMLAudioElement).play();
      }
      if (ball.y <= 0) {
        ball.y = 0;
        ball.vy = Math.abs(ball.vy);
        void (bounceSound.cloneNode() as HTMLAudioElement).play();
      }

      if (
        ball.vy > 0 &&
        ball.x + ball.w > paddle.x &&
        ball.x < paddle.x + paddle.w &&
        ball.y + ball.h >= paddle.y &&
        ball.y + ball.h <= paddle.y + paddle.h + 8
      ) {
        ball.y = paddle.y - ball.h;
        ball.vy = -Math.abs(ball.vy);
        void (bounceSound.cloneNode() as HTMLAudioElement).play();
      }

      for (const block of blocks) {
        if (!block.alive) continue;
        if (collideAABB(block)) {
          block.alive = false;
          explosions.push({ x: block.x, y: block.y, w: block.w, h: block.h, color: block.color, elapsed: 0 });
          score += 10;
          ball.vy = -ball.vy;
          void (breakSound.cloneNode() as HTMLAudioElement).play();
          if (blocks.every((b) => !b.alive)) {
            if (currentLevel < 5) loadLevel(currentLevel + 1);
            else gameState = "win";
          }
          break;
        }
      }

      for (const exp of explosions) exp.elapsed += dt * 1000;
      explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

      if (ball.y > H) {
        lives--;
        if (lives <= 0) {
          lives = 0;
          gameState = "gameover";
        } else {
          initBall();
        }
      }
    }

    // ── Draw ─────────────────────────────────────────────────────────────
    function draw() {
      ctx!.fillStyle = "#000";
      ctx!.fillRect(0, 0, W, H);

      for (const block of blocks) {
        if (block.alive) drawBlockSprite(block.color, block.x, block.y, block.w, block.h);
      }

      for (const exp of explosions) {
        const frameIndex = Math.min(Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4), 3);
        drawExplosionFrame(EXPLOSION_FRAMES[exp.color][frameIndex], exp.x, exp.y, exp.w, exp.h);
      }

      drawSprite("paddle", paddle.x, paddle.y, paddle.w, paddle.h);
      drawSprite("ball", ball.x, ball.y, ball.w, ball.h);

      if (gameState === "playing") {
        ctx!.fillStyle = "#fff";
        ctx!.font = "bold 18px monospace";
        ctx!.textAlign = "left";
        ctx!.textBaseline = "top";
        ctx!.fillText("Score: " + score, 10, 10);
        ctx!.textAlign = "center";
        ctx!.fillText("Nivel: " + currentLevel, W / 2, 10);
        const ballSize = 16;
        const ballSpacing = 4;
        for (let i = 0; i < lives; i++) {
          const bx = W - 10 - (lives - i) * (ballSize + ballSpacing);
          drawSprite("ball", bx, 10, ballSize, ballSize);
        }
      }
    }

    initGame();

    let rafId = 0;
    let lastTime: number | null = null;

    let prevScore = 0;
    let prevLives = 3;
    let prevLevel = 1;
    let gameOverNotified = false;

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
      if (currentLevel !== prevLevel) {
        prevLevel = currentLevel;
        callbacksRef.current.onLevelChange(currentLevel);
      }
      if ((gameState === "gameover" || gameState === "win") && !gameOverNotified) {
        gameOverNotified = true;
        callbacksRef.current.onGameOver(score);
      }

      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("mousemove", handleMouseMove);
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
