import { normalizeZeros, zeroDeltas } from '../deltas';
import type { PaoMaRules, PlayerId, SeatRef } from '../types';

export interface PaoMaWinInput {
  winnerId: PlayerId;
  winType: 'discard' | 'selfDraw';
  discarderId?: PlayerId;
  baoPlayerId?: PlayerId;
  horsesHit?: number;
}

function requireWinner(players: readonly SeatRef[], winnerId: PlayerId): void {
  if (!players.some((player) => player.id === winnerId)) throw new Error('請選胡牌玩家');
}

function horsePoints(rules: PaoMaRules, horsesHit: number | undefined): number {
  const hit = horsesHit ?? 0;
  if (!Number.isInteger(hit) || hit < 0 || hit > rules.horseCountMax) throw new Error('中馬數超出範圍');
  return hit * rules.horse;
}

export function paoMaKongDeltas(
  players: readonly SeatRef[],
  rules: PaoMaRules,
  kongPlayerId: PlayerId,
): Record<PlayerId, number> {
  if (!players.some((player) => player.id === kongPlayerId)) throw new Error('請選槓牌玩家');
  const deltas = zeroDeltas(players);
  const others = players.filter((player) => player.id !== kongPlayerId);
  for (const player of others) deltas[player.id] = -rules.kong;
  deltas[kongPlayerId] = others.length * rules.kong;
  return normalizeZeros(deltas);
}

export function paoMaDeltas(
  players: readonly SeatRef[],
  rules: PaoMaRules,
  input: PaoMaWinInput,
): Record<PlayerId, number> {
  requireWinner(players, input.winnerId);
  const pot = rules.hu + horsePoints(rules, input.horsesHit);
  const deltas = zeroDeltas(players);

  if (input.winType === 'discard') {
    if (!input.discarderId || !players.some((player) => player.id === input.discarderId)) {
      throw new Error('請選出銃玩家');
    }
    if (input.discarderId === input.winnerId) throw new Error('出銃玩家唔可以係胡牌玩家');
    deltas[input.winnerId] = pot;
    deltas[input.discarderId] = -pot;
    return normalizeZeros(deltas);
  }

  const losers = players.filter((player) => player.id !== input.winnerId);
  if (rules.baoSelfDraw) {
    if (!input.baoPlayerId || !players.some((player) => player.id === input.baoPlayerId)) {
      throw new Error('請選包自摸玩家');
    }
    if (input.baoPlayerId === input.winnerId) throw new Error('包家唔可以係胡牌玩家');
    deltas[input.baoPlayerId] = -losers.length * pot;
    deltas[input.winnerId] = losers.length * pot;
    return normalizeZeros(deltas);
  }

  for (const player of losers) deltas[player.id] = -pot;
  deltas[input.winnerId] = losers.length * pot;
  return normalizeZeros(deltas);
}
