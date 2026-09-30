import path from 'node:path';
import type { NextConfig } from 'next';

// The npm scripts run with apps/web as the working directory; the repo root is two levels up. Turbopack
// and output tracing both need the repo root so the TypeScript-source workspace packages (packages/*)
// resolve and land in the standalone bundle (docs/research/web.md section 1).
const repoRoot = path.resolve(process.cwd(), '..', '..');

const config: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: repoRoot,
  turbopack: { root: repoRoot },
  // AGENTS.md: web verification runs against the LAN URL; without this Next blocks dev resources from
  // http://192.168.x.y:3000 and the page renders with dead client JS.
  allowedDevOrigins: ['192.168.*.*'],
  poweredByHeader: false,
  // The repo's AGENTS.md is the single source for agent instructions; `next dev` must not write its own.
  agentRules: false,
  devIndicators: false,
  reactStrictMode: true,
  // The product app is never indexed: the header covers every response (API routes and files included), the
  // robots meta in layout.tsx the pages. robots.ts still lets crawlers in, so link-preview bots read the tags.
  async headers() {
    return [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }];
  },
};

export default config;
