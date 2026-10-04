/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import type { KlokkaApi, Me } from '@klokka/api-client';
import { ApiProvider } from '@/api/ApiProvider';
import { AuthProvider, type OidcClient, type StoredSession, type TokenStorage } from '@/auth';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import { ThemeProvider } from '@/theme';
import { ToastProvider } from '@/ui';

const metrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

// A fake generated client: every method answers from `answers` (a function or a value) and records
// its calls, so a screen test can assert exactly which operation was called with what.
export type FakeApi = KlokkaApi & { calls: { group: string; op: string; args: unknown[] }[] };

export function fakeApi(answers: Record<string, unknown> = {}): FakeApi {
  const calls: FakeApi['calls'] = [];
  const group = (name: string) =>
    new Proxy(
      {},
      {
        get: (_target, op: string) => {
          if (op === 'then') return undefined;
          return async (...args: unknown[]) => {
            calls.push({ group: name, op, args });
            const key = `${name}.${op}`;
            const answer = answers[key] ?? answers[op];
            if (answer instanceof Error) throw answer;
            if (typeof answer === 'function') return (answer as (...a: unknown[]) => unknown)(...args);
            return answer;
          };
        },
      },
    );
  return {
    calls,
    configuration: {} as any,
    me: group('me') as any,
    workspaces: group('workspaces') as any,
    members: group('members') as any,
    invitations: group('invitations') as any,
    entries: group('entries') as any,
    jobs: group('jobs') as any,
    places: group('places') as any,
    months: group('months') as any,
    insights: group('insights') as any,
    flags: group('flags') as any,
    notifications: group('notifications') as any,
    operator: group('operator') as any,
    webhooks: group('webhooks') as any,
  };
}

export const signedInSession: StoredSession = {
  accessToken: 'access',
  refreshToken: 'refresh',
  idToken: 'id',
  expiresAt: Date.now() + 3_600_000,
  tokenType: 'Bearer',
};

export function memoryTokenStorage(initial: StoredSession | null = signedInSession): TokenStorage {
  let value = initial;
  return {
    read: async () => value,
    write: async (session) => {
      value = session;
    },
    clear: async () => {
      value = null;
    },
  };
}

export function fakeOidc(overrides: Partial<OidcClient> = {}): OidcClient {
  return {
    discovery: async () => ({}),
    signIn: async () => ({ kind: 'signedIn', session: signedInSession }),
    refresh: async () => signedInSession,
    endSession: async () => undefined,
    ...overrides,
  };
}

export const authConfigFixture = {
  issuer: 'https://logto.test/oidc',
  clientId: 'test-client',
  audience: 'https://api.klokka.app',
  redirectUri: 'klokka://auth/callback',
  postLogoutRedirectUri: 'klokka://auth/logout',
  scopes: ['openid', 'profile', 'email', 'offline_access'],
};

export const meFixture: Me = {
  user: {
    id: 'usr_maria',
    email: 'maria.lind@example.com',
    name: 'Maria Lind',
    avatarEmoji: null,
    createdAt: new Date('2026-05-12T09:30:00Z'),
  },
  preferences: {
    language: 'en',
    pushEnabled: true,
    digestEnabled: false,
    theme: 'SYSTEM',
    jobReminders: true,
    jobReminderLead: 'HOUR_1',
  },
  workspaces: [
    {
      workspaceId: 'ws-cafe',
      membershipId: 'mem-maria',
      name: 'Café Nord',
      slug: 'cafe-nord',
      colour: 'BLUE',
      emoji: '☕',
      role: 'EMPLOYEE',
      memberStatus: 'ACTIVE',
      showPay: true,
      currency: 'SEK',
      timezone: 'Europe/Stockholm',
      weekStart: 'MONDAY',
      rounding: 'NONE',
      defaultDayHours: 8,
      memberCount: 5,
      employerName: 'Nora Lind',
      hoursThisMonth: 92.5,
      notifyFlagDeclined: true,
      employeesSeeInsights: true,
      unreadNotifications: 2,
    },
  ],
  platformAdmin: false,
  pushTokenRegistered: false,
};

export interface RenderAppOptions extends RenderOptions {
  api?: KlokkaApi;
  session?: StoredSession | null;
  oidc?: OidcClient;
  locale?: 'sv' | 'en';
  queryClient?: QueryClient;
}

export function testQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
}

// Renders a screen inside the same provider tree the app uses, with fakes for everything native.
// RNTL 14 renders asynchronously (React 19), so every caller awaits this.
export async function renderApp(ui: ReactElement, options: RenderAppOptions = {}) {
  const api = options.api ?? fakeApi();
  const client = options.queryClient ?? testQueryClient();
  const storage = memoryTokenStorage(options.session === undefined ? signedInSession : options.session);
  const oidc = options.oidc ?? fakeOidc();
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <SafeAreaProvider initialMetrics={metrics}>
        <ThemeProvider preference="DARK">
          <LocaleProvider preference={options.locale ?? 'en'}>
            <ToastProvider>
              <AuthProvider client={oidc} storage={storage} config={authConfigFixture}>
                <ApiProvider api={api}>
                  <QueryClientProvider client={client}>{children}</QueryClientProvider>
                </ApiProvider>
              </AuthProvider>
            </ToastProvider>
          </LocaleProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }
  const { api: _a, session: _s, oidc: _o, locale: _l, queryClient: _q, ...renderOptions } = options;
  const result = await render(ui, { wrapper: Wrapper, ...renderOptions });
  return { ...result, api, client };
}
