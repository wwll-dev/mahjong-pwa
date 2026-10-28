import type { PlayerId, SeatRef } from './types';

export interface PairwisePayment {
  fromId: PlayerId;
  toId: PlayerId;
  amount: number;
}

export function playerNets(
  players: readonly { id: PlayerId; score: number }[],
  startingScores: Record<PlayerId, number>,
): Record<PlayerId, number> {
  const nets: Record<PlayerId, number> = {};
  for (const player of players) {
    nets[player.id] = player.score - (startingScores[player.id] ?? 0);
  }
  return nets;
}

/** Greedy: repeatedly match the largest credit with the largest debt. Seat order breaks ties. */
export function pairwiseSettle(
  nets: Record<PlayerId, number>,
  players: readonly SeatRef[],
): PairwisePayment[] {
  const order = [...players].sort((a, b) => a.seatIndex - b.seatIndex);
  const creditors: { id: PlayerId; amount: number; seat: number }[] = [];
  const debtors: { id: PlayerId; amount: number; seat: number }[] = [];
  for (const player of order) {
    const net = nets[player.id] ?? 0;
    if (net > 0) creditors.push({ id: player.id, amount: net, seat: player.seatIndex });
    else if (net < 0) debtors.push({ id: player.id, amount: -net, seat: player.seatIndex });
  }

  const rank = (
    a: { amount: number; seat: number },
    b: { amount: number; seat: number },
  ) => b.amount - a.amount || a.seat - b.seat;

  const payments: PairwisePayment[] = [];
  const epsilon = 1e-9;
  while (true) {
    const creditor = creditors.filter((entry) => entry.amount > epsilon).sort(rank)[0];
    const debtor = debtors.filter((entry) => entry.amount > epsilon).sort(rank)[0];
    if (!creditor || !debtor) break;
    const amount = Math.min(creditor.amount, debtor.amount);
    payments.push({ fromId: debtor.id, toId: creditor.id, amount });
    creditor.amount -= amount;
    debtor.amount -= amount;
  }
  return payments;
}
