import { TurnCursor, newPlayerState } from './turns';
import { dartPoints } from './types';
import type { Dart, GameConfig, GameMode, GameState } from './types';

function isBust(rest: number, d: Dart, doubleOut: boolean): boolean {
  if (rest < 0) return true;
  if (!doubleOut) return false;
  return rest === 1 || (rest === 0 && d.multiplier !== 2);
}

export const x01Mode: GameMode = {
  computeState(config: GameConfig, darts: Dart[]): GameState {
    const { start, doubleOut } = config.x01 ?? { start: 501, doubleOut: false };
    const players = config.playerIds.map((id) => newPlayerState(id, start));
    const cursor = new TurnCursor(config.playerIds);
    let winnerId: string | null = null;
    let bust = false;
    let turnStartScore: number = start;
    let turnPoints = 0;

    for (const d of darts) {
      if (winnerId) break;
      cursor.expect(d);
      const p = players[cursor.index];
      bust = false;
      if (cursor.isFirstDart) {
        turnStartScore = p.score;
        turnPoints = 0;
        p.turnsPlayed++;
      }
      cursor.add(d);

      const points = dartPoints(d);
      const rest = p.score - points;
      if (isBust(rest, d, doubleOut)) {
        p.score = turnStartScore;
        p.pointsScored -= turnPoints;
        bust = true;
        cursor.endTurn();
        continue;
      }
      p.score = rest;
      p.pointsScored += points;
      turnPoints += points;
      if (rest === 0) {
        winnerId = p.playerId;
      } else if (cursor.isFull) {
        cursor.endTurn();
      }
    }

    return {
      players,
      currentPlayerId: cursor.playerId,
      turnDarts: cursor.darts,
      round: cursor.round,
      winnerId,
      bust,
    };
  },
};
