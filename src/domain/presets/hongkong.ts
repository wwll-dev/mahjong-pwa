import type { HongKongRules } from '../types';

export interface HongKongPreset {
  id: string;
  subtitle: string;
  rules: HongKongRules;
}

function rules(partial: Pick<HongKongRules, 'name' | 'curve' | 'startScore' | 'playerCount'>): HongKongRules {
  return {
    mode: 'hongkong',
    chongMode: 'full',
    minFan: 3,
    maxFan: 8,
    selfDrawFactor: 1.5,
    jackpotEnabled: false,
    recordDealer: true,
    recordWind: true,
    jackpotAnte: partial.startScore,
    ...partial,
  };
}

export const HONG_KONG_PRESETS: HongKongPreset[] = [
  {
    id: 'hk-3f4-half',
    subtitle: '全銃 · 3番起糊4 · 8番滿糊32',
    rules: rules({ name: '3番4 半辣上', curve: 'halfDouble', startScore: 4, playerCount: 4 }),
  },
  {
    id: 'hk-3f4-full',
    subtitle: '全銃 · 3番起糊4 · 8番滿糊128',
    rules: rules({ name: '3番4 辣辣上', curve: 'fullDouble', startScore: 4, playerCount: 4 }),
  },
  {
    id: 'hk-25-half',
    subtitle: '全銃 · 3番起糊8 · 8番滿糊64',
    rules: rules({ name: '二五雞 半辣上', curve: 'halfDouble', startScore: 8, playerCount: 4 }),
  },
  {
    id: 'hk-25-full',
    subtitle: '全銃 · 3番起糊8 · 8番滿糊256',
    rules: rules({ name: '二五雞 辣辣上', curve: 'fullDouble', startScore: 8, playerCount: 4 }),
  },
  {
    id: 'hk-51-half',
    subtitle: '全銃 · 3番起糊16 · 8番滿糊128',
    rules: rules({ name: '五一 半辣上', curve: 'halfDouble', startScore: 16, playerCount: 4 }),
  },
  {
    id: 'hk-51-full',
    subtitle: '全銃 · 3番起糊16 · 8番滿糊512',
    rules: rules({ name: '五一 辣辣上', curve: 'fullDouble', startScore: 16, playerCount: 4 }),
  },
  {
    id: 'hk-12-half',
    subtitle: '全銃 · 3番起糊32 · 8番滿糊256',
    rules: rules({ name: '一二蚊 半辣上', curve: 'halfDouble', startScore: 32, playerCount: 4 }),
  },
  {
    id: 'hk-12-full',
    subtitle: '全銃 · 3番起糊32 · 8番滿糊1024',
    rules: rules({ name: '一二蚊 辣辣上', curve: 'fullDouble', startScore: 32, playerCount: 4 }),
  },
  {
    id: 'hk-3f4-half-3p',
    subtitle: '三麻 · 全銃 · 3番起糊3 · 8番滿糊24',
    rules: rules({ name: '3番4 半辣上 (三人)', curve: 'halfDouble', startScore: 3, playerCount: 3 }),
  },
];

export function blankHongKongRules(): HongKongRules {
  return rules({ name: '', curve: 'halfDouble', startScore: 4, playerCount: 4 });
}
