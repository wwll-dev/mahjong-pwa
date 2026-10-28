import { describe, expect, it } from 'vitest';
import { pairwiseSettle, playerNets } from './settle';

const players = [
  { id: 'a', seatIndex: 0, score: 6 },
  { id: 'b', seatIndex: 1, score: 1 },
  { id: 'c', seatIndex: 2, score: -2 },
  { id: 'd', seatIndex: 3, score: -5 },
];

describe('settlement', () => {
  it('nets are score minus the recorded starting score', () => {
    expect(playerNets(
      [{ id: 'a', score: 5 }, { id: 'b', score: 0 }],
      { a: 2, b: 0 },
    )).toEqual({ a: 3, b: 0 });
  });

  it('pairs the largest credit with the largest debt until both are clear', () => {
    const nets = playerNets(players, { a: 0, b: 0, c: 0, d: 0 });
    expect(pairwiseSettle(nets, players)).toEqual([
      { fromId: 'd', toId: 'a', amount: 5 },
      { fromId: 'c', toId: 'a', amount: 1 },
      { fromId: 'c', toId: 'b', amount: 1 },
    ]);
  });

  it('returns no payments when everyone is even', () => {
    expect(pairwiseSettle({ a: 0, b: 0, c: 0, d: 0 }, players)).toEqual([]);
  });
});
