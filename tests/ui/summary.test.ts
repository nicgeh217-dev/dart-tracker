// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { Dart, Game, GameConfig } from '../../src/game/types';
import { renderSummary } from '../../src/ui/components/summary';
import { dart } from '../helpers';

const names = { a: 'Anna', b: 'Ben', c: 'Cleo', d: 'Dan' };
const teams = { playerIds: ['a', 'c', 'b', 'd'], teams: [['a', 'b'], ['c', 'd']] } as Pick<GameConfig, 'playerIds' | 'teams'>;
const game = (config: GameConfig, darts: Dart[], winnerId: string | null): Game => ({
  id: 'g',
  config,
  playerNames: names,
  darts,
  startedAt: 0,
  finishedAt: 1,
  winnerId,
});

describe('renderSummary', () => {
  it('Team X01: Kopfzeile je Team und Spielerzeilen darunter', () => {
    const cfg: GameConfig = { mode: 'x01', ...teams, x01: { start: 301, doubleOut: false } };
    const table = renderSummary(game(cfg, [dart('a', 20, 3), dart('a', 0), dart('a', 0)], 'team:0'));
    const rows = table.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(6);
    expect(rows[0].textContent).toContain('Anna & Ben');
    expect(rows[0].textContent).toContain('Sieger');
    expect(rows[3].textContent).toContain('Cleo & Dan');
    expect(rows[3].textContent).not.toContain('Sieger');
    expect(rows[1].textContent).toContain('Anna');
  });

  it('Team Cricket: eine Zeile je Team mit Geschlossen und Punkte', () => {
    const cfg: GameConfig = { mode: 'cricket', ...teams };
    const table = renderSummary(game(cfg, [dart('a', 20, 3), dart('a', 0), dart('a', 0)], null));
    const rows = table.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Anna & Ben');
    expect(rows[0].textContent).toContain('1 von 7');
    expect(table.querySelector('thead')!.textContent).toContain('Geschlossen');
  });

  it('Einzelspiel bleibt unverändert (eine Zeile je Spieler)', () => {
    const cfg: GameConfig = { mode: 'x01', playerIds: ['a', 'b'], x01: { start: 301, doubleOut: false } };
    const table = renderSummary(game(cfg, [], 'a'));
    expect(table.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(table.querySelector('tbody tr')!.textContent).toContain('Sieger');
  });
});
