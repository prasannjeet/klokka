import { describe, expect, it } from 'vitest';
import { proxy, type BffDeps } from './bff';

interface Call {
  url: string;
  init: RequestInit;
}

function upstream(response: () => Response) {
  const calls: Call[] = [];
  const fetchStub = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return response();
  }) as typeof fetch;
  return { calls, fetchStub };
}

function deps(fetchStub: typeof fetch, token: string | null = 'tok', extra: Partial<BffDeps> = {}): BffDeps {
  return { baseUrl: 'http://api.test/v1', token: async () => token, fetch: fetchStub, ...extra };
}

const json = (body: unknown, status = 200, type = 'application/json') =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': type } });

describe('BFF proxy', () => {
  it('forwards to the API with the bearer token and the query string', async () => {
    const { calls, fetchStub } = upstream(() => json([{ id: 'e1' }]));
    const req = new Request('http://app.test/api/k/workspaces/w1/entries?from=2026-09-21&to=2026-09-27', {
      headers: { cookie: 'logtoCookies=secret', 'accept-language': 'sv-SE', 'x-evil': '1' },
    });
    const res = await proxy(req, ['workspaces', 'w1', 'entries'], deps(fetchStub));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 'e1' }]);
    expect(calls[0]?.url).toBe('http://api.test/v1/workspaces/w1/entries?from=2026-09-21&to=2026-09-27');
    const sent = new Headers(calls[0]?.init.headers);
    expect(sent.get('authorization')).toBe('Bearer tok');
    expect(sent.get('accept-language')).toBe('sv-SE');
    expect(sent.has('cookie')).toBe(false);
    expect(sent.has('x-evil')).toBe(false);
  });

  it('answers 401 UNAUTHENTICATED without calling the API when there is no session', async () => {
    const { calls, fetchStub } = upstream(() => json({}));
    const res = await proxy(new Request('http://app.test/api/k/me'), ['me'], deps(fetchStub, null));
    expect(res.status).toBe(401);
    expect(res.headers.get('content-type')).toContain('application/problem+json');
    expect((await res.json()).code).toBe('UNAUTHENTICATED');
    expect(calls).toHaveLength(0);
  });

  it('treats a failing token refresh as signed out', async () => {
    const { fetchStub } = upstream(() => json({}));
    const res = await proxy(new Request('http://app.test/api/k/me'), ['me'], {
      ...deps(fetchStub),
      token: async () => {
        throw new Error('refresh token expired');
      },
    });
    expect(res.status).toBe(401);
  });

  it('lets the public invitation lookup through without a token', async () => {
    const { calls, fetchStub } = upstream(() => json({ workspaceName: 'Café Nord' }));
    const res = await proxy(
      new Request('http://app.test/api/k/invitations/abc?lang=en'),
      ['invitations', 'abc'],
      deps(fetchStub, null),
    );
    expect(res.status).toBe(200);
    expect(calls[0]?.url).toBe('http://api.test/v1/invitations/abc?lang=en');
    expect(new Headers(calls[0]?.init.headers).has('authorization')).toBe(false);
  });

  it('still requires a session to accept an invitation', async () => {
    const { calls, fetchStub } = upstream(() => json({}));
    const req = new Request('http://app.test/api/k/invitations/abc/accept', { method: 'POST' });
    const res = await proxy(req, ['invitations', 'abc', 'accept'], deps(fetchStub, null));
    expect(res.status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it('forwards a JSON body and the method for writes', async () => {
    const { calls, fetchStub } = upstream(() => json({ saved: [], removed: [], membersNotified: 1 }));
    const body = JSON.stringify({ items: [{ membershipId: 'm1', workDate: '2026-09-23', hours: 6 }] });
    const req = new Request('http://app.test/api/k/workspaces/w1/entries/batch', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/json' },
    });
    const res = await proxy(req, ['workspaces', 'w1', 'entries', 'batch'], deps(fetchStub));
    expect(res.status).toBe(200);
    expect(calls[0]?.init.method).toBe('POST');
    expect(new TextDecoder().decode(calls[0]?.init.body as ArrayBuffer)).toBe(body);
    expect(new Headers(calls[0]?.init.headers).get('content-type')).toBe('application/json');
  });

  it('passes problems through unchanged so the client can read the code', async () => {
    const { fetchStub } = upstream(() =>
      json({ title: 'Locked', status: 409, code: 'MONTH_LOCKED' }, 409, 'application/problem+json'),
    );
    const req = new Request('http://app.test/api/k/workspaces/w1/entries/batch', {
      method: 'POST',
      body: '{}',
    });
    const res = await proxy(req, ['workspaces', 'w1', 'entries', 'batch'], deps(fetchStub));
    expect(res.status).toBe(409);
    expect(res.headers.get('content-type')).toBe('application/problem+json');
    expect((await res.json()).code).toBe('MONTH_LOCKED');
  });

  it('keeps the attachment headers of the CSV export', async () => {
    const { fetchStub } = upstream(
      () =>
        new Response('date,hours\n2026-09-01,6\n', {
          headers: {
            'content-type': 'text/csv; charset=utf-8',
            'content-disposition': 'attachment; filename="cafe-nord-2026-09.csv"',
          },
        }),
    );
    const res = await proxy(
      new Request('http://app.test/api/k/workspaces/w1/months/2026-09/export.csv'),
      ['workspaces', 'w1', 'months', '2026-09', 'export.csv'],
      deps(fetchStub),
    );
    expect(res.headers.get('content-disposition')).toContain('cafe-nord-2026-09.csv');
    expect(await res.text()).toContain('2026-09-01,6');
  });

  it('re-encodes path segments and refuses dot segments', async () => {
    const { calls, fetchStub } = upstream(() => new Response(null, { status: 204 }));
    const del = new Request('http://app.test/api/k/me/push-tokens/x', { method: 'DELETE' });
    const res = await proxy(del, ['me', 'push-tokens', 'ExponentPushToken[a/b]'], deps(fetchStub));
    expect(res.status).toBe(204);
    expect(calls[0]?.url).toBe('http://api.test/v1/me/push-tokens/ExponentPushToken%5Ba%2Fb%5D');
    const bad = await proxy(
      new Request('http://app.test/api/k/x'),
      ['workspaces', '..', 'me'],
      deps(fetchStub),
    );
    expect(bad.status).toBe(400);
  });

  it('answers 502 when the API cannot be reached', async () => {
    const fetchStub = (async () => {
      throw new TypeError('connect ECONNREFUSED');
    }) as typeof fetch;
    const res = await proxy(new Request('http://app.test/api/k/me'), ['me'], deps(fetchStub));
    expect(res.status).toBe(502);
    expect((await res.json()).code).toBe('INTERNAL');
  });

  it('applies the development JSON rewrite to successful GETs only', async () => {
    const { fetchStub } = upstream(() => json({ platformAdmin: false }));
    const rewriteJson = (path: string, body: unknown) => ({ ...(body as object), path, rewritten: true });
    const res = await proxy(
      new Request('http://app.test/api/k/me'),
      ['me'],
      deps(fetchStub, 'tok', { rewriteJson }),
    );
    expect(await res.json()).toEqual({ platformAdmin: false, path: 'me', rewritten: true });
    const post = await proxy(
      new Request('http://app.test/api/k/me', { method: 'PATCH', body: '{}' }),
      ['me'],
      deps(fetchStub, 'tok', { rewriteJson }),
    );
    expect(await post.json()).toEqual({ platformAdmin: false });
  });
});
