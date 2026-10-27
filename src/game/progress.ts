import { CRICKET_FIELDS } from './cricket';
import { DARTS_PER_TURN } from './turns';
import type { GameConfig, GameState } from './types';

const MARKS_TO_CLOSE = 3;

/** Fortschritt einer Seite von 0 bis 1, z. B. für den Ring um den Punktestand. Bei Einzelspielen ist die Seiten-ID die Spieler-ID. */
export function playerProgress(config: GameConfig, state: GameState, sideId: string): number {
  const side = state.sides.find((s) => s.sideId === sideId);
  if (!side) return 0;

  if (config.mode === 'x01') {
    const start = config.x01?.start ?? 501;
    return Math.min(1, Math.max(0, (start - side.score) / start));
  }
  if (config.mode === 'cricket') {
    const marks = CRICKET_FIELDS.reduce((sum, f) => sum + Math.min(side.marks[f] ?? 0, MARKS_TO_CLOSE), 0);
    return marks / (CRICKET_FIELDS.length * MARKS_TO_CLOSE);
  }
  return state.currentSideId === sideId ? state.turnDarts.length / DARTS_PER_TURN : 0;
}
