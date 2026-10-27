import { CRICKET_FIELDS } from './cricket';
import { sideOf } from './sides';
import { dartPoints } from './types';
import type { Dart, GameConfig, GameState } from './types';

export type ThrowEvent =
  | { kind: 'points'; value: number }
  | { kind: 'triple' }
  | { kind: 'double' }
  | { kind: 'bull' }
  | { kind: 'oneEighty' }
  | { kind: 'bust' }
  | { kind: 'closed'; field: number }
  | { kind: 'win' };

const isTriple20 = (d: Dart) => d.field === 20 && d.multiplier === 3;

/** Leitet aus den Zuständen vor und nach einem Dart die Ereignisse für die Animationen ab. */
export function describeThrow(config: GameConfig, before: GameState, dart: Dart, after: GameState): ThrowEvent[] {
  const events: ThrowEvent[] = [];
  const sideId = sideOf(config, dart.playerId);
  const sideBefore = before.sides.find((s) => s.sideId === sideId);
  const sideAfter = after.sides.find((s) => s.sideId === sideId);

  let points = 0;
  if (config.mode === 'cricket') {
    if (sideBefore && sideAfter) points = sideAfter.score - sideBefore.score;
  } else if (!after.bust) {
    points = dartPoints(dart);
  }
  if (points > 0) events.push({ kind: 'points', value: points });

  if (dart.field === 25) events.push({ kind: 'bull' });
  else if (dart.multiplier === 3) events.push({ kind: 'triple' });
  else if (dart.multiplier === 2) events.push({ kind: 'double' });

  if (
    config.mode !== 'cricket' &&
    !after.bust &&
    before.turnDarts.length === 2 &&
    before.turnDarts.every(isTriple20) &&
    isTriple20(dart)
  ) {
    events.push({ kind: 'oneEighty' });
  }

  if (config.mode === 'cricket' && sideBefore && sideAfter) {
    for (const field of CRICKET_FIELDS) {
      if ((sideBefore.marks[field] ?? 0) < 3 && (sideAfter.marks[field] ?? 0) >= 3) {
        events.push({ kind: 'closed', field });
      }
    }
  }

  if (after.bust) events.push({ kind: 'bust' });
  if (before.winnerId === null && after.winnerId !== null) events.push({ kind: 'win' });
  return events;
}
