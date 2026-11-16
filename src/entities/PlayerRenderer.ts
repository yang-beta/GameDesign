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
  /** Finger direction in degrees (0 = +X / forward). */
  handLDeg: number;
  handRDeg: number;
  /** Toe direction in degrees. */
  footLDeg: number;
  footRDeg: number;
}

const INK = 0x141414;
const JOINT = 0x1a1a1a;
const PALM = 0x2d2d2d;
const FOOT = 0x373737;

export function buildJoints(view: PlayerViewState): Joints {
  if (
    view.pose === "crouch" ||
    view.pose === "crouchPunch" ||
    view.pose === "crouchKick"
  ) {
    return crouchPose(view);
  }
  if (view.pose === "hit") {
    return hitPose();
  }

  const joints = guardPose(view.breath);
  if (view.pose === "run") {
    applyWalk(joints, view.cycle);
  } else if (view.pose === "jump") {
    applyJump(joints, view.attackAmount > 0 ? view.attackAmount : 0.55);
  } else if (view.pose === "fall") {
    applyFall(joints);
  } else if (view.pose === "jab") {
    applyJab(joints, view.attackAmount);
  } else if (view.pose === "hook") {
    applyHook(joints, view.attackAmount);
  } else if (view.pose === "kick") {
    applyKick(joints, view.attackAmount);
  } else if (view.pose === "jumpPunch") {
    applyJump(joints, 0.7);
    applyJumpPunch(joints, view.attackAmount);
  } else if (view.pose === "tatsumaki") {
    applyTatsumaki(joints, view.attackAmount, view.cycle);
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
    this.drawStick(buildJoints(view));
    this.drawDebug(view);
  }

  private drawStick(joints: Joints): void {
    const g = this.puppet;
    g.clear();

    const hipL = { x: joints.pelvis.x - 10, y: joints.pelvis.y + 2 };
    const hipR = { x: joints.pelvis.x + 10, y: joints.pelvis.y + 2 };

    // Legs
    bone(g, hipL, joints.kneeL, 4);
    bone(g, joints.kneeL, joints.footL, 4);
    bone(g, hipR, joints.kneeR, 4);
    bone(g, joints.kneeR, joints.footR, 4);

    // Spine + width bars
    bone(g, joints.chest, joints.pelvis, 5);
    bone(g, joints.shoulderL, joints.shoulderR, 6);
    bone(g, hipL, hipR, 5);
    const neck = {
      x: (joints.shoulderL.x + joints.shoulderR.x) / 2,
      y: (joints.shoulderL.y + joints.shoulderR.y) / 2 - 4,
    };
    bone(g, neck, joints.chest, 4);

    // Arms
    bone(g, joints.shoulderL, joints.elbowL, 4);
    bone(g, joints.elbowL, joints.fistL, 4);
    bone(g, joints.shoulderR, joints.elbowR, 4);
    bone(g, joints.elbowR, joints.fistR, 4);

    // Feet polygons (toe tip = direction)
    footPoly(g, joints.footL, joints.footLDeg);
    footPoly(g, joints.footR, joints.footRDeg);

    // Hand polygons (tip = finger/knuckle direction)
    handPoly(g, joints.fistL, joints.handLDeg);
    handPoly(g, joints.fistR, joints.handRDeg);

    // Head
    g.lineStyle(3, INK, 1);
    g.strokeCircle(joints.head.x, joints.head.y, joints.head.r);
    g.fillStyle(INK, 1);
    g.fillCircle(joints.head.x + joints.head.r * 0.35, joints.head.y - 1, 2.2);

    // Joint nodes
    for (const p of [
      neck,
      joints.shoulderL,
      joints.shoulderR,
      joints.elbowL,
      joints.elbowR,
      joints.fistL,
      joints.fistR,
      joints.chest,
      joints.pelvis,
      hipL,
      hipR,
      joints.kneeL,
      joints.kneeR,
      joints.footL,
      joints.footR,
    ]) {
      node(g, p, 3.2);
    }
    node(g, joints.shoulderL, 4);
    node(g, joints.shoulderR, 4);
    node(g, hipL, 4);
    node(g, hipR, 4);
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
    shoulderL: { x: -16, y: -28 + lift },
    shoulderR: { x: 14, y: -26 + lift },
    elbowL: { x: -20, y: -6 },
    elbowR: { x: 20, y: -2 },
    fistL: { x: -6, y: -18 },
    fistR: { x: 12, y: -8 },
    chest: { x: 0, y: -16 + lift * 0.5 },
    pelvis: { x: 0, y: 16 },
    kneeL: { x: -12, y: 40 },
    kneeR: { x: 14, y: 40 },
    footL: { x: -14, y: 58 },
    footR: { x: 16, y: 58 },
    handLDeg: -55,
    handRDeg: 10,
    footLDeg: 15,
    footRDeg: 5,
  };
}

function crouchPose(view: PlayerViewState): Joints {
  const joints: Joints = {
    head: { x: 2, y: -20, r: 12 },
    shoulderL: { x: -14, y: -6 },
    shoulderR: { x: 14, y: -4 },
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
    handLDeg: -80,
    handRDeg: -70,
    footLDeg: 10,
    footRDeg: 5,
  };
  if (view.pose === "crouchPunch") {
    const t = view.attackAmount;
    joints.fistL = mix(joints.fistL, { x: 44, y: 8 }, t);
    joints.elbowL = mix(joints.elbowL, { x: 22, y: 6 }, t);
    joints.shoulderL = mix(joints.shoulderL, { x: 2, y: -2 }, t * 0.7);
    joints.chest.x += 8 * t;
    joints.head.x += 4 * t;
    joints.fistR = mix(joints.fistR, { x: -10, y: 10 }, t);
    joints.handLDeg = 5;
    joints.handRDeg = 200;
    joints.footLDeg = 8;
    joints.footRDeg = 5;
  }
  // 11 crouch kick — frames 01–06 style (low forward kick, not full sweep)
  if (view.pose === "crouchKick") {
    const t = view.attackAmount;
    joints.kneeR = mix(joints.kneeR, { x: 34, y: 22 }, t);
    joints.footR = mix(joints.footR, { x: 56, y: 30 }, t);
    joints.kneeL = mix(joints.kneeL, { x: -18, y: 22 }, t);
    joints.chest.x -= 4 * t;
    joints.head.x -= 2 * t;
    joints.pelvis.x -= 2 * t;
    joints.fistL = mix(joints.fistL, { x: -12, y: -14 }, t);
    joints.fistR = mix(joints.fistR, { x: 4, y: -12 }, t);
    joints.footRDeg = 0;
    joints.handLDeg = -40;
    joints.handRDeg = 15;
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
    handLDeg: 200,
    handRDeg: 180,
    footLDeg: 20,
    footRDeg: 10,
  };
}

/** Stick-figure walk cycle derived from action 02. */
function applyWalk(joints: Joints, cycle: number): void {
  const phase = cycle;
  const swing = Math.sin(phase);
  const liftL = Math.max(0, Math.sin(phase + Math.PI / 2)) * 10;
  const liftR = Math.max(0, Math.sin(phase + Math.PI / 2 + Math.PI)) * 10;

  joints.chest.x += 5;
  joints.shoulderL.x += 5;
  joints.shoulderR.x += 5;
  joints.head.x += 4;
  joints.pelvis.x += Math.sin(phase) * 2;

  joints.elbowL.x += -swing * 8;
  joints.elbowR.x += swing * 8;
  joints.fistL = { x: joints.elbowL.x + 10, y: joints.elbowL.y - 12 + swing * 4 };
  joints.fistR = { x: joints.elbowR.x - 6, y: joints.elbowR.y + 4 - swing * 3 };

  joints.footL.x += swing * 14;
  joints.footR.x -= swing * 14;
  joints.footL.y -= liftL;
  joints.footR.y -= liftR;
  joints.kneeL = {
    x: (joints.pelvis.x - 10 + joints.footL.x) / 2 - 4,
    y: (joints.pelvis.y + joints.footL.y) / 2 - 4,
  };
  joints.kneeR = {
    x: (joints.pelvis.x + 10 + joints.footR.x) / 2 + 4,
    y: (joints.pelvis.y + joints.footR.y) / 2 - 4,
  };

  joints.handLDeg = -50;
  joints.handRDeg = 8;
  joints.footLDeg = liftL > 3 ? 28 : 12;
  joints.footRDeg = liftR > 3 ? 22 : 5;
}

/** 06 Jump stick pose (tuck ↔ open by amount). */
function applyJump(joints: Joints, amount: number): void {
  const t = Math.max(0, Math.min(1, amount));
  joints.kneeL = mix(joints.kneeL, { x: -12, y: 8 }, 0.4 + t * 0.4);
  joints.kneeR = mix(joints.kneeR, { x: 14, y: 6 }, 0.4 + t * 0.4);
  joints.footL = mix(joints.footL, { x: -14, y: 28 }, 0.35 + t * 0.4);
  joints.footR = mix(joints.footR, { x: 16, y: 28 }, 0.35 + t * 0.4);
  joints.elbowL = mix(joints.elbowL, { x: -22, y: -18 }, t);
  joints.elbowR = mix(joints.elbowR, { x: 24, y: -16 }, t);
  joints.fistL = mix(joints.fistL, { x: -18, y: -32 }, t);
  joints.fistR = mix(joints.fistR, { x: 20, y: -30 }, t);
  joints.handLDeg = -90;
  joints.handRDeg = -90;
  joints.footLDeg = 85;
  joints.footRDeg = 85;
}

function applyJumpPunch(joints: Joints, amount: number): void {
  joints.fistL = mix(joints.fistL, { x: 48, y: -10 }, amount);
  joints.elbowL = mix(joints.elbowL, { x: 26, y: -10 }, amount);
  joints.shoulderL = mix(joints.shoulderL, { x: 4, y: -22 }, amount * 0.6);
  joints.chest.x += 6 * amount;
  joints.fistR = mix(joints.fistR, { x: -8, y: -6 }, amount);
  joints.handLDeg = 0;
  joints.handRDeg = 200;
}

function applyTatsumaki(joints: Joints, amount: number, cycle: number): void {
  const spin = cycle * 2.2;
  const extend = Math.max(0.35, amount);
  joints.chest.y -= 8;
  joints.pelvis.y -= 10;
  joints.kneeR = {
    x: Math.cos(spin) * (28 + extend * 30),
    y: -4 + Math.sin(spin) * 10,
  };
  joints.footR = {
    x: Math.cos(spin) * (52 + extend * 28),
    y: -6 + Math.sin(spin) * 14,
  };
  joints.kneeL = {
    x: Math.cos(spin + Math.PI) * 16,
    y: 18 + Math.sin(spin + Math.PI) * 8,
  };
  joints.footL = {
    x: Math.cos(spin + Math.PI) * 10,
    y: 34 + Math.sin(spin + Math.PI) * 6,
  };
  joints.elbowL = { x: -10, y: -8 };
  joints.elbowR = { x: 10, y: -8 };
  joints.fistL = { x: -6, y: 6 };
  joints.fistR = { x: 6, y: 6 };
  joints.handLDeg = 90;
  joints.handRDeg = 90;
  joints.footRDeg = (spin * 180) / Math.PI;
  joints.footLDeg = (spin * 180) / Math.PI + 180;
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
  joints.handLDeg = -90;
  joints.handRDeg = -90;
  joints.footLDeg = 90;
  joints.footRDeg = 90;
}

function applyJab(joints: Joints, amount: number): void {
  // Lead punch with near-side arm (L in local facing-right space = forward)
  joints.fistL = mix(joints.fistL, { x: 46, y: -14 }, amount);
  joints.elbowL = mix(joints.elbowL, { x: 24, y: -14 }, amount);
  joints.shoulderL = mix(joints.shoulderL, { x: 4, y: -24 }, amount * 0.7);
  joints.chest.x += 8 * amount;
  joints.head.x += 3 * amount;
  joints.pelvis.x += 5 * amount;
  joints.shoulderR.x -= 4 * amount;
  joints.elbowR = mix(joints.elbowR, { x: 8, y: -2 }, amount);
  joints.fistR = mix(joints.fistR, { x: -2, y: -8 }, amount);
  joints.kneeL.x += 4 * amount;
  joints.footR.x -= 3 * amount;
  joints.handLDeg = 0;
  joints.handRDeg = -70;
  joints.footLDeg = 0;
  joints.footRDeg = 15;
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
  joints.handRDeg = angle * (180 / Math.PI);
  joints.handLDeg = 200;
  joints.footRDeg = 0;
  joints.footLDeg = 12;
}

function applyKick(joints: Joints, amount: number): void {
  const chamberKnee = { x: 18, y: 2 };
  const chamberFoot = { x: 14, y: -10 };
  const extendKnee = { x: 34, y: -8 };
  const extendFoot = { x: 62, y: -14 };
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
  joints.footRDeg = -28;
  joints.footLDeg = 170;
  joints.handLDeg = 200;
  joints.handRDeg = -40;
}

function mix(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function bone(g: Phaser.GameObjects.Graphics, from: Point, to: Point, width: number): void {
  g.lineStyle(width, INK, 1);
  g.beginPath();
  g.moveTo(from.x, from.y);
  g.lineTo(to.x, to.y);
  g.strokePath();
}

function node(g: Phaser.GameObjects.Graphics, point: Point, radius: number): void {
  g.fillStyle(JOINT, 1);
  g.fillCircle(point.x, point.y, radius);
}

function rot(
  px: number,
  py: number,
  ox: number,
  oy: number,
  deg: number,
): { x: number; y: number } {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const x = px - ox;
  const y = py - oy;
  return { x: ox + x * c - y * s, y: oy + x * s + y * c };
}

function handPoly(g: Phaser.GameObjects.Graphics, wrist: Point, deg: number): void {
  const length = 11;
  const width = 7;
  const pts = [
    rot(wrist.x - 2, wrist.y - width / 2, wrist.x, wrist.y, deg),
    rot(wrist.x + length * 0.55, wrist.y - width / 2, wrist.x, wrist.y, deg),
    rot(wrist.x + length, wrist.y, wrist.x, wrist.y, deg),
    rot(wrist.x + length * 0.55, wrist.y + width / 2, wrist.x, wrist.y, deg),
    rot(wrist.x - 2, wrist.y + width / 2, wrist.x, wrist.y, deg),
  ];
  g.fillStyle(PALM, 1);
  g.lineStyle(1, INK, 1);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) {
    g.lineTo(pts[i].x, pts[i].y);
  }
  g.closePath();
  g.fillPath();
  g.strokePath();
}

function footPoly(g: Phaser.GameObjects.Graphics, ankle: Point, deg: number): void {
  const length = 14;
  const heel = 4;
  const width = 6;
  const pts = [
    rot(ankle.x - heel, ankle.y, ankle.x, ankle.y, deg),
    rot(ankle.x + length * 0.35, ankle.y - width / 2, ankle.x, ankle.y, deg),
    rot(ankle.x + length, ankle.y, ankle.x, ankle.y, deg),
    rot(ankle.x + length * 0.35, ankle.y + width / 2, ankle.x, ankle.y, deg),
  ];
  g.fillStyle(FOOT, 1);
  g.lineStyle(1, INK, 1);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) {
    g.lineTo(pts[i].x, pts[i].y);
  }
  g.closePath();
  g.fillPath();
  g.strokePath();
}
