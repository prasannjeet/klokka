import { describe, expect, it } from 'vitest';
import { heatLevel } from './heat';

describe('heatLevel', () => {
  it('is empty for no hours', () => {
    expect(heatLevel(null, 7.5)).toBe(0);
    expect(heatLevel(0, 7.5)).toBe(0);
  });
  it('steps against the default day length', () => {
    expect(heatLevel(2, 7.5)).toBe(1);
    expect(heatLevel(3, 7.5)).toBe(2);
    expect(heatLevel(6, 7.5)).toBe(3);
    expect(heatLevel(7.5, 7.5)).toBe(4);
    expect(heatLevel(10, 7.5)).toBe(4);
  });
  it('reads a full day relative to the workspace, not a fixed 8 h', () => {
    expect(heatLevel(6, 6)).toBe(4);
    expect(heatLevel(6, 8)).toBe(3);
  });
});
