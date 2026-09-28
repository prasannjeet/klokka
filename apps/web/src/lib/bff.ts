// The same-origin backend-for-frontend behind /api/k/* (docs/research/web.md section 2): the browser calls
// its own origin with the session cookie, this adds the Logto bearer token from the server-side session
// and forwards to the Klokka API. The browser never sees a token, the API needs no CORS. Transport only:
// every path and body is the contract's (AGENTS.md), nothing here knows an operation.

export interface BffDeps {
  // The API origin with its prefix, no trailing slash.
  baseUrl: string;
  // The access token for the signed-in user, or null when there is no session.
  token: () => Promise<string | null>;
  fetch: typeof fetch;
  // Development persona rewrite of JSON bodies (dev-persona.ts); absent in production.
  rewriteJson?: (path: string, body: unknown) => unknown;
}

// The only operation a visitor without a session may call: the public invitation lookup (join page).
const PUBLIC_GET = [/^invitations\/[^/]+$/];

const REQUEST_HEADERS = ['accept', 'accept-language', 'content-type', 'if-match', 'if-none-match'];
const RESPONSE_HEADERS = ['content-type', 'content-disposition', 'cache-control', 'etag', 'retry-after'];
const BODYLESS = new Set(['GET', 'HEAD']);

export function problem(status: number, code: string, title: string): Response {
  return new Response(JSON.stringify({ type: 'about:blank', title, status, code }), {
    status,
    headers: { 'content-type': 'application/problem+json', 'cache-control': 'no-store' },
  });
}

function isPublic(method: string, path: string): boolean {
  return method === 'GET' && PUBLIC_GET.some((re) => re.test(path));
}

export async function proxy(request: Request, segments: readonly string[], deps: BffDeps): Promise<Response> {
  if (segments.length === 0 || segments.some((s) => s === '' || s === '.' || s === '..')) {
    return problem(400, 'VALIDATION', 'Bad path');
  }
  const method = request.method.toUpperCase();
  const path = segments.map((s) => encodeURIComponent(s)).join('/');
  const search = new URL(request.url).search;

  let token: string | null;
  try {
    token = await deps.token();
  } catch {
    token = null;
  }
  if (!token && !isPublic(method, path)) {
    return problem(401, 'UNAUTHENTICATED', 'Not signed in');
  }

  const headers = new Headers();
  for (const name of REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  if (token) headers.set('authorization', `Bearer ${token}`);

  const init: RequestInit = { method, headers, redirect: 'manual', cache: 'no-store' };
  if (!BODYLESS.has(method)) {
    const body = await request.arrayBuffer();
    if (body.byteLength > 0) init.body = body;
  }

  let upstream: Response;
  try {
    upstream = await deps.fetch(`${deps.baseUrl}/${path}${search}`, init);
  } catch {
    return problem(502, 'INTERNAL', 'The API could not be reached');
  }

  const out = new Headers();
  for (const name of RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value !== null) out.set(name, value);
  }
  if (!out.has('cache-control')) out.set('cache-control', 'no-store');

  const type = upstream.headers.get('content-type') ?? '';
  if (deps.rewriteJson && method === 'GET' && upstream.ok && type.includes('json')) {
    const body = deps.rewriteJson(path, await upstream.json());
    return new Response(JSON.stringify(body), { status: upstream.status, headers: out });
  }
  const noBody = upstream.status === 204 || upstream.status === 304 || method === 'HEAD';
  return new Response(noBody ? null : upstream.body, { status: upstream.status, headers: out });
}
