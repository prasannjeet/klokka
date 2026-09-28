import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { loadMe } from '@/lib/me-server';
import { LAST_WORKSPACE_COOKIE } from '@/lib/prefs';

// Where "/" goes: no workspace yet means creating one (or the operator console for an operator without
// one); otherwise the last workspace used on this browser, else the first.
export default async function Home() {
  const me = await loadMe();
  if (me.workspaces.length === 0) redirect(me.platformAdmin ? '/ops' : '/new');
  const last = (await cookies()).get(LAST_WORKSPACE_COOKIE)?.value;
  const target = me.workspaces.find((w) => w.slug === last) ?? me.workspaces[0];
  redirect(`/w/${target?.slug}`);
}
