import type { Dart, Field, Multiplier } from '../src/game/types';

export function dart(playerId: string, field: Field, multiplier: Multiplier = 1): Dart {
  return { playerId, field, multiplier };
}
