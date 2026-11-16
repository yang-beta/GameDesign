import { describe, expect, it } from "vitest";
import { PLAYER_MAX_HP, applyDamage, collectItem, getHp, getItems, resetRun } from "./RunState";

describe("run state", () => {
  it("starts at full HP and clamps damage", () => {
    resetRun();
    expect(getHp()).toBe(PLAYER_MAX_HP);
    expect(PLAYER_MAX_HP).toBe(50);

    expect(applyDamage(3)).toEqual({ hp: 47, dealt: 3, dead: false });
    expect(applyDamage(4)).toEqual({ hp: 43, dealt: 4, dead: false });
    expect(applyDamage(100)).toEqual({ hp: 0, dealt: 43, dead: true });
  });

  it("tracks collected chest items without duplicates", () => {
    resetRun();
    collectItem("物品1");
    collectItem("物品1");
    collectItem("物品2");
    expect([...getItems()]).toEqual(["物品1", "物品2"]);
  });
});
