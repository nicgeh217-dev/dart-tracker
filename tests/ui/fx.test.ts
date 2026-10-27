// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearFx,
  haptic,
  motionAllowed,
  playEffects,
  rememberOrigin,
  takeOrigin,
} from '../../src/ui/fx';

function media(reduce: boolean | 'missing') {
  if (reduce === 'missing') {
    (window as unknown as { matchMedia?: unknown }).matchMedia = undefined;
    return;
  }
  window.matchMedia = ((q: string) => ({ matches: reduce && q.includes('reduce'), media: q })) as unknown as typeof window.matchMedia;
}
const layer = () => document.querySelector('.fx-layer');
let vibrate: ReturnType<typeof vi.fn>;
const originalAnimate = Element.prototype.animate;

beforeEach(() => {
  document.body.replaceChildren();
  vi.useFakeTimers();
  media(false);
  vibrate = vi.fn();
  Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true, writable: true });
  HTMLCanvasElement.prototype.getContext = (() => null) as never;
  Element.prototype.animate = originalAnimate;
});
afterEach(() => {
  clearFx();
  vi.useRealTimers();
});

const ctx = (ring: Element | null = null, mode: 'x01' | 'cricket' | 'free' = 'x01') => ({ mode, ring, origin: null });

describe('motionAllowed', () => {
  it('ist false bei reduzierter Bewegung und wenn matchMedia fehlt', () => {
    media(true);
    expect(motionAllowed()).toBe(false);
    media('missing');
    expect(motionAllowed()).toBe(false);
    media(false);
    expect(motionAllowed()).toBe(true);
  });
});

describe('playEffects', () => {
  it('erzeugt bei reduzierter Bewegung keine Overlay-Elemente, ruft aber Haptik', () => {
    media(true);
    playEffects([{ kind: 'points', value: 60 }, { kind: 'triple' }], ctx(document.createElement('div')));
    expect(layer()?.children.length ?? 0).toBe(0);
    expect(vibrate).toHaveBeenCalledWith(15);
  });

  it('oneEighty erzeugt Banner und Canvas in der fx-Ebene', () => {
    playEffects([{ kind: 'oneEighty' }], ctx());
    expect(layer()!.querySelector('.fx-banner')!.textContent).toBe('180!');
    expect(layer()!.querySelector('canvas')).not.toBeNull();
    expect(vibrate).toHaveBeenCalledWith([20, 40, 20]);
  });

  it('Sieg zeigt in X01 Checkout, sonst Sieg', () => {
    playEffects([{ kind: 'win' }], ctx(null, 'x01'));
    expect(layer()!.querySelector('.fx-banner')!.textContent).toBe('Checkout!');
    playEffects([{ kind: 'win' }], ctx(null, 'cricket'));
    expect(layer()!.querySelector('.fx-banner')!.textContent).toBe('Sieg!');
  });

  it('points ohne Ursprung wirft nicht und erzeugt einen fliegenden Text', () => {
    const ring = document.createElement('div');
    document.body.append(ring);
    expect(() => playEffects([{ kind: 'points', value: 60 }], ctx(ring))).not.toThrow();
    expect(layer()!.querySelector('.fx-float')!.textContent).toBe('+60');
  });

  it('fehlendes Element.animate wirft nicht', () => {
    (Element.prototype as unknown as { animate?: unknown }).animate = undefined;
    const ring = document.createElement('div');
    expect(() => playEffects([{ kind: 'points', value: 20 }], ctx(ring))).not.toThrow();
    vi.advanceTimersByTime(1000);
    expect(layer()!.querySelector('.fx-float')).toBeNull();
  });

  it('triple setzt glow-green am Ring und entfernt es nach 450 ms', () => {
    const ring = document.createElement('div');
    playEffects([{ kind: 'triple' }], ctx(ring));
    expect(ring.classList.contains('glow-green')).toBe(true);
    vi.advanceTimersByTime(460);
    expect(ring.classList.contains('glow-green')).toBe(false);
  });

  it('double und bull setzen glow-red und glow-cream', () => {
    const a = document.createElement('div');
    playEffects([{ kind: 'double' }], ctx(a));
    expect(a.classList.contains('glow-red')).toBe(true);
    const b = document.createElement('div');
    playEffects([{ kind: 'bull' }], ctx(b));
    expect(b.classList.contains('glow-cream')).toBe(true);
  });

  it('bust setzt shake und flash-bad und zeigt rotes Bust', () => {
    const ring = document.createElement('div');
    playEffects([{ kind: 'bust' }], ctx(ring));
    expect(ring.classList.contains('shake')).toBe(true);
    expect(ring.classList.contains('flash-bad')).toBe(true);
    expect(layer()!.querySelector('.fx-float.bad')!.textContent).toBe('Bust');
    expect(vibrate).toHaveBeenCalledWith(40);
  });

  it('zweiter Aufruf räumt die alten Overlays weg', () => {
    playEffects([{ kind: 'oneEighty' }], ctx());
    playEffects([{ kind: 'win' }], ctx());
    expect(layer()!.querySelectorAll('.fx-banner')).toHaveLength(1);
    expect(layer()!.querySelectorAll('canvas')).toHaveLength(1);
  });
});

describe('Ursprung und Haptik', () => {
  it('rememberOrigin und takeOrigin geben das Rechteck einmalig zurück', () => {
    expect(takeOrigin()).toBeNull();
    rememberOrigin(document.createElement('button'));
    expect(takeOrigin()).not.toBeNull();
    expect(takeOrigin()).toBeNull();
  });
  it('haptic ohne navigator.vibrate wirft nicht', () => {
    Object.defineProperty(navigator, 'vibrate', { value: undefined, configurable: true, writable: true });
    expect(() => haptic(15)).not.toThrow();
  });
});
