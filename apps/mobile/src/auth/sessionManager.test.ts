import { SessionManager } from './sessionManager';
import type { StoredSession, TokenStorage } from './tokenStorage';

function memoryStorage(initial: StoredSession | null = null) {
  let value = initial;
  const writes: StoredSession[] = [];
  const storage: TokenStorage = {
    read: async () => value,
    write: async (session) => {
      value = session;
      writes.push(session);
    },
    clear: async () => {
      value = null;
    },
  };
  return { storage, writes, current: () => value };
}

const session = (overrides: Partial<StoredSession> = {}): StoredSession => ({
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  idToken: 'id-1',
  expiresAt: 10_000_000,
  tokenType: 'Bearer',
  ...overrides,
});

describe('SessionManager', () => {
  it('restores a stored session and hands out the access token while it is valid', async () => {
    const { storage } = memoryStorage(session());
    const manager = new SessionManager({ storage, refreshTokens: jest.fn(), now: () => 1_000 });
    expect(await manager.restore()).toBe('signedIn');
    expect(await manager.getAccessToken()).toBe('access-1');
  });

  it('is signed out when nothing is stored, or when the token expired with no refresh token', async () => {
    const empty = new SessionManager({
      storage: memoryStorage().storage,
      refreshTokens: jest.fn(),
      now: () => 0,
    });
    expect(await empty.restore()).toBe('signedOut');
    const stale = new SessionManager({
      storage: memoryStorage(session({ refreshToken: undefined, expiresAt: 1 })).storage,
      refreshTokens: jest.fn(),
      now: () => 1_000_000,
    });
    expect(await stale.restore()).toBe('signedOut');
  });

  it('refreshes ONCE for concurrent callers and persists the rotated token before answering', async () => {
    const { storage, writes } = memoryStorage(session({ expiresAt: 1 }));
    let resolveRefresh: (s: StoredSession) => void = () => undefined;
    const refreshTokens = jest
      .fn<Promise<StoredSession>, [string]>()
      .mockImplementationOnce(
        () =>
          new Promise<StoredSession>((resolve) => {
            resolveRefresh = resolve;
          }),
      )
      .mockResolvedValue(
        session({ accessToken: 'access-3', refreshToken: 'refresh-3', expiresAt: 90_000_000 }),
      );
    const manager = new SessionManager({ storage, refreshTokens, now: () => 1_000_000 });
    await manager.restore();
    const a = manager.getAccessToken();
    const b = manager.getAccessToken();
    const c = manager.handleAuthRequired('http-401');
    expect(refreshTokens).toHaveBeenCalledTimes(1);
    expect(refreshTokens).toHaveBeenCalledWith('refresh-1');
    resolveRefresh(session({ accessToken: 'access-2', refreshToken: 'refresh-2', expiresAt: 9_000_000 }));
    expect(await a).toBe('access-2');
    expect(await b).toBe('access-2');
    expect(await c).toBe(true);
    expect(writes.map((w) => w.refreshToken)).toEqual(['refresh-2']);
    // A later expiry starts a NEW single flight with the rotated token.
    const later = new SessionManager({ storage, refreshTokens, now: () => 10_000_000 });
    await later.restore();
    expect(await later.getAccessToken()).toBe('access-3');
    expect(refreshTokens).toHaveBeenLastCalledWith('refresh-2');
  });

  it('signs out when the refresh is refused (rotation: a dead token cannot be retried)', async () => {
    const { storage, current } = memoryStorage(session({ expiresAt: 1 }));
    const statuses: string[] = [];
    const manager = new SessionManager({
      storage,
      refreshTokens: jest.fn(async () => {
        throw new Error('invalid_grant');
      }),
      now: () => 1_000_000,
    });
    manager.subscribe((s) => statuses.push(s));
    await manager.restore();
    expect(await manager.getAccessToken()).toBeNull();
    expect(manager.status).toBe('signedOut');
    expect(current()).toBeNull();
    expect(statuses).toEqual(['signedIn', 'signedOut']);
  });

  it('treats expiry within the leeway as expired', async () => {
    const refreshTokens = jest.fn(async () => session({ accessToken: 'access-2', expiresAt: 5_000_000 }));
    const manager = new SessionManager({
      storage: memoryStorage(session({ expiresAt: 1_030_000 })).storage,
      refreshTokens,
      now: () => 1_000_000,
      expiryLeewayMs: 60_000,
    });
    await manager.restore();
    expect(await manager.getAccessToken()).toBe('access-2');
    expect(refreshTokens).toHaveBeenCalledTimes(1);
  });
});
