export interface PlatformDef {
  id: string;
  x: number;
  surfaceY: number;
  width: number;
  thickness: number;
  color: number;
}

export interface EnemySpawn {
  id: string;
  x: number;
  surfaceY: number;
  patrol: number;
}

export interface Climb {
  from: string;
  to: string;
  kind: "single" | "double";
}

export const ROOM = {
  width: 3600,
  height: 900,
};

const FLOOR_COLOR = 0x5e646c;
const PLATFORM_COLOR = 0x8b919a;

export const FLOOR: PlatformDef = {
  id: "floor",
  x: ROOM.width / 2,
  surfaceY: 840,
  width: ROOM.width,
  thickness: 48,
  color: FLOOR_COLOR,
};

export const PLATFORMS: PlatformDef[] = [
  FLOOR,
  { id: "step-low", x: 390, surfaceY: 730, width: 110, thickness: 22, color: PLATFORM_COLOR },
  { id: "low-a", x: 520, surfaceY: 740, width: 170, thickness: 22, color: PLATFORM_COLOR },
  { id: "low-b", x: 760, surfaceY: 650, width: 160, thickness: 22, color: PLATFORM_COLOR },
  { id: "mid-a", x: 1020, surfaceY: 540, width: 150, thickness: 22, color: PLATFORM_COLOR },
  { id: "high-a", x: 1280, surfaceY: 390, width: 140, thickness: 22, color: PLATFORM_COLOR },
  { id: "drop-b", x: 1620, surfaceY: 630, width: 250, thickness: 22, color: PLATFORM_COLOR },
  { id: "low-c", x: 2000, surfaceY: 770, width: 300, thickness: 22, color: PLATFORM_COLOR },
  { id: "step-1", x: 2340, surfaceY: 690, width: 140, thickness: 22, color: PLATFORM_COLOR },
  { id: "step-2", x: 2560, surfaceY: 590, width: 140, thickness: 22, color: PLATFORM_COLOR },
  { id: "step-3", x: 2780, surfaceY: 480, width: 150, thickness: 22, color: PLATFORM_COLOR },
  { id: "crown", x: 3120, surfaceY: 360, width: 230, thickness: 22, color: PLATFORM_COLOR },
];

/** Climbs the feel-test room expects the current jump tuning to clear. */
export const CLIMBS: Climb[] = [
  { from: "floor", to: "step-low", kind: "single" },
  { from: "low-b", to: "mid-a", kind: "single" },
  { from: "mid-a", to: "high-a", kind: "double" },
  { from: "step-1", to: "step-2", kind: "single" },
  { from: "step-3", to: "crown", kind: "single" },
];

export const PLAYER_SPAWN = {
  x: 160,
  surfaceY: FLOOR.surfaceY,
};

export const SANDBAG_SPAWN = {
  x: 230,
  surfaceY: FLOOR.surfaceY,
  width: 54,
  height: 120,
};

export const ENEMY_SPAWNS: EnemySpawn[] = [
  /** Near spawn for easy punch/kick testing */
  { id: "walker-near", x: 360, surfaceY: FLOOR.surfaceY, patrol: 40 },
  { id: "walker-floor", x: 640, surfaceY: FLOOR.surfaceY, patrol: 100 },
  { id: "walker-drop", x: 1620, surfaceY: 630, patrol: 70 },
  { id: "walker-low-c", x: 2000, surfaceY: 770, patrol: 80 },
];

export function toRect(platform: PlatformDef): { x: number; y: number; width: number; height: number } {
  return {
    x: platform.x,
    y: platform.surfaceY + platform.thickness / 2,
    width: platform.width,
    height: platform.thickness,
  };
}

export function platformById(id: string): PlatformDef {
  const platform = PLATFORMS.find((entry) => entry.id === id);
  if (!platform) {
    throw new Error(`Unknown platform: ${id}`);
  }
  return platform;
}

export function surfaceRise(from: PlatformDef, to: PlatformDef): number {
  return from.surfaceY - to.surfaceY;
}
