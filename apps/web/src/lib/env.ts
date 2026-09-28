// Runtime configuration, read from process.env at request time and never baked into the build, so one
// image runs on every environment (docs/research/web.md section 1). A missing required value fails the
// request that needs it with a message naming the variable; nothing falls back to a guessed default.

export interface ServerEnv {
  // The Klokka API including its prefix: `https://klokka-api.coolify.ooguy.com/v1` for the real API,
  // `http://localhost:4010` for the Prism mock (which serves the paths without `/v1`).
  apiBaseUrl: string;
  // The Logto API resource indicator (audience of the one access token, docs/DECISIONS.md D1).
  apiResource: string;
  logtoEndpoint: string;
  logtoAppId: string;
  logtoAppSecret: string;
  // Where this app is reached from the browser; Logto redirects back to `${baseUrl}/callback`.
  baseUrl: string;
  cookieSecret: string;
  // Optional: the signed APK the invite page offers. Unset hides the "Get the Android app" link.
  androidApkUrl: string | null;
}

export class MissingEnvError extends Error {
  constructor(readonly variable: string) {
    super(`Missing environment variable ${variable}`);
    this.name = 'MissingEnvError';
  }
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new MissingEnvError(name);
  return value;
}

function optional(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

const trimSlash = (url: string) => url.replace(/\/+$/, '');

export function apiBaseUrl(): string {
  return trimSlash(required('KLOKKA_API_BASE_URL'));
}

export function serverEnv(): ServerEnv {
  const cookieSecret = required('LOGTO_COOKIE_SECRET');
  if (cookieSecret.length < 32) {
    throw new Error('LOGTO_COOKIE_SECRET must be at least 32 characters');
  }
  return {
    apiBaseUrl: apiBaseUrl(),
    apiResource: required('KLOKKA_API_RESOURCE'),
    logtoEndpoint: trimSlash(required('LOGTO_ENDPOINT')),
    logtoAppId: required('LOGTO_APP_ID'),
    logtoAppSecret: required('LOGTO_APP_SECRET'),
    baseUrl: trimSlash(required('LOGTO_BASE_URL')),
    cookieSecret,
    androidApkUrl: optional('KLOKKA_ANDROID_APK_URL'),
  };
}

export function androidApkUrl(): string | null {
  return optional('KLOKKA_ANDROID_APK_URL');
}

// Development only: skip Logto and treat every request as signed in, so the UI can be driven against the
// Prism mock without an identity provider. Never active in a production build (`next build` + `next
// start` and the Docker image run with NODE_ENV=production).
export function fakeSessionEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.KLOKKA_DEV_FAKE_SESSION === '1';
}
