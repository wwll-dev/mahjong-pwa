import { describe, expect, it } from 'vitest';
import { paoMaDeltas, sumDeltas } from './score';
import type { PaoMaRules, SeatRef } from './types';

const players: SeatRef[] = [
  { id: 'w', seatIndex: 0 },
  { id: 'a', seatIndex: 1 },
  { id: 'd', seatIndex: 2 },
  { id: 'b', seatIndex: 3 },
];

const rules = (overrides: Partial<PaoMaRules> = {}): PaoMaRules => ({
  mode: 'paoma',
  baseScore: 1,
  horseCount: 8,
  horseUnit: 1,
  baoSelfDraw: true,
  ...overrides,
});

describe('pao ma scoring', () => {
  it('discard with S=1 and H=2 pays 3', () => {
    const deltas = paoMaDeltas(players, rules(), {
      winnerId: 'w',
      winType: 'discard',
      discarderId: 'd',
      horsesHit: 2,
    });
    expect(deltas).toEqual({ w: 3, d: -3, a: 0, b: 0 });
    expect(sumDeltas(deltas)).toBe(0);
  });

  it('self draw without bao splits S+H across the other three', () => {
    const deltas = paoMaDeltas(players, rules({ baoSelfDraw: false }), {
      winnerId: 'w',
      winType: 'selfDraw',
      horsesHit: 2,
    });
    expect(deltas).toEqual({ w: 9, a: -3, d: -3, b: -3 });
    expect(sumDeltas(deltas)).toBe(0);
  });

  it('bao self draw makes the chosen player pay the full 3*(S+H)', () => {
    const deltas = paoMaDeltas(players, rules({ baoSelfDraw: true }), {
      winnerId: 'w',
      winType: 'selfDraw',
      horsesHit: 2,
      baoPlayerId: 'b',
    });
    expect(deltas).toEqual({ w: 9, b: -9, a: 0, d: 0 });
    expect(sumDeltas(deltas)).toBe(0);
  });

  it('rejects horses above the table limit and a bao player who won', () => {
    expect(() => paoMaDeltas(players, rules({ horseCount: 2 }), {
      winnerId: 'w',
      winType: 'discard',
      discarderId: 'd',
      horsesHit: 3,
    })).toThrow(/中馬/);
    expect(() => paoMaDeltas(players, rules(), {
      winnerId: 'w',
      winType: 'selfDraw',
      horsesHit: 0,
      baoPlayerId: 'w',
    })).toThrow(/包家/);
  });
});
