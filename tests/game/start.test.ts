import { describe, expect, it } from 'vitest';
import { drawStart, rematchConfig } from '../../src/game/start';
import { isValidTeamConfig } from '../../src/game/sides';
import type { GameConfig } from '../../src/game/types';

const team: GameConfig = { mode: 'x01', playerIds: ['a', 'c', 'b', 'd'], teams: [['a', 'b'], ['c', 'd']] };
const solo: GameConfig = { mode: 'free', playerIds: ['a', 'b', 'c'] };

describe('drawStart', () => {
  it('Teams: random unter 0.5 lässt die Reihenfolge', () => {
    expect(drawStart(team, () => 0.49)).toEqual(team);
  });
  it('Teams: random ab 0.5 tauscht die Teams', () => {
    const r = drawStart(team, () => 0.5);
    expect(r.teams).toEqual([['c', 'd'], ['a', 'b']]);
    expect(r.playerIds).toEqual(['c', 'a', 'd', 'b']);
  });
  it('Einzel: 0 lässt, 0.5 rotiert um 1, 0.99 um 2', () => {
    expect(drawStart(solo, () => 0).playerIds).toEqual(['a', 'b', 'c']);
    expect(drawStart(solo, () => 0.5).playerIds).toEqual(['b', 'c', 'a']);
    expect(drawStart(solo, () => 0.99).playerIds).toEqual(['c', 'a', 'b']);
  });
  it('mutiert die Eingabe nicht', () => {
    const copy = structuredClone(team);
    drawStart(team, () => 0.9);
    expect(team).toEqual(copy);
  });
  it('liefert gültige Team-Konfigurationen', () => {
    expect(isValidTeamConfig(drawStart(team, () => 0.9))).toBe(true);
  });
});

describe('rematchConfig', () => {
  it('tauscht bei Teams die Startreihenfolge', () => {
    const r = rematchConfig(team);
    expect(r.teams).toEqual([['c', 'd'], ['a', 'b']]);
    expect(r.playerIds).toEqual(['c', 'a', 'd', 'b']);
  });
  it('rotiert Einzelspieler um 1', () => {
    expect(rematchConfig(solo).playerIds).toEqual(['b', 'c', 'a']);
  });
});
