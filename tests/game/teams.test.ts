import { describe, expect, it } from 'vitest';
import { cricketMode } from '../../src/game/cricket';
import { freeMode } from '../../src/game/free';
import type { Dart, Field, GameConfig, Multiplier } from '../../src/game/types';
import { x01Mode } from '../../src/game/x01';
import { dart } from '../helpers';

type D = [Field, Multiplier?];
/** Eine Aufnahme, mit Miss auf drei Darts aufgefüllt */
const turn = (id: string, ...ds: D[]): Dart[] => {
  const out = ds.map(([f, m]) => dart(id, f, m ?? 1));
  while (out.length < 3) out.push(dart(id, 0));
  return out;
};
const team = (mode: GameConfig['mode'], extra: Partial<GameConfig> = {}): GameConfig => ({
  mode,
  playerIds: ['a', 'c', 'b', 'd'],
  teams: [['a', 'b'], ['c', 'd']],
  ...extra,
});
const x01 = (start: 301 | 501, doubleOut: boolean) => team('x01', { x01: { start, doubleOut } });

describe('X01 im Team', () => {
  it('gemeinsamer Rest und Wurfreihenfolge', () => {
    const cfg = x01(301, false);
    let s = x01Mode.computeState(cfg, turn('a', [20, 3], [20, 3], [20, 3]));
    expect(s.sides[0].score).toBe(121);
    expect(s.currentPlayerId).toBe('c');
    expect(s.currentSideId).toBe('team:1');
    s = x01Mode.computeState(cfg, [...turn('a', [20, 3], [20, 3], [20, 3]), ...turn('c')]);
    expect(s.currentPlayerId).toBe('b');
    expect(s.currentSideId).toBe('team:0');
    s = x01Mode.computeState(cfg, [...turn('a', [20, 3], [20, 3], [20, 3]), ...turn('c'), dart('b', 20)]);
    expect(s.sides[0].score).toBe(101);
  });

  it('Runde zählt nach allen vier Aufnahmen', () => {
    const s = x01Mode.computeState(x01(301, false), [...turn('a'), ...turn('c'), ...turn('b'), ...turn('d')]);
    expect(s.round).toBe(2);
    expect(s.currentPlayerId).toBe('a');
  });

  it('Bust setzt auf den Aufnahmeanfang des Werfers zurück', () => {
    const s = x01Mode.computeState(team('x01', { x01: { start: 40 as 301, doubleOut: true } }), [
      ...turn('a', [10, 2]),
      ...turn('c'),
      dart('b', 20, 3),
    ]);
    expect(s.sides[0].score).toBe(20);
    expect(s.bust).toBe(true);
    expect(s.currentPlayerId).toBe('d');
  });

  it('Sieg meldet die Seite', () => {
    const cfg = team('x01', { x01: { start: 40 as 301, doubleOut: true } });
    const s = x01Mode.computeState(cfg, [dart('a', 20, 2)]);
    expect(s.winnerId).toBe('team:0');
    expect(s.sides[0].score).toBe(0);
  });

  it('Statistik pro Spieler, Stand gespiegelt', () => {
    const s = x01Mode.computeState(x01(301, false), [...turn('a', [20, 3]), ...turn('c'), dart('b', 0)]);
    expect(s.players.find((p) => p.playerId === 'a')!.pointsScored).toBe(60);
    expect(s.players.find((p) => p.playerId === 'b')!.pointsScored).toBe(0);
    expect(s.players.find((p) => p.playerId === 'b')!.score).toBe(s.sides[0].score);
  });

  it('Einzelspiel: Seiten entsprechen Spielern', () => {
    const s = x01Mode.computeState({ mode: 'x01', playerIds: ['a', 'b'], x01: { start: 301, doubleOut: false } }, []);
    expect(s.sides.map((x) => x.sideId)).toEqual(['a', 'b']);
    expect(s.currentSideId).toBe(s.currentPlayerId);
  });
});

describe('Cricket im Team', () => {
  const cfg = team('cricket');
  it('Marks gehören dem Team', () => {
    const s = cricketMode.computeState(cfg, [...turn('a', [20, 3]), ...turn('c'), dart('b', 20)]);
    expect(s.sides[0].marks[20]).toBe(3);
    expect(s.sides[0].score).toBe(20);
  });

  it('keine Punkte, wenn die Gegner-Seite geschlossen hat', () => {
    const s = cricketMode.computeState(cfg, [
      ...turn('a'),
      ...turn('c', [20, 3]),
      ...turn('b'),
      ...turn('d'),
      dart('a', 20, 3),
      dart('a', 20),
    ]);
    expect(s.sides[0].score).toBe(0);
  });

  it('Sieg mit allen Feldern', () => {
    const s = cricketMode.computeState(cfg, [
      ...turn('a', [20, 3], [19, 3], [18, 3]),
      ...turn('c'),
      ...turn('b', [17, 3], [16, 3], [15, 3]),
      ...turn('d'),
      dart('a', 25, 2),
      dart('a', 25),
    ]);
    expect(s.winnerId).toBe('team:0');
  });

  it('Rückgängig nach dem Gewinn-Dart', () => {
    const darts = [
      ...turn('a', [20, 3], [19, 3], [18, 3]),
      ...turn('c'),
      ...turn('b', [17, 3], [16, 3], [15, 3]),
      ...turn('d'),
      dart('a', 25, 2),
      dart('a', 25),
    ];
    const s = cricketMode.computeState(cfg, darts.slice(0, -1));
    expect(s.winnerId).toBeNull();
    expect(s.currentPlayerId).toBe('a');
  });
});

describe('Frei im Team', () => {
  const cfg = team('free');
  it('gemeinsame Summe', () => {
    const s = freeMode.computeState(cfg, [...turn('a', [20], [5], [1]), ...turn('c'), dart('b', 10)]);
    expect(s.sides[0].score).toBe(36);
    expect(s.players.find((p) => p.playerId === 'a')!.pointsScored).toBe(26);
    expect(s.players.find((p) => p.playerId === 'b')!.pointsScored).toBe(10);
  });

  it('Rückgängig über den Teamwechsel', () => {
    const three = turn('a', [20], [5], [1]);
    expect(freeMode.computeState(cfg, three).currentPlayerId).toBe('c');
    const s = freeMode.computeState(cfg, three.slice(0, 2));
    expect(s.currentPlayerId).toBe('a');
    expect(s.turnDarts).toHaveLength(2);
  });
});
