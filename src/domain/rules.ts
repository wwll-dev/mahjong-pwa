import type { HongKongRules, PaoMaRules, Rules } from './types';

export function cloneRules<T extends Rules>(rules: T): T {
  return JSON.parse(JSON.stringify(rules)) as T;
}

export function rulesError(rules: Rules): string | null {
  const name = rules.name.trim();
  if (name.length > 24) return '玩法名稱太長';
  if (rules.playerCount !== 3 && rules.playerCount !== 4) return '請選人數';
  if (rules.mode === 'hongkong') return hongKongError(rules);
  return paoMaError(rules);
}

function hongKongError(rules: HongKongRules): string | null {
  if (rules.chongMode !== 'full' && rules.chongMode !== 'half') return '請選銃法';
  if (rules.curve !== 'halfDouble' && rules.curve !== 'fullDouble') return '請選曲線';
  if (!Number.isInteger(rules.minFan) || !Number.isInteger(rules.maxFan)) return '番數要係整數';
  if (rules.minFan < 1 || rules.maxFan > 13 || rules.minFan > rules.maxFan) return '番數範圍無效';
  if (!Number.isInteger(rules.startScore) || rules.startScore <= 0) return '起糊分要係正整數';
  if (!Number.isFinite(rules.selfDrawFactor) || rules.selfDrawFactor <= 0) return '自摸倍數要大過 0';
  return null;
}

function paoMaError(rules: PaoMaRules): string | null {
  if (!Number.isInteger(rules.kong) || rules.kong <= 0) return '槓分要係正整數';
  if (!Number.isInteger(rules.hu) || rules.hu <= 0) return '食糊分要係正整數';
  if (!Number.isInteger(rules.horse) || rules.horse <= 0) return '獎馬要係正整數';
  if (!Number.isInteger(rules.horseCountMax) || rules.horseCountMax < 0 || rules.horseCountMax > 8) {
    return '中馬上限要係 0 至 8';
  }
  return null;
}

export function recordWindOf(rules: Rules): boolean {
  return rules.mode === 'hongkong' && rules.recordWind;
}

export function rulesTitle(rules: Rules): string {
  const name = rules.name.trim();
  if (name) return name;
  return rules.mode === 'hongkong' ? '港麻' : '跑馬仔';
}
