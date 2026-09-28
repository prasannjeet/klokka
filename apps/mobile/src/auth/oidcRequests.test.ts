import { CodeChallengeMethod, ResponseType } from 'expo-auth-session';
import { AUTH_SCOPES, POST_LOGOUT_REDIRECT_URI, REDIRECT_URI, authConfig, type AuthConfig } from './config';
import {
  buildAuthRequestConfig,
  buildCodeExchangeConfig,
  buildEndSessionUrl,
  buildRefreshConfig,
} from './oidcRequests';

const config: AuthConfig = {
  issuer: 'https://klokka-logto.coolify.ooguy.com/oidc',
  clientId: '1uhtt4uj8f0aevtgf6g3b',
  audience: 'https://api.klokka.app',
  redirectUri: REDIRECT_URI,
  postLogoutRedirectUri: POST_LOGOUT_REDIRECT_URI,
  scopes: AUTH_SCOPES,
};

// The `resource` parameter is what turns Logto's opaque token into the JWT the API accepts. It
// must be on all three requests, so each builder is pinned.
describe('OIDC request builders', () => {
  it('authorize: PKCE S256 code flow with the resource and the first screen', () => {
    const request = buildAuthRequestConfig(config);
    expect(request).toEqual({
      clientId: '1uhtt4uj8f0aevtgf6g3b',
      redirectUri: 'klokka://auth/callback',
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      responseType: ResponseType.Code,
      usePKCE: true,
      codeChallengeMethod: CodeChallengeMethod.S256,
      extraParams: { resource: 'https://api.klokka.app', first_screen: 'sign_in' },
    });
    expect(buildAuthRequestConfig(config, 'register').extraParams).toEqual({
      resource: 'https://api.klokka.app',
      first_screen: 'register',
    });
  });

  it('code exchange: carries the verifier and the resource, no client secret', () => {
    const exchange = buildCodeExchangeConfig(config, 'the-code', 'the-verifier');
    expect(exchange.extraParams).toEqual({
      resource: 'https://api.klokka.app',
      code_verifier: 'the-verifier',
    });
    expect(exchange.code).toBe('the-code');
    expect(exchange.redirectUri).toBe(REDIRECT_URI);
    expect('clientSecret' in exchange).toBe(false);
  });

  it('refresh: carries the resource on every grant', () => {
    const refresh = buildRefreshConfig(config, 'rt-1');
    expect(refresh.extraParams).toEqual({ resource: 'https://api.klokka.app' });
    expect(refresh.refreshToken).toBe('rt-1');
    expect(refresh.scopes).toEqual(AUTH_SCOPES);
  });

  it('end session: the registered post-logout URI and the id token hint, hand-assembled', () => {
    expect(buildEndSessionUrl('https://x/oidc/session/end', POST_LOGOUT_REDIRECT_URI, 'id.tok')).toBe(
      'https://x/oidc/session/end?post_logout_redirect_uri=klokka%3A%2F%2Fauth%2Flogout&id_token_hint=id.tok',
    );
    expect(buildEndSessionUrl('https://x/end?a=1', POST_LOGOUT_REDIRECT_URI, undefined)).toBe(
      'https://x/end?a=1&post_logout_redirect_uri=klokka%3A%2F%2Fauth%2Flogout',
    );
  });

  it('reads the runtime config from EXPO_PUBLIC_* and keeps the registered redirects', () => {
    const resolved = authConfig();
    expect(resolved.issuer).toBe('https://logto.test/oidc');
    expect(resolved.clientId).toBe('test-client');
    expect(resolved.audience).toBe('https://api.klokka.app');
    expect(resolved.redirectUri).toBe('klokka://auth/callback');
    expect(resolved.postLogoutRedirectUri).toBe('klokka://auth/logout');
  });
});
