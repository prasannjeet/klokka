'use client';

import { useT } from '@/lib/i18n';
import { useWorkspace } from '@/lib/workspace';

// Replaced by the employer overview (CHQ-124) and the employee month (CHQ-121).
export function WorkspaceHome() {
  const t = useT();
  const ws = useWorkspace();
  return (
    <section className="view">
      <div className="vh">
        <div>
          <h1>{ws.my.name}</h1>
          <p className="sub">{ws.isEmployer ? t('role.employer') : t('role.employee')}</p>
        </div>
      </div>
    </section>
  );
}
