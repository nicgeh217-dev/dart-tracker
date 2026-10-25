import { getMode } from '../game/modes';
import { isValidDart } from '../game/types';
import type { AppData, Dart, Field, Game, GameConfig, ModeId, Multiplier, Player } from '../game/types';

export const STORAGE_KEY = 'dart-tracker-v1';
const READ_WARNING = 'Gespeicherte Daten konnten nicht gelesen werden. Die App startet leer.';
const MODES: readonly string[] = ['x01', 'cricket', 'free'];

export function emptyData(): AppData {
  return { players: [], activeGame: null, history: [] };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isString = (v: unknown): v is string => typeof v === 'string';

function isPlayer(v: unknown): v is Player {
  return isRecord(v) && isString(v.id) && isString(v.name);
}

function isConfig(c: unknown): c is GameConfig {
  if (!isRecord(c) || !isString(c.mode) || !MODES.includes(c.mode)) return false;
  if (!Array.isArray(c.playerIds) || c.playerIds.length < 2 || !c.playerIds.every(isString)) return false;
  if (c.mode !== 'x01') return true;
  const x = c.x01;
  return isRecord(x) && (x.start === 301 || x.start === 501) && typeof x.doubleOut === 'boolean';
}

function isDart(d: unknown): d is Dart {
  return (
    isRecord(d) && isString(d.playerId) && isValidDart(d.field as Field, d.multiplier as Multiplier)
  );
}

/** Prüft Struktur und spielt das Dart-Log einmal ab, damit kein unspielbares Spiel in die App kommt. */
function isGame(v: unknown): v is Game {
  if (!isRecord(v) || !isString(v.id) || !isConfig(v.config) || !isRecord(v.playerNames)) return false;
  if (!Array.isArray(v.darts) || !v.darts.every(isDart)) return false;
  if (typeof v.startedAt !== 'number') return false;
  if (v.finishedAt !== null && typeof v.finishedAt !== 'number') return false;
  if (v.winnerId !== null && !isString(v.winnerId)) return false;
  const names = v.playerNames;
  if (!v.config.playerIds.every((id) => isString(names[id]))) return false;
  try {
    getMode(v.config.mode as ModeId).computeState(v.config, v.darts);
  } catch {
    return false;
  }
  return true;
}

function isAppData(v: unknown): v is AppData {
  return (
    isRecord(v) &&
    Array.isArray(v.players) &&
    v.players.every(isPlayer) &&
    Array.isArray(v.history) &&
    v.history.every(isGame) &&
    (v.activeGame === null || isGame(v.activeGame))
  );
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
