import { cricketMode } from './cricket';
import { freeMode } from './free';
import type { GameMode, ModeId } from './types';
import { x01Mode } from './x01';

const modes: Record<ModeId, GameMode> = {
  x01: x01Mode,
  cricket: cricketMode,
  free: freeMode,
};

export function getMode(id: ModeId): GameMode {
  return modes[id];
}
