import type { AuthRequiredReason } from './sessionManager';
import { NotAuthenticatedError } from './sessionManager';

export type FetchLike = typeof fetch;

export interface AuthenticatedFetchDeps {
  // A usable access token, refreshed first if the current one is expired. Null means no session.
  getAccessToken: () => Promise<string | null>;
  // One silent refresh attempt. True when a fresh token is available and the request may be retried.
  onAuthRequired: (reason: AuthRequiredReason) => Promise<boolean>;
  fetchImpl?: FetchLike;
}

const UNAUTHORIZED = 401;

// The bearer transport for every API call: the ONLY place a token becomes an Authorization header.
//   - no session at all           -> NotAuthenticatedError, nothing is sent
//   - 401 and refresh succeeds    -> the request is replayed ONCE with the new token
//   - 401 and refresh fails       -> the original 401 is returned (the UI is on its way to sign-in)
//   - any other status            -> returned untouched, never retried
export function createAuthenticatedFetch(deps: AuthenticatedFetchDeps): FetchLike {
  const doFetch = deps.fetchImpl ?? fetch;

  const withBearer = (init: RequestInit | undefined, token: string): RequestInit => {
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return { ...init, headers };
  };

  return async (input, init) => {
    const token = await deps.getAccessToken();
    if (token === null) {
      await deps.onAuthRequired('no-session');
      throw new NotAuthenticatedError('no-session');
    }
    const response = await doFetch(input, withBearer(init, token));
    if (response.status !== UNAUTHORIZED) return response;

    const refreshed = await deps.onAuthRequired('http-401');
    if (!refreshed) return response;
    const retryToken = await deps.getAccessToken();
    if (retryToken === null) return response;
    return doFetch(input, withBearer(init, retryToken));
  };
}
