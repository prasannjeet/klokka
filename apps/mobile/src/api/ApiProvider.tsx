import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { createApi, type KlokkaApi } from '@klokka/api-client';
import { appConfig } from '@/config';
import { createAuthenticatedFetch, NotAuthenticatedError, useAuth } from '@/auth';

// ONE createApi configuration for the whole app (docs/DECISIONS.md D1: one token, no organization
// tokens): the generated client sets the bearer from `accessToken`, and the authenticated fetch
// owns the 401 refresh-and-replay rule the generated client has no notion of.
const ApiContext = createContext<KlokkaApi | null>(null);

export function ApiProvider({ children, api }: { children: ReactNode; api?: KlokkaApi }) {
  const auth = useAuth();
  const value = useMemo(() => {
    if (api) return api;
    return createApi({
      basePath: appConfig().apiBaseUrl,
      accessToken: async () => {
        const token = await auth.getAccessToken();
        // No honest token to hand over when signed out: fail loudly rather than go unauthenticated.
        if (token === null) throw new NotAuthenticatedError('no-session');
        return token;
      },
      fetchApi: createAuthenticatedFetch({
        getAccessToken: auth.getAccessToken,
        onAuthRequired: auth.onAuthRequired,
      }),
    });
  }, [api, auth]);
  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export function useApi(): KlokkaApi {
  const api = useContext(ApiContext);
  if (api === null) throw new Error('useApi must be used inside an ApiProvider');
  return api;
}
