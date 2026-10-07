import { offsetToReveal } from './keyboardReveal';

// CHQ-175: the whole field (not only its first line) must sit inside the part of the sheet the keyboard leaves.
describe('offsetToReveal', () => {
  const gap = 16;

  it('scrolls down until the field and its gap end at the bottom of the visible area', () => {
    expect(offsetToReveal({ y: 500, height: 88 }, { offset: 0, height: 300 }, gap)).toBe(
      500 + 88 + gap - 300,
    );
  });

  it('leaves the scroll alone when the field is already whole on screen', () => {
    expect(offsetToReveal({ y: 100, height: 88 }, { offset: 0, height: 300 }, gap)).toBeNull();
  });

  it('scrolls up to a field above the visible area', () => {
    expect(offsetToReveal({ y: 40, height: 88 }, { offset: 200, height: 300 }, gap)).toBe(40 - gap);
  });

  it('shows the top of a field taller than the visible area', () => {
    expect(offsetToReveal({ y: 500, height: 400 }, { offset: 0, height: 300 }, gap)).toBe(500 - gap);
  });

  it('never asks for a negative offset', () => {
    expect(offsetToReveal({ y: 4, height: 40 }, { offset: 50, height: 300 }, gap)).toBe(0);
  });
});
