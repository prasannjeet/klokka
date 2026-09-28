import { CodeChallengeMethod, ResponseType } from 'expo-auth-session';
import type {
  AccessTokenRequestConfig,
  AuthRequestConfig,
  RefreshTokenRequestConfig,
} from 'expo-auth-session';
import type { AuthConfig } from './config';

// The `resource` parameter is LOAD-BEARING (Kulram KUL-119, docs/INFRA.md section 4): the Klokka
// API resource is not Logto's default API, so an authorize or token request without
// resource=<audience> yields an OPAQUE token the API rejects. It must ride the authorize request,
// the code exchange AND every refresh. These builders are pure so that fact is pinned by tests.
export function resourceParams(config: AuthConfig): Record<string, string> {
  return { resource: config.audience };
}

// Which page the hosted sign-in experience opens on (Logto reads `first_screen`).
export type FirstScreen = 'sign_in' | 'register';

export function buildAuthRequestConfig(
  config: AuthConfig,
  firstScreen: FirstScreen = 'sign_in',
): AuthRequestConfig {
  return {
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    scopes: [...config.scopes],
    responseType: ResponseType.Code,
    // Public client: PKCE S256 and no client secret, ever.
    usePKCE: true,
    codeChallengeMethod: CodeChallengeMethod.S256,
    extraParams: { ...resourceParams(config), first_screen: firstScreen },
  };
}

export function buildCodeExchangeConfig(
  config: AuthConfig,
  code: string,
  codeVerifier: string,
): AccessTokenRequestConfig {
  return {
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    code,
    scopes: [...config.scopes],
    extraParams: { ...resourceParams(config), code_verifier: codeVerifier },
  };
}

export function buildRefreshConfig(config: AuthConfig, refreshToken: string): RefreshTokenRequestConfig {
  return {
    clientId: config.clientId,
    refreshToken,
    scopes: [...config.scopes],
    extraParams: resourceParams(config),
  };
}

// RP-initiated logout. The query is assembled by hand: React Native's URL polyfill does not
// implement `searchParams`, so URLSearchParams would work in Jest and fail on device.
export function buildEndSessionUrl(
  endSessionEndpoint: string,
  postLogoutRedirectUri: string,
  idToken: string | undefined,
): string {
  const params = [`post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`];
  if (idToken !== undefined) params.push(`id_token_hint=${encodeURIComponent(idToken)}`);
  const separator = endSessionEndpoint.includes('?') ? '&' : '?';
  return `${endSessionEndpoint}${separator}${params.join('&')}`;
}
