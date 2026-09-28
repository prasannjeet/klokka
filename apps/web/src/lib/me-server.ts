import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import { ResponseError, type Me, type MyWorkspace } from '@klokka/api-client';
import { serverApi } from './session';

function isLogtoError(error: unknown): boolean {
  return error instanceof Error && /^Logto/.test(error.name);
}

// GET /me once per request (layout and page share it). A rejected or missing token sends the user to sign in.
export const loadMe = cache(async (): Promise<Me> => {
  try {
    return await (await serverApi()).me.getMe();
  } catch (error) {
    if ((error instanceof ResponseError && error.response.status === 401) || isLogtoError(error)) {
      redirect('/sign-in?reauth=1');
    }
    throw error;
  }
});

// Pages every member may open answer 404 to anyone outside the workspace.
export async function requireMember(slug: string): Promise<MyWorkspace> {
  const ws = (await loadMe()).workspaces.find((w) => w.slug === slug);
  if (!ws) notFound();
  return ws;
}

// Employer-only pages answer 404 to employees (the API refuses them too; this keeps the UI honest).
export async function requireEmployer(slug: string): Promise<MyWorkspace> {
  const ws = (await loadMe()).workspaces.find((w) => w.slug === slug);
  if (!ws || ws.role !== 'EMPLOYER') notFound();
  return ws;
}
