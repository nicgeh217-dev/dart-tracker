// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { effectTarget } from '../../src/ui/components/scoreboard';

function board(): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = '<div class="mini" data-side="b"></div><section class="active-card"><div class="ring"></div></section>';
  return root;
}

describe('effectTarget', () => {
  it('nimmt den Ring, wenn der Werfer noch dran ist', () => {
    const root = board();
    expect(effectTarget(root, 'a', 'a')).toBe(root.querySelector('.ring'));
  });
  it('nimmt die Mini-Karte des Werfers, wenn die Aufnahme zu Ende ist', () => {
    const root = board();
    expect(effectTarget(root, 'b', 'a')).toBe(root.querySelector('.mini[data-side="b"]'));
  });
  it('liefert null, wenn nichts passt', () => {
    expect(effectTarget(board(), 'zz', 'a')).toBeNull();
  });
});
