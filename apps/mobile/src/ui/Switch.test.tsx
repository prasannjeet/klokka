import { contrast, darkTheme, lightTheme } from '@/theme/theme';
import { switchColors } from './Switch';

describe('switchColors (CHQ-145)', () => {
  it.each([
    ['light', lightTheme],
    ['dark', darkTheme],
  ])('keeps the thumb visible against its track in %s mode, off and on', (_mode, theme) => {
    for (const on of [false, true]) {
      const { thumb, track } = switchColors(theme, on);
      expect(thumb).not.toBe(track);
      // Non-text UI contrast (WCAG 1.4.11) between the thumb and the track it sits on.
      expect(contrast(thumb, track)).toBeGreaterThanOrEqual(3);
    }
  });
});
