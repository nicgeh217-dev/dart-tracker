export type Multiplier = 1 | 2 | 3;
/** 0 = Miss, 25 = Bull */
export type Field =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 25;

export interface Dart {
  playerId: string;
  field: Field;
  multiplier: Multiplier;
}

export type ModeId = 'x01' | 'cricket' | 'free';

export interface GameConfig {
  mode: ModeId;
  playerIds: string[];
  x01?: { start: 301 | 501; doubleOut: boolean };
}

export interface PlayerState {
  playerId: string;
  /** X01: Rest, Cricket: Punkte, Frei: Summe */
  score: number;
  /** nur Cricket: Felder 15–20 und 25, je 0–3 */
  marks: Record<number, number>;
  /** gezählte Punkte (Bust-Runden zählen 0) */
  pointsScored: number;
  /** Runden mit mindestens einem Dart */
  turnsPlayed: number;
}

export interface GameState {
  players: PlayerState[];
  currentPlayerId: string;
  /** Darts der laufenden Runde */
  turnDarts: Dart[];
  /** 1-basiert */
  round: number;
  winnerId: string | null;
  /** der letzte Dart hat die Runde als Bust beendet */
  bust: boolean;
}

export interface GameMode {
  computeState(config: GameConfig, darts: Dart[]): GameState;
}

export interface Player {
  id: string;
  name: string;
}

export interface Game {
  id: string;
  config: GameConfig;
  playerNames: Record<string, string>;
  darts: Dart[];
  startedAt: number;
  finishedAt: number | null;
  winnerId: string | null;
}

export interface AppData {
  players: Player[];
  activeGame: Game | null;
  history: Game[];
}

export function isValidDart(field: Field, multiplier: Multiplier): boolean {
  if (field === 0) return multiplier === 1;
  if (field === 25) return multiplier === 1 || multiplier === 2;
  if (Number.isInteger(field) && field >= 1 && field <= 20) {
    return multiplier === 1 || multiplier === 2 || multiplier === 3;
  }
  return false;
}

export function dartPoints(d: { field: Field; multiplier: Multiplier }): number {
  return d.field * d.multiplier;
}
