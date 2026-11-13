/**
 * Body-rig landmarks for the 128px stand hurtbox (origin at box center, +y down).
 * Derived from the male/female construction sheet in
 * `art/player/reference/anatomy-male-female-skeleton.jpg`.
 *
 * Shared vertical rhythm (~8-head figure fitted into ±64):
 * head → chin → shoulder → chest → pelvis → knee → foot.
 *
 * Sex differences recorded for the future heroine; gameplay currently uses male.
 */

export type Sex = "male" | "female";

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

export interface RigMetrics {
  /** Head disc radius in joint space. */
  headR: number;
  headY: number;
  shoulderY: number;
  chestY: number;
  pelvisY: number;
  kneeY: number;
  footY: number;
  /** Half shoulder bar — male wider than hips (V-taper). */
  shoulderHalf: number;
  /** Half hip bar — female wider than shoulders (hourglass). */
  hipHalf: number;
  stanceHalf: number;
  /** Near-side (screen-right when facing +x) sits slightly forward. */
  nearShoulderBiasX: number;
  nearHipBiasX: number;
}

/**
 * Male: inverted-triangle torso — shoulders clearly wider than hips,
 * thicker limb reach, pelvis sits a touch lower.
 */
export const MALE_RIG: RigMetrics = {
  headR: 12,
  headY: -50,
  shoulderY: -30,
  chestY: -12,
  pelvisY: 16,
  kneeY: 38,
  footY: 60,
  shoulderHalf: 18,
  hipHalf: 11,
  stanceHalf: 10,
  nearShoulderBiasX: 1,
  nearHipBiasX: 1,
};

/**
 * Female: hourglass — hips ≥ shoulders, higher/cinched waist feel,
 * narrower shoulder bar, slightly higher pelvis, narrower stance.
 * Not wired into gameplay yet; kept so heroine work can swap ACTIVE_SEX.
 */
export const FEMALE_RIG: RigMetrics = {
  headR: 11,
  headY: -51,
  shoulderY: -31,
  chestY: -14,
  pelvisY: 14,
  kneeY: 38,
  footY: 60,
  shoulderHalf: 13,
  hipHalf: 16,
  stanceHalf: 9,
  nearShoulderBiasX: 1,
  nearHipBiasX: 2,
};

export const RIGS: Record<Sex, RigMetrics> = {
  male: MALE_RIG,
  female: FEMALE_RIG,
};

/** Protagonist sex for the feel-test puppet. */
export const ACTIVE_SEX: Sex = "male";

export function activeRig(): RigMetrics {
  return RIGS[ACTIVE_SEX];
}

export function shoulderWidth(rig: RigMetrics): number {
  return rig.shoulderHalf * 2;
}

export function hipWidth(rig: RigMetrics): number {
  return rig.hipHalf * 2;
}

/** True when shoulders are wider than hips (male V-taper). */
export function isVTaper(rig: RigMetrics): boolean {
  return rig.shoulderHalf > rig.hipHalf;
}

/** True when hips are wider than shoulders (female hourglass). */
export function isHourglass(rig: RigMetrics): boolean {
  return rig.hipHalf > rig.shoulderHalf;
}

/**
 * Neutral standing joints for a sex. Arms stay in a light guard so combat
 * offsets still read; bone lengths follow the rig landmarks.
 */
export function standJoints(rig: RigMetrics, breath = 0): Joints {
  const lift = breath * 1.4;
  const shY = rig.shoulderY + lift;
  const headY = rig.headY + lift;
  const chestY = rig.chestY + lift * 0.45;

  // Character-left = far when facing +x; character-right = near.
  const shoulderL = { x: -rig.shoulderHalf, y: shY + 1 };
  const shoulderR = {
    x: rig.shoulderHalf + rig.nearShoulderBiasX,
    y: shY,
  };

  return {
    head: { x: 1, y: headY, r: rig.headR },
    shoulderL,
    shoulderR,
    // Guard: elbows out, fists up near the jaw line.
    elbowL: { x: shoulderL.x - 4, y: chestY + 4 },
    elbowR: { x: shoulderR.x + 3, y: chestY + 6 },
    fistL: { x: -4, y: headY + rig.headR + 6 },
    fistR: { x: 8, y: headY + rig.headR + 10 },
    chest: { x: 1, y: chestY },
    pelvis: { x: 0, y: rig.pelvisY },
    kneeL: { x: -rig.stanceHalf + 1, y: rig.kneeY },
    kneeR: { x: rig.stanceHalf + rig.nearHipBiasX, y: rig.kneeY },
    footL: { x: -rig.stanceHalf, y: rig.footY },
    footR: { x: rig.stanceHalf + 1, y: rig.footY },
  };
}

export function hipJoint(rig: RigMetrics, side: "left" | "right"): Point {
  const sign = side === "left" ? -1 : 1;
  const bias = side === "right" ? rig.nearHipBiasX : 0;
  return {
    x: sign * rig.hipHalf + bias,
    y: rig.pelvisY + 3,
  };
}
