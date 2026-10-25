import { TurnCursor, newPlayerState } from './turns';
import type { Dart, GameConfig, GameMode, GameState, PlayerState } from './types';

export const CRICKET_FIELDS: readonly number[] = [20, 19, 18, 17, 16, 15, 25];
const MARKS_TO_CLOSE = 3;

const isClosed = (p: PlayerState, field: number) => (p.marks[field] ?? 0) >= MARKS_TO_CLOSE;

function applyDart(players: PlayerState[], p: PlayerState, d: Dart): void {
  if (!CRICKET_FIELDS.includes(d.field)) return;
  const current = p.marks[d.field] ?? 0;
  const used = Math.min(d.multiplier, MARKS_TO_CLOSE - current);
  const extra = d.multiplier - used;
  p.marks[d.field] = current + used;
  const opponentOpen = players.some((o) => o !== p && !isClosed(o, d.field));
  if (extra > 0 && opponentOpen) {
    const points = extra * d.field;
    p.score += points;
    p.pointsScored += points;
  }
}

function hasWon(players: PlayerState[], p: PlayerState): boolean {
  return (
    CRICKET_FIELDS.every((f) => isClosed(p, f)) &&
    players.every((o) => o === p || p.score >= o.score)
  );
}

export const cricketMode: GameMode = {
  computeState(config: GameConfig, darts: Dart[]): GameState {
    const players = config.playerIds.map((id) => newPlayerState(id));
    const cursor = new TurnCursor(config.playerIds);
    let winnerId: string | null = null;

    for (const d of darts) {
      if (winnerId) break;
      cursor.expect(d);
      const p = players[cursor.index];
      if (cursor.isFirstDart) p.turnsPlayed++;
      cursor.add(d);
      applyDart(players, p, d);
      if (hasWon(players, p)) {
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
      bust: false,
    };
  },
};
