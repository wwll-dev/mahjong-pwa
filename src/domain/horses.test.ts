import { describe, expect, it } from 'vitest';
import { PAO_MA_PRESETS } from './presets/paoma';
import { paoMaDeltas } from './score/paomaPay';
import { HORSE_HIT_P, flipHorses, horseBonus, horsesHitCount } from './horses';

describe('horse flip', () => {
  it('counts hits into H', () => {
    expect(HORSE_HIT_P).toBe(0.25);
    const horses = [true, false, true, false, false, true, false, false];
    const hit = horsesHitCount(horses);
    expect(hit).toBe(3);
    expect(horseBonus(2, hit)).toBe(6);
    const deltas = paoMaDeltas(
      [
        { id: 'k', seatIndex: 0 },
        { id: 'a', seatIndex: 1 },
        { id: 'd', seatIndex: 2 },
        { id: 'b', seatIndex: 3 },
      ],
      { ...PAO_MA_PRESETS[0].rules, hu: 2, horse: 2 },
      { winnerId: 'k', winType: 'discard', discarderId: 'd', horsesHit: hit },
    );
    expect(deltas).toEqual({ k: 8, d: -8, a: 0, b: 0 });
  });

  it('flips each horse independently at p = 0.25', () => {
    expect(flipHorses(4, () => 0.24)).toEqual([true, true, true, true]);
    expect(flipHorses(4, () => 0.25)).toEqual([false, false, false, false]);
    expect(flipHorses(0, () => 0)).toEqual([]);
  });
});
