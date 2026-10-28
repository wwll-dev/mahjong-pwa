import type {
  CustomPreset,
  FanPick,
  HandRecord,
  HistoryEntry,
  HongKongRules,
  KongKind,
  PaoMaRules,
  Player,
  Rules,
  Session,
  Wind,
} from '../domain/types';

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

function isHongKongShape(value: Record<string, unknown>): boolean {
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

function isPaoMaShape(value: Record<string, unknown>): boolean {
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

export function isRules(value: unknown): value is Rules {
  if (!isRecord(value) || typeof value.name !== 'string' || !isPlayerCount(value.playerCount)) return false;
  if (value.mode === 'hongkong') {
    return isHongKongShape(value) && typeof value.jackpotAnte === 'number';
  }
  if (value.mode === 'paoma') return isPaoMaShape(value);
  return false;
}

/** v2 Hong Kong rules omit jackpotAnte. Fill it from the starting score. */
export function coerceRules(value: unknown): Rules | null {
  if (!isRecord(value) || typeof value.name !== 'string' || !isPlayerCount(value.playerCount)) return null;
  if (value.mode === 'hongkong') {
    if (!isHongKongShape(value) || typeof value.startScore !== 'number') return null;
    const ante = value.jackpotAnte;
    const jackpotAnte = typeof ante === 'number' && Number.isInteger(ante) && ante > 0 ? ante : value.startScore;
    const rules: HongKongRules = {
      ...(value as unknown as HongKongRules),
      mode: 'hongkong',
      jackpotAnte,
    };
    return rules;
  }
  if (value.mode === 'paoma') {
    if (!isPaoMaShape(value)) return null;
    return value as unknown as PaoMaRules;
  }
  return null;
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

function isKongKind(value: unknown): value is KongKind {
  return value === 'ming' || value === 'an' || value === 'jia';
}

function isFanPick(value: unknown): value is FanPick {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string' && typeof value.fan === 'number' && (
    value.count === undefined || typeof value.count === 'number'
  );
}

function isHand(value: unknown): value is HandRecord {
  if (!isRecord(value)) return false;
  if (value.kongKind !== undefined && !isKongKind(value.kongKind)) return false;
  if (value.fanBreakdown !== undefined && !(Array.isArray(value.fanBreakdown) && value.fanBreakdown.every(isFanPick))) {
    return false;
  }
  if (value.horses !== undefined && !(Array.isArray(value.horses) && value.horses.every((hit) => typeof hit === 'boolean'))) {
    return false;
  }
  for (const key of ['jackpotAnteTotal', 'jackpotPayout', 'poolAfter', 'horsesHit', 'fan'] as const) {
    if (value[key] !== undefined && typeof value[key] !== 'number') return false;
  }
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

function sessionShape(value: Record<string, unknown>, rules: Rules): boolean {
  if (typeof value.id !== 'string' || typeof value.updatedAt !== 'string') return false;
  if (value.status !== 'active' && value.status !== 'settled') return false;
  if (typeof value.dealerId !== 'string' || typeof value.dealerStreak !== 'number') return false;
  if (!isWind(value.wind) || typeof value.windsCompleted !== 'number') return false;
  if (!Array.isArray(value.players) || value.players.length !== rules.playerCount) return false;
  if (!value.players.every(isPlayer)) return false;
  const seats = value.players.map((player) => player.seatIndex).sort((a, b) => a - b);
  const expected = value.players.map((_, index) => index);
  if (seats.some((seat, index) => seat !== expected[index])) return false;
  if (!isNumberMap(value.startingScores)) return false;
  if (!Array.isArray(value.hands) || !value.hands.every(isHand)) return false;
  return true;
}

export function isSession(value: unknown): value is Session {
  if (!isRecord(value) || value.version !== 3 || typeof value.jackpotPool !== 'number') return false;
  if (!isRules(value.rules)) return false;
  return sessionShape(value, value.rules);
}

/** Accept a v2 session and lift it to v3. Scores on old hands stay as recorded. */
export function coerceSession(value: unknown): Session | null {
  if (!isRecord(value) || (value.version !== 2 && value.version !== 3)) return null;
  const rules = coerceRules(value.rules);
  if (!rules || !sessionShape(value, rules)) return null;
  const jackpotPool = typeof value.jackpotPool === 'number' && Number.isFinite(value.jackpotPool)
    ? value.jackpotPool
    : 0;
  const session = {
    ...(value as unknown as Session),
    version: 3 as const,
    rules,
    jackpotPool,
  };
  return isSession(session) ? session : null;
}

export function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.archivedAt !== 'string') return false;
  if (!isRecord(value.summary) || typeof value.summary.rulesName !== 'string') return false;
  if (value.summary.mode !== 'hongkong' && value.summary.mode !== 'paoma') return false;
  if (!isPlayerCount(value.summary.playerCount) || typeof value.summary.handCount !== 'number') return false;
  if (!isNumberMap(value.summary.net)) return false;
  const session = coerceSession(value.session);
  if (!session || session.id !== value.id) return false;
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
