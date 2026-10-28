import type { FanPick } from './types';

export type FanGroup = '基礎' | '番子' | '型' | '特例';

export interface FanPattern {
  id: string;
  name: string;
  fan: number;
  group: FanGroup;
  /** Repeatable tiles (dragons, own winds). Absent means a single toggle. */
  maxCount?: number;
}

export const FAN_GROUPS: readonly FanGroup[] = ['基礎', '番子', '型', '特例'];

/** Common Hong Kong patterns. Suggested fans only — the table does not see the tiles. */
export const FAN_CATALOG: readonly FanPattern[] = [
  { id: 'chicken', name: '雞糊／平糊', fan: 0, group: '基礎' },
  { id: 'zimo', name: '自摸', fan: 1, group: '基礎' },
  { id: 'menqing', name: '門清', fan: 1, group: '基礎' },
  { id: 'noflower', name: '無花', fan: 1, group: '基礎' },
  { id: 'zhong', name: '紅中', fan: 1, group: '番子', maxCount: 3 },
  { id: 'fa', name: '發財', fan: 1, group: '番子', maxCount: 3 },
  { id: 'bai', name: '白板', fan: 1, group: '番子', maxCount: 3 },
  { id: 'wind-own', name: '圈風／門風', fan: 1, group: '番子', maxCount: 3 },
  { id: 'pengpeng', name: '對對糊', fan: 3, group: '型' },
  { id: 'hunyise', name: '混一色', fan: 3, group: '型' },
  { id: 'qingyise', name: '清一色', fan: 7, group: '型' },
  { id: 'xiaosanyuan', name: '小三元', fan: 5, group: '型' },
  { id: 'dasanyuan', name: '大三元', fan: 8, group: '型' },
  { id: 'xiaosixi', name: '小四喜', fan: 6, group: '型' },
  { id: 'dasixi', name: '大四喜', fan: 13, group: '型' },
  { id: 'ziyise', name: '字一色', fan: 10, group: '型' },
  { id: 'shisanyao', name: '十三幺', fan: 13, group: '型' },
  { id: 'tianhu', name: '天糊', fan: 8, group: '特例' },
  { id: 'dihu', name: '地糊', fan: 8, group: '特例' },
  { id: 'gangshang', name: '槓上自摸', fan: 1, group: '特例' },
  { id: 'qianggang', name: '搶槓', fan: 1, group: '特例' },
  { id: 'hai-di', name: '海底撈月', fan: 1, group: '特例' },
];

export function fanSelectionSum(picks: readonly FanPick[]): number {
  return picks.reduce((total, pick) => {
    const count = pick.count ?? 1;
    if (!Number.isInteger(count) || count <= 0) return total;
    return total + pick.fan * count;
  }, 0);
}

export function clampFan(sum: number, minFan: number, maxFan: number): number {
  if (sum < minFan) return minFan;
  if (sum > maxFan) return maxFan;
  return sum;
}

export interface FanSuggestion {
  sum: number;
  fan: number;
  overMax: boolean;
  underMin: boolean;
}

/** Sum selected patterns, then clamp into the table's min/max fan. */
export function suggestFan(picks: readonly FanPick[], minFan: number, maxFan: number): FanSuggestion {
  const sum = fanSelectionSum(picks);
  return {
    sum,
    fan: clampFan(sum, minFan, maxFan),
    overMax: sum > maxFan,
    underMin: sum < minFan,
  };
}

export function fanPatternName(id: string): string {
  return FAN_CATALOG.find((pattern) => pattern.id === id)?.name ?? id;
}
