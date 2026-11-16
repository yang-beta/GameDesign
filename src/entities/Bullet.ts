import Phaser from "phaser";

export const BULLET_WIDTH = 12;
export const BULLET_HEIGHT = 8;
export const BULLET_SPEED = 280;
export const BULLET_DAMAGE = 4;
export const BULLET_LIFE_MS = 2600;

export class Bullet extends Phaser.GameObjects.Rectangle {
  readonly damage = BULLET_DAMAGE;
  private aliveUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, dir: 1 | -1) {
    super(scene, x, y, BULLET_WIDTH, BULLET_HEIGHT, 0xffd36a);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setVelocityX(dir * BULLET_SPEED);
    body.setSize(BULLET_WIDTH, BULLET_HEIGHT);
    this.setDepth(8);
    this.aliveUntil = scene.time.now + BULLET_LIFE_MS;
  }

  tick(now: number): boolean {
    if (!this.active) {
      return false;
    }
    if (now >= this.aliveUntil) {
      this.destroy();
      return false;
    }
    return true;
  }
}
