import { CRICKET_FIELDS } from './cricket';
import { DARTS_PER_TURN } from './turns';
import type { GameConfig, GameState } from './types';

const MARKS_TO_CLOSE = 3;

/** Fortschritt eines Spielers von 0 bis 1, z. B. für den Ring um den Punktestand. */
export function playerProgress(config: GameConfig, state: GameState, playerId: string): number {
  const player = state.players.find((p) => p.playerId === playerId);
  if (!player) return 0;

  if (config.mode === 'x01') {
    const start = config.x01?.start ?? 501;
    return Math.min(1, Math.max(0, (start - player.score) / start));
  }
  if (config.mode === 'cricket') {
    const marks = CRICKET_FIELDS.reduce((sum, f) => sum + Math.min(player.marks[f] ?? 0, MARKS_TO_CLOSE), 0);
    return marks / (CRICKET_FIELDS.length * MARKS_TO_CLOSE);
  }
  return state.currentPlayerId === playerId ? state.turnDarts.length / DARTS_PER_TURN : 0;
}
