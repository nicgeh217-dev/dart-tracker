import { describe, expect, it } from 'vitest';
import { describeThrow } from '../../src/game/events';
import { getMode } from '../../src/game/modes';
import type { Dart, GameConfig } from '../../src/game/types';
import { dart } from '../helpers';

/** Ereignisse des letzten Darts im Log */
function last(config: GameConfig, darts: Dart[]) {
  const mode = getMode(config.mode);
  const before = mode.computeState(config, darts.slice(0, -1));
  const after = mode.computeState(config, darts);
  return describeThrow(config, before, darts[darts.length - 1], after);
}
const x01 = (start: 301 | 501 = 501, doubleOut = false): GameConfig => ({
  mode: 'x01',
  playerIds: ['a', 'b'],
  x01: { start, doubleOut },
});
const free: GameConfig = { mode: 'free', playerIds: ['a', 'b'] };
const cricket: GameConfig = { mode: 'cricket', playerIds: ['a', 'b'] };

describe('describeThrow', () => {
  it('Single 20 in X01 meldet nur Punkte', () => {
    expect(last(x01(), [dart('a', 20)])).toEqual([{ kind: 'points', value: 20 }]);
  });
  it('Triple 20 meldet Punkte und triple', () => {
    expect(last(x01(), [dart('a', 20, 3)])).toEqual([{ kind: 'points', value: 60 }, { kind: 'triple' }]);
  });
  it('Double 16 meldet Punkte und double', () => {
    expect(last(x01(), [dart('a', 16, 2)])).toEqual([{ kind: 'points', value: 32 }, { kind: 'double' }]);
  });
  it('Double-Bull meldet bull', () => {
    expect(last(x01(), [dart('a', 25, 2)])).toEqual([{ kind: 'points', value: 50 }, { kind: 'bull' }]);
  });
  it('Miss meldet nichts', () => {
    expect(last(x01(), [dart('a', 0)])).toEqual([]);
  });
  it('dritte Triple 20 meldet oneEighty (X01 und Frei)', () => {
    const t = [dart('a', 20, 3), dart('a', 20, 3), dart('a', 20, 3)];
    expect(last(x01(), t).map((e) => e.kind)).toEqual(['points', 'triple', 'oneEighty']);
    expect(last(free, t).map((e) => e.kind)).toEqual(['points', 'triple', 'oneEighty']);
  });
  it('zwei Triple 20 und ein Single meldet kein oneEighty', () => {
    const t = [dart('a', 20, 3), dart('a', 20, 3), dart('a', 20)];
    expect(last(x01(), t).map((e) => e.kind)).not.toContain('oneEighty');
  });
  it('Bust meldet bust und triple, keine Punkte', () => {
    expect(last({ ...x01(), x01: { start: 40 as 301, doubleOut: true } }, [dart('a', 20, 3)])).toEqual([
      { kind: 'triple' },
      { kind: 'bust' },
    ]);
  });
  it('Sieg meldet win', () => {
    const cfg: GameConfig = { ...x01(), x01: { start: 40 as 301, doubleOut: true } };
    expect(last(cfg, [dart('a', 20, 2)]).map((e) => e.kind)).toEqual(['points', 'double', 'win']);
  });
  it('Cricket: Schließen meldet closed', () => {
    expect(last(cricket, [dart('a', 20, 3)])).toEqual([{ kind: 'triple' }, { kind: 'closed', field: 20 }]);
  });
  it('Cricket: Punkte über Marks', () => {
    const t = [dart('a', 20, 3), dart('a', 20), dart('a', 0)];
    expect(last(cricket, t.slice(0, 2))).toEqual([{ kind: 'points', value: 20 }]);
  });
  it('Cricket: bereits geschlossenes Feld meldet kein closed', () => {
    const ev = last(cricket, [dart('a', 20, 3), dart('a', 20, 3)]);
    expect(ev.map((e) => e.kind)).not.toContain('closed');
  });
  it('Team: closed gehört der Seite des Partners', () => {
    const cfg: GameConfig = { mode: 'cricket', playerIds: ['a', 'c', 'b', 'd'], teams: [['a', 'b'], ['c', 'd']] };
    const darts = [
      dart('a', 20, 3), dart('a', 0), dart('a', 0),
      dart('c', 0), dart('c', 0), dart('c', 0),
      dart('b', 20),
    ];
    expect(last(cfg, darts).map((e) => e.kind)).toEqual(['points']);
  });
});
