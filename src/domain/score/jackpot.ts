import { normalizeZeros } from '../deltas';
import type { PlayerId, Rules } from '../types';

export interface JackpotInput {
  playerIds: readonly PlayerId[];
  ante: number;
  maxFan: number;
  enabled: boolean;
  kind: 'win' | 'draw' | 'kong';
  fan?: number;
  winnerId?: PlayerId;
  pool: number;
  deltas: Record<PlayerId, number>;
}

export interface JackpotResult {
  deltas: Record<PlayerId, number>;
  pool: number;
  jackpotAnteTotal: number;
  jackpotPayout: number;
}

/**
 * Hong Kong jackpot pool.
 * Win and draw: each player pays `ante`, then a win with fan >= maxFan takes the whole pool.
 * Kong never antes and never pays the pool out.
 */
export function applyJackpot(input: JackpotInput): JackpotResult {
  const deltas = { ...input.deltas };
  if (!input.enabled || (input.kind !== 'win' && input.kind !== 'draw')) {
    return {
      deltas: normalizeZeros(deltas),
      pool: input.pool,
      jackpotAnteTotal: 0,
      jackpotPayout: 0,
    };
  }

  const anteTotal = input.ante * input.playerIds.length;
  for (const id of input.playerIds) {
    deltas[id] = (deltas[id] ?? 0) - input.ante;
  }

  let pool = input.pool + anteTotal;
  let payout = 0;
  const fullHand = input.kind === 'win' && (input.fan ?? 0) >= input.maxFan && Boolean(input.winnerId);
  if (fullHand && input.winnerId) {
    payout = pool;
    deltas[input.winnerId] = (deltas[input.winnerId] ?? 0) + pool;
    pool = 0;
  }

  return {
    deltas: normalizeZeros(deltas),
    pool,
    jackpotAnteTotal: anteTotal,
    jackpotPayout: payout,
  };
}

/** Walk recorded hands so the pool matches what was actually posted. Missing fields count as zero. */
export function replayJackpotPool(
  rules: Rules,
  hands: readonly { kind: string; jackpotAnteTotal?: number; jackpotPayout?: number }[],
): number {
  if (rules.mode !== 'hongkong' || !rules.jackpotEnabled) return 0;
  let pool = 0;
  for (const hand of hands) {
    if (hand.kind !== 'win' && hand.kind !== 'draw') continue;
    pool += hand.jackpotAnteTotal ?? 0;
    pool -= hand.jackpotPayout ?? 0;
  }
  return pool;
}
