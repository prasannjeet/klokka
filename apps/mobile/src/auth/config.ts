import { appConfig } from '@/config';

// The values the auth chain needs: issuer, client id, API resource, the two redirect URIs and the
// scopes. Public client configuration, never secrets (a Logto Native app authenticates with PKCE).
export interface AuthConfig {
  issuer: string;
  clientId: string;
  // The API resource indicator. It rides BOTH the authorize and the token request as `resource`;
  // without it Logto issues an opaque token instead of the JWT the API needs (docs/INFRA.md 4).
  audience: string;
  redirectUri: string;
  postLogoutRedirectUri: string;
  scopes: readonly string[];
}

// `email` because the profile shows it; `offline_access` is what makes the refresh token flow.
export const AUTH_SCOPES: readonly string[] = ['openid', 'profile', 'email', 'offline_access'];

// Both URIs are registered VERBATIM on the Logto native app (docs/INFRA.md section 4) and Logto
// matches redirect_uri exactly, so they are constants rather than makeRedirectUri() output.
export const REDIRECT_URI = 'klokka://auth/callback';
export const POST_LOGOUT_REDIRECT_URI = 'klokka://auth/logout';

export function authConfig(): AuthConfig {
  const config = appConfig();
  return {
    issuer: config.issuer,
    clientId: config.clientId,
    audience: config.apiResource,
    redirectUri: REDIRECT_URI,
    postLogoutRedirectUri: POST_LOGOUT_REDIRECT_URI,
    scopes: AUTH_SCOPES,
  };
}
