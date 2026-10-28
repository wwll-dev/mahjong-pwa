import { describe, expect, it } from 'vitest';
import { createSession, recordHand } from '../domain/session';
import { SESSION_STORAGE_KEY, loadSession, saveSession, type StorageLike } from './storage';

function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => (map.has(key) ? map.get(key)! : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); },
  };
}

describe('session storage', () => {
  it('round-trips an active session through the v1 key', () => {
    const storage = memoryStorage();
    let session = createSession({
      mode: 'hongkong',
      names: ['玩家1', '玩家2', '玩家3', '玩家4'],
      dealerSeat: 0,
      baseScore: 1,
      chongMode: 'full',
      selfDrawMultiplier: 2,
      horseCount: 0,
      horseUnit: 1,
      baoSelfDraw: true,
    });
    const winner = session.players[1]?.id;
    const discarder = session.players[2]?.id;
    if (!winner || !discarder) throw new Error('players');
    session = recordHand(session, { outcome: 'win', winnerId: winner, winType: 'discard', discarderId: discarder, fan: 3 });
    saveSession(session, storage);
    expect(storage.getItem(SESSION_STORAGE_KEY)).toContain('"status":"active"');
    expect(loadSession(storage)).toEqual(session);
  });

  it('drops corrupt payloads', () => {
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
