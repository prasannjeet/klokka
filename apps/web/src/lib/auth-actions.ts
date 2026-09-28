'use server';

import { redirect } from 'next/navigation';
import { Prompt } from '@logto/next';
import { signIn, signOut } from '@logto/next/server-actions';
import { fakeSessionEnabled } from './env';
import { logtoConfig, safeNext } from './logto';
import { requestLocale } from './server-prefs';

// Sign in or create an account on Logto's hosted page (branded there), then come back to `next`.
export async function signInAction(formData: FormData): Promise<void> {
  const next = safeNext(formData.get('next'));
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

export async function signOutAction(): Promise<void> {
  if (fakeSessionEnabled()) redirect('/sign-in');
  const config = logtoConfig();
  await signOut(config, config.baseUrl);
}
