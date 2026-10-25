import { describe, expect, it } from 'vitest';
import { cricketMode } from '../../src/game/cricket';
import type { Field, GameConfig, GameState, Multiplier } from '../../src/game/types';
import { dart } from '../helpers';

const cfg: GameConfig = { mode: 'cricket', playerIds: ['a', 'b'] };
const t = (id: string, ...ds: [Field, Multiplier?][]) => ds.map(([f, m]) => dart(id, f, m ?? 1));
const missTurn = (id: string) => t(id, [0], [0], [0]);
const player = (s: GameState, id: string) => s.players.find((p) => p.playerId === id)!;

describe('Cricket', () => {
  it('Triple schließt ein Feld in einem Dart', () => {
    const s = cricketMode.computeState(cfg, t('a', [20, 3]));
    expect(player(s, 'a').marks[20]).toBe(3);
  });

  it('Marks über drei punkten, solange ein Gegner offen ist', () => {
    const s = cricketMode.computeState(cfg, t('a', [20, 3], [20]));
    expect(player(s, 'a').score).toBe(20);
    expect(player(s, 'a').marks[20]).toBe(3);
  });

  it('keine Punkte, wenn alle Gegner das Feld geschlossen haben', () => {
    const darts = [...missTurn('a'), ...t('b', [20, 3], [0], [0]), ...t('a', [20, 3], [20])];
    const s = cricketMode.computeState(cfg, darts);
    expect(player(s, 'a').score).toBe(0);
  });

  it('Felder unter 15 und Miss tun nichts', () => {
    const s = cricketMode.computeState(cfg, t('a', [14, 3], [0]));
    expect(player(s, 'a').marks).toEqual({});
    expect(player(s, 'a').score).toBe(0);
  });

  it('Double-Bull zählt zwei Marks, jede Mark über drei bringt 25 Punkte', () => {
    const s1 = cricketMode.computeState(cfg, t('a', [25, 2]));
    expect(player(s1, 'a').marks[25]).toBe(2);
    const s2 = cricketMode.computeState(cfg, t('a', [25, 2], [25, 2]));
    expect(player(s2, 'a').marks[25]).toBe(3);
    expect(player(s2, 'a').score).toBe(25);
  });

  const closeAll = (id: string, other: string): ReturnType<typeof t> => [
    ...t(id, [20, 3], [19, 3], [18, 3]),
    ...missTurn(other),
    ...t(id, [17, 3], [16, 3], [15, 3]),
    ...missTurn(other),
  ];

  it('Sieger braucht alle Felder geschlossen und mindestens gleich viele Punkte', () => {
    const behind = [
      ...missTurn('a'),
      ...t('b', [20, 3], [20], [0]),
      ...t('a', [20, 3], [19, 3], [18, 3]),
      ...missTurn('b'),
      ...t('a', [17, 3], [16, 3], [15, 3]),
      ...missTurn('b'),
      ...t('a', [25, 2], [25]),
    ];
    const s = cricketMode.computeState(cfg, behind);
    expect(player(s, 'b').score).toBe(20);
    expect(player(s, 'a').marks[25]).toBe(3);
    expect(s.winnerId).toBeNull();
  });

  it('bei Punktegleichstand gewinnt der Spieler, der alles geschlossen hat', () => {
    const s = cricketMode.computeState(cfg, [...closeAll('a', 'b'), ...t('a', [25, 2], [25])]);
    expect(s.winnerId).toBe('a');
  });

  it('Rückgängig nach dem Gewinn-Dart stellt winnerId null wieder her', () => {
    const darts = [...closeAll('a', 'b'), ...t('a', [25, 2], [25])];
    expect(cricketMode.computeState(cfg, darts).winnerId).toBe('a');
    const undone = cricketMode.computeState(cfg, darts.slice(0, -1));
    expect(undone.winnerId).toBeNull();
    expect(undone.currentPlayerId).toBe('a');
  });

  it('wechselt nach drei Darts den Spieler', () => {
    const s = cricketMode.computeState(cfg, missTurn('a'));
    expect(s.currentPlayerId).toBe('b');
    expect(s.bust).toBe(false);
  });
});
