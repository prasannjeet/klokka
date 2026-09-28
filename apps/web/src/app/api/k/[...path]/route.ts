import type { NextRequest } from 'next/server';
import { proxy } from '@/lib/bff';
import { apiBaseUrl } from '@/lib/env';
import { rewriteForPersona } from '@/lib/dev-persona';
import { devPersona, routeToken } from '@/lib/session';

// /api/k/* -> KLOKKA_API_BASE_URL/*, with the user's bearer token (docs/research/web.md section 2).
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ path: string[] }> };

async function handle(request: NextRequest, context: Context): Promise<Response> {
  const { path } = await context.params;
  const persona = await devPersona();
  return proxy(request, path, {
    baseUrl: apiBaseUrl(),
    token: routeToken,
    fetch,
    ...(persona ? { rewriteJson: (p: string, body: unknown) => rewriteForPersona(persona, p, body) } : {}),
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
