import { sideOf } from './sides';
import { TurnCursor, mirrorSides, newPlayerState, newSides } from './turns';
import type { Dart, GameConfig, GameMode, GameState, PlayerState, SideState } from './types';

export const CRICKET_FIELDS: readonly number[] = [20, 19, 18, 17, 16, 15, 25];
const MARKS_TO_CLOSE = 3;

const isClosed = (s: SideState, field: number) => (s.marks[field] ?? 0) >= MARKS_TO_CLOSE;

function applyDart(sides: SideState[], side: SideState, p: PlayerState, d: Dart): void {
  if (!CRICKET_FIELDS.includes(d.field)) return;
  const current = side.marks[d.field] ?? 0;
  const used = Math.min(d.multiplier, MARKS_TO_CLOSE - current);
  const extra = d.multiplier - used;
  side.marks[d.field] = current + used;
  const opponentOpen = sides.some((o) => o !== side && !isClosed(o, d.field));
  if (extra > 0 && opponentOpen) {
    const points = extra * d.field;
    side.score += points;
    p.pointsScored += points;
  }
}

function hasWon(sides: SideState[], side: SideState): boolean {
  return (
    CRICKET_FIELDS.every((f) => isClosed(side, f)) &&
    sides.every((o) => o === side || side.score >= o.score)
  );
}

export const cricketMode: GameMode = {
  computeState(config: GameConfig, darts: Dart[]): GameState {
    const players = config.playerIds.map((id) => newPlayerState(id));
    const sides = newSides(config);
    const cursor = new TurnCursor(config.playerIds);
    let winnerId: string | null = null;

    for (const d of darts) {
      if (winnerId) break;
      cursor.expect(d);
      const p = players[cursor.index];
      const side = sides.find((s) => s.sideId === sideOf(config, d.playerId))!;
      if (cursor.isFirstDart) p.turnsPlayed++;
      cursor.add(d);
      applyDart(sides, side, p, d);
      if (hasWon(sides, side)) {
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
      bust: false,
    };
  },
};
