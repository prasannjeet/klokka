import { UserScope } from '@logto/next';
import type { LogtoNextConfig } from '@logto/next';
import { serverEnv } from './env';

// One Logto access token per user for the Klokka API resource, no organization tokens (docs/DECISIONS.md
// D1): what a user may do in a workspace comes from the API's membership table via /me, never from claims.
// `operator` is requested so a platform-admin's token carries it; everyone else simply does not get it.
export function logtoConfig(): LogtoNextConfig {
  const env = serverEnv();
  return {
    endpoint: env.logtoEndpoint,
    appId: env.logtoAppId,
    appSecret: env.logtoAppSecret,
    baseUrl: env.baseUrl,
    cookieSecret: env.cookieSecret,
    cookieSecure: env.baseUrl.startsWith('https://'),
    resources: [env.apiResource],
    scopes: [UserScope.Email, UserScope.Profile, UserScope.Roles, 'operator'],
  };
}

export function apiResource(): string {
  return serverEnv().apiResource;
}

// Where to land after a sign-out that should come back (the join page, CHQ-178): Logto only returns to the base
// URL, so the place waits in this short-lived cookie and the signed-out app shell sends the browser on.
export const AFTER_SIGN_OUT_COOKIE = 'klokka_after_sign_out';
export const AFTER_SIGN_OUT_SECONDS = 600;

// Only same-origin paths may be used as the place to land after sign-in.
export function safeNext(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/';
  }
  return value;
}
