import Phaser from "phaser";
import { queuePlayerArt } from "../art/playerParts";
import { type StageDef, type StageId, stageById } from "../data/StageData";
import { toRect } from "../data/MapData";
import { HitSpark } from "../effects/HitSpark";
import { Bullet } from "../entities/Bullet";
import { Enemy, PATROL_CONTACT_DAMAGE } from "../entities/Enemy";
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
import {
  applyDamage,
  getHp,
  getMaxHp,
  markStageCleared,
  resetRun,
} from "../state/RunState";

interface StageSceneData {
  stageId?: StageId;
}

const PLAYER_HURT_COOLDOWN_MS = 700;

export class StageScene extends Phaser.Scene {
  private stage!: StageDef;
  private player!: PlayerController;
  private puppet!: PlayerRenderer;
  private sparks!: HitSpark;
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private exits: { zone: Phaser.GameObjects.Rectangle; def: StageDef["exits"][number] }[] = [];
  private statusText!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private jumpKey!: Phaser.Input.Keyboard.Key;
  private attackKey!: Phaser.Input.Keyboard.Key;
  private kickKey!: Phaser.Input.Keyboard.Key;
  private hitKey!: Phaser.Input.Keyboard.Key;
  private debugKey!: Phaser.Input.Keyboard.Key;
  private upKey!: Phaser.Input.Keyboard.Key;
  private surfaces: { block: Phaser.GameObjects.Rectangle; droppable: boolean }[] = [];
  private dropping: Phaser.GameObjects.Rectangle | null = null;
  private crouchAnchor: Phaser.GameObjects.Rectangle | null = null;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private simTime = 0;
  private hitstopUntil = 0;
  private hurtUntil = 0;
  private respawnAt = -1;
  private transitioning = false;

  constructor() {
    super("stage");
  }

  init(data: StageSceneData): void {
    this.stage = stageById(data.stageId ?? "A");
    this.enemies = [];
    this.bullets = [];
    this.exits = [];
    this.surfaces = [];
    this.dropping = null;
    this.crouchAnchor = null;
    this.simTime = 0;
    this.hitstopUntil = 0;
    this.hurtUntil = 0;
    this.respawnAt = -1;
    this.transitioning = false;
  }

  preload(): void {
    queuePlayerArt(this.load);
  }

  create(): void {
    const stage = this.stage;
    this.cameras.main.setBackgroundColor(stage.bg);
    this.physics.world.gravity.y = GRAVITY_Y;
    this.physics.world.setBounds(0, 0, stage.width, stage.height);
    this.cameras.main.setBounds(0, 0, stage.width, stage.height);

    this.platforms = this.physics.add.staticGroup();
    for (const def of stage.platforms) {
      const rect = toRect(def);
      const block = this.add.rectangle(rect.x, rect.y, rect.width, rect.height, def.color);
      this.platforms.add(block);
      this.surfaces.push({ block, droppable: def.id !== "floor" && !def.id.startsWith("b-top") });
    }

    this.player = new PlayerController(
      this,
      stage.playerSpawn.x,
      stage.playerSpawn.surfaceY - STAND_HEIGHT / 2 - 2,
    );
    this.puppet = new PlayerRenderer(this);
    this.sparks = new HitSpark(this);

    this.physics.add.collider(this.player.bodyObject, this.platforms, undefined, (left, right) => {
      if (!this.dropping) {
        return true;
      }
      return this.blockOf(left) !== this.dropping && this.blockOf(right) !== this.dropping;
    });

    this.spawnEnemies();
    this.createExits();
    this.cameras.main.startFollow(this.player.bodyObject, true, 0.16, 0.16);
    this.bindInput();
    this.buildHud();
  }

  update(time: number, delta: number): void {
    if (this.transitioning) {
      return;
    }

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
      this.tickEnemies(time);
      this.tickBullets(time);
      this.resolvePlayerHurt(time);
      this.checkExits();
      this.checkRespawn(time);
    }

    this.puppet.sync(this.player.getViewState());
    this.resolveAttackHits();
    this.sparks.update(delta);
    this.statusText.setText(`狀態：${this.player.getViewState().status}`);
    this.hpText.setText(`生命：${getHp()} / ${getMaxHp()}`);
  }

  private spawnEnemies(): void {
    for (const enemy of this.enemies) {
      enemy.destroy();
    }
    this.enemies = this.stage.enemies.map((spawn) => {
      const enemy = new Enemy(this, spawn);
      this.physics.add.collider(enemy, this.platforms);
      return enemy;
    });
    this.respawnAt = -1;
  }

  private createExits(): void {
    for (const def of this.stage.exits) {
      const zone = this.add
        .rectangle(def.x, def.y, def.width, def.height, 0x66ffcc, 0.22)
        .setStrokeStyle(2, 0x9effe0, 0.9)
        .setDepth(2);
      this.physics.add.existing(zone, true);
      this.add
        .text(def.x, def.y - def.height / 2 - 18, def.label, {
          fontFamily: '"Microsoft JhengHei UI", "Microsoft JhengHei", "Segoe UI", sans-serif',
          fontSize: "14px",
          color: "#d7fff2",
        })
        .setOrigin(0.5)
        .setDepth(3);
      this.exits.push({ zone, def });
    }
  }

  private bindInput(): void {
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
    this.upKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
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
    this.input.on("pointerdown", () => this.game.canvas.focus());
  }

  private buildHud(): void {
    this.add
      .rectangle(12, 12, 700, 118, 0x000000, 0.55)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(20);

    const font = '"Microsoft JhengHei UI", "Microsoft JhengHei", "Segoe UI", sans-serif';
    this.add
      .text(24, 18, `獸王覺醒｜${this.stage.title}`, {
        fontFamily: font,
        fontSize: "15px",
        color: "#9eb0d6",
      })
      .setScrollFactor(0)
      .setDepth(21);

    this.statusText = this.add
      .text(24, 40, "狀態：站立", { fontFamily: font, fontSize: "20px", color: "#f4f7fb" })
      .setScrollFactor(0)
      .setDepth(21);

    this.hpText = this.add
      .text(24, 68, `生命：${getHp()} / ${getMaxHp()}`, {
        fontFamily: font,
        fontSize: "18px",
        color: "#ffb4b4",
      })
      .setScrollFactor(0)
      .setDepth(21);

    this.add
      .text(24, 94, "方向鍵移動　空白跳　Z 拳　C 踢　↑ 傳送門　H 判定框", {
        fontFamily: font,
        fontSize: "13px",
        color: "#c5cad3",
      })
      .setScrollFactor(0)
      .setDepth(21);
  }

  private tickEnemies(time: number): void {
    const px = this.player.bodyObject.x;
    const py = this.player.bodyObject.y;
    for (const enemy of this.enemies) {
      if (!enemy.active) {
        continue;
      }
      enemy.tick(time, px, py, (bullet) => {
        this.bullets.push(bullet);
      });
    }
    this.enemies = this.enemies.filter((enemy) => enemy.active);
  }

  private tickBullets(time: number): void {
    this.bullets = this.bullets.filter((bullet) => bullet.tick(time));
  }

  private resolvePlayerHurt(time: number): void {
    if (time < this.hurtUntil || this.player.isInHitstun(this.simTime)) {
      return;
    }

    for (const enemy of this.enemies) {
      if (!enemy.active || enemy.isDying || enemy.contactDamage <= 0) {
        continue;
      }
      if (this.overlapsPlayer(enemy)) {
        this.hurtPlayer(enemy.contactDamage || PATROL_CONTACT_DAMAGE, time, enemy.x < this.player.bodyObject.x ? 1 : -1);
        return;
      }
    }

    for (const bullet of this.bullets) {
      if (!bullet.active) {
        continue;
      }
      if (this.overlapsPlayer(bullet)) {
        const dir = bullet.body && "velocity" in bullet.body
          ? ((bullet.body as Phaser.Physics.Arcade.Body).velocity.x >= 0 ? 1 : -1)
          : 1;
        this.hurtPlayer(bullet.damage, time, dir as 1 | -1);
        bullet.destroy();
        return;
      }
    }
  }

  private overlapsPlayer(target: Phaser.GameObjects.Rectangle): boolean {
    const body = this.player.physicsBody;
    return (
      Math.abs(target.x - this.player.bodyObject.x) * 2 <= target.displayWidth + body.width &&
      Math.abs(target.y - this.player.bodyObject.y) * 2 <= target.displayHeight + body.height
    );
  }

  private hurtPlayer(amount: number, time: number, knockDir: 1 | -1): void {
    const result = applyDamage(amount);
    this.hurtUntil = time + PLAYER_HURT_COOLDOWN_MS;
    this.player.physicsBody.setVelocity(knockDir * 220, -220);
    this.cameras.main.shake(100, 0.004);
    this.spawnDamageFloat(result.dealt);
    if (result.dead) {
      this.transitioning = true;
      this.time.delayedCall(500, () => {
        resetRun();
        this.scene.start("stage", { stageId: "A" });
      });
    }
  }

  private spawnDamageFloat(dealt: number): void {
    const label = this.add
      .text(210, 68, `-${dealt}`, {
        fontFamily: '"Microsoft JhengHei UI", "Microsoft JhengHei", "Segoe UI", sans-serif',
        fontSize: "22px",
        color: "#ff6b6b",
      })
      .setScrollFactor(0)
      .setDepth(22);
    this.tweens.add({
      targets: label,
      y: 40,
      alpha: 0,
      duration: 700,
      ease: "Quad.easeOut",
      onComplete: () => label.destroy(),
    });
  }

  private checkExits(): void {
    const up = this.cursors.up.isDown || this.upKey.isDown;
    for (const exit of this.exits) {
      if (!this.overlapsPlayer(exit.zone)) {
        continue;
      }
      if (exit.def.needUp && !up) {
        continue;
      }
      this.goTo(exit.def.to);
      return;
    }
  }

  private goTo(target: StageDef["exits"][number]["to"]): void {
    if (this.transitioning) {
      return;
    }
    this.transitioning = true;
    markStageCleared();
    if (target === "settle") {
      this.scene.start("settle");
      return;
    }
    this.scene.start("stage", { stageId: target });
  }

  private checkRespawn(time: number): void {
    if (this.stage.respawnMs <= 0 || this.stage.enemies.length === 0) {
      return;
    }
    const alive = this.enemies.some((enemy) => enemy.active && !enemy.isDying);
    if (alive) {
      this.respawnAt = -1;
      return;
    }
    if (this.respawnAt < 0) {
      this.respawnAt = time + this.stage.respawnMs;
      return;
    }
    if (time >= this.respawnAt) {
      this.spawnEnemies();
    }
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
    return hitboxTouches(hit, {
      x: target.x,
      y: target.y,
      width: target.displayWidth,
      height: target.displayHeight,
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
