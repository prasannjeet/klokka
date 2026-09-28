import { tokens } from '@klokka/tokens';
import { createTheme, luminance } from './theme';
import { resolveMode } from './ThemeProvider';

describe('theme', () => {
  it('reads every colour from the tokens for the mode', () => {
    expect(createTheme('dark').color).toEqual(tokens.color.dark);
    expect(createTheme('light').color).toEqual(tokens.color.light);
  });

  it('scales display roles by the Unbounded factor and keeps body roles as-is', () => {
    const t = createTheme('dark');
    expect(t.text('h1').fontSize).toBe(Math.round(tokens.type.native.h1 * tokens.font.displayScale));
    expect(t.text('body').fontSize).toBe(tokens.type.native.body);
    expect(t.text('eyebrow').textTransform).toBe('uppercase');
  });

  it('gives every workspace swatch a text colour that passes 4.5:1', () => {
    for (const mode of ['light', 'dark'] as const) {
      const t = createTheme(mode);
      for (const colour of ['PRIMARY', 'BLUE', 'GREEN', 'PURPLE', 'YELLOW', 'INK'] as const) {
        const { fill, on } = t.workspace(colour);
        const [l1, l2] = [luminance(fill), luminance(on)].sort((a, b) => b - a) as [number, number];
        expect((l1 + 0.05) / (l2 + 0.05)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe('resolveMode', () => {
  it('follows the device unless the preference overrides it', () => {
    expect(resolveMode('SYSTEM', 'light')).toBe('light');
    expect(resolveMode('SYSTEM', 'dark')).toBe('dark');
    expect(resolveMode(undefined, null)).toBe('dark');
    expect(resolveMode('LIGHT', 'dark')).toBe('light');
    expect(resolveMode('DARK', 'light')).toBe('dark');
  });
});
