import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { handleSignIn } from '@logto/next/server-actions';
import { logtoConfig } from '@/lib/logto';

// Logto sends the browser back here; the tokens go into the session cookie and the user lands where the
// sign-in started (the join page after an invitation, otherwise the app).
export async function GET(request: NextRequest) {
  await handleSignIn(logtoConfig(), request.nextUrl.searchParams);
  redirect('/');
}
