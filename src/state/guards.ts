import type { CustomPreset, HandRecord, Player, Rules, Session, Wind } from '../domain/types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNumberMap(value: unknown): value is Record<string, number> {
  if (!isRecord(value)) return false;
  return Object.values(value).every((entry) => typeof entry === 'number');
}

function isPlayerCount(value: unknown): value is 3 | 4 {
  return value === 3 || value === 4;
}

function isWind(value: unknown): value is Wind {
  return value === 'E' || value === 'S' || value === 'W' || value === 'N';
}

export function isRules(value: unknown): value is Rules {
  if (!isRecord(value) || typeof value.name !== 'string' || !isPlayerCount(value.playerCount)) return false;
  if (value.mode === 'hongkong') {
    return (
      (value.chongMode === 'full' || value.chongMode === 'half') &&
      typeof value.minFan === 'number' &&
      typeof value.maxFan === 'number' &&
      typeof value.startScore === 'number' &&
      (value.curve === 'halfDouble' || value.curve === 'fullDouble') &&
      typeof value.selfDrawFactor === 'number' &&
      typeof value.jackpotEnabled === 'boolean' &&
      typeof value.recordDealer === 'boolean' &&
      typeof value.recordWind === 'boolean'
    );
  }
  if (value.mode === 'paoma') {
    return (
      typeof value.kong === 'number' &&
      typeof value.hu === 'number' &&
      typeof value.horse === 'number' &&
      typeof value.horseCountMax === 'number' &&
      typeof value.baoSelfDraw === 'boolean' &&
      typeof value.recordDealer === 'boolean' &&
      typeof value.douDiZhuEnabled === 'boolean'
    );
  }
  return false;
}

function isPlayer(value: unknown): value is Player {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.score === 'number' &&
    typeof value.seatIndex === 'number'
  );
}

function isHand(value: unknown): value is HandRecord {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.index === 'number' &&
    (value.kind === 'win' || value.kind === 'draw' || value.kind === 'kong') &&
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
  if (value.version !== 2 || typeof value.id !== 'string' || typeof value.updatedAt !== 'string') return false;
  if (value.status !== 'active' && value.status !== 'settled') return false;
  if (typeof value.dealerId !== 'string' || typeof value.dealerStreak !== 'number') return false;
  if (!isWind(value.wind) || typeof value.windsCompleted !== 'number') return false;
  if (!isRules(value.rules)) return false;
  if (!Array.isArray(value.players) || value.players.length !== value.rules.playerCount) return false;
  if (!value.players.every(isPlayer)) return false;
  const seats = value.players.map((player) => player.seatIndex).sort((a, b) => a - b);
  const expected = value.players.map((_, index) => index);
  if (seats.some((seat, index) => seat !== expected[index])) return false;
  if (!isNumberMap(value.startingScores)) return false;
  if (!Array.isArray(value.hands) || !value.hands.every(isHand)) return false;
  return true;
}

export function isCustomPreset(value: unknown): value is CustomPreset {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string' && typeof value.createdAt === 'string' && isRules(value.rules);
}

export interface LegacyPlayer {
  id: string;
  name: string;
  score: number;
  seatIndex: number;
}

export interface LegacySession {
  id: string;
  players: LegacyPlayer[];
  startingScores: Record<string, number>;
  status: 'active' | 'settled';
}

export function isLegacySession(value: unknown): value is LegacySession {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string') return false;
  if (value.status !== 'active' && value.status !== 'settled') return false;
  if (!Array.isArray(value.players) || value.players.length !== 4 || !value.players.every(isPlayer)) return false;
  if (!isNumberMap(value.startingScores)) return false;
  const seats = new Set(value.players.map((player) => player.seatIndex));
  return seats.size === 4 && [0, 1, 2, 3].every((seat) => seats.has(seat));
}
