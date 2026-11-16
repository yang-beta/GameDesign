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
 * Side-hit secret. For A, path climbs ABOVE playFrame.y (=0) into the annex.
 * approachSide: 1 = punch facing right; -1 = facing left.
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
  pathPlatforms: PlatformDef[];
  /**
   * Opening punched through the play-frame border after the wall breaks
   * (removes the matching border blocker segment).
   */
  borderGate?: { edge: "top" | "left" | "right" | "bottom"; alongMin: number; alongMax: number };
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
 * A: annex ABOVE play-frame top (y < 0). Contiguous shaft from a-high.
 * B: annex LEFT of play-frame (x < 0).
 * C: annex LEFT of play-frame (x < 0).
 */
export const STAGE_SECRETS: Partial<Record<StageId, SecretWallDef>> = {
  A: {
    id: "a-secret",
    // On a-high, punch RIGHT into this face → climb shaft past top border.
    x: 1370,
    y: 600,
    width: 40,
    height: 110,
    hitsRequired: SECRET_HITS_REQUIRED,
    blendColor: 0x2a384c,
    approachSide: 1,
    alcove: { x: 1370, y: -250, width: 320, height: 220, color: 0x0e1520 },
    roomFloor: {
      id: "a-secret-floor",
      x: 1370,
      surfaceY: -140,
      width: 300,
      thickness: 20,
      color: 0x1c2838,
    },
    // Tight ladder so the climb is walkable from a-high without a dead gap.
    pathPlatforms: [
      { id: "a-shaft-0", x: 1370, surfaceY: 660, width: 120, thickness: 16, color: 0x2a3548 },
      { id: "a-shaft-1", x: 1370, surfaceY: 520, width: 120, thickness: 16, color: 0x2a3548 },
      { id: "a-shaft-2", x: 1370, surfaceY: 380, width: 120, thickness: 16, color: 0x2a3548 },
      { id: "a-shaft-3", x: 1370, surfaceY: 240, width: 120, thickness: 16, color: 0x2a3548 },
      { id: "a-shaft-4", x: 1370, surfaceY: 100, width: 140, thickness: 16, color: 0x2a3548 },
      { id: "a-shaft-5", x: 1370, surfaceY: -20, width: 160, thickness: 16, color: 0x2a3548 },
    ],
    borderGate: { edge: "top", alongMin: 1280, alongMax: 1460 },
    chest: {
      x: 1400,
      surfaceY: -140,
      itemId: "item-1",
      itemLabel: "物品1",
      itemColor: 0xffc857,
    },
  },
  B: {
    id: "b-secret",
    x: 140,
    y: 1040,
    width: 34,
    height: 100,
    hitsRequired: SECRET_HITS_REQUIRED,
    blendColor: 0x1a3022,
    approachSide: -1,
    alcove: { x: -160, y: 1040, width: 240, height: 160, color: 0x0c1610 },
    roomFloor: {
      id: "b-secret-floor",
      x: -160,
      surfaceY: 1100,
      width: 240,
      thickness: 18,
      color: 0x163022,
    },
    pathPlatforms: [
      { id: "b-secret-step", x: 40, surfaceY: 1100, width: 100, thickness: 16, color: 0x1f3a28 },
    ],
    borderGate: { edge: "left", alongMin: 980, alongMax: 1160 },
    chest: {
      x: -200,
      surfaceY: 1100,
      itemId: "item-2",
      itemLabel: "物品2",
      itemColor: 0x7ec8ff,
    },
  },
  C: {
    id: "c-secret",
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
    borderGate: { edge: "left", alongMin: 360, alongMax: 520 },
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
