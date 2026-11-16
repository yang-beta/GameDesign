import type { PlatformDef } from "./MapData";

export type StageId = "A" | "B" | "C" | "boss";
export type EnemyKind = "patrol" | "shooter";

export interface StageEnemySpawn {
  id: string;
  kind: EnemyKind;
  x: number;
  surfaceY: number;
  patrol: number;
}

export interface StageExit {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  to: StageId | "settle";
  /** Require standing inside and pressing UP. */
  needUp?: boolean;
}

export interface StageDef {
  id: StageId;
  title: string;
  bg: string;
  width: number;
  height: number;
  platforms: PlatformDef[];
  playerSpawn: { x: number; surfaceY: number };
  exits: StageExit[];
  enemies: StageEnemySpawn[];
  /** After all enemies die, respawn them after this many ms (0 = only on re-enter). */
  respawnMs: number;
}

const FLOOR = 0x5e646c;
const PLAT = 0x8b919a;

function floor(width: number, surfaceY: number, color = FLOOR): PlatformDef {
  return {
    id: "floor",
    x: width / 2,
    surfaceY,
    width,
    thickness: 48,
    color,
  };
}

/** Stage A — wide side-scroll feel-test room (cool blue). */
export const STAGE_A: StageDef = {
  id: "A",
  title: "場景 A｜入門台地",
  bg: "#1a2740",
  width: 2800,
  height: 900,
  respawnMs: 8000,
  playerSpawn: { x: 160, surfaceY: 840 },
  // Stair rises ~60–70px so a short jump (even with early cut) still lands.
  platforms: [
    floor(2800, 840, 0x4a5a72),
    { id: "a-low", x: 520, surfaceY: 780, width: 220, thickness: 22, color: PLAT },
    { id: "a-mid", x: 900, surfaceY: 720, width: 200, thickness: 22, color: PLAT },
    { id: "a-high", x: 1240, surfaceY: 660, width: 180, thickness: 22, color: PLAT },
    { id: "a-drop", x: 1600, surfaceY: 760, width: 280, thickness: 22, color: PLAT },
    { id: "a-bridge", x: 2100, surfaceY: 780, width: 320, thickness: 22, color: PLAT },
    { id: "a-gate", x: 2550, surfaceY: 840, width: 200, thickness: 22, color: 0x6d7f9a },
  ],
  exits: [
    {
      id: "a-to-b",
      x: 2680,
      y: 780,
      width: 70,
      height: 100,
      label: "↓ 進入 B",
      to: "B",
      needUp: true,
    },
  ],
  enemies: [
    { id: "a-patrol-1", kind: "patrol", x: 640, surfaceY: 840, patrol: 110 },
    { id: "a-patrol-2", kind: "patrol", x: 1600, surfaceY: 760, patrol: 80 },
    { id: "a-shooter-1", kind: "shooter", x: 2100, surfaceY: 780, patrol: 90 },
  ],
};

/** Stage B — vertical descent shaft (green). */
export const STAGE_B: StageDef = {
  id: "B",
  title: "場景 B｜垂直豎井",
  bg: "#15281c",
  width: 960,
  height: 2200,
  respawnMs: 10000,
  playerSpawn: { x: 480, surfaceY: 180 },
  platforms: [
    { id: "b-top", x: 480, surfaceY: 180, width: 420, thickness: 24, color: 0x3d6b4a },
    { id: "b-ledge-1", x: 280, surfaceY: 420, width: 220, thickness: 20, color: PLAT },
    { id: "b-ledge-2", x: 700, surfaceY: 620, width: 220, thickness: 20, color: PLAT },
    { id: "b-ledge-3", x: 320, surfaceY: 860, width: 240, thickness: 20, color: PLAT },
    { id: "b-ledge-4", x: 680, surfaceY: 1100, width: 240, thickness: 20, color: PLAT },
    { id: "b-ledge-5", x: 360, surfaceY: 1380, width: 260, thickness: 20, color: PLAT },
    { id: "b-ledge-6", x: 640, surfaceY: 1640, width: 260, thickness: 20, color: PLAT },
    floor(960, 2100, 0x2f5a3c),
  ],
  exits: [
    {
      id: "b-to-c",
      x: 820,
      y: 2040,
      width: 80,
      height: 100,
      label: "→ 進入 C",
      to: "C",
      needUp: true,
    },
  ],
  enemies: [
    { id: "b-patrol-1", kind: "patrol", x: 280, surfaceY: 420, patrol: 60 },
    { id: "b-shooter-1", kind: "shooter", x: 680, surfaceY: 1100, patrol: 70 },
    { id: "b-patrol-2", kind: "patrol", x: 480, surfaceY: 2100, patrol: 120 },
  ],
};

/** Stage C — compact antechamber (purple), passage to boss. */
export const STAGE_C: StageDef = {
  id: "C",
  title: "場景 C｜前廳",
  bg: "#241833",
  width: 960,
  height: 540,
  respawnMs: 7000,
  playerSpawn: { x: 120, surfaceY: 460 },
  platforms: [
    floor(960, 460, 0x5a4570),
    { id: "c-step", x: 400, surfaceY: 380, width: 140, thickness: 18, color: PLAT },
    { id: "c-rail", x: 700, surfaceY: 320, width: 180, thickness: 18, color: PLAT },
  ],
  exits: [
    {
      id: "c-to-boss",
      x: 880,
      y: 400,
      width: 70,
      height: 110,
      label: "→ BOSS",
      to: "boss",
      needUp: true,
    },
  ],
  enemies: [
    { id: "c-shooter-1", kind: "shooter", x: 520, surfaceY: 460, patrol: 100 },
    { id: "c-patrol-1", kind: "patrol", x: 700, surfaceY: 320, patrol: 50 },
  ],
};

/** Boss room — empty arena + leave portal (no boss yet). */
export const STAGE_BOSS: StageDef = {
  id: "boss",
  title: "BOSS 房｜傳送點",
  bg: "#3a1818",
  width: 1400,
  height: 720,
  respawnMs: 0,
  playerSpawn: { x: 160, surfaceY: 640 },
  platforms: [
    floor(1400, 640, 0x6a3a3a),
    { id: "boss-pad-l", x: 420, surfaceY: 520, width: 160, thickness: 18, color: 0x8b919a },
    { id: "boss-pad-r", x: 980, surfaceY: 520, width: 160, thickness: 18, color: 0x8b919a },
  ],
  exits: [
    {
      id: "boss-leave",
      x: 1200,
      y: 560,
      width: 90,
      height: 120,
      label: "離開關卡",
      to: "settle",
      needUp: true,
    },
  ],
  enemies: [],
};

export const STAGES: Record<StageId, StageDef> = {
  A: STAGE_A,
  B: STAGE_B,
  C: STAGE_C,
  boss: STAGE_BOSS,
};

export function stageById(id: StageId): StageDef {
  return STAGES[id];
}
