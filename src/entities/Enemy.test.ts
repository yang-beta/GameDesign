import { describe, expect, it } from "vitest";
import { STAGE_A } from "../data/StageData";
import {
  ENEMY_HEIGHT,
  SHOOT_COOLDOWN_MS,
  shouldApplyHit,
  shouldChase,
  shouldHoldAndShoot,
  stepPatrol,
} from "./Enemy";
import { STAND_HEIGHT } from "./PlayerController";

describe("enemy patrol", () => {
  it("reverses at the ends of the patrol range", () => {
    expect(stepPatrol(0, 0, 40, 1).dir).toBe(1);
    expect(stepPatrol(40, 0, 40, 1).dir).toBe(-1);
    expect(stepPatrol(-40, 0, 40, -1).dir).toBe(1);
    expect(stepPatrol(10, 0, 40, -1).dir).toBe(-1);
  });

  it("keeps stage A spawns on a platform wide enough for patrol", () => {
    for (const spawn of STAGE_A.enemies) {
      const platform = STAGE_A.platforms.find(
        (entry) =>
          Math.abs(entry.surfaceY - spawn.surfaceY) < 1 &&
          Math.abs(entry.x - spawn.x) <= entry.width / 2 + 40,
      );
      expect(platform, spawn.id).toBeDefined();
      if (!platform) {
        continue;
      }
      expect(spawn.x - spawn.patrol).toBeGreaterThanOrEqual(platform.x - platform.width / 2 - 20);
      expect(spawn.x + spawn.patrol).toBeLessThanOrEqual(platform.x + platform.width / 2 + 20);
    }
  });
});

describe("enemy combat helpers", () => {
  it("counts one hit per attack serial", () => {
    expect(shouldApplyHit(-1, 0, false)).toBe(true);
    expect(shouldApplyHit(0, 0, false)).toBe(false);
    expect(shouldApplyHit(0, 1, false)).toBe(true);
    expect(shouldApplyHit(0, 1, true)).toBe(false);
  });

  it("lets shooters chase then hold at closer range", () => {
    expect(shouldChase(300)).toBe(true);
    expect(shouldChase(400)).toBe(false);
    expect(shouldHoldAndShoot(150)).toBe(true);
    expect(shouldHoldAndShoot(250)).toBe(false);
  });

  it("matches player height and slows shooter fire ~70%", () => {
    expect(ENEMY_HEIGHT).toBe(STAND_HEIGHT);
    expect(SHOOT_COOLDOWN_MS).toBeGreaterThanOrEqual(3500);
  });
});
