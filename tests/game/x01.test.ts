import { describe, expect, it } from 'vitest';
import { isValidDart } from '../../src/game/types';
import type { Field, GameConfig, GameState } from '../../src/game/types';
import { x01Mode } from '../../src/game/x01';
import { dart } from '../helpers';

const cfg = (start: number, doubleOut = true): GameConfig => ({
  mode: 'x01',
  playerIds: ['a', 'b'],
  x01: { start: start as 301 | 501, doubleOut },
});
const scoreOf = (state: GameState, id: string) => state.players.find((p) => p.playerId === id)!;

describe('isValidDart', () => {
  it('lässt Triple-Bull nicht zu', () => {
    expect(isValidDart(25, 3)).toBe(false);
    expect(isValidDart(25, 2)).toBe(true);
    expect(isValidDart(25, 1)).toBe(true);
  });
  it('lässt Miss nur als Single zu', () => {
    expect(isValidDart(0, 1)).toBe(true);
    expect(isValidDart(0, 2)).toBe(false);
  });
  it('lässt 1–20 in allen Multiplikatoren zu und lehnt andere Felder ab', () => {
    expect(isValidDart(20, 3)).toBe(true);
    expect(isValidDart(21 as Field, 1)).toBe(false);
  });
});

describe('X01', () => {
  it('zieht Punkte ab und wechselt nach drei Darts', () => {
    const darts = [dart('a', 20, 3), dart('a', 20), dart('a', 1)];
    const s = x01Mode.computeState(cfg(301), darts);
    expect(scoreOf(s, 'a').score).toBe(220);
    expect(s.currentPlayerId).toBe('b');
    expect(s.round).toBe(1);
    const s2 = x01Mode.computeState(cfg(301), [...darts, dart('b', 1), dart('b', 1), dart('b', 1)]);
    expect(s2.currentPlayerId).toBe('a');
    expect(s2.round).toBe(2);
  });

  it('zeigt die Darts der laufenden Runde', () => {
    const s = x01Mode.computeState(cfg(301), [dart('a', 20, 3), dart('a', 5)]);
    expect(s.turnDarts).toHaveLength(2);
    expect(s.currentPlayerId).toBe('a');
  });

  it('Bust bei Überwerfen setzt auf Rundenanfang zurück und beendet die Runde', () => {
    const s = x01Mode.computeState(cfg(40), [dart('a', 20, 3)]);
    expect(scoreOf(s, 'a').score).toBe(40);
    expect(s.bust).toBe(true);
    expect(s.currentPlayerId).toBe('b');
    expect(scoreOf(s, 'a').pointsScored).toBe(0);
    expect(scoreOf(s, 'a').turnsPlayed).toBe(1);
  });

  it('Bust nimmt auch die Punkte früherer Darts der Runde zurück', () => {
    const s = x01Mode.computeState(cfg(60), [dart('a', 10), dart('a', 20, 3)]);
    expect(scoreOf(s, 'a').score).toBe(60);
    expect(scoreOf(s, 'a').pointsScored).toBe(0);
  });

  it('Rest 1 ist mit Double-Out Bust, ohne Double-Out nicht', () => {
    const withDouble = x01Mode.computeState(cfg(21, true), [dart('a', 20)]);
    expect(withDouble.bust).toBe(true);
    expect(scoreOf(withDouble, 'a').score).toBe(21);
    const without = x01Mode.computeState(cfg(21, false), [dart('a', 20)]);
    expect(without.bust).toBe(false);
    expect(scoreOf(without, 'a').score).toBe(1);
    expect(without.currentPlayerId).toBe('a');
  });

  it('Rest 0 ohne Double ist mit Double-Out Bust, mit Double gewonnen', () => {
    expect(x01Mode.computeState(cfg(20), [dart('a', 20)]).bust).toBe(true);
    const win = x01Mode.computeState(cfg(40), [dart('a', 20, 2)]);
    expect(win.winnerId).toBe('a');
    expect(scoreOf(win, 'a').score).toBe(0);
  });

  it('ohne Double-Out gewinnt auch ein Single auf genau 0', () => {
    expect(x01Mode.computeState(cfg(20, false), [dart('a', 20)]).winnerId).toBe('a');
  });

  it('Double-Bull beendet bei Rest 50, Single-Bull bei Rest 25 nicht', () => {
    expect(x01Mode.computeState(cfg(50), [dart('a', 25, 2)]).winnerId).toBe('a');
    const s = x01Mode.computeState(cfg(25), [dart('a', 25, 1)]);
    expect(s.winnerId).toBeNull();
    expect(s.bust).toBe(true);
  });

  it('ignoriert Darts nach dem Gewinn', () => {
    const s = x01Mode.computeState(cfg(40), [dart('a', 20, 2), dart('b', 20)]);
    expect(s.winnerId).toBe('a');
    expect(scoreOf(s, 'b').score).toBe(40);
  });

  it('wirft bei einem Dart des falschen Spielers', () => {
    expect(() => x01Mode.computeState(cfg(301), [dart('b', 20)])).toThrow();
  });

  it('Rückgängig: ohne den letzten Dart stimmen Stand und Spieler wieder', () => {
    const bustDarts = [dart('a', 20, 3)];
    const afterBust = x01Mode.computeState(cfg(40), bustDarts);
    const beforeBust = x01Mode.computeState(cfg(40), bustDarts.slice(0, -1));
    expect(afterBust.currentPlayerId).toBe('b');
    expect(beforeBust.currentPlayerId).toBe('a');
    expect(scoreOf(beforeBust, 'a').score).toBe(40);
    expect(beforeBust.bust).toBe(false);

    const turnDarts = [dart('a', 1), dart('a', 1), dart('a', 1)];
    expect(x01Mode.computeState(cfg(301), turnDarts).currentPlayerId).toBe('b');
    const backInTurn = x01Mode.computeState(cfg(301), turnDarts.slice(0, -1));
    expect(backInTurn.currentPlayerId).toBe('a');
    expect(backInTurn.turnDarts).toHaveLength(2);

    const winDarts = [dart('a', 20, 2)];
    expect(x01Mode.computeState(cfg(40), winDarts).winnerId).toBe('a');
    expect(x01Mode.computeState(cfg(40), winDarts.slice(0, -1)).winnerId).toBeNull();
  });
});
