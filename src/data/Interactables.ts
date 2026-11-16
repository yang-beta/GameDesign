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

export interface SecretWallDef {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hitsRequired: number;
  /** Dim alcove revealed after the wall breaks. */
  alcove: { x: number; y: number; width: number; height: number; color: number };
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

/** One cracked secret wall per non-boss room. */
export const STAGE_SECRETS: Partial<Record<StageId, SecretWallDef>> = {
  A: {
    id: "a-secret",
    x: 1860,
    y: 760,
    width: 56,
    height: 140,
    hitsRequired: SECRET_HITS_REQUIRED,
    alcove: { x: 1780, y: 760, width: 140, height: 150, color: 0x121820 },
    chest: {
      x: 1760,
      surfaceY: 840,
      itemId: "item-1",
      itemLabel: "物品1",
      itemColor: 0xffc857,
    },
  },
  B: {
    id: "b-secret",
    x: 120,
    y: 2000,
    width: 52,
    height: 160,
    hitsRequired: SECRET_HITS_REQUIRED,
    alcove: { x: 70, y: 2000, width: 120, height: 170, color: 0x0d1810 },
    chest: {
      x: 70,
      surfaceY: 2100,
      itemId: "item-2",
      itemLabel: "物品2",
      itemColor: 0x7ec8ff,
    },
  },
  C: {
    id: "c-secret",
    x: 300,
    y: 380,
    width: 48,
    height: 140,
    hitsRequired: SECRET_HITS_REQUIRED,
    alcove: { x: 240, y: 380, width: 110, height: 150, color: 0x160e22 },
    chest: {
      x: 230,
      surfaceY: 460,
      itemId: "item-3",
      itemLabel: "物品3",
      itemColor: 0xf0a0ff,
    },
  },
};
