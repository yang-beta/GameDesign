import Phaser from "phaser";
import type { MovingPlatformDef } from "../data/Interactables";

export class MovingPlatform {
  readonly def: MovingPlatformDef;
  readonly block: Phaser.GameObjects.Rectangle;
  private dir: 1 | -1 = -1;

  constructor(scene: Phaser.Scene, def: MovingPlatformDef) {
    this.def = def;
    const y = def.surfaceYMax + def.thickness / 2;
    this.block = scene.add.rectangle(def.x, y, def.width, def.thickness, def.color);
    this.block.setStrokeStyle(1, 0xb6ffd0, 0.7);
    this.block.setDepth(2);
    scene.physics.add.existing(this.block, true);
  }

  /** Returns deltaY applied this frame (for carrying the player). */
  tick(delta: number): number {
    const body = this.block.body as Phaser.Physics.Arcade.StaticBody;
    const half = this.def.thickness / 2;
    const surfaceY = this.block.y - half;
    let next = surfaceY + this.dir * this.def.speed * (delta / 1000);
    if (next <= this.def.surfaceYMin) {
      next = this.def.surfaceYMin;
      this.dir = 1;
    } else if (next >= this.def.surfaceYMax) {
      next = this.def.surfaceYMax;
      this.dir = -1;
    }
    const dy = next - surfaceY;
    this.block.y = next + half;
    body.updateFromGameObject();
    return dy;
  }

  surfaceTop(): number {
    return this.block.y - this.def.thickness / 2;
  }
}
