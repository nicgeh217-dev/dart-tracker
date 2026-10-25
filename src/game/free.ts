import { TurnCursor, newPlayerState } from './turns';
import { dartPoints } from './types';
import type { Dart, GameConfig, GameMode, GameState } from './types';

export const freeMode: GameMode = {
  computeState(config: GameConfig, darts: Dart[]): GameState {
    const players = config.playerIds.map((id) => newPlayerState(id));
    const cursor = new TurnCursor(config.playerIds);

    for (const d of darts) {
      cursor.expect(d);
      const p = players[cursor.index];
      if (cursor.isFirstDart) p.turnsPlayed++;
      cursor.add(d);
      const points = dartPoints(d);
      p.score += points;
      p.pointsScored += points;
      if (cursor.isFull) cursor.endTurn();
    }

    return {
      players,
      currentPlayerId: cursor.playerId,
      turnDarts: cursor.darts,
      round: cursor.round,
      winnerId: null,
      bust: false,
    };
  },
};

/** Spieler mit der höchsten Summe, bei Gleichstand der erste in Spielreihenfolge. */
export function freeLeader(state: GameState): string {
  let best = state.players[0];
  for (const p of state.players) {
    if (p.score > best.score) best = p;
  }
  return best.playerId;
}
