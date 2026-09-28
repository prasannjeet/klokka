import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { OperatorShell } from '@/components/operator/operator-shell';
import { MeProvider } from '@/lib/me';
import { loadMe } from '@/lib/me-server';
import { isSignedIn } from '@/lib/session';
import './operator.css';

// The operator console (CHQ-141): only for the global platform-admin role, which /me reports (the API
// enforces it on every operator route; this gate keeps the pages from existing for anyone else).
export default async function OperatorLayout({ children }: { children: ReactNode }) {
  if (!(await isSignedIn())) redirect('/sign-in?next=/ops');
  const me = await loadMe();
  if (!me.platformAdmin) notFound();
  return (
    <MeProvider initial={me}>
      <OperatorShell>{children}</OperatorShell>
    </MeProvider>
  );
}
