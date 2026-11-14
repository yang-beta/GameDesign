import Phaser from "phaser";
import type { EnemySpawn } from "../data/MapData";
import { EnemyHealthBar } from "./EnemyHealthBar";

export const ENEMY_WIDTH = 34;
export const ENEMY_HEIGHT = 44;
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
      .rectangle(this.x, this.y, ENEMY_WIDTH + 6, ENEMY_HEIGHT + 6, 0xffffff, 0)
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
    this.stunUntil = now + 220;
    this.flashUntil = now + 160;
    this.shakeUntil = now + 200;
    this.setFillStyle(0xffffff);
    this.healthBar.setHp(this.hp, now);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(facing * force.x, force.y);

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
      const pulse = Math.floor(time / 35) % 2 === 0;
      this.setFillStyle(pulse ? 0xffffff : 0xffc98a);
      this.hitFx.setStrokeStyle(2, 0xffffff, pulse ? 0.95 : 0.35);
      this.hitFx.setFillStyle(0xffffff, pulse ? 0.18 : 0.05);
    } else {
      if (this.fillColor !== this.baseColor) {
        this.setFillStyle(this.baseColor);
      }
      this.hitFx.setStrokeStyle(2, 0xffffff, 0);
      this.hitFx.setFillStyle(0xffffff, 0);
    }

    if (time < this.shakeUntil) {
      const t = (this.shakeUntil - time) / 200;
      const ox = Math.sin(time / 16) * 4 * t;
      const oy = Math.cos(time / 13) * 2 * t;
      this.hitFx.setPosition(this.x + ox, this.y + oy);
    }
  }
}
