import { describe, expect, it } from 'vitest';
import { FAN_CATALOG, clampFan, fanSelectionSum, suggestFan } from './fanCatalog';

describe('FanPicker sum and clamp', () => {
  it('sums toggles and repeatable dragon counts', () => {
    const sum = fanSelectionSum([
      { id: 'pengpeng', fan: 3 },
      { id: 'zhong', fan: 1, count: 2 },
      { id: 'fa', fan: 1, count: 1 },
      { id: 'chicken', fan: 0 },
      { id: 'bai', fan: 1, count: 0 },
    ]);
    expect(sum).toBe(6);
    expect(suggestFan([
      { id: 'pengpeng', fan: 3 },
      { id: 'zhong', fan: 1, count: 2 },
    ], 3, 8)).toEqual({ sum: 5, fan: 5, overMax: false, underMin: false });
  });

  it('clamps a short selection up to min fan and a long one down to max fan', () => {
    const short = suggestFan([{ id: 'zimo', fan: 1 }], 3, 8);
    expect(short.sum).toBe(1);
    expect(short.fan).toBe(3);
    expect(short.underMin).toBe(true);
    expect(clampFan(0, 3, 8)).toBe(3);

    const long = suggestFan([
      { id: 'dasixi', fan: 13 },
      { id: 'qingyise', fan: 7 },
    ], 3, 8);
    expect(long.sum).toBe(20);
    expect(long.fan).toBe(8);
    expect(long.overMax).toBe(true);
    expect(clampFan(20, 3, 8)).toBe(8);
  });

  it('lists the common patterns, including separate dragon rows', () => {
    expect(FAN_CATALOG.map((pattern) => pattern.name)).toEqual([
      '雞糊／平糊',
      '自摸',
      '門清',
      '無花',
      '紅中',
      '發財',
      '白板',
      '圈風／門風',
      '對對糊',
      '混一色',
      '清一色',
      '小三元',
      '大三元',
      '小四喜',
      '大四喜',
      '字一色',
      '十三幺',
      '天糊',
      '地糊',
      '槓上自摸',
      '搶槓',
      '海底撈月',
    ]);
    expect(FAN_CATALOG.find((pattern) => pattern.id === 'zhong')?.maxCount).toBe(3);
  });
});
