import { describe, expect, it } from "vitest";
import { STAGE_HAZARDS, STAGE_LIFTS, STAGE_SECRETS, SECRET_HITS_REQUIRED, TOXIC_DAMAGE } from "./Interactables";
import { STAGES } from "./StageData";
import { crackAlpha, shouldCountWallHit } from "../entities/SecretWall";

describe("hazards and secrets", () => {
  it("puts toxic ground in A and B only, damage 3", () => {
    expect(STAGE_HAZARDS.A?.length).toBeGreaterThan(0);
    expect(STAGE_HAZARDS.B?.length).toBeGreaterThan(0);
    expect(TOXIC_DAMAGE).toBe(3);
  });

  it("puts A secret annex above the play-frame border", () => {
    expect(SECRET_HITS_REQUIRED).toBe(4);
    const a = STAGE_SECRETS.A!;
    expect(a.roomFloor.surfaceY).toBeLessThan(STAGES.A.playFrame.y);
    expect(a.borderGate?.edge).toBe("top");
    expect(a.pathPlatforms.length).toBeGreaterThan(3);
    // Shaft starts at a-high height so the first step is reachable.
    expect(a.pathPlatforms[0]!.surfaceY).toBe(660);
  });

  it("gives B a recovery lift and side secrets outside the left frame", () => {
    expect(STAGE_LIFTS.B?.[0]?.surfaceYMax).toBeGreaterThan(2000);
    expect(STAGE_SECRETS.B!.roomFloor.x).toBeLessThan(0);
    expect(STAGE_SECRETS.C!.roomFloor.x).toBeLessThan(0);
  });

  it("advances crack visuals and counts one hit per attack serial", () => {
    expect(crackAlpha(2)).toBe(0.5);
    expect(shouldCountWallHit(-1, 0, false)).toBe(true);
    expect(shouldCountWallHit(0, 0, false)).toBe(false);
  });
});
