import Phaser from "phaser";
import {
  PLAYER_DRAW_ORDER,
  PLAYER_PARTS,
  artBoneLength,
  boneAngle,
  distance,
  type PlayerPartDef,
  type PlayerPartId,
} from "../art/playerParts";
import type { PlayerViewState } from "./PlayerController";

export interface Point {
  x: number;
  y: number;
}

export interface Joints {
  head: Point & { r: number };
  shoulderL: Point;
  shoulderR: Point;
  elbowL: Point;
  elbowR: Point;
  fistL: Point;
  fistR: Point;
  chest: Point;
  pelvis: Point;
  kneeL: Point;
  kneeR: Point;
  footL: Point;
  footR: Point;
}

/** Body paint scale from the torso bone; limbs keep body thickness but stretch to joint length. */
const BODY_SCALE = 0.128;
const LIMB_THICKNESS = BODY_SCALE * 0.7;
const TIP_SCALE = BODY_SCALE * 0.78;
/** Floor for limb length so guard-pose bones still read as connected meat. */
const MIN_LIMB_LENGTH = BODY_SCALE * 0.42;

export function buildJoints(view: PlayerViewState): Joints {
  if (view.pose === "crouch" || view.pose === "sweep") {
    return crouchPose(view);
  }
  if (view.pose === "hit") {
    return hitPose();
  }

  const joints = guardPose(view.breath);
  if (view.pose === "run") {
    applyRun(joints, view.cycle);
  } else if (view.pose === "jump") {
    applyTuck(joints);
  } else if (view.pose === "fall") {
    applyFall(joints);
  } else if (view.pose === "jab") {
    applyJab(joints, view.attackAmount);
  } else if (view.pose === "hook") {
    applyHook(joints, view.attackAmount);
  } else if (view.pose === "kick") {
    applyKick(joints, view.attackAmount);
  }
  return joints;
}

export class PlayerRenderer {
  private readonly root: Phaser.GameObjects.Container;
  private readonly fx: Phaser.GameObjects.Graphics;
  private readonly debug: Phaser.GameObjects.Graphics;
  private readonly sprites: Record<PlayerPartId, Phaser.GameObjects.Image>;

  constructor(scene: Phaser.Scene) {
    this.fx = scene.add.graphics();
    this.sprites = {} as Record<PlayerPartId, Phaser.GameObjects.Image>;
    const layers: Phaser.GameObjects.GameObject[] = [this.fx];
    for (const id of PLAYER_DRAW_ORDER) {
      const def = PLAYER_PARTS[id];
      const sprite = scene.add.image(0, 0, def.key);
      sprite.setOrigin(def.pivot.x / def.width, def.pivot.y / def.height);
      this.sprites[id] = sprite;
      layers.push(sprite);
    }
    this.root = scene.add.container(0, 0, layers);
    this.root.setDepth(5);
    this.debug = scene.add.graphics();
    this.debug.setDepth(6);
  }

  sync(view: PlayerViewState): void {
    this.root.setPosition(view.x, view.y);
    this.root.setScale(view.facing, 1);
    this.root.setAlpha(view.flicker ? 0.35 : 1);
    const joints = buildJoints(view);
    this.layout(joints);
    this.drawFx(joints, view);
    this.drawDebug(view);
  }

  private layout(joints: Joints): void {
    const hips = {
      left: { x: joints.pelvis.x - 7, y: joints.pelvis.y + 4 },
      right: { x: joints.pelvis.x + 7, y: joints.pelvis.y + 4 },
    };

    // Legs first (behind).
    this.stretch(PLAYER_PARTS.thighR, hips.right, joints.kneeR);
    this.stretch(PLAYER_PARTS.shinR, joints.kneeR, joints.footR);
    this.tip(PLAYER_PARTS.footR, joints.footR, joints.kneeR, joints.footR);

    this.stretch(PLAYER_PARTS.thighL, hips.left, joints.kneeL);
    this.stretch(PLAYER_PARTS.shinL, joints.kneeL, joints.footL);
    this.tip(PLAYER_PARTS.footL, joints.footL, joints.kneeL, joints.footL);

    // Core — shared scale; seat head slightly into the collar so the neck seam overlaps.
    this.place(PLAYER_PARTS.pelvis, joints.pelvis, 0, BODY_SCALE * 0.82);
    this.place(
      PLAYER_PARTS.torso,
      joints.pelvis,
      boneAngle(joints.pelvis, joints.chest, "up"),
      BODY_SCALE,
    );

    const collar = pointAlong(
      joints.pelvis,
      joints.chest,
      artBoneLength(PLAYER_PARTS.torso) * BODY_SCALE * 0.9,
    );
    this.place(
      PLAYER_PARTS.head,
      collar,
      boneAngle(collar, { x: collar.x + (joints.head.x - joints.chest.x) * 0.35, y: collar.y - 18 }, "up"),
      BODY_SCALE,
    );

    // Arms last (in front). Thickness stays readable; length follows the strike.
    this.stretch(PLAYER_PARTS.upperArmR, joints.shoulderR, joints.elbowR);
    this.stretch(PLAYER_PARTS.forearmR, joints.elbowR, joints.fistR);
    this.tip(PLAYER_PARTS.fistR, joints.fistR, joints.elbowR, joints.fistR);

    this.stretch(PLAYER_PARTS.upperArmL, joints.shoulderL, joints.elbowL);
    this.stretch(PLAYER_PARTS.forearmL, joints.elbowL, joints.fistL);
    this.tip(PLAYER_PARTS.fistL, joints.fistL, joints.elbowL, joints.fistL);
  }

  private stretch(def: PlayerPartDef, from: Point, to: Point): void {
    const span = Math.max(distance(from, to), 6);
    const lengthScale = Math.max(MIN_LIMB_LENGTH, span / artBoneLength(def));
    const sprite = this.sprites[def.id];
    sprite.setPosition(from.x, from.y);
    sprite.setRotation(boneAngle(from, to, def.axis));
    // Local Y is the bone axis in art; keep fighters thick even on short guard bones.
    sprite.setScale(LIMB_THICKNESS, lengthScale);
  }

  private tip(def: PlayerPartDef, at: Point, from: Point, to: Point): void {
    const sprite = this.sprites[def.id];
    sprite.setPosition(at.x, at.y);
    sprite.setRotation(boneAngle(from, to, def.axis));
    sprite.setScale(TIP_SCALE);
  }

  private place(def: PlayerPartDef, at: Point, rotation: number, scale: number): void {
    const sprite = this.sprites[def.id];
    sprite.setPosition(at.x, at.y);
    sprite.setRotation(rotation);
    sprite.setScale(scale);
  }

  private drawFx(joints: Joints, view: PlayerViewState): void {
    const g = this.fx;
    g.clear();
    if (view.pose !== "hook" || view.attackPhase !== "active") {
      return;
    }
    g.lineStyle(7, 0xffffff, 0.28);
    g.beginPath();
    g.arc(joints.shoulderR.x, joints.shoulderR.y + 6, 32, 1.15, -0.7, true);
    g.strokePath();
    g.lineStyle(3, 0xffffff, 0.9);
    g.beginPath();
    g.arc(joints.shoulderR.x, joints.shoulderR.y + 6, 26, 1.05, -0.55, true);
    g.strokePath();
  }

  private drawDebug(view: PlayerViewState): void {
    const g = this.debug;
    g.clear();
    if (!view.showHitboxes) {
      return;
    }

    const box = view.hurtbox;
    g.fillStyle(0x3c8dff, 0.28);
    g.fillRect(view.x - box.width / 2, view.y - box.height / 2, box.width, box.height);
    g.lineStyle(1, 0x8ec2ff, 0.85);
    g.strokeRect(view.x - box.width / 2, view.y - box.height / 2, box.width, box.height);

    if (!view.hitbox) {
      return;
    }
    const hit = view.hitbox;
    g.fillStyle(0xff2a2a, 0.4);
    g.fillRect(hit.x - hit.width / 2, hit.y - hit.height / 2, hit.width, hit.height);
  }
}

function guardPose(breath: number): Joints {
  const lift = breath * 1.5;
  return {
    head: { x: 0, y: -50 + lift, r: 13 },
    shoulderL: { x: -12, y: -30 + lift },
    shoulderR: { x: 12, y: -28 + lift },
    elbowL: { x: -16, y: -10 },
    elbowR: { x: 16, y: -6 },
    fistL: { x: -6, y: -18 },
    fistR: { x: 8, y: -14 },
    chest: { x: 0, y: -18 + lift * 0.5 },
    pelvis: { x: 0, y: 18 },
    kneeL: { x: -8, y: 40 },
    kneeR: { x: 8, y: 40 },
    footL: { x: -9, y: 58 },
    footR: { x: 10, y: 58 },
  };
}

function crouchPose(view: PlayerViewState): Joints {
  const joints: Joints = {
    head: { x: 2, y: -20, r: 12 },
    shoulderL: { x: -12, y: -6 },
    shoulderR: { x: 12, y: -4 },
    elbowL: { x: -16, y: -16 },
    elbowR: { x: 16, y: -14 },
    fistL: { x: -6, y: -22 },
    fistR: { x: 8, y: -20 },
    chest: { x: 2, y: 2 },
    pelvis: { x: 0, y: 14 },
    kneeL: { x: -16, y: 18 },
    kneeR: { x: 18, y: 20 },
    footL: { x: -16, y: 30 },
    footR: { x: 14, y: 30 },
  };
  if (view.pose === "sweep") {
    const t = view.attackAmount;
    joints.kneeR = mix(joints.kneeR, { x: 28, y: 24 }, t);
    joints.footR = mix(joints.footR, { x: 50, y: 30 }, t);
    joints.kneeL = mix(joints.kneeL, { x: -18, y: 22 }, t);
    joints.chest.x = -8 * t;
    joints.head.x = -3 * t;
    joints.pelvis.x = -4 * t;
    joints.fistL = mix(joints.fistL, { x: -14, y: -18 }, t);
    joints.fistR = mix(joints.fistR, { x: -2, y: -16 }, t);
  }
  return joints;
}

function hitPose(): Joints {
  return {
    head: { x: -14, y: -46, r: 13 },
    shoulderL: { x: -16, y: -24 },
    shoulderR: { x: -6, y: -22 },
    elbowL: { x: -24, y: -8 },
    elbowR: { x: -18, y: -2 },
    fistL: { x: -20, y: 4 },
    fistR: { x: -12, y: 8 },
    chest: { x: -10, y: -8 },
    pelvis: { x: 2, y: 18 },
    kneeL: { x: -6, y: 40 },
    kneeR: { x: 12, y: 38 },
    footL: { x: -4, y: 58 },
    footR: { x: 14, y: 56 },
  };
}

function applyRun(joints: Joints, cycle: number): void {
  const swing = Math.sin(cycle);
  joints.chest.x += 7;
  joints.shoulderL.x += 8;
  joints.shoulderR.x += 8;
  joints.head.x += 6;
  joints.elbowL.x += -swing * 12;
  joints.elbowR.x += swing * 12;
  joints.fistL.y += swing * 10;
  joints.fistR.y += -swing * 10;
  joints.kneeL.y += swing * 8;
  joints.kneeR.y -= swing * 8;
  joints.footL.x += swing * 10;
  joints.footR.x -= swing * 10;
}

function applyTuck(joints: Joints): void {
  joints.kneeL = { x: -10, y: 4 };
  joints.kneeR = { x: 12, y: 2 };
  joints.footL = { x: -16, y: -8 };
  joints.footR = { x: 18, y: -6 };
  joints.elbowL.y -= 6;
  joints.elbowR.y -= 6;
}

function applyFall(joints: Joints): void {
  joints.kneeL = { x: -7, y: 34 };
  joints.kneeR = { x: 8, y: 36 };
  joints.footL = { x: -6, y: 62 };
  joints.footR = { x: 8, y: 62 };
  joints.elbowL = { x: -20, y: -20 };
  joints.elbowR = { x: 20, y: -18 };
  joints.fistL = { x: -16, y: -34 };
  joints.fistR = { x: 16, y: -32 };
}

function applyJab(joints: Joints, amount: number): void {
  joints.fistL = mix(joints.fistL, { x: 42, y: -14 }, amount);
  joints.elbowL = mix(joints.elbowL, { x: 22, y: -14 }, amount);
  joints.shoulderL = mix(joints.shoulderL, { x: 2, y: -24 }, amount * 0.7);
  joints.chest.x += 8 * amount;
  joints.head.x += 3 * amount;
  joints.pelvis.x += 5 * amount;
  joints.shoulderR.x -= 4 * amount;
  joints.elbowR = mix(joints.elbowR, { x: 8, y: -2 }, amount);
  joints.fistR = mix(joints.fistR, { x: -2, y: -8 }, amount);
  joints.kneeL.x += 4 * amount;
  joints.footR.x -= 3 * amount;
}

function applyHook(joints: Joints, amount: number): void {
  const angle = 1.15 - amount * 1.9;
  const reach = 16 + amount * 20;
  joints.elbowR = mix(joints.elbowR, { x: 16, y: -20 }, amount);
  joints.fistR = {
    x: 8 + Math.cos(angle) * reach,
    y: -6 + Math.sin(angle) * reach,
  };
  joints.shoulderR.y -= 6 * amount;
  joints.chest.x += 7 * amount;
  joints.chest.y -= 4 * amount;
  joints.head.x += 2 * amount;
  joints.pelvis.x += 6 * amount;
  joints.fistL = mix(joints.fistL, { x: -16, y: -10 }, amount * 0.8);
  joints.elbowL.x -= 4 * amount;
  joints.kneeR.x += 3 * amount;
  joints.footL.x -= 2 * amount;
}

function applyKick(joints: Joints, amount: number): void {
  const chamberKnee = { x: 18, y: 2 };
  const chamberFoot = { x: 14, y: -10 };
  const kickKnee = { x: 30, y: -4 };
  const kickFoot = { x: 58, y: -8 };
  const chamber = amount < 0.2 ? amount / 0.2 : 1;
  const strike = amount < 0.2 ? 0 : (amount - 0.2) / 0.8;
  const weight = Math.max(chamber, strike);
  joints.kneeR = mix(joints.kneeR, mix(chamberKnee, kickKnee, strike), weight);
  joints.footR = mix(joints.footR, mix(chamberFoot, kickFoot, strike), weight);
  joints.chest.x -= 8 * strike;
  joints.head.x -= 3 * strike;
  joints.pelvis.x -= 3 * strike;
  joints.shoulderL.x -= 6 * strike;
  joints.shoulderR.x -= 2 * strike;
  joints.elbowL = mix(joints.elbowL, { x: -24, y: -16 }, strike);
  joints.fistL = mix(joints.fistL, { x: -20, y: -24 }, strike);
  joints.kneeL.y -= 8 * strike;
  joints.footL.x -= 2 * strike;
}

function mix(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function pointAlong(from: Point, to: Point, length: number): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy) || 1;
  return {
    x: from.x + (dx / dist) * length,
    y: from.y + (dy / dist) * length,
  };
}
