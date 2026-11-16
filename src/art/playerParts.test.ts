import { describe, expect, it } from "vitest";
import {
  PLAYER_DRAW_ORDER,
  PLAYER_PARTS,
  artBoneLength,
  boneAngle,
  distance,
} from "./playerParts";

describe("player art parts", () => {
  it("keeps every drawn part defined with a pivot inside the image", () => {
    expect(PLAYER_DRAW_ORDER).toHaveLength(15);
    for (const id of PLAYER_DRAW_ORDER) {
      const part = PLAYER_PARTS[id];
      expect(part.pivot.x).toBeGreaterThanOrEqual(0);
      expect(part.pivot.y).toBeGreaterThanOrEqual(0);
      expect(part.pivot.x).toBeLessThanOrEqual(part.width);
      expect(part.pivot.y).toBeLessThanOrEqual(part.height);
      expect(artBoneLength(part)).toBeGreaterThan(8);
    }
  });

  it("maps character-right limbs to the art -l sheets", () => {
    expect(PLAYER_PARTS.upperArmR.url).toContain("upper-arm-l");
    expect(PLAYER_PARTS.upperArmL.url).toContain("upper-arm-r");
    expect(PLAYER_PARTS.fistR.url).toContain("fist-l");
    expect(PLAYER_PARTS.fistL.url).toContain("fist-r");
  });

  it("aims a down-axis bone straight down with zero rotation", () => {
    expect(boneAngle({ x: 0, y: 0 }, { x: 0, y: 20 }, "down")).toBeCloseTo(0);
    expect(boneAngle({ x: 0, y: 0 }, { x: 0, y: -20 }, "up")).toBeCloseTo(0);
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});
