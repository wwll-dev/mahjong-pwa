import type { PlayerId, SeatRef, Wind } from './types';

export interface DealerState {
  dealerId: PlayerId;
  dealerStreak: number;
  wind: Wind;
  windsCompleted: number;
}

export interface AdvanceOptions {
  recordDealer: boolean;
  recordWind: boolean;
}

const WIND_ORDER: Wind[] = ['E', 'S', 'W', 'N'];

export function nextWind(wind: Wind): Wind {
  const index = WIND_ORDER.indexOf(wind);
  return WIND_ORDER[(index + 1) % WIND_ORDER.length] ?? 'E';
}

export function windLabel(wind: Wind): string {
  return { E: '東圈', S: '南圈', W: '西圈', N: '北圈' }[wind];
}

export function nextSeatDealerId(players: readonly SeatRef[], dealerId: PlayerId): PlayerId {
  const dealer = players.find((player) => player.id === dealerId);
  if (!dealer) throw new Error('找不到莊家');
  const count = players.length;
  const nextIndex = (dealer.seatIndex + 1) % count;
  const next = players.find((player) => player.seatIndex === nextIndex);
  if (!next) throw new Error('找不到下家');
  return next.id;
}

export function advanceDealer(
  players: readonly SeatRef[],
  state: DealerState,
  kind: 'win' | 'draw' | 'kong',
  options: AdvanceOptions,
  winnerId?: PlayerId,
): DealerState {
  if (!options.recordDealer) {
    const seat0 = players.find((player) => player.seatIndex === 0);
    return {
      dealerId: seat0?.id ?? state.dealerId,
      dealerStreak: 0,
      wind: 'E',
      windsCompleted: 0,
    };
  }
  if (kind === 'kong') return { ...state };
  const keep = kind === 'draw' || winnerId === state.dealerId;
  if (keep) {
    if (kind === 'win' && !winnerId) throw new Error('食糊要有胡牌玩家');
    return { ...state, dealerStreak: state.dealerStreak + 1 };
  }
  if (!winnerId) throw new Error('食糊要有胡牌玩家');
  const dealerId = nextSeatDealerId(players, state.dealerId);
  const next = players.find((player) => player.id === dealerId);
  let wind = state.wind;
  let windsCompleted = state.windsCompleted;
  if (options.recordWind && next?.seatIndex === 0) {
    wind = nextWind(state.wind);
    windsCompleted += 1;
  }
  return { dealerId, dealerStreak: 0, wind, windsCompleted };
}
