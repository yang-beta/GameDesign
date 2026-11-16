import { describe, expect, it } from "vitest";
import { fullJumpHeight } from "../entities/PlayerController";
import { STAGE_A, STAGE_B, STAGE_BOSS, STAGE_C, STAGES } from "./StageData";
import { toRect } from "./MapData";

describe("stage flow data", () => {
  it("uses edge exits for bidirectional travel without door props", () => {
    expect(STAGE_A.edgeExits.some((e) => e.to === "B" && e.edge === "right")).toBe(true);
    expect(STAGE_B.edgeExits.some((e) => e.to === "A" && e.edge === "top")).toBe(true);
    expect(STAGE_B.edgeExits.some((e) => e.to === "C" && e.edge === "right")).toBe(true);
    expect(STAGE_C.edgeExits.some((e) => e.to === "B" && e.edge === "left")).toBe(true);
    expect(STAGE_C.edgeExits.some((e) => e.to === "boss" && e.edge === "right")).toBe(true);
    expect(STAGE_BOSS.edgeExits.some((e) => e.to === "C")).toBe(true);
    expect(STAGE_BOSS.edgeExits.some((e) => e.to === "settle")).toBe(true);

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

  it("keeps platforms inside each play frame and defines expanded bounds", () => {
    for (const stage of Object.values(STAGES)) {
      for (const platform of stage.platforms) {
        const rect = toRect(platform);
        expect(rect.x - rect.width / 2).toBeGreaterThanOrEqual(stage.playFrame.x - 1);
        expect(rect.x + rect.width / 2).toBeLessThanOrEqual(stage.playFrame.x + stage.playFrame.width + 1);
      }
      expect(stage.bounds.width).toBeGreaterThanOrEqual(stage.playFrame.width);
      expect(stage.bounds.height).toBeGreaterThanOrEqual(stage.playFrame.height);
    }
    expect(STAGE_A.bounds.y).toBeLessThan(STAGE_A.playFrame.y);
  });
});
