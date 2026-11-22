export type ThemeColorId = 'green' | 'orange' | 'purple' | 'blue' | 'crimson' | 'gold';
export type ArenaId = 'classic' | 'horror' | 'funny' | 'space' | 'jungle';
export type TopicId = 'mul' | 'div' | 'add' | 'sub' | 'sqrt' | 'geo';
export type FairMode = 'each' | 'adaptive' | 'both' | 'one';
export type PlayMode = 'multi' | 'device';
export type MoveMode = 'dice' | 'speed';
export type DecisionTimeSec = 0 | 5 | 10 | 15;
export type RuleKey = 'ladders' | 'snakes' | 'pushback' | 'allq' | 'cards' | 'steal' | 'penalty';
export type CardType = 'shield' | 'double' | 'freeze' | 'swap';
export type GamePhase = 'busy' | 'ready' | 'q' | 'roll' | 'choose' | 'race' | 'end';
export type AppView = 'setup' | 'lobby' | 'game' | 'pick' | 'client' | 'connect';

export interface AdminAccount {
  email: string;
  hash: string;
  root: boolean;
}

export interface RoomSettings {
  size: number;
  level: number;
  topics: TopicId[];
  tables: number[];
  fair: FairMode;
  ladders: boolean;
  snakes: boolean;
  pushback: boolean;
  allq: boolean;
  cards: boolean;
  steal: boolean;
  penalty: boolean;
  mode: PlayMode;
  moveMode: MoveMode;
  decisionTime: DecisionTimeSec;
  clientAudio: boolean;
  theme: ThemeColorId;
  arena: ArenaId;
}

export interface PlayerStats {
  t: Record<string, [number, number]>;
  tb: Record<string, [number, number]>;
  miss: Record<string, number>;
}

export interface PlayerProfile {
  id: string;
  name: string;
  emoji: string;
  on: boolean;
  level: number;
  topics: TopicId[];
  tables: number[];
  games: number;
  wins: number;
  best: number;
  st: PlayerStats;
}

export interface Room {
  id: string;
  name: string;
  code: string;
  set: RoomSettings;
  profiles: PlayerProfile[];
}

export interface AdminWorkspace {
  rooms: Room[];
  activeRoomId: string;
}

export interface Question {
  id: number;
  key: string;
  kind: 'calc' | 'geo';
  topic: TopicId;
  level: number;
  text: string;
  fig?: string;
  ans: string;
  show: string;
  opts: string[];
  tbl?: number;
  extra?: number;
  timeSec?: number;
  reveal?: { pick: number };
}

export interface BoardData {
  n: number;
  arena: ArenaId;
  lad: Record<number, number>;
  snk: Record<number, number>;
  allq: number[];
  surp: number[];
}

export interface PlayerRuntime {
  i: number;
  pid: string;
  token: string | null;
  name: string;
  named: boolean;
  emoji: string;
  color: string;
  pos: number;
  score: number;
  correct: number;
  wrong: number;
  streak: number;
  wrun: number;
  adj: number;
  cards: CardType[];
  recent: string[];
  frozen: boolean;
  dbl: boolean;
  buzz: 'turn' | 'good' | 'bad' | null;
}

export interface BoardPlayerView {
  i: number;
  name: string;
  emoji: string;
  color: string;
  pos: number;
  score: number;
  turn: boolean;
  off?: boolean;
  cards?: CardType[];
}

export interface PushTarget {
  i: number;
  name: string;
  emoji: string;
  pos: number;
  color: string;
}

export interface ClientViewMessage {
  t: 'view';
  phase: GamePhase;
  paused: boolean;
  name: string;
  emoji: string;
  color: string;
  score: number;
  pos: number;
  last: number;
  rank: number;
  n: number;
  streak: number;
  cards: CardType[];
  turn: boolean;
  cur: string;
  dice: number;
  canFwd: boolean;
  targets: PushTarget[];
  moveMode: MoveMode;
  clientAudio: boolean;
  theme: ThemeColorId;
  board: BoardData;
  players: BoardPlayerView[];
  msg: string;
  title: string;
  left: number;
  total: number;
  online: boolean;
  buzz: 'turn' | 'good' | 'bad' | null;
  out: boolean;
  won?: string;
  qid?: number;
  q?: {
    text: string;
    fig: string;
    kind: 'calc' | 'geo';
    opts: string[];
    timeSec?: number;
  };
  reveal?: { ans: string; pick: number } | null;
}

export interface ClientAudioPacket {
  t: 'audio';
  kind: 'sfx' | 'whistle' | 'comment';
  sfx?: 'tick' | 'step' | 'ok' | 'bad' | 'up' | 'down' | 'win' | 'warn';
  parts?: Array<string | { i: number; name: string; named?: boolean }>;
}

export interface FloatingFx {
  id: number;
  emoji: string;
  color: string;
  leftPct: number;
}

export interface ClientActionMessage {
  t: 'ask' | 'roll' | 'move' | 'answer' | 'card' | 'react';
  dir?: 'fwd' | 'back' | 'skip';
  target?: number;
  i?: number;
  id?: number;
  c?: CardType;
  e?: string;
}

export interface MatchRankingItem {
  rank: number;
  name: string;
  emoji: string;
  color: string;
  score: number;
  correct: number;
  wrong: number;
  pos: number;
}
