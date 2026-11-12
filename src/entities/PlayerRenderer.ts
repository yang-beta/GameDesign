import Phaser from "phaser";
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

const GI = 0x2457c2;
const GI_LIGHT = 0x4d82ee;
const OUTLINE = 0x101820;
const SKIN = 0xf0c3a0;
const SKIN_SHADE = 0xd59a70;

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
  private readonly puppet: Phaser.GameObjects.Graphics;
  private readonly debug: Phaser.GameObjects.Graphics;
  private readonly root: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.puppet = scene.add.graphics();
    this.root = scene.add.container(0, 0, [this.puppet]);
    this.root.setDepth(5);
    this.debug = scene.add.graphics();
    this.debug.setDepth(6);
  }

  sync(view: PlayerViewState): void {
    this.root.setPosition(view.x, view.y);
    this.root.setScale(view.facing, 1);
    this.root.setAlpha(view.flicker ? 0.35 : 1);
    this.drawPuppet(buildJoints(view), view);
    this.drawDebug(view);
  }

  private drawPuppet(joints: Joints, view: PlayerViewState): void {
    const g = this.puppet;
    g.clear();

    if (view.pose === "hook" && view.attackPhase === "active") {
      g.lineStyle(7, 0xffffff, 0.28);
      g.beginPath();
      g.arc(joints.shoulderR.x, joints.shoulderR.y + 6, 32, 1.15, -0.7, true);
      g.strokePath();
      g.lineStyle(3, 0xffffff, 0.9);
      g.beginPath();
      g.arc(joints.shoulderR.x, joints.shoulderR.y + 6, 26, 1.05, -0.55, true);
      g.strokePath();
    }

    const hips = {
      left: { x: joints.pelvis.x - 8, y: joints.pelvis.y + 2 },
      right: { x: joints.pelvis.x + 8, y: joints.pelvis.y + 2 },
    };

    limb(g, hips.right, joints.kneeR, 16, OUTLINE);
    limb(g, joints.kneeR, joints.footR, 13, OUTLINE);
    limb(g, hips.right, joints.kneeR, 11, GI);
    limb(g, joints.kneeR, joints.footR, 8, GI_LIGHT);
    limb(g, hips.left, joints.kneeL, 16, OUTLINE);
    limb(g, joints.kneeL, joints.footL, 13, OUTLINE);
    limb(g, hips.left, joints.kneeL, 11, GI);
    limb(g, joints.kneeL, joints.footL, 8, GI_LIGHT);

    limb(g, joints.shoulderR, joints.elbowR, 12, OUTLINE);
    limb(g, joints.elbowR, joints.fistR, 10, OUTLINE);
    limb(g, joints.shoulderR, joints.elbowR, 8, GI);
    limb(g, joints.elbowR, joints.fistR, 7, GI_LIGHT);

    const torsoY = (joints.chest.y + joints.pelvis.y) / 2;
    g.fillStyle(OUTLINE, 1);
    g.fillEllipse(joints.chest.x, torsoY, 34, 56);
    g.fillStyle(GI, 1);
    g.fillEllipse(joints.chest.x, torsoY, 28, 48);
    g.fillStyle(GI_LIGHT, 1);
    g.fillEllipse(joints.chest.x + 4, joints.chest.y + 6, 12, 20);

    dot(g, joints.pelvis, 9, GI, OUTLINE);
    dot(g, joints.shoulderL, 7, GI_LIGHT, OUTLINE);
    dot(g, joints.shoulderR, 7, GI_LIGHT, OUTLINE);

    limb(g, joints.shoulderL, joints.elbowL, 12, OUTLINE);
    limb(g, joints.elbowL, joints.fistL, 10, OUTLINE);
    limb(g, joints.shoulderL, joints.elbowL, 8, GI);
    limb(g, joints.elbowL, joints.fistL, 7, GI_LIGHT);

    g.fillStyle(OUTLINE, 1);
    g.fillCircle(joints.head.x, joints.head.y, joints.head.r + 2);
    g.fillStyle(SKIN, 1);
    g.fillCircle(joints.head.x, joints.head.y, joints.head.r);
    g.fillStyle(SKIN_SHADE, 1);
    g.fillEllipse(joints.head.x + 4, joints.head.y + 2, joints.head.r, joints.head.r * 0.85);
    g.fillStyle(0x1b2433, 1);
    g.fillCircle(joints.head.x + joints.head.r * 0.35, joints.head.y - 1, 1.6);

    fist(g, joints.fistR);
    fist(g, joints.fistL);
    footCap(g, joints.footL);
    footCap(g, joints.footR);
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
    shoulderL: { x: -14, y: -28 + lift },
    shoulderR: { x: 12, y: -26 + lift },
    elbowL: { x: -18, y: -8 },
    elbowR: { x: 18, y: -4 },
    fistL: { x: -8, y: -16 },
    fistR: { x: 10, y: -12 },
    chest: { x: 0, y: -16 + lift * 0.5 },
    pelvis: { x: 0, y: 16 },
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
  const extendKnee = { x: 30, y: -4 };
  const extendFoot = { x: 58, y: -8 };
  const chamber = amount < 0.2 ? amount / 0.2 : 1;
  const strike = amount < 0.2 ? 0 : (amount - 0.2) / 0.8;
  const weight = Math.max(chamber, strike);
  joints.kneeR = mix(joints.kneeR, mix(chamberKnee, extendKnee, strike), weight);
  joints.footR = mix(joints.footR, mix(chamberFoot, extendFoot, strike), weight);
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

function limb(
  g: Phaser.GameObjects.Graphics,
  from: Point,
  to: Point,
  width: number,
  color: number,
): void {
  g.lineStyle(width, color, 1);
  g.beginPath();
  g.moveTo(from.x, from.y);
  g.lineTo(to.x, to.y);
  g.strokePath();
  g.fillStyle(color, 1);
  g.fillCircle(from.x, from.y, width * 0.42);
  g.fillCircle(to.x, to.y, width * 0.42);
}

function dot(
  g: Phaser.GameObjects.Graphics,
  point: Point,
  radius: number,
  fill: number,
  line: number,
): void {
  g.fillStyle(line, 1);
  g.fillCircle(point.x, point.y, radius + 2);
  g.fillStyle(fill, 1);
  g.fillCircle(point.x, point.y, radius);
}

function fist(g: Phaser.GameObjects.Graphics, point: Point): void {
  g.fillStyle(OUTLINE, 1);
  g.fillCircle(point.x, point.y, 7);
  g.fillStyle(SKIN, 1);
  g.fillCircle(point.x, point.y, 5.5);
  g.fillStyle(0xf7f7f7, 1);
  g.fillRect(point.x - 4, point.y - 1.5, 8, 3);
}

function footCap(g: Phaser.GameObjects.Graphics, point: Point): void {
  g.fillStyle(OUTLINE, 1);
  g.fillEllipse(point.x + 4, point.y + 2, 16, 8);
  g.fillStyle(0x18283f, 1);
  g.fillEllipse(point.x + 4, point.y + 1, 12, 5);
}
