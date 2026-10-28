import { describe, expect, it } from 'vitest';
import { discardScore } from '../score/hongkongCurve';
import { HONG_KONG_PRESETS } from './hongkong';
import { PAO_MA_PRESETS } from './paoma';

describe('built-in presets', () => {
  it('lists nine hong kong presets with the spec subtitles', () => {
    expect(HONG_KONG_PRESETS.map((preset) => [preset.rules.name, preset.subtitle])).toEqual([
      ['3番4 半辣上', '全銃 · 3番起糊4 · 8番滿糊32'],
      ['3番4 辣辣上', '全銃 · 3番起糊4 · 8番滿糊128'],
      ['二五雞 半辣上', '全銃 · 3番起糊8 · 8番滿糊64'],
      ['二五雞 辣辣上', '全銃 · 3番起糊8 · 8番滿糊256'],
      ['五一 半辣上', '全銃 · 3番起糊16 · 8番滿糊128'],
      ['五一 辣辣上', '全銃 · 3番起糊16 · 8番滿糊512'],
      ['一二蚊 半辣上', '全銃 · 3番起糊32 · 8番滿糊256'],
      ['一二蚊 辣辣上', '全銃 · 3番起糊32 · 8番滿糊1024'],
      ['3番4 半辣上 (三人)', '三麻 · 全銃 · 3番起糊3 · 8番滿糊24'],
    ]);
    for (const preset of HONG_KONG_PRESETS) {
      expect(preset.rules.chongMode).toBe('full');
      expect(preset.rules.minFan).toBe(3);
      expect(preset.rules.maxFan).toBe(8);
      expect(preset.rules.selfDrawFactor).toBe(1.5);
      expect(preset.rules.jackpotEnabled).toBe(false);
      expect(preset.rules.recordDealer).toBe(true);
      expect(preset.rules.recordWind).toBe(true);
      const capped = discardScore(preset.rules.maxFan, preset.rules);
      expect(preset.subtitle.endsWith(`滿糊${capped}`)).toBe(true);
    }
    expect(HONG_KONG_PRESETS.filter((preset) => preset.rules.playerCount === 3)).toHaveLength(1);
  });

  it('lists six pao ma presets', () => {
    expect(PAO_MA_PRESETS.map((preset) => [preset.rules.name, preset.subtitle, preset.rules.playerCount])).toEqual([
      ['1/2', '明槓每位1 · 自模2', 4],
      ['5/10', '明槓每位5 · 自模10', 4],
      ['10/20', '明槓每位10 · 自模20', 4],
      ['50/100', '明槓每位50 · 自模100', 4],
      ['100/200', '明槓每位100 · 自模200', 4],
      ['1/2 (三人)', '三麻 · 明槓每位1 · 自模2', 3],
    ]);
    for (const preset of PAO_MA_PRESETS) {
      expect(preset.rules.horse).toBe(preset.rules.hu);
      expect(preset.rules.baoSelfDraw).toBe(true);
      expect(preset.rules.recordDealer).toBe(true);
      expect(preset.rules.douDiZhuEnabled).toBe(false);
      expect(preset.rules.horseCountMax).toBe(8);
    }
  });
});
