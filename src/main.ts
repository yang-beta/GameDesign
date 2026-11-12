import Phaser from "phaser";
import { GRAVITY_Y } from "./entities/Player";
import { PlayScene } from "./scenes/PlayScene";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 960,
  height: 540,
  backgroundColor: "#171a21",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: GRAVITY_Y },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [PlayScene],
});

game.canvas.setAttribute("tabindex", "0");
game.canvas.focus();
