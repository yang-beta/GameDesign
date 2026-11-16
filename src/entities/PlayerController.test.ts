import { describe, expect, it } from "vitest";
import {
  ATTACK_BUFFER_MS,
  ATTACKS,
  COMBO_RESET_MS,
  CROUCH_HEIGHT,
  HURTBOX_WIDTH,
  JUMP_CUT_MULTIPLIER,
  JUMP_VELOCITY,
  MAX_AIR_JUMPS,
  STARTING_AIR_JUMPS,
  STAND_HEIGHT,
  applyJumpCut,
  attackVelocity,
  beginBufferedAttack,
  createCombatState,
  createJumpState,
  describePose,
  fullJumpHeight,
  hitboxTouches,
  hurtboxFor,
  makeHitbox,
  noteAttackPress,
  resolveVerticalIntent,
  stepJump,
  tickCombat,
} from "./PlayerController";
import { buildJoints } from "./PlayerRenderer";
import type { PlayerViewState } from "./PlayerController";

describe("player movement", () => {
  it("starts with a ground jump plus one air hop", () => {
    expect(STARTING_AIR_JUMPS).toBe(1);

    let result = stepJump(createJumpState(0), 0, true, true, false, 0);
    expect(result.jumped).toBe(true);
    expect(result.velocityY).toBe(JUMP_VELOCITY);
    expect(result.state.airJumps).toBe(1);

    result = stepJump(result.state, 40, false, true, false, result.velocityY);
    expect(result.jumped).toBe(true);
    expect(result.state.airJumps).toBe(0);

    result = stepJump(result.state, 80, false, true, false, result.velocityY);
    expect(result.jumped).toBe(false);
  });

  it("allows one air jump after that ability is unlocked, then restores it on landing", () => {
    expect(MAX_AIR_JUMPS).toBe(1);

    let result = stepJump(createJumpState(0, MAX_AIR_JUMPS), 0, true, true, false, 0, MAX_AIR_JUMPS);
    result = stepJump(result.state, 40, false, true, false, result.velocityY, MAX_AIR_JUMPS);
    expect(result.jumped).toBe(true);
    expect(result.state.airJumps).toBe(0);

    result = stepJump(result.state, 80, false, true, false, result.velocityY, MAX_AIR_JUMPS);
    expect(result.jumped).toBe(false);

    result = stepJump(result.state, 300, true, true, false, 40, MAX_AIR_JUMPS);
    expect(result.jumped).toBe(true);
    expect(result.state.airJumps).toBe(MAX_AIR_JUMPS);
  });

  it("keeps a grounded jump available for a short coyote window after leaving a ledge", () => {
    let result = stepJump(createJumpState(0), 0, true, false, false, 0);
    result = stepJump(result.state, 40, false, true, false, 0);
    expect(result.jumped).toBe(true);
    expect(result.state.airJumps).toBe(STARTING_AIR_JUMPS);
  });

  it("turns a held jump into a shorter hop when the button is released", () => {
    const held = stepJump(createJumpState(0), 0, true, true, false, 0);
    const tapped = stepJump(createJumpState(0), 0, true, true, true, 0);

    expect(applyJumpCut(JUMP_VELOCITY)).toBeCloseTo(JUMP_VELOCITY * JUMP_CUT_MULTIPLIER);
    expect(applyJumpCut(80)).toBe(80);
    expect(Math.abs(held.velocityY)).toBeGreaterThan(Math.abs(tapped.velocityY));
    expect(fullJumpHeight()).toBeGreaterThan(100);
  });

  it("keeps down+jump on a surface from launching upward", () => {
    const intent = resolveVerticalIntent({
      down: true,
      jumpPressed: true,
      supported: true,
      locked: false,
      standingStrike: false,
    });

    expect(intent.allowJump).toBe(false);
    expect(intent.requestDrop).toBe(true);
    expect(intent.holdCrouch).toBe(true);

    const buffered = createJumpState(0);
    buffered.jumpBufferUntil = 100;
    buffered.groundJumpAvailable = false;
    const result = stepJump(
      { ...buffered, jumpBufferUntil: intent.allowJump ? buffered.jumpBufferUntil : -1 },
      50,
      false,
      intent.allowJump,
      false,
      0,
    );
    expect(result.jumped).toBe(false);
    expect(result.velocityY).toBe(0);
  });

  it("still jumps from the ground without down, and in the air while holding down", () => {
    const grounded = resolveVerticalIntent({
      down: false,
      jumpPressed: true,
      supported: true,
      locked: false,
      standingStrike: false,
    });
    const airborne = resolveVerticalIntent({
      down: true,
      jumpPressed: true,
      supported: false,
      locked: false,
      standingStrike: false,
    });

    expect(grounded.allowJump).toBe(true);
    expect(grounded.requestDrop).toBe(false);
    expect(airborne.allowJump).toBe(true);
    expect(airborne.requestDrop).toBe(false);
    expect(airborne.holdCrouch).toBe(false);
  });
});

describe("combo", () => {
  it("remembers Z for 0.15s and chains jab then hook; C starts a kick", () => {
    expect(ATTACK_BUFFER_MS).toBe(150);
    expect(COMBO_RESET_MS).toBe(600);
    expect(ATTACKS.jab.hitstop).toBe(50);
    expect(ATTACKS.hook.hitstop).toBe(55);
    expect(ATTACKS.kick.hitstop).toBe(90);

    let state = noteAttackPress(createCombatState(), 0);
    expect(beginBufferedAttack(state, 151, false).attack).toBeNull();

    state = beginBufferedAttack(state, 0, false);
    expect(state.attack).toBe("jab");

    state = noteAttackPress(state, 80);
    expect(beginBufferedAttack(state, 80, false).attack).toBe("jab");

    const jabRecovery =
      state.attackStartedAt + ATTACKS.jab.startup + ATTACKS.jab.active + 1;
    state = noteAttackPress(state, jabRecovery - 20);
    state = beginBufferedAttack(tickCombat(state, jabRecovery), jabRecovery, false);
    expect(state.attack).toBe("hook");

    const afterHook = state.attackStartedAt + ATTACKS.hook.startup + ATTACKS.hook.active + 1;
    state = noteAttackPress(state, afterHook - 40);
    state = beginBufferedAttack(state, afterHook, false);
    expect(state.attack).toBe("jab");

    const kickAt = afterHook + 500;
    state = noteAttackPress(tickCombat(state, kickAt), kickAt);
    state = beginBufferedAttack(state, kickAt, false, true);
    expect(state.attack).toBe("kick");
    expect(attackVelocity("kick", "startup")).toBeLessThan(attackVelocity("kick", "active"));
    expect(attackVelocity("jab", "startup")).toBeGreaterThan(0);
  });

  it("resets to the jab when Z is not pressed again within 0.6s", () => {
    let state = beginBufferedAttack(noteAttackPress(createCombatState(), 0), 0, false);
    expect(state.attack).toBe("jab");
    expect(state.comboSlot).toBe(1);

    const later = 700;
    state = tickCombat(state, later);
    expect(state.attack).toBeNull();
    expect(state.comboSlot).toBe(0);

    state = beginBufferedAttack(noteAttackPress(state, later), later, false);
    expect(state.attack).toBe("jab");
  });

  it("uses crouch punch / crouch kick while crouching, and air moves while airborne", () => {
    const crouchPunch = beginBufferedAttack(noteAttackPress(createCombatState(), 0), 0, {
      crouching: true,
      airborne: false,
      preferKick: false,
    });
    expect(crouchPunch.attack).toBe("crouchPunch");

    const crouchKick = beginBufferedAttack(noteAttackPress(createCombatState(), 0), 0, {
      crouching: true,
      airborne: false,
      preferKick: true,
    });
    expect(crouchKick.attack).toBe("crouchKick");

    const jumpPunch = beginBufferedAttack(noteAttackPress(createCombatState(), 0), 0, {
      crouching: false,
      airborne: true,
      preferKick: false,
    });
    expect(jumpPunch.attack).toBe("jumpPunch");

    const tatsu = beginBufferedAttack(noteAttackPress(createCombatState(), 0), 0, {
      crouching: false,
      airborne: true,
      preferKick: true,
    });
    expect(tatsu.attack).toBe("tatsumaki");
  });

  it("places the hook above the jab, the kick wider, and crouch kick lower", () => {
    const jab = makeHitbox(0, 0, 1, "jab");
    const hook = makeHitbox(0, 0, 1, "hook");
    const kick = makeHitbox(0, 0, 1, "kick");
    const crouchKick = makeHitbox(0, 0, 1, "crouchKick");
    const left = makeHitbox(0, 0, -1, "jab");

    expect(hook.y).toBeLessThan(jab.y);
    expect(kick.width).toBeGreaterThan(jab.width);
    expect(ATTACKS.kick.knockback).toBeGreaterThan(ATTACKS.jab.knockback);
    expect(crouchKick.y).toBeGreaterThan(jab.y);
    expect(left.x).toBeLessThan(0);
    expect(jab.x).toBeGreaterThan(0);
    expect(kick.width).toBeLessThan(60);
    expect(hitboxTouches(kick, { x: 200, y: 0, width: 54, height: 120 })).toBe(false);
    expect(hitboxTouches(jab, { x: -90, y: 0, width: 40, height: 80 })).toBe(false);
    expect(hitboxTouches(jab, { x: 48, y: -14, width: 28, height: 28 })).toBe(true);
  });
});

describe("hurtbox and puppet", () => {
  it("uses a 46×128 stand box and a 46×72 crouch box", () => {
    expect(hurtboxFor(false)).toEqual({ width: HURTBOX_WIDTH, height: STAND_HEIGHT });
    expect(HURTBOX_WIDTH).toBe(46);
    expect(STAND_HEIGHT).toBe(128);
    expect(hurtboxFor(true).height).toBe(CROUCH_HEIGHT);
    expect(CROUCH_HEIGHT).toBe(72);
  });

  it("keeps the idle puppet inside the hurtbox and extends the striking limb", () => {
    const idle = buildJoints(view("idle"));
    const jab = buildJoints(view("jab", 1));
    const hook = buildJoints(view("hook", 1));
    const kick = buildJoints(view("kick", 1));
    const crouch = buildJoints(view("crouch"));

    expect(idle.head.y - idle.head.r).toBeGreaterThanOrEqual(-64);
    expect(idle.footL.y).toBeLessThanOrEqual(64);
    expect(idle.footL.y).toBeGreaterThan(50);
    expect(jab.fistL.x).toBeGreaterThan(idle.fistL.x + 20);
    expect(jab.chest.x).toBeGreaterThan(idle.chest.x);
    expect(jab.head.x).toBeLessThan(jab.chest.x);
    expect(jab.fistR.x).toBeLessThan(idle.fistR.x);
    expect(hook.fistR.y).toBeLessThan(idle.fistR.y);
    expect(hook.pelvis.x).toBeGreaterThan(idle.pelvis.x);
    expect(kick.footR.x).toBeGreaterThan(idle.footR.x + 30);
    expect(kick.chest.x).toBeLessThan(idle.chest.x);
    expect(crouch.head.y).toBeGreaterThan(idle.head.y);
    expect(crouch.footL.y).toBeGreaterThan(26);
    expect(crouch.footL.y).toBeLessThan(34);
    expect(describePose("jab")).toBe("左直拳");
    expect(describePose("kick")).toBe("重踢");
    expect(describePose("jumpPunch")).toBe("跳躍攻擊");
    expect(describePose("tatsumaki")).toBe("旋風腳");
    expect(describePose("crouchPunch")).toBe("蹲下拳");
    expect(describePose("crouchKick")).toBe("蹲下踢");
    expect(describePose("hit")).toBe("受擊");
  });
});

function view(pose: PlayerViewState["pose"], attackAmount = 0): PlayerViewState {
  return {
    x: 0,
    y: 0,
    facing: 1,
    pose,
    breath: 0,
    cycle: 0,
    attackPhase: attackAmount > 0 ? "active" : "done",
    attackAmount,
    showHitboxes: false,
    hurtbox: hurtboxFor(pose === "crouch" || pose === "crouchPunch" || pose === "crouchKick"),
    hitbox: null,
    flicker: false,
    status: describePose(pose),
  };
}
