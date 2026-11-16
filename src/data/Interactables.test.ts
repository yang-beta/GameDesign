import { describe, expect, it } from "vitest";
import { STAGE_HAZARDS, STAGE_SECRETS, SECRET_HITS_REQUIRED, TOXIC_DAMAGE } from "./Interactables";
import { STAGES } from "./StageData";
import { crackAlpha, shouldCountWallHit } from "../entities/SecretWall";

describe("hazards and secrets", () => {
  it("puts toxic ground in A and B only, damage 3", () => {
    expect(STAGE_HAZARDS.A?.length).toBeGreaterThan(0);
    expect(STAGE_HAZARDS.B?.length).toBeGreaterThan(0);
    expect(STAGE_HAZARDS.C).toBeUndefined();
    expect(STAGE_HAZARDS.boss).toBeUndefined();
    expect(TOXIC_DAMAGE).toBe(3);
    expect(STAGE_HAZARDS.A?.[0]?.damage).toBe(3);
  });

  it("gives each non-boss room a side-hit elevated secret with a chest", () => {
    expect(SECRET_HITS_REQUIRED).toBe(4);
    expect(STAGE_SECRETS.boss).toBeUndefined();
    for (const id of ["A", "B", "C"] as const) {
      const secret = STAGE_SECRETS[id];
      expect(secret, id).toBeDefined();
      expect(secret!.hitsRequired).toBe(4);
      expect(secret!.approachSide === 1 || secret!.approachSide === -1).toBe(true);
      // Elevated relative to that stage's floor (not sitting on the bottom).
      const floorY = Math.max(...STAGES[id].platforms.map((p) => p.surfaceY));
      expect(secret!.roomFloor.surfaceY).toBeLessThan(floorY - 40);
      expect(secret!.chest.itemLabel.startsWith("物品")).toBe(true);
    }
  });

  it("advances crack visuals and counts one hit per attack serial", () => {
    expect(crackAlpha(0)).toBe(0);
    expect(crackAlpha(2)).toBe(0.5);
    expect(crackAlpha(4)).toBe(1);
    expect(shouldCountWallHit(-1, 0, false)).toBe(true);
    expect(shouldCountWallHit(0, 0, false)).toBe(false);
    expect(shouldCountWallHit(0, 1, true)).toBe(false);
  });
});
