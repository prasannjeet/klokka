'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Prompt } from '@logto/next';
import { signIn, signOut } from '@logto/next/server-actions';
import { fakeSessionEnabled } from './env';
import { AFTER_SIGN_OUT_COOKIE, AFTER_SIGN_OUT_SECONDS, logtoConfig, safeNext } from './logto';
import { requestLocale } from './server-prefs';

// Sign in or create an account on Logto's hosted page (branded there), then come back to `next`.
export async function signInAction(formData: FormData): Promise<void> {
  const next = safeNext(formData.get('next'));
  (await cookies()).delete(AFTER_SIGN_OUT_COOKIE);
  if (fakeSessionEnabled()) redirect(next);
  const config = logtoConfig();
  const email = formData.get('email');
  const locale = await requestLocale();
  await signIn(config, {
    redirectUri: `${config.baseUrl}/callback`,
    postRedirectUri: next,
    firstScreen: formData.get('screen') === 'register' ? 'register' : 'signIn',
    ...(typeof email === 'string' && email ? { loginHint: email } : {}),
    // "Sign in with the invited address": ask Logto for a fresh login instead of the current session.
    ...(formData.get('prompt') === 'login' ? { prompt: Prompt.Login } : {}),
    extraParams: { ui_locales: locale },
  });
}

// With a `next` (the join page), the browser comes back there once Logto has ended the session.
export async function signOutAction(formData?: FormData): Promise<void> {
  const next = formData?.get('next');
  if (typeof next === 'string' && next) {
    (await cookies()).set(AFTER_SIGN_OUT_COOKIE, safeNext(next), {
      httpOnly: true,
      sameSite: 'lax',
      secure: logtoConfig().cookieSecure,
      maxAge: AFTER_SIGN_OUT_SECONDS,
      path: '/',
    });
  }
  if (fakeSessionEnabled()) redirect('/sign-in');
  const config = logtoConfig();
  await signOut(config, config.baseUrl);
}
