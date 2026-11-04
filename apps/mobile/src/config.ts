// The runtime values the app needs (four required, the Umami pair optional), read from `EXPO_PUBLIC_*` variables that Metro inlines at
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
  // Umami (CHQ-201): where usage hits go. Optional as a pair: both set, or neither and the app sends nothing.
  analytics: AnalyticsTarget | null;
}

export interface AnalyticsTarget {
  url: string;
  websiteId: string;
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
  EXPO_PUBLIC_UMAMI_URL?: string | undefined;
  EXPO_PUBLIC_UMAMI_WEBSITE_ID?: string | undefined;
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Absent may default (no analytics); half a pair or a malformed value is a misconfiguration and fails fast.
function resolveAnalytics(raw: RawConfig): AnalyticsTarget | null {
  const url = raw.EXPO_PUBLIC_UMAMI_URL?.trim();
  const websiteId = raw.EXPO_PUBLIC_UMAMI_WEBSITE_ID?.trim();
  if (!url && !websiteId) return null;
  if (!url || !websiteId) {
    throw new AppConfigError(
      'EXPO_PUBLIC_UMAMI_URL and EXPO_PUBLIC_UMAMI_WEBSITE_ID go together: set both or neither.',
    );
  }
  if (!UUID.test(websiteId)) {
    throw new AppConfigError(
      `EXPO_PUBLIC_UMAMI_WEBSITE_ID must be an Umami website id (a UUID), got "${websiteId}"`,
    );
  }
  return { url: requireUrl(raw, 'EXPO_PUBLIC_UMAMI_URL'), websiteId };
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
    analytics: resolveAnalytics(raw),
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
      EXPO_PUBLIC_UMAMI_URL: process.env.EXPO_PUBLIC_UMAMI_URL,
      EXPO_PUBLIC_UMAMI_WEBSITE_ID: process.env.EXPO_PUBLIC_UMAMI_WEBSITE_ID,
    });
  }
  return cached;
}
