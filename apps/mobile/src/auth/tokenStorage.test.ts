import { secureStore } from '@/testing/nativeMocks';
import {
  SESSION_STORAGE_KEY,
  StoredSessionCorruptError,
  createSecureTokenStorage,
  parseStoredSession,
} from './tokenStorage';

describe('token storage', () => {
  beforeEach(() => secureStore.clear());

  it('parses a stored session and rejects a malformed one with a typed error', () => {
    expect(
      parseStoredSession('{"accessToken":"a","refreshToken":"r","expiresAt":5,"tokenType":"Bearer"}'),
    ).toEqual({
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: 5,
      tokenType: 'Bearer',
    });
    expect(() => parseStoredSession('nope')).toThrow(StoredSessionCorruptError);
    expect(() => parseStoredSession('{"accessToken":"","expiresAt":5,"tokenType":"Bearer"}')).toThrow(
      /accessToken/,
    );
    expect(() => parseStoredSession('{"accessToken":"a","expiresAt":"5","tokenType":"Bearer"}')).toThrow(
      /expiresAt/,
    );
  });

  it('writes under one versioned key and drops a corrupt blob on read', async () => {
    const storage = createSecureTokenStorage();
    await storage.write({ accessToken: 'a', expiresAt: 1, tokenType: 'Bearer' });
    expect(secureStore.has(SESSION_STORAGE_KEY)).toBe(true);
    expect(await storage.read()).toEqual({ accessToken: 'a', expiresAt: 1, tokenType: 'Bearer' });
    secureStore.set(SESSION_STORAGE_KEY, '{broken');
    expect(await storage.read()).toBeNull();
    expect(secureStore.has(SESSION_STORAGE_KEY)).toBe(false);
  });
});
