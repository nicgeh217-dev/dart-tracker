import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Design-Tokens', () => {
  it('lädt die Farb-Tokens', () => {
    const css = readFileSync('src/styles/tokens.css', 'utf8');
    expect(css).toContain('--chalk: #ECE9DD');
    expect(css).toContain('--slate: #232B27');
  });
});
