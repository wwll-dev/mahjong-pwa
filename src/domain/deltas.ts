import type { PlayerId } from './types';

export function zeroDeltas(players: readonly { id: PlayerId }[]): Record<PlayerId, number> {
  const deltas: Record<PlayerId, number> = {};
  for (const player of players) deltas[player.id] = 0;
  return deltas;
}

export function sumDeltas(deltas: Record<PlayerId, number>): number {
  return Object.values(deltas).reduce((total, value) => total + value, 0);
}

/** `-0` fails deep equality. A zero payment is just 0. */
export function normalizeZeros(deltas: Record<PlayerId, number>): Record<PlayerId, number> {
  for (const id of Object.keys(deltas)) {
    if (deltas[id] === 0) deltas[id] = 0;
  }
  return deltas;
}
