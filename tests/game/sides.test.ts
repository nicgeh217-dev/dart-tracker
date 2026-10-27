import { describe, expect, it } from 'vitest';
import { buildTeamOrder, isTeamGame, isValidTeamConfig, sideName, sideOf, sidesOf } from '../../src/game/sides';
import type { GameConfig } from '../../src/game/types';

const solo: GameConfig = { mode: 'x01', playerIds: ['a', 'b', 'c'] };
const team: GameConfig = { mode: 'x01', playerIds: ['a', 'c', 'b', 'd'], teams: [['a', 'b'], ['c', 'd']] };
const names = { a: 'Anna', b: 'Ben', c: 'Cleo', d: 'Dan' };

describe('sides', () => {
  it('sidesOf liefert Spieler als Seiten', () => {
    expect(sidesOf(solo).map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });
  it('sidesOf liefert zwei Team-Seiten in Startreihenfolge', () => {
    expect(sidesOf(team)).toEqual([
      { id: 'team:0', playerIds: ['a', 'b'] },
      { id: 'team:1', playerIds: ['c', 'd'] },
    ]);
  });
  it('sideOf ordnet Spieler ihrer Seite zu', () => {
    expect(sideOf(team, 'd')).toBe('team:1');
    expect(sideOf(team, 'a')).toBe('team:0');
    expect(sideOf(solo, 'b')).toBe('b');
  });
  it('buildTeamOrder verschränkt die Teams', () => {
    expect(buildTeamOrder([['a', 'b'], ['c', 'd']])).toEqual(['a', 'c', 'b', 'd']);
  });
  it('isTeamGame', () => {
    expect(isTeamGame(team)).toBe(true);
    expect(isTeamGame(solo)).toBe(false);
  });
  it('isValidTeamConfig akzeptiert eine korrekte Konfiguration', () => {
    expect(isValidTeamConfig(team)).toBe(true);
  });
  it('isValidTeamConfig lehnt Fehlerfälle ab', () => {
    expect(isValidTeamConfig({ ...team, playerIds: ['a', 'b', 'c', 'd'] })).toBe(false);
    expect(isValidTeamConfig({ ...team, teams: [['a', 'b', 'x'], ['c', 'd']] })).toBe(false);
    expect(isValidTeamConfig({ ...team, teams: [['a', 'a'], ['c', 'd']], playerIds: ['a', 'c', 'a', 'd'] })).toBe(false);
    expect(isValidTeamConfig({ mode: 'x01', playerIds: ['a', 'b', 'c', 'd'] })).toBe(false);
  });
  it('sideName verbindet Teamnamen mit &', () => {
    expect(sideName({ config: team, playerNames: names }, 'team:0')).toBe('Anna & Ben');
    expect(sideName({ config: solo, playerNames: names }, 'a')).toBe('Anna');
  });
});
