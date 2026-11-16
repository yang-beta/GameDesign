import Phaser from "phaser";
import { getHp, getMaxHp } from "../state/RunState";
import { PLAYER_DISPLAY_NAME } from "../data/Interactables";

const FONT = '"Microsoft JhengHei UI", "Microsoft JhengHei", "Segoe UI", sans-serif';
const BAR_W = 180;
const BAR_H = 14;

export class GameHud {
  private readonly hpFill: Phaser.GameObjects.Rectangle;
  private readonly hpLabel: Phaser.GameObjects.Text;
  private readonly eventText: Phaser.GameObjects.Text;
  private readonly poseText: Phaser.GameObjects.Text;
  private clearEventAt = 0;

  constructor(scene: Phaser.Scene) {
    // 1) Top-left — hero identity + HP bar
    scene.add
      .rectangle(12, 10, 250, 64, 0x0b0e14, 0.72)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(40)
      .setStrokeStyle(1, 0x3a465c, 0.8);

    scene.add
      .text(22, 16, PLAYER_DISPLAY_NAME, {
        fontFamily: FONT,
        fontSize: "15px",
        color: "#e8eef8",
      })
      .setScrollFactor(0)
      .setDepth(41);

    scene.add
      .rectangle(22, 42, BAR_W, BAR_H, 0x2a3140)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(41);

    this.hpFill = scene.add
      .rectangle(22, 42, BAR_W, BAR_H, 0xe35d5d)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(42);

    this.hpLabel = scene.add
      .text(22 + BAR_W + 10, 40, "", {
        fontFamily: FONT,
        fontSize: "13px",
        color: "#ffb4b4",
      })
      .setScrollFactor(0)
      .setDepth(42);

    // 3) Top-right — event / pose status
    scene.add
      .rectangle(scene.scale.width - 12, 10, 250, 64, 0x0b0e14, 0.72)
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(40)
      .setStrokeStyle(1, 0x3a465c, 0.8);

    this.poseText = scene.add
      .text(scene.scale.width - 24, 16, "狀態：—", {
        fontFamily: FONT,
        fontSize: "14px",
        color: "#9eb0d6",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(41);

    this.eventText = scene.add
      .text(scene.scale.width - 24, 40, "", {
        fontFamily: FONT,
        fontSize: "15px",
        color: "#ffe08a",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(41);

    // 2) Bottom-center — temporary control hints
    scene.add
      .rectangle(scene.scale.width / 2, scene.scale.height - 18, 620, 36, 0x0b0e14, 0.55)
      .setScrollFactor(0)
      .setDepth(40)
      .setStrokeStyle(1, 0x3a465c, 0.5);

    scene.add
      .text(
        scene.scale.width / 2,
        scene.scale.height - 18,
        "←→ 移動　空白 跳　↓蹲　Z 拳　C 踢　↑ 傳送門　（測試提示，之後移除）",
        {
          fontFamily: FONT,
          fontSize: "13px",
          color: "#c5cad3",
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(41);

    this.refreshHp();
  }

  refreshHp(): void {
    const hp = getHp();
    const max = getMaxHp();
    const ratio = max <= 0 ? 0 : Math.max(0, Math.min(1, hp / max));
    this.hpFill.width = BAR_W * ratio;
    this.hpFill.fillColor = ratio > 0.35 ? 0xe35d5d : 0xff4444;
    this.hpLabel.setText(`${hp}/${max}`);
  }

  setPoseStatus(label: string): void {
    this.poseText.setText(`狀態：${label}`);
  }

  pushEvent(message: string, now: number, holdMs = 2200): void {
    this.eventText.setText(message);
    this.clearEventAt = now + holdMs;
  }

  tick(now: number): void {
    if (this.clearEventAt > 0 && now >= this.clearEventAt) {
      this.eventText.setText("");
      this.clearEventAt = 0;
    }
  }
}
