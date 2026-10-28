import { advanceDealer } from './dealer';
import { createId } from './id';
import { hongKongDeltas, paoMaDeltas, zeroDeltas, type WinInput } from './score';
import type { HandRecord, Player, PlayerId, Rules, Session } from './types';

export interface NewSessionInput {
  mode: 'hongkong' | 'paoma';
  names: [string, string, string, string];
  dealerSeat: 0 | 1 | 2 | 3;
  baseScore: number;
  chongMode: 'full' | 'half';
  selfDrawMultiplier: number;
  horseCount: number;
  horseUnit: number;
  baoSelfDraw: boolean;
}

export type HandDraft =
  | { outcome: 'draw' }
  | (WinInput & { outcome: 'win' });

export function validateSetup(input: NewSessionInput): string | null {
  const names = input.names.map((name) => name.trim());
  if (names.some((name) => name.length === 0)) return '玩家名唔可以空白';
  if (new Set(names).size !== 4) return '玩家名要四個唔同';
  if (!Number.isInteger(input.baseScore) || input.baseScore <= 0) return '底分要係正整數';
  if (input.dealerSeat < 0 || input.dealerSeat > 3) return '請選莊家';
  if (input.mode === 'hongkong') {
    if (input.chongMode !== 'full' && input.chongMode !== 'half') return '請選銃法';
    if (!Number.isInteger(input.selfDrawMultiplier) || input.selfDrawMultiplier < 1) {
      return '自摸倍數至少 1';
    }
    return null;
  }
  if (!Number.isInteger(input.horseCount) || input.horseCount < 0 || input.horseCount > 8) {
    return '馬數要係 0 至 8';
  }
  if (!Number.isInteger(input.horseUnit) || input.horseUnit < 0) return '馬分要係 0 或正整數';
  return null;
}

export function createSession(input: NewSessionInput, now = new Date().toISOString()): Session {
  const error = validateSetup(input);
  if (error) throw new Error(error);
  const players: Player[] = input.names.map((name, index) => ({
    id: createId(),
    name: name.trim(),
    score: 0,
    seatIndex: index as Player['seatIndex'],
  }));
  const startingScores: Record<PlayerId, number> = {};
  for (const player of players) startingScores[player.id] = 0;
  const rules: Rules =
    input.mode === 'hongkong'
      ? {
          mode: 'hongkong',
          baseScore: input.baseScore,
          chongMode: input.chongMode,
          selfDrawMultiplier: input.selfDrawMultiplier,
        }
      : {
          mode: 'paoma',
          baseScore: input.baseScore,
          horseCount: input.horseCount,
          horseUnit: input.horseUnit,
          baoSelfDraw: input.baoSelfDraw,
        };
  return {
    id: createId(),
    rules,
    players,
    dealerId: players[input.dealerSeat].id,
    dealerStreak: 0,
    hands: [],
    startingScores,
    status: 'active',
    updatedAt: now,
  };
}

export function handError(session: Session, draft: HandDraft): string | null {
  if (draft.outcome === 'draw') return null;
  if (!draft.winnerId || !session.players.some((player) => player.id === draft.winnerId)) {
    return '請選胡牌玩家';
  }
  if (draft.winType !== 'discard' && draft.winType !== 'selfDraw') return '請選食糊方式';
  if (draft.winType === 'discard') {
    if (!draft.discarderId || !session.players.some((player) => player.id === draft.discarderId)) {
      return '請選出銃玩家';
    }
    if (draft.discarderId === draft.winnerId) return '出銃玩家唔可以係胡牌玩家';
  }
  if (session.rules.mode === 'hongkong') {
    if (!Number.isInteger(draft.fan) || (draft.fan ?? 0) < 1) return '番數至少 1';
    return null;
  }
  if (!Number.isInteger(draft.horsesHit) || (draft.horsesHit ?? -1) < 0 || (draft.horsesHit ?? 0) > session.rules.horseCount) {
    return '中馬數超出範圍';
  }
  if (draft.winType === 'selfDraw' && session.rules.baoSelfDraw) {
    if (!draft.baoPlayerId || !session.players.some((player) => player.id === draft.baoPlayerId)) {
      return '請選包自摸玩家';
    }
    if (draft.baoPlayerId === draft.winnerId) return '包家唔可以係胡牌玩家';
  }
  return null;
}

export function projectSession(session: Session): Session {
  const scores: Record<PlayerId, number> = { ...session.startingScores };
  for (const player of session.players) {
    if (scores[player.id] === undefined) scores[player.id] = 0;
  }

  let dealerId = session.dealerId;
  let dealerStreak = session.dealerStreak;
  if (session.hands.length > 0) {
    dealerId = session.hands[0].dealerIdBefore;
    dealerStreak = session.hands[0].dealerStreakBefore;
    for (const hand of session.hands) {
      for (const player of session.players) {
        scores[player.id] = (scores[player.id] ?? 0) + (hand.deltas[player.id] ?? 0);
      }
      dealerId = hand.dealerIdAfter;
      dealerStreak = hand.dealerStreakAfter;
    }
  }

  return {
    ...session,
    dealerId,
    dealerStreak,
    players: session.players.map((player) => ({ ...player, score: scores[player.id] ?? 0 })),
  };
}

function scoreDraft(session: Session, draft: Exclude<HandDraft, { outcome: 'draw' }>): Record<PlayerId, number> {
  if (session.rules.mode === 'hongkong') return hongKongDeltas(session.players, session.rules, draft);
  return paoMaDeltas(session.players, session.rules, draft);
}

export function previewDeltas(session: Session, draft: HandDraft): Record<PlayerId, number> {
  const error = handError(session, draft);
  if (error) throw new Error(error);
  if (draft.outcome === 'draw') return zeroDeltas(session.players);
  return scoreDraft(session, draft);
}

export function recordHand(session: Session, draft: HandDraft, now = new Date().toISOString()): Session {
  const error = handError(session, draft);
  if (error) throw new Error(error);
  const base = projectSession(session);
  const deltas = draft.outcome === 'draw' ? zeroDeltas(base.players) : scoreDraft(base, draft);
  const before = { dealerId: base.dealerId, dealerStreak: base.dealerStreak };
  const after = advanceDealer(
    base.players,
    before,
    draft.outcome,
    draft.outcome === 'win' ? draft.winnerId : undefined,
  );
  const hand: HandRecord = {
    id: createId(),
    index: base.hands.length + 1,
    outcome: draft.outcome,
    deltas,
    dealerIdBefore: before.dealerId,
    dealerIdAfter: after.dealerId,
    dealerStreakBefore: before.dealerStreak,
    dealerStreakAfter: after.dealerStreak,
    createdAt: now,
  };
  if (draft.outcome === 'win') {
    hand.winnerId = draft.winnerId;
    hand.winType = draft.winType;
    if (draft.winType === 'discard') hand.discarderId = draft.discarderId;
    if (base.rules.mode === 'hongkong') hand.fan = draft.fan;
    if (base.rules.mode === 'paoma') {
      hand.horsesHit = draft.horsesHit;
      if (draft.winType === 'selfDraw' && base.rules.baoSelfDraw) hand.baoPlayerId = draft.baoPlayerId;
    }
  }
  return projectSession({
    ...base,
    hands: [...base.hands, hand],
    updatedAt: now,
  });
}

export function undoLastHand(session: Session, now = new Date().toISOString()): Session {
  if (session.hands.length === 0) return session;
  const removed = session.hands[session.hands.length - 1];
  const hands = session.hands.slice(0, -1);
  return projectSession({
    ...session,
    hands,
    dealerId: hands.length === 0 ? removed.dealerIdBefore : session.dealerId,
    dealerStreak: hands.length === 0 ? removed.dealerStreakBefore : session.dealerStreak,
    updatedAt: now,
  });
}
