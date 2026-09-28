import { redirect } from 'next/navigation';
import { safeNext } from '@/lib/logto';
import { isSignedIn } from '@/lib/session';
import { SignInView } from './sign-in-view';

// Klokka's side of sign-in (mockup login.html, "Sign in"): the brand panel and one card that hands over to
// Logto's hosted page, where email and password are entered. `reauth` means the API refused the token.
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const reauth = params.reauth === '1';
  if (!reauth && (await isSignedIn())) redirect(next);
  return <SignInView next={next} reauth={reauth} />;
}
