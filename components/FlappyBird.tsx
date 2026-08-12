"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BIRD_SIZE,
  GAME_HEIGHT,
  GAME_WIDTH,
  PIPE_GAP,
  PIPE_WIDTH,
  createInitialState,
  flap,
  restart,
  tick,
  type GameState,
} from "@/lib/flappy-game";

const BEST_SCORE_KEY = "flappy-best-score";

function loadBestScore(): number {
  if (typeof window === "undefined") return 0;
  const stored = localStorage.getItem(BEST_SCORE_KEY);
  return stored ? parseInt(stored, 10) : 0;
}

function saveBestScore(score: number) {
  localStorage.setItem(BEST_SCORE_KEY, String(score));
}

function drawSky(ctx: CanvasRenderingContext2D) {
  const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  gradient.addColorStop(0, "#4ec0ca");
  gradient.addColorStop(0.6, "#87ceeb");
  gradient.addColorStop(1, "#ded895");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
}

function drawGround(ctx: CanvasRenderingContext2D) {
  const groundY = GAME_HEIGHT - 40;
  ctx.fillStyle = "#ded895";
  ctx.fillRect(0, groundY, GAME_WIDTH, 40);
  ctx.fillStyle = "#73bf2e";
  ctx.fillRect(0, groundY, GAME_WIDTH, 8);
  ctx.strokeStyle = "#5a9a24";
  ctx.lineWidth = 2;
  for (let x = 0; x < GAME_WIDTH; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x, groundY + 8);
    ctx.lineTo(x + 10, groundY);
    ctx.stroke();
  }
}

function drawPipe(
  ctx: CanvasRenderingContext2D,
  x: number,
  topHeight: number,
) {
  const bottomY = topHeight + PIPE_GAP;
  const capHeight = 24;

  const drawPipeBody = (py: number, height: number) => {
    const gradient = ctx.createLinearGradient(x, py, x + PIPE_WIDTH, py);
    gradient.addColorStop(0, "#5cdb5c");
    gradient.addColorStop(0.5, "#73bf2e");
    gradient.addColorStop(1, "#4a9e22");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, py, PIPE_WIDTH, height);
    ctx.strokeStyle = "#3d7a1a";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, py, PIPE_WIDTH, height);

    const capY = py === 0 ? topHeight - capHeight : bottomY;
    ctx.fillStyle = "#73bf2e";
    ctx.fillRect(x - 4, capY, PIPE_WIDTH + 8, capHeight);
    ctx.strokeRect(x - 4, capY, PIPE_WIDTH + 8, capHeight);
  };

  drawPipeBody(0, topHeight);
  drawPipeBody(bottomY, GAME_HEIGHT - bottomY);
}

function drawBird(ctx: CanvasRenderingContext2D, x: number, y: number, velocity: number) {
  const rotation = Math.min(Math.max(velocity * 0.06, -0.5), 0.8);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  ctx.fillStyle = "#f7c948";
  ctx.beginPath();
  ctx.ellipse(0, 0, BIRD_SIZE / 2, BIRD_SIZE / 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#e8a317";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(6, -4, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.arc(8, -4, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#e85d04";
  ctx.beginPath();
  ctx.moveTo(12, 2);
  ctx.lineTo(22, 6);
  ctx.lineTo(12, 8);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#f7c948";
  ctx.beginPath();
  ctx.ellipse(-6, 4, 8, 5, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawScene(ctx: CanvasRenderingContext2D, state: GameState) {
  drawSky(ctx);
  for (const pipe of state.pipes) {
    drawPipe(ctx, pipe.x, pipe.topHeight);
  }
  drawGround(ctx);
  drawBird(ctx, state.bird.x, state.bird.y, state.bird.velocity);

  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 4;
  ctx.font = "bold 36px system-ui, sans-serif";
  ctx.textAlign = "center";
  const scoreText = String(state.score);
  ctx.strokeText(scoreText, GAME_WIDTH / 2, 60);
  ctx.fillText(scoreText, GAME_WIDTH / 2, 60);
}

export default function FlappyBird() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const [uiState, setUiState] = useState<GameState>(createInitialState());

  const syncUi = useCallback((state: GameState) => {
    setUiState({ ...state });
  }, []);

  const handleAction = useCallback(() => {
    const current = stateRef.current;
    if (current.phase === "gameover") {
      const next = restart(current);
      stateRef.current = next;
      syncUi(next);
      return;
    }
    const next = flap(current);
    stateRef.current = next;
    syncUi(next);
  }, [syncUi]);

  useEffect(() => {
    stateRef.current = createInitialState(loadBestScore());
    syncUi(stateRef.current);
  }, [syncUi]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        handleAction();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleAction]);

  useEffect(() => {
    let animationId: number;

    const loop = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx) {
        const prev = stateRef.current;
        const next = tick(prev);
        stateRef.current = next;

        if (next.phase === "gameover" && prev.phase === "playing") {
          saveBestScore(next.bestScore);
        }

        drawScene(ctx, next);

        if (
          next.phase !== prev.phase ||
          next.score !== prev.score ||
          next.frameCount % 10 === 0
        ) {
          syncUi(next);
        }
      }
      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [syncUi]);

  return (
    <div className="game-shell">
      <header className="game-header">
        <h1>Flappy Bird</h1>
        <p className="game-subtitle">Tap, click, or press Space to flap</p>
      </header>

      <div className="game-stage">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="game-canvas"
          onClick={handleAction}
          onTouchStart={(e) => {
            e.preventDefault();
            handleAction();
          }}
          role="img"
          aria-label="Flappy Bird game canvas"
        />

        {uiState.phase === "idle" && (
          <div className="game-overlay" aria-live="polite">
            <p className="overlay-title">Ready?</p>
            <p className="overlay-hint">Tap to start</p>
          </div>
        )}

        {uiState.phase === "gameover" && (
          <div className="game-overlay game-overlay--dim" aria-live="polite">
            <p className="overlay-title">Game Over</p>
            <p className="overlay-score">Score: {uiState.score}</p>
            <p className="overlay-best">Best: {uiState.bestScore}</p>
            <button type="button" className="game-btn" onClick={handleAction}>
              Play Again
            </button>
          </div>
        )}
      </div>

      <footer className="game-footer">
        <span>Score: {uiState.score}</span>
        <span>Best: {uiState.bestScore}</span>
      </footer>
    </div>
  );
}
