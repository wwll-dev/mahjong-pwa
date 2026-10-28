import { describe, expect, it } from 'vitest';
import { hongKongDeltas, sumDeltas, type WinInput } from './score';
import type { HongKongRules, SeatRef } from './types';

const players: SeatRef[] = [
  { id: 'w', seatIndex: 0 },
  { id: 'o1', seatIndex: 1 },
  { id: 'd', seatIndex: 2 },
  { id: 'o2', seatIndex: 3 },
];

const rules = (overrides: Partial<HongKongRules> = {}): HongKongRules => ({
  mode: 'hongkong',
  baseScore: 1,
  chongMode: 'full',
  selfDrawMultiplier: 2,
  ...overrides,
});

function win(partial: Partial<WinInput> & Pick<WinInput, 'winType'>): WinInput {
  return { winnerId: 'w', fan: 3, ...partial };
}

describe('hong kong scoring', () => {
  it('full chong fan=3 base=1 pays the winner +3 and the discarder -3', () => {
    const deltas = hongKongDeltas(players, rules(), win({ winType: 'discard', discarderId: 'd' }));
    expect(deltas).toEqual({ w: 3, d: -3, o1: 0, o2: 0 });
    expect(sumDeltas(deltas)).toBe(0);
  });

  it('half chong S=3 splits the remainder by seat order', () => {
    const deltas = hongKongDeltas(
      players,
      rules({ chongMode: 'half' }),
      win({ winType: 'discard', discarderId: 'd', fan: 3 }),
    );
    expect(deltas).toEqual({ w: 3, d: -2, o1: -1, o2: 0 });
    expect(sumDeltas(deltas)).toBe(0);
  });

  it('half chong S=4 gives the discarder -2 and each other -1', () => {
    const deltas = hongKongDeltas(
      players,
      rules({ chongMode: 'half', baseScore: 1 }),
      win({ winType: 'discard', discarderId: 'd', fan: 4 }),
    );
    expect(deltas).toEqual({ w: 4, d: -2, o1: -1, o2: -1 });
    expect(sumDeltas(deltas)).toBe(0);
  });

  it('self draw fan=2 base=1 multiplier=2 charges every other player 4', () => {
    const deltas = hongKongDeltas(
      players,
      rules(),
      win({ winType: 'selfDraw', fan: 2 }),
    );
    expect(deltas).toEqual({ w: 12, o1: -4, d: -4, o2: -4 });
    expect(sumDeltas(deltas)).toBe(0);
  });

  it('rejects a discarder who is also the winner', () => {
    expect(() => hongKongDeltas(
      players,
      rules(),
      win({ winType: 'discard', discarderId: 'w' }),
    )).toThrow(/出銃/);
  });
});
