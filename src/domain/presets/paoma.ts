import type { PaoMaRules } from '../types';

export interface PaoMaPreset {
  id: string;
  subtitle: string;
  rules: PaoMaRules;
}

function rules(
  partial: Pick<PaoMaRules, 'name' | 'kong' | 'hu' | 'horse' | 'playerCount'>,
): PaoMaRules {
  return {
    mode: 'paoma',
    horseCountMax: 8,
    baoSelfDraw: true,
    recordDealer: true,
    douDiZhuEnabled: false,
    ...partial,
  };
}

function subtitle(kong: number, hu: number, playerCount: 3 | 4): string {
  const core = `明槓每位${kong} · 自模${hu}`;
  return playerCount === 3 ? `三麻 · ${core}` : core;
}

function preset(
  id: string,
  name: string,
  kong: number,
  hu: number,
  playerCount: 3 | 4,
): PaoMaPreset {
  return {
    id,
    subtitle: subtitle(kong, hu, playerCount),
    rules: rules({ name, kong, hu, horse: hu, playerCount }),
  };
}

export const PAO_MA_PRESETS: PaoMaPreset[] = [
  preset('pm-1-2', '1/2', 1, 2, 4),
  preset('pm-5-10', '5/10', 5, 10, 4),
  preset('pm-10-20', '10/20', 10, 20, 4),
  preset('pm-50-100', '50/100', 50, 100, 4),
  preset('pm-100-200', '100/200', 100, 200, 4),
  preset('pm-1-2-3p', '1/2 (三人)', 1, 2, 3),
];

export function blankPaoMaRules(): PaoMaRules {
  return rules({ name: '', kong: 1, hu: 2, horse: 2, playerCount: 4 });
}
