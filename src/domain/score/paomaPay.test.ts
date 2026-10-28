import { describe, expect, it } from 'vitest';
import { sumDeltas } from '../deltas';
import { PAO_MA_PRESETS } from '../presets/paoma';
import type { PaoMaRules, SeatRef } from '../types';
import { paoMaDeltas, paoMaKongDeltas } from './paomaPay';

const four: SeatRef[] = [
  { id: 'k', seatIndex: 0 },
  { id: 'a', seatIndex: 1 },
  { id: 'd', seatIndex: 2 },
  { id: 'b', seatIndex: 3 },
];

const three: SeatRef[] = [
  { id: 'w', seatIndex: 0 },
  { id: 'b', seatIndex: 1 },
  { id: 'o', seatIndex: 2 },
];

function rules(overrides: Partial<PaoMaRules> = {}): PaoMaRules {
  return { ...PAO_MA_PRESETS[0].rules, ...overrides };
}

describe('pao ma payments', () => {
  it('exposed kong of 1 pays the kong player +3 and each other -1', () => {
    const deltas = paoMaKongDeltas(four, rules({ kong: 1 }), 'k');
    expect(deltas).toEqual({ k: 3, a: -1, d: -1, b: -1 });
    expect(sumDeltas(deltas)).toBe(0);
  });

  it('discard hu=2 with one horse at 2 pays 4', () => {
    const deltas = paoMaDeltas(four, rules({ hu: 2, horse: 2 }), {
      winnerId: 'k',
      winType: 'discard',
      discarderId: 'd',
      horsesHit: 1,
    });
    expect(deltas).toEqual({ k: 4, d: -4, a: 0, b: 0 });
    expect(sumDeltas(deltas)).toBe(0);
  });

  it('bao self draw at a 3-player table charges the bao player 2×(hu+H)', () => {
    const deltas = paoMaDeltas(three, rules({ playerCount: 3, hu: 2, horse: 2, baoSelfDraw: true }), {
      winnerId: 'w',
      winType: 'selfDraw',
      baoPlayerId: 'b',
      horsesHit: 1,
    });
    expect(deltas).toEqual({ w: 8, b: -8, o: 0 });
    expect(deltas.b).toBe(-2 * (2 + 2));
    expect(sumDeltas(deltas)).toBe(0);
  });

  it('splits an unclaimed self draw across the other players', () => {
    const deltas = paoMaDeltas(four, rules({ baoSelfDraw: false, hu: 2, horse: 2 }), {
      winnerId: 'k',
      winType: 'selfDraw',
      horsesHit: 0,
    });
    expect(deltas).toEqual({ k: 6, a: -2, d: -2, b: -2 });
  });

  it('leaves deltas unchanged when 鬥地主 is enabled', () => {
    const input = {
      winnerId: 'k' as const,
      winType: 'discard' as const,
      discarderId: 'd',
      horsesHit: 1,
    };
    const off = paoMaDeltas(four, rules({ douDiZhuEnabled: false, hu: 2, horse: 2 }), input);
    const on = paoMaDeltas(four, rules({ douDiZhuEnabled: true, hu: 2, horse: 2 }), input);
    expect(on).toEqual(off);
    expect(paoMaKongDeltas(four, rules({ douDiZhuEnabled: true }), 'k')).toEqual(
      paoMaKongDeltas(four, rules({ douDiZhuEnabled: false }), 'k'),
    );
  });

  it('exposed kong without a discarder charges every other player', () => {
    const deltas = paoMaKongDeltas(four, rules({ kong: 1 }), 'k', { kongKind: 'ming' });
    expect(deltas).toEqual({ k: 3, a: -1, d: -1, b: -1 });
    expect(sumDeltas(deltas)).toBe(0);
  });

  it('bao-kong charges only the discarder (N-1)*K', () => {
    const deltas = paoMaKongDeltas(four, rules({ kong: 2 }), 'k', { kongKind: 'ming', discarderId: 'd' });
    expect(deltas).toEqual({ k: 6, d: -6, a: 0, b: 0 });
    expect(sumDeltas(deltas)).toBe(0);
  });

  it('concealed kong charges 2K and added kong matches an unclaimed exposed kong', () => {
    const concealed = paoMaKongDeltas(four, rules({ kong: 1 }), 'k', { kongKind: 'an', discarderId: 'd' });
    expect(concealed).toEqual({ k: 6, a: -2, d: -2, b: -2 });
    const added = paoMaKongDeltas(four, rules({ kong: 1 }), 'k', { kongKind: 'jia', discarderId: 'd' });
    const exposed = paoMaKongDeltas(four, rules({ kong: 1 }), 'k', { kongKind: 'ming' });
    expect(added).toEqual(exposed);
    expect(sumDeltas(concealed)).toBe(0);
  });

  it('rejects horses above the limit and a bao player who won', () => {
    expect(() => paoMaDeltas(four, rules({ horseCountMax: 2 }), {
      winnerId: 'k',
      winType: 'discard',
      discarderId: 'd',
      horsesHit: 3,
    })).toThrow(/中馬/);
    expect(() => paoMaDeltas(four, rules(), {
      winnerId: 'k',
      winType: 'selfDraw',
      horsesHit: 0,
      baoPlayerId: 'k',
    })).toThrow(/包家/);
  });
});
