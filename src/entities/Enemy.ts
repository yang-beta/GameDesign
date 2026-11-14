import Phaser from "phaser";
import type { EnemySpawn } from "../data/MapData";
import { EnemyHealthBar } from "./EnemyHealthBar";

/** Match player stand hurtbox height so standing strikes connect cleanly. */
export const ENEMY_WIDTH = 46;
export const ENEMY_HEIGHT = 128;
export const ENEMY_SPEED = 70;
export const ENEMY_HP = 5;
const ENEMY_COLOR = 0xe0863a;

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

export class Enemy extends Phaser.GameObjects.Rectangle {
  private readonly homeX: number;
  private readonly range: number;
  private dir: 1 | -1 = -1;
  private hp = ENEMY_HP;
  private lastAttackSerial = -1;
  private dying = false;
  private stunUntil = 0;
  private flashUntil = 0;
  private shakeUntil = 0;
  private readonly healthBar: EnemyHealthBar;
  private readonly hitFx: Phaser.GameObjects.Rectangle;
  private readonly baseColor = ENEMY_COLOR;

  constructor(scene: Phaser.Scene, spawn: EnemySpawn) {
    super(scene, spawn.x, spawn.surfaceY - ENEMY_HEIGHT / 2, ENEMY_WIDTH, ENEMY_HEIGHT, ENEMY_COLOR);
    this.homeX = spawn.x;
    this.range = spawn.patrol;
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setMaxVelocity(220, 980);
    this.setDepth(1);

    // Visual shake overlay (does not move physics body)
    this.hitFx = scene.add
      .rectangle(this.x, this.y, ENEMY_WIDTH + 8, ENEMY_HEIGHT + 8, 0xffffff, 0)
      .setDepth(2)
      .setStrokeStyle(2, 0xffffff, 0);
    this.healthBar = new EnemyHealthBar(scene, ENEMY_HP);
  }

  tick(time: number): void {
    if (!this.active || this.dying || !this.body) {
      return;
    }

    this.applyHitFx(time);
    this.healthBar.sync(this.x, this.y - ENEMY_HEIGHT / 2, time);
    this.hitFx.setPosition(this.x, this.y);

    if (time < this.stunUntil) {
      return;
    }

    const step = stepPatrol(this.x, this.homeX, this.range, this.dir);
    this.dir = step.dir;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(this.dir * ENEMY_SPEED);
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
    // Longer stun so knockback isn't overwritten by patrol next tick
    this.stunUntil = now + 380;
    this.flashUntil = now + 280;
    this.shakeUntil = now + 320;
    this.setFillStyle(0xffffff);
    this.healthBar.setHp(this.hp, now);

    const body = this.body as Phaser.Physics.Arcade.Body;
    const boost = 1.35;
    body.setVelocity(facing * force.x * boost, force.y * boost);

    if (this.hp <= 0) {
      this.dying = true;
      this.scene.time.delayedCall(140, () => {
        this.healthBar.destroy();
        this.hitFx.destroy();
        this.destroy();
      });
      return true;
    }

    return true;
  }

  private applyHitFx(time: number): void {
    if (time < this.flashUntil) {
      const pulse = Math.floor(time / 50) % 2 === 0;
      this.setFillStyle(pulse ? 0xffffff : 0xffe0b0);
      this.hitFx.setStrokeStyle(3, 0xffffff, pulse ? 1 : 0.45);
      this.hitFx.setFillStyle(0xffffff, pulse ? 0.28 : 0.1);
    } else {
      if (this.fillColor !== this.baseColor) {
        this.setFillStyle(this.baseColor);
      }
      this.hitFx.setStrokeStyle(2, 0xffffff, 0);
      this.hitFx.setFillStyle(0xffffff, 0);
    }

    if (time < this.shakeUntil) {
      const t = (this.shakeUntil - time) / 320;
      const ox = Math.sin(time / 14) * 7 * t;
      const oy = Math.cos(time / 11) * 3 * t;
      this.hitFx.setPosition(this.x + ox, this.y + oy);
    }
  }
}
