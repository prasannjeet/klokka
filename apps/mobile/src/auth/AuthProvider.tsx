import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { AuthConfig } from './config';
import { authConfig } from './config';
import type { OidcClient } from './oidcClient';
import { createOidcClient } from './oidcClient';
import type { FirstScreen } from './oidcRequests';
import type { AuthRequiredReason, AuthStatus } from './sessionManager';
import { SessionManager } from './sessionManager';
import type { TokenStorage } from './tokenStorage';
import { createSecureTokenStorage } from './tokenStorage';

export type AuthFailure = 'signInFailed';

export interface AuthContextValue {
  status: AuthStatus;
  config: AuthConfig;
  failure: AuthFailure | null;
  // Opens the hosted page in the system browser; `firstScreen` only decides which page it lands on.
  signIn: (firstScreen?: FirstScreen) => Promise<void>;
  // Drops the local session, runs the caller's cleanup (caches, stores, push token), then ends the
  // Logto session in the browser.
  signOut: (beforeEndSession?: () => Promise<void>) => Promise<void>;
  // The token source for every authenticated call. Refreshes silently when needed.
  getAccessToken: () => Promise<string | null>;
  onAuthRequired: (reason: AuthRequiredReason) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const systemClock = () => Date.now();

export interface AuthProviderProps {
  children: ReactNode;
  // Injection seams for tests; the app supplies none.
  client?: OidcClient;
  storage?: TokenStorage;
  config?: AuthConfig;
}

export function AuthProvider({ children, client, storage, config }: AuthProviderProps) {
  const resolvedConfig = useMemo(() => config ?? authConfig(), [config]);
  const oidc = useMemo(() => client ?? createOidcClient(resolvedConfig), [client, resolvedConfig]);
  const manager = useMemo(
    () =>
      new SessionManager({
        storage: storage ?? createSecureTokenStorage(),
        refreshTokens: (refreshToken) => oidc.refresh(refreshToken),
        now: systemClock,
      }),
    [oidc, storage],
  );

  const [status, setStatus] = useState<AuthStatus>(manager.status);
  const [failure, setFailure] = useState<AuthFailure | null>(null);
  // Guards a second prompt while a browser tab is already open (a double tap on Sign in).
  const signingIn = useRef(false);

  useEffect(() => {
    const unsubscribe = manager.subscribe(setStatus);
    void manager.restore().then(setStatus);
    return unsubscribe;
  }, [manager]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      config: resolvedConfig,
      failure,
      async signIn(firstScreen) {
        if (signingIn.current) return;
        signingIn.current = true;
        setFailure(null);
        try {
          const outcome = await oidc.signIn(firstScreen);
          if (outcome.kind === 'signedIn') await manager.adopt(outcome.session);
          else if (outcome.kind === 'failed') setFailure('signInFailed');
        } catch {
          setFailure('signInFailed');
        } finally {
          signingIn.current = false;
        }
      },
      async signOut(beforeEndSession) {
        const idToken = manager.idToken;
        try {
          await beforeEndSession?.();
        } catch {
          // Cleanup never blocks a sign-out.
        }
        // Local state goes first and unconditionally: this device must not keep holding tokens.
        await manager.signOut();
        try {
          await oidc.endSession(idToken);
        } catch {
          // Already signed out locally; a failed end-session leaves only the provider's browser session.
        }
      },
      getAccessToken: () => manager.getAccessToken(),
      onAuthRequired: (reason) => manager.handleAuthRequired(reason),
    }),
    [failure, manager, oidc, resolvedConfig, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (value === null) throw new Error('useAuth must be used inside an AuthProvider');
  return value;
}
