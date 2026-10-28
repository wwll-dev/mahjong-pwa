import { appendHistory } from '../domain/history';
import type { HistoryEntry, Session } from '../domain/types';
import { coerceSession } from './guards';
import { defaultStorage, type StorageLike } from './storage';

export const HISTORY_STORAGE_KEY = 'mahjong-pwa:v3:history';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function loadHistory(storage: StorageLike = defaultStorage()): HistoryEntry[] {
  try {
    const raw = storage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const entries: HistoryEntry[] = [];
    for (const item of parsed) {
      if (!isRecord(item) || typeof item.id !== 'string' || typeof item.archivedAt !== 'string') continue;
      if (!isRecord(item.summary)) continue;
      const summary = item.summary;
      if (typeof summary.rulesName !== 'string') continue;
      if (summary.mode !== 'hongkong' && summary.mode !== 'paoma') continue;
      if ((summary.playerCount !== 3 && summary.playerCount !== 4) || typeof summary.handCount !== 'number') continue;
      const session = coerceSession(item.session);
      if (!session || session.id !== item.id) continue;
      entries.push({
        id: item.id,
        archivedAt: item.archivedAt,
        summary: {
          rulesName: summary.rulesName,
          mode: summary.mode,
          playerCount: summary.playerCount,
          net: isRecord(summary.net) ? summary.net as HistoryEntry['summary']['net'] : {},
          playerNames: isRecord(summary.playerNames) ? summary.playerNames as HistoryEntry['summary']['playerNames'] : {},
          handCount: summary.handCount,
          finalPool: typeof summary.finalPool === 'number' ? summary.finalPool : undefined,
        },
        session,
      });
    }
    return entries;
  } catch {
    return [];
  }
}

export function saveHistory(entries: readonly HistoryEntry[], storage: StorageLike = defaultStorage()): void {
  storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries));
}

export function archiveSession(
  session: Session,
  storage: StorageLike = defaultStorage(),
  now = new Date().toISOString(),
): HistoryEntry[] {
  const next = appendHistory(session, loadHistory(storage), now);
  saveHistory(next, storage);
  return next;
}

export function deleteHistoryEntry(id: string, storage: StorageLike = defaultStorage()): HistoryEntry[] {
  const next = loadHistory(storage).filter((entry) => entry.id !== id);
  saveHistory(next, storage);
  return next;
}
