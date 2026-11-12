import Phaser from "phaser";

export const SANDBAG_COLOR = 0xc62828;

export class Sandbag extends Phaser.GameObjects.Rectangle {
  private lastAttackSerial = -1;
  private readonly baseColor = SANDBAG_COLOR;

  constructor(scene: Phaser.Scene, x: number, surfaceY: number, width: number, height: number) {
    super(scene, x, surfaceY - height / 2, width, height, SANDBAG_COLOR);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setDragX(700);
    body.setMaxVelocity(460, 980);
    body.setBounce(0.05, 0.05);
    this.setDepth(1);
  }

  takeHit(facing: 1 | -1, attackSerial: number, force: { x: number; y: number }): boolean {
    if (attackSerial < 0 || attackSerial === this.lastAttackSerial) {
      return false;
    }

    this.lastAttackSerial = attackSerial;
    this.setFillStyle(0xfff4f4);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(facing * force.x, force.y);
    this.scene.time.delayedCall(70, () => {
      if (this.active) {
        this.setFillStyle(this.baseColor);
      }
    });
    return true;
  }
}
