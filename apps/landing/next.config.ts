import path from 'node:path';
import type { NextConfig } from 'next';

// The repository root. Turbopack only resolves files under its root, so it must be the monorepo root for
// the @klokka/* workspace packages to build, and standalone tracing needs the same root (docs/research/web.md 1).
const repoRoot = path.resolve(import.meta.dirname, '../..');

// Production only: dev needs eval and a websocket for HMR. Inline scripts are the theme no-flash snippet,
// the clock sync, JSON-LD and Next's own RSC payload, which is why script-src keeps 'unsafe-inline'.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Content-Security-Policy', value: contentSecurityPolicy }]
    : []),
];

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: repoRoot,
  turbopack: { root: repoRoot },
  // Workspace packages export TypeScript source.
  transpilePackages: ['@klokka/core', '@klokka/tokens'],
  // `next dev -H 0.0.0.0` is opened from other devices on the LAN; without this Next refuses its dev
  // resources cross-origin and the page never hydrates (AGENTS.md, local previews).
  allowedDevOrigins: ['192.168.*.*'],
  devIndicators: false,
  poweredByHeader: false,
  // The root layout is app/[lang]/layout.tsx, so an unmatched URL has no layout to render a 404 in:
  // app/global-not-found.tsx is that page.
  experimental: { globalNotFound: true },
  async redirects() {
    return [
      // Swedish lives at the root, so /sv is a duplicate: one canonical URL per language.
      { source: '/sv', destination: '/', permanent: true },
      { source: '/sv/:path*', destination: '/:path*', permanent: true },
    ];
  },
  async rewrites() {
    return {
      // Serve the Swedish page from / without exposing the /sv prefix.
      beforeFiles: [{ source: '/', destination: '/sv' }],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
