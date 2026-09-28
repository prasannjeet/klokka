// Liveness for Coolify's health check (docs/INFRA.md: GET /healthz, expects 200). No auth, no upstream
// calls: the app is healthy when it can answer, whatever the API or Logto are doing.
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ status: 'UP' }, { headers: { 'cache-control': 'no-store' } });
}
