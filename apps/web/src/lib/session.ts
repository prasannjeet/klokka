// Who is asking, on the server. With Logto: the encrypted session cookie (no network for the check). With
// the development fake session: always signed in, as the persona in the dev cookie.
import { cookies, headers } from 'next/headers';
import { getAccessToken, getAccessTokenRSC, getLogtoContext } from '@logto/next/server-actions';
import { createApi, type KlokkaApi } from '@klokka/api-client';
import { apiBaseUrl, fakeSessionEnabled } from './env';
import { apiResource, logtoConfig } from './logto';
import { PERSONA_COOKIE, personaFrom, rewriteForPersona, type Persona } from './dev-persona';

export const FAKE_TOKEN = 'dev-fake-session';

export async function isSignedIn(): Promise<boolean> {
  if (fakeSessionEnabled()) return true;
  const context = await getLogtoContext(logtoConfig());
  return context.isAuthenticated;
}

export async function devPersona(): Promise<Persona | null> {
  if (!fakeSessionEnabled()) return null;
  return personaFrom((await cookies()).get(PERSONA_COOKIE)?.value);
}

// For route handlers: a refreshed token is written back to the session cookie.
export async function routeToken(): Promise<string | null> {
  if (fakeSessionEnabled()) return FAKE_TOKEN;
  const config = logtoConfig();
  const context = await getLogtoContext(config);
  if (!context.isAuthenticated) return null;
  return getAccessToken(config, apiResource());
}

// For server components: a refresh here is not persisted (cookies are read-only while rendering), the
// next BFF call refreshes and stores it.
async function rscToken(): Promise<string> {
  if (fakeSessionEnabled()) return FAKE_TOKEN;
  return getAccessTokenRSC(logtoConfig(), apiResource());
}

function pathOf(url: string, base: string): string {
  const basePath = new URL(base).pathname.replace(/\/+$/, '');
  return new URL(url).pathname.slice(basePath.length).replace(/^\/+/, '');
}

// The API client for server components, calling the API directly (not through the BFF) with the user's
// token. `authenticated: false` gives the public client for the invitation lookup.
export async function serverApi(
  options: { authenticated: boolean } = { authenticated: true },
): Promise<KlokkaApi> {
  const base = apiBaseUrl();
  const acceptLanguage = (await headers()).get('accept-language');
  const persona = options.authenticated ? await devPersona() : null;
  const fetchApi: typeof fetch = async (input, init) => {
    const response = await fetch(input, { ...init, cache: 'no-store' });
    if (!persona || !response.ok || !(response.headers.get('content-type') ?? '').includes('json'))
      return response;
    const body = rewriteForPersona(persona, pathOf(String(input), base), await response.json());
    return new Response(JSON.stringify(body), { status: response.status, headers: response.headers });
  };
  return createApi({
    basePath: base,
    fetchApi,
    ...(options.authenticated ? { accessToken: async () => rscToken() } : {}),
    ...(acceptLanguage ? { headers: { 'accept-language': acceptLanguage } } : {}),
  });
}
