import type { HongKongRules, PaoMaRules, PlayerId, SeatRef } from './types';

export interface WinInput {
  winnerId: PlayerId;
  winType: 'discard' | 'selfDraw';
  discarderId?: PlayerId;
  baoPlayerId?: PlayerId;
  fan?: number;
  horsesHit?: number;
}

export function zeroDeltas(players: readonly { id: PlayerId }[]): Record<PlayerId, number> {
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

export function sumDeltas(deltas: Record<PlayerId, number>): number {
  return Object.values(deltas).reduce((total, value) => total + value, 0);
}

function requireWinner(players: readonly SeatRef[], winnerId: PlayerId): void {
  if (!players.some((player) => player.id === winnerId)) {
    throw new Error('請選胡牌玩家');
  }
}

function requireDiscarder(players: readonly SeatRef[], winnerId: PlayerId, discarderId?: PlayerId): PlayerId {
  if (!discarderId || !players.some((player) => player.id === discarderId)) {
    throw new Error('請選出銃玩家');
  }
  if (discarderId === winnerId) throw new Error('出銃玩家唔可以係胡牌玩家');
  return discarderId;
}

export function hongKongDeltas(
  players: readonly SeatRef[],
  rules: HongKongRules,
  input: WinInput,
): Record<PlayerId, number> {
  requireWinner(players, input.winnerId);
  if (!Number.isInteger(input.fan) || (input.fan ?? 0) < 1) throw new Error('番數至少 1');
  const fan = input.fan as number;
  const score = fan * rules.baseScore;
  if (!Number.isInteger(score) || score < 1) throw new Error('番數結算要係正整數');

  const deltas = zeroDeltas(players);
  if (input.winType === 'selfDraw') {
    const pay = score * rules.selfDrawMultiplier;
    if (!Number.isFinite(pay)) throw new Error('自摸倍數無效');
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
  if (rest < 0) throw new Error('半銃結算要正整數糊分');
  const others = players
    .filter((player) => player.id !== input.winnerId && player.id !== discarderId)
    .sort((a, b) => a.seatIndex - b.seatIndex);
  if (others.length !== 2) throw new Error('要有其餘兩家');
  const firstPay = Math.ceil(rest / 2);
  const secondPay = rest - firstPay;
  deltas[input.winnerId] = score;
  deltas[discarderId] = -discarderPay;
  deltas[others[0].id] = -firstPay;
  deltas[others[1].id] = -secondPay;
  return normalizeZeros(deltas);
}

export function paoMaDeltas(
  players: readonly SeatRef[],
  rules: PaoMaRules,
  input: WinInput,
): Record<PlayerId, number> {
  requireWinner(players, input.winnerId);
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
