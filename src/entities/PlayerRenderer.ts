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
import {
  MALE_RIG,
  activeRig,
  hipJoint,
  standJoints,
  type Joints,
  type Point,
} from "../data/BodyRig";
import type { PlayerViewState } from "./PlayerController";

export type { Joints, Point };

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
    // Shins/feet first. Thighs come from the pelvis art, so skip separate thigh sheets
    // to avoid a double-leg seam through the middle of the silhouette.
    this.sprites.thighR.setVisible(false);
    this.sprites.thighL.setVisible(false);
    this.stretch(PLAYER_PARTS.shinR, joints.kneeR, joints.footR);
    this.tip(PLAYER_PARTS.footR, joints.footR, joints.kneeR, joints.footR);
    this.stretch(PLAYER_PARTS.shinL, joints.kneeL, joints.footL);
    this.tip(PLAYER_PARTS.footL, joints.footL, joints.kneeL, joints.footL);

    // Core — shared scale; seat head slightly into the collar so the neck seam overlaps.
    this.place(PLAYER_PARTS.pelvis, joints.pelvis, 0, BODY_SCALE * 0.9);
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

    // Skeleton overlay so anatomy tuning is visible in-game (H toggles with hitboxes).
    const joints = buildJoints(view);
    g.lineStyle(2, 0x7dffb2, 0.85);
    const links: [Point, Point][] = [
      [joints.shoulderL, joints.elbowL],
      [joints.elbowL, joints.fistL],
      [joints.shoulderR, joints.elbowR],
      [joints.elbowR, joints.fistR],
      [joints.shoulderL, joints.shoulderR],
      [joints.chest, joints.pelvis],
      [hipJoint(activeRig(), "left"), joints.kneeL],
      [joints.kneeL, joints.footL],
      [hipJoint(activeRig(), "right"), joints.kneeR],
      [joints.kneeR, joints.footR],
    ];
    for (const [a, b] of links) {
      g.beginPath();
      g.moveTo(view.x + a.x * view.facing, view.y + a.y);
      g.lineTo(view.x + b.x * view.facing, view.y + b.y);
      g.strokePath();
    }
    for (const p of [
      joints.head,
      joints.shoulderL,
      joints.shoulderR,
      joints.elbowL,
      joints.elbowR,
      joints.fistL,
      joints.fistR,
      joints.chest,
      joints.pelvis,
      joints.kneeL,
      joints.kneeR,
      joints.footL,
      joints.footR,
    ]) {
      g.fillStyle(0xfff36a, 0.95);
      g.fillCircle(view.x + p.x * view.facing, view.y + p.y, 2.4);
    }

    if (!view.hitbox) {
      return;
    }
    const hit = view.hitbox;
    g.fillStyle(0xff2a2a, 0.4);
    g.fillRect(hit.x - hit.width / 2, hit.y - hit.height / 2, hit.width, hit.height);
  }
}

function guardPose(breath: number): Joints {
  return standJoints(activeRig(), breath);
}

function crouchPose(view: PlayerViewState): Joints {
  const rig = activeRig();
  const joints: Joints = {
    head: { x: 2, y: -22, r: rig.headR - 1 },
    shoulderL: { x: -rig.shoulderHalf + 2, y: -8 },
    shoulderR: { x: rig.shoulderHalf - 1, y: -6 },
    elbowL: { x: -rig.shoulderHalf - 2, y: -18 },
    elbowR: { x: rig.shoulderHalf + 2, y: -16 },
    fistL: { x: -4, y: -24 },
    fistR: { x: 10, y: -22 },
    chest: { x: 2, y: 0 },
    pelvis: { x: 0, y: 18 },
    kneeL: { x: -rig.hipHalf - 2, y: 22 },
    kneeR: { x: rig.hipHalf + 4, y: 24 },
    footL: { x: -rig.stanceHalf - 2, y: 30 },
    footR: { x: rig.stanceHalf + 2, y: 30 },
  };
  if (view.pose === "sweep") {
    const t = view.attackAmount;
    joints.kneeR = mix(joints.kneeR, { x: 30, y: 24 }, t);
    joints.footR = mix(joints.footR, { x: 52, y: 30 }, t);
    joints.kneeL = mix(joints.kneeL, { x: -rig.hipHalf - 4, y: 24 }, t);
    joints.chest.x = -8 * t;
    joints.head.x = -3 * t;
    joints.pelvis.x = -4 * t;
    joints.fistL = mix(joints.fistL, { x: -14, y: -18 }, t);
    joints.fistR = mix(joints.fistR, { x: -2, y: -16 }, t);
  }
  return joints;
}

function hitPose(): Joints {
  const base = standJoints(MALE_RIG);
  return {
    ...base,
    head: { x: -12, y: base.head.y + 2, r: base.head.r },
    shoulderL: { x: base.shoulderL.x - 4, y: base.shoulderL.y + 4 },
    shoulderR: { x: base.shoulderR.x - 10, y: base.shoulderR.y + 4 },
    elbowL: { x: base.elbowL.x - 8, y: base.elbowL.y + 8 },
    elbowR: { x: base.elbowR.x - 14, y: base.elbowR.y + 10 },
    fistL: { x: -18, y: 2 },
    fistR: { x: -10, y: 6 },
    chest: { x: -8, y: base.chest.y + 4 },
    pelvis: { x: 3, y: base.pelvis.y },
  };
}

/**
 * Casual stroll from `reference/螢幕錄影 2026-11-13 17.33.52.mp4`:
 * upright torso (~0–3° lean), opposite arm/leg, bob peaks at passing,
 * heel-ish contact with a modest passing lift — not a fighting dash.
 */
function applyRun(joints: Joints, cycle: number): void {
  const rig = activeRig();
  const phase = cycle * 0.82;
  const swing = Math.sin(phase);
  const pass = Math.cos(phase);
  const bob = (1 - Math.abs(swing)) * 3.2;

  // Drop the combat guard into a relaxed walk arm set, then swing.
  joints.head.x += 0.5;
  joints.chest.x += 1;
  joints.pelvis.x += 0.5;
  joints.head.y -= bob;
  joints.chest.y -= bob * 0.85;
  joints.shoulderL.y -= bob * 0.85;
  joints.shoulderR.y -= bob * 0.85;
  joints.pelvis.y -= bob * 0.75;

  const hipL = hipJoint(rig, "left");
  const hipR = hipJoint(rig, "right");
  hipL.y = joints.pelvis.y + 3;
  hipR.y = joints.pelvis.y + 3;

  const stride = 15;
  const stepLift = 7;
  joints.footL = {
    x: swing * stride,
    y: rig.footY - Math.max(0, pass) * stepLift,
  };
  joints.footR = {
    x: -swing * stride,
    y: rig.footY - Math.max(0, -pass) * stepLift,
  };

  const bendL = Math.max(0, pass) * 10;
  const bendR = Math.max(0, -pass) * 10;
  joints.kneeL = {
    x: hipL.x * 0.35 + joints.footL.x * 0.65,
    y: (hipL.y + joints.footL.y) * 0.5 - bendL,
  };
  joints.kneeR = {
    x: hipR.x * 0.35 + joints.footR.x * 0.65,
    y: (hipR.y + joints.footR.y) * 0.5 - bendR,
  };

  // Arms opposite the legs, amp ~±30°, elbows keep a soft bend.
  const arm = 12;
  joints.elbowL = {
    x: joints.shoulderL.x - 2 - swing * 4,
    y: joints.shoulderL.y + 13 + Math.abs(swing) * 2,
  };
  joints.elbowR = {
    x: joints.shoulderR.x + 2 + swing * 4,
    y: joints.shoulderR.y + 13 + Math.abs(swing) * 2,
  };
  joints.fistL = {
    x: joints.elbowL.x - swing * arm,
    y: joints.elbowL.y + 11 - Math.abs(swing) * 2,
  };
  joints.fistR = {
    x: joints.elbowR.x + swing * arm,
    y: joints.elbowR.y + 11 - Math.abs(swing) * 2,
  };
}

function applyTuck(joints: Joints): void {
  joints.kneeL = { x: -12, y: 6 };
  joints.kneeR = { x: 14, y: 4 };
  joints.footL = { x: -18, y: -6 };
  joints.footR = { x: 20, y: -4 };
  joints.elbowL.y -= 8;
  joints.elbowR.y -= 8;
}

function applyFall(joints: Joints): void {
  const rig = activeRig();
  joints.kneeL = { x: -rig.stanceHalf, y: rig.kneeY - 4 };
  joints.kneeR = { x: rig.stanceHalf, y: rig.kneeY - 2 };
  joints.footL = { x: -rig.stanceHalf + 1, y: Math.min(62, rig.footY + 2) };
  joints.footR = { x: rig.stanceHalf, y: Math.min(62, rig.footY + 2) };
  joints.elbowL = { x: joints.shoulderL.x - 6, y: joints.shoulderL.y - 8 };
  joints.elbowR = { x: joints.shoulderR.x + 6, y: joints.shoulderR.y - 6 };
  joints.fistL = { x: joints.elbowL.x - 2, y: joints.elbowL.y - 14 };
  joints.fistR = { x: joints.elbowR.x + 2, y: joints.elbowR.y - 12 };
}

function applyJab(joints: Joints, amount: number): void {
  // Lead with character-left (far) fist; torso rotates into the punch (male V still reads).
  joints.fistL = mix(joints.fistL, { x: 48, y: -16 }, amount);
  joints.elbowL = mix(joints.elbowL, { x: 26, y: -16 }, amount);
  joints.shoulderL = mix(joints.shoulderL, { x: 4, y: joints.shoulderL.y + 4 }, amount * 0.75);
  joints.chest.x += 9 * amount;
  joints.head.x += 3 * amount;
  joints.pelvis.x += 4 * amount;
  joints.shoulderR.x -= 5 * amount;
  joints.elbowR = mix(joints.elbowR, { x: joints.shoulderR.x - 2, y: joints.chest.y + 8 }, amount);
  joints.fistR = mix(joints.fistR, { x: -4, y: joints.chest.y + 2 }, amount);
  joints.kneeL.x += 4 * amount;
  joints.footR.x -= 3 * amount;
}

function applyHook(joints: Joints, amount: number): void {
  const angle = 1.15 - amount * 1.9;
  const reach = 18 + amount * 22;
  joints.elbowR = mix(joints.elbowR, { x: 18, y: -22 }, amount);
  joints.fistR = {
    x: 10 + Math.cos(angle) * reach,
    y: -8 + Math.sin(angle) * reach,
  };
  joints.shoulderR.y -= 7 * amount;
  joints.chest.x += 8 * amount;
  joints.chest.y -= 4 * amount;
  joints.head.x += 2 * amount;
  joints.pelvis.x += 5 * amount;
  joints.fistL = mix(joints.fistL, { x: -16, y: -12 }, amount * 0.8);
  joints.elbowL.x -= 5 * amount;
  joints.kneeR.x += 3 * amount;
  joints.footL.x -= 2 * amount;
}

function applyKick(joints: Joints, amount: number): void {
  const chamberKnee = { x: 20, y: 4 };
  const chamberFoot = { x: 16, y: -8 };
  const kickKnee = { x: 34, y: -2 };
  const kickFoot = { x: 62, y: -6 };
  const chamber = amount < 0.2 ? amount / 0.2 : 1;
  const strike = amount < 0.2 ? 0 : (amount - 0.2) / 0.8;
  const weight = Math.max(chamber, strike);
  joints.kneeR = mix(joints.kneeR, mix(chamberKnee, kickKnee, strike), weight);
  joints.footR = mix(joints.footR, mix(chamberFoot, kickFoot, strike), weight);
  joints.chest.x -= 9 * strike;
  joints.head.x -= 3 * strike;
  joints.pelvis.x -= 4 * strike;
  joints.shoulderL.x -= 6 * strike;
  joints.shoulderR.x -= 2 * strike;
  joints.elbowL = mix(joints.elbowL, { x: -26, y: -18 }, strike);
  joints.fistL = mix(joints.fistL, { x: -22, y: -26 }, strike);
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
