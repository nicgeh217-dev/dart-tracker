import type { AppData } from '../game/types';

export const STORAGE_KEY = 'dart-tracker-v1';
const READ_WARNING = 'Gespeicherte Daten konnten nicht gelesen werden. Die App startet leer.';

export function emptyData(): AppData {
  return { players: [], activeGame: null, history: [] };
}

function isAppData(value: unknown): value is AppData {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.players) && Array.isArray(v.history) && 'activeGame' in v;
}

export function loadData(): { data: AppData; warning: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return { data: emptyData(), warning: null };
    const parsed: unknown = JSON.parse(raw);
    if (isAppData(parsed)) return { data: parsed, warning: null };
  } catch {
    // fällt unten auf leere Daten mit Warnung zurück
  }
  return { data: emptyData(), warning: READ_WARNING };
}

export function saveData(data: AppData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
