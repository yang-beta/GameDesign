import fistLUrl from "../../art/player/fist-l.png";
import fistRUrl from "../../art/player/fist-r.png";
import footLUrl from "../../art/player/foot-l.png";
import footRUrl from "../../art/player/foot-r.png";
import forearmLUrl from "../../art/player/forearm-l.png";
import forearmRUrl from "../../art/player/forearm-r.png";
import headUrl from "../../art/player/head.png";
import pelvisUrl from "../../art/player/pelvis.png";
import shinLUrl from "../../art/player/shin-l.png";
import shinRUrl from "../../art/player/shin-r.png";
import thighLUrl from "../../art/player/thigh-l.png";
import thighRUrl from "../../art/player/thigh-r.png";
import torsoUrl from "../../art/player/torso.png";
import upperArmLUrl from "../../art/player/upper-arm-l.png";
import upperArmRUrl from "../../art/player/upper-arm-r.png";

/** Pivot in image pixels from the top-left corner. */
export interface Pivot {
  x: number;
  y: number;
}

/**
 * Art filenames use -l / -r from a front-view layout:
 * -l is screen-left = character's right, -r is screen-right = character's left.
 * Game joints use L/R as the character's own left/right.
 */
export type PlayerPartId =
  | "head"
  | "torso"
  | "pelvis"
  | "upperArmR"
  | "forearmR"
  | "fistR"
  | "thighR"
  | "shinR"
  | "footR"
  | "upperArmL"
  | "forearmL"
  | "fistL"
  | "thighL"
  | "shinL"
  | "footL";

export interface PlayerPartDef {
  id: PlayerPartId;
  key: string;
  url: string;
  pivot: Pivot;
  /** Image grows along +Y from the pivot (limbs). Head/torso grow along -Y. */
  axis: "down" | "up";
  width: number;
  height: number;
}

export const PLAYER_PARTS: Record<PlayerPartId, PlayerPartDef> = {
  head: {
    id: "head",
    key: "player-head",
    url: headUrl,
    pivot: { x: 74, y: 201 },
    axis: "up",
    width: 148,
    height: 212,
  },
  torso: {
    id: "torso",
    key: "player-torso",
    url: torsoUrl,
    pivot: { x: 107, y: 283 },
    axis: "up",
    width: 214,
    height: 294,
  },
  pelvis: {
    id: "pelvis",
    key: "player-pelvis",
    url: pelvisUrl,
    pivot: { x: 128, y: 10 },
    axis: "down",
    width: 257,
    height: 301,
  },
  // Character right = art -l
  upperArmR: {
    id: "upperArmR",
    key: "player-upper-arm-r",
    url: upperArmLUrl,
    pivot: { x: 85, y: 10 },
    axis: "down",
    width: 171,
    height: 362,
  },
  forearmR: {
    id: "forearmR",
    key: "player-forearm-r",
    url: forearmLUrl,
    pivot: { x: 38, y: 10 },
    axis: "down",
    width: 76,
    height: 105,
  },
  fistR: {
    id: "fistR",
    key: "player-fist-r",
    url: fistLUrl,
    pivot: { x: 41, y: 10 },
    axis: "down",
    width: 83,
    height: 149,
  },
  thighR: {
    id: "thighR",
    key: "player-thigh-r",
    url: thighLUrl,
    pivot: { x: 69, y: 10 },
    axis: "down",
    width: 139,
    height: 227,
  },
  shinR: {
    id: "shinR",
    key: "player-shin-r",
    url: shinLUrl,
    pivot: { x: 48, y: 10 },
    axis: "down",
    width: 97,
    height: 140,
  },
  footR: {
    id: "footR",
    key: "player-foot-r",
    url: footLUrl,
    pivot: { x: 46, y: 10 },
    axis: "down",
    width: 92,
    height: 154,
  },
  // Character left = art -r
  upperArmL: {
    id: "upperArmL",
    key: "player-upper-arm-l",
    url: upperArmRUrl,
    pivot: { x: 79, y: 10 },
    axis: "down",
    width: 158,
    height: 339,
  },
  forearmL: {
    id: "forearmL",
    key: "player-forearm-l",
    url: forearmRUrl,
    pivot: { x: 38, y: 10 },
    axis: "down",
    width: 76,
    height: 133,
  },
  fistL: {
    id: "fistL",
    key: "player-fist-l",
    url: fistRUrl,
    pivot: { x: 34, y: 10 },
    axis: "down",
    width: 69,
    height: 95,
  },
  thighL: {
    id: "thighL",
    key: "player-thigh-l",
    url: thighRUrl,
    pivot: { x: 52, y: 10 },
    axis: "down",
    width: 104,
    height: 230,
  },
  shinL: {
    id: "shinL",
    key: "player-shin-l",
    url: shinRUrl,
    pivot: { x: 43, y: 10 },
    axis: "down",
    width: 87,
    height: 127,
  },
  footL: {
    id: "footL",
    key: "player-foot-l",
    url: footRUrl,
    pivot: { x: 68, y: 10 },
    axis: "down",
    width: 136,
    height: 148,
  },
};

/** Far limbs first, near limbs last, head on top — matches the old Graphics draw order. */
export const PLAYER_DRAW_ORDER: readonly PlayerPartId[] = [
  "thighR",
  "shinR",
  "footR",
  "thighL",
  "shinL",
  "footL",
  "pelvis",
  "torso",
  "upperArmR",
  "forearmR",
  "fistR",
  "upperArmL",
  "forearmL",
  "fistL",
  "head",
];

export function artBoneLength(part: PlayerPartDef): number {
  if (part.axis === "up") {
    return Math.max(8, part.pivot.y);
  }
  return Math.max(8, part.height - part.pivot.y);
}

export function boneAngle(from: { x: number; y: number }, to: { x: number; y: number }, axis: "down" | "up"): number {
  const target = Math.atan2(to.y - from.y, to.x - from.x);
  const natural = axis === "down" ? Math.PI / 2 : -Math.PI / 2;
  return target - natural;
}

export function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

export function queuePlayerArt(load: { image: (key: string, url: string) => unknown }): void {
  for (const part of Object.values(PLAYER_PARTS)) {
    load.image(part.key, part.url);
  }
}
