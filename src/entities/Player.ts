import Phaser from "phaser";

export const PLAYER_WIDTH = 28;
export const STAND_HEIGHT = 52;
export const CROUCH_HEIGHT = 32;
export const RUN_SPEED = 250;
export const CROUCH_SPEED = 90;
export const ATTACK_MOVE_SCALE = 0.65;
export const GRAVITY_Y = 1500;
export const JUMP_VELOCITY = -640;
export const JUMP_CUT_MULTIPLIER = 0.45;
export const MAX_AIR_JUMPS = 1;
export const COYOTE_MS = 90;
export const JUMP_BUFFER_MS = 110;
export const ATTACK_ACTIVE_MS = 200;
export const ATTACK_COOLDOWN_MS = 400;
export const WHIP_LENGTH = 84;

export type Facing = 1 | -1;

export interface JumpState {
  groundJumpAvailable: boolean;
  airJumps: number;
  coyoteUntil: number;
  jumpBufferUntil: number;
}

export interface WhipInput {
  x: number;
  y: number;
  facing: Facing;
  crouching: boolean;
  bodyWidth: number;
  bodyHeight: number;
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
  attackPressed: boolean;
}

export function createJumpState(now: number): JumpState {
  return {
    groundJumpAvailable: true,
    airJumps: MAX_AIR_JUMPS,
    coyoteUntil: now + COYOTE_MS,
    jumpBufferUntil: -1,
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
): { state: JumpState; velocityY: number; jumped: boolean } {
  const next: JumpState = { ...state };
  let nextVelocity = velocityY;
  let jumped = false;

  if (onFloor) {
    next.groundJumpAvailable = true;
    next.airJumps = MAX_AIR_JUMPS;
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

export function canStartAttack(now: number, nextAttackAt: number): boolean {
  return now >= nextAttackAt;
}

export function attackActiveUntil(now: number): number {
  return now + ATTACK_ACTIVE_MS;
}

export function nextAttackReadyAt(now: number): number {
  return now + ATTACK_COOLDOWN_MS;
}

export function whipHitbox(input: WhipInput): Hitbox {
  const height = input.crouching ? 12 : 16;
  const yOffset = input.crouching ? input.bodyHeight * 0.28 : -input.bodyHeight * 0.12;
  return {
    x: input.x + input.facing * (input.bodyWidth / 2 + WHIP_LENGTH / 2),
    y: input.y + yOffset,
    width: WHIP_LENGTH,
    height,
  };
}

export function describeState(input: { onFloor: boolean; crouching: boolean; attacking: boolean }): string {
  const posture = !input.onFloor ? "跳躍中" : input.crouching ? "蹲下" : "站立";
  return input.attacking ? `${posture} · 攻擊中` : posture;
}

export class Player extends Phaser.GameObjects.Rectangle {
  facing: Facing = 1;
  attackSerial = -1;

  private nextAttackAt = 0;
  private attackUntil = 0;
  private stance: "stand" | "crouch" = "stand";
  private crouching = false;
  private jump: JumpState;
  private readonly marker: Phaser.GameObjects.Rectangle;
  readonly whip: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, PLAYER_WIDTH, STAND_HEIGHT, 0x2f6fed);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setMaxVelocity(RUN_SPEED, 980);
    body.setSize(PLAYER_WIDTH, STAND_HEIGHT);
    this.setDepth(2);

    this.marker = scene.add.rectangle(x, y, 8, 10, 0xd6e4ff);
    this.marker.setDepth(3);

    this.whip = scene.add.rectangle(x, y, WHIP_LENGTH, 16, 0xff2a2a, 0.92);
    this.whip.setDepth(4);
    scene.physics.add.existing(this.whip);
    const whipBody = this.whip.body as Phaser.Physics.Arcade.Body;
    whipBody.setAllowGravity(false);
    whipBody.setImmovable(true);
    whipBody.enable = false;
    this.whip.setVisible(false);

    this.jump = createJumpState(scene.time.now);
  }

  update(time: number, input: PlayerInput): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const onFloor = body.blocked.down || body.touching.down;
    const result = stepJump(
      this.jump,
      time,
      onFloor,
      input.jumpPressed,
      input.jumpReleased,
      body.velocity.y,
    );
    this.jump = result.state;
    if (result.jumped || input.jumpReleased) {
      body.setVelocityY(result.velocityY);
    }

    if (input.left && !input.right) {
      this.facing = -1;
    } else if (input.right && !input.left) {
      this.facing = 1;
    }

    const crouch = onFloor && input.down && !result.jumped;
    this.crouching = crouch;
    this.applyStance(crouch);

    const attacking = this.isAttacking(time);
    const speed = (crouch ? CROUCH_SPEED : RUN_SPEED) * (attacking ? ATTACK_MOVE_SCALE : 1);
    if (input.left && !input.right) {
      body.setVelocityX(-speed);
    } else if (input.right && !input.left) {
      body.setVelocityX(speed);
    } else {
      body.setVelocityX(0);
    }

    if (input.attackPressed && canStartAttack(time, this.nextAttackAt)) {
      this.attackSerial += 1;
      this.attackUntil = attackActiveUntil(time);
      this.nextAttackAt = nextAttackReadyAt(time);
    }

    this.syncWhip(time);
    this.syncMarker();
  }

  isAttacking(time: number): boolean {
    return time < this.attackUntil;
  }

  getStatus(time: number): string {
    const body = this.body as Phaser.Physics.Arcade.Body;
    return describeState({
      onFloor: body.blocked.down || body.touching.down,
      crouching: this.crouching,
      attacking: this.isAttacking(time),
    });
  }

  private applyStance(crouch: boolean): void {
    const next = crouch ? "crouch" : "stand";
    if (next === this.stance) {
      return;
    }

    const height = crouch ? CROUCH_HEIGHT : STAND_HEIGHT;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const bottom = this.y + this.height / 2;
    this.stance = next;
    this.setSize(PLAYER_WIDTH, height);
    this.y = bottom - height / 2;
    body.setSize(PLAYER_WIDTH, height, true);
    body.updateFromGameObject();
  }

  private syncWhip(time: number): void {
    const whipBody = this.whip.body as Phaser.Physics.Arcade.Body;
    const active = this.isAttacking(time);
    this.whip.setVisible(active);
    whipBody.enable = active;
    if (!active) {
      return;
    }

    const box = whipHitbox({
      x: this.x,
      y: this.y,
      facing: this.facing,
      crouching: this.crouching,
      bodyWidth: PLAYER_WIDTH,
      bodyHeight: this.stance === "crouch" ? CROUCH_HEIGHT : STAND_HEIGHT,
    });
    this.whip.setPosition(box.x, box.y);
    this.whip.setSize(box.width, box.height);
    whipBody.setSize(box.width, box.height, true);
    whipBody.updateFromGameObject();
  }

  private syncMarker(): void {
    const height = this.stance === "crouch" ? CROUCH_HEIGHT : STAND_HEIGHT;
    this.marker.setPosition(this.x + this.facing * (PLAYER_WIDTH / 2 + 1), this.y - height * 0.18);
  }
}
