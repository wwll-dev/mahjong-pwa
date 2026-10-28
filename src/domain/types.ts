export type PlayerId = string;
export type Curve = 'halfDouble' | 'fullDouble';
export type Wind = 'E' | 'S' | 'W' | 'N';
export type PlayerCount = 3 | 4;

export interface Player {
  id: PlayerId;
  name: string;
  score: number;
  seatIndex: number;
}

export interface HongKongRules {
  mode: 'hongkong';
  name: string;
  playerCount: PlayerCount;
  chongMode: 'full' | 'half';
  minFan: number;
  maxFan: number;
  startScore: number;
  curve: Curve;
  selfDrawFactor: number;
  jackpotEnabled: boolean;
  recordDealer: boolean;
  recordWind: boolean;
}

export interface PaoMaRules {
  mode: 'paoma';
  name: string;
  playerCount: PlayerCount;
  kong: number;
  hu: number;
  horse: number;
  horseCountMax: number;
  baoSelfDraw: boolean;
  recordDealer: boolean;
  douDiZhuEnabled: boolean;
}

export type Rules = HongKongRules | PaoMaRules;

export interface HandRecord {
  id: string;
  index: number;
  kind: 'win' | 'draw' | 'kong';
  winnerId?: PlayerId;
  winType?: 'discard' | 'selfDraw';
  discarderId?: PlayerId;
  baoPlayerId?: PlayerId;
  fan?: number;
  horsesHit?: number;
  kongPlayerId?: PlayerId;
  deltas: Record<PlayerId, number>;
  dealerIdBefore: PlayerId;
  dealerIdAfter: PlayerId;
  dealerStreakBefore: number;
  dealerStreakAfter: number;
  windBefore?: Wind;
  windAfter?: Wind;
  createdAt: string;
}

export interface Session {
  id: string;
  version: 2;
  rules: Rules;
  players: Player[];
  dealerId: PlayerId;
  dealerStreak: number;
  wind: Wind;
  windsCompleted: number;
  hands: HandRecord[];
  startingScores: Record<PlayerId, number>;
  status: 'active' | 'settled';
  updatedAt: string;
}

export interface CustomPreset {
  id: string;
  rules: Rules;
  createdAt: string;
}

export interface SeatRef {
  id: PlayerId;
  seatIndex: number;
}
