import type { PlatformDef } from "./MapData";

export type StageId = "A" | "B" | "C" | "boss";
export type EnemyKind = "patrol" | "shooter";
export type StageEdge = "left" | "right" | "top" | "bottom";

export interface StageEnemySpawn {
  id: string;
  kind: EnemyKind;
  x: number;
  surfaceY: number;
  patrol: number;
}

export interface StageBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Soft edge transition — reach the play-frame edge to change stage (no door prop). */
export interface EdgeExit {
  id: string;
  edge: StageEdge;
  to: StageId | "settle";
  /** Limit the exit to a band along the edge (world coords). */
  alongMin?: number;
  alongMax?: number;
  arrivalSpawn?: { x: number; surfaceY: number };
  label?: string;
}

export interface StageDef {
  id: StageId;
  title: string;
  bg: string;
  /** Main play rectangle (border drawn; default blockers). */
  playFrame: StageBounds;
  /** Full physics/camera world (may include secret annex outside the frame). */
  bounds: StageBounds;
  platforms: PlatformDef[];
  playerSpawn: { x: number; surfaceY: number };
  edgeExits: EdgeExit[];
  enemies: StageEnemySpawn[];
  respawnMs: number;
}

const FLOOR = 0x5e646c;
const PLAT = 0x8b919a;

function floor(width: number, surfaceY: number, color = FLOOR, x?: number): PlatformDef {
  return {
    id: "floor",
    x: x ?? width / 2,
    surfaceY,
    width,
    thickness: 48,
    color,
  };
}

/** Stage A — play frame 0..2800 × 0..900; secret annex above y=0. */
export const STAGE_A: StageDef = {
  id: "A",
  title: "場景 A｜入門台地",
  bg: "#1a2740",
  playFrame: { x: 0, y: 0, width: 2800, height: 900 },
  bounds: { x: 0, y: -480, width: 2800, height: 1380 },
  respawnMs: 8000,
  playerSpawn: { x: 160, surfaceY: 840 },
  platforms: [
    floor(2800, 840, 0x4a5a72),
    { id: "a-low", x: 520, surfaceY: 780, width: 220, thickness: 22, color: PLAT },
    { id: "a-mid", x: 900, surfaceY: 720, width: 200, thickness: 22, color: PLAT },
    { id: "a-high", x: 1240, surfaceY: 660, width: 220, thickness: 22, color: PLAT },
    { id: "a-drop", x: 1600, surfaceY: 760, width: 280, thickness: 22, color: PLAT },
    { id: "a-bridge", x: 2100, surfaceY: 780, width: 320, thickness: 22, color: PLAT },
    { id: "a-gate", x: 2550, surfaceY: 840, width: 200, thickness: 22, color: 0x6d7f9a },
  ],
  edgeExits: [
    {
      id: "a-right-to-b",
      edge: "right",
      to: "B",
      alongMin: 700,
      alongMax: 900,
      arrivalSpawn: { x: 480, surfaceY: 180 },
      label: "→ B",
    },
  ],
  enemies: [
    { id: "a-patrol-1", kind: "patrol", x: 640, surfaceY: 840, patrol: 110 },
    { id: "a-patrol-2", kind: "patrol", x: 1600, surfaceY: 760, patrol: 80 },
    { id: "a-shooter-1", kind: "shooter", x: 2100, surfaceY: 780, patrol: 90 },
  ],
};

/** Stage B — vertical shaft; top edge jump returns to A; bottom-right goes to C. */
export const STAGE_B: StageDef = {
  id: "B",
  title: "場景 B｜垂直豎井",
  bg: "#15281c",
  playFrame: { x: 0, y: 0, width: 960, height: 2200 },
  bounds: { x: -320, y: 0, width: 1280, height: 2200 },
  respawnMs: 10000,
  playerSpawn: { x: 480, surfaceY: 180 },
  platforms: [
    { id: "b-top", x: 480, surfaceY: 180, width: 420, thickness: 24, color: 0x3d6b4a },
    { id: "b-ledge-1", x: 280, surfaceY: 420, width: 220, thickness: 20, color: PLAT },
    { id: "b-ledge-2", x: 700, surfaceY: 620, width: 220, thickness: 20, color: PLAT },
    { id: "b-ledge-3", x: 320, surfaceY: 860, width: 240, thickness: 20, color: PLAT },
    { id: "b-ledge-4", x: 680, surfaceY: 1100, width: 240, thickness: 20, color: PLAT },
    { id: "b-secret-door", x: 240, surfaceY: 1100, width: 140, thickness: 16, color: PLAT },
    { id: "b-ledge-5", x: 360, surfaceY: 1380, width: 260, thickness: 20, color: PLAT },
    { id: "b-ledge-6", x: 640, surfaceY: 1640, width: 260, thickness: 20, color: PLAT },
    floor(960, 2100, 0x2f5a3c),
  ],
  edgeExits: [
    {
      id: "b-top-to-a",
      edge: "top",
      to: "A",
      alongMin: 200,
      alongMax: 760,
      arrivalSpawn: { x: 2580, surfaceY: 840 },
      label: "↑ A",
    },
    {
      id: "b-right-to-c",
      edge: "right",
      to: "C",
      alongMin: 1950,
      alongMax: 2200,
      arrivalSpawn: { x: 120, surfaceY: 460 },
      label: "→ C",
    },
  ],
  enemies: [
    { id: "b-patrol-1", kind: "patrol", x: 280, surfaceY: 420, patrol: 60 },
    { id: "b-shooter-1", kind: "shooter", x: 680, surfaceY: 1100, patrol: 70 },
    { id: "b-patrol-2", kind: "patrol", x: 480, surfaceY: 2100, patrol: 120 },
  ],
};

export const STAGE_C: StageDef = {
  id: "C",
  title: "場景 C｜前廳",
  bg: "#241833",
  playFrame: { x: 0, y: 0, width: 960, height: 540 },
  bounds: { x: -300, y: 0, width: 1260, height: 540 },
  respawnMs: 7000,
  playerSpawn: { x: 120, surfaceY: 460 },
  platforms: [
    floor(960, 460, 0x5a4570),
    { id: "c-step", x: 400, surfaceY: 380, width: 140, thickness: 18, color: PLAT },
    { id: "c-rail", x: 700, surfaceY: 320, width: 180, thickness: 18, color: PLAT },
  ],
  edgeExits: [
    {
      id: "c-left-to-b",
      edge: "left",
      to: "B",
      alongMin: 360,
      alongMax: 540,
      arrivalSpawn: { x: 760, surfaceY: 2100 },
      label: "← B",
    },
    {
      id: "c-right-to-boss",
      edge: "right",
      to: "boss",
      alongMin: 360,
      alongMax: 540,
      arrivalSpawn: { x: 160, surfaceY: 640 },
      label: "→ BOSS",
    },
  ],
  enemies: [
    { id: "c-shooter-1", kind: "shooter", x: 520, surfaceY: 460, patrol: 100 },
    { id: "c-patrol-1", kind: "patrol", x: 700, surfaceY: 320, patrol: 50 },
  ],
};

export const STAGE_BOSS: StageDef = {
  id: "boss",
  title: "BOSS 房｜傳送點",
  bg: "#3a1818",
  playFrame: { x: 0, y: 0, width: 1400, height: 720 },
  bounds: { x: 0, y: 0, width: 1400, height: 720 },
  respawnMs: 0,
  playerSpawn: { x: 160, surfaceY: 640 },
  platforms: [
    floor(1400, 640, 0x6a3a3a),
    { id: "boss-pad-l", x: 420, surfaceY: 520, width: 160, thickness: 18, color: 0x8b919a },
    { id: "boss-pad-r", x: 980, surfaceY: 520, width: 160, thickness: 18, color: 0x8b919a },
  ],
  edgeExits: [
    {
      id: "boss-left-to-c",
      edge: "left",
      to: "C",
      alongMin: 500,
      alongMax: 720,
      arrivalSpawn: { x: 820, surfaceY: 460 },
      label: "← C",
    },
    {
      id: "boss-right-settle",
      edge: "right",
      to: "settle",
      alongMin: 500,
      alongMax: 720,
      label: "離開",
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
