import { describe, expect, it } from 'vitest';
import { cricketMode } from '../../src/game/cricket';
import { freeMode } from '../../src/game/free';
import { playerProgress } from '../../src/game/progress';
import type { GameConfig } from '../../src/game/types';
import { x01Mode } from '../../src/game/x01';
import { dart } from '../helpers';

const x01: GameConfig = { mode: 'x01', playerIds: ['a', 'b'], x01: { start: 301, doubleOut: false } };
const cricket: GameConfig = { mode: 'cricket', playerIds: ['a', 'b'] };
const free: GameConfig = { mode: 'free', playerIds: ['a', 'b'] };

describe('playerProgress', () => {
  it('X01: Anteil der bereits abgespielten Punkte', () => {
    expect(playerProgress(x01, x01Mode.computeState(x01, []), 'a')).toBe(0);
    const s = x01Mode.computeState(x01, [dart('a', 20, 3), dart('a', 20, 3)]);
    expect(playerProgress(x01, s, 'a')).toBeCloseTo(120 / 301, 5);
  });

  it('X01: nach einem Bust zählt der Rundenanfang', () => {
    const cfg: GameConfig = { mode: 'x01', playerIds: ['a', 'b'], x01: { start: 301, doubleOut: true } };
    const s = x01Mode.computeState(cfg, [dart('a', 20, 3), dart('a', 20, 3), dart('a', 20, 3), dart('b', 0), dart('b', 0), dart('b', 0), dart('a', 20, 3), dart('a', 20, 3)]);
    expect(playerProgress(cfg, s, 'a')).toBeCloseTo(180 / 301, 5);
  });

  it('X01: gewonnen ergibt 1', () => {
    const cfg: GameConfig = { mode: 'x01', playerIds: ['a', 'b'], x01: { start: 301, doubleOut: false } };
    const darts = [
      dart('a', 20, 3), dart('a', 20, 3), dart('a', 20, 3),
      dart('b', 0), dart('b', 0), dart('b', 0),
      dart('a', 20, 3), dart('a', 20, 3), dart('a', 1),
    ];
    expect(playerProgress(cfg, x01Mode.computeState(cfg, darts), 'a')).toBe(1);
  });

  it('Cricket: geschlossene Marks von 21', () => {
    const s = cricketMode.computeState(cricket, [dart('a', 20, 3), dart('a', 19, 2)]);
    expect(playerProgress(cricket, s, 'a')).toBeCloseTo(5 / 21, 5);
  });

  it('Frei: Darts der laufenden Runde von drei', () => {
    expect(playerProgress(free, freeMode.computeState(free, []), 'a')).toBe(0);
    const s = freeMode.computeState(free, [dart('a', 5), dart('a', 5)]);
    expect(playerProgress(free, s, 'a')).toBeCloseTo(2 / 3, 5);
  });

  it('Frei: ein anderer Spieler als der aktuelle hat 0', () => {
    const s = freeMode.computeState(free, [dart('a', 5)]);
    expect(playerProgress(free, s, 'b')).toBe(0);
  });
});
