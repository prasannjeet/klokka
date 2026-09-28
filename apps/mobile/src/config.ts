// The four runtime values the app needs, read from `EXPO_PUBLIC_*` variables that Metro inlines at
// bundle time (docs/research/mobile.md section 1): a JS reload picks up a change, a release bakes the
// values of the process that bundled it. They are PUBLIC client configuration, never secrets: a
// Logto Native app is a public PKCE client with no client secret.
//
// Each variable is referenced by its full literal name below; Metro only inlines
// `process.env.EXPO_PUBLIC_<NAME>` when it appears verbatim, so no loop over names.

export interface AppConfig {
  // Where the contract's paths are called: `https://klokka-api.coolify.ooguy.com/v1` for the real API,
  // `http://192.168.0.16:4011` for the Prism mock (which serves the paths without /v1).
  apiBaseUrl: string;
  // Logto's endpoint; the OIDC issuer is `<endpoint>/oidc`.
  logtoEndpoint: string;
  issuer: string;
  clientId: string;
  // The API resource indicator. It rides the authorize request, the code exchange and every refresh
  // as `resource`; without it Logto issues an opaque token the API rejects (docs/INFRA.md section 4).
  apiResource: string;
}

export class AppConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppConfigError';
  }
}

export interface RawConfig {
  EXPO_PUBLIC_API_BASE_URL?: string | undefined;
  EXPO_PUBLIC_LOGTO_ENDPOINT?: string | undefined;
  EXPO_PUBLIC_LOGTO_APP_ID?: string | undefined;
  EXPO_PUBLIC_LOGTO_API_RESOURCE?: string | undefined;
}

function required(raw: RawConfig, key: keyof RawConfig): string {
  const value = raw[key];
  if (value === undefined || value.trim() === '') {
    throw new AppConfigError(
      `${key} is not set. Put it in apps/mobile/.env (see .env.example) and restart Metro; a phone cannot reach localhost, so there is no default.`,
    );
  }
  return value.trim();
}

function requireUrl(raw: RawConfig, key: keyof RawConfig): string {
  const value = required(raw, key);
  if (!/^https?:\/\//.test(value)) throw new AppConfigError(`${key} must be an http(s) URL, got "${value}"`);
  return value.replace(/\/+$/, '');
}

// Pure so the fail-fast rules are pinned by tests.
export function resolveAppConfig(raw: RawConfig): AppConfig {
  const logtoEndpoint = requireUrl(raw, 'EXPO_PUBLIC_LOGTO_ENDPOINT');
  return {
    apiBaseUrl: requireUrl(raw, 'EXPO_PUBLIC_API_BASE_URL'),
    logtoEndpoint,
    issuer: `${logtoEndpoint}/oidc`,
    clientId: required(raw, 'EXPO_PUBLIC_LOGTO_APP_ID'),
    apiResource: required(raw, 'EXPO_PUBLIC_LOGTO_API_RESOURCE'),
  };
}

let cached: AppConfig | null = null;

export function appConfig(): AppConfig {
  if (cached === null) {
    cached = resolveAppConfig({
      EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
      EXPO_PUBLIC_LOGTO_ENDPOINT: process.env.EXPO_PUBLIC_LOGTO_ENDPOINT,
      EXPO_PUBLIC_LOGTO_APP_ID: process.env.EXPO_PUBLIC_LOGTO_APP_ID,
      EXPO_PUBLIC_LOGTO_API_RESOURCE: process.env.EXPO_PUBLIC_LOGTO_API_RESOURCE,
    });
  }
  return cached;
}
