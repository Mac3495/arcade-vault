"use client";

import { useEffect, useRef } from "react";

interface TetrisGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

export function TetrisGame({
  paused,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
}: TetrisGameProps) {
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

    const COLS = 10;
    const ROWS = 20;
    const BLOCK = 30;
    const BOARD_W = COLS * BLOCK;
    const PANEL_W = 130;
    const W = BOARD_W + PANEL_W;
    const H = ROWS * BLOCK;

    // ── Input ─────────────────────────────────────────────────────────────
    const keys: Record<string, boolean> = {};
    const justPressed: Record<string, boolean> = {};

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!keys[e.code]) justPressed[e.code] = true;
      keys[e.code] = true;
      if (e.code === "Space") e.preventDefault();
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

    // ── Constants ────────────────────────────────────────────────────────
    const COLORS = [
      null,
      "#4dd0e1", // I - cyan
      "#ffd54f", // O - yellow
      "#ba68c8", // T - purple
      "#81c784", // S - green
      "#e57373", // Z - red
      "#90caf9", // J - pale blue
      "#ffb74d", // L - orange
      "#9e9e9e", // N - tuerca
    ];

    const PIECES: number[][][] = [
      [],
      [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
      [[2,2],[2,2]],                             // O
      [[0,3,0],[3,3,3],[0,0,0]],                 // T
      [[0,4,4],[4,4,0],[0,0,0]],                 // S
      [[5,5,0],[0,5,5],[0,0,0]],                 // Z
      [[6,0,0],[6,6,6],[0,0,0]],                 // J
      [[0,0,7],[7,7,7],[0,0,0]],                 // L
      [[8,8,8],[8,0,8],[8,8,8]],                 // N (tuerca)
    ];

    const LINE_SCORES = [0, 100, 300, 500, 800];
    const DAS_DELAY = 0.17; // s before horizontal auto-repeat kicks in
    const DAS_INTERVAL = 0.05; // s between repeats
    const SOFT_DROP_INTERVAL = 0.05; // s between soft-drop steps while held

    type Piece = { type: number; shape: number[][]; x: number; y: number };

    function createBoard(): number[][] {
      return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
    }

    const rand = (min: number, max: number) => min + Math.random() * (max - min);

    function randomPiece(): Piece {
      const type = Math.floor(Math.random() * 8) + 1;
      const shape = PIECES[type].map((row) => [...row]);
      return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
    }

    function collide(shape: number[][], ox: number, oy: number) {
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          const nx = ox + c;
          const ny = oy + r;
          if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
          if (ny >= 0 && board[ny][nx]) return true;
        }
      }
      return false;
    }

    function rotateCW(shape: number[][]) {
      const rows = shape.length;
      const cols = shape[0].length;
      const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
      return result;
    }

    function tryRotate() {
      const rotated = rotateCW(current.shape);
      const kicks = [0, -1, 1, -2, 2];
      for (const kick of kicks) {
        if (!collide(rotated, current.x + kick, current.y)) {
          current.shape = rotated;
          current.x += kick;
          return;
        }
      }
    }

    function tryMove(dir: number) {
      if (!collide(current.shape, current.x + dir, current.y)) current.x += dir;
    }

    function merge() {
      for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
          if (current.shape[r][c]) board[current.y + r][current.x + c] = current.shape[r][c];
    }

    function clearLines() {
      let cleared = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every((v) => v !== 0)) {
          board.splice(r, 1);
          board.unshift(new Array(COLS).fill(0));
          cleared++;
          r++;
        }
      }
      if (cleared) {
        lines += cleared;
        score += (LINE_SCORES[cleared] || 0) * level;
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(0.1, 1 - (level - 1) * 0.09);
      }
    }

    function ghostY() {
      let gy = current.y;
      while (!collide(current.shape, current.x, gy + 1)) gy++;
      return gy;
    }

    function hardDrop() {
      const gy = ghostY();
      score += (gy - current.y) * 2;
      current.y = gy;
      lockPiece();
    }

    function softDrop() {
      if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
        score += 1;
      } else {
        lockPiece();
      }
    }

    function lockPiece() {
      merge();
      clearLines();
      spawn();
    }

    function spawn() {
      current = next;
      next = randomPiece();
      if (collide(current.shape, current.x, current.y)) {
        state = "gameover";
      }
    }

    // ── State ────────────────────────────────────────────────────────────
    let board = createBoard();
    let current: Piece = randomPiece();
    let next: Piece = randomPiece();
    let score = 0;
    let lines = 0;
    let lives = 0; // mapped to lines cleared — Tetris has no lives concept
    let level = 1;
    let state: "playing" | "gameover" = "playing";
    let dropInterval = 1;
    let dropAccum = 0;
    let axisTimer: Record<string, number> = { ArrowLeft: 0, ArrowRight: 0 };
    let softDropTimer = 0;

    let prevScore = 0;
    let prevLives = 0;
    let prevLevel = 1;
    let gameOverNotified = false;

    function initGame() {
      board = createBoard();
      score = 0;
      lines = 0;
      lives = 0;
      level = 1;
      state = "playing";
      dropInterval = 1;
      dropAccum = 0;
      axisTimer = { ArrowLeft: 0, ArrowRight: 0 };
      softDropTimer = 0;
      next = randomPiece();
      spawn();
    }

    function handleAxis(code: string, dir: number, dt: number) {
      if (pressed(code)) {
        tryMove(dir);
        axisTimer[code] = 0;
        return;
      }
      if (keys[code]) {
        axisTimer[code] += dt;
        const threshold = axisTimer[code] < DAS_DELAY ? DAS_DELAY : DAS_DELAY + DAS_INTERVAL;
        if (axisTimer[code] >= threshold) {
          axisTimer[code] = DAS_DELAY;
          tryMove(dir);
        }
      } else {
        axisTimer[code] = 0;
      }
    }

    function update(dt: number) {
      if (state === "gameover") return;

      handleAxis("ArrowLeft", -1, dt);
      handleAxis("ArrowRight", 1, dt);

      if (pressed("ArrowUp") || pressed("KeyX")) tryRotate();
      if (pressed("Space")) hardDrop();

      if (keys["ArrowDown"]) {
        softDropTimer += dt;
        if (softDropTimer >= SOFT_DROP_INTERVAL) {
          softDropTimer = 0;
          softDrop();
        }
      } else {
        softDropTimer = 0;
      }

      dropAccum += dt;
      if (dropAccum >= dropInterval) {
        dropAccum = 0;
        if (!collide(current.shape, current.x, current.y + 1)) {
          current.y++;
        } else {
          lockPiece();
        }
      }
    }

    function drawBlock(x: number, y: number, colorIndex: number, size: number, alpha?: number) {
      if (!colorIndex) return;
      ctx!.globalAlpha = alpha ?? 1;
      ctx!.fillStyle = COLORS[colorIndex]!;
      ctx!.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      ctx!.fillStyle = "rgba(255,255,255,0.12)";
      ctx!.fillRect(x * size + 1, y * size + 1, size - 2, 4);
      ctx!.globalAlpha = 1;
    }

    function drawBoard() {
      ctx!.strokeStyle = "rgba(255,255,255,0.06)";
      ctx!.lineWidth = 0.5;
      for (let c = 1; c < COLS; c++) {
        ctx!.beginPath();
        ctx!.moveTo(c * BLOCK, 0);
        ctx!.lineTo(c * BLOCK, ROWS * BLOCK);
        ctx!.stroke();
      }
      for (let r = 1; r < ROWS; r++) {
        ctx!.beginPath();
        ctx!.moveTo(0, r * BLOCK);
        ctx!.lineTo(COLS * BLOCK, r * BLOCK);
        ctx!.stroke();
      }

      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) drawBlock(c, r, board[r][c], BLOCK);

      const gy = ghostY();
      for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
          if (current.shape[r][c]) drawBlock(current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

      for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
          if (current.shape[r][c]) drawBlock(current.x + c, current.y + r, current.shape[r][c], BLOCK);
    }

    function drawPanel() {
      const px = BOARD_W;
      ctx!.fillStyle = "#0a0a18";
      ctx!.fillRect(px, 0, PANEL_W, H);
      ctx!.strokeStyle = "rgba(255,255,255,0.15)";
      ctx!.strokeRect(px + 0.5, 0.5, PANEL_W - 1, H - 1);

      ctx!.fillStyle = "#fff";
      ctx!.font = "bold 12px monospace";
      ctx!.textAlign = "left";
      ctx!.fillText("SIGUIENTE", px + 16, 28);

      const NB = 22;
      const shape = next.shape;
      const offX = px + 16 + Math.floor((4 - shape[0].length) / 2) * NB;
      const offY = 44 + Math.floor((4 - shape.length) / 2) * NB;
      for (let r = 0; r < shape.length; r++)
        for (let c = 0; c < shape[r].length; c++)
          if (shape[r][c]) {
            ctx!.fillStyle = COLORS[shape[r][c]]!;
            ctx!.fillRect(offX + c * NB + 1, offY + r * NB + 1, NB - 2, NB - 2);
          }

      ctx!.fillStyle = "rgba(255,255,255,0.6)";
      ctx!.font = "10px monospace";
      ctx!.fillText("LÍNEAS", px + 16, 160);
      ctx!.fillStyle = "#fff";
      ctx!.font = "bold 14px monospace";
      ctx!.fillText(String(lines), px + 16, 178);
    }

    function draw() {
      ctx!.fillStyle = "#000";
      ctx!.fillRect(0, 0, W, H);
      drawBoard();
      drawPanel();
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
      lives = lines;
      if (lives !== prevLives) {
        prevLives = lives;
        callbacksRef.current.onLivesChange(lives);
      }
      if (level !== prevLevel) {
        prevLevel = level;
        callbacksRef.current.onLevelChange(level);
      }
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
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={430}
      height={600}
      style={{ maxWidth: "100%", height: "auto", display: "block" }}
    />
  );
}
