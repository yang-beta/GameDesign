import Phaser from "phaser";
import { ENEMY_SPAWNS, PLATFORMS, PLAYER_SPAWN, ROOM, toRect } from "../data/MapData";
import { Enemy } from "../entities/Enemy";
import { GRAVITY_Y, Player, STAND_HEIGHT, type PlayerInput } from "../entities/Player";

export class PlayScene extends Phaser.Scene {
  private player!: Player;
  private enemies: Enemy[] = [];
  private statusText!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private jumpKey!: Phaser.Input.Keyboard.Key;
  private attackKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super("play");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#171a21");
    this.physics.world.gravity.y = GRAVITY_Y;
    this.physics.world.setBounds(0, 0, ROOM.width, ROOM.height);
    this.cameras.main.setBounds(0, 0, ROOM.width, ROOM.height);

    const platforms = this.physics.add.staticGroup();
    for (const def of PLATFORMS) {
      const rect = toRect(def);
      const block = this.add.rectangle(rect.x, rect.y, rect.width, rect.height, def.color);
      platforms.add(block);
    }

    this.player = new Player(this, PLAYER_SPAWN.x, PLAYER_SPAWN.surfaceY - STAND_HEIGHT / 2 - 2);
    this.physics.add.collider(this.player, platforms);

    const enemyGroup = this.physics.add.group();
    this.enemies = ENEMY_SPAWNS.map((spawn) => {
      const enemy = new Enemy(this, spawn);
      enemyGroup.add(enemy);
      this.physics.add.collider(enemy, platforms);
      return enemy;
    });

    this.physics.add.overlap(this.player.whip, enemyGroup, (_whip, target) => {
      if (!(target instanceof Enemy)) {
        return;
      }
      if (!this.player.isAttacking(this.time.now)) {
        return;
      }
      target.takeHit(this.player.facing, this.player.attackSerial, this.time.now);
    });

    this.cameras.main.startFollow(this.player, true, 0.16, 0.16);

    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error("Keyboard plugin is unavailable");
    }

    this.cursors = keyboard.createCursorKeys();
    this.jumpKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.attackKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.Z,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
    ]);

    this.input.on("pointerdown", () => {
      this.game.canvas.focus();
    });

    this.add
      .rectangle(12, 12, 560, 108, 0x000000, 0.55)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(20);

    const labelStyle = {
      fontFamily: '"Microsoft JhengHei UI", "Microsoft JhengHei", "Segoe UI", sans-serif',
      fontSize: "15px",
      color: "#9eb0d6",
    };

    this.add
      .text(24, 22, "Project：獸王覺醒 Beast Awakening", labelStyle)
      .setScrollFactor(0)
      .setDepth(21);

    this.statusText = this.add
      .text(24, 46, "狀態：站立", {
        fontFamily: labelStyle.fontFamily,
        fontSize: "22px",
        color: "#f4f7fb",
      })
      .setScrollFactor(0)
      .setDepth(21);

    this.add
      .text(24, 80, "方向鍵移動　空白跳躍（按住較高，可二段跳）　↓ 蹲下　Z 揮擊", {
        fontFamily: labelStyle.fontFamily,
        fontSize: "14px",
        color: "#c5cad3",
      })
      .setScrollFactor(0)
      .setDepth(21);
  }

  update(time: number): void {
    this.player.update(time, this.readInput());
    for (const enemy of this.enemies) {
      if (enemy.active) {
        enemy.tick(time);
      }
    }
    this.statusText.setText(`狀態：${this.player.getStatus(time)}`);
  }

  private readInput(): PlayerInput {
    return {
      left: this.cursors.left.isDown,
      right: this.cursors.right.isDown,
      down: this.cursors.down.isDown,
      jumpPressed: Phaser.Input.Keyboard.JustDown(this.jumpKey),
      jumpReleased: Phaser.Input.Keyboard.JustUp(this.jumpKey),
      attackPressed: Phaser.Input.Keyboard.JustDown(this.attackKey),
    };
  }
}
