import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { AUTH_SCOPES } from './config';
import { createOidcClient } from './oidcClient';

// The iOS sign-in runs as a private auth session: no Logto cookie stays in Safari and iOS skips its
// "wants to use ... to Sign In" sheet. With nothing left in the browser, iOS sign-out opens no browser;
// Android still ends its Custom Tab session.
const prompts: unknown[] = [];
jest.mock('expo-auth-session', () => ({
  ...jest.requireActual<object>('expo-auth-session'),
  fetchDiscoveryAsync: async () => ({
    authorizationEndpoint: 'https://logto.example/oidc/auth',
    tokenEndpoint: 'https://logto.example/oidc/token',
    endSessionEndpoint: 'https://logto.example/oidc/session/end',
  }),
  AuthRequest: class {
    codeVerifier = 'verifier';
    async promptAsync(_doc: unknown, options: unknown) {
      prompts.push(options);
      return { type: 'cancel' };
    }
  },
}));

const config = {
  issuer: 'https://logto.example/oidc',
  clientId: 'app',
  audience: 'https://api.example',
  redirectUri: 'klokka://auth/callback',
  postLogoutRedirectUri: 'klokka://auth/signed-out',
  scopes: AUTH_SCOPES,
};

describe('the OIDC client', () => {
  const os = Platform.OS;
  let opened: jest.SpyInstance;
  beforeEach(() => {
    prompts.length = 0;
    opened = jest.spyOn(WebBrowser, 'openAuthSessionAsync');
  });
  afterEach(() => {
    Platform.OS = os;
    opened.mockRestore();
  });

  it('signs in through a private auth session', async () => {
    await createOidcClient(config).signIn();
    expect(prompts).toEqual([{ preferEphemeralSession: true }]);
  });

  it('opens no browser to sign out on iOS', async () => {
    Platform.OS = 'ios';
    await createOidcClient(config).endSession('id-token');
    expect(opened).not.toHaveBeenCalled();
  });

  it('ends the Custom Tab session on Android', async () => {
    Platform.OS = 'android';
    await createOidcClient(config).endSession('id-token');
    expect(opened).toHaveBeenCalledTimes(1);
    expect(opened.mock.calls[0]?.[0]).toContain('https://logto.example/oidc/session/end?');
  });
});
