import type { MyWorkspace } from '@klokka/api-client';
import type { Translator } from '@klokka/core';

// "Employer, 4 people" / "Employee, logged by Nora Lind".
export function roleLine(t: Translator, ws: MyWorkspace): string {
  if (ws.role === 'EMPLOYER') {
    return ws.memberCount != null ? t('role.employerPeople', { count: ws.memberCount }) : t('role.employer');
  }
  return ws.employerName ? t('role.employeeLoggedBy', { name: ws.employerName }) : t('role.employee');
}
