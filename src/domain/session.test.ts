import { describe, expect, it } from 'vitest';
import { HONG_KONG_PRESETS } from './presets/hongkong';
import { PAO_MA_PRESETS } from './presets/paoma';
import { createSession, projectSession, recordHand, undoLastHand, type NewSessionInput } from './session';
import type { Rules } from './types';

function input(rules: Rules, overrides: Partial<NewSessionInput> = {}): NewSessionInput {
  const names = rules.playerCount === 3 ? ['東', '南', '西'] : ['東', '南', '西', '北'];
  return {
    rules,
    names,
    dealerSeat: 0,
    ...overrides,
  };
}

function idOf(session: ReturnType<typeof createSession>, name: string): string {
  const player = session.players.find((item) => item.name === name);
  if (!player) throw new Error(name);
  return player.id;
}

describe('session', () => {
  it('opens a v2 table at zero with the chosen dealer', () => {
    const session = createSession(input(HONG_KONG_PRESETS[0].rules, { dealerSeat: 2 }));
    expect(session.version).toBe(3);
    expect(session.jackpotPool).toBe(0);
    expect(session.wind).toBe('E');
    expect(session.windsCompleted).toBe(0);
    expect(session.players.map((player) => player.score)).toEqual([0, 0, 0, 0]);
    expect(session.dealerId).toBe(idOf(session, '西'));
  });

  it('opens three seats for a three-player preset and fixes the dealer when recording is off', () => {
    const three = createSession(input(HONG_KONG_PRESETS[8].rules));
    expect(three.players).toHaveLength(3);
    const hidden = createSession(input(
      { ...HONG_KONG_PRESETS[0].rules, recordDealer: false, recordWind: false },
      { dealerSeat: 2 },
    ));
    expect(hidden.dealerId).toBe(idOf(hidden, '東'));
    expect(hidden.dealerStreak).toBe(0);
  });

  it('rejects duplicate names', () => {
    expect(() => createSession(input(HONG_KONG_PRESETS[0].rules, {
      names: ['東', '東', '西', '北'],
    }))).toThrow(/唔同/);
  });

  it('folds a win, passes the deal, and restores both on undo', () => {
    let session = createSession(input(HONG_KONG_PRESETS[0].rules));
    const east = idOf(session, '東');
    const south = idOf(session, '南');
    const west = idOf(session, '西');
    session = recordHand(session, {
      kind: 'win',
      winnerId: west,
      winType: 'discard',
      discarderId: south,
      fan: 3,
    });
    expect(session.players.find((player) => player.id === west)?.score).toBe(4);
    expect(session.players.find((player) => player.id === south)?.score).toBe(-4);
    expect(session.dealerId).toBe(south);
    const tampered = {
      ...session,
      players: session.players.map((player) => ({ ...player, score: 999 })),
      dealerId: east,
      dealerStreak: 9,
      wind: 'N' as const,
    };
    expect(projectSession(tampered).dealerId).toBe(south);
    expect(projectSession(tampered).players.find((player) => player.id === west)?.score).toBe(4);
    const undone = undoLastHand(session);
    expect(undone.hands).toHaveLength(0);
    expect(undone.players.every((player) => player.score === 0)).toBe(true);
    expect(undone.dealerId).toBe(east);
    expect(undone.wind).toBe('E');
  });

  it('turns the wind when the deal returns to seat 0', () => {
    let session = createSession(input(HONG_KONG_PRESETS[0].rules, { dealerSeat: 3 }));
    const east = idOf(session, '東');
    const south = idOf(session, '南');
    const north = idOf(session, '北');
    expect(session.dealerId).toBe(north);
    session = recordHand(session, {
      kind: 'win',
      winnerId: south,
      winType: 'discard',
      discarderId: east,
      fan: 3,
    });
    expect(session.dealerId).toBe(east);
    expect(session.wind).toBe('S');
    expect(session.windsCompleted).toBe(1);
    expect(session.hands[0]?.windBefore).toBe('E');
    expect(session.hands[0]?.windAfter).toBe('S');
    session = undoLastHand(session);
    expect(session.dealerId).toBe(north);
    expect(session.wind).toBe('E');
    expect(session.windsCompleted).toBe(0);
  });

  it('undoes a kong and a following win', () => {
    let session = createSession(input(PAO_MA_PRESETS[0].rules));
    const east = idOf(session, '東');
    const south = idOf(session, '南');
    const west = idOf(session, '西');
    const north = idOf(session, '北');
    session = recordHand(session, { kind: 'kong', kongPlayerId: east });
    expect(session.players.find((player) => player.id === east)?.score).toBe(3);
    expect(session.players.filter((player) => player.id !== east).map((player) => player.score)).toEqual([-1, -1, -1]);
    expect(session.dealerId).toBe(east);
    expect(session.wind).toBe('E');
    session = recordHand(session, {
      kind: 'win',
      winnerId: south,
      winType: 'discard',
      discarderId: west,
      horsesHit: 1,
    });
    expect(session.players.find((player) => player.id === south)?.score).toBe(3);
    expect(session.players.find((player) => player.id === west)?.score).toBe(-5);
    expect(session.players.find((player) => player.id === north)?.score).toBe(-1);
    expect(session.dealerId).toBe(south);
    session = undoLastHand(session);
    expect(session.dealerId).toBe(east);
    expect(session.players.find((player) => player.id === east)?.score).toBe(3);
    expect(session.players.find((player) => player.id === south)?.score).toBe(-1);
    session = undoLastHand(session);
    expect(session.hands).toHaveLength(0);
    expect(session.players.every((player) => player.score === 0)).toBe(true);
  });

  it('scores a 3-player bao self draw and keeps the deal on a draw', () => {
    let session = createSession(input(PAO_MA_PRESETS[5].rules));
    const east = idOf(session, '東');
    const south = idOf(session, '南');
    session = recordHand(session, { kind: 'draw' });
    expect(session.dealerId).toBe(east);
    expect(session.dealerStreak).toBe(1);
    session = recordHand(session, {
      kind: 'win',
      winnerId: south,
      winType: 'selfDraw',
      horsesHit: 1,
      baoPlayerId: east,
    });
    expect(session.players.find((player) => player.id === south)?.score).toBe(8);
    expect(session.players.find((player) => player.id === east)?.score).toBe(-8);
    expect(session.players.find((player) => player.name === '西')?.score).toBe(0);
    expect(session.hands.at(-1)?.baoPlayerId).toBe(east);
  });

  it('does not move the dealer when the rules say not to record one', () => {
    let session = createSession(input({
      ...HONG_KONG_PRESETS[0].rules,
      recordDealer: false,
      recordWind: false,
    }));
    const east = idOf(session, '東');
    const south = idOf(session, '南');
    session = recordHand(session, {
      kind: 'win',
      winnerId: south,
      winType: 'selfDraw',
      fan: 3,
    });
    expect(session.dealerId).toBe(east);
    expect(session.dealerStreak).toBe(0);
    expect(session.wind).toBe('E');
    expect(session.players.find((player) => player.id === south)?.score).toBe(18);
  });

  it('does not record a hand where winner and discarder are the same person', () => {
    const session = createSession(input(HONG_KONG_PRESETS[0].rules));
    const east = idOf(session, '東');
    expect(() => recordHand(session, {
      kind: 'win',
      winnerId: east,
      winType: 'discard',
      discarderId: east,
      fan: 3,
    })).toThrow(/出銃/);
  });
});
