import { windLabel } from './dealer';
import { fanPatternName } from './fanCatalog';
import { formatPoints } from './format';
import type { HandRecord, KongKind, Session } from './types';

export function playerName(session: Session, id?: string): string {
  return session.players.find((player) => player.id === id)?.name ?? '—';
}

export function kongKindLabel(kind?: KongKind): string {
  if (kind === 'an') return '暗槓';
  if (kind === 'jia') return '加槓';
  return '明槓';
}

export function handTitle(session: Session, hand: HandRecord): string {
  if (hand.kind === 'draw') return `第 ${hand.index} 鋪 · 流局`;
  if (hand.kind === 'kong') {
    return `第 ${hand.index} 鋪 · ${playerName(session, hand.kongPlayerId)} ${kongKindLabel(hand.kongKind)}`;
  }
  const how = hand.winType === 'selfDraw' ? '自摸' : `出銃 ${playerName(session, hand.discarderId)}`;
  return `第 ${hand.index} 鋪 · ${playerName(session, hand.winnerId)} ${how}`;
}

function dealerNote(session: Session, hand: HandRecord): string {
  if (!session.rules.recordDealer) return '';
  if (hand.kind === 'kong') return '莊不變';
  if (hand.dealerIdBefore === hand.dealerIdAfter) return '連莊';
  return '過莊';
}

export function handDetail(session: Session, hand: HandRecord): string {
  const parts: string[] = [];
  if (hand.kind === 'win' && session.rules.mode === 'hongkong') parts.push(`${hand.fan} 番`);
  if (hand.fanBreakdown?.length) {
    parts.push(hand.fanBreakdown.map((pick) => {
      const name = fanPatternName(pick.id);
      return pick.count && pick.count > 1 ? `${name}×${pick.count}` : name;
    }).join('、'));
  }
  if (hand.kind === 'win' && session.rules.mode === 'paoma') parts.push(`中 ${hand.horsesHit} 隻`);
  if (hand.baoPlayerId) parts.push(`包 ${playerName(session, hand.baoPlayerId)}`);
  if (hand.kind === 'kong' && hand.kongKind === 'ming' && hand.discarderId) {
    parts.push(`點槓 ${playerName(session, hand.discarderId)}`);
  }
  if (hand.jackpotAnteTotal) parts.push(`入池 ${hand.jackpotAnteTotal}`);
  if (hand.jackpotPayout) parts.push(`派彩 ${hand.jackpotPayout}`);
  const moves = [...session.players]
    .sort((a, b) => a.seatIndex - b.seatIndex)
    .filter((player) => hand.deltas[player.id])
    .map((player) => `${player.name} ${formatPoints(hand.deltas[player.id] ?? 0)}`)
    .join(' · ');
  if (moves) parts.push(moves);
  const note = dealerNote(session, hand);
  if (note) parts.push(note);
  if (hand.windBefore && hand.windAfter && hand.windBefore !== hand.windAfter) {
    parts.push(`${windLabel(hand.windBefore)} → ${windLabel(hand.windAfter)}`);
  }
  return parts.join(' · ') || '分數不變';
}
