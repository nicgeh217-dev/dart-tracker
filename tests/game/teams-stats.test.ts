import { describe, expect, it } from 'vitest';
import { cricketMode } from '../../src/game/cricket';
import { freeLeader, freeMode } from '../../src/game/free';
import { playerProgress } from '../../src/game/progress';
import { playerStats } from '../../src/game/stats';
import type { Dart, Game, GameConfig } from '../../src/game/types';
import { x01Mode } from '../../src/game/x01';
import { dart } from '../helpers';

const base = { playerIds: ['a', 'c', 'b', 'd'], teams: [['a', 'b'], ['c', 'd']] } as const;
const teams = (mode: GameConfig['mode'], extra: Partial<GameConfig> = {}): GameConfig => ({
  mode,
  playerIds: [...base.playerIds],
  teams: [[...base.teams[0]], [...base.teams[1]]],
  ...extra,
});
const x01 = teams('x01', { x01: { start: 301, doubleOut: false } });
const miss = (id: string): Dart[] => [dart(id, 0), dart(id, 0), dart(id, 0)];

function game(config: GameConfig, darts: Dart[], winnerId: string | null): Game {
  return { id: 'g', config, playerNames: {}, darts, startedAt: 0, finishedAt: 1, winnerId };
}

describe('Fortschritt im Team', () => {
  it('X01 nutzt den Seitenstand', () => {
    const s = x01Mode.computeState(x01, [dart('a', 20, 3), dart('a', 20, 3), dart('a', 20, 3)]);
    expect(playerProgress(x01, s, 'team:0')).toBeCloseTo(180 / 301, 5);
    expect(playerProgress(x01, s, 'team:1')).toBe(0);
  });
  it('Cricket je Seite', () => {
    const cfg = teams('cricket');
    const s = cricketMode.computeState(cfg, [dart('a', 20, 3), dart('a', 0), dart('a', 0)]);
    expect(playerProgress(cfg, s, 'team:0')).toBeCloseTo(3 / 21, 5);
    expect(playerProgress(cfg, s, 'team:1')).toBe(0);
  });
  it('Frei: nur die aktuelle Seite zeigt die Aufnahme', () => {
    const cfg = teams('free');
    const s = freeMode.computeState(cfg, [dart('a', 1)]);
    expect(playerProgress(cfg, s, 'team:0')).toBeCloseTo(1 / 3, 5);
    expect(playerProgress(cfg, s, 'team:1')).toBe(0);
  });
});

describe('Frei-Führender im Team', () => {
  it('liefert die Seiten-ID', () => {
    const s = freeMode.computeState(teams('free'), [dart('a', 20), dart('a', 0), dart('a', 0)]);
    expect(freeLeader(s)).toBe('team:0');
  });
});

describe('Statistik im Team', () => {
  it('Team-Sieg zählt für beide Teammitglieder', () => {
    const g = game(x01, [], 'team:0');
    expect(playerStats('a', [g])).toMatchObject({ games: 1, wins: 1 });
    expect(playerStats('b', [g])).toMatchObject({ games: 1, wins: 1 });
    expect(playerStats('c', [g])).toMatchObject({ games: 1, wins: 0 });
    expect(playerStats('d', [g])).toMatchObject({ games: 1, wins: 0 });
  });
  it('Schnitt pro Spieler', () => {
    const darts = [
      dart('a', 20, 3), dart('a', 0), dart('a', 0), ...miss('c'),
      dart('b', 20), dart('b', 0), dart('b', 0),
    ];
    const g = game(x01, darts, null);
    expect(playerStats('a', [g]).avgPerRound).toBe(60);
    expect(playerStats('b', [g]).avgPerRound).toBe(20);
  });
});
