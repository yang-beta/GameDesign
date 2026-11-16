import type { PlatformDef } from "./MapData";
import type { StageId } from "./StageData";

export const TOXIC_DAMAGE = 3;
export const SECRET_HITS_REQUIRED = 4;

export interface HazardDef {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  damage: number;
  color: number;
}

export interface ChestDef {
  x: number;
  surfaceY: number;
  itemId: string;
  itemLabel: string;
  itemColor: number;
}

/**
 * Side-hit secret leading into an off-screen annex (same scene, camera follows).
 * approachSide: 1 = punch facing right into the wall; -1 = facing left.
 */
export interface SecretWallDef {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hitsRequired: number;
  blendColor: number;
  approachSide: 1 | -1;
  alcove: { x: number; y: number; width: number; height: number; color: number };
  roomFloor: PlatformDef;
  /** Extra climb/corridor platforms revealed with the annex (same scene). */
  pathPlatforms: PlatformDef[];
  chest: ChestDef;
}

export interface MovingPlatformDef {
  id: string;
  x: number;
  width: number;
  thickness: number;
  color: number;
  surfaceYMin: number;
  surfaceYMax: number;
  speed: number;
}

export const PLAYER_DISPLAY_NAME = "主角1（暫名）";

/** Toxic patches — rooms A and B only. */
export const STAGE_HAZARDS: Partial<Record<StageId, HazardDef[]>> = {
  A: [
    {
      id: "a-toxic-floor",
      x: 1180,
      y: 828,
      width: 220,
      height: 28,
      damage: TOXIC_DAMAGE,
      color: 0x6bdb4a,
    },
  ],
  B: [
    {
      id: "b-toxic-ledge",
      x: 360,
      y: 1368,
      width: 200,
      height: 24,
      damage: TOXIC_DAMAGE,
      color: 0x9ae04a,
    },
  ],
};

/**
 * Off-viewport annexes (still same Phaser scene — walk/climb in, camera follows).
 * A: above the main room · B: left of the shaft · C: right of the antechamber
 */
export const STAGE_SECRETS: Partial<Record<StageId, SecretWallDef>> = {
  A: {
    id: "a-secret",
    // Break right face of a-high → shaft climbs above y=0 into the annex.
    x: 1360,
    y: 600,
    width: 36,
    height: 100,
    hitsRequired: SECRET_HITS_REQUIRED,
    blendColor: 0x243044,
    approachSide: 1,
    alcove: { x: 1480, y: -260, width: 280, height: 200, color: 0x101820 },
    roomFloor: {
      id: "a-secret-floor",
      x: 1480,
      surfaceY: -160,
      width: 280,
      thickness: 20,
      color: 0x1c2838,
    },
    pathPlatforms: [
      { id: "a-shaft-1", x: 1480, surfaceY: 560, width: 140, thickness: 16, color: 0x2a3548 },
      { id: "a-shaft-2", x: 1480, surfaceY: 420, width: 140, thickness: 16, color: 0x2a3548 },
      { id: "a-shaft-3", x: 1480, surfaceY: 280, width: 140, thickness: 16, color: 0x2a3548 },
      { id: "a-shaft-4", x: 1480, surfaceY: 140, width: 140, thickness: 16, color: 0x2a3548 },
      { id: "a-shaft-5", x: 1480, surfaceY: 0, width: 160, thickness: 16, color: 0x2a3548 },
    ],
    chest: {
      x: 1520,
      surfaceY: -160,
      itemId: "item-1",
      itemLabel: "物品1",
      itemColor: 0xffc857,
    },
  },
  B: {
    id: "b-secret",
    // Stand on left doorway pad, punch LEFT → annex outside the shaft (x < 0).
    x: 140,
    y: 1040,
    width: 34,
    height: 100,
    hitsRequired: SECRET_HITS_REQUIRED,
    blendColor: 0x1a3022,
    approachSide: -1,
    alcove: { x: -180, y: 1040, width: 240, height: 160, color: 0x0c1610 },
    roomFloor: {
      id: "b-secret-floor",
      x: -180,
      surfaceY: 1100,
      width: 240,
      thickness: 18,
      color: 0x163022,
    },
    pathPlatforms: [
      { id: "b-secret-step", x: 40, surfaceY: 1100, width: 100, thickness: 16, color: 0x1f3a28 },
    ],
    chest: {
      x: -220,
      surfaceY: 1100,
      itemId: "item-2",
      itemLabel: "物品2",
      itemColor: 0x7ec8ff,
    },
  },
  C: {
    id: "c-secret",
    // From left of antechamber, punch LEFT → annex outside (x < 0); keeps boss exit free.
    x: 200,
    y: 400,
    width: 32,
    height: 100,
    hitsRequired: SECRET_HITS_REQUIRED,
    blendColor: 0x2a1e38,
    approachSide: -1,
    alcove: { x: -140, y: 400, width: 200, height: 140, color: 0x120c1a },
    roomFloor: {
      id: "c-secret-floor",
      x: -140,
      surfaceY: 460,
      width: 200,
      thickness: 16,
      color: 0x221830,
    },
    pathPlatforms: [
      { id: "c-secret-bridge", x: 40, surfaceY: 460, width: 80, thickness: 14, color: 0x2a1e38 },
    ],
    chest: {
      x: -180,
      surfaceY: 460,
      itemId: "item-3",
      itemLabel: "物品3",
      itemColor: 0xf0a0ff,
    },
  },
};

export const STAGE_LIFTS: Partial<Record<StageId, MovingPlatformDef[]>> = {
  B: [
    {
      id: "b-elevator",
      x: 200,
      width: 140,
      thickness: 18,
      color: 0x6ecf8e,
      surfaceYMin: 760,
      surfaceYMax: 2040,
      speed: 70,
    },
  ],
};
