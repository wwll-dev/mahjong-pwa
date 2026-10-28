import type { HongKongRules } from '../types';

/** 半辣上：index 0–5 對 1,2,3,4,6,8；之後每兩級再 ×2。 */
export function halfDoubleMultiplier(index: number): number {
  if (!Number.isInteger(index) || index < 0) throw new Error('fan < min');
  if (index <= 5) return [1, 2, 3, 4, 6, 8][index] as number;
  return halfDoubleMultiplier(index - 2) * 2;
}

export function discardScore(fan: number, rules: HongKongRules): number {
  if (!Number.isInteger(fan) || fan < rules.minFan || fan > rules.maxFan) {
    throw new Error('番數超出範圍');
  }
  const index = fan - rules.minFan;
  if (rules.curve === 'fullDouble') return rules.startScore * (2 ** index);
  return rules.startScore * halfDoubleMultiplier(index);
}

export function selfDrawPayPerLoser(fan: number, rules: HongKongRules): number {
  return Math.round(discardScore(fan, rules) * rules.selfDrawFactor);
}

export interface ScoreRow {
  fan: number;
  discard: number;
  selfDraw: number;
}

export function scoreTable(rules: HongKongRules): ScoreRow[] {
  const rows: ScoreRow[] = [];
  for (let fan = rules.minFan; fan <= rules.maxFan; fan += 1) {
    rows.push({
      fan,
      discard: discardScore(fan, rules),
      selfDraw: selfDrawPayPerLoser(fan, rules),
    });
  }
  return rows;
}

export function formatFactor(factor: number): string {
  return factor.toFixed(2);
}
