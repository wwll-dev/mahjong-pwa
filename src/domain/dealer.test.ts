import { describe, expect, it } from 'vitest';
import { advanceDealer, nextSeatDealerId, nextWind } from './dealer';
import type { SeatRef } from './types';

const players: SeatRef[] = [
  { id: 'p0', seatIndex: 0 },
  { id: 'p1', seatIndex: 1 },
  { id: 'p2', seatIndex: 2 },
  { id: 'p3', seatIndex: 3 },
];

const three: SeatRef[] = players.slice(0, 3);

describe('dealer and wind', () => {
  it('walks seats 0 → 1 → 2 → 3 → 0 and wraps a 3-player table', () => {
    expect(nextSeatDealerId(players, 'p0')).toBe('p1');
    expect(nextSeatDealerId(players, 'p3')).toBe('p0');
    expect(nextSeatDealerId(three, 'p2')).toBe('p0');
  });

  it('keeps the dealer and increments the streak on a draw or a dealer win', () => {
    const state = { dealerId: 'p0', dealerStreak: 1, wind: 'E' as const, windsCompleted: 0 };
    expect(advanceDealer(players, state, 'draw', { recordDealer: true, recordWind: true })).toEqual({
      dealerId: 'p0',
      dealerStreak: 2,
      wind: 'E',
      windsCompleted: 0,
    });
    expect(advanceDealer(players, { ...state, dealerId: 'p2', dealerStreak: 0 }, 'win', {
      recordDealer: true,
      recordWind: true,
    }, 'p2')).toEqual({
      dealerId: 'p2',
      dealerStreak: 1,
      wind: 'E',
      windsCompleted: 0,
    });
  });

  it('passes to the next seat, not the winner, when someone else wins', () => {
    expect(advanceDealer(players, {
      dealerId: 'p0',
      dealerStreak: 4,
      wind: 'E',
      windsCompleted: 0,
    }, 'win', { recordDealer: true, recordWind: true }, 'p2')).toEqual({
      dealerId: 'p1',
      dealerStreak: 0,
      wind: 'E',
      windsCompleted: 0,
    });
  });

  it('advances the wind when a pass returns the deal to seat 0', () => {
    expect(nextWind('E')).toBe('S');
    expect(nextWind('N')).toBe('E');
    expect(advanceDealer(players, {
      dealerId: 'p3',
      dealerStreak: 2,
      wind: 'E',
      windsCompleted: 0,
    }, 'win', { recordDealer: true, recordWind: true }, 'p1')).toEqual({
      dealerId: 'p0',
      dealerStreak: 0,
      wind: 'S',
      windsCompleted: 1,
    });
    expect(advanceDealer(three, {
      dealerId: 'p2',
      dealerStreak: 0,
      wind: 'S',
      windsCompleted: 1,
    }, 'win', { recordDealer: true, recordWind: true }, 'p0')).toMatchObject({
      dealerId: 'p0',
      wind: 'W',
      windsCompleted: 2,
    });
  });

  it('does not move the dealer or the wind for a kong or when recording is off', () => {
    const state = { dealerId: 'p3', dealerStreak: 1, wind: 'E' as const, windsCompleted: 0 };
    expect(advanceDealer(players, state, 'kong', { recordDealer: true, recordWind: true })).toEqual(state);
    expect(advanceDealer(players, state, 'win', { recordDealer: false, recordWind: false }, 'p1')).toEqual({
      dealerId: 'p0',
      dealerStreak: 0,
      wind: 'E',
      windsCompleted: 0,
    });
  });
});
