import { describe, expect, it } from "vitest";
import { STAGE_HAZARDS, STAGE_LIFTS, STAGE_SECRETS, SECRET_HITS_REQUIRED, TOXIC_DAMAGE } from "./Interactables";
import { STAGES, stageBounds } from "./StageData";
import { crackAlpha, shouldCountWallHit } from "../entities/SecretWall";

describe("hazards and secrets", () => {
  it("puts toxic ground in A and B only, damage 3", () => {
    expect(STAGE_HAZARDS.A?.length).toBeGreaterThan(0);
    expect(STAGE_HAZARDS.B?.length).toBeGreaterThan(0);
    expect(STAGE_HAZARDS.C).toBeUndefined();
    expect(STAGE_HAZARDS.boss).toBeUndefined();
    expect(TOXIC_DAMAGE).toBe(3);
  });

  it("places secret annexes outside the main stage frame", () => {
    expect(SECRET_HITS_REQUIRED).toBe(4);
    expect(STAGE_SECRETS.boss).toBeUndefined();

    const a = STAGE_SECRETS.A!;
    expect(a.roomFloor.surfaceY).toBeLessThan(0);
    expect(a.pathPlatforms.length).toBeGreaterThan(0);

    const b = STAGE_SECRETS.B!;
    expect(b.roomFloor.x + b.roomFloor.width / 2).toBeLessThanOrEqual(0);

    const c = STAGE_SECRETS.C!;
    expect(c.roomFloor.x + c.roomFloor.width / 2).toBeLessThanOrEqual(40);

    for (const id of ["A", "B", "C"] as const) {
      const bounds = stageBounds(STAGES[id]);
      const secret = STAGE_SECRETS[id]!;
      expect(secret.roomFloor.x).toBeGreaterThanOrEqual(bounds.x);
      expect(secret.roomFloor.surfaceY).toBeGreaterThanOrEqual(bounds.y);
    }
  });

  it("gives stage B a vertical recovery lift", () => {
    const lifts = STAGE_LIFTS.B ?? [];
    expect(lifts.length).toBeGreaterThan(0);
    expect(lifts[0]!.surfaceYMax).toBeGreaterThan(lifts[0]!.surfaceYMin + 200);
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
