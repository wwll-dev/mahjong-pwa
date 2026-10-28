import { rulesTitle } from './rules';
import { playerNets } from './settle';
import { projectSession } from './session';
import type { HistoryEntry, PlayerId, Session } from './types';

export const HISTORY_LIMIT = 50;

export function appendHistory(
  session: Session,
  history: readonly HistoryEntry[],
  now = new Date().toISOString(),
): HistoryEntry[] {
  const projected = projectSession(session);
  const settled: Session = { ...projected, status: 'settled', updatedAt: now };
  const nets = playerNets(settled.players, settled.startingScores);
  const playerNames: Record<PlayerId, string> = {};
  for (const player of settled.players) playerNames[player.id] = player.name;
  const jackpotOn = settled.rules.mode === 'hongkong' && settled.rules.jackpotEnabled;
  const entry: HistoryEntry = {
    id: settled.id,
    archivedAt: now,
    summary: {
      rulesName: rulesTitle(settled.rules),
      mode: settled.rules.mode,
      playerCount: settled.rules.playerCount,
      net: nets,
      playerNames,
      handCount: settled.hands.length,
      finalPool: jackpotOn ? settled.jackpotPool : undefined,
    },
    session: settled,
  };
  return [entry, ...history.filter((item) => item.id !== entry.id)].slice(0, HISTORY_LIMIT);
}
