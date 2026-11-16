import { describe, expect, it } from "vitest";
import { fullJumpHeight } from "../entities/PlayerController";
import { STAGE_A, STAGE_B, STAGE_BOSS, STAGE_C, STAGES } from "./StageData";
import { toRect } from "./MapData";

describe("stage flow data", () => {
  it("defines bidirectional stage links and distinct backgrounds", () => {
    expect(STAGE_A.exits.some((e) => e.to === "B")).toBe(true);
    expect(STAGE_B.exits.some((e) => e.to === "A")).toBe(true);
    expect(STAGE_B.exits.some((e) => e.to === "C")).toBe(true);
    expect(STAGE_C.exits.some((e) => e.to === "B")).toBe(true);
    expect(STAGE_C.exits.some((e) => e.to === "boss")).toBe(true);
    expect(STAGE_BOSS.exits.some((e) => e.to === "C")).toBe(true);
    expect(STAGE_BOSS.exits.some((e) => e.to === "settle")).toBe(true);

    const bgs = new Set(Object.values(STAGES).map((stage) => stage.bg));
    expect(bgs.size).toBe(4);
  });

  it("keeps Stage A stair rises within a single jump", () => {
    const jump = fullJumpHeight();
    const surfaces = STAGE_A.platforms
      .filter((p) => p.id.startsWith("a-") || p.id === "floor")
      .sort((a, b) => b.surfaceY - a.surfaceY);
    for (let i = 0; i < surfaces.length - 1; i += 1) {
      const rise = surfaces[i]!.surfaceY - surfaces[i + 1]!.surfaceY;
      if (rise <= 0) {
        continue;
      }
      expect(rise, `${surfaces[i]!.id}→${surfaces[i + 1]!.id}`).toBeLessThanOrEqual(jump * 0.75);
    }
  });

  it("keeps platforms inside each room and enemies on surfaces", () => {
    for (const stage of Object.values(STAGES)) {
      for (const platform of stage.platforms) {
        const rect = toRect(platform);
        expect(rect.x - rect.width / 2).toBeGreaterThanOrEqual(-1);
        expect(rect.x + rect.width / 2).toBeLessThanOrEqual(stage.width + 1);
      }
      for (const spawn of stage.enemies) {
        expect(spawn.kind === "patrol" || spawn.kind === "shooter").toBe(true);
        expect(spawn.x).toBeGreaterThan(0);
        expect(spawn.x).toBeLessThan(stage.width);
      }
    }
    expect(STAGE_B.height).toBeGreaterThan(STAGE_A.height);
    expect(STAGE_C.width).toBeLessThanOrEqual(960);
    expect(STAGE_BOSS.enemies).toHaveLength(0);
  });
});
