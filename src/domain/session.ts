import { advanceDealer, type DealerState } from './dealer';
import { createId } from './id';
import { recordWindOf, rulesError } from './rules';
import { hongKongDeltas } from './score/hongkongPay';
import { paoMaDeltas, paoMaKongDeltas } from './score/paomaPay';
import { zeroDeltas } from './deltas';
import type { HandRecord, Player, PlayerId, Rules, Session, Wind } from './types';

export interface NewSessionInput {
  rules: Rules;
  names: string[];
  dealerSeat: number;
}

export type HandDraft =
  | { kind: 'draw' }
  | {
      kind: 'win';
      winnerId: PlayerId;
      winType: 'discard' | 'selfDraw';
      discarderId?: PlayerId;
      baoPlayerId?: PlayerId;
      fan?: number;
      horsesHit?: number;
    }
  | {
      kind: 'kong';
      kongPlayerId: PlayerId;
      discarderId?: PlayerId;
    };

export function validateSetup(input: NewSessionInput): string | null {
  const ruleError = rulesError(input.rules);
  if (ruleError) return ruleError;
  const names = input.names.map((name) => name.trim());
  const count = input.rules.playerCount;
  if (names.length !== count) return '玩家人數唔啱';
  if (names.some((name) => name.length === 0)) return '玩家名唔可以空白';
  if (new Set(names).size !== count) return '玩家名要全部唔同';
  if (input.rules.recordDealer) {
    if (!Number.isInteger(input.dealerSeat) || input.dealerSeat < 0 || input.dealerSeat >= count) {
      return '請選莊家';
    }
  }
  return null;
}

export function createSession(input: NewSessionInput, now = new Date().toISOString()): Session {
  const error = validateSetup(input);
  if (error) throw new Error(error);
  const dealerSeat = input.rules.recordDealer ? input.dealerSeat : 0;
  const players: Player[] = input.names.map((name, index) => ({
    id: createId(),
    name: name.trim(),
    score: 0,
    seatIndex: index,
  }));
  const startingScores: Record<PlayerId, number> = {};
  for (const player of players) startingScores[player.id] = 0;
  return {
    id: createId(),
    version: 2,
    rules: input.rules,
    players,
    dealerId: players[dealerSeat]?.id ?? players[0].id,
    dealerStreak: 0,
    wind: 'E',
    windsCompleted: 0,
    hands: [],
    startingScores,
    status: 'active',
    updatedAt: now,
  };
}

export function handError(session: Session, draft: HandDraft): string | null {
  if (draft.kind === 'draw') return null;
  if (draft.kind === 'kong') {
    if (session.rules.mode !== 'paoma') return '港麻唔記槓';
    if (!session.players.some((player) => player.id === draft.kongPlayerId)) return '請選槓牌玩家';
    if (draft.discarderId) {
      if (!session.players.some((player) => player.id === draft.discarderId)) return '請選點槓玩家';
      if (draft.discarderId === draft.kongPlayerId) return '點槓玩家唔可以係槓牌玩家';
    }
    return null;
  }
  if (!draft.winnerId || !session.players.some((player) => player.id === draft.winnerId)) return '請選胡牌玩家';
  if (draft.winType !== 'discard' && draft.winType !== 'selfDraw') return '請選食糊方式';
  if (draft.winType === 'discard') {
    if (!draft.discarderId || !session.players.some((player) => player.id === draft.discarderId)) {
      return '請選出銃玩家';
    }
    if (draft.discarderId === draft.winnerId) return '出銃玩家唔可以係胡牌玩家';
  }
  if (session.rules.mode === 'hongkong') {
    if (!Number.isInteger(draft.fan) || (draft.fan ?? 0) < session.rules.minFan || (draft.fan ?? 0) > session.rules.maxFan) {
      return '番數超出範圍';
    }
    return null;
  }
  const hit = draft.horsesHit ?? -1;
  if (!Number.isInteger(draft.horsesHit) || hit < 0 || hit > session.rules.horseCountMax) return '中馬數超出範圍';
  if (draft.winType === 'selfDraw' && session.rules.baoSelfDraw) {
    if (!draft.baoPlayerId || !session.players.some((player) => player.id === draft.baoPlayerId)) return '請選包自摸玩家';
    if (draft.baoPlayerId === draft.winnerId) return '包家唔可以係胡牌玩家';
  }
  return null;
}

function tableState(session: Session): DealerState {
  return {
    dealerId: session.dealerId,
    dealerStreak: session.dealerStreak,
    wind: session.wind,
    windsCompleted: session.windsCompleted,
  };
}

export function projectSession(session: Session): Session {
  const scores: Record<PlayerId, number> = { ...session.startingScores };
  for (const player of session.players) {
    if (scores[player.id] === undefined) scores[player.id] = 0;
  }

  let dealerId = session.dealerId;
  let dealerStreak = session.dealerStreak;
  let wind: Wind = session.wind;
  let windsCompleted = session.windsCompleted;

  if (session.hands.length > 0) {
    const first = session.hands[0];
    dealerId = first.dealerIdBefore;
    dealerStreak = first.dealerStreakBefore;
    wind = first.windBefore ?? 'E';
    windsCompleted = 0;
    for (const hand of session.hands) {
      for (const player of session.players) {
        scores[player.id] = (scores[player.id] ?? 0) + (hand.deltas[player.id] ?? 0);
      }
      dealerId = hand.dealerIdAfter;
      dealerStreak = hand.dealerStreakAfter;
      const before = hand.windBefore ?? wind;
      const after = hand.windAfter ?? before;
      if (before !== after) windsCompleted += 1;
      wind = after;
    }
  }

  return {
    ...session,
    dealerId,
    dealerStreak,
    wind,
    windsCompleted,
    players: session.players.map((player) => ({ ...player, score: scores[player.id] ?? 0 })),
  };
}

function scoreDraft(session: Session, draft: Exclude<HandDraft, { kind: 'draw' }>): Record<PlayerId, number> {
  if (draft.kind === 'kong') {
    if (session.rules.mode !== 'paoma') throw new Error('港麻唔記槓');
    return paoMaKongDeltas(session.players, session.rules, draft.kongPlayerId);
  }
  if (session.rules.mode === 'hongkong') {
    return hongKongDeltas(session.players, session.rules, draft);
  }
  return paoMaDeltas(session.players, session.rules, draft);
}

export function previewDeltas(session: Session, draft: HandDraft): Record<PlayerId, number> {
  const error = handError(session, draft);
  if (error) throw new Error(error);
  if (draft.kind === 'draw') return zeroDeltas(session.players);
  return scoreDraft(session, draft);
}

export function recordHand(session: Session, draft: HandDraft, now = new Date().toISOString()): Session {
  const error = handError(session, draft);
  if (error) throw new Error(error);
  const base = projectSession(session);
  const deltas = draft.kind === 'draw' ? zeroDeltas(base.players) : scoreDraft(base, draft);
  const before = tableState(base);
  const after = advanceDealer(
    base.players,
    before,
    draft.kind,
    { recordDealer: base.rules.recordDealer, recordWind: recordWindOf(base.rules) },
    draft.kind === 'win' ? draft.winnerId : undefined,
  );
  const hand: HandRecord = {
    id: createId(),
    index: base.hands.length + 1,
    kind: draft.kind,
    deltas,
    dealerIdBefore: before.dealerId,
    dealerIdAfter: after.dealerId,
    dealerStreakBefore: before.dealerStreak,
    dealerStreakAfter: after.dealerStreak,
    windBefore: before.wind,
    windAfter: after.wind,
    createdAt: now,
  };
  if (draft.kind === 'win') {
    hand.winnerId = draft.winnerId;
    hand.winType = draft.winType;
    if (draft.winType === 'discard') hand.discarderId = draft.discarderId;
    if (base.rules.mode === 'hongkong') hand.fan = draft.fan;
    if (base.rules.mode === 'paoma') {
      hand.horsesHit = draft.horsesHit;
      if (draft.winType === 'selfDraw' && base.rules.baoSelfDraw) hand.baoPlayerId = draft.baoPlayerId;
    }
  }
  if (draft.kind === 'kong') {
    hand.kongPlayerId = draft.kongPlayerId;
    if (draft.discarderId) hand.discarderId = draft.discarderId;
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
  const next: Session = {
    ...session,
    hands,
    updatedAt: now,
  };
  if (hands.length === 0) {
    next.dealerId = removed.dealerIdBefore;
    next.dealerStreak = removed.dealerStreakBefore;
    next.wind = removed.windBefore ?? 'E';
    next.windsCompleted = 0;
  }
  return projectSession(next);
}
