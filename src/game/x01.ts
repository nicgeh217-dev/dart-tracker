import { sideOf } from './sides';
import { TurnCursor, mirrorSides, newPlayerState, newSides } from './turns';
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
    const sides = newSides(config, start);
    const cursor = new TurnCursor(config.playerIds);
    let winnerId: string | null = null;
    let bust = false;
    let turnStartScore: number = start;
    let turnPoints = 0;

    for (const d of darts) {
      if (winnerId) break;
      cursor.expect(d);
      const p = players[cursor.index];
      const side = sides.find((s) => s.sideId === sideOf(config, d.playerId))!;
      bust = false;
      if (cursor.isFirstDart) {
        turnStartScore = side.score;
        turnPoints = 0;
        p.turnsPlayed++;
      }
      cursor.add(d);

      const points = dartPoints(d);
      const rest = side.score - points;
      if (isBust(rest, d, doubleOut)) {
        side.score = turnStartScore;
        p.pointsScored -= turnPoints;
        bust = true;
        cursor.endTurn();
        continue;
      }
      side.score = rest;
      p.pointsScored += points;
      turnPoints += points;
      if (rest === 0) {
        winnerId = side.sideId;
      } else if (cursor.isFull) {
        cursor.endTurn();
      }
    }

    mirrorSides(players, sides);
    return {
      players,
      sides,
      currentPlayerId: cursor.playerId,
      currentSideId: sideOf(config, cursor.playerId),
      turnDarts: cursor.darts,
      round: cursor.round,
      winnerId,
      bust,
    };
  },
};
