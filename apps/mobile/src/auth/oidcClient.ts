import { AuthRequest, exchangeCodeAsync, fetchDiscoveryAsync, refreshAsync } from 'expo-auth-session';
import type { DiscoveryDocument, TokenResponse } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import type { AuthConfig } from './config';
import type { FirstScreen } from './oidcRequests';
import {
  buildAuthRequestConfig,
  buildCodeExchangeConfig,
  buildEndSessionUrl,
  buildRefreshConfig,
} from './oidcRequests';
import type { StoredSession } from './tokenStorage';

export type SignInOutcome =
  { kind: 'signedIn'; session: StoredSession } | { kind: 'cancelled' } | { kind: 'failed'; message: string };

export class OidcError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'OidcError';
  }
}

// expo-auth-session reports expiry as issuedAt + expiresIn, both in SECONDS; the app works in epoch
// milliseconds, so the conversion happens once, here.
export function toStoredSession(response: TokenResponse): StoredSession {
  const expiresInSeconds = response.expiresIn ?? 0;
  const session: StoredSession = {
    accessToken: response.accessToken,
    expiresAt: (response.issuedAt + expiresInSeconds) * 1000,
    tokenType: response.tokenType,
  };
  if (response.refreshToken !== undefined) session.refreshToken = response.refreshToken;
  if (response.idToken !== undefined) session.idToken = response.idToken;
  return session;
}

export interface OidcClient {
  discovery(): Promise<DiscoveryDocument>;
  signIn(firstScreen?: FirstScreen): Promise<SignInOutcome>;
  refresh(refreshToken: string): Promise<StoredSession>;
  endSession(idToken: string | undefined): Promise<void>;
}

// The adapter over expo-auth-session. The authorization request is shown in the system browser (an
// Android Custom Tab), never an embedded WebView (RFC 8252).
export function createOidcClient(config: AuthConfig): OidcClient {
  let discoveryPromise: Promise<DiscoveryDocument> | null = null;

  const discovery = (): Promise<DiscoveryDocument> => {
    if (discoveryPromise === null) {
      discoveryPromise = fetchDiscoveryAsync(config.issuer).catch((cause: unknown) => {
        // Do not cache a failed lookup: the next attempt (better network) must be able to succeed.
        discoveryPromise = null;
        throw new OidcError(`could not load the OIDC discovery document from ${config.issuer}`, { cause });
      });
    }
    return discoveryPromise;
  };

  return {
    discovery,

    async signIn(firstScreen) {
      const doc = await discovery();
      const request = new AuthRequest(buildAuthRequestConfig(config, firstScreen));
      // iOS: a private session keeps no Logto cookie in Safari, which also skips the system's "wants to use
      // ... to Sign In" sheet. Android ignores the flag; its Custom Tab session is ended on sign-out instead.
      const result = await request.promptAsync(doc, { preferEphemeralSession: true });
      if (result.type === 'cancel' || result.type === 'dismiss') return { kind: 'cancelled' };
      if (result.type === 'error') {
        return {
          kind: 'failed',
          message: result.error?.message ?? result.errorCode ?? 'authorization failed',
        };
      }
      if (result.type !== 'success') return { kind: 'failed', message: `unexpected result '${result.type}'` };
      const code = result.params['code'];
      const verifier = request.codeVerifier;
      if (code === undefined || verifier === undefined) {
        return { kind: 'failed', message: 'the authorization response carried no code' };
      }
      const tokens = await exchangeCodeAsync(buildCodeExchangeConfig(config, code, verifier), doc);
      return { kind: 'signedIn', session: toStoredSession(tokens) };
    },

    async refresh(refreshToken) {
      const doc = await discovery();
      const tokens = await refreshAsync(buildRefreshConfig(config, refreshToken), doc);
      return toStoredSession(tokens);
    },

    async endSession(idToken) {
      // iOS signs in privately (above): no browser session is left to end, and opening one would only show
      // the system sheet again. The tokens are already gone from the device.
      if (Platform.OS === 'ios') return;
      const doc = await discovery();
      const endpoint = doc.endSessionEndpoint;
      if (endpoint === undefined) return;
      const url = buildEndSessionUrl(endpoint, config.postLogoutRedirectUri, idToken);
      await WebBrowser.openAuthSessionAsync(url, config.postLogoutRedirectUri);
    },
  };
}
