import { describe, expect, it } from 'vitest';
import { HONG_KONG_PRESETS } from '../presets/hongkong';
import { sumDeltas } from '../deltas';
import type { HongKongRules, SeatRef } from '../types';
import { hongKongDeltas } from './hongkongPay';

const four: SeatRef[] = [
  { id: 'w', seatIndex: 0 },
  { id: 'o1', seatIndex: 1 },
  { id: 'd', seatIndex: 2 },
  { id: 'o2', seatIndex: 3 },
];

const three: SeatRef[] = [
  { id: 'w', seatIndex: 0 },
  { id: 'd', seatIndex: 1 },
  { id: 'o', seatIndex: 2 },
];

function rules(overrides: Partial<HongKongRules> = {}): HongKongRules {
  return {
    ...HONG_KONG_PRESETS[0].rules,
    startScore: 3,
    minFan: 3,
    maxFan: 8,
    curve: 'fullDouble',
    selfDrawFactor: 1.5,
    ...overrides,
  };
}

describe('hong kong payments', () => {
  it('full chong pays the discarder the whole lookup score', () => {
    const deltas = hongKongDeltas(four, rules(), {
      winnerId: 'w',
      winType: 'discard',
      discarderId: 'd',
      fan: 3,
    });
    expect(deltas).toEqual({ w: 3, d: -3, o1: 0, o2: 0 });
    expect(sumDeltas(deltas)).toBe(0);
  });

  it('half chong with S=3 charges the discarder 2 and the others 1 altogether', () => {
    const deltas = hongKongDeltas(four, rules({ chongMode: 'half' }), {
      winnerId: 'w',
      winType: 'discard',
      discarderId: 'd',
      fan: 3,
    });
    expect(deltas.d).toBe(-2);
    expect(deltas.w).toBe(3);
    expect(deltas.o1 + deltas.o2).toBe(-1);
    expect(deltas).toEqual({ w: 3, d: -2, o1: -1, o2: 0 });
    expect(sumDeltas(deltas)).toBe(0);
  });

  it('splits a half-chong remainder of 2 across both other seats', () => {
    const deltas = hongKongDeltas(four, rules({ chongMode: 'half', startScore: 4 }), {
      winnerId: 'w',
      winType: 'discard',
      discarderId: 'd',
      fan: 3,
    });
    expect(deltas).toEqual({ w: 4, d: -2, o1: -1, o2: -1 });
  });

  it('self draw collects from every non-winner at a 4-player and a 3-player table', () => {
    const base = rules({ startScore: 8, curve: 'fullDouble' });
    const fourPay = hongKongDeltas(four, base, { winnerId: 'w', winType: 'selfDraw', fan: 3 });
    expect(fourPay).toEqual({ w: 36, o1: -12, d: -12, o2: -12 });
    const threeRules = rules({ ...base, playerCount: 3 });
    const threePay = hongKongDeltas(three, threeRules, { winnerId: 'w', winType: 'selfDraw', fan: 3 });
    expect(threePay).toEqual({ w: 24, d: -12, o: -12 });
    expect(Object.values(fourPay).filter((value) => value < 0)).toHaveLength(3);
    expect(Object.values(threePay).filter((value) => value < 0)).toHaveLength(2);
    expect(sumDeltas(fourPay)).toBe(0);
    expect(sumDeltas(threePay)).toBe(0);
  });

  it('leaves deltas unchanged when jackpot is enabled', () => {
    const input = { winnerId: 'w' as const, winType: 'discard' as const, discarderId: 'd', fan: 3 };
    const off = hongKongDeltas(four, rules({ jackpotEnabled: false }), input);
    const on = hongKongDeltas(four, rules({ jackpotEnabled: true }), input);
    expect(on).toEqual(off);
  });

  it('rejects a discarder who also won', () => {
    expect(() => hongKongDeltas(four, rules(), {
      winnerId: 'w',
      winType: 'discard',
      discarderId: 'w',
      fan: 3,
    })).toThrow(/出銃/);
  });
});
