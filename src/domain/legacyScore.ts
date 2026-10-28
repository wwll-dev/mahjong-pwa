import type { PlayerId, SeatRef } from './types';

/** Part 1 formulas, kept so old acceptance cases stay tested. Not used for v2 hands. */
export interface LegacyHongKongRules {
  mode: 'hongkong';
  baseScore: number;
  chongMode: 'full' | 'half';
  selfDrawMultiplier: number;
}

export interface LegacyPaoMaRules {
  mode: 'paoma';
  baseScore: number;
  horseCount: number;
  horseUnit: number;
  baoSelfDraw: boolean;
}

export interface LegacyWinInput {
  winnerId: PlayerId;
  winType: 'discard' | 'selfDraw';
  discarderId?: PlayerId;
  baoPlayerId?: PlayerId;
  fan?: number;
  horsesHit?: number;
}

function zeroDeltas(players: readonly { id: PlayerId }[]): Record<PlayerId, number> {
  const deltas: Record<PlayerId, number> = {};
  for (const player of players) deltas[player.id] = 0;
  return deltas;
}

function normalizeZeros(deltas: Record<PlayerId, number>): Record<PlayerId, number> {
  for (const id of Object.keys(deltas)) {
    if (deltas[id] === 0) deltas[id] = 0;
  }
  return deltas;
}

function requireDiscarder(players: readonly SeatRef[], winnerId: PlayerId, discarderId?: PlayerId): PlayerId {
  if (!discarderId || !players.some((player) => player.id === discarderId)) throw new Error('請選出銃玩家');
  if (discarderId === winnerId) throw new Error('出銃玩家唔可以係胡牌玩家');
  return discarderId;
}

export function legacyHongKongDeltas(
  players: readonly SeatRef[],
  rules: LegacyHongKongRules,
  input: LegacyWinInput,
): Record<PlayerId, number> {
  if (!players.some((player) => player.id === input.winnerId)) throw new Error('請選胡牌玩家');
  if (!Number.isInteger(input.fan) || (input.fan ?? 0) < 1) throw new Error('番數至少 1');
  const score = (input.fan as number) * rules.baseScore;
  const deltas = zeroDeltas(players);
  if (input.winType === 'selfDraw') {
    const pay = score * rules.selfDrawMultiplier;
    for (const player of players) {
      deltas[player.id] = player.id === input.winnerId ? 3 * pay : -pay;
    }
    return normalizeZeros(deltas);
  }
  const discarderId = requireDiscarder(players, input.winnerId, input.discarderId);
  if (rules.chongMode === 'full') {
    deltas[input.winnerId] = score;
    deltas[discarderId] = -score;
    return normalizeZeros(deltas);
  }
  const discarderPay = Math.ceil(score / 2);
  const rest = score - discarderPay;
  const others = players
    .filter((player) => player.id !== input.winnerId && player.id !== discarderId)
    .sort((a, b) => a.seatIndex - b.seatIndex);
  const firstPay = Math.ceil(rest / 2);
  const secondPay = rest - firstPay;
  deltas[input.winnerId] = score;
  deltas[discarderId] = -discarderPay;
  deltas[others[0].id] = -firstPay;
  deltas[others[1].id] = -secondPay;
  return normalizeZeros(deltas);
}

export function legacyPaoMaDeltas(
  players: readonly SeatRef[],
  rules: LegacyPaoMaRules,
  input: LegacyWinInput,
): Record<PlayerId, number> {
  if (!players.some((player) => player.id === input.winnerId)) throw new Error('請選胡牌玩家');
  const horsesHit = input.horsesHit ?? 0;
  if (!Number.isInteger(horsesHit) || horsesHit < 0 || horsesHit > rules.horseCount) {
    throw new Error('中馬數超出範圍');
  }
  const pot = rules.baseScore + horsesHit * rules.horseUnit;
  const deltas = zeroDeltas(players);
  if (input.winType === 'discard') {
    const discarderId = requireDiscarder(players, input.winnerId, input.discarderId);
    deltas[input.winnerId] = pot;
    deltas[discarderId] = -pot;
    return normalizeZeros(deltas);
  }
  if (rules.baoSelfDraw) {
    if (!input.baoPlayerId || !players.some((player) => player.id === input.baoPlayerId)) {
      throw new Error('請選包自摸玩家');
    }
    if (input.baoPlayerId === input.winnerId) throw new Error('包家唔可以係胡牌玩家');
    deltas[input.baoPlayerId] = -3 * pot;
    deltas[input.winnerId] = 3 * pot;
    return normalizeZeros(deltas);
  }
  for (const player of players) {
    deltas[player.id] = player.id === input.winnerId ? 3 * pot : -pot;
  }
  return normalizeZeros(deltas);
}
