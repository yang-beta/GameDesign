import Phaser from "phaser";

/**
 * Lightweight boot screen so the first paint isn't a blank hang.
 * Player limb sheets are skipped while stick-mode is active.
 */
export class BootScene extends Phaser.Scene {
  private barFill!: Phaser.GameObjects.Rectangle;
  private label!: Phaser.GameObjects.Text;

  constructor() {
    super("boot");
  }

  preload(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    this.cameras.main.setBackgroundColor("#10141c");

    this.add
      .text(w / 2, h / 2 - 48, "獸王覺醒", {
        fontFamily: '"Microsoft JhengHei UI", "Microsoft JhengHei", "Segoe UI", sans-serif',
        fontSize: "36px",
        color: "#f4f7fb",
      })
      .setOrigin(0.5);

    this.label = this.add
      .text(w / 2, h / 2 + 8, "載入中… 0%", {
        fontFamily: '"Microsoft JhengHei UI", "Microsoft JhengHei", "Segoe UI", sans-serif',
        fontSize: "16px",
        color: "#9eb0d6",
      })
      .setOrigin(0.5);

    this.add
      .rectangle(w / 2, h / 2 + 44, 320, 14, 0x2a3140)
      .setStrokeStyle(1, 0x4a5670);
    this.barFill = this.add.rectangle(w / 2 - 160, h / 2 + 44, 0, 14, 0x7ec8ff).setOrigin(0, 0.5);

    this.load.on("progress", (value: number) => {
      this.barFill.width = 320 * value;
      this.label.setText(`載入中… ${Math.round(value * 100)}%`);
    });

    // Tiny placeholder so progress events still fire even with few assets.
    this.load.image(
      "boot-pixel",
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    );
  }

  create(): void {
    this.label.setText("載入完成");
    this.time.delayedCall(120, () => {
      this.scene.start("stage", { stageId: "A" });
    });
  }
}
