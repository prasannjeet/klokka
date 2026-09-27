// Writes dist/theme.css from src/tokens.ts. `node scripts/build.ts` regenerates; `--check` regenerates
// into memory and fails when the committed file differs (the guard CI and `npm run lint` rely on).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  color,
  font,
  layout,
  motion,
  radius,
  shadow,
  space,
  texture,
  themeName,
  type,
  z,
} from '../src/tokens.ts';

const kebab = (s: string) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([a-zA-Z])(\d)/g, '$1-$2')
    .toLowerCase();
const line = (name: string, value: string | number) => `  --${name}: ${value};`;

function lightDark(name: string, light: string, dark: string): string {
  return light === dark ? line(name, light) : line(name, `light-dark(${light}, ${dark})`);
}

function colours(): string[] {
  const out: string[] = [];
  for (const key of Object.keys(color.light) as (keyof typeof color.light)[]) {
    out.push(lightDark(kebab(key), color.light[key], color.dark[key]));
  }
  out.push(lightDark('glow-color', texture.glowColor.light, texture.glowColor.dark));
  return out;
}

function shared(): string[] {
  const out: string[] = [];
  out.push('  color-scheme: light dark;');
  for (const [k, v] of Object.entries(space)) out.push(line(`space-${k}`, `${v}px`));
  out.push(line('container', `${layout.container}px`));
  out.push(line('container-narrow', `${layout.containerNarrow}px`));
  out.push(line('gutter', layout.gutter));
  out.push(line('section-y', layout.sectionY));
  out.push(line('nav-h', `${layout.navHeight}px`));
  out.push(line('tap-min', `${layout.tapMin}px`));
  for (const [k, v] of Object.entries(type.css)) out.push(line(`text-${kebab(k)}`, v));
  for (const [k, v] of Object.entries(type.leading)) out.push(line(`leading-${kebab(k)}`, v));
  for (const [k, v] of Object.entries(type.tracking)) out.push(line(`tracking-${kebab(k)}`, v));
  out.push(line('ease-out', motion.easing.out));
  out.push(line('ease-in-out', motion.easing.inOut));
  out.push(line('ease-spring', motion.easing.spring));
  out.push(line('ease-linear', motion.easing.linear));
  for (const [k, v] of Object.entries(z)) out.push(line(`z-${k}`, v));
  return out;
}

function theme(): string[] {
  const out: string[] = [];
  out.push(line('theme-name', `"${themeName}"`));
  out.push(line('font-display', font.stack.display));
  out.push(line('font-body', font.stack.body));
  out.push(line('font-mono', font.stack.mono));
  out.push(line('font-display-weight', font.displayWeight));
  out.push(line('font-display-stretch', '100%'));
  out.push(line('font-display-variation', 'normal'));
  out.push(line('font-display-scale', font.displayScale));
  out.push(line('font-display-leading', font.displayLeading));
  out.push(line('font-display-tracking', font.displayTracking));
  for (const [k, v] of Object.entries(radius)) out.push(line(`radius-${k}`, `${v}px`));
  out.push(line('ease-enter', 'var(--ease-spring)'));
  out.push(line('ease-exit', motion.easing.exit));
  out.push(line('dur-fast', `${motion.duration.fast}ms`));
  out.push(line('dur-base', `${motion.duration.base}ms`));
  out.push(line('dur-slow', `${motion.duration.slow}ms`));
  out.push(line('dur-rise', `${motion.duration.rise}ms`));
  out.push(line('stagger', `${motion.duration.stagger}ms`));
  out.push(line('paddle-cycle', `${motion.duration.paddleCycle / 1000}s`));
  out.push(line('grain-opacity', texture.grainOpacity));
  out.push(line('bg-image', texture.bgImage));
  out.push(line('glow-text', texture.glowText));
  out.push(line('card-border', texture.cardBorder));
  out.push(line('grid-gap', `${texture.gridGap}px`));
  out.push(line('grid-line', texture.gridLine));
  out.push(line('cell-radius', texture.cellRadius));
  out.push(...colours());
  for (const [k, v] of Object.entries(shadow)) out.push(line(`shadow-${k}`, v));
  return out;
}

// Tailwind v4 theme namespace: utilities like bg-surface, text-text-muted, rounded-card, font-display,
// ease-spring and duration-base resolve to the variables above. `inline` keeps the var() reference so
// light-dark() still resolves at use time.
function tailwind(): string[] {
  const out: string[] = [];
  for (const key of Object.keys(color.light)) {
    const k = kebab(key);
    out.push(line(`color-${k}`, `var(--${k})`));
  }
  for (const k of Object.keys(radius)) out.push(line(`radius-${k}`, `var(--radius-${k})`));
  out.push(line('font-display', 'var(--font-display)'));
  out.push(line('font-body', 'var(--font-body)'));
  out.push(line('font-mono', 'var(--font-mono)'));
  for (const k of Object.keys(type.css)) out.push(line(`text-${kebab(k)}`, `var(--text-${kebab(k)})`));
  for (const k of Object.keys(shadow)) out.push(line(`shadow-${k}`, `var(--shadow-${k})`));
  out.push(line('ease-out', 'var(--ease-out)'));
  out.push(line('ease-in-out', 'var(--ease-in-out)'));
  out.push(line('ease-spring', 'var(--ease-spring)'));
  out.push(line('ease-enter', 'var(--ease-enter)'));
  out.push(line('ease-exit', 'var(--ease-exit)'));
  out.push(line('duration-fast', 'var(--dur-fast)'));
  out.push(line('duration-base', 'var(--dur-base)'));
  out.push(line('duration-slow', 'var(--dur-slow)'));
  out.push(line('duration-rise', 'var(--dur-rise)'));
  return out;
}

export function render(): string {
  return [
    '/* Generated from packages/tokens/src/tokens.ts by scripts/build.ts. Do not edit; run `npm run build -w @klokka/tokens`. */',
    '/* Theme: Nightshift (docs/DECISIONS.md D11). Colours are light-dark() pairs; <html data-mode="light|dark"> forces a mode, */',
    '/* no attribute follows prefers-color-scheme. Import after `@import "tailwindcss"` in the app stylesheet. */',
    ':root {',
    ...shared(),
    ...theme(),
    '}',
    ':root[data-mode="light"] { color-scheme: light; }',
    ':root[data-mode="dark"] { color-scheme: dark; }',
    '',
    '@theme inline {',
    ...tailwind(),
    '}',
    '',
  ].join('\n');
}

const outFile = fileURLToPath(new URL('../dist/theme.css', import.meta.url));
const css = render();

if (process.argv.includes('--check')) {
  const current = existsSync(outFile) ? readFileSync(outFile, 'utf8') : '';
  if (current !== css) {
    console.error(
      'packages/tokens/dist/theme.css is out of date: run `npm run build -w @klokka/tokens` and commit it.',
    );
    process.exit(1);
  }
  console.log('tokens: dist/theme.css is up to date');
} else {
  mkdirSync(fileURLToPath(new URL('../dist', import.meta.url)), { recursive: true });
  writeFileSync(outFile, css);
  console.log(`tokens: wrote ${outFile}`);
}
