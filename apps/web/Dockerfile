# syntax=docker/dockerfile:1.7
# klokka-web: Next.js standalone on node:24-alpine, non-root, port 3000, runtime env only.
# Build from the repo root so the TypeScript-source workspace packages are in the context:
#   docker build -f apps/web/Dockerfile -t docker.nexus.coolify.ooguy.com/klokka-web:<tag> .
# apps/web/Dockerfile.dockerignore trims the context (BuildKit reads it next to this file).

# Only the manifests, so the dependency layer is reused until a package.json or the lock changes.
FROM node:24-alpine AS manifests
WORKDIR /repo
COPY . .
RUN find . -type f ! -name package.json ! -name package-lock.json -delete && find . -type d -empty -delete

FROM node:24-alpine AS deps
WORKDIR /repo
COPY --from=manifests /repo ./
# Web dependencies plus the root toolchain (TypeScript for next build); sibling apps' dependencies are skipped.
RUN npm ci --workspace @klokka/web --include-workspace-root --no-audit --no-fund

FROM deps AS build
WORKDIR /repo
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace @klokka/web

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
# The standalone tree mirrors the repo (outputFileTracingRoot = repo root): the server is apps/web/server.js.
COPY --from=build --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/healthz > /dev/null || exit 1
CMD ["node", "apps/web/server.js"]
