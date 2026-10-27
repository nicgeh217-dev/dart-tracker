// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import type { GameConfig } from '../../src/game/types';
import { STORAGE_KEY, emptyData, loadData } from '../../src/store/storage';
import {
  addPlayer,
  getData,
  getGameState,
  initStore,
  removePlayer,
  resetStoreForTests,
  startGame,
  throwDart,
  undoDart,
} from '../../src/store/store';

function four(): string[] {
  return ['Anna', 'Ben', 'Cleo', 'Dan'].map((n) => {
    const r = addPlayer(n);
    if (!r.ok) throw new Error('x');
    return r.value.id;
  });
}
function teamConfig([a, b, c, d]: string[], mode: GameConfig['mode'] = 'x01'): GameConfig {
  return {
    mode,
    playerIds: [a, c, b, d],
    teams: [[a, b], [c, d]],
    ...(mode === 'x01' ? { x01: { start: 301 as const, doubleOut: false } } : {}),
  };
}

beforeEach(() => {
  localStorage.clear();
  resetStoreForTests();
  initStore();
});

describe('Team-Spiele im Store', () => {
  it('startGame verlangt für Teams genau 4 Spieler in gültiger Reihenfolge', () => {
    const [a, b, c, d] = four();
    expect(() => startGame({ mode: 'free', playerIds: [a, c, b], teams: [[a, b], [c]] as unknown as [string[], string[]] })).toThrow();
    expect(() => startGame({ mode: 'free', playerIds: [a, b, c, d], teams: [[a, b], [c, d]] })).toThrow();
    expect(getData().activeGame).toBeNull();
  });

  it('randomStart tauscht die Teams per injiziertem random', () => {
    const ids = four();
    const game = startGame(teamConfig(ids), { randomStart: true, random: () => 0.9 });
    expect(game.config.teams).toEqual([[ids[2], ids[3]], [ids[0], ids[1]]]);
    expect(game.config.playerIds[0]).toBe(ids[2]);
  });

  it('Einzel mit randomStart rotiert die Reihenfolge', () => {
    const ids = four().slice(0, 3);
    const game = startGame({ mode: 'free', playerIds: ids }, { randomStart: true, random: () => 0.5 });
    expect(game.config.playerIds).toEqual([ids[1], ids[2], ids[0]]);
  });

  it('ohne randomStart bleibt die Reihenfolge', () => {
    const ids = four();
    const game = startGame(teamConfig(ids), { random: () => 0.9 });
    expect(game.config.teams![0]).toEqual([ids[0], ids[1]]);
  });

  it('Darts gehen reihum an a, c, b, d, Rückgängig über Wechsel hinweg', () => {
    const ids = four();
    startGame(teamConfig(ids, 'free'));
    for (let i = 0; i < 12; i++) throwDart(1, 1);
    const order = getData().activeGame!.darts.map((d) => d.playerId);
    const [a, b, c, d] = ids;
    expect(order.filter((_, i) => i % 3 === 0)).toEqual([a, c, b, d]);
    for (let i = 0; i < 4; i++) undoDart();
    expect(getGameState()!.currentPlayerId).toBe(b);
    expect(getGameState()!.turnDarts).toHaveLength(2);
    expect(getData().activeGame!.config.teams![0]).toEqual([a, b]);
  });

  it('Team-Sieg wird als Seiten-ID gespeichert', () => {
    const ids = four();
    startGame({ ...teamConfig(ids), x01: { start: 301, doubleOut: false } });
    for (let i = 0; i < 3; i++) throwDart(20, 3);
    for (let i = 0; i < 3; i++) throwDart(0, 1);
    throwDart(20, 3);
    throwDart(20, 3);
    throwDart(1, 1);
    expect(getData().activeGame!.winnerId).toBe('team:0');
  });

  it('Neuladen stellt Spiel und Reihenfolge wieder her', () => {
    const ids = four();
    startGame(teamConfig(ids, 'free'));
    for (let i = 0; i < 5; i++) throwDart(5, 1);
    const before = getGameState()!;
    resetStoreForTests();
    initStore();
    const after = getGameState()!;
    expect(after.currentPlayerId).toBe(before.currentPlayerId);
    expect(after.sides.map((s) => s.score)).toEqual(before.sides.map((s) => s.score));
  });

  it('Team-Spieler im laufenden Spiel lassen sich nicht löschen', () => {
    const ids = four();
    startGame(teamConfig(ids));
    expect(removePlayer(ids[3]).ok).toBe(false);
  });
});

describe('Team-Validierung im Speicher', () => {
  const store = (config: unknown, names: Record<string, string>) =>
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        players: [],
        history: [],
        activeGame: { id: 'g', config, playerNames: names, darts: [], startedAt: 0, finishedAt: null, winnerId: null },
      }),
    );
  const names = { a: 'A', b: 'B', c: 'C', d: 'D', e: 'E' };

  it('liest ein gültiges Team-Spiel', () => {
    store({ mode: 'free', playerIds: ['a', 'c', 'b', 'd'], teams: [['a', 'b'], ['c', 'd']] }, names);
    const r = loadData();
    expect(r.warning).toBeNull();
    expect(r.data.activeGame?.config.teams).toEqual([['a', 'b'], ['c', 'd']]);
  });
  it('liefert leere Daten bei falscher Team-Reihenfolge', () => {
    store({ mode: 'free', playerIds: ['a', 'b', 'c', 'd'], teams: [['a', 'b'], ['c', 'd']] }, names);
    expect(loadData().data).toEqual(emptyData());
    expect(loadData().warning).not.toBeNull();
  });
  it('… bei Team mit drei Spielern', () => {
    store({ mode: 'free', playerIds: ['a', 'c', 'b'], teams: [['a', 'b', 'e'], ['c']] }, names);
    expect(loadData().data).toEqual(emptyData());
  });
  it('… wenn teams Spieler enthält, die nicht in playerIds stehen', () => {
    store({ mode: 'free', playerIds: ['a', 'c', 'b', 'd'], teams: [['a', 'e'], ['c', 'd']] }, names);
    expect(loadData().data).toEqual(emptyData());
  });
});
