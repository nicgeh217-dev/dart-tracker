// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY, emptyData, loadData, saveData } from '../../src/store/storage';
import type { AppData } from '../../src/game/types';

const WARNING = 'Gespeicherte Daten konnten nicht gelesen werden. Die App startet leer.';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('loadData', () => {
  it('liefert leere Daten ohne Warnung bei leerem Speicher', () => {
    expect(loadData()).toEqual({ data: emptyData(), warning: null });
  });

  it('liest gespeicherte Daten zurück', () => {
    const data: AppData = { players: [{ id: 'p1', name: 'Mia' }], activeGame: null, history: [] };
    expect(saveData(data)).toBe(true);
    expect(loadData()).toEqual({ data, warning: null });
  });

  it('liefert leere Daten und Warnung bei kaputtem JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{kaputt');
    expect(loadData()).toEqual({ data: emptyData(), warning: WARNING });
  });

  it('liefert leere Daten und Warnung bei falscher Struktur', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ players: 'nein' }));
    expect(loadData()).toEqual({ data: emptyData(), warning: WARNING });
  });

  const game = (overrides: Record<string, unknown> = {}) => ({
    id: 'g',
    config: { mode: 'x01', playerIds: ['a', 'b'], x01: { start: 301, doubleOut: false } },
    playerNames: { a: 'A', b: 'B' },
    darts: [{ playerId: 'a', field: 20, multiplier: 3 }],
    startedAt: 0,
    finishedAt: null,
    winnerId: null,
    ...overrides,
  });
  const store = (data: Record<string, unknown>) =>
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ players: [], history: [], activeGame: null, ...data }));

  it('liest ein gültiges laufendes Spiel unverändert', () => {
    store({ activeGame: game() });
    expect(loadData().warning).toBeNull();
    expect(loadData().data.activeGame?.darts).toHaveLength(1);
  });

  it('liefert leere Daten und Warnung bei einem Dart des falschen Spielers', () => {
    store({ activeGame: game({ darts: [{ playerId: 'b', field: 20, multiplier: 1 }] }) });
    expect(loadData()).toEqual({ data: emptyData(), warning: WARNING });
  });

  it('liefert leere Daten und Warnung bei unbekanntem Modus in der Historie', () => {
    store({ history: [game({ config: { mode: 'golf', playerIds: ['a', 'b'] } })] });
    expect(loadData()).toEqual({ data: emptyData(), warning: WARNING });
  });

  it('liefert leere Daten und Warnung bei darts null und bei ungültigem Dart', () => {
    store({ history: [game({ darts: null })] });
    expect(loadData().warning).toBe(WARNING);
    store({ activeGame: game({ darts: [{ playerId: 'a', field: 25, multiplier: 3 }] }) });
    expect(loadData().warning).toBe(WARNING);
  });

  it('liefert leere Daten und Warnung bei null in players', () => {
    store({ players: [null] });
    expect(loadData()).toEqual({ data: emptyData(), warning: WARNING });
  });

  it('liefert leere Daten und Warnung, wenn localStorage wirft', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('gesperrt');
    });
    expect(loadData()).toEqual({ data: emptyData(), warning: WARNING });
  });
});

describe('saveData', () => {
  it('liefert false, wenn setItem wirft', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('voll');
    });
    expect(saveData(emptyData())).toBe(false);
  });
});
