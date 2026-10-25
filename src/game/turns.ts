import type { Dart, PlayerState } from './types';

export const DARTS_PER_TURN = 3;

export function newPlayerState(playerId: string, score = 0): PlayerState {
  return { playerId, score, marks: {}, pointsScored: 0, turnsPlayed: 0 };
}

/** Verfolgt beim Abspielen eines Dart-Logs, wer dran ist und in welcher Runde. */
export class TurnCursor {
  index = 0;
  round = 1;
  darts: Dart[] = [];

  constructor(private readonly playerIds: string[]) {}

  get playerId(): string {
    return this.playerIds[this.index];
  }

  /** Wirft, wenn der Dart nicht vom aktuellen Spieler stammt. */
  expect(d: Dart): void {
    if (d.playerId !== this.playerId) {
      throw new Error(`Dart von ${d.playerId}, aber ${this.playerId} ist dran`);
    }
  }

  get isFirstDart(): boolean {
    return this.darts.length === 0;
  }

  get isFull(): boolean {
    return this.darts.length >= DARTS_PER_TURN;
  }

  add(d: Dart): void {
    this.darts.push(d);
  }

  endTurn(): void {
    this.darts = [];
    this.index = (this.index + 1) % this.playerIds.length;
    if (this.index === 0) this.round++;
  }
}
