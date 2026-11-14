import Phaser from "phaser";
import { SANDBAG_SPAWN, ENEMY_SPAWNS, PLATFORMS, PLAYER_SPAWN, ROOM, toRect } from "../data/MapData";
import { HitSpark } from "../effects/HitSpark";
import { Enemy } from "../entities/Enemy";
import {
  GRAVITY_Y,
  hitboxTouches,
  PlayerController,
  STAND_HEIGHT,
  type AttackProfile,
  type Hitbox,
  type PlayerInput,
} from "../entities/PlayerController";
import { PlayerRenderer } from "../entities/PlayerRenderer";
import { Sandbag } from "../entities/Sandbag";

export class PlayScene extends Phaser.Scene {
  private player!: PlayerController;
  private puppet!: PlayerRenderer;
  private sparks!: HitSpark;
  private sandbag!: Sandbag;
  private enemies: Enemy[] = [];
  private statusText!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private jumpKey!: Phaser.Input.Keyboard.Key;
  private attackKey!: Phaser.Input.Keyboard.Key;
  private kickKey!: Phaser.Input.Keyboard.Key;
  private hitKey!: Phaser.Input.Keyboard.Key;
  private debugKey!: Phaser.Input.Keyboard.Key;
  private surfaces: { block: Phaser.GameObjects.Rectangle; droppable: boolean }[] = [];
  private dropping: Phaser.GameObjects.Rectangle | null = null;
  private crouchAnchor: Phaser.GameObjects.Rectangle | null = null;
  private simTime = 0;
  private hitstopUntil = 0;

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
      this.surfaces.push({ block, droppable: def.id !== "floor" });
    }

    this.player = new PlayerController(
      this,
      PLAYER_SPAWN.x,
      PLAYER_SPAWN.surfaceY - STAND_HEIGHT / 2 - 2,
    );
    this.puppet = new PlayerRenderer(this);
    this.sparks = new HitSpark(this);
    this.physics.add.collider(this.player.bodyObject, platforms, undefined, (left, right) => {
      if (!this.dropping) {
        return true;
      }
      return this.blockOf(left) !== this.dropping && this.blockOf(right) !== this.dropping;
    });

    this.sandbag = new Sandbag(
      this,
      SANDBAG_SPAWN.x,
      SANDBAG_SPAWN.surfaceY,
      SANDBAG_SPAWN.width,
      SANDBAG_SPAWN.height,
    );
    this.physics.add.collider(this.sandbag, platforms);

    const enemyGroup = this.physics.add.group();
    this.enemies = ENEMY_SPAWNS.map((spawn) => {
      const enemy = new Enemy(this, spawn);
      enemyGroup.add(enemy);
      this.physics.add.collider(enemy, platforms);
      return enemy;
    });

    this.cameras.main.startFollow(this.player.bodyObject, true, 0.16, 0.16);

    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error("Keyboard plugin is unavailable");
    }

    this.cursors = keyboard.createCursorKeys();
    this.jumpKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.attackKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.kickKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    this.hitKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.debugKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H);
    keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.Z,
      Phaser.Input.Keyboard.KeyCodes.C,
      Phaser.Input.Keyboard.KeyCodes.X,
      Phaser.Input.Keyboard.KeyCodes.H,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
    ]);

    this.input.on("pointerdown", () => {
      this.game.canvas.focus();
    });

    this.add
      .rectangle(12, 12, 760, 168, 0x000000, 0.55)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(20);

    const labelStyle = {
      fontFamily: '"Microsoft JhengHei UI", "Microsoft JhengHei", "Segoe UI", sans-serif',
      fontSize: "15px",
      color: "#9eb0d6",
    };

    this.add
      .text(24, 18, "Project：獸王覺醒 Beast Awakening — 火柴人動作", labelStyle)
      .setScrollFactor(0)
      .setDepth(21);

    this.statusText = this.add
      .text(24, 40, "狀態：站立", {
        fontFamily: labelStyle.fontFamily,
        fontSize: "22px",
        color: "#f4f7fb",
      })
      .setScrollFactor(0)
      .setDepth(21);

    this.add
      .text(24, 70, "←→ 行走　空白 跳躍　↓ 蹲下　↓+空白 落到下一層", {
        fontFamily: labelStyle.fontFamily,
        fontSize: "14px",
        color: "#c5cad3",
      })
      .setScrollFactor(0)
      .setDepth(21);

    this.add
      .text(24, 92, "地面：Z 站立拳　C 站立踢　｜　空中：Z 跳躍攻擊　C 旋風腳", {
        fontFamily: labelStyle.fontFamily,
        fontSize: "14px",
        color: "#c5cad3",
      })
      .setScrollFactor(0)
      .setDepth(21);

    this.add
      .text(24, 114, "蹲下中：Z 蹲下拳　C 蹲下踢　｜　H 判定框　X 受擊", {
        fontFamily: labelStyle.fontFamily,
        fontSize: "14px",
        color: "#c5cad3",
      })
      .setScrollFactor(0)
      .setDepth(21);

    this.add
      .text(24, 136, "命中敵人顯示血條；跳躍技需在空中、蹲下技需先按 ↓", {
        fontFamily: labelStyle.fontFamily,
        fontSize: "13px",
        color: "#9eb0d6",
      })
      .setScrollFactor(0)
      .setDepth(21);
  }

  update(time: number, delta: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.debugKey)) {
      this.player.showHitboxes = !this.player.showHitboxes;
    }

    const frozen = time < this.hitstopUntil;
    if (frozen) {
      this.physics.world.pause();
    } else if (this.physics.world.isPaused) {
      this.physics.world.resume();
    }

    const step = frozen ? 0 : delta;
    this.simTime += step;
    const surface = this.surfaceUnderFeet(18);
    const nearSurface = this.surfaceUnderFeet(36);
    const onSurface = surface !== null && surface.block !== this.dropping;
    const velocityY = this.player.physicsBody.velocity.y;
    this.player.setSurfaceNearby(nearSurface !== null && nearSurface.block !== this.dropping);
    this.player.setSurfaceSupport(onSurface && velocityY >= -80 && velocityY <= 120);
    this.updateCrouchAnchor();
    this.player.update(this.simTime, step, this.readInput());
    this.updateDrop();
    if (!frozen) {
      for (const enemy of this.enemies) {
        if (enemy.active) {
          enemy.tick(time);
        }
      }
    }

    this.puppet.sync(this.player.getViewState());
    this.resolveAttackHits();
    this.sparks.update(delta);
    this.statusText.setText(`狀態：${this.player.getViewState().status}`);
  }

  private updateDrop(): void {
    if (this.player.takeDropRequest()) {
      const surface = this.surfaceUnderFeet(36);
      if (surface?.droppable) {
        this.dropping = surface.block;
        this.crouchAnchor = null;
        this.player.setCrouchAnchor(null);
        this.player.confirmDrop(this.simTime);
      }
    }

    if (!this.dropping) {
      return;
    }

    const platformBottom = this.dropping.y + this.dropping.displayHeight / 2;
    if (this.player.physicsBody.bottom > platformBottom + 8) {
      this.dropping = null;
      this.player.endDrop();
    }
  }

  private updateCrouchAnchor(): void {
    const down = this.cursors.down.isDown;
    if (!down || this.dropping || this.player.isInHitstun(this.simTime)) {
      this.crouchAnchor = null;
      this.player.setCrouchAnchor(null);
      return;
    }

    if (this.crouchAnchor && !this.overlapsX(this.crouchAnchor)) {
      this.crouchAnchor = null;
    }

    if (!this.crouchAnchor) {
      const body = this.player.physicsBody;
      const onFloor = body.blocked.down || body.touching.down;
      const found = this.surfaceUnderFeet(onFloor ? 80 : 28);
      if (
        found &&
        found.block !== this.dropping &&
        body.velocity.y >= -80 &&
        body.velocity.y <= 220
      ) {
        this.crouchAnchor = found.block;
      }
    }

    const top = this.crouchAnchor
      ? this.crouchAnchor.y - this.crouchAnchor.displayHeight / 2
      : null;
    this.player.setCrouchAnchor(top);
  }

  private overlapsX(block: Phaser.GameObjects.Rectangle): boolean {
    const x = this.player.bodyObject.x;
    const left = block.x - block.displayWidth / 2;
    const right = block.x + block.displayWidth / 2;
    return x >= left && x <= right;
  }

  private surfaceUnderFeet(maxGap: number): { block: Phaser.GameObjects.Rectangle; droppable: boolean } | null {
    const body = this.player.physicsBody;
    const feet = body.bottom;
    const x = this.player.bodyObject.x;
    let best: { block: Phaser.GameObjects.Rectangle; droppable: boolean } | null = null;
    let bestGap = maxGap;
    for (const surface of this.surfaces) {
      const block = surface.block;
      const top = block.y - block.displayHeight / 2;
      const left = block.x - block.displayWidth / 2;
      const right = block.x + block.displayWidth / 2;
      if (x < left || x > right) {
        continue;
      }
      const gap = Math.abs(feet - top);
      if (gap <= bestGap) {
        bestGap = gap;
        best = surface;
      }
    }
    return best;
  }

  private blockOf(candidate: unknown): Phaser.GameObjects.Rectangle | null {
    if (candidate instanceof Phaser.GameObjects.Rectangle) {
      return candidate;
    }
    if (candidate && typeof candidate === "object" && "gameObject" in candidate) {
      const gameObject = (candidate as { gameObject?: unknown }).gameObject;
      if (gameObject instanceof Phaser.GameObjects.Rectangle) {
        return gameObject;
      }
    }
    return null;
  }

  private resolveAttackHits(): void {
    const hitbox = this.player.getViewState().hitbox;
    const attack = this.player.currentAttack();
    if (!hitbox || !attack) {
      return;
    }

    if (this.touches(hitbox, this.sandbag)) {
      const landed = this.sandbag.takeHit(this.player.facing, this.player.attackSerial, {
        x: attack.knockback,
        y: attack.knockbackY,
      });
      if (landed) {
        this.impact(attack, this.sandbag.x, this.sandbag.y - 10);
      }
    }

    for (const enemy of this.enemies) {
      if (!enemy.active || !this.touches(hitbox, enemy)) {
        continue;
      }
      const landed = enemy.takeHit(this.player.facing, this.player.attackSerial, this.simTime, {
        x: attack.knockback,
        y: attack.knockbackY,
      });
      if (landed) {
        this.impact(attack, enemy.x, enemy.y);
      }
    }
  }

  private touches(hit: Hitbox, target: Phaser.GameObjects.Rectangle): boolean {
    const body = target.body as Phaser.Physics.Arcade.Body | null;
    const width = body?.width ?? target.displayWidth;
    const height = body?.height ?? target.displayHeight;
    return hitboxTouches(hit, {
      x: target.x,
      y: target.y,
      width,
      height,
    });
  }

  private impact(attack: AttackProfile, x: number, y: number): void {
    const heavy = attack.hitstop >= 80;
    this.hitstopUntil = Math.max(this.hitstopUntil, this.time.now + attack.hitstop);
    this.cameras.main.shake(heavy ? 160 : 90, heavy ? 0.008 : 0.0036);
    this.sparks.spawn(x, y, heavy);
  }

  private readInput(): PlayerInput {
    return {
      left: this.cursors.left.isDown,
      right: this.cursors.right.isDown,
      down: this.cursors.down.isDown,
      jumpPressed: Phaser.Input.Keyboard.JustDown(this.jumpKey),
      jumpReleased: Phaser.Input.Keyboard.JustUp(this.jumpKey),
      attackPressed: Phaser.Input.Keyboard.JustDown(this.attackKey),
      kickPressed: Phaser.Input.Keyboard.JustDown(this.kickKey),
      hitPressed: Phaser.Input.Keyboard.JustDown(this.hitKey),
    };
  }
}
