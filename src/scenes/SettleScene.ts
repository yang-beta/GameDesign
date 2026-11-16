import Phaser from "phaser";
import { getHp, getStageClearCount, resetRun } from "../state/RunState";

export class SettleScene extends Phaser.Scene {
  constructor() {
    super("settle");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#10141c");
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.add
      .text(cx, cy - 90, "關卡結算", {
        fontFamily: '"Microsoft JhengHei UI", "Microsoft JhengHei", "Segoe UI", sans-serif',
        fontSize: "42px",
        color: "#f4f7fb",
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy - 30, `剩餘生命：${getHp()}　（結算數值暫不計算）`, {
        fontFamily: '"Microsoft JhengHei UI", "Microsoft JhengHei", "Segoe UI", sans-serif',
        fontSize: "18px",
        color: "#9eb0d6",
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy + 10, `本次通過傳送：${getStageClearCount()}`, {
        fontFamily: '"Microsoft JhengHei UI", "Microsoft JhengHei", "Segoe UI", sans-serif',
        fontSize: "16px",
        color: "#c5cad3",
      })
      .setOrigin(0.5);

    const replay = this.add
      .text(cx, cy + 80, "【 重新遊玩 】　按空白鍵或點擊", {
        fontFamily: '"Microsoft JhengHei UI", "Microsoft JhengHei", "Segoe UI", sans-serif',
        fontSize: "22px",
        color: "#ffd36a",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const go = () => {
      resetRun();
      this.scene.start("stage", { stageId: "A" });
    };

    replay.on("pointerdown", go);
    this.input.keyboard?.once("keydown-SPACE", go);
    this.input.keyboard?.once("keydown-ENTER", go);
  }
}
