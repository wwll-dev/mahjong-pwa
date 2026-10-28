import { describe, expect, it } from 'vitest';
import { HONG_KONG_PRESETS } from '../presets/hongkong';
import { createSession, recordHand, undoLastHand } from '../session';
import type { HongKongRules } from '../types';
import { applyJackpot, replayJackpotPool } from './jackpot';

const players = ['a', 'b', 'c', 'd'] as const;

function rules(): HongKongRules {
  return {
    ...HONG_KONG_PRESETS[0].rules,
    jackpotEnabled: true,
    jackpotAnte: 4,
    maxFan: 8,
  };
}

describe('jackpot pool', () => {
  it('antes every win, then pays the pool out on a full fan hand', () => {
    const first = applyJackpot({
      playerIds: players,
      ante: 4,
      maxFan: 8,
      enabled: true,
      kind: 'win',
      fan: 3,
      winnerId: 'a',
      pool: 0,
      deltas: { a: 10, b: -10, c: 0, d: 0 },
    });
    expect(first.jackpotAnteTotal).toBe(16);
    expect(first.jackpotPayout).toBe(0);
    expect(first.pool).toBe(16);
    expect(first.deltas).toEqual({ a: 6, b: -14, c: -4, d: -4 });

    const second = applyJackpot({
      playerIds: players,
      ante: 4,
      maxFan: 8,
      enabled: true,
      kind: 'win',
      fan: 8,
      winnerId: 'b',
      pool: first.pool,
      deltas: { a: 0, b: 20, c: -20, d: 0 },
    });
    expect(second.pool).toBe(0);
    expect(second.jackpotPayout).toBe(32);
    expect(second.deltas).toEqual({ a: -4, b: 48, c: -24, d: -4 });
  });

  it('antes a draw and does not pay the pool', () => {
    const drawn = applyJackpot({
      playerIds: players,
      ante: 4,
      maxFan: 8,
      enabled: true,
      kind: 'draw',
      pool: 16,
      deltas: { a: 0, b: 0, c: 0, d: 0 },
    });
    expect(drawn.pool).toBe(32);
    expect(drawn.jackpotPayout).toBe(0);
    expect(drawn.deltas).toEqual({ a: -4, b: -4, c: -4, d: -4 });
  });

  it('leaves the pool and deltas alone on a kong', () => {
    const kong = applyJackpot({
      playerIds: players,
      ante: 4,
      maxFan: 8,
      enabled: true,
      kind: 'kong',
      pool: 16,
      deltas: { a: 3, b: -1, c: -1, d: -1 },
    });
    expect(kong.pool).toBe(16);
    expect(kong.jackpotAnteTotal).toBe(0);
    expect(kong.jackpotPayout).toBe(0);
    expect(kong.deltas).toEqual({ a: 3, b: -1, c: -1, d: -1 });
    expect(replayJackpotPool(rules(), [
      { kind: 'win', jackpotAnteTotal: 16, jackpotPayout: 0 },
      { kind: 'kong' },
      { kind: 'draw', jackpotAnteTotal: 16, jackpotPayout: 0 },
    ])).toBe(32);
  });

  it('does nothing while jackpot is off', () => {
    const off = applyJackpot({
      playerIds: players,
      ante: 4,
      maxFan: 8,
      enabled: false,
      kind: 'win',
      fan: 8,
      winnerId: 'a',
      pool: 0,
      deltas: { a: 4, b: -4, c: 0, d: 0 },
    });
    expect(off.pool).toBe(0);
    expect(off.deltas).toEqual({ a: 4, b: -4, c: 0, d: 0 });
  });

  it('restores the pool when a full-fan hand is undone', () => {
    let session = createSession({
      rules: rules(),
      names: ['東', '南', '西', '北'],
      dealerSeat: 0,
    });
    const east = session.players[0]?.id;
    const south = session.players[1]?.id;
    const west = session.players[2]?.id;
    const north = session.players[3]?.id;
    if (!east || !south || !west || !north) throw new Error('players');

    session = recordHand(session, {
      kind: 'win',
      winnerId: west,
      winType: 'discard',
      discarderId: south,
      fan: 3,
    });
    expect(session.jackpotPool).toBe(16);
    expect(session.players.map((player) => player.score)).toEqual([-4, -8, 0, -4]);

    session = recordHand(session, {
      kind: 'win',
      winnerId: east,
      winType: 'discard',
      discarderId: north,
      fan: 8,
    });
    expect(session.jackpotPool).toBe(0);
    expect(session.hands.at(-1)?.jackpotPayout).toBe(32);
    expect(session.players.find((player) => player.id === east)?.score).toBe(56);

    session = undoLastHand(session);
    expect(session.jackpotPool).toBe(16);
    expect(session.players.map((player) => player.score)).toEqual([-4, -8, 0, -4]);
  });
});
