// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createKeypad } from '../../src/ui/components/keypad';

function setup() {
  const onDart = vi.fn();
  const onUndo = vi.fn();
  const keypad = createKeypad(onDart, onUndo);
  document.body.replaceChildren(keypad);
  const btn = (text: string) =>
    [...keypad.querySelectorAll('button')].find((b) => b.textContent === text) as HTMLButtonElement;
  return { onDart, onUndo, btn, keypad };
}

describe('Keypad', () => {
  it('Single + 20 ruft onDart(20, 1)', () => {
    const { onDart, btn } = setup();
    btn('20').click();
    expect(onDart).toHaveBeenCalledWith(20, 1);
  });

  it('Double + 20 ruft onDart(20, 2) und springt auf Single zurück', () => {
    const { onDart, btn } = setup();
    btn('Double').click();
    expect(btn('Double').getAttribute('aria-pressed')).toBe('true');
    btn('20').click();
    expect(onDart).toHaveBeenCalledWith(20, 2);
    expect(btn('Single').getAttribute('aria-pressed')).toBe('true');
    expect(btn('Double').getAttribute('aria-pressed')).toBe('false');
  });

  it('Triple deaktiviert Bull und Miss', () => {
    const { btn } = setup();
    btn('Triple').click();
    expect(btn('Bull').disabled).toBe(true);
    expect(btn('Miss').disabled).toBe(true);
    expect(btn('19').disabled).toBe(false);
  });

  it('Double deaktiviert nur Miss, Bull ruft onDart(25, 2)', () => {
    const { onDart, btn } = setup();
    btn('Double').click();
    expect(btn('Miss').disabled).toBe(true);
    expect(btn('Bull').disabled).toBe(false);
    btn('Bull').click();
    expect(onDart).toHaveBeenCalledWith(25, 2);
  });

  it('Miss ruft onDart(0, 1)', () => {
    const { onDart, btn } = setup();
    btn('Miss').click();
    expect(onDart).toHaveBeenCalledWith(0, 1);
  });

  it('Rückgängig ruft onUndo', () => {
    const { onUndo, btn } = setup();
    btn('Rückgängig').click();
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('färbt die Tastatur nach dem Multiplikator ein', () => {
    const { keypad, btn } = setup();
    expect(keypad.dataset.multiplier).toBe('single');
    btn('Triple').click();
    expect(keypad.dataset.multiplier).toBe('triple');
  });
});
