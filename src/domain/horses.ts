/** UX convenience, not a real wall-tile probability. Each horse is an independent flip. */
export const HORSE_HIT_P = 0.25;

export function horsesHitCount(horses: readonly boolean[]): number {
  return horses.reduce((count, hit) => count + (hit ? 1 : 0), 0);
}

/** H in the Pao Ma Zai win formula. */
export function horseBonus(horse: number, horsesHit: number): number {
  return horsesHit * horse;
}

export function randomUnit(): number {
  const cryptoObj = globalThis.crypto;
  if (typeof cryptoObj?.getRandomValues === 'function') {
    const buf = new Uint32Array(1);
    cryptoObj.getRandomValues(buf);
    return (buf[0] ?? 0) / 4294967296;
  }
  return Math.random();
}

export function flipHorses(count: number, random: () => number = randomUnit): boolean[] {
  const size = Number.isInteger(count) && count > 0 ? count : 0;
  return Array.from({ length: size }, () => random() < HORSE_HIT_P);
}
