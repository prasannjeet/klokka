import type { StoredSession, TokenStorage } from './tokenStorage';

export type AuthStatus = 'restoring' | 'signedOut' | 'signedIn';

export type AuthRequiredReason = 'no-session' | 'http-401' | 'expired';

export class NotAuthenticatedError extends Error {
  readonly reason: AuthRequiredReason;
  constructor(reason: AuthRequiredReason) {
    super(`no valid session (${reason})`);
    this.name = 'NotAuthenticatedError';
    this.reason = reason;
  }
}

export interface SessionManagerDeps {
  storage: TokenStorage;
  // Exchanges a refresh token for a fresh session. Rejects when the provider refuses it.
  refreshTokens: (refreshToken: string) => Promise<StoredSession>;
  now: () => number;
  // How long before real expiry a token counts as expired (clock skew plus the request's round trip).
  expiryLeewayMs?: number;
}

const DEFAULT_EXPIRY_LEEWAY_MS = 60_000;

// The session brain: knows nothing about React, expo-auth-session or the network. Everything it
// does is driven through injected ports, which makes the refresh and 401 rules testable.
export class SessionManager {
  private readonly deps: SessionManagerDeps;
  private readonly leeway: number;
  private readonly listeners = new Set<(status: AuthStatus) => void>();
  private session: StoredSession | null = null;
  private currentStatus: AuthStatus = 'restoring';
  // Single-flight guard: every concurrent caller shares ONE refresh. Logto rotates the refresh token
  // on every use and revokes the grant when a consumed one is replayed, so two parallel refreshes
  // would sign the user out (docs/research/mobile.md section 2).
  private inFlightRefresh: Promise<StoredSession | null> | null = null;

  constructor(deps: SessionManagerDeps) {
    this.deps = deps;
    this.leeway = deps.expiryLeewayMs ?? DEFAULT_EXPIRY_LEEWAY_MS;
  }

  get status(): AuthStatus {
    return this.currentStatus;
  }

  get idToken(): string | undefined {
    return this.session?.idToken;
  }

  subscribe(listener: (status: AuthStatus) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setStatus(status: AuthStatus): void {
    if (this.currentStatus === status) return;
    this.currentStatus = status;
    for (const listener of this.listeners) listener(status);
  }

  // Cold start: load whatever the secure store holds. An expired access token is NOT a signed-out
  // user as long as a refresh token is present; the refresh happens lazily on the first use.
  async restore(): Promise<AuthStatus> {
    const stored = await this.deps.storage.read();
    if (stored === null) {
      this.session = null;
      this.setStatus('signedOut');
      return this.currentStatus;
    }
    this.session = stored;
    if (this.isExpired(stored) && stored.refreshToken === undefined) {
      await this.signOut();
      return this.currentStatus;
    }
    this.setStatus('signedIn');
    return this.currentStatus;
  }

  async adopt(session: StoredSession): Promise<void> {
    this.session = session;
    await this.deps.storage.write(session);
    this.setStatus('signedIn');
  }

  async signOut(): Promise<void> {
    this.session = null;
    this.inFlightRefresh = null;
    await this.deps.storage.clear();
    this.setStatus('signedOut');
  }

  private isExpired(session: StoredSession): boolean {
    return session.expiresAt - this.leeway <= this.deps.now();
  }

  // The one way to obtain a bearer token. Refreshes silently when the current one is expired or
  // about to be, and signs out when the refresh is refused.
  async getAccessToken(): Promise<string | null> {
    const session = this.session;
    if (session === null) return null;
    if (!this.isExpired(session)) return session.accessToken;
    const refreshed = await this.refresh();
    return refreshed?.accessToken ?? null;
  }

  // Called when the API rejects the credential (401). Exactly ONE silent refresh is attempted; if it
  // fails the session is dropped and the UI routes to sign-in. True means the caller may retry.
  async handleAuthRequired(_reason: AuthRequiredReason): Promise<boolean> {
    if (this.session === null) {
      if (this.currentStatus !== 'signedOut') await this.signOut();
      return false;
    }
    const refreshed = await this.refresh();
    return refreshed !== null;
  }

  private async refresh(): Promise<StoredSession | null> {
    if (this.inFlightRefresh !== null) return this.inFlightRefresh;
    const refreshToken = this.session?.refreshToken;
    if (refreshToken === undefined) {
      await this.signOut();
      return null;
    }
    const attempt = (async (): Promise<StoredSession | null> => {
      try {
        const next = await this.deps.refreshTokens(refreshToken);
        this.session = next;
        // The rotated refresh token is persisted before the next grant can run.
        await this.deps.storage.write(next);
        this.setStatus('signedIn');
        return next;
      } catch {
        // Rotation is on: a refused refresh token is dead, so there is nothing left to retry with.
        await this.signOut();
        return null;
      } finally {
        this.inFlightRefresh = null;
      }
    })();
    this.inFlightRefresh = attempt;
    return attempt;
  }
}
