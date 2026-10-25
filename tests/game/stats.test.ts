import { describe, expect, it } from 'vitest';
import { playerStats } from '../../src/game/stats';
import type { Dart, Game, GameConfig } from '../../src/game/types';
import { dart } from '../helpers';

let counter = 0;
function game(config: GameConfig, darts: Dart[], finished = true, winnerId: string | null = null): Game {
  return {
    id: `g${counter++}`,
    config,
    playerNames: { a: 'A', b: 'B' },
    darts,
    startedAt: 0,
    finishedAt: finished ? 1 : null,
    winnerId,
  };
}
const x01: GameConfig = { mode: 'x01', playerIds: ['a', 'b'], x01: { start: 301, doubleOut: false } };
const free: GameConfig = { mode: 'free', playerIds: ['a', 'b'] };
const cricket: GameConfig = { mode: 'cricket', playerIds: ['a', 'b'] };

describe('playerStats', () => {
  it('zählt Spiele und Siege nur für beendete Spiele', () => {
    const games = [
      game(x01, [], true, 'a'),
      game(x01, [], true, 'b'),
      game(x01, [], false, null),
    ];
    expect(playerStats('a', games)).toMatchObject({ games: 2, wins: 1 });
    expect(playerStats('b', games)).toMatchObject({ games: 2, wins: 1 });
  });

  it('ignoriert Spiele, in denen der Spieler nicht mitspielte', () => {
    expect(playerStats('zz', [game(x01, [], true, 'a')])).toEqual({ games: 0, wins: 0, avgPerRound: 0 });
  });

  it('Schnitt pro Runde über X01 und Frei, Cricket ausgenommen', () => {
    const games = [
      game(free, [dart('a', 20, 3), dart('a', 0), dart('a', 0)]),
      game(x01, [dart('a', 10, 3), dart('a', 0), dart('a', 0)]),
      game(cricket, [dart('a', 20, 3), dart('a', 20, 3), dart('a', 20, 3)]),
    ];
    expect(playerStats('a', games).avgPerRound).toBe(45);
  });

  it('Bust-Runden zählen mit 0', () => {
    const bustCfg: GameConfig = { mode: 'x01', playerIds: ['a', 'b'], x01: { start: 301, doubleOut: true } };
    const darts = [
      dart('a', 20, 3), dart('a', 20, 3), dart('a', 20, 3),
      dart('b', 0), dart('b', 0), dart('b', 0),
      dart('a', 20, 3), dart('a', 20, 3),
    ];
    // Runde 2: erster Dart auf Rest 61, zweiter auf Rest 1 = Bust, die Runde zählt 0 → 180 Punkte in 2 Runden
    expect(playerStats('a', [game(bustCfg, darts)]).avgPerRound).toBe(90);
  });

  it('rundet auf eine Nachkommastelle', () => {
    const games = [game(free, [dart('a', 1), dart('a', 0), dart('a', 0)]), game(free, [dart('a', 2), dart('a', 0), dart('a', 0)]), game(free, [dart('a', 2), dart('a', 0), dart('a', 0)])];
    expect(playerStats('a', games).avgPerRound).toBe(1.7);
  });
});
