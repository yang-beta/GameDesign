import Phaser from "phaser";

/** Floating HP bar that fades in on hit and stays while damaged. */
export class EnemyHealthBar {
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly border: Phaser.GameObjects.Rectangle;
  private visibleUntil = 0;
  private readonly maxHp: number;
  private hp: number;

  constructor(
    scene: Phaser.Scene,
    maxHp: number,
    private readonly width = 40,
    height = 5,
  ) {
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.bg = scene.add.rectangle(0, 0, width, height, 0x1a1a1a, 0.85).setDepth(12);
    this.fill = scene.add.rectangle(0, 0, width, height, 0xe24b4b, 1).setDepth(13);
    this.border = scene.add
      .rectangle(0, 0, width + 2, height + 2, 0x000000, 0)
      .setStrokeStyle(1, 0xffffff, 0.55)
      .setDepth(14);
    this.setAlpha(0);
  }

  show(now: number, holdMs = 2400): void {
    this.visibleUntil = Math.max(this.visibleUntil, now + holdMs);
    this.setAlpha(1);
  }

  setHp(hp: number, now: number): void {
    this.hp = Math.max(0, hp);
    const ratio = this.maxHp <= 0 ? 0 : this.hp / this.maxHp;
    this.fill.width = Math.max(0, this.width * ratio);
    this.fill.setFillStyle(ratio > 0.35 ? 0xe24b4b : 0xffcc44);
    this.show(now);
  }

  sync(x: number, y: number, now: number): void {
    const top = y - 8;
    this.bg.setPosition(x, top);
    this.border.setPosition(x, top);
    // left-anchored fill
    this.fill.setOrigin(0, 0.5);
    this.bg.setOrigin(0.5, 0.5);
    this.border.setOrigin(0.5, 0.5);
    this.fill.setPosition(x - this.width / 2, top);

    if (now > this.visibleUntil && this.hp >= this.maxHp) {
      this.setAlpha(0);
    } else if (now > this.visibleUntil) {
      this.setAlpha(0.55);
    }
  }

  destroy(): void {
    this.bg.destroy();
    this.fill.destroy();
    this.border.destroy();
  }

  private setAlpha(a: number): void {
    this.bg.setAlpha(a);
    this.fill.setAlpha(a);
    this.border.setAlpha(a * 0.9);
  }
}
