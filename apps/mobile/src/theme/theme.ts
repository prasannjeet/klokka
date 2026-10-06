import { Platform, type TextStyle } from 'react-native';
import { tokens, type ColorMode, type ColorName } from '@klokka/tokens';
import type { WorkspaceColour } from '@klokka/api-client';

// The Nightshift theme for React Native (docs/DECISIONS.md D11), resolved from @klokka/tokens per
// colour mode. Every component reads colours, spacing, radii and type sizes from here and nowhere
// else (AGENTS.md, frontend rules).

export type Mode = ColorMode;
export type Colors = Record<ColorName, string>;

export type TypeRole = keyof typeof tokens.type.native;
export type FontWeight = 400 | 500 | 600 | 700 | 800;

export interface Theme {
  mode: Mode;
  color: Colors;
  space: typeof tokens.space;
  radius: Omit<typeof tokens.radius, keyof typeof tokens.app.radius> & typeof tokens.app.radius;
  size: typeof tokens.type.native;
  leading: typeof tokens.type.leading;
  motion: typeof tokens.motion;
  elevation: typeof tokens.elevation;
  chartOrder: typeof tokens.chartOrder;
  tapMin: number;
  // The style for a text role: family, size, line height, weight and tracking.
  text(role: TypeRole, weight?: FontWeight): TextStyle;
  // The fill colour of a workspace swatch and the text colour that passes on it.
  workspace(colour: WorkspaceColour): { fill: string; on: string };
}

// Android reads the XML font families registered by the expo-font plugin (family + weight); iOS reads
// PostScript names. Both come from the same @expo-google-fonts files listed in app.config.ts.
const IOS_DISPLAY: Record<number, string> = { 700: 'Unbounded-Bold', 800: 'Unbounded-ExtraBold' };
const IOS_BODY: Record<number, string> = {
  400: 'Inter-Regular',
  500: 'Inter-Medium',
  600: 'Inter-SemiBold',
  700: 'Inter-Bold',
};

export function fontFamily(role: 'display' | 'body', weight: FontWeight): TextStyle {
  if (role === 'display') {
    const w = weight >= 800 ? 800 : 700;
    return Platform.select<TextStyle>({
      ios: { fontFamily: IOS_DISPLAY[w] as string },
      default: { fontFamily: tokens.font.display, fontWeight: String(w) as TextStyle['fontWeight'] },
    }) as TextStyle;
  }
  const w = Math.min(700, weight);
  return Platform.select<TextStyle>({
    ios: { fontFamily: IOS_BODY[w] as string },
    default: { fontFamily: tokens.font.body, fontWeight: String(w) as TextStyle['fontWeight'] },
  }) as TextStyle;
}

const DISPLAY_ROLES: ReadonlySet<TypeRole> = new Set(['displayXl', 'displayL', 'h1', 'h2', 'h3']);

function leadingOf(role: TypeRole): number {
  switch (role) {
    case 'displayXl':
    case 'displayL':
    case 'h1':
    case 'h2':
    case 'h3':
      return tokens.app.font.headingLeading;
    case 'lead':
      return tokens.type.leading.lead;
    case 'small':
      return tokens.type.leading.small;
    case 'caption':
    case 'eyebrow':
      return tokens.type.leading.caption;
    default:
      return tokens.type.leading.body;
  }
}

function textStyle(role: TypeRole, weight?: FontWeight): TextStyle {
  const display = DISPLAY_ROLES.has(role);
  // Headings are Inter in the app (tokens `app`, CHQ-162); Unbounded is left to the wordmark.
  const size = tokens.type.native[role];
  const w = weight ?? (display ? tokens.app.font.displayWeight : role === 'eyebrow' ? 600 : 400);
  const em = (value: string) => Math.round(size * Number.parseFloat(value) * 100) / 100;
  return {
    ...fontFamily('body', w),
    fontSize: size,
    lineHeight: Math.round(size * leadingOf(role)),
    ...(role === 'eyebrow'
      ? { letterSpacing: em(tokens.type.tracking.eyebrow), textTransform: 'uppercase' }
      : {}),
    ...(display && role !== 'h3' ? { letterSpacing: em(tokens.app.font.displayTracking) } : {}),
  };
}

// WCAG relative luminance of a #RRGGBB, for choosing dark or light text on a workspace swatch.
export function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

// DIRECTION.md section 8: the workspace swatches are primary, chart2..4, pop2 and secondary, so every
// workspace colour exists in every theme and mode.
function workspaceFill(colors: Colors, colour: WorkspaceColour): string {
  switch (colour) {
    case 'PRIMARY':
      return colors.primary;
    case 'BLUE':
      return colors.chart3;
    case 'GREEN':
      return colors.success;
    case 'PURPLE':
      return colors.secondary;
    case 'YELLOW':
      return colors.pop2;
    case 'INK':
      return colors.text;
    default:
      return colors.primary;
  }
}

// A token colour at an alpha, as #RRGGBBAA (React Native reads the 8-digit form): faint rules and
// tints stay derived from the theme instead of becoming literal colours.
export function withAlpha(hex: string, alpha: number): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) throw new RangeError(`withAlpha: expected #RRGGBB, got "${hex}"`);
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255);
  return `${hex}${a.toString(16).padStart(2, '0')}`;
}

export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

export function createTheme(mode: Mode): Theme {
  const color = tokens.color[mode] as Colors;
  return {
    mode,
    color,
    space: tokens.space,
    radius: { ...tokens.radius, ...tokens.app.radius },
    size: tokens.type.native,
    leading: tokens.type.leading,
    motion: tokens.motion,
    elevation: tokens.elevation,
    chartOrder: tokens.chartOrder,
    tapMin: tokens.layout.tapMin,
    text: textStyle,
    workspace(colour) {
      const fill = workspaceFill(color, colour);
      // The token pair for primary is used as-is; otherwise whichever of the two text colours
      // contrasts more with the fill.
      if (colour === 'PRIMARY') return { fill, on: color.onPrimary };
      const dark = tokens.color.light.text;
      const light = tokens.color.dark.text;
      return { fill, on: contrast(fill, dark) >= contrast(fill, light) ? dark : light };
    },
  };
}

export const lightTheme = createTheme('light');
export const darkTheme = createTheme('dark');
