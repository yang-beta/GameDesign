import { describe, expect, it } from "vitest";
import { STAGE_HAZARDS, STAGE_SECRETS, SECRET_HITS_REQUIRED, TOXIC_DAMAGE } from "./Interactables";
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

  it("gives each non-boss room a 4-hit secret wall with a chest item label", () => {
    expect(SECRET_HITS_REQUIRED).toBe(4);
    expect(STAGE_SECRETS.A?.hitsRequired).toBe(4);
    expect(STAGE_SECRETS.B?.hitsRequired).toBe(4);
    expect(STAGE_SECRETS.C?.hitsRequired).toBe(4);
    expect(STAGE_SECRETS.boss).toBeUndefined();
    expect(STAGE_SECRETS.A?.chest.itemLabel).toBe("物品1");
    expect(STAGE_SECRETS.B?.chest.itemLabel).toBe("物品2");
    expect(STAGE_SECRETS.C?.chest.itemLabel).toBe("物品3");
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
