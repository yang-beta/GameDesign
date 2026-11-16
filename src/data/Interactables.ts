import type { PlatformDef } from "./MapData";
import type { StageId } from "./StageData";

export const TOXIC_DAMAGE = 3;
export const SECRET_HITS_REQUIRED = 4;

export interface HazardDef {
  id: string;
  /** World-space center. */
  x: number;
  y: number;
  width: number;
  height: number;
  damage: number;
  /** Flat color stand-in until art textures land. */
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
 * Side-hit secret: wall blocks entry into an elevated alcove room.
 * Player attacks from approachSide (1 = wall's left face / hit facing right).
 */
export interface SecretWallDef {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hitsRequired: number;
  /** Blend into stage rock / cliff so it isn't a bright prop. */
  blendColor: number;
  /** 1 = approach from left (punch right); -1 = approach from right. */
  approachSide: 1 | -1;
  alcove: { x: number; y: number; width: number; height: number; color: number };
  /** Floor inside the secret room (always collidable; visually dim until open). */
  roomFloor: PlatformDef;
  chest: ChestDef;
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
 * Elevated side-entry secrets (punch/kick left-right only).
 * A: right of a-high · B: left of mid shaft ledge · C: right of c-rail
 */
export const STAGE_SECRETS: Partial<Record<StageId, SecretWallDef>> = {
  A: {
    id: "a-secret",
    // Stand on a-high (x≈1240, y=660) and punch RIGHT into this face.
    x: 1360,
    y: 600,
    width: 36,
    height: 100,
    hitsRequired: SECRET_HITS_REQUIRED,
    blendColor: 0x243044,
    approachSide: 1,
    alcove: { x: 1480, y: 600, width: 200, height: 120, color: 0x101820 },
    roomFloor: {
      id: "a-secret-floor",
      x: 1480,
      surfaceY: 660,
      width: 200,
      thickness: 18,
      color: 0x1c2838,
    },
    chest: {
      x: 1520,
      surfaceY: 660,
      itemId: "item-1",
      itemLabel: "物品1",
      itemColor: 0xffc857,
    },
  },
  B: {
    id: "b-secret",
    // From b-ledge-4 (x≈680, y=1100), punch LEFT into wall → small room.
    x: 520,
    y: 1040,
    width: 34,
    height: 100,
    hitsRequired: SECRET_HITS_REQUIRED,
    blendColor: 0x1a3022,
    approachSide: -1,
    alcove: { x: 400, y: 1040, width: 180, height: 120, color: 0x0c1610 },
    roomFloor: {
      id: "b-secret-floor",
      x: 400,
      surfaceY: 1100,
      width: 180,
      thickness: 18,
      color: 0x163022,
    },
    chest: {
      x: 380,
      surfaceY: 1100,
      itemId: "item-2",
      itemLabel: "物品2",
      itemColor: 0x7ec8ff,
    },
  },
  C: {
    id: "c-secret",
    // From c-rail (x≈700, y=320), punch LEFT into wall → loft room (keeps boss exit clear).
    x: 580,
    y: 270,
    width: 32,
    height: 90,
    hitsRequired: SECRET_HITS_REQUIRED,
    blendColor: 0x2a1e38,
    approachSide: -1,
    alcove: { x: 480, y: 270, width: 140, height: 110, color: 0x120c1a },
    roomFloor: {
      id: "c-secret-floor",
      x: 480,
      surfaceY: 320,
      width: 140,
      thickness: 16,
      color: 0x221830,
    },
    chest: {
      x: 460,
      surfaceY: 320,
      itemId: "item-3",
      itemLabel: "物品3",
      itemColor: 0xf0a0ff,
    },
  },
};
