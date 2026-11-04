import { afterEach, describe, expect, it, vi } from 'vitest';
import { MissingEnvError, apiBaseUrl, fakeSessionEnabled, serverEnv, umami } from './env';

afterEach(() => vi.unstubAllEnvs());

const full = {
  KLOKKA_API_BASE_URL: 'http://localhost:4010/',
  KLOKKA_API_RESOURCE: 'https://api.klokka.app',
  LOGTO_ENDPOINT: 'https://logto.test/',
  LOGTO_APP_ID: 'app',
  LOGTO_APP_SECRET: 'secret',
  LOGTO_BASE_URL: 'http://192.168.0.16:3000',
  LOGTO_COOKIE_SECRET: 'x'.repeat(32),
};

describe('serverEnv', () => {
  it('reads every value at call time and trims trailing slashes', () => {
    for (const [k, v] of Object.entries(full)) vi.stubEnv(k, v);
    const env = serverEnv();
    expect(env.apiBaseUrl).toBe('http://localhost:4010');
    expect(env.logtoEndpoint).toBe('https://logto.test');
    expect(env.androidApkUrl).toBeNull();
  });

  it('names the missing variable instead of guessing a default', () => {
    for (const [k, v] of Object.entries(full)) vi.stubEnv(k, v);
    vi.stubEnv('LOGTO_APP_SECRET', '');
    expect(() => serverEnv()).toThrowError(new MissingEnvError('LOGTO_APP_SECRET'));
  });

  it('rejects a short cookie secret', () => {
    for (const [k, v] of Object.entries(full)) vi.stubEnv(k, v);
    vi.stubEnv('LOGTO_COOKIE_SECRET', 'short');
    expect(() => serverEnv()).toThrow(/32 characters/);
  });

  it('apiBaseUrl needs only the API variable', () => {
    vi.stubEnv('KLOKKA_API_BASE_URL', 'https://klokka-api.coolify.ooguy.com/v1/');
    expect(apiBaseUrl()).toBe('https://klokka-api.coolify.ooguy.com/v1');
  });
});

describe('fakeSessionEnabled', () => {
  it('is never on in production, whatever the flag says', () => {
    vi.stubEnv('KLOKKA_DEV_FAKE_SESSION', '1');
    vi.stubEnv('NODE_ENV', 'production');
    expect(fakeSessionEnabled()).toBe(false);
    vi.stubEnv('NODE_ENV', 'development');
    expect(fakeSessionEnabled()).toBe(true);
  });
});

describe('umami', () => {
  const ID = 'f0b48f6b-5703-4c05-97d9-956552a2b262';

  it('is null when neither variable is set: no tracking', () => {
    vi.stubEnv('KLOKKA_UMAMI_URL', '');
    vi.stubEnv('KLOKKA_UMAMI_WEBSITE_ID', '');
    expect(umami()).toBeNull();
  });

  it('reads the pair and trims the URL', () => {
    vi.stubEnv('KLOKKA_UMAMI_URL', 'https://umami.example.se/');
    vi.stubEnv('KLOKKA_UMAMI_WEBSITE_ID', ID);
    expect(umami()).toEqual({ url: 'https://umami.example.se', websiteId: ID });
  });

  it('names the missing half and rejects a malformed value', () => {
    vi.stubEnv('KLOKKA_UMAMI_URL', 'https://umami.example.se');
    vi.stubEnv('KLOKKA_UMAMI_WEBSITE_ID', '');
    expect(() => umami()).toThrowError(new MissingEnvError('KLOKKA_UMAMI_WEBSITE_ID'));
    vi.stubEnv('KLOKKA_UMAMI_WEBSITE_ID', 'abc');
    expect(() => umami()).toThrowError(/UUID/);
    vi.stubEnv('KLOKKA_UMAMI_URL', 'umami.example.se');
    vi.stubEnv('KLOKKA_UMAMI_WEBSITE_ID', ID);
    expect(() => umami()).toThrowError(/http\(s\) URL/);
  });
});
