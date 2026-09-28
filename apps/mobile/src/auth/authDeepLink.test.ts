import { redirectSystemPath as routerHook } from '../../app/+native-intent';
import { AUTH_FLOW_PATHS, deepLinkPath, isAuthFlowUrl, redirectSystemPath } from './authDeepLink';
import { POST_LOGOUT_REDIRECT_URI, REDIRECT_URI } from './config';

describe('auth deep-link handling', () => {
  it('reduces both shapes Android delivers to the same path, dropping query and fragment', () => {
    expect(deepLinkPath('klokka://auth/callback')).toBe('auth/callback');
    expect(deepLinkPath('klokka:///auth/callback?code=abc&state=xyz')).toBe('auth/callback');
    expect(deepLinkPath('klokka://auth/callback#done/')).toBe('auth/callback');
    expect(deepLinkPath('klokka:///')).toBe('');
  });

  it('covers exactly the two URIs registered on the Logto client', () => {
    expect(AUTH_FLOW_PATHS).toEqual(['auth/callback', 'auth/logout']);
    expect(isAuthFlowUrl(REDIRECT_URI)).toBe(true);
    expect(isAuthFlowUrl(POST_LOGOUT_REDIRECT_URI)).toBe(true);
    expect(isAuthFlowUrl('klokka://invitation?token=x')).toBe(false);
    expect(isAuthFlowUrl('klokka://week/auth/callback')).toBe(false);
  });

  it('swallows the auth URIs and passes every other link through', () => {
    expect(redirectSystemPath({ path: `${REDIRECT_URI}?code=abc`, initial: true })).toBeNull();
    expect(redirectSystemPath({ path: POST_LOGOUT_REDIRECT_URI, initial: false })).toBeNull();
    expect(redirectSystemPath({ path: 'klokka://invitation?token=x', initial: false })).toBe(
      'klokka://invitation?token=x',
    );
    expect(redirectSystemPath({ path: 'klokka://w/abc/month/2026-09', initial: true })).toBe(
      'klokka://w/abc/month/2026-09',
    );
  });

  it('is wired into the router through app/+native-intent', () => {
    expect(routerHook).toBe(redirectSystemPath);
  });
});
