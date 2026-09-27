import { describe, expect, it } from 'vitest';
import { createApi, problemCodeOf, ResponseError } from '../src/index.ts';

// A fetch stub that records the request and answers with the canned body.
function fakeFetch(status: number, body: unknown, contentType = 'application/json') {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchApi = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    calls.push({ url: String(input), init: init ?? {} });
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': contentType } });
  };
  return { fetchApi, calls };
}

const me = {
  user: {
    id: 'usr_maria',
    email: 'maria.lind@example.com',
    name: 'Maria Lind',
    createdAt: '2026-05-12T09:30:00Z',
  },
  preferences: { language: 'sv', pushEnabled: true, digestEnabled: false, theme: 'SYSTEM' },
  workspaces: [],
  platformAdmin: false,
  pushTokenRegistered: true,
};

describe('createApi', () => {
  it('calls the contract path under basePath with the bearer token', async () => {
    const { fetchApi, calls } = fakeFetch(200, me);
    const api = createApi({ basePath: 'http://api.test/v1/', fetchApi, accessToken: async () => 'tok' });
    const result = await api.me.getMe();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('http://api.test/v1/me');
    expect(new Headers(calls[0]?.init.headers).get('authorization')).toBe('Bearer tok');
    expect(result.user.id).toBe('usr_maria');
    expect(result.user.createdAt).toBeInstanceOf(Date);
  });

  it('sends no Authorization header when no token is configured (the web BFF adds it)', async () => {
    const { fetchApi, calls } = fakeFetch(200, me);
    const api = createApi({ basePath: '/api/k', fetchApi });
    await api.me.getMe();
    expect(new Headers(calls[0]?.init.headers).has('authorization')).toBe(false);
  });

  it('serialises a batch write to POST /workspaces/{id}/entries/batch', async () => {
    const { fetchApi, calls } = fakeFetch(200, { saved: [], removed: [], membersNotified: 0 });
    const api = createApi({ basePath: 'http://api.test/v1', fetchApi });
    await api.entries.batchUpsertEntries({
      workspaceId: '2b1f7e0a-4c8d-4d5e-9a6b-3c2d1e0f9a8b',
      entryBatchRequest: {
        items: [
          {
            membershipId: '5f1d2a3c-9b7e-4c1a-8d2f-6e4b1a0c9d21',
            workDate: new Date(2026, 8, 22),
            hours: null,
          },
        ],
      },
    });
    expect(calls[0]?.url).toBe(
      'http://api.test/v1/workspaces/2b1f7e0a-4c8d-4d5e-9a6b-3c2d1e0f9a8b/entries/batch',
    );
    expect(calls[0]?.init.method).toBe('POST');
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({
      items: [{ membershipId: '5f1d2a3c-9b7e-4c1a-8d2f-6e4b1a0c9d21', workDate: '2026-09-22', hours: null }],
    });
  });

  it('throws a ResponseError whose problem code is readable', async () => {
    const problem = { type: 'about:blank', title: 'Conflict', status: 409, code: 'MONTH_LOCKED' };
    const { fetchApi } = fakeFetch(409, problem, 'application/problem+json');
    const api = createApi({ basePath: 'http://api.test/v1', fetchApi });
    const failure = await api.months
      .lockMonth({ workspaceId: '2b1f7e0a-4c8d-4d5e-9a6b-3c2d1e0f9a8b', month: '2026-09' })
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ResponseError);
    expect(await problemCodeOf((failure as ResponseError).response)).toBe('MONTH_LOCKED');
  });

  it('exposes every tag group of the contract', () => {
    const api = createApi({ basePath: 'http://api.test/v1' });
    for (const key of [
      'me',
      'workspaces',
      'members',
      'invitations',
      'entries',
      'months',
      'insights',
      'flags',
      'notifications',
      'operator',
      'webhooks',
    ] as const) {
      expect(api[key]).toBeDefined();
    }
  });
});
