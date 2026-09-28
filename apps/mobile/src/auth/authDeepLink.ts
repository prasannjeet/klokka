import { POST_LOGOUT_REDIRECT_URI, REDIRECT_URI } from './config';

// Android hands an incoming deep link to EVERY Linking listener, so the OIDC redirect that
// expo-auth-session is waiting for is also offered to expo-router. There is no /auth route (sign-in
// is a rendering branch, not a route), so without this the router would land on +not-found. These
// pure rules make the router ignore the two auth URIs and nothing else (Kulram KUL-133).

// The scheme-less, query-less, lower-cased path of a deep link: `klokka://auth/callback` and
// `klokka:///auth/callback?code=x` both reduce to `auth/callback`.
export function deepLinkPath(url: string): string {
  const schemeSeparator = url.indexOf(':');
  const withoutScheme = schemeSeparator === -1 ? url : url.slice(schemeSeparator + 1);
  const queryStart = withoutScheme.search(/[?#]/);
  const withoutQuery = queryStart === -1 ? withoutScheme : withoutScheme.slice(0, queryStart);
  return withoutQuery.replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase();
}

export const AUTH_FLOW_PATHS: readonly string[] = [
  deepLinkPath(REDIRECT_URI),
  deepLinkPath(POST_LOGOUT_REDIRECT_URI),
];

export function isAuthFlowUrl(url: string): boolean {
  return AUTH_FLOW_PATHS.includes(deepLinkPath(url));
}

// expo-router's NativeIntent hook (app/+native-intent.ts). Null means "do not navigate".
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string | null {
  return isAuthFlowUrl(path) ? null : path;
}
