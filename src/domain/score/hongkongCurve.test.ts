import { describe, expect, it } from 'vitest';
import { HONG_KONG_PRESETS } from '../presets/hongkong';
import type { HongKongRules } from '../types';
import { discardScore, halfDoubleMultiplier, selfDrawPayPerLoser } from './hongkongCurve';

const TABLE: Record<string, number[]> = {
  'hk-3f4-half': [4, 8, 12, 16, 24, 32],
  'hk-3f4-full': [4, 8, 16, 32, 64, 128],
  'hk-25-half': [8, 16, 24, 32, 48, 64],
  'hk-25-full': [8, 16, 32, 64, 128, 256],
  'hk-51-half': [16, 32, 48, 64, 96, 128],
  'hk-51-full': [16, 32, 64, 128, 256, 512],
  'hk-12-half': [32, 64, 96, 128, 192, 256],
  'hk-12-full': [32, 64, 128, 256, 512, 1024],
  'hk-3f4-half-3p': [3, 6, 9, 12, 18, 24],
};

describe('hong kong score table', () => {
  it('matches every preset from fan 3 through fan 8', () => {
    expect(HONG_KONG_PRESETS.map((preset) => preset.id)).toEqual(Object.keys(TABLE));
    for (const preset of HONG_KONG_PRESETS) {
      const expected = TABLE[preset.id];
      const scores = [3, 4, 5, 6, 7, 8].map((fan) => discardScore(fan, preset.rules));
      expect(scores, preset.id).toEqual(expected);
      expect(preset.subtitle).toContain(`滿糊${expected?.[5]}`);
    }
  });

  it('charges 二五雞辣辣 self-draw at 1.5× rounded to an integer', () => {
    const rules = HONG_KONG_PRESETS.find((preset) => preset.id === 'hk-25-full')?.rules;
    if (!rules) throw new Error('preset');
    expect(rules.selfDrawFactor).toBe(1.5);
    expect([3, 4, 5, 6, 7, 8].map((fan) => selfDrawPayPerLoser(fan, rules))).toEqual([
      12, 24, 48, 96, 192, 384,
    ]);
  });

  it('extends the half-double ladder by doubling every two steps', () => {
    expect([0, 1, 2, 3, 4, 5].map(halfDoubleMultiplier)).toEqual([1, 2, 3, 4, 6, 8]);
    expect(halfDoubleMultiplier(6)).toBe(12);
    expect(halfDoubleMultiplier(7)).toBe(16);
    expect(halfDoubleMultiplier(8)).toBe(24);
  });

  it('rejects a fan outside the selected range', () => {
    const rules: HongKongRules = HONG_KONG_PRESETS[0].rules;
    expect(() => discardScore(2, rules)).toThrow(/番數/);
    expect(() => discardScore(9, rules)).toThrow(/番數/);
    expect(() => halfDoubleMultiplier(-1)).toThrow(/fan/);
  });
});
