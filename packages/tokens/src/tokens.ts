// Klokka design tokens: the Nightshift theme (docs/DECISIONS.md D11), light and dark.
// This file is the source of truth. Values are copied from docs/design/tokens.json (themes.nightshift +
// shared) with two adaptations for React Native, which parses neither oklch() nor color-mix():
//   - every colour is a hex string (#RRGGBB or #RRGGBBAA; the mesh tints carry their alpha in the last byte),
//   - CSS-only values (clamp() type sizes, box-shadow strings, the currentColor glow) sit next to a native
//     number or are marked css-only, so the phone never reads a string it cannot use.
// `scripts/build.ts` turns this into dist/theme.css (CSS variables + a Tailwind v4 `@theme inline` block).

export const themeName = 'nightshift' as const;

export const color = {
  light: {
    bg: '#F5F1FF',
    surface: '#FFFFFF',
    surface2: '#ECE4FF',
    text: '#160B33',
    textMuted: '#5A4A8C',
    border: '#D8CCF5',
    rule: '#160B33',
    primary: '#FF006E',
    onPrimary: '#160B33',
    secondary: '#5D34D0',
    onSecondary: '#FFFFFF',
    accent: '#006B7D',
    success: '#0F7A55',
    warning: '#8F5400',
    danger: '#C62828',
    successSoft: '#DCF7EC',
    warningSoft: '#FFF0D6',
    dangerSoft: '#FFE3E3',
    pop1: '#7C4DFF',
    pop2: '#E0B400',
    pop3: '#FF7A59',
    chart1: '#5D34D0',
    chart2: '#FF006E',
    chart3: '#0090A8',
    chart4: '#C97A00',
    focus: '#5D34D0',
    mesh1: '#5D34D038',
    mesh2: '#FF006E24',
    mesh3: '#00F0FF3D',
  },
  dark: {
    bg: '#0D0620',
    surface: '#1A1033',
    surface2: '#27184D',
    text: '#F4EFFF',
    textMuted: '#B4A4E4',
    border: '#3A2A6A',
    rule: '#F4EFFF',
    primary: '#FF006E',
    onPrimary: '#0D0620',
    secondary: '#5D34D0',
    onSecondary: '#FFFFFF',
    accent: '#00F0FF',
    success: '#4DFFB8',
    warning: '#FFD166',
    danger: '#FF6B8A',
    successSoft: '#0F3A2B',
    warningSoft: '#3A2E0A',
    dangerSoft: '#3F1226',
    pop1: '#B388FF',
    pop2: '#FFE45C',
    pop3: '#FF7A59',
    chart1: '#6E4FE6',
    chart2: '#E0005F',
    chart3: '#0E93A6',
    chart4: '#B07A12',
    focus: '#00F0FF',
    mesh1: '#5D34D0BF',
    mesh2: '#FF006E6B',
    mesh3: '#00F0FF38',
  },
} as const;

export type ColorMode = keyof typeof color;
export type ColorName = keyof typeof color.light;

// The validated categorical order for marks (never text), see docs/design/DIRECTION.md 6.3.
export const chartOrder = ['chart1', 'chart2', 'chart3', 'chart4'] as const satisfies readonly ColorName[];

export const font = {
  display: 'Unbounded',
  body: 'Inter',
  mono: 'JetBrains Mono',
  // CSS font stacks (web).
  stack: {
    display: "'Unbounded', 'Inter', system-ui, sans-serif",
    body: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  displayWeight: 800,
  displayScale: 0.8,
  displayLeading: 1.0,
  displayTracking: '-0.02em',
  // The Google Fonts request the web shell loads; mobile embeds the same families through expo-font.
  google: 'Unbounded:wght@400..900|Inter:wght@400..800|JetBrains+Mono:wght@400..700',
} as const;

// Pixel numbers so both platforms read the same value; the CSS build appends `px`.
export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 32,
  8: 40,
  9: 48,
  10: 64,
  11: 80,
  12: 104,
  13: 128,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
  control: 999,
  chip: 999,
  card: 24,
} as const;

export const layout = {
  container: 1160,
  containerNarrow: 760,
  navHeight: 76,
  tapMin: 44,
  // css-only
  gutter: 'clamp(1.25rem, 4vw, 1.5rem)',
  sectionY: 'clamp(5rem, 6vw + 2rem, 8rem)',
} as const;

export const type = {
  // css-only fluid sizes (clamp on viewport width)
  css: {
    displayXl: 'clamp(3rem, 1.2rem + 8.4vw, 8.5rem)',
    displayL: 'clamp(2.5rem, 1rem + 5.6vw, 5.75rem)',
    h1: 'clamp(2.125rem, 1.2rem + 3.6vw, 4rem)',
    h2: 'clamp(1.75rem, 1.1rem + 2.4vw, 2.875rem)',
    h3: 'clamp(1.25rem, 1.05rem + 0.8vw, 1.625rem)',
    lead: 'clamp(1.0625rem, 1rem + 0.4vw, 1.25rem)',
    body: '1rem',
    small: '0.875rem',
    caption: '0.78125rem',
    eyebrow: '0.6875rem',
  },
  // the phone app's scale in px, for React Native: one step below the web's phone-width minimum, with
  // Inter headings (CHQ-162, see `app` below)
  native: {
    displayXl: 40,
    displayL: 32,
    h1: 24,
    h2: 20,
    h3: 17,
    lead: 16,
    body: 15,
    small: 13,
    caption: 12,
    eyebrow: 11,
  },
  leading: {
    display: 0.94,
    h1: 1.02,
    h2: 1.06,
    h3: 1.16,
    lead: 1.5,
    body: 1.55,
    small: 1.45,
    caption: 1.4,
  },
  tracking: {
    eyebrow: '0.14em',
    h1: '-0.02em',
    h2: '-0.015em',
    body: '0',
  },
} as const;

// Box shadows are CSS strings (they reference other variables); `elevation` is the Android/RN counterpart.
export const shadow = {
  sm: '0 0 0 1px var(--border)',
  md: '0 12px 32px -8px rgba(0, 0, 0, 0.35), 0 0 0 1px var(--border)',
  float: '0 32px 80px -16px rgba(0, 0, 0, 0.55), 0 0 0 1px var(--border)',
  glow: '0 0 24px color-mix(in srgb, var(--primary) 55%, transparent), 0 0 64px color-mix(in srgb, var(--accent) 25%, transparent)',
} as const;

export const elevation = {
  sm: 1,
  md: 6,
  float: 16,
} as const;

export const motion = {
  duration: {
    fast: 200,
    base: 400,
    slow: 700,
    rise: 1100,
    stagger: 90,
    paddleCycle: 60_000,
  },
  easing: {
    out: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
    inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
    spring:
      'linear(0, 0.009, 0.035 2.1%, 0.141 4.4%, 0.281 6.9%, 0.723 14%, 0.848 17%, 0.937 20.1%, 0.98 22.3%, 1.007 24.6%, 1.021 27.1%, 1.022 30%, 1.012 33.8%, 0.997 40.5%, 0.996 46.2%, 1.001 57%, 1)',
    linear: 'linear',
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
  },
  // Cubic bezier control points for the two easings Reanimated can take as Easing.bezier(...).
  bezier: {
    out: [0.2, 0.7, 0.2, 1],
    inOut: [0.65, 0, 0.35, 1],
    exit: [0.4, 0, 1, 1],
  },
  // A spring for Reanimated's withSpring that lands like the CSS linear() curve above.
  spring: { damping: 14, stiffness: 170, mass: 1 },
} as const;

// css-only texture and effects
export const texture = {
  grainOpacity: 0,
  bgImage:
    'radial-gradient(80% 60% at 88% -10%, var(--mesh-1) 0%, transparent 62%), radial-gradient(60% 50% at -10% 105%, var(--mesh-2) 0%, transparent 62%), radial-gradient(50% 45% at 60% 80%, var(--mesh-3) 0%, transparent 62%)',
  glowText: '0 0 22px var(--glow-color)',
  glowColor: {
    light: 'color-mix(in srgb, currentColor 22%, transparent)',
    dark: 'color-mix(in srgb, currentColor 55%, transparent)',
  },
  cardBorder: '1px solid var(--border)',
  gridGap: 12,
  gridLine: 'transparent',
  cellRadius: 'var(--radius-card)',
} as const;

export const z = {
  nav: 50,
  overlay: 100,
  toast: 200,
  devbar: 9999,
} as const;

// The signed-in product (web app and phone app) next to the marketing site: same colours, quieter type and
// shapes (CHQ-162). Inter headings instead of Unbounded (which stays in the wordmark), controls and cards at
// 12 px, chips at 8 px. The landing site keeps the base values; the web app opts in with
// <html data-surface="app">, the phone app reads these directly.
export const app = {
  font: {
    display: font.stack.body,
    displayWeight: 700,
    displayScale: 1,
    displayTracking: '-0.01em',
    headingLeading: 1.25,
  },
  radius: { control: 12, card: 12, chip: 8 },
  // css-only, the web app's heading sizes
  css: {
    displayXl: 'clamp(2.25rem, 1.8rem + 1.8vw, 3rem)',
    displayL: 'clamp(2rem, 1.6rem + 1.4vw, 2.5rem)',
    h1: 'clamp(1.5rem, 1.35rem + 0.6vw, 1.875rem)',
    h2: 'clamp(1.25rem, 1.15rem + 0.4vw, 1.5rem)',
    h3: '1.125rem',
    lead: '1.0625rem',
  },
} as const;

export const tokens = {
  themeName,
  color,
  chartOrder,
  font,
  space,
  radius,
  layout,
  type,
  shadow,
  elevation,
  motion,
  texture,
  z,
  app,
} as const;

export type Tokens = typeof tokens;
export default tokens;
