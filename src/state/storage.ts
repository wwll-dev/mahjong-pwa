import { projectSession } from '../domain/session';
import type { Session } from '../domain/types';
import { coerceSession, isLegacySession, type LegacySession } from './guards';

export const SESSION_STORAGE_KEY = 'mahjong-pwa:v3:session';
export const LEGACY_V2_SESSION_KEY = 'mahjong-pwa:v2:session';
export const LEGACY_SESSION_STORAGE_KEY = 'mahjong-pwa:v1:session';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function defaultStorage(): StorageLike {
  const storage = globalThis.localStorage;
  if (!storage) throw new Error('localStorage 不可用');
  return storage;
}

function readJson(key: string, storage: StorageLike): unknown {
  const raw = storage.getItem(key);
  if (!raw) return null;
  return JSON.parse(raw);
}

function readSessionKey(key: string, storage: StorageLike): Session | null {
  try {
    const parsed = readJson(key, storage);
    if (parsed === null) return null;
    const session = coerceSession(parsed);
    if (!session) {
      storage.removeItem(key);
      return null;
    }
    return projectSession(session);
  } catch {
    try {
      storage.removeItem(key);
    } catch {
      /* ignore storage failures while recovering */
    }
    return null;
  }
}

export function loadSession(storage: StorageLike = defaultStorage()): Session | null {
  const current = readSessionKey(SESSION_STORAGE_KEY, storage);
  if (current) return current;
  return readSessionKey(LEGACY_V2_SESSION_KEY, storage);
}

export function saveSession(session: Session | null, storage: StorageLike = defaultStorage()): void {
  storage.removeItem(LEGACY_V2_SESSION_KEY);
  if (!session) {
    storage.removeItem(SESSION_STORAGE_KEY);
    return;
  }
  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

/** v1 games stay read-only. Scoring them with the v2 table would change the old results. */
export function loadLegacySession(storage: StorageLike = defaultStorage()): LegacySession | null {
  try {
    const parsed = readJson(LEGACY_SESSION_STORAGE_KEY, storage);
    if (parsed === null) return null;
    if (!isLegacySession(parsed)) return null;
    return {
      id: parsed.id,
      status: parsed.status,
      startingScores: parsed.startingScores,
      players: parsed.players.map((player) => ({
        id: player.id,
        name: player.name,
        score: player.score,
        seatIndex: player.seatIndex,
      })),
    };
  } catch {
    return null;
  }
}

export function discardLegacySession(storage: StorageLike = defaultStorage()): void {
  storage.removeItem(LEGACY_SESSION_STORAGE_KEY);
}
