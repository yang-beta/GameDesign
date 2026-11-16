import Phaser from "phaser";
import type { ChestDef } from "../data/Interactables";

export const CHEST_WIDTH = 44;
export const CHEST_HEIGHT = 34;
export const CHEST_OPEN_RANGE = 70;

export class Chest {
  readonly def: ChestDef;
  private readonly box: Phaser.GameObjects.Rectangle;
  private readonly lid: Phaser.GameObjects.Rectangle;
  private readonly prompt: Phaser.GameObjects.Text;
  private readonly lootIcon: Phaser.GameObjects.Rectangle;
  private readonly lootText: Phaser.GameObjects.Text;
  private opened = false;

  constructor(scene: Phaser.Scene, def: ChestDef) {
    this.def = def;
    const y = def.surfaceY - CHEST_HEIGHT / 2;
    this.box = scene.add
      .rectangle(def.x, y, CHEST_WIDTH, CHEST_HEIGHT, 0x8b5a2b)
      .setStrokeStyle(2, 0xd4a574)
      .setDepth(3);
    this.lid = scene.add
      .rectangle(def.x, y - CHEST_HEIGHT / 2 + 6, CHEST_WIDTH + 4, 12, 0xa66b33)
      .setDepth(4);

    const font = '"Microsoft JhengHei UI", "Microsoft JhengHei", "Segoe UI", sans-serif';
    this.prompt = scene.add
      .text(def.x, y - 48, "靠近開啟", {
        fontFamily: font,
        fontSize: "13px",
        color: "#ffe7b0",
      })
      .setOrigin(0.5)
      .setDepth(5)
      .setVisible(false);

    this.lootIcon = scene.add
      .rectangle(def.x, y - 70, 28, 28, def.itemColor)
      .setStrokeStyle(2, 0xffffff, 0.7)
      .setDepth(6)
      .setVisible(false);
    this.lootText = scene.add
      .text(def.x, y - 100, def.itemLabel, {
        fontFamily: font,
        fontSize: "16px",
        color: "#fff4d6",
      })
      .setOrigin(0.5)
      .setDepth(6)
      .setVisible(false);
  }

  get isOpened(): boolean {
    return this.opened;
  }

  inRange(playerX: number, playerY: number): boolean {
    return Math.hypot(playerX - this.def.x, playerY - (this.def.surfaceY - CHEST_HEIGHT / 2)) <= CHEST_OPEN_RANGE;
  }

  /** Returns item label when newly opened. */
  tryOpen(playerX: number, playerY: number): string | null {
    if (this.opened) {
      this.prompt.setVisible(false);
      return null;
    }
    const near = this.inRange(playerX, playerY);
    this.prompt.setVisible(near);
    if (!near) {
      return null;
    }
    this.opened = true;
    this.prompt.setVisible(false);
    this.lid.setFillStyle(0x5c3a1a);
    this.lid.y -= 10;
    this.lootIcon.setVisible(true);
    this.lootText.setVisible(true);
    return this.def.itemLabel;
  }

  setVisible(visible: boolean): void {
    this.box.setVisible(visible);
    this.lid.setVisible(visible);
    if (!visible) {
      this.prompt.setVisible(false);
    }
  }
}
