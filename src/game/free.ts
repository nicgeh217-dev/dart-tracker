import { sideOf } from './sides';
import { TurnCursor, mirrorSides, newPlayerState, newSides } from './turns';
import { dartPoints } from './types';
import type { Dart, GameConfig, GameMode, GameState } from './types';

export const freeMode: GameMode = {
  computeState(config: GameConfig, darts: Dart[]): GameState {
    const players = config.playerIds.map((id) => newPlayerState(id));
    const sides = newSides(config);
    const cursor = new TurnCursor(config.playerIds);

    for (const d of darts) {
      cursor.expect(d);
      const p = players[cursor.index];
      const side = sides.find((s) => s.sideId === sideOf(config, d.playerId))!;
      if (cursor.isFirstDart) p.turnsPlayed++;
      cursor.add(d);
      const points = dartPoints(d);
      side.score += points;
      p.pointsScored += points;
      if (cursor.isFull) cursor.endTurn();
    }

    mirrorSides(players, sides);
    return {
      players,
      sides,
      currentPlayerId: cursor.playerId,
      currentSideId: sideOf(config, cursor.playerId),
      turnDarts: cursor.darts,
      round: cursor.round,
      winnerId: null,
      bust: false,
    };
  },
};

/** Seite mit der höchsten Summe (Seiten-ID), bei Gleichstand die erste in Spielreihenfolge. */
export function freeLeader(state: GameState): string {
  let best = state.sides[0];
  for (const s of state.sides) {
    if (s.score > best.score) best = s;
  }
  return best.sideId;
}
