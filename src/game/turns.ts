import { sidesOf } from './sides';
import type { Dart, GameConfig, PlayerState, SideState } from './types';

export const DARTS_PER_TURN = 3;

export function newPlayerState(playerId: string, score = 0): PlayerState {
  return { playerId, score, marks: {}, pointsScored: 0, turnsPlayed: 0 };
}

export function newSideState(sideId: string, playerIds: string[], score = 0): SideState {
  return { sideId, playerIds, score, marks: {} };
}

/** Seiten in Startreihenfolge, bei Einzelspielen eine je Spieler. */
export function newSides(config: GameConfig, score = 0): SideState[] {
  return sidesOf(config).map((s) => newSideState(s.id, s.playerIds, score));
}

/** Spiegelt Stand und Marks der Seite in die Spielerzustände ihrer Mitglieder. */
export function mirrorSides(players: PlayerState[], sides: SideState[]): void {
  for (const side of sides) {
    for (const p of players) {
      if (!side.playerIds.includes(p.playerId)) continue;
      p.score = side.score;
      p.marks = { ...side.marks };
    }
  }
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
