import { describe, expect, it } from 'vitest';
import { isActive, tabNav, workspaceNav } from './nav';

describe('workspaceNav', () => {
  it('gives the employee a Week entry right under My month (CHQ-145)', () => {
    const items = workspaceNav('kafe-nord', false);
    expect(items.map((i) => i.href)).toEqual([
      '/w/kafe-nord',
      '/w/kafe-nord/week',
      '/w/kafe-nord/notifications',
      '/w/kafe-nord/profile',
    ]);
    expect(items[1]?.label).toBe('nav.week');
    expect(tabNav(items, false)).toHaveLength(4);
    // My month stays exact, so the week page never lights it up too.
    expect(isActive(items[0]!, '/w/kafe-nord/week')).toBe(false);
    expect(isActive(items[1]!, '/w/kafe-nord/week')).toBe(true);
  });

  it('gives the employer a team Calendar, and the phone tab bar five tabs without the Employee view (CHQ-171)', () => {
    const items = workspaceNav('kafe-nord', true);
    expect(items.map((i) => i.href)).toEqual([
      '/w/kafe-nord',
      '/w/kafe-nord/week',
      '/w/kafe-nord/employees',
      '/w/kafe-nord/month',
      '/w/kafe-nord/calendar',
      '/w/kafe-nord/notifications',
      '/w/kafe-nord/settings',
    ]);
    expect(tabNav(items, true).map((i) => i.tab)).toEqual([
      'nav.overview',
      'nav.week',
      'nav.people',
      'nav.calendar',
      'nav.settings',
    ]);
  });
});
