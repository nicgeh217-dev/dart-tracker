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
