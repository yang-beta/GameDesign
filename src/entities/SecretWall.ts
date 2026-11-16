import Phaser from "phaser";
import { SECRET_HITS_REQUIRED, type SecretWallDef } from "../data/Interactables";
import { toRect } from "../data/MapData";

const CRACK = 0x1a1410;

export function crackAlpha(hits: number, required = SECRET_HITS_REQUIRED): number {
  return Math.min(1, hits / required);
}

export function shouldCountWallHit(lastSerial: number, serial: number, broken: boolean): boolean {
  return !broken && serial >= 0 && serial !== lastSerial;
}

export class SecretWall {
  readonly def: SecretWallDef;
  private readonly body: Phaser.GameObjects.Rectangle;
  private readonly cracks: Phaser.GameObjects.Graphics;
  private readonly colliderTarget: Phaser.GameObjects.Rectangle;
  private hits = 0;
  private broken = false;
  private lastAttackSerial = -1;
  private alcove!: Phaser.GameObjects.Rectangle;
  private roomParts: Phaser.GameObjects.Rectangle[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    def: SecretWallDef,
    platforms: Phaser.Physics.Arcade.StaticGroup,
    surfaces: { block: Phaser.GameObjects.Rectangle; droppable: boolean }[],
    private readonly onBreak?: () => void,
  ) {
    this.def = def;

    this.alcove = scene.add
      .rectangle(def.alcove.x, def.alcove.y, def.alcove.width, def.alcove.height, def.alcove.color, 0.25)
      .setDepth(0);

    const floors = [def.roomFloor, ...def.pathPlatforms];
    for (const plat of floors) {
      const rect = toRect(plat);
      const block = scene.add
        .rectangle(rect.x, rect.y, rect.width, rect.height, plat.color, 0.3)
        .setDepth(1);
      platforms.add(block);
      surfaces.push({ block, droppable: true });
      this.roomParts.push(block);
    }

    this.body = scene.add
      .rectangle(def.x, def.y, def.width, def.height, def.blendColor, 0.92)
      .setDepth(3);
    this.colliderTarget = this.body;
    platforms.add(this.body);
    this.cracks = scene.add.graphics().setDepth(4);
  }

  get isBroken(): boolean {
    return this.broken;
  }

  get hitCount(): number {
    return this.hits;
  }

  asTarget(): Phaser.GameObjects.Rectangle {
    return this.colliderTarget;
  }

  takeHit(attackSerial: number, attackerFacing: 1 | -1): boolean {
    if (!shouldCountWallHit(this.lastAttackSerial, attackSerial, this.broken)) {
      return false;
    }
    if (attackerFacing !== this.def.approachSide) {
      return false;
    }
    this.lastAttackSerial = attackSerial;
    this.hits += 1;
    this.drawCracks();
    this.scene.cameras.main.shake(60, 0.0025);
    if (this.hits >= this.def.hitsRequired) {
      this.breakOpen();
    }
    return true;
  }

  private breakOpen(): void {
    this.broken = true;
    this.alcove.setAlpha(0.92);
    for (const part of this.roomParts) {
      part.setAlpha(1);
    }
    this.cracks.clear();
    this.body.setActive(false).setVisible(false);
    if (this.body.body) {
      this.scene.physics.world.disable(this.body);
    }
    this.onBreak?.();
  }

  private drawCracks(): void {
    this.cracks.clear();
    if (this.broken || this.hits <= 0) {
      return;
    }
    const strength = crackAlpha(this.hits, this.def.hitsRequired);
    const { x, y, width, height } = this.def;
    const left = x - width / 2;
    const top = y - height / 2;
    this.cracks.lineStyle(1.5 + strength * 1.5, CRACK, 0.35 + strength * 0.45);
    const lines = Math.min(this.hits, this.def.hitsRequired);
    for (let i = 0; i < lines; i += 1) {
      const t = (i + 1) / (this.def.hitsRequired + 1);
      const y0 = top + height * t;
      const wobble = (i % 2 === 0 ? 1 : -1) * (4 + i * 2);
      this.cracks.beginPath();
      this.cracks.moveTo(left + 2, y0);
      this.cracks.lineTo(x + wobble * 0.3, y0 + wobble * 0.25);
      this.cracks.lineTo(left + width - 2, y0 - wobble * 0.15);
      this.cracks.strokePath();
    }
  }
}
