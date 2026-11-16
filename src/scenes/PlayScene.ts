import Phaser from "phaser";

/** Legacy entry — redirects into the staged run starting at A. */
export class PlayScene extends Phaser.Scene {
  constructor() {
    super("play");
  }

  create(): void {
    this.scene.start("stage", { stageId: "A" });
  }
}
