// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { armDraw, consumeDraw, drawSequence, showDrawOverlay } from '../../src/ui/draw';

function setReducedMotion(reduce: boolean) {
  window.matchMedia = ((q: string) => ({ matches: reduce && q.includes('reduce'), media: q })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  document.body.replaceChildren();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('drawSequence', () => {
  it('endet beim Gewinner und bleibt im Bereich', () => {
    for (let count = 2; count <= 8; count++) {
      for (let w = 0; w < count; w++) {
        const seq = drawSequence(count, w);
        expect(seq[seq.length - 1]).toBe(w);
        expect(seq.every((i) => i >= 0 && i < count)).toBe(true);
        for (let i = 1; i < seq.length; i++) expect(seq[i]).not.toBe(seq[i - 1]);
      }
    }
  });
  it('hat die gewünschte Länge', () => {
    expect(drawSequence(4, 1)).toHaveLength(16);
    expect(drawSequence(4, 1, 14)).toHaveLength(14);
  });
});

describe('armDraw', () => {
  it('ist ein einmaliges Flag', () => {
    expect(consumeDraw()).toBe(false);
    armDraw();
    expect(consumeDraw()).toBe(true);
    expect(consumeDraw()).toBe(false);
  });
});

describe('showDrawOverlay', () => {
  it('hängt am body, nennt den Gewinner und entfernt sich nach onDone (reduzierte Bewegung)', () => {
    setReducedMotion(true);
    const done = vi.fn();
    const overlay = showDrawOverlay(['Anna & Ben', 'Cleo & Dan'], 'beginnen', done);
    expect(document.body.contains(overlay)).toBe(true);
    expect(overlay.textContent).toContain('Anna & Ben beginnen');
    vi.advanceTimersByTime(1300);
    expect(done).toHaveBeenCalledTimes(1);
    expect(document.body.contains(overlay)).toBe(false);
  });

  it('läuft mit Bewegung und landet auf dem Gewinner', () => {
    setReducedMotion(false);
    const done = vi.fn();
    const overlay = showDrawOverlay(['Anna', 'Ben', 'Cleo'], 'beginnt', done);
    expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(document.body.contains(overlay)).toBe(true);
    vi.advanceTimersByTime(3000);
    expect(done).toHaveBeenCalledTimes(1);
    expect(overlay.isConnected).toBe(false);
  });

  it('Tippen überspringt und ruft onDone genau einmal', () => {
    setReducedMotion(false);
    const done = vi.fn();
    const overlay = showDrawOverlay(['Anna', 'Ben'], 'beginnt', done);
    overlay.click();
    overlay.click();
    vi.advanceTimersByTime(5000);
    expect(done).toHaveBeenCalledTimes(1);
    expect(overlay.isConnected).toBe(false);
  });
});
