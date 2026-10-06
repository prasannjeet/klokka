import { dayStepAnimation } from './dayStep';

describe('dayStepAnimation (CHQ-169)', () => {
  it('slides the previous day in from the left and the next day from the right', () => {
    expect(dayStepAnimation('back')).toBe('slide_from_left');
    expect(dayStepAnimation('forward')).toBe('slide_from_right');
  });

  it("keeps the platform's own transition when a day is opened any other way", () => {
    expect(dayStepAnimation(undefined)).toBe('default');
    expect(dayStepAnimation('sideways')).toBe('default');
  });
});
