import * as SecureStore from 'expo-secure-store';

// The persisted half of a session. Tokens live ONLY here, in the platform secure store (Android
// Keystore / iOS Keychain), never in AsyncStorage.
export interface StoredSession {
  accessToken: string;
  // Absent when the provider issued no refresh token; the session then simply expires.
  refreshToken?: string;
  // Kept for the end-session request (id_token_hint) and the profile fallback, not for authorization.
  idToken?: string;
  // Absolute expiry of the ACCESS token, epoch milliseconds.
  expiresAt: number;
  tokenType: string;
}

export interface TokenStorage {
  read(): Promise<StoredSession | null>;
  write(session: StoredSession): Promise<void>;
  clear(): Promise<void>;
}

// Versioned so a future shape change rolls forward under a new key.
export const SESSION_STORAGE_KEY = 'klokka.session.v1';

export class StoredSessionCorruptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StoredSessionCorruptError';
  }
}

function requireString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  if (typeof value !== 'string' || value === '') {
    throw new StoredSessionCorruptError(`stored session field '${key}' is not a non-empty string`);
  }
  return value;
}

function optionalString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw new StoredSessionCorruptError(
      `stored session field '${key}' must be a string, got ${typeof value}`,
    );
  }
  return value;
}

export function parseStoredSession(raw: string): StoredSession {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    throw new StoredSessionCorruptError(`stored session is not valid JSON: ${(cause as Error).message}`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new StoredSessionCorruptError('stored session is not a JSON object');
  }
  const source = parsed as Record<string, unknown>;
  const expiresAt = source['expiresAt'];
  if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)) {
    throw new StoredSessionCorruptError("stored session field 'expiresAt' is not a finite number");
  }
  const session: StoredSession = {
    accessToken: requireString(source, 'accessToken'),
    expiresAt,
    tokenType: requireString(source, 'tokenType'),
  };
  const refreshToken = optionalString(source, 'refreshToken');
  if (refreshToken !== undefined) session.refreshToken = refreshToken;
  const idToken = optionalString(source, 'idToken');
  if (idToken !== undefined) session.idToken = idToken;
  return session;
}

// Everything under ONE key: an access token without its matching refresh token is a state the rest
// of the app never has to reason about.
export function createSecureTokenStorage(): TokenStorage {
  return {
    async read() {
      const raw = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
      if (raw === null) return null;
      try {
        return parseStoredSession(raw);
      } catch (error) {
        if (error instanceof StoredSessionCorruptError) {
          await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
          return null;
        }
        throw error;
      }
    },
    async write(session) {
      await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(session));
    },
    async clear() {
      await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
    },
  };
}
