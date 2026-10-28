import { normalizeZeros, zeroDeltas } from '../deltas';
import type { HongKongRules, PlayerId, SeatRef } from '../types';
import { discardScore, selfDrawPayPerLoser } from './hongkongCurve';

export interface HongKongWinInput {
  winnerId: PlayerId;
  winType: 'discard' | 'selfDraw';
  discarderId?: PlayerId;
  fan?: number;
}

function requireWinner(players: readonly SeatRef[], winnerId: PlayerId): void {
  if (!players.some((player) => player.id === winnerId)) throw new Error('請選胡牌玩家');
}

function requireDiscarder(players: readonly SeatRef[], winnerId: PlayerId, discarderId?: PlayerId): PlayerId {
  if (!discarderId || !players.some((player) => player.id === discarderId)) throw new Error('請選出銃玩家');
  if (discarderId === winnerId) throw new Error('出銃玩家唔可以係胡牌玩家');
  return discarderId;
}

/** Split `rest` across others in seat order. Two others match Part 1: ceil(rest/2), then the remainder. */
export function splitRemainder(rest: number, count: number): number[] {
  if (count <= 0) {
    if (rest !== 0) throw new Error('半銃冇其餘玩家');
    return [];
  }
  const pays: number[] = [];
  let remaining = rest;
  for (let index = 0; index < count - 1; index += 1) {
    const pay = Math.ceil(remaining / (count - index));
    pays.push(pay);
    remaining -= pay;
  }
  pays.push(remaining);
  return pays;
}

export function hongKongDeltas(
  players: readonly SeatRef[],
  rules: HongKongRules,
  input: HongKongWinInput,
): Record<PlayerId, number> {
  requireWinner(players, input.winnerId);
  const score = discardScore(input.fan ?? Number.NaN, rules);
  const deltas = zeroDeltas(players);

  if (input.winType === 'selfDraw') {
    const pay = selfDrawPayPerLoser(input.fan ?? Number.NaN, rules);
    const losers = players.filter((player) => player.id !== input.winnerId);
    for (const player of losers) deltas[player.id] = -pay;
    deltas[input.winnerId] = losers.length * pay;
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
  const pays = splitRemainder(rest, others.length);
  deltas[input.winnerId] = score;
  deltas[discarderId] = -discarderPay;
  others.forEach((player, index) => {
    deltas[player.id] = -(pays[index] ?? 0);
  });
  return normalizeZeros(deltas);
}
