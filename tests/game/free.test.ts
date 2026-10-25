import { describe, expect, it } from 'vitest';
import { freeLeader, freeMode } from '../../src/game/free';
import type { GameConfig } from '../../src/game/types';
import { dart } from '../helpers';

const cfg: GameConfig = { mode: 'free', playerIds: ['a', 'b'] };

describe('Frei', () => {
  it('addiert Punkte je Dart', () => {
    const s = freeMode.computeState(cfg, [dart('a', 20, 3), dart('a', 5), dart('a', 0)]);
    expect(s.players[0].score).toBe(65);
    expect(s.currentPlayerId).toBe('b');
  });

  it('hat nie einen Sieger', () => {
    const darts = [dart('a', 20, 3), dart('a', 20, 3), dart('a', 20, 3)];
    expect(freeMode.computeState(cfg, darts).winnerId).toBeNull();
  });

  it('freeLeader nimmt bei Gleichstand den ersten Spieler', () => {
    const tie = freeMode.computeState(cfg, []);
    expect(freeLeader(tie)).toBe('a');
    const bLeads = freeMode.computeState(cfg, [dart('a', 1), dart('a', 0), dart('a', 0), dart('b', 20)]);
    expect(freeLeader(bLeads)).toBe('b');
  });

  it('zählt Runden und Punkte für die Statistik', () => {
    const s = freeMode.computeState(cfg, [dart('a', 10), dart('a', 10)]);
    expect(s.players[0].turnsPlayed).toBe(1);
    expect(s.players[0].pointsScored).toBe(20);
  });
});
