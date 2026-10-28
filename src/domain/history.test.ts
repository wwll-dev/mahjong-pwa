import { describe, expect, it } from 'vitest';
import { HONG_KONG_PRESETS } from './presets/hongkong';
import { HISTORY_LIMIT, appendHistory } from './history';
import { createSession, recordHand } from './session';
import type { HistoryEntry, Session } from './types';
import type { StorageLike } from '../state/storage';
import { archiveSession, deleteHistoryEntry, loadHistory } from '../state/historyStore';

function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => (map.has(key) ? map.get(key)! : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); },
  };
}

function settled(index: number): Session {
  const session = createSession({
    rules: HONG_KONG_PRESETS[0].rules,
    names: ['東', '南', '西', '北'],
    dealerSeat: 0,
  }, `2026-01-01T00:${String(index).padStart(2, '0')}:00.000Z`);
  const winner = session.players[1]?.id;
  const discarder = session.players[0]?.id;
  if (!winner || !discarder) throw new Error('players');
  return recordHand(session, {
    kind: 'win',
    winnerId: winner,
    winType: 'discard',
    discarderId: discarder,
    fan: 3,
  });
}

describe('history archive', () => {
  it('keeps the newest 50 settled games and drops the oldest', () => {
    let history: HistoryEntry[] = [];
    const ids: string[] = [];
    for (let index = 0; index < HISTORY_LIMIT + 1; index += 1) {
      const session = settled(index);
      ids.push(session.id);
      history = appendHistory(session, history, `2026-02-01T00:${String(index).padStart(2, '0')}:00.000Z`);
    }
    expect(history).toHaveLength(HISTORY_LIMIT);
    expect(history.some((entry) => entry.id === ids[0])).toBe(false);
    expect(history[0]?.id).toBe(ids[HISTORY_LIMIT]);
    expect(history.at(-1)?.id).toBe(ids[1]);
    expect(history[0]?.summary.handCount).toBe(1);
    expect(history[0]?.summary.rulesName).toBe('3番4 半辣上');
    expect(history[0]?.session.status).toBe('settled');
  });

  it('writes a settled game and can delete it', () => {
    const storage = memoryStorage();
    const session = settled(3);
    const saved = archiveSession(session, storage, '2026-03-01T00:00:00.000Z');
    expect(saved).toHaveLength(1);
    expect(loadHistory(storage)).toHaveLength(1);
    expect(loadHistory(storage)[0]?.id).toBe(session.id);
    expect(deleteHistoryEntry(session.id, storage)).toEqual([]);
    expect(loadHistory(storage)).toEqual([]);
  });
});
