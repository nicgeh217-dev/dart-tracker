import type { Dart, ModeId } from '../game/types';

export const MODE_LABELS: Record<ModeId, string> = {
  x01: 'X01',
  cricket: 'Cricket',
  free: 'Frei',
};

export function formatDart(d: Dart): string {
  if (d.field === 0) return 'Miss';
  if (d.field === 25) return d.multiplier === 2 ? 'Double-Bull' : 'Bull';
  const prefix = d.multiplier === 3 ? 'T' : d.multiplier === 2 ? 'D' : '';
  return `${prefix}${d.field}`;
}
