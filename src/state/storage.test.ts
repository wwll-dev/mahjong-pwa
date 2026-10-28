import { describe, expect, it } from 'vitest';
import { HONG_KONG_PRESETS } from '../domain/presets/hongkong';
import { createSession, recordHand } from '../domain/session';
import {
  LEGACY_SESSION_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  loadLegacySession,
  loadSession,
  saveSession,
  type StorageLike,
} from './storage';

function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => (map.has(key) ? map.get(key)! : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); },
  };
}

const legacyPayload = {
  id: 'old',
  rules: { mode: 'hongkong', baseScore: 1, chongMode: 'full', selfDrawMultiplier: 2 },
  players: [
    { id: 'a', name: '舊東', score: 5, seatIndex: 0 },
    { id: 'b', name: '舊南', score: -5, seatIndex: 1 },
    { id: 'c', name: '舊西', score: 0, seatIndex: 2 },
    { id: 'd', name: '舊北', score: 0, seatIndex: 3 },
  ],
  dealerId: 'a',
  dealerStreak: 0,
  hands: [],
  startingScores: { a: 0, b: 0, c: 0, d: 0 },
  status: 'active',
  updatedAt: '2020-01-01T00:00:00.000Z',
};

describe('session storage', () => {
  it('round-trips an active v2 session', () => {
    const storage = memoryStorage();
    let session = createSession({
      rules: HONG_KONG_PRESETS[0].rules,
      names: ['玩家1', '玩家2', '玩家3', '玩家4'],
      dealerSeat: 0,
    });
    const winner = session.players[1]?.id;
    const discarder = session.players[2]?.id;
    if (!winner || !discarder) throw new Error('players');
    session = recordHand(session, {
      kind: 'win',
      winnerId: winner,
      winType: 'discard',
      discarderId: discarder,
      fan: 3,
    });
    saveSession(session, storage);
    expect(storage.getItem(SESSION_STORAGE_KEY)).toContain('"version":2');
    expect(loadSession(storage)).toEqual(session);
    expect(loadLegacySession(storage)).toBeNull();
  });

  it('keeps a v1 session readable for settlement and does not treat it as v2', () => {
    const storage = memoryStorage();
    storage.setItem(LEGACY_SESSION_STORAGE_KEY, JSON.stringify(legacyPayload));
    expect(loadSession(storage)).toBeNull();
    expect(loadLegacySession(storage)?.players.map((player) => player.score)).toEqual([5, -5, 0, 0]);
  });

  it('drops corrupt v2 payloads', () => {
    const storage = memoryStorage();
    storage.setItem(SESSION_STORAGE_KEY, '{');
    expect(loadSession(storage)).toBeNull();
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('removes the key when the session is cleared', () => {
    const storage = memoryStorage();
    saveSession(null, storage);
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });
});
