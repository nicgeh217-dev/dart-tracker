// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameConfig } from '../../src/game/types';
import { STORAGE_KEY } from '../../src/store/storage';
import {
  addPlayer,
  closeGame,
  finishGame,
  getData,
  getGameState,
  initStore,
  removePlayer,
  renamePlayer,
  resetStoreForTests,
  startGame,
  subscribe,
  throwDart,
  undoDart,
} from '../../src/store/store';

function twoPlayers() {
  const a = addPlayer('Anna');
  const b = addPlayer('Ben');
  if (!a.ok || !b.ok) throw new Error('Spieler konnten nicht angelegt werden');
  return [a.value, b.value] as const;
}

function x01Config(ids: string[]): GameConfig {
  return { mode: 'x01', playerIds: ids, x01: { start: 301, doubleOut: false } };
}

/** Anna gewinnt: 180, Ben 3× Miss, dann T20, T20, 1 → genau 301. */
function playToWin() {
  for (let i = 0; i < 3; i++) throwDart(20, 3);
  for (let i = 0; i < 3; i++) throwDart(0, 1);
  throwDart(20, 3);
  throwDart(20, 3);
  throwDart(1, 1);
}

beforeEach(() => {
  localStorage.clear();
  resetStoreForTests();
  initStore();
});

describe('Spieler', () => {
  it('lehnt leere und doppelte Namen ab', () => {
    expect(addPlayer('   ')).toEqual({ ok: false, error: 'Gib einen Namen ein.' });
    expect(addPlayer('Mia').ok).toBe(true);
    expect(addPlayer('mia')).toEqual({ ok: false, error: 'Diesen Namen gibt es schon.' });
    expect(getData().players).toHaveLength(1);
  });

  it('trimmt Namen', () => {
    const r = addPlayer('  Mia  ');
    expect(r.ok && r.value.name).toBe('Mia');
  });

  it('benennt um und lehnt Dubletten ab', () => {
    const [a] = twoPlayers();
    expect(renamePlayer(a.id, 'Ben')).toEqual({ ok: false, error: 'Diesen Namen gibt es schon.' });
    const r = renamePlayer(a.id, 'Anni');
    expect(r.ok && r.value.name).toBe('Anni');
    expect(renamePlayer(a.id, 'Anna').ok).toBe(true);
  });

  it('removePlayer lehnt Spieler im laufenden Spiel ab', () => {
    const [a, b] = twoPlayers();
    startGame(x01Config([a.id, b.id]));
    expect(removePlayer(a.id)).toEqual({ ok: false, error: 'Dieser Spieler spielt gerade mit.' });
    expect(getData().players).toHaveLength(2);
  });

  it('gelöschter Spieler bleibt im Verlauf mit Namen', () => {
    const [a, b] = twoPlayers();
    startGame({ mode: 'free', playerIds: [a.id, b.id] });
    throwDart(20, 1);
    finishGame(a.id);
    closeGame();
    expect(removePlayer(a.id).ok).toBe(true);
    expect(getData().players.map((p) => p.name)).toEqual(['Ben']);
    expect(getData().history[0].playerNames[a.id]).toBe('Anna');
  });
});

describe('Spiel', () => {
  it('startGame verlangt 2 bis 8 Spieler', () => {
    const [a] = twoPlayers();
    expect(() => startGame(x01Config([a.id]))).toThrow();
    const ids = [a.id];
    for (let i = 0; i < 8; i++) {
      const p = addPlayer(`P${i}`);
      if (p.ok) ids.push(p.value.id);
    }
    expect(() => startGame(x01Config(ids))).toThrow();
    expect(startGame(x01Config(ids.slice(0, 8))).config.playerIds).toHaveLength(8);
  });

  it('throwDart ignoriert ungültige Darts und Darts nach dem Gewinn', () => {
    const [a, b] = twoPlayers();
    startGame(x01Config([a.id, b.id]));
    throwDart(25, 3);
    expect(getData().activeGame!.darts).toHaveLength(0);
    playToWin();
    const state = getGameState()!;
    expect(state.winnerId).toBe(a.id);
    expect(getData().activeGame!.winnerId).toBe(a.id);
    expect(getData().activeGame!.finishedAt).not.toBeNull();
    const count = getData().activeGame!.darts.length;
    throwDart(20, 1);
    expect(getData().activeGame!.darts).toHaveLength(count);
  });

  it('undoDart öffnet ein gewonnenes Spiel wieder', () => {
    const [a, b] = twoPlayers();
    startGame(x01Config([a.id, b.id]));
    playToWin();
    undoDart();
    const game = getData().activeGame!;
    expect(game.finishedAt).toBeNull();
    expect(game.winnerId).toBeNull();
    expect(getGameState()!.currentPlayerId).toBe(a.id);
  });

  it('undoDart über eine Rundengrenze gibt den Zug zurück', () => {
    const [a, b] = twoPlayers();
    startGame(x01Config([a.id, b.id]));
    throwDart(1, 1);
    throwDart(1, 1);
    throwDart(1, 1);
    expect(getGameState()!.currentPlayerId).toBe(b.id);
    undoDart();
    const s = getGameState()!;
    expect(s.currentPlayerId).toBe(a.id);
    expect(s.turnDarts).toHaveLength(2);
  });

  it('closeGame verschiebt das beendete Spiel in den Verlauf', () => {
    const [a, b] = twoPlayers();
    startGame(x01Config([a.id, b.id]));
    playToWin();
    closeGame();
    expect(getData().activeGame).toBeNull();
    expect(getData().history).toHaveLength(1);
    expect(getData().history[0].winnerId).toBe(a.id);
  });

  it('closeGame lässt ein laufendes Spiel unberührt', () => {
    const [a, b] = twoPlayers();
    startGame(x01Config([a.id, b.id]));
    closeGame();
    expect(getData().activeGame).not.toBeNull();
    expect(getData().history).toHaveLength(0);
  });
});

describe('Persistenz und Benachrichtigung', () => {
  it('Neuladen stellt das laufende Spiel wieder her', () => {
    const [a, b] = twoPlayers();
    startGame(x01Config([a.id, b.id]));
    throwDart(20, 3);
    throwDart(5, 1);
    resetStoreForTests();
    initStore();
    expect(getData().activeGame!.darts).toHaveLength(2);
    expect(getGameState()!.players[0].score).toBe(301 - 65);
  });

  it('initStore meldet die Warnung bei kaputtem Speicher', () => {
    localStorage.setItem(STORAGE_KEY, '{kaputt');
    resetStoreForTests();
    expect(initStore().warning).toContain('Gespeicherte Daten');
    expect(getData().players).toEqual([]);
  });

  it('benachrichtigt Abonnenten bei Änderungen bis zum Abmelden', () => {
    const fn = vi.fn();
    const off = subscribe(fn);
    addPlayer('Mia');
    expect(fn).toHaveBeenCalledTimes(1);
    off();
    addPlayer('Tom');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
