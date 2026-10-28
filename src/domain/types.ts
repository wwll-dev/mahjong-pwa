export type PlayerId = string;

export interface Player {
  id: PlayerId;
  name: string;
  score: number;
  seatIndex: 0 | 1 | 2 | 3;
}

export interface HongKongRules {
  mode: 'hongkong';
  baseScore: number;
  chongMode: 'full' | 'half';
  selfDrawMultiplier: number;
}

export interface PaoMaRules {
  mode: 'paoma';
  baseScore: number;
  horseCount: number;
  horseUnit: number;
  baoSelfDraw: boolean;
}

export type Rules = HongKongRules | PaoMaRules;

export interface HandRecord {
  id: string;
  index: number;
  outcome: 'win' | 'draw';
  winnerId?: PlayerId;
  winType?: 'discard' | 'selfDraw';
  discarderId?: PlayerId;
  baoPlayerId?: PlayerId;
  fan?: number;
  horsesHit?: number;
  deltas: Record<PlayerId, number>;
  dealerIdBefore: PlayerId;
  dealerIdAfter: PlayerId;
  dealerStreakBefore: number;
  dealerStreakAfter: number;
  createdAt: string;
}

export interface Session {
  id: string;
  rules: Rules;
  players: Player[];
  dealerId: PlayerId;
  dealerStreak: number;
  hands: HandRecord[];
  startingScores: Record<PlayerId, number>;
  status: 'active' | 'settled';
  updatedAt: string;
}

export interface SeatRef {
  id: PlayerId;
  seatIndex: number;
}
