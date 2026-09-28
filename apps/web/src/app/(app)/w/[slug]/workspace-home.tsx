'use client';

import { EmployeeMonth } from '@/components/employee-month';
import { EmployerOverview } from '@/components/employer-overview';
import { useWorkspace } from '@/lib/workspace';

// The workspace's front page: the employer's overview (CHQ-124) or the employee's own month (CHQ-121).
export function WorkspaceHome() {
  const ws = useWorkspace();
  return ws.isEmployer ? <EmployerOverview /> : <EmployeeMonth />;
}
