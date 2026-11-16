import Phaser from "phaser";
import type { StageEnemySpawn } from "../data/StageData";
import { STAND_HEIGHT } from "./PlayerController";
import { Bullet } from "./Bullet";

export const ENEMY_WIDTH = 46;
/** Match player standing hurtbox height. */
export const ENEMY_HEIGHT = STAND_HEIGHT;
export const PATROL_SPEED = 70;
export const SHOOTER_SPEED = 95;
export const ENEMY_HP = 3;
export const PATROL_CONTACT_DAMAGE = 3;
export const SHOOTER_DETECT = 320;
export const SHOOTER_STOP = 180;
/** Was 1100ms; frequency reduced ~70% → cooldown × ~3.33. */
export const SHOOT_COOLDOWN_MS = 3700;

const PATROL_COLOR = 0x7aa2c8;
const SHOOTER_COLOR = 0xe0863a;

export function stepPatrol(x: number, origin: number, range: number, dir: 1 | -1): { dir: 1 | -1 } {
  if (x >= origin + range) {
    return { dir: -1 };
  }
  if (x <= origin - range) {
    return { dir: 1 };
  }
  return { dir };
}

export function shouldApplyHit(lastSerial: number, serial: number, dying: boolean): boolean {
  return !dying && serial >= 0 && serial !== lastSerial;
}

export function shouldChase(distance: number, detect = SHOOTER_DETECT): boolean {
  return distance <= detect;
}

export function shouldHoldAndShoot(distance: number, stop = SHOOTER_STOP): boolean {
  return distance <= stop;
}

export class Enemy extends Phaser.GameObjects.Rectangle {
  readonly kind: StageEnemySpawn["kind"];
  readonly contactDamage: number;
  private readonly homeX: number;
  private readonly range: number;
  private dir: 1 | -1 = -1;
  private hp = ENEMY_HP;
  private lastAttackSerial = -1;
  private dying = false;
  private stunUntil = 0;
  private nextShotAt = 0;
  private readonly baseColor: number;

  constructor(scene: Phaser.Scene, spawn: StageEnemySpawn) {
    const color = spawn.kind === "patrol" ? PATROL_COLOR : SHOOTER_COLOR;
    super(scene, spawn.x, spawn.surfaceY - ENEMY_HEIGHT / 2, ENEMY_WIDTH, ENEMY_HEIGHT, color);
    this.kind = spawn.kind;
    this.baseColor = color;
    this.contactDamage = spawn.kind === "patrol" ? PATROL_CONTACT_DAMAGE : 0;
    this.homeX = spawn.x;
    this.range = spawn.patrol;
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setMaxVelocity(240, 980);
    // Don't get glued to the player hurtbox.
    body.setBounce(0, 0);
    body.setDrag(0, 0);
    this.setDepth(1);
  }

  get isDying(): boolean {
    return this.dying;
  }

  tick(
    time: number,
    playerX: number,
    playerY: number,
    onShoot?: (bullet: Bullet) => void,
  ): void {
    if (!this.active || this.dying || !this.body) {
      return;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (time < this.stunUntil) {
      return;
    }

    // Wall bounce so patrol never freezes against a ledge face.
    if (body.blocked.left || body.touching.left) {
      this.dir = 1;
    } else if (body.blocked.right || body.touching.right) {
      this.dir = -1;
    }

    if (this.kind === "patrol") {
      // Patrol never chases — only walk home range.
      const step = stepPatrol(this.x, this.homeX, this.range, this.dir);
      this.dir = step.dir;
      body.setVelocityX(this.dir * PATROL_SPEED);
      // Unstick if something zeroed horizontal motion while grounded.
      if (Math.abs(body.velocity.x) < 5 && (body.blocked.down || body.touching.down)) {
        this.dir = (this.dir * -1) as 1 | -1;
        body.setVelocityX(this.dir * PATROL_SPEED);
        this.x += this.dir * 2;
      }
      return;
    }

    // Shooter: approach then hold and fire.
    const dx = playerX - this.x;
    const dist = Math.hypot(dx, playerY - this.y);
    if (!shouldChase(dist)) {
      const step = stepPatrol(this.x, this.homeX, this.range, this.dir);
      this.dir = step.dir;
      body.setVelocityX(this.dir * PATROL_SPEED * 0.7);
      return;
    }

    this.dir = dx >= 0 ? 1 : -1;
    if (shouldHoldAndShoot(dist)) {
      body.setVelocityX(0);
      if (time >= this.nextShotAt && onShoot) {
        this.nextShotAt = time + SHOOT_COOLDOWN_MS;
        onShoot(new Bullet(this.scene, this.x + this.dir * 28, this.y - 10, this.dir));
      }
    } else {
      body.setVelocityX(this.dir * SHOOTER_SPEED);
    }
  }

  takeHit(
    facing: 1 | -1,
    attackSerial: number,
    now: number,
    force: { x: number; y: number } = { x: 160, y: -160 },
  ): boolean {
    if (!shouldApplyHit(this.lastAttackSerial, attackSerial, this.dying)) {
      return false;
    }

    this.lastAttackSerial = attackSerial;
    this.hp -= 1;
    this.stunUntil = now + 180;
    this.setFillStyle(0xfff1dc);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(facing * force.x, force.y);

    if (this.hp <= 0) {
      this.dying = true;
      this.scene.time.delayedCall(90, () => this.destroy());
      return true;
    }

    this.scene.time.delayedCall(90, () => {
      if (this.active) {
        this.setFillStyle(this.baseColor);
      }
    });
    return true;
  }
}
