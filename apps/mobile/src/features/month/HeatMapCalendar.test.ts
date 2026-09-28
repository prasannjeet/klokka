import { contrast, darkTheme, lightTheme } from '@/theme/theme';
import { flagFill, heatFills } from './HeatMapCalendar';

describe('the heat-map tints (CHQ-145)', () => {
  it.each([
    ['light', lightTheme],
    ['dark', darkTheme],
  ])(
    'keep the day number and the hours (text colour, 14 px) at 4.5:1 on every step and a flag in %s mode',
    (_mode, theme) => {
      for (const fill of [...heatFills(theme), flagFill(theme)]) {
        expect(contrast(theme.color.text, fill)).toBeGreaterThanOrEqual(4.5);
      }
    },
  );
});
