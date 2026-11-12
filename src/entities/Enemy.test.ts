import { describe, expect, it } from "vitest";
import { ENEMY_SPAWNS, PLATFORMS } from "../data/MapData";
import { shouldApplyHit, stepPatrol } from "./Enemy";

describe("enemy patrol", () => {
  it("reverses at the ends of the patrol range", () => {
    expect(stepPatrol(0, 0, 40, 1).dir).toBe(1);
    expect(stepPatrol(40, 0, 40, 1).dir).toBe(-1);
    expect(stepPatrol(-40, 0, 40, -1).dir).toBe(1);
    expect(stepPatrol(10, 0, 40, -1).dir).toBe(-1);
  });

  it("keeps each spawn on a platform wide enough for its patrol", () => {
    for (const spawn of ENEMY_SPAWNS) {
      const platform = PLATFORMS.find(
        (entry) => entry.surfaceY === spawn.surfaceY && Math.abs(entry.x - spawn.x) <= entry.width / 2,
      );
      expect(platform, spawn.id).toBeDefined();
      if (!platform) {
        continue;
      }
      expect(spawn.x - spawn.patrol).toBeGreaterThanOrEqual(platform.x - platform.width / 2 + 20);
      expect(spawn.x + spawn.patrol).toBeLessThanOrEqual(platform.x + platform.width / 2 - 20);
    }
  });
});

describe("enemy hits", () => {
  it("counts one hit per whip swing", () => {
    expect(shouldApplyHit(-1, 0, false)).toBe(true);
    expect(shouldApplyHit(0, 0, false)).toBe(false);
    expect(shouldApplyHit(0, 1, false)).toBe(true);
    expect(shouldApplyHit(0, 1, true)).toBe(false);
  });
});
