import { describe, expect, it } from "vitest";
import { fullJumpHeight } from "../entities/Player";
import { CLIMBS, PLATFORMS, ROOM, platformById, surfaceRise, toRect } from "./MapData";

describe("test room", () => {
  it("uses several platform heights inside the room", () => {
    const surfaces = new Set(PLATFORMS.map((platform) => platform.surfaceY));
    expect(surfaces.size).toBeGreaterThanOrEqual(4);

    for (const platform of PLATFORMS) {
      const rect = toRect(platform);
      expect(rect.x - rect.width / 2).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width / 2).toBeLessThanOrEqual(ROOM.width);
      expect(rect.y - rect.height / 2).toBeGreaterThanOrEqual(0);
      expect(rect.y + rect.height / 2).toBeLessThanOrEqual(ROOM.height);
    }
  });

  it("matches single-jump ledges to one hop and keeps a gap that needs a double jump", () => {
    const single = fullJumpHeight();
    const kinds = new Set(CLIMBS.map((climb) => climb.kind));
    expect(kinds.has("single")).toBe(true);
    expect(kinds.has("double")).toBe(true);

    for (const climb of CLIMBS) {
      const rise = surfaceRise(platformById(climb.from), platformById(climb.to));
      if (climb.kind === "single") {
        expect(rise).toBeGreaterThan(40);
        expect(rise).toBeLessThanOrEqual(single * 0.92);
      } else {
        expect(rise).toBeGreaterThan(single);
        expect(rise).toBeLessThanOrEqual(single * 1.9);
      }
    }
  });
});
