import { describe, expect, it } from 'vitest';
import { advanceDealer, nextSeatDealerId } from './dealer';
import type { SeatRef } from './types';

const players: SeatRef[] = [
  { id: 'p0', seatIndex: 0 },
  { id: 'p1', seatIndex: 1 },
  { id: 'p2', seatIndex: 2 },
  { id: 'p3', seatIndex: 3 },
];

describe('dealer rotation', () => {
  it('walks seats 0 → 1 → 2 → 3 → 0', () => {
    expect(nextSeatDealerId(players, 'p0')).toBe('p1');
    expect(nextSeatDealerId(players, 'p3')).toBe('p0');
  });

  it('keeps the dealer and increments the streak on a draw', () => {
    expect(advanceDealer(players, { dealerId: 'p0', dealerStreak: 1 }, 'draw')).toEqual({
      dealerId: 'p0',
      dealerStreak: 2,
    });
  });

  it('keeps the dealer when the dealer wins', () => {
    expect(advanceDealer(players, { dealerId: 'p2', dealerStreak: 0 }, 'win', 'p2')).toEqual({
      dealerId: 'p2',
      dealerStreak: 1,
    });
  });

  it('passes to the next seat, not the winner, when someone else wins', () => {
    expect(advanceDealer(players, { dealerId: 'p0', dealerStreak: 4 }, 'win', 'p2')).toEqual({
      dealerId: 'p1',
      dealerStreak: 0,
    });
  });
});
