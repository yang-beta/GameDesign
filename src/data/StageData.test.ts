import { describe, expect, it } from "vitest";
import { STAGE_A, STAGE_B, STAGE_BOSS, STAGE_C, STAGES } from "./StageData";
import { toRect } from "./MapData";

describe("stage flow data", () => {
  it("defines A→B→C→boss exits and distinct backgrounds", () => {
    expect(STAGE_A.exits[0]?.to).toBe("B");
    expect(STAGE_B.exits[0]?.to).toBe("C");
    expect(STAGE_C.exits[0]?.to).toBe("boss");
    expect(STAGE_BOSS.exits[0]?.to).toBe("settle");

    const bgs = new Set(Object.values(STAGES).map((stage) => stage.bg));
    expect(bgs.size).toBe(4);
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
