import Phaser from "phaser";

export const HURTBOX_WIDTH = 46;
export const STAND_HEIGHT = 128;
export const CROUCH_HEIGHT = 72;
export const RUN_SPEED = 250;
export const CROUCH_SPEED = 90;
export const GRAVITY_Y = 1500;
export const JUMP_VELOCITY = -640;
export const JUMP_CUT_MULTIPLIER = 0.45;
export const MAX_AIR_JUMPS = 1;
export const STARTING_AIR_JUMPS = 0;
export const COYOTE_MS = 90;
export const JUMP_BUFFER_MS = 110;
export const ATTACK_BUFFER_MS = 150;
export const COMBO_RESET_MS = 600;
export const HITSTUN_MS = 480;
export const INVULNERABLE_MS = 780;

export type Facing = 1 | -1;
export type AttackKind = "jab" | "hook" | "kick" | "sweep";
export type Pose = "idle" | "run" | "jump" | "fall" | "crouch" | AttackKind | "hit";
export type AttackPhase = "startup" | "active" | "recovery" | "done";

export interface AttackProfile {
  kind: AttackKind;
  startup: number;
  active: number;
  recovery: number;
    hitbox: { width: number; height: number; reach: number; lift: number };
  step: number;
  knockback: number;
  knockbackY: number;
  hitstop: number;
}

export const ATTACKS: Record<AttackKind, AttackProfile> = {
  jab: {
    kind: "jab",
    startup: 40,
    active: 70,
    recovery: 140,
    hitbox: { width: 24, height: 20, reach: 40, lift: 14 },
    step: 150,
    knockback: 90,
    knockbackY: -20,
    hitstop: 40,
  },
  hook: {
    kind: "hook",
    startup: 90,
    active: 110,
    recovery: 170,
    hitbox: { width: 30, height: 28, reach: 34, lift: 30 },
    step: 50,
    knockback: 160,
    knockbackY: -90,
    hitstop: 40,
  },
  kick: {
    kind: "kick",
    startup: 170,
    active: 130,
    recovery: 230,
    hitbox: { width: 34, height: 26, reach: 54, lift: 8 },
    step: 280,
    knockback: 340,
    knockbackY: -200,
    hitstop: 80,
  },
  sweep: {
    kind: "sweep",
    startup: 80,
    active: 130,
    recovery: 180,
    hitbox: { width: 36, height: 18, reach: 42, lift: -26 },
    step: 80,
    knockback: 190,
    knockbackY: -40,
    hitstop: 40,
  },
};

/** Z key: standing punches only (jab → hook). Kick is a dedicated key. */
const PUNCH_CHAIN: readonly AttackKind[] = ["jab", "hook"];

export interface JumpState {
  groundJumpAvailable: boolean;
  airJumps: number;
  coyoteUntil: number;
  jumpBufferUntil: number;
}

export interface CombatState {
  comboSlot: 0 | 1 | 2;
  lastPressAt: number;
  pressGap: number;
  bufferUntil: number;
  attack: AttackKind | null;
  attackStartedAt: number;
  attackSerial: number;
  hitstunUntil: number;
  invulnerableUntil: number;
}

export interface Hitbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlayerInput {
  left: boolean;
  right: boolean;
  down: boolean;
  jumpPressed: boolean;
  jumpReleased: boolean;
  /** Standing punch chain (Z) */
  attackPressed: boolean;
  /** Standing kick (C) */
  kickPressed: boolean;
  hitPressed: boolean;
}

export interface PlayerViewState {
  x: number;
  y: number;
  facing: Facing;
  pose: Pose;
  breath: number;
  cycle: number;
  attackPhase: AttackPhase;
  attackAmount: number;
  showHitboxes: boolean;
  hurtbox: { width: number; height: number };
  hitbox: Hitbox | null;
  flicker: boolean;
  status: string;
}

export function createJumpState(now: number, airJumpLimit = STARTING_AIR_JUMPS): JumpState {
  return {
    groundJumpAvailable: true,
    airJumps: airJumpLimit,
    coyoteUntil: now + COYOTE_MS,
    jumpBufferUntil: -1,
  };
}

export function createCombatState(): CombatState {
  return {
    comboSlot: 0,
    lastPressAt: -10000,
    pressGap: COMBO_RESET_MS + 1,
    bufferUntil: -1,
    attack: null,
    attackStartedAt: -1,
    attackSerial: -1,
    hitstunUntil: -1,
    invulnerableUntil: -1,
  };
}

export function fullJumpHeight(speed = Math.abs(JUMP_VELOCITY), gravity = GRAVITY_Y): number {
  return (speed * speed) / (2 * gravity);
}

export function applyJumpCut(velocityY: number): number {
  if (velocityY < 0) {
    return velocityY * JUMP_CUT_MULTIPLIER;
  }
  return velocityY;
}

export function stepJump(
  state: JumpState,
  now: number,
  onFloor: boolean,
  pressed: boolean,
  released: boolean,
  velocityY: number,
  airJumpLimit = STARTING_AIR_JUMPS,
): { state: JumpState; velocityY: number; jumped: boolean } {
  const next: JumpState = { ...state };
  let nextVelocity = velocityY;
  let jumped = false;

  if (onFloor) {
    next.groundJumpAvailable = true;
    next.airJumps = airJumpLimit;
    next.coyoteUntil = now + COYOTE_MS;
  } else if (now > next.coyoteUntil && next.groundJumpAvailable) {
    next.groundJumpAvailable = false;
  }

  if (pressed) {
    next.jumpBufferUntil = now + JUMP_BUFFER_MS;
  }

  const buffered = next.jumpBufferUntil >= 0 && now <= next.jumpBufferUntil;
  const coyote = now <= next.coyoteUntil;

  if (buffered && next.groundJumpAvailable && (onFloor || coyote)) {
    nextVelocity = JUMP_VELOCITY;
    next.groundJumpAvailable = false;
    next.jumpBufferUntil = -1;
    jumped = true;
  } else if (buffered && !onFloor && next.airJumps > 0) {
    nextVelocity = JUMP_VELOCITY;
    next.airJumps -= 1;
    next.groundJumpAvailable = false;
    next.jumpBufferUntil = -1;
    jumped = true;
  }

  if (released) {
    nextVelocity = applyJumpCut(nextVelocity);
  }

  return { state: next, velocityY: nextVelocity, jumped };
}

export function resolveVerticalIntent(input: {
  down: boolean;
  jumpPressed: boolean;
  supported: boolean;
  locked: boolean;
  standingStrike: boolean;
}): { allowJump: boolean; requestDrop: boolean; holdCrouch: boolean } {
  const groundedDown = input.down && input.supported && !input.locked;
  return {
    allowJump: input.jumpPressed && !input.locked && !groundedDown,
    requestDrop: groundedDown && input.jumpPressed,
    holdCrouch: groundedDown && !input.standingStrike,
  };
}

export function durationOf(kind: AttackKind): number {
  const attack = ATTACKS[kind];
  return attack.startup + attack.active + attack.recovery;
}

export function attackTiming(
  kind: AttackKind,
  elapsed: number,
): { phase: AttackPhase; amount: number } {
  const attack = ATTACKS[kind];
  if (elapsed < attack.startup) {
    const phaseT = attack.startup === 0 ? 1 : elapsed / attack.startup;
    return { phase: "startup", amount: phaseT * 0.15 };
  }
  const activeEnd = attack.startup + attack.active;
  if (elapsed < activeEnd) {
    const phaseT = (elapsed - attack.startup) / attack.active;
    return { phase: "active", amount: 0.15 + phaseT * 0.85 };
  }
  if (elapsed < durationOf(kind)) {
    const phaseT = (elapsed - activeEnd) / attack.recovery;
    return { phase: "recovery", amount: 1 - phaseT };
  }
  return { phase: "done", amount: 0 };
}

export function tickCombat(state: CombatState, now: number): CombatState {
  let next = state;
  if (next.attack) {
    const elapsed = now - next.attackStartedAt;
    if (attackTiming(next.attack, elapsed).phase === "done") {
      next = { ...next, attack: null };
    }
  }
  if (!next.attack && now - next.lastPressAt > COMBO_RESET_MS && next.comboSlot !== 0) {
    next = { ...next, comboSlot: 0 };
  }
  return next;
}

export function noteAttackPress(state: CombatState, now: number): CombatState {
  return {
    ...state,
    bufferUntil: now + ATTACK_BUFFER_MS,
    pressGap: now - state.lastPressAt,
    lastPressAt: now,
  };
}

export function beginBufferedAttack(
  state: CombatState,
  now: number,
  crouching: boolean,
  preferKick = false,
): CombatState {
  if (now > state.bufferUntil || now < state.hitstunUntil) {
    return state;
  }
  if (state.attack) {
    const timing = attackTiming(state.attack, now - state.attackStartedAt);
    if (timing.phase !== "recovery") {
      return state;
    }
  }

  let comboSlot = state.comboSlot;
  let attack: AttackKind;
  if (crouching && !preferKick) {
    attack = "sweep";
    comboSlot = 0;
  } else if (preferKick) {
    attack = "kick";
    comboSlot = 0;
  } else {
    if (state.pressGap > COMBO_RESET_MS) {
      comboSlot = 0;
    }
    attack = PUNCH_CHAIN[comboSlot % PUNCH_CHAIN.length] ?? "jab";
    comboSlot = ((comboSlot + 1) % PUNCH_CHAIN.length) as 0 | 1 | 2;
  }

  return {
    ...state,
    comboSlot,
    attack,
    attackStartedAt: now,
    attackSerial: state.attackSerial + 1,
    bufferUntil: -1,
  };
}

export function attackVelocity(kind: AttackKind, phase: AttackPhase): number {
  const attack = ATTACKS[kind];
  if (kind === "kick") {
    if (phase === "startup") {
      return 30;
    }
    if (phase === "active") {
      return attack.step;
    }
    return 0;
  }
  if (kind === "jab" && (phase === "startup" || phase === "active")) {
    return attack.step;
  }
  if (phase === "active") {
    return attack.step;
  }
  return 0;
}

export function hurtboxFor(crouching: boolean): { width: number; height: number } {
  return {
    width: HURTBOX_WIDTH,
    height: crouching ? CROUCH_HEIGHT : STAND_HEIGHT,
  };
}

export function makeHitbox(
  x: number,
  y: number,
  facing: Facing,
  kind: AttackKind,
  amount = 1,
): Hitbox {
  const attack = ATTACKS[kind];
  const reach = attack.hitbox.reach * (0.35 + 0.65 * amount);
  return {
    x: x + facing * reach,
    y: y - attack.hitbox.lift,
    width: attack.hitbox.width,
    height: attack.hitbox.height,
  };
}

export function hitboxTouches(
  hit: Hitbox,
  target: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    Math.abs(hit.x - target.x) * 2 <= hit.width + target.width &&
    Math.abs(hit.y - target.y) * 2 <= hit.height + target.height
  );
}

export function describePose(pose: Pose): string {
  switch (pose) {
    case "idle":
      return "站立";
    case "run":
      return "行走";
    case "jump":
      return "跳躍中";
    case "fall":
      return "下落";
    case "crouch":
      return "蹲下";
    case "jab":
      return "左直拳";
    case "hook":
      return "右擺拳";
    case "kick":
      return "重踢";
    case "sweep":
      return "下段掃腿";
    case "hit":
      return "受擊";
  }
}

export class PlayerController {
  readonly bodyObject: Phaser.GameObjects.Rectangle;
  facing: Facing = 1;
  showHitboxes = false;

  private jump: JumpState;
  private combat: CombatState = createCombatState();
  private elapsed = 0;
  private crouching = false;
  private floorMemoryUntil = 0;
  private dropRequested = false;
  private dropActive = false;
  private surfaceSupported = false;
  private surfaceNearby = false;
  private crouchAnchorTop: number | null = null;
  private jumpStartedAt = -10000;
  private airJumpLimit = STARTING_AIR_JUMPS;
  private preferKick = false;
  private view: PlayerViewState;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.bodyObject = scene.add.rectangle(x, y, HURTBOX_WIDTH, STAND_HEIGHT, 0x2f6fed, 0);
    this.bodyObject.setVisible(false);
    scene.physics.add.existing(this.bodyObject);
    const body = this.physicsBody;
    body.setCollideWorldBounds(true);
    body.setMaxVelocity(360, 1100);
    body.setSize(HURTBOX_WIDTH, STAND_HEIGHT);

    this.jump = createJumpState(0, this.airJumpLimit);
    this.view = this.buildView();
  }

  get physicsBody(): Phaser.Physics.Arcade.Body {
    return this.bodyObject.body as Phaser.Physics.Arcade.Body;
  }

  get attackSerial(): number {
    return this.combat.attackSerial;
  }

  getViewState(): PlayerViewState {
    return this.view;
  }

  isAttackActive(): boolean {
    return this.view.hitbox !== null;
  }

  takeDropRequest(): boolean {
    const requested = this.dropRequested;
    this.dropRequested = false;
    return requested;
  }

  setSurfaceSupport(supported: boolean): void {
    this.surfaceSupported = supported;
  }

  setSurfaceNearby(nearby: boolean): void {
    this.surfaceNearby = nearby;
  }

  setCrouchAnchor(top: number | null): void {
    this.crouchAnchorTop = top;
  }

  isInHitstun(time: number): boolean {
    return time < this.combat.hitstunUntil;
  }

  isCrouching(): boolean {
    return this.crouching && !this.dropActive;
  }

  confirmDrop(time: number): void {
    this.dropActive = true;
    this.crouching = false;
    this.jumpStartedAt = -10000;
    this.jump.jumpBufferUntil = -1;
    this.jump.groundJumpAvailable = false;
    this.jump.coyoteUntil = -1;
    this.applyStance(false);
    this.physicsBody.setAllowGravity(true);
    this.physicsBody.setVelocityY(220);
    this.publish(time);
  }

  endDrop(): void {
    this.dropActive = false;
  }

  plantFeet(surfaceTop: number): void {
    if (this.dropActive) {
      return;
    }
    const height = this.crouching ? CROUCH_HEIGHT : this.bodyObject.height;
    this.bodyObject.setSize(HURTBOX_WIDTH, height);
    this.bodyObject.setOrigin(0.5, 0.5);
    this.bodyObject.y = surfaceTop - height / 2;
    const body = this.physicsBody;
    body.setSize(HURTBOX_WIDTH, height, true);
    body.setVelocityY(0);
    this.commitBodyPosition();
  }

  currentAttack(): AttackProfile | null {
    return this.combat.attack ? ATTACKS[this.combat.attack] : null;
  }

  update(time: number, delta: number, input: PlayerInput): void {
    if (input.kickPressed) {
      this.preferKick = true;
      this.combat = noteAttackPress(this.combat, time);
    } else if (input.attackPressed) {
      this.preferKick = false;
      this.combat = noteAttackPress(this.combat, time);
    }

    if (delta <= 0) {
      this.publish(time);
      return;
    }

    this.elapsed += delta;
    const body = this.physicsBody;
    const onFloor = body.blocked.down || body.touching.down;
    const anchored = this.crouchAnchorTop !== null && !this.dropActive;
    const groundedNow = !this.dropActive && (onFloor || this.surfaceSupported || anchored);
    if (groundedNow) {
      this.floorMemoryUntil = time + 140;
    }
    const supported =
      groundedNow ||
      (!this.dropActive &&
        time <= this.floorMemoryUntil &&
        body.velocity.y <= 60 &&
        body.velocity.y >= -40);
    if (input.hitPressed && time >= this.combat.invulnerableUntil) {
      this.combat = {
        ...this.combat,
        attack: null,
        bufferUntil: -1,
        comboSlot: 0,
        hitstunUntil: time + HITSTUN_MS,
        invulnerableUntil: time + INVULNERABLE_MS,
      };
      body.setVelocity(-this.facing * 340, -280);
    }

    this.combat = tickCombat(this.combat, time);

    const attackLock = this.attackLock(time);
    const inHitstun = time < this.combat.hitstunUntil;
    const standingStrikeEarly =
      this.combat.attack === "jab" || this.combat.attack === "hook" || this.combat.attack === "kick";
    const intent = resolveVerticalIntent({
      down: input.down,
      jumpPressed: input.jumpPressed,
      supported,
      locked: inHitstun || attackLock,
      standingStrike: standingStrikeEarly,
    });
    if (!intent.allowJump) {
      this.jump.jumpBufferUntil = -1;
    }
    const jumpResult = stepJump(
      this.jump,
      time,
      supported,
      intent.allowJump,
      input.jumpReleased && !inHitstun && intent.allowJump,
      body.velocity.y,
      this.airJumpLimit,
    );
    this.jump = jumpResult.state;
    const jumped = jumpResult.jumped && intent.allowJump;
    if (jumped || (input.jumpReleased && !inHitstun && !intent.requestDrop)) {
      body.setVelocityY(jumpResult.velocityY);
    }
    if (jumped) {
      this.jumpStartedAt = time;
    }
    const lateDrop =
      input.down &&
      this.surfaceNearby &&
      !this.dropActive &&
      !inHitstun &&
      !attackLock &&
      body.velocity.y < 0 &&
      time - this.jumpStartedAt <= 130;
    if (intent.requestDrop || lateDrop) {
      this.dropRequested = true;
      this.jump.jumpBufferUntil = -1;
      this.jump.airJumps = this.airJumpLimit;
      this.jumpStartedAt = -10000;
      if (body.velocity.y < 0) {
        body.setVelocityY(0);
      }
    }

    if (input.left && !input.right) {
      this.facing = -1;
    } else if (input.right && !input.left) {
      this.facing = 1;
    }

    const holdCrouch =
      input.down &&
      anchored &&
      !jumped &&
      !inHitstun &&
      !standingStrikeEarly;
    const beforeAttack = this.combat.attack;
    this.combat = beginBufferedAttack(this.combat, time, holdCrouch, this.preferKick);
    if (this.combat.attack !== beforeAttack) {
      this.preferKick = false;
    } else if (time > this.combat.bufferUntil) {
      this.preferKick = false;
    }
    this.crouching = this.combat.attack === "sweep" || holdCrouch;
    this.applyStance(this.crouching);
    if (holdCrouch && this.crouchAnchorTop !== null) {
      body.setAllowGravity(false);
      this.plantFeet(this.crouchAnchorTop);
    } else {
      body.setAllowGravity(true);
    }

    if (time < this.combat.hitstunUntil) {
      this.publish(time);
      return;
    }

    const timing = this.combat.attack
      ? attackTiming(this.combat.attack, time - this.combat.attackStartedAt)
      : null;
    if (this.combat.attack && timing && timing.phase !== "done" && timing.phase !== "recovery") {
      body.setVelocityX(this.facing * attackVelocity(this.combat.attack, timing.phase));
    } else if (input.left && !input.right) {
      body.setVelocityX((this.crouching ? -CROUCH_SPEED : -RUN_SPEED));
    } else if (input.right && !input.left) {
      body.setVelocityX(this.crouching ? CROUCH_SPEED : RUN_SPEED);
    } else {
      body.setVelocityX(0);
    }

    this.publish(time);
  }

  private attackLock(time: number): boolean {
    if (!this.combat.attack || time < this.combat.hitstunUntil) {
      return time < this.combat.hitstunUntil;
    }
    const timing = attackTiming(this.combat.attack, time - this.combat.attackStartedAt);
    return timing.phase === "startup" || timing.phase === "active";
  }

  private applyStance(crouch: boolean): void {
    const height = crouch ? CROUCH_HEIGHT : STAND_HEIGHT;
    if (this.bodyObject.height === height) {
      return;
    }
    const bottom = this.physicsBody.bottom;
    this.bodyObject.setSize(HURTBOX_WIDTH, height);
    this.bodyObject.setOrigin(0.5, 0.5);
    this.bodyObject.y = bottom - height / 2;
    this.physicsBody.setSize(HURTBOX_WIDTH, height, true);
    if (crouch && this.physicsBody.velocity.y > 0) {
      this.physicsBody.setVelocityY(0);
    }
    this.commitBodyPosition();
  }

  private commitBodyPosition(): void {
    const body = this.physicsBody;
    body.updateFromGameObject();
    body.prev.copy(body.position);
    body.prevFrame.copy(body.position);
  }

  private publish(time: number): void {
    const body = this.physicsBody;
    const onFloor = body.blocked.down || body.touching.down;
    const timing = this.combat.attack
      ? attackTiming(this.combat.attack, time - this.combat.attackStartedAt)
      : null;
    const moving = Math.abs(body.velocity.x) > 20;
    let pose: Pose = "idle";
    if (time < this.combat.hitstunUntil) {
      pose = "hit";
    } else if (this.combat.attack && timing && timing.phase !== "done") {
      pose = this.combat.attack;
    } else if (this.dropActive) {
      pose = "fall";
    } else if (this.crouching) {
      pose = "crouch";
    } else if (!onFloor && !this.surfaceSupported) {
      pose = body.velocity.y < 0 ? "jump" : "fall";
    } else if (moving) {
      pose = "run";
    }

    const hitbox =
      this.combat.attack && timing?.phase === "active"
        ? makeHitbox(this.bodyObject.x, this.bodyObject.y, this.facing, this.combat.attack, timing.amount)
        : null;

    this.view = {
      x: this.bodyObject.x,
      y: this.bodyObject.y,
      facing: this.facing,
      pose,
      breath: Math.sin(this.elapsed / 260),
      cycle: this.elapsed / 140,
      attackPhase: timing?.phase ?? "done",
      attackAmount: timing?.amount ?? 0,
      showHitboxes: this.showHitboxes,
      hurtbox: hurtboxFor(this.crouching),
      hitbox,
      flicker: time < this.combat.invulnerableUntil && Math.floor(time / 60) % 2 === 0,
      status: describePose(pose),
    };
  }

  private buildView(): PlayerViewState {
    this.publish(0);
    return this.view;
  }
}
