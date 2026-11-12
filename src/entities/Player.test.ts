import { describe, expect, it } from "vitest";
import {
  ATTACK_ACTIVE_MS,
  ATTACK_COOLDOWN_MS,
  CROUCH_HEIGHT,
  JUMP_CUT_MULTIPLIER,
  JUMP_VELOCITY,
  MAX_AIR_JUMPS,
  PLAYER_WIDTH,
  STAND_HEIGHT,
  applyJumpCut,
  attackActiveUntil,
  canStartAttack,
  createJumpState,
  describeState,
  fullJumpHeight,
  nextAttackReadyAt,
  stepJump,
  whipHitbox,
} from "./Player";

describe("player movement", () => {
  it("supports a grounded jump plus one air jump, then resets after landing", () => {
    expect(MAX_AIR_JUMPS).toBe(1);

    let result = stepJump(createJumpState(0), 0, true, true, false, 0);
    expect(result.jumped).toBe(true);
    expect(result.velocityY).toBe(JUMP_VELOCITY);

    result = stepJump(result.state, 40, false, true, false, result.velocityY);
    expect(result.jumped).toBe(true);
    expect(result.state.airJumps).toBe(0);

    result = stepJump(result.state, 80, false, true, false, result.velocityY);
    expect(result.jumped).toBe(false);

    result = stepJump(result.state, 300, true, true, false, 40);
    expect(result.jumped).toBe(true);
    expect(result.state.airJumps).toBe(MAX_AIR_JUMPS);
  });

  it("keeps a grounded jump available for a short coyote window after leaving a ledge", () => {
    let result = stepJump(createJumpState(0), 0, true, false, false, 0);
    result = stepJump(result.state, 40, false, true, false, 0);
    expect(result.jumped).toBe(true);
    expect(result.state.airJumps).toBe(MAX_AIR_JUMPS);
  });

  it("turns a held jump into a shorter hop when the button is released", () => {
    const held = stepJump(createJumpState(0), 0, true, true, false, 0);
    const tapped = stepJump(createJumpState(0), 0, true, true, true, 0);

    expect(applyJumpCut(JUMP_VELOCITY)).toBeCloseTo(JUMP_VELOCITY * JUMP_CUT_MULTIPLIER);
    expect(applyJumpCut(80)).toBe(80);
    expect(Math.abs(held.velocityY)).toBeGreaterThan(Math.abs(tapped.velocityY));
    expect(fullJumpHeight()).toBeGreaterThan(100);
  });
});

describe("whip attack", () => {
  it("stays active for 0.2s and cannot start again until 0.4s", () => {
    const start = 1000;
    expect(ATTACK_ACTIVE_MS).toBe(200);
    expect(ATTACK_COOLDOWN_MS).toBe(400);
    expect(attackActiveUntil(start) - start).toBe(200);
    expect(nextAttackReadyAt(start) - start).toBe(400);
    expect(canStartAttack(start + 399, nextAttackReadyAt(start))).toBe(false);
    expect(canStartAttack(start + 400, nextAttackReadyAt(start))).toBe(true);
  });

  it("places the standing whip in front and the crouching whip lower", () => {
    const shared = { x: 100, y: 200, bodyWidth: PLAYER_WIDTH, bodyHeight: STAND_HEIGHT };
    const right = whipHitbox({ ...shared, facing: 1, crouching: false });
    const left = whipHitbox({ ...shared, facing: -1, crouching: false });
    const crouch = whipHitbox({
      ...shared,
      facing: 1,
      crouching: true,
      bodyHeight: CROUCH_HEIGHT,
    });

    expect(right.x).toBeGreaterThan(shared.x);
    expect(left.x).toBeLessThan(shared.x);
    expect(crouch.y).toBeGreaterThan(right.y);
    expect(right.width).toBeGreaterThan(PLAYER_WIDTH);
  });
});

describe("status label", () => {
  it("reports stand, crouch, jump, and attack", () => {
    expect(describeState({ onFloor: true, crouching: false, attacking: false })).toBe("站立");
    expect(describeState({ onFloor: true, crouching: true, attacking: false })).toBe("蹲下");
    expect(describeState({ onFloor: false, crouching: false, attacking: false })).toBe("跳躍中");
    expect(describeState({ onFloor: true, crouching: false, attacking: true })).toBe("站立 · 攻擊中");
    expect(describeState({ onFloor: true, crouching: true, attacking: true })).toBe("蹲下 · 攻擊中");
    expect(describeState({ onFloor: false, crouching: false, attacking: true })).toBe("跳躍中 · 攻擊中");
  });
});
