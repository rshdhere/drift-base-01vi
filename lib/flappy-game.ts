export const GAME_WIDTH = 400;
export const GAME_HEIGHT = 600;
export const BIRD_SIZE = 28;
export const PIPE_WIDTH = 60;
export const PIPE_GAP = 150;
export const GRAVITY = 0.45;
export const FLAP_VELOCITY = -8;
export const PIPE_SPEED = 2.5;
export const PIPE_SPAWN_INTERVAL = 90;

export type GamePhase = "idle" | "playing" | "gameover";

export interface Bird {
  x: number;
  y: number;
  velocity: number;
}

export interface Pipe {
  x: number;
  topHeight: number;
  passed: boolean;
}

export interface GameState {
  phase: GamePhase;
  bird: Bird;
  pipes: Pipe[];
  score: number;
  bestScore: number;
  frameCount: number;
}

export function createInitialState(bestScore = 0): GameState {
  return {
    phase: "idle",
    bird: { x: 80, y: GAME_HEIGHT / 2, velocity: 0 },
    pipes: [],
    score: 0,
    bestScore,
    frameCount: 0,
  };
}

export function flap(state: GameState): GameState {
  if (state.phase === "idle") {
    return {
      ...state,
      phase: "playing",
      bird: { ...state.bird, velocity: FLAP_VELOCITY },
    };
  }
  if (state.phase === "playing") {
    return {
      ...state,
      bird: { ...state.bird, velocity: FLAP_VELOCITY },
    };
  }
  return state;
}

export function restart(state: GameState): GameState {
  const best = Math.max(state.bestScore, state.score);
  return createInitialState(best);
}

function spawnPipe(): Pipe {
  const minTop = 60;
  const maxTop = GAME_HEIGHT - PIPE_GAP - minTop;
  const topHeight = minTop + Math.random() * (maxTop - minTop);
  return { x: GAME_WIDTH, topHeight, passed: false };
}

function checkCollision(bird: Bird, pipes: Pipe[]): boolean {
  const birdLeft = bird.x - BIRD_SIZE / 2;
  const birdRight = bird.x + BIRD_SIZE / 2;
  const birdTop = bird.y - BIRD_SIZE / 2;
  const birdBottom = bird.y + BIRD_SIZE / 2;

  if (birdTop <= 0 || birdBottom >= GAME_HEIGHT) {
    return true;
  }

  for (const pipe of pipes) {
    const pipeLeft = pipe.x;
    const pipeRight = pipe.x + PIPE_WIDTH;
    const topBottom = pipe.topHeight;
    const bottomTop = pipe.topHeight + PIPE_GAP;

    const horizontalOverlap = birdRight > pipeLeft && birdLeft < pipeRight;
    if (!horizontalOverlap) continue;

    if (birdTop < topBottom || birdBottom > bottomTop) {
      return true;
    }
  }

  return false;
}

export function tick(state: GameState): GameState {
  if (state.phase !== "playing") return state;

  const frameCount = state.frameCount + 1;
  let pipes = state.pipes
    .map((p) => ({ ...p, x: p.x - PIPE_SPEED }))
    .filter((p) => p.x + PIPE_WIDTH > 0);

  if (frameCount % PIPE_SPAWN_INTERVAL === 0) {
    pipes = [...pipes, spawnPipe()];
  }

  const velocity = state.bird.velocity + GRAVITY;
  const bird = {
    ...state.bird,
    velocity,
    y: state.bird.y + velocity,
  };

  let score = state.score;
  pipes = pipes.map((pipe) => {
    if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.x) {
      score += 1;
      return { ...pipe, passed: true };
    }
    return pipe;
  });

  if (checkCollision(bird, pipes)) {
    const bestScore = Math.max(state.bestScore, score);
    return {
      ...state,
      phase: "gameover",
      bird,
      pipes,
      score,
      bestScore,
      frameCount,
    };
  }

  return {
    ...state,
    bird,
    pipes,
    score,
    frameCount,
  };
}
