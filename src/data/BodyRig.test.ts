import { describe, expect, it } from "vitest";
import {
  ACTIVE_SEX,
  FEMALE_RIG,
  MALE_RIG,
  hipWidth,
  isHourglass,
  isVTaper,
  shoulderWidth,
  standJoints,
} from "./BodyRig";

describe("body rig proportions", () => {
  it("keeps the feel-test on the male rig", () => {
    expect(ACTIVE_SEX).toBe("male");
  });

  it("records male V-taper vs female hourglass from the anatomy sheet", () => {
    expect(isVTaper(MALE_RIG)).toBe(true);
    expect(isHourglass(MALE_RIG)).toBe(false);
    expect(shoulderWidth(MALE_RIG)).toBeGreaterThan(hipWidth(MALE_RIG));

    expect(isHourglass(FEMALE_RIG)).toBe(true);
    expect(isVTaper(FEMALE_RIG)).toBe(false);
    expect(hipWidth(FEMALE_RIG)).toBeGreaterThan(shoulderWidth(FEMALE_RIG));
  });

  it("fits male stand joints inside the 128px hurtbox and keeps leg length", () => {
    const idle = standJoints(MALE_RIG);
    expect(idle.head.y - idle.head.r).toBeGreaterThanOrEqual(-64);
    expect(idle.footL.y).toBeLessThanOrEqual(64);
    expect(idle.footL.y - idle.pelvis.y).toBeGreaterThan(40);
    expect(MALE_RIG.shoulderHalf).toBe(18);
    expect(MALE_RIG.hipHalf).toBe(11);
    expect(Math.abs(idle.shoulderR.x - idle.shoulderL.x)).toBeGreaterThan(
      Math.abs(idle.kneeR.x - idle.kneeL.x),
    );
  });

  it("places female hips wider than shoulders for later heroine work", () => {
    expect(FEMALE_RIG.hipHalf).toBeGreaterThan(FEMALE_RIG.shoulderHalf);
    expect(FEMALE_RIG.pelvisY).toBeLessThan(MALE_RIG.pelvisY);
    expect(FEMALE_RIG.shoulderHalf).toBeLessThan(MALE_RIG.shoulderHalf);
  });
});
