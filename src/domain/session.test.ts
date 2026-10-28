import { describe, expect, it } from 'vitest';
import { createSession, projectSession, recordHand, undoLastHand, type NewSessionInput } from './session';

function input(overrides: Partial<NewSessionInput> = {}): NewSessionInput {
  return {
    mode: 'hongkong',
    names: ['東', '南', '西', '北'],
    dealerSeat: 0,
    baseScore: 1,
    chongMode: 'full',
    selfDrawMultiplier: 2,
    horseCount: 8,
    horseUnit: 1,
    baoSelfDraw: true,
    ...overrides,
  };
}

function idOf(session: ReturnType<typeof createSession>, name: string): string {
  const player = session.players.find((item) => item.name === name);
  if (!player) throw new Error(name);
  return player.id;
}

describe('session', () => {
  it('opens with four zero scores and the chosen dealer', () => {
    const session = createSession(input({ dealerSeat: 2 }));
    expect(session.status).toBe('active');
    expect(session.dealerStreak).toBe(0);
    expect(session.players.map((player) => player.score)).toEqual([0, 0, 0, 0]);
    expect(session.startingScores[idOf(session, '西')]).toBe(0);
    expect(session.dealerId).toBe(idOf(session, '西'));
    expect(session.hands).toEqual([]);
  });

  it('rejects duplicate names', () => {
    expect(() => createSession(input({ names: ['東', '東', '西', '北'] }))).toThrow(/唔同/);
  });

  it('folds deltas, passes the deal to the next seat, and restores both on undo', () => {
    let session = createSession(input());
    const east = idOf(session, '東');
    const south = idOf(session, '南');
    const west = idOf(session, '西');
    session = recordHand(session, {
      outcome: 'win',
      winnerId: west,
      winType: 'discard',
      discarderId: south,
      fan: 3,
    });
    expect(session.players.find((player) => player.id === west)?.score).toBe(3);
    expect(session.players.find((player) => player.id === south)?.score).toBe(-3);
    expect(session.dealerId).toBe(south);
    expect(session.dealerStreak).toBe(0);

    const tampered = {
      ...session,
      players: session.players.map((player) => ({ ...player, score: 999 })),
      dealerId: east,
      dealerStreak: 9,
    };
    expect(projectSession(tampered).dealerId).toBe(south);
    expect(projectSession(tampered).players.find((player) => player.id === west)?.score).toBe(3);

    const undone = undoLastHand(session);
    expect(undone.hands).toHaveLength(0);
    expect(undone.players.map((player) => player.score)).toEqual([0, 0, 0, 0]);
    expect(undone.dealerId).toBe(east);
    expect(undone.dealerStreak).toBe(0);
  });

  it('tracks continued deals across a dealer win and a draw, then a pass that is not the winner', () => {
    let session = createSession(input());
    const east = idOf(session, '東');
    const south = idOf(session, '南');
    const west = idOf(session, '西');
    session = recordHand(session, { outcome: 'win', winnerId: east, winType: 'selfDraw', fan: 2 });
    expect(session.dealerId).toBe(east);
    expect(session.dealerStreak).toBe(1);
    expect(session.players.find((player) => player.id === east)?.score).toBe(12);
    expect(session.players.filter((player) => player.id !== east).map((player) => player.score)).toEqual([-4, -4, -4]);

    session = recordHand(session, { outcome: 'draw' });
    expect(session.dealerId).toBe(east);
    expect(session.dealerStreak).toBe(2);
    expect(session.hands.at(-1)?.deltas).toEqual({ [east]: 0, [south]: 0, [session.players[2].id]: 0, [session.players[3].id]: 0 });

    session = recordHand(session, { outcome: 'win', winnerId: west, winType: 'discard', discarderId: south, fan: 1 });
    expect(session.dealerId).toBe(south);
    expect(session.dealerStreak).toBe(0);

    session = undoLastHand(session);
    expect(session.dealerId).toBe(east);
    expect(session.dealerStreak).toBe(2);
    session = undoLastHand(session);
    expect(session.dealerStreak).toBe(1);
    session = undoLastHand(session);
    expect(session.dealerId).toBe(east);
    expect(session.dealerStreak).toBe(0);
    expect(session.players.every((player) => player.score === 0)).toBe(true);
  });

  it('scores pao ma discard and bao self draw on the session', () => {
    let session = createSession(input({ mode: 'paoma', horseCount: 8, horseUnit: 1, baseScore: 1 }));
    const east = idOf(session, '東');
    const south = idOf(session, '南');
    const west = idOf(session, '西');
    session = recordHand(session, {
      outcome: 'win',
      winnerId: south,
      winType: 'discard',
      discarderId: west,
      horsesHit: 2,
    });
    expect(session.players.find((player) => player.id === south)?.score).toBe(3);
    expect(session.players.find((player) => player.id === west)?.score).toBe(-3);

    session = undoLastHand(session);
    session = recordHand(session, {
      outcome: 'win',
      winnerId: south,
      winType: 'selfDraw',
      horsesHit: 2,
      baoPlayerId: east,
    });
    expect(session.players.find((player) => player.id === south)?.score).toBe(9);
    expect(session.players.find((player) => player.id === east)?.score).toBe(-9);
    expect(session.players.find((player) => player.id === west)?.score).toBe(0);
    expect(session.hands[0]?.baoPlayerId).toBe(east);
  });

  it('does not record a hand where winner and discarder are the same person', () => {
    const session = createSession(input());
    const east = idOf(session, '東');
    expect(() => recordHand(session, {
      outcome: 'win',
      winnerId: east,
      winType: 'discard',
      discarderId: east,
      fan: 1,
    })).toThrow(/出銃/);
  });
});
