import { describe, expect, it } from 'vitest';
import { personaFrom, rewriteForPersona } from './dev-persona';

const me = {
  platformAdmin: false,
  workspaces: [{ slug: 'cafe-nord', role: 'EMPLOYEE', memberCount: null, employerName: 'Nora Lind' }],
};

describe('development personas', () => {
  it('defaults to the employer', () => {
    expect(personaFrom(undefined)).toBe('employer');
    expect(personaFrom('employee')).toBe('employee');
    expect(personaFrom('operator')).toBe('operator');
  });

  it('turns the mock /me into an employer, an employee or an operator', () => {
    const employer = rewriteForPersona('employer', 'me', me) as typeof me;
    expect(employer.workspaces[0]?.role).toBe('EMPLOYER');
    expect(employer.platformAdmin).toBe(false);
    const operator = rewriteForPersona('operator', 'me', me) as typeof me;
    expect(operator.platformAdmin).toBe(true);
    const employee = rewriteForPersona('employee', 'me', me) as typeof me;
    expect(employee.workspaces[0]?.employerName).toBe('Nora Lind');
  });

  it('sets myRole on the workspace and leaves every other path alone', () => {
    expect(rewriteForPersona('employee', 'workspaces/w1', { myRole: 'EMPLOYER' })).toEqual({
      myRole: 'EMPLOYEE',
    });
    expect(rewriteForPersona('employee', 'workspaces/w1/members', [{ role: 'EMPLOYEE' }])).toEqual([
      { role: 'EMPLOYEE' },
    ]);
  });
});
