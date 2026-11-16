export const PLAYER_MAX_HP = 50;

export interface RunSnapshot {
  hp: number;
  stageClearCount: number;
}

let hp = PLAYER_MAX_HP;
let stageClearCount = 0;

export function resetRun(): void {
  hp = PLAYER_MAX_HP;
  stageClearCount = 0;
}

export function getHp(): number {
  return hp;
}

export function getMaxHp(): number {
  return PLAYER_MAX_HP;
}

export function applyDamage(amount: number): { hp: number; dealt: number; dead: boolean } {
  const dealt = Math.max(0, Math.min(amount, hp));
  hp -= dealt;
  return { hp, dealt, dead: hp <= 0 };
}

export function markStageCleared(): void {
  stageClearCount += 1;
}

export function getStageClearCount(): number {
  return stageClearCount;
}

export function snapshot(): RunSnapshot {
  return { hp, stageClearCount };
}
