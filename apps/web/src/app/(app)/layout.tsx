import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { MeProvider } from '@/lib/me';
import { loadMe } from '@/lib/me-server';
import { AFTER_SIGN_OUT_COOKIE, safeNext } from '@/lib/logto';
import { isSignedIn } from '@/lib/session';

// Everything behind sign-in. /me is read once here; the client keeps it fresh.
export default async function SignedInLayout({ children }: { children: ReactNode }) {
  if (!(await isSignedIn())) {
    const after = (await cookies()).get(AFTER_SIGN_OUT_COOKIE)?.value;
    redirect(after ? safeNext(after) : '/sign-in');
  }
  const me = await loadMe();
  return <MeProvider initial={me}>{children}</MeProvider>;
}
