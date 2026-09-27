import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { chartOrder, color, elevation, motion, radius, space, type } from '../src/tokens.ts';

const HEX = /^#[0-9A-F]{6}(?:[0-9A-F]{2})?$/;

describe('colour tokens', () => {
  it('every colour in both modes is a hex string React Native can parse', () => {
    for (const mode of ['light', 'dark'] as const) {
      for (const [name, value] of Object.entries(color[mode])) {
        expect(value, `${mode}.${name}`).toMatch(HEX);
      }
    }
  });

  it('light and dark define exactly the same colour names', () => {
    expect(Object.keys(color.dark)).toEqual(Object.keys(color.light));
  });

  it('the hex guard fires on the values React Native rejects', () => {
    for (const bad of [
      'oklch(0.7 0.2 300)',
      'rgba(93, 52, 208, 0.22)',
      'color-mix(in srgb, red 50%, transparent)',
    ]) {
      expect(bad).not.toMatch(HEX);
    }
  });

  it('the chart order names real colours', () => {
    for (const name of chartOrder) expect(color.light[name]).toMatch(HEX);
  });
});

describe('numeric tokens', () => {
  it('spacing, radii, elevation, durations and native type sizes are numbers', () => {
    for (const v of Object.values(space)) expect(typeof v).toBe('number');
    for (const v of Object.values(radius)) expect(typeof v).toBe('number');
    for (const v of Object.values(elevation)) expect(typeof v).toBe('number');
    for (const v of Object.values(motion.duration)) expect(typeof v).toBe('number');
    for (const v of Object.values(type.native)) expect(typeof v).toBe('number');
  });
});

describe('dist/theme.css', () => {
  it('is what scripts/build.ts renders today (run `npm run build -w @klokka/tokens` after editing tokens.ts)', () => {
    const script = fileURLToPath(new URL('../scripts/build.ts', import.meta.url));
    expect(() => execFileSync(process.execPath, [script, '--check'], { stdio: 'pipe' })).not.toThrow();
  });

  it('declares the theme variables and the Tailwind theme block', () => {
    const css = readFileSync(fileURLToPath(new URL('../dist/theme.css', import.meta.url)), 'utf8');
    expect(css).toContain('--bg: light-dark(#F5F1FF, #0D0620);');
    expect(css).toContain('--primary: #FF006E;');
    expect(css).toContain('--radius-card: 24px;');
    expect(css).toContain('--dur-base: 400ms;');
    expect(css).toContain('@theme inline {');
    expect(css).toContain('--color-text-muted: var(--text-muted);');
    expect(css).not.toContain(String.fromCharCode(0x2014));
  });
});
