import Phaser from "phaser";
import type { EnemySpawn } from "../data/MapData";

export const ENEMY_WIDTH = 34;
export const ENEMY_HEIGHT = 44;
export const ENEMY_SPEED = 70;
export const ENEMY_HP = 3;
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
  }

  tick(time: number): void {
    if (!this.active || this.dying || !this.body || time < this.stunUntil) {
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
        this.setFillStyle(ENEMY_COLOR);
      }
    });
    return true;
  }
}
