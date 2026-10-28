import type { PlayerId, SeatRef } from './types';

export interface DealerState {
  dealerId: PlayerId;
  dealerStreak: number;
}

export function nextSeatDealerId(players: readonly SeatRef[], dealerId: PlayerId): PlayerId {
  const dealer = players.find((player) => player.id === dealerId);
  if (!dealer) throw new Error('找不到莊家');
  const nextIndex = (dealer.seatIndex + 1) % 4;
  const next = players.find((player) => player.seatIndex === nextIndex);
  if (!next) throw new Error('找不到下家');
  return next.id;
}

/** Draw and dealer-win keep the seat and add 1 to the streak. Any other win passes one seat and resets. */
export function advanceDealer(
  players: readonly SeatRef[],
  state: DealerState,
  outcome: 'win' | 'draw',
  winnerId?: PlayerId,
): DealerState {
  if (outcome === 'draw') {
    return { dealerId: state.dealerId, dealerStreak: state.dealerStreak + 1 };
  }
  if (!winnerId) throw new Error('食糊要有胡牌玩家');
  if (winnerId === state.dealerId) {
    return { dealerId: state.dealerId, dealerStreak: state.dealerStreak + 1 };
  }
  return { dealerId: nextSeatDealerId(players, state.dealerId), dealerStreak: 0 };
}
