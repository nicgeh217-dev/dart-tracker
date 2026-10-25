import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Design-Tokens', () => {
  it('lädt die Dartboard-Farben auf Graphit', () => {
    const css = readFileSync('src/styles/tokens.css', 'utf8');
    expect(css).toContain('--bg: #0E1110');
    expect(css).toContain('--cream: #EDE6D3');
    expect(css).toContain('--red: #E0453A');
    expect(css).toContain('--green: #34A268');
  });
});
