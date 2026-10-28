import { projectSession } from '../domain/session';
import type { HandRecord, Player, Rules, Session } from '../domain/types';

export const SESSION_STORAGE_KEY = 'mahjong-pwa:v1:session';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStorage(): StorageLike {
  const storage = globalThis.localStorage;
  if (!storage) throw new Error('localStorage 不可用');
  return storage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNumberMap(value: unknown): value is Record<string, number> {
  if (!isRecord(value)) return false;
  return Object.values(value).every((entry) => typeof entry === 'number');
}

function isPlayer(value: unknown): value is Player {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.score === 'number' &&
    (value.seatIndex === 0 || value.seatIndex === 1 || value.seatIndex === 2 || value.seatIndex === 3)
  );
}

function isRules(value: unknown): value is Rules {
  if (!isRecord(value) || typeof value.baseScore !== 'number') return false;
  if (value.mode === 'hongkong') {
    return (
      (value.chongMode === 'full' || value.chongMode === 'half') &&
      typeof value.selfDrawMultiplier === 'number'
    );
  }
  if (value.mode === 'paoma') {
    return (
      typeof value.horseCount === 'number' &&
      typeof value.horseUnit === 'number' &&
      typeof value.baoSelfDraw === 'boolean'
    );
  }
  return false;
}

function isHand(value: unknown): value is HandRecord {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.index === 'number' &&
    (value.outcome === 'win' || value.outcome === 'draw') &&
    isNumberMap(value.deltas) &&
    typeof value.dealerIdBefore === 'string' &&
    typeof value.dealerIdAfter === 'string' &&
    typeof value.dealerStreakBefore === 'number' &&
    typeof value.dealerStreakAfter === 'number' &&
    typeof value.createdAt === 'string'
  );
}

export function isSession(value: unknown): value is Session {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string' || typeof value.updatedAt !== 'string') return false;
  if (value.status !== 'active' && value.status !== 'settled') return false;
  if (typeof value.dealerId !== 'string' || typeof value.dealerStreak !== 'number') return false;
  if (!Array.isArray(value.players) || value.players.length !== 4 || !value.players.every(isPlayer)) return false;
  const seats = new Set(value.players.map((player) => player.seatIndex));
  if (seats.size !== 4) return false;
  if (!isRules(value.rules) || !isNumberMap(value.startingScores)) return false;
  if (!Array.isArray(value.hands) || !value.hands.every(isHand)) return false;
  return true;
}

export function loadSession(storage: StorageLike = defaultStorage()): Session | null {
  try {
    const raw = storage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isSession(parsed)) {
      storage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return projectSession(parsed);
  } catch {
    try {
      storage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      /* ignore storage failures while recovering */
    }
    return null;
  }
}

export function saveSession(session: Session | null, storage: StorageLike = defaultStorage()): void {
  if (!session) {
    storage.removeItem(SESSION_STORAGE_KEY);
    return;
  }
  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}
