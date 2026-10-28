import { describe, expect, it } from 'vitest';
import { legacyHongKongDeltas, legacyPaoMaDeltas, type LegacyWinInput } from './legacyScore';
import type { SeatRef } from './types';

const players: SeatRef[] = [
  { id: 'w', seatIndex: 0 },
  { id: 'o1', seatIndex: 1 },
  { id: 'd', seatIndex: 2 },
  { id: 'o2', seatIndex: 3 },
];

function win(partial: Partial<LegacyWinInput> & Pick<LegacyWinInput, 'winType'>): LegacyWinInput {
  return { winnerId: 'w', fan: 3, ...partial };
}

describe('part 1 formulas', () => {
  it('keeps the old hong kong full, half, and self-draw cases', () => {
    const rules = { mode: 'hongkong' as const, baseScore: 1, chongMode: 'full' as const, selfDrawMultiplier: 2 };
    expect(legacyHongKongDeltas(players, rules, win({ winType: 'discard', discarderId: 'd' }))).toEqual({
      w: 3, d: -3, o1: 0, o2: 0,
    });
    expect(legacyHongKongDeltas(players, { ...rules, chongMode: 'half' }, win({
      winType: 'discard',
      discarderId: 'd',
      fan: 3,
    }))).toEqual({ w: 3, d: -2, o1: -1, o2: 0 });
    expect(legacyHongKongDeltas(players, rules, win({ winType: 'selfDraw', fan: 2 }))).toEqual({
      w: 12, o1: -4, d: -4, o2: -4,
    });
  });

  it('keeps the old pao ma discard and bao cases', () => {
    const rules = { mode: 'paoma' as const, baseScore: 1, horseCount: 8, horseUnit: 1, baoSelfDraw: true };
    expect(legacyPaoMaDeltas(players, rules, {
      winnerId: 'w',
      winType: 'discard',
      discarderId: 'd',
      horsesHit: 2,
    })).toEqual({ w: 3, d: -3, o1: 0, o2: 0 });
    expect(legacyPaoMaDeltas(players, rules, {
      winnerId: 'w',
      winType: 'selfDraw',
      horsesHit: 2,
      baoPlayerId: 'o2',
    })).toEqual({ w: 9, o2: -9, o1: 0, d: 0 });
  });
});
