import { getMode } from '../game/modes';
import { isValidDart } from '../game/types';
import type {
  AppData,
  Field,
  Game,
  GameConfig,
  GameState,
  Multiplier,
  Player,
} from '../game/types';
import { emptyData, loadData, saveData } from './storage';

export type { AppData, Game, Player } from '../game/types';

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;
const SAVE_WARNING = 'Änderungen konnten nicht gespeichert werden. Der Speicher ist voll oder gesperrt.';

let data: AppData = emptyData();
let saveWarning: string | null = null;
const listeners = new Set<() => void>();

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function commit(): void {
  saveWarning = saveData(data) ? null : SAVE_WARNING;
  listeners.forEach((fn) => fn());
}

export function initStore(): { warning: string | null } {
  const loaded = loadData();
  data = loaded.data;
  return { warning: loaded.warning };
}

export function resetStoreForTests(): void {
  data = emptyData();
  saveWarning = null;
  listeners.clear();
}

/** Hinweis, solange das letzte Speichern fehlgeschlagen ist. */
export function getSaveWarning(): string | null {
  return saveWarning;
}

export function getData(): AppData {
  return data;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getGameState(): GameState | null {
  const game = data.activeGame;
  return game ? getMode(game.config.mode).computeState(game.config, game.darts) : null;
}

function validateName(name: string, ignoreId?: string): Result<string> {
  const trimmed = name.trim();
  if (trimmed === '') return { ok: false, error: 'Gib einen Namen ein.' };
  const taken = data.players.some(
    (p) => p.id !== ignoreId && p.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (taken) return { ok: false, error: 'Diesen Namen gibt es schon.' };
  return { ok: true, value: trimmed };
}

export function addPlayer(name: string): Result<Player> {
  const valid = validateName(name);
  if (!valid.ok) return valid;
  const player: Player = { id: newId(), name: valid.value };
  data.players.push(player);
  commit();
  return { ok: true, value: player };
}

export function renamePlayer(id: string, name: string): Result<Player> {
  const player = data.players.find((p) => p.id === id);
  if (!player) return { ok: false, error: 'Spieler nicht gefunden.' };
  const valid = validateName(name, id);
  if (!valid.ok) return valid;
  player.name = valid.value;
  commit();
  return { ok: true, value: player };
}

export function removePlayer(id: string): Result<null> {
  if (data.activeGame?.config.playerIds.includes(id)) {
    return { ok: false, error: 'Dieser Spieler spielt gerade mit.' };
  }
  data.players = data.players.filter((p) => p.id !== id);
  commit();
  return { ok: true, value: null };
}

export function startGame(config: GameConfig): Game {
  const ids = config.playerIds;
  if (ids.length < MIN_PLAYERS || ids.length > MAX_PLAYERS || new Set(ids).size !== ids.length) {
    throw new Error(`Ein Spiel braucht ${MIN_PLAYERS} bis ${MAX_PLAYERS} verschiedene Spieler.`);
  }
  if (data.activeGame) throw new Error('Es läuft bereits ein Spiel.');
  const playerNames: Record<string, string> = {};
  for (const id of ids) {
    const player = data.players.find((p) => p.id === id);
    if (!player) throw new Error(`Unbekannter Spieler ${id}`);
    playerNames[id] = player.name;
  }
  const game: Game = {
    id: newId(),
    config,
    playerNames,
    darts: [],
    startedAt: Date.now(),
    finishedAt: null,
    winnerId: null,
  };
  data.activeGame = game;
  commit();
  return game;
}

export function throwDart(field: Field, multiplier: Multiplier): void {
  const game = data.activeGame;
  if (!game || game.finishedAt !== null || !isValidDart(field, multiplier)) return;
  const state = getGameState();
  if (!state) return;
  game.darts.push({ playerId: state.currentPlayerId, field, multiplier });
  const after = getGameState();
  if (after?.winnerId) {
    game.finishedAt = Date.now();
    game.winnerId = after.winnerId;
  }
  commit();
}

export function undoDart(): void {
  const game = data.activeGame;
  if (!game || game.darts.length === 0) return;
  game.darts.pop();
  game.finishedAt = null;
  game.winnerId = null;
  commit();
}

export function finishGame(winnerId: string | null): void {
  const game = data.activeGame;
  if (!game || game.finishedAt !== null) return;
  game.finishedAt = Date.now();
  game.winnerId = winnerId;
  commit();
}

export function closeGame(): void {
  const game = data.activeGame;
  if (!game || game.finishedAt === null) return;
  data.history.unshift(game);
  data.activeGame = null;
  commit();
}

export function abortGame(): void {
  if (!data.activeGame) return;
  data.activeGame = null;
  commit();
}
