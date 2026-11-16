import Phaser from "phaser";
import { STAGE_HAZARDS, STAGE_SECRETS, TOXIC_DAMAGE, type HazardDef } from "../data/Interactables";
import { type StageDef, type StageId, stageById } from "../data/StageData";
import { toRect } from "../data/MapData";
import { HitSpark } from "../effects/HitSpark";
import { Bullet } from "../entities/Bullet";
import { Chest } from "../entities/Chest";
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
import { SecretWall } from "../entities/SecretWall";
import {
  applyDamage,
  collectItem,
  markStageCleared,
  resetRun,
} from "../state/RunState";
import { GameHud } from "../ui/GameHud";

interface StageSceneData {
  stageId?: StageId;
}

const PLAYER_HURT_COOLDOWN_MS = 700;

export class StageScene extends Phaser.Scene {
  private stage!: StageDef;
  private player!: PlayerController;
  private puppet!: PlayerRenderer;
  private sparks!: HitSpark;
  private hud!: GameHud;
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private hazards: { def: HazardDef; zone: Phaser.GameObjects.Rectangle }[] = [];
  private secret: SecretWall | null = null;
  private chest: Chest | null = null;
  private exits: { zone: Phaser.GameObjects.Rectangle; def: StageDef["exits"][number] }[] = [];
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
  private wasAirborne = false;

  constructor() {
    super("stage");
  }

  init(data: StageSceneData): void {
    this.stage = stageById(data.stageId ?? "A");
    this.enemies = [];
    this.bullets = [];
    this.hazards = [];
    this.secret = null;
    this.chest = null;
    this.exits = [];
    this.surfaces = [];
    this.dropping = null;
    this.crouchAnchor = null;
    this.simTime = 0;
    this.hitstopUntil = 0;
    this.hurtUntil = 0;
    this.respawnAt = -1;
    this.transitioning = false;
    this.wasAirborne = false;
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

    this.createHazards();
    this.createSecret();
    this.spawnEnemies();
    this.createExits();
    this.cameras.main.startFollow(this.player.bodyObject, true, 0.16, 0.16);
    this.bindInput();
    this.hud = new GameHud(this);
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
      this.checkHazards(time);
      this.checkChest();
      this.checkExits();
      this.checkRespawn(time);
    }

    this.puppet.sync(this.player.getViewState());
    this.resolveAttackHits();
    this.sparks.update(delta);
    this.updateHudStatus(time);
  }

  private createHazards(): void {
    const list = STAGE_HAZARDS[this.stage.id] ?? [];
    for (const def of list) {
      const zone = this.add
        .rectangle(def.x, def.y, def.width, def.height, def.color, 0.72)
        .setStrokeStyle(2, 0xd6ff7a, 0.85)
        .setDepth(2);
      // Hatch stripes as temporary "toxic material" cue.
      const hatch = this.add.graphics().setDepth(2);
      hatch.lineStyle(2, 0x204010, 0.35);
      const left = def.x - def.width / 2;
      const top = def.y - def.height / 2;
      for (let x = left; x < left + def.width; x += 10) {
        hatch.lineBetween(x, top + def.height, x + 8, top);
      }
      this.hazards.push({ def, zone });
    }
  }

  private createSecret(): void {
    const def = STAGE_SECRETS[this.stage.id];
    if (!def) {
      return;
    }
    this.secret = new SecretWall(this, def, this.platforms, this.surfaces);
    this.chest = new Chest(this, def.chest);
    this.chest.setVisible(false);
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

  private checkHazards(time: number): void {
    if (time < this.hurtUntil || this.player.isInHitstun(this.simTime)) {
      return;
    }
    for (const hazard of this.hazards) {
      if (this.overlapsPlayer(hazard.zone)) {
        this.hurtPlayer(hazard.def.damage || TOXIC_DAMAGE, time, 0);
        this.hud.pushEvent("踩到有毒汙染物", time);
        return;
      }
    }
  }

  private checkChest(): void {
    if (!this.chest || !this.secret?.isBroken) {
      return;
    }
    this.chest.setVisible(true);
    const got = this.chest.tryOpen(this.player.bodyObject.x, this.player.bodyObject.y);
    if (got) {
      collectItem(got);
      this.hud.pushEvent(`拿到${got}`, this.time.now, 2800);
    }
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
        this.hurtPlayer(
          enemy.contactDamage || PATROL_CONTACT_DAMAGE,
          time,
          enemy.x < this.player.bodyObject.x ? 1 : -1,
        );
        return;
      }
    }

    for (const bullet of this.bullets) {
      if (!bullet.active) {
        continue;
      }
      if (this.overlapsPlayer(bullet)) {
        const dir =
          bullet.body && "velocity" in bullet.body
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

  private hurtPlayer(amount: number, time: number, knockDir: 1 | -1 | 0): void {
    const result = applyDamage(amount);
    this.hurtUntil = time + PLAYER_HURT_COOLDOWN_MS;
    const dir = knockDir === 0 ? ((-this.player.facing) as 1 | -1) : knockDir;
    this.player.applyHurtReaction(this.simTime, dir);
    this.cameras.main.shake(100, 0.004);
    this.hud.refreshHp();
    this.hud.pushEvent("受傷", time);
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
      .text(200, 48, `-${dealt}`, {
        fontFamily: '"Microsoft JhengHei UI", "Microsoft JhengHei", "Segoe UI", sans-serif',
        fontSize: "20px",
        color: "#ff6b6b",
      })
      .setScrollFactor(0)
      .setDepth(50);
    this.tweens.add({
      targets: label,
      y: 24,
      alpha: 0,
      duration: 700,
      ease: "Quad.easeOut",
      onComplete: () => label.destroy(),
    });
  }

  private updateHudStatus(time: number): void {
    const view = this.player.getViewState();
    this.hud.setPoseStatus(view.status);
    this.hud.refreshHp();
    this.hud.tick(time);

    const airborne = view.pose === "jump" || view.pose === "fall";
    if (airborne && !this.wasAirborne) {
      this.hud.pushEvent("跳躍", time, 900);
    }
    this.wasAirborne = airborne;
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
      this.hud.pushEvent("移動到下一個場景", this.time.now, 1200);
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

    if (this.secret && !this.secret.isBroken && this.touches(hitbox, this.secret.asTarget())) {
      const landed = this.secret.takeHit(this.player.attackSerial, this.player.facing);
      if (landed) {
        this.impact(attack, this.secret.def.x, this.secret.def.y);
        if (this.secret.isBroken) {
          this.hud.pushEvent("發現隱藏密道", this.time.now, 3200);
          this.chest?.setVisible(true);
        } else {
          this.hud.pushEvent(`牆壁龜裂 ${this.secret.hitCount}/${this.secret.def.hitsRequired}`, this.time.now, 1200);
        }
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
