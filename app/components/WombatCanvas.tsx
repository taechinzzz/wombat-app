'use client';

import { useEffect, useRef } from 'react';

const SPRITE_SIZE = 32;
const SCALE = 2;
const DISPLAY_SIZE = SPRITE_SIZE * SCALE;
const FRAME_MS = 100;
const WALK_PX = 6;
const GRAVITY = 0.001;
const CLIMB_PX = 3;
const MIN_CLIMB_HEIGHT = 100;
const MAX_CLIMB_HEIGHT = 200;
const BOUNCE_DAMP = 0.45;
const VX_DAMP = 0.75;
const SPRITE_VARIANTS = ['/browny.png', '/pika.png', '/purple.png', '/red.png', '/green.png', '/white.png', '/blue.png', '/panda.png'];
const WOMBAT_COUNT = SPRITE_VARIANTS.length;
const HEAD_PIVOT_Y = DISPLAY_SIZE * 0.18;

const BALL_SPRITE_SIZE = 16;
const BALL_DISPLAY_SIZE = BALL_SPRITE_SIZE * SCALE;
const BALL_RADIUS = BALL_DISPLAY_SIZE / 2;
const BALL_GROUND_OFFSET = 12;
const BALL_GRAVITY = 0.0009;
const BALL_BOUNCE_DAMP = 0.55;
const BALL_ROLL_DAMP = 0.985;
const CHASE_NOTICE_RADIUS = 120;
const CHASE_SPEED = 9;
const KICK_RANGE = 22;
const KICK_POWER_MIN = 0.35;
const KICK_POWER_MAX = 0.55;
const KICK_UP = 0.3;

const POO_FRAME_SIZE = 16;
const POO_DISPLAY_SIZE = POO_FRAME_SIZE * SCALE;
const POO_FRAME_COUNT = 5;
const POO_FRAME_MS = 120;
const POO_HOLD_MS = 10000;
const POO_COOLDOWN_MIN = 8000;
const POO_COOLDOWN_MAX = 26000;

const ANIMS = {
  'stand-idle':              { row: 0,  count: 10, pp: false },
  'stand-walk':              { row: 1,  count: 8,  pp: false },
  'stand-to-Sit':            { row: 2,  count: 3,  pp: false },
  'sit-idle':                { row: 3,  count: 5,  pp: false },
  'sit-spin':                { row: 4,  count: 8,  pp: false },
  'sit-to-stand':            { row: 5,  count: 3,  pp: false },
  'stand-to-sleep':          { row: 6,  count: 4,  pp: false },
  'sleeping':                { row: 7,  count: 7,  pp: true  },
  'sleep-rolling':           { row: 8,  count: 5,  pp: true  },
  'sleep-to-stand':          { row: 9,  count: 3,  pp: false },
  'sit-sideway':             { row: 10, count: 5,  pp: false },
  'sideway-add-coffee':      { row: 11, count: 3,  pp: false },
  'sideway-Drinking-coffee': { row: 12, count: 5,  pp: false },
  'sideway-remove-coffee':   { row: 13, count: 4,  pp: false },
  'sideway-add-beer':        { row: 14, count: 4,  pp: false },
  'sideway-drimking-beer':   { row: 15, count: 5,  pp: false },
  'remove-beer':             { row: 16, count: 4,  pp: false },
  'sideway-add-macbook':     { row: 17, count: 4,  pp: false },
  'sideway-working-macbok':  { row: 18, count: 4,  pp: false },
  'sideway-remove-macbook':  { row: 19, count: 4,  pp: false },
  'sideway-add-phone':       { row: 20, count: 2,  pp: false },
  'sideway-call-phone':      { row: 21, count: 6,  pp: false },
  'sideway-remove-phone':    { row: 22, count: 2,  pp: false },
  'sideway-to-stand':        { row: 23, count: 4,  pp: false },
  'stand-to-ball':           { row: 24, count: 3,  pp: false },
  'balling':                 { row: 25, count: 4,  pp: false },
  'ball-to-stand':           { row: 26, count: 3,  pp: false },
  'sleep-add-dumbbell':      { row: 27, count: 7,  pp: false },
  'sleep-bench-press':       { row: 28, count: 6,  pp: true  },
  'sleep-remove-dumbbell':   { row: 29, count: 7,  pp: false },
  'stand-twork':             { row: 30, count: 5,  pp: false },
  'stand-to-climb':          { row: 31, count: 3,  pp: false },
  'climbing':                { row: 32, count: 4,  pp: false },
  'climb-idle':              { row: 33, count: 4,  pp: false },
  'climb-to-ball':           { row: 34, count: 3,  pp: false },
  'Pulle':                   { row: 35, count: 4,  pp: false },
  'stand-to-burrowing':      { row: 36, count: 7,  pp: false },
  'burrowing-idle':          { row: 37, count: 4,  pp: false },
  'burrrowing-to-stand':     { row: 38, count: 5,  pp: false },
} as const;

type AnimName = keyof typeof ANIMS;

interface Step {
  anim: AnimName;
  loops: number;
  walk?: boolean;
  speed?: number;
}
type Sequence = Step[];

function stepTotalFrames(step: Step): number {
  const { count, pp } = ANIMS[step.anim];
  const cycleLen = pp ? 2 * (count - 1) : count;
  return step.loops * cycleLen;
}

function getFrameIdx(elapsed: number, anim: AnimName): number {
  const { count, pp } = ANIMS[anim];
  if (!pp) return elapsed % count;
  const cycleLen = 2 * (count - 1);
  const pos = elapsed % cycleLen;
  return pos < count ? pos : cycleLen - pos;
}

const CLIMB_SEQ: Sequence = [
  { anim: 'stand-to-climb', loops: 1 },
  { anim: 'climbing', loops: 9999 },
];
const CLIMB_EXIT_SEQ: Sequence = [{ anim: 'climb-to-ball', loops: 1 }];
const FALL_SEQ: Sequence = [{ anim: 'balling', loops: 9999 }];
const LAND_SEQ: Sequence = [
  { anim: 'sleep-to-stand', loops: 1 },
];
const DRAG_SEQ: Sequence = [{ anim: 'Pulle', loops: 9999 }];
const CHASE_SEQ: Sequence = [{ anim: 'stand-walk', loops: 9999 }];

const WALK_SEQS: Sequence[] = [
  [{ anim: 'stand-walk', loops: 3, walk: true }, { anim: 'stand-idle', loops: 1 }],
  [{ anim: 'stand-walk', loops: 5, walk: true }],
  [{ anim: 'stand-walk', loops: 2, walk: true }, { anim: 'stand-idle', loops: 2 }],
  [{ anim: 'stand-walk', loops: 6, walk: true }],
  [{ anim: 'stand-walk', loops: 4, walk: true }, { anim: 'stand-idle', loops: 1 }],
];

const IDLE_SEQS: Sequence[] = [
  [{ anim: 'stand-idle', loops: 2 }],
  [{ anim: 'stand-idle', loops: 3 }],
  [{ anim: 'stand-to-Sit', loops: 1 }, { anim: 'sit-idle', loops: 2 }, { anim: 'sit-to-stand', loops: 1 }],
  [{ anim: 'stand-to-Sit', loops: 1 }, { anim: 'sit-idle', loops: 1 }, { anim: 'sit-spin', loops: 4 }, { anim: 'sit-idle', loops: 1 }, { anim: 'sit-to-stand', loops: 1 }],
];

const ACTIVITY_SEQS: Sequence[] = [
  [
    { anim: 'stand-to-ball', loops: 1 },
    { anim: 'balling', loops: 6, walk: true, speed: 18 },
    { anim: 'ball-to-stand', loops: 1 },
  ],
  [{ anim: 'stand-to-sleep', loops: 1 }, { anim: 'sleeping', loops: 4 }, { anim: 'sleep-to-stand', loops: 1 }],
  [
    { anim: 'sit-sideway', loops: 1 },
    { anim: 'sideway-add-coffee', loops: 1 },
    { anim: 'sideway-Drinking-coffee', loops: 4 },
    { anim: 'sideway-remove-coffee', loops: 1 },
    { anim: 'sideway-to-stand', loops: 1 },
  ],
  [
    { anim: 'sit-sideway', loops: 1 },
    { anim: 'sideway-add-beer', loops: 1 },
    { anim: 'sideway-drimking-beer', loops: 4 },
    { anim: 'remove-beer', loops: 1 },
    { anim: 'sideway-to-stand', loops: 1 },
  ],
  [
    { anim: 'sit-sideway', loops: 1 },
    { anim: 'sideway-add-macbook', loops: 1 },
    { anim: 'sideway-working-macbok', loops: 10 },
    { anim: 'sideway-remove-macbook', loops: 1 },
    { anim: 'sideway-to-stand', loops: 1 },
  ],
  [
    { anim: 'sit-sideway', loops: 1 },
    { anim: 'sideway-add-phone', loops: 1 },
    { anim: 'sideway-call-phone', loops: 8 },
    { anim: 'sideway-remove-phone', loops: 1 },
    { anim: 'sideway-to-stand', loops: 1 },
  ],
  [
    { anim: 'stand-to-sleep', loops: 1 },
    { anim: 'sleep-add-dumbbell', loops: 1 },
    { anim: 'sleep-bench-press', loops: 6 },
    { anim: 'sleep-remove-dumbbell', loops: 1 },
    { anim: 'sleep-to-stand', loops: 1 },
  ],
  [{ anim: 'stand-twork', loops: 8 }, { anim: 'stand-idle', loops: 1 }],
  [
    { anim: 'stand-to-burrowing', loops: 1 },
    { anim: 'burrowing-idle', loops: 12 },
    { anim: 'burrrowing-to-stand', loops: 1 },
  ],
];

function pickSeq(): Sequence {
  const r = Math.random();
  if (r < 0.45) return WALK_SEQS[Math.floor(Math.random() * WALK_SEQS.length)];
  if (r < 0.65) return IDLE_SEQS[Math.floor(Math.random() * IDLE_SEQS.length)];
  return ACTIVITY_SEQS[Math.floor(Math.random() * ACTIVITY_SEQS.length)];
}

type Mode = 'ground' | 'climbing' | 'airborne' | 'dragging' | 'chasing';

interface State {
  x: number;
  y: number;
  facingRight: boolean;
  seq: Sequence;
  stepIdx: number;
  elapsed: number;
  timer: number;
  vx: number;
  vy: number;
  mode: Mode;
  climbWall: 'left' | 'right';
  climbExiting: boolean;
  targetClimbHeight: number;
  bounceCount: number;
  pooCooldown: number;
  pooReady: boolean;
  tworkPooTimer: number;
  swingAngle: number;
  swingVel: number;
  spriteVariant: number;
  wantsKick: boolean;
  kickVx: number;
  kickVy: number;
  ignoreChase: number;
}

function initWombat(index: number, canvasW: number, groundY: number): State {
  const slot = canvasW / WOMBAT_COUNT;
  return {
    x: slot * index + Math.random() * Math.max(0, slot - DISPLAY_SIZE),
    y: groundY - DISPLAY_SIZE,
    facingRight: Math.random() > 0.5,
    seq: pickSeq(),
    stepIdx: 0,
    elapsed: Math.floor(Math.random() * 8),
    timer: Math.random() * FRAME_MS,
    vx: 0,
    vy: 0,
    mode: 'ground',
    climbWall: 'left',
    climbExiting: false,
    targetClimbHeight: MAX_CLIMB_HEIGHT,
    bounceCount: 0,
    pooCooldown: POO_COOLDOWN_MIN + Math.random() * (POO_COOLDOWN_MAX - POO_COOLDOWN_MIN),
    pooReady: false,
    tworkPooTimer: 0,
    swingAngle: 0,
    swingVel: 0,
    spriteVariant: index % SPRITE_VARIANTS.length,
    wantsKick: false,
    kickVx: 0,
    kickVy: 0,
    ignoreChase: 0,
  };
}

const POO_ANIMS = new Set<AnimName>(['stand-twork', 'stand-idle', 'stand-walk']);
const TWORK_POO_MS = 350;

// Animations that mean the wombat is standing (or just finished transitioning to stand)
const CAN_CHASE_ANIMS = new Set<AnimName>([
  'stand-idle', 'stand-walk', 'stand-twork',
  'sit-to-stand', 'sleep-to-stand', 'sideway-to-stand', 'ball-to-stand', 'burrrowing-to-stand',
]);

const SIT_ANIMS = new Set<AnimName>(['stand-to-Sit', 'sit-idle', 'sit-spin']);
const SLEEP_ANIMS = new Set<AnimName>(['stand-to-sleep', 'sleeping', 'sleep-rolling', 'sleep-add-dumbbell', 'sleep-bench-press', 'sleep-remove-dumbbell']);
const SIDEWAY_ANIMS = new Set<AnimName>(['sit-sideway', 'sideway-add-coffee', 'sideway-Drinking-coffee', 'sideway-remove-coffee', 'sideway-add-beer', 'sideway-drimking-beer', 'remove-beer', 'sideway-add-macbook', 'sideway-working-macbok', 'sideway-remove-macbook', 'sideway-add-phone', 'sideway-call-phone', 'sideway-remove-phone']);
const BALL_ANIMS = new Set<AnimName>(['stand-to-ball', 'balling']);
const BURROW_ANIMS = new Set<AnimName>(['stand-to-burrowing', 'burrowing-idle']);
// Activities the wombat is allowed to finish completely before noticing the ball
const NO_INTERRUPT_ANIMS = new Set<AnimName>([...SLEEP_ANIMS, ...SIDEWAY_ANIMS]);

// Returns [transitionSeq, ignoreChaseMs] based on what the wombat is currently doing
function getReturnToStandSeq(anim: AnimName): [Sequence, number] {
  if (SIT_ANIMS.has(anim))    return [[{ anim: 'sit-to-stand',        loops: 1 }], 4 * FRAME_MS];
  if (BALL_ANIMS.has(anim))   return [[{ anim: 'ball-to-stand',       loops: 1 }], 4 * FRAME_MS];
  if (BURROW_ANIMS.has(anim)) return [[{ anim: 'burrrowing-to-stand', loops: 1 }], 6 * FRAME_MS];
  return [[{ anim: 'stand-idle', loops: 1 }], 11 * FRAME_MS];
}

function tickGround(s: State, dt: number, canvasW: number, groundY: number, ballX: number, ballY: number): State {
  let { x, facingRight, seq, stepIdx, elapsed, timer, pooCooldown, tworkPooTimer } = s;
  const ignoreChase = Math.max(0, s.ignoreChase - dt);

  const centerX = x + DISPLAY_SIZE / 2;
  const ballGrounded = ballY > groundY - BALL_RADIUS - 60;
  const currentAnimNow = seq[stepIdx].anim;
  if (ballGrounded && Math.abs(ballX - centerX) < CHASE_NOTICE_RADIUS && ignoreChase <= 0 && !NO_INTERRUPT_ANIMS.has(currentAnimNow)) {
    if (CAN_CHASE_ANIMS.has(currentAnimNow)) {
      return { ...s, mode: 'chasing', seq: CHASE_SEQ, stepIdx: 0, elapsed: 0, timer: 0, wantsKick: false, pooReady: false, ignoreChase: 0 };
    } else {
      const [returnSeq, returnMs] = getReturnToStandSeq(currentAnimNow);
      return { ...s, seq: returnSeq, stepIdx: 0, elapsed: 0, timer: 0, pooReady: false, wantsKick: false, ignoreChase: returnMs };
    }
  }

  let pooReady = false;
  const currentAnim = seq[stepIdx].anim;

  // Only poop when facing right — butt is always on the left, no directional logic needed
  const triggerPoo = () => { if (facingRight) pooReady = true; };

  // Normal random poo
  pooCooldown -= dt;
  if (pooCooldown <= 0) {
    if (POO_ANIMS.has(currentAnim)) triggerPoo();
    pooCooldown = POO_COOLDOWN_MIN + Math.random() * (POO_COOLDOWN_MAX - POO_COOLDOWN_MIN);
  }

  // Twork rapid poo
  if (currentAnim === 'stand-twork') {
    tworkPooTimer -= dt;
    if (tworkPooTimer <= 0) {
      triggerPoo();
      tworkPooTimer = TWORK_POO_MS;
    }
  } else {
    tworkPooTimer = 0;
  }
  timer += dt;
  while (timer >= FRAME_MS) {
    timer -= FRAME_MS;
    const step = seq[stepIdx];
    if (step.walk) {
      const px = step.speed ?? WALK_PX;
      x += facingRight ? px : -px;
      if (x <= 0) {
        x = 0;
        return { ...s, x, y: groundY - DISPLAY_SIZE, facingRight, mode: 'climbing', climbWall: 'left', climbExiting: false, targetClimbHeight: MIN_CLIMB_HEIGHT + Math.random() * (MAX_CLIMB_HEIGHT - MIN_CLIMB_HEIGHT), seq: CLIMB_SEQ, stepIdx: 0, elapsed: 0, timer, vx: 0, vy: 0, bounceCount: 0, wantsKick: false, pooCooldown, pooReady, tworkPooTimer };
      }
      if (x >= canvasW - DISPLAY_SIZE) {
        x = canvasW - DISPLAY_SIZE;
        return { ...s, x, y: groundY - DISPLAY_SIZE, facingRight, mode: 'climbing', climbWall: 'right', climbExiting: false, targetClimbHeight: MIN_CLIMB_HEIGHT + Math.random() * (MAX_CLIMB_HEIGHT - MIN_CLIMB_HEIGHT), seq: CLIMB_SEQ, stepIdx: 0, elapsed: 0, timer, vx: 0, vy: 0, bounceCount: 0, wantsKick: false, pooCooldown, pooReady, tworkPooTimer };
      }
    }
    elapsed++;
    if (elapsed >= stepTotalFrames(step)) {
      stepIdx++;
      elapsed = 0;
      if (stepIdx >= seq.length) {
        seq = pickSeq();
        stepIdx = 0;
        if (Math.random() < 0.5) facingRight = !facingRight;
      }
    }
  }
  return { ...s, x, y: groundY - DISPLAY_SIZE, facingRight, seq, stepIdx, elapsed, timer, pooCooldown, pooReady, tworkPooTimer, wantsKick: false, ignoreChase };
}

function tickClimbing(s: State, dt: number, canvasW: number, groundY: number): State {
  let { x, y, facingRight, seq, stepIdx, elapsed, timer, climbWall, climbExiting } = s;
  timer += dt;
  while (timer >= FRAME_MS) {
    timer -= FRAME_MS;
    if (climbExiting) {
      elapsed++;
      const step = seq[stepIdx];
      if (elapsed >= stepTotalFrames(step)) {
        const vx = climbWall === 'left' ? 0.5 : -0.5;
        return { ...s, x, y, facingRight, mode: 'airborne', seq: FALL_SEQ, stepIdx: 0, elapsed: 0, timer, vx, vy: -0.3, bounceCount: 0, climbExiting: false, wantsKick: false, pooReady: false };
      }
    } else {
      y -= CLIMB_PX;
      x = climbWall === 'left' ? 0 : canvasW - DISPLAY_SIZE;
      elapsed++;
      const step = seq[stepIdx];
      if (elapsed >= stepTotalFrames(step) && stepIdx < seq.length - 1) {
        stepIdx++;
        elapsed = 0;
      }
      if ((groundY - DISPLAY_SIZE) - y >= s.targetClimbHeight) {
        return { ...s, x, y, facingRight, seq: CLIMB_EXIT_SEQ, stepIdx: 0, elapsed: 0, timer, climbExiting: true, wantsKick: false, pooReady: false };
      }
    }
  }
  return { ...s, x, y, facingRight, seq, stepIdx, elapsed, timer, climbExiting, wantsKick: false, pooReady: false };
}

function tickAirborne(s: State, dt: number, canvasW: number, groundY: number): State {
  let { x, y, facingRight, seq, stepIdx, elapsed, timer, vx, vy, bounceCount } = s;
  vy += GRAVITY * dt;
  x += vx * dt;
  y += vy * dt;
  if (vx !== 0) facingRight = vx > 0;
  if (x <= 0) { x = 0; vx = Math.abs(vx) * VX_DAMP; facingRight = true; }
  else if (x >= canvasW - DISPLAY_SIZE) { x = canvasW - DISPLAY_SIZE; vx = -Math.abs(vx) * VX_DAMP; facingRight = false; }
  timer += dt;
  while (timer >= FRAME_MS) {
    timer -= FRAME_MS;
    elapsed++;
    const step = seq[stepIdx];
    if (elapsed >= stepTotalFrames(step) && stepIdx < seq.length - 1) { stepIdx++; elapsed = 0; }
  }
  const groundPos = groundY - DISPLAY_SIZE;
  if (y >= groundPos) {
    y = groundPos;
    if (Math.abs(vy) < 0.08 || bounceCount >= 3) {
      return { ...s, x, y, facingRight, mode: 'ground', seq: LAND_SEQ, stepIdx: 0, elapsed: 0, timer: 0, vx: 0, vy: 0, bounceCount: 0, wantsKick: false, pooReady: false, ignoreChase: 0 };
    }
    vy = -Math.abs(vy) * BOUNCE_DAMP;
    vx *= VX_DAMP;
    bounceCount++;
  }
  return { ...s, x, y, facingRight, seq, stepIdx, elapsed, timer, vx, vy, bounceCount, wantsKick: false, pooReady: false };
}

const SWING_GRAVITY = 0.00007;   // ~750ms natural swing period, a relaxed pendulum feel
const SWING_DAMPING = 0.0055;
const SWING_DRIVE = 0.000025;
const MAX_SWING_VEL = 0.025; // rad/ms, hard cap (~4 rotations/sec) so it can't spin absurdly fast
const BASE_FOLLOW_TAU = 35;     // ms, near-instant tracking when not spinning
const SPIN_LAG_FACTOR = 25000;  // ms of extra lag per (rad/ms) of spin speed

function tickDragging(s: State, dt: number, dragVelX: number, targetX: number, targetY: number): State {
  let { x, y, seq, stepIdx, elapsed, timer, swingAngle, swingVel } = s;

  // The faster it's spinning, the more it lags/drifts from the pointer -
  // like centrifugal force stretching the grip out.
  const followTau = BASE_FOLLOW_TAU + Math.abs(swingVel) * SPIN_LAG_FACTOR;
  const followFactor = 1 - Math.exp(-dt / followTau);
  x += (targetX - x) * followFactor;
  y += (targetY - y) * followFactor;

  const accel = -SWING_GRAVITY * Math.sin(swingAngle) - SWING_DAMPING * swingVel + SWING_DRIVE * dragVelX;
  swingVel = Math.max(-MAX_SWING_VEL, Math.min(MAX_SWING_VEL, swingVel + accel * dt));
  swingAngle += swingVel * dt;

  timer += dt;
  while (timer >= FRAME_MS) {
    timer -= FRAME_MS;
    elapsed++;
    const step = seq[stepIdx];
    if (elapsed >= stepTotalFrames(step) && stepIdx < seq.length - 1) { stepIdx++; elapsed = 0; }
  }
  return { ...s, x, y, seq, stepIdx, elapsed, timer, swingAngle, swingVel, wantsKick: false, pooReady: false };
}

function tickChasing(s: State, dt: number, canvasW: number, groundY: number, ballX: number, ballY: number): State {
  let { x, facingRight, seq, stepIdx, elapsed, timer } = s;

  // Ball wandered off (kicked away by someone else, or flew into the air) - give up
  if (ballY <= groundY - BALL_RADIUS - 60) {
    return { ...s, mode: 'ground', seq: pickSeq(), stepIdx: 0, elapsed: 0, timer: 0, wantsKick: false, pooReady: false, ignoreChase: 0 };
  }

  timer += dt;
  while (timer >= FRAME_MS) {
    timer -= FRAME_MS;

    const centerX = x + DISPLAY_SIZE / 2;
    const dx = ballX - centerX;

    if (Math.abs(dx) < KICK_RANGE) {
      const dir = dx >= 0 ? 1 : -1;
      const kickVx = dir * (KICK_POWER_MIN + Math.random() * (KICK_POWER_MAX - KICK_POWER_MIN));
      return {
        ...s, x, y: groundY - DISPLAY_SIZE, facingRight: dir > 0,
        mode: 'ground', seq: pickSeq(), stepIdx: 0, elapsed: 0, timer,
        wantsKick: true, kickVx, kickVy: -KICK_UP, pooReady: false, ignoreChase: 0,
      };
    }

    facingRight = dx > 0;
    x = Math.max(0, Math.min(canvasW - DISPLAY_SIZE, x + (facingRight ? CHASE_SPEED : -CHASE_SPEED)));

    elapsed++;
    if (elapsed >= stepTotalFrames(seq[stepIdx])) elapsed = 0;
  }

  return { ...s, x, y: groundY - DISPLAY_SIZE, facingRight, seq, stepIdx, elapsed, timer, wantsKick: false, pooReady: false };
}

function tickState(s: State, dt: number, canvasW: number, groundY: number, dragVelX: number, dragTargetX: number, dragTargetY: number, ballX: number, ballY: number): State {
  if (s.mode === 'dragging') return tickDragging(s, dt, dragVelX, dragTargetX, dragTargetY);
  if (s.mode === 'climbing') return tickClimbing(s, dt, canvasW, groundY);
  if (s.mode === 'airborne') return tickAirborne(s, dt, canvasW, groundY);
  if (s.mode === 'chasing') return tickChasing(s, dt, canvasW, groundY, ballX, ballY);
  return tickGround(s, dt, canvasW, groundY, ballX, ballY);
}

interface PooParticle {
  x: number;
  y: number;
  frame: number;
  frameTimer: number;
  holding: boolean;
  holdTimer: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
}

function drawBall(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, rotation: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.drawImage(img, 0, 0, BALL_SPRITE_SIZE, BALL_SPRITE_SIZE, -BALL_RADIUS, -BALL_RADIUS, BALL_DISPLAY_SIZE, BALL_DISPLAY_SIZE);
  ctx.restore();
}

export default function WombatCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statesRef = useRef<State[]>([]);
  const pooRef = useRef<PooParticle[]>([]);
  const ballRef = useRef<Ball>({ x: 0, y: 0, vx: 0, vy: 0, rotation: 0 });
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const dragRef = useRef<{
    idx: number; offsetX: number; offsetY: number;
    lastX: number; lastY: number; lastT: number;
    velX: number; velY: number;
    targetX: number; targetY: number;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const wombatImgs = SPRITE_VARIANTS.map(src => {
      const im = new Image();
      im.src = src;
      return im;
    });

    const pooImg = new Image();
    pooImg.src = '/poo.png';

    const ballImg = new Image();
    ballImg.src = '/ball.png';

    const getGroundY = () => Math.floor(canvas.height * 0.78);

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (statesRef.current.length === 0) {
        statesRef.current = Array.from({ length: WOMBAT_COUNT }, (_, i) =>
          initWombat(i, canvas.width, getGroundY())
        );
        ballRef.current = { x: canvas.width / 2, y: getGroundY() - BALL_RADIUS - BALL_GROUND_OFFSET, vx: 0, vy: 0, rotation: 0 };
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const getPos = (clientX: number, clientY: number) => {
      const r = canvas.getBoundingClientRect();
      return { cx: clientX - r.left, cy: clientY - r.top };
    };

    const startDrag = (cx: number, cy: number) => {
      for (let i = statesRef.current.length - 1; i >= 0; i--) {
        const s = statesRef.current[i];
        if (cx >= s.x && cx <= s.x + DISPLAY_SIZE && cy >= s.y && cy <= s.y + DISPLAY_SIZE) {
          dragRef.current = { idx: i, offsetX: DISPLAY_SIZE / 2, offsetY: HEAD_PIVOT_Y, lastX: cx, lastY: cy, lastT: performance.now(), velX: 0, velY: 0, targetX: cx - DISPLAY_SIZE / 2, targetY: cy - HEAD_PIVOT_Y };
          statesRef.current = statesRef.current.map((st, j) =>
            j === i ? { ...st, mode: 'dragging' as Mode, seq: DRAG_SEQ, stepIdx: 0, elapsed: 0, timer: 0, vx: 0, vy: 0, swingAngle: 0, swingVel: 0 } : st
          );
          canvas.style.cursor = 'grabbing';
          return true;
        }
      }
      return false;
    };

    const VEL_SMOOTH_TAU = 80; // ms, exponential moving average window

    const updateDrag = (cx: number, cy: number) => {
      if (dragRef.current) {
        const d = dragRef.current;
        const now = performance.now();
        const elapsed = now - d.lastT;
        if (elapsed > 0) {
          const instVelX = (cx - d.lastX) / elapsed;
          const instVelY = (cy - d.lastY) / elapsed;
          const decay = Math.exp(-elapsed / VEL_SMOOTH_TAU);
          d.velX = d.velX * decay + instVelX * (1 - decay);
          d.velY = d.velY * decay + instVelY * (1 - decay);
          d.lastX = cx; d.lastY = cy; d.lastT = now;
        }
        d.targetX = cx - d.offsetX;
        d.targetY = cy - d.offsetY;
      } else {
        const over = statesRef.current.some(s => cx >= s.x && cx <= s.x + DISPLAY_SIZE && cy >= s.y && cy <= s.y + DISPLAY_SIZE);
        canvas.style.cursor = over ? 'grab' : 'default';
      }
    };

    const endDrag = () => {
      if (!dragRef.current) return;
      const d = dragRef.current;
      const wombat = statesRef.current[d.idx];

      // Spin adds tangential velocity at release, like letting go mid-swing
      const SPIN_RADIUS = DISPLAY_SIZE * 0.5;
      const spinVx = -SPIN_RADIUS * Math.cos(wombat.swingAngle) * wombat.swingVel;
      const spinVy = -SPIN_RADIUS * Math.sin(wombat.swingAngle) * wombat.swingVel;

      const SCALE = 0.35;
      const CAP = 0.6;
      const vx = Math.max(-CAP, Math.min(CAP, (d.velX + spinVx) * SCALE));
      const vy = Math.max(-CAP, Math.min(CAP, (d.velY + spinVy) * SCALE));
      statesRef.current = statesRef.current.map((s, j) =>
        j === d.idx ? { ...s, mode: 'airborne' as Mode, seq: FALL_SEQ, stepIdx: 0, elapsed: 0, timer: 0, vx, vy, bounceCount: 0, swingAngle: 0, swingVel: 0 } : s
      );
      dragRef.current = null;
      canvas.style.cursor = 'default';
    };

    const onMouseDown = (e: MouseEvent) => {
      const { cx, cy } = getPos(e.clientX, e.clientY);
      if (startDrag(cx, cy)) e.preventDefault();
    };
    const onMouseMove = (e: MouseEvent) => {
      const { cx, cy } = getPos(e.clientX, e.clientY);
      updateDrag(cx, cy);
    };
    const onMouseUp = () => endDrag();

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      const { cx, cy } = getPos(t.clientX, t.clientY);
      if (startDrag(cx, cy)) e.preventDefault();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!dragRef.current) return;
      const t = e.touches[0];
      const { cx, cy } = getPos(t.clientX, t.clientY);
      updateDrag(cx, cy);
      e.preventDefault();
    };
    const onTouchEnd = () => endDrag();

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    const loop = (time: number) => {
      const dt = Math.min(time - lastTimeRef.current, 200);
      lastTimeRef.current = time;

      if (statesRef.current.length > 0 && wombatImgs.every(im => im.complete)) {
        const groundY = getGroundY();

        // Ball physics
        const ball = ballRef.current;
        ball.vy += BALL_GRAVITY * dt;
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        ball.rotation += (ball.vx / BALL_RADIUS) * dt;
        const ballGroundPos = groundY - BALL_RADIUS - BALL_GROUND_OFFSET;
        if (ball.y >= ballGroundPos) {
          ball.y = ballGroundPos;
          if (Math.abs(ball.vy) < 0.05) {
            ball.vy = 0;
          } else {
            ball.vy = -Math.abs(ball.vy) * BALL_BOUNCE_DAMP;
          }
          ball.vx *= BALL_ROLL_DAMP;
          if (Math.abs(ball.vx) < 0.01) ball.vx = 0;
        }
        if (ball.x - BALL_RADIUS <= 0) { ball.x = BALL_RADIUS; ball.vx = Math.abs(ball.vx) * 0.7; }
        else if (ball.x + BALL_RADIUS >= canvas.width) { ball.x = canvas.width - BALL_RADIUS; ball.vx = -Math.abs(ball.vx) * 0.7; }

        const dragVelX = dragRef.current ? dragRef.current.velX : 0;
        const dragTargetX = dragRef.current ? dragRef.current.targetX : 0;
        const dragTargetY = dragRef.current ? dragRef.current.targetY : 0;
        statesRef.current = statesRef.current.map(s => tickState(s, dt, canvas.width, groundY, dragVelX, dragTargetX, dragTargetY, ball.x, ball.y));

        // Apply any kicks landed this tick
        for (const s of statesRef.current) {
          if (s.wantsKick) {
            ball.vx = s.kickVx;
            ball.vy = s.kickVy;
          }
        }

        // Spawn poo from wombats that are ready
        for (const s of statesRef.current) {
          if (s.pooReady) {
            // facing right → butt is always on the left side of sprite
            const pooX = s.x - POO_DISPLAY_SIZE + 6;
            const pooY = s.y + DISPLAY_SIZE - POO_DISPLAY_SIZE;
            pooRef.current.push({ x: pooX, y: pooY, frame: 0, frameTimer: 0, holding: false, holdTimer: 0 });
          }
        }

        // Tick poo particles
        pooRef.current = pooRef.current.filter(p => {
          if (p.holding) {
            p.holdTimer += dt;
            return p.holdTimer < POO_HOLD_MS;
          }
          p.frameTimer += dt;
          if (p.frameTimer >= POO_FRAME_MS) {
            p.frameTimer -= POO_FRAME_MS;
            p.frame++;
            if (p.frame >= POO_FRAME_COUNT) {
              p.frame = POO_FRAME_COUNT - 1;
              p.holding = true;
            }
          }
          return true;
        });

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (ballImg.complete) drawBall(ctx, ballImg, ball.x, ball.y, ball.rotation);

        // Draw poo (below wombats)
        if (pooImg.complete) {
          for (const p of pooRef.current) {
            ctx.drawImage(pooImg, p.frame * POO_FRAME_SIZE, 0, POO_FRAME_SIZE, POO_FRAME_SIZE, p.x, p.y, POO_DISPLAY_SIZE, POO_DISPLAY_SIZE);
          }
        }

        for (let i = 0; i < WOMBAT_COUNT; i++) {
          const { x, y, facingRight, seq, stepIdx, elapsed, mode, swingAngle, spriteVariant } = statesRef.current[i];
          const step = seq[stepIdx];
          const fIdx = getFrameIdx(elapsed, step.anim);
          const { row } = ANIMS[step.anim];
          const sx = fIdx * SPRITE_SIZE;
          const sy = row * SPRITE_SIZE;
          const angle = mode === 'dragging' ? swingAngle : 0;
          const wombatImg = wombatImgs[spriteVariant];

          ctx.save();
          ctx.translate(x + DISPLAY_SIZE / 2, y + HEAD_PIVOT_Y);
          ctx.rotate(angle);
          if (facingRight) {
            ctx.drawImage(wombatImg, sx, sy, SPRITE_SIZE, SPRITE_SIZE, -DISPLAY_SIZE / 2, -HEAD_PIVOT_Y, DISPLAY_SIZE, DISPLAY_SIZE);
          } else {
            ctx.scale(-1, 1);
            ctx.drawImage(wombatImg, sx, sy, SPRITE_SIZE, SPRITE_SIZE, -DISPLAY_SIZE / 2, -HEAD_PIVOT_Y, DISPLAY_SIZE, DISPLAY_SIZE);
          }
          ctx.restore();
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ display: 'block', imageRendering: 'pixelated', touchAction: 'none' }} />;
}
