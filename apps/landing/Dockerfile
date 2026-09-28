# syntax=docker/dockerfile:1
# Klokka landing: Next.js standalone on node:24-alpine, non-root, port 3000 (docs/research/web.md section 1).
# The build context is the REPOSITORY ROOT (workspace packages and the root lockfile live there):
#   docker build -f apps/landing/Dockerfile -t klokka-landing .          (from the root)
#   npm run docker:build -w @klokka/landing                              (same, with the staging URLs)
# NEXT_PUBLIC_* values are inlined at build time, so one image serves one environment.

# ---- manifests: every workspace package.json plus the lockfile, so `npm ci` caches on dependencies only ----
FROM node:24-alpine AS manifests
WORKDIR /src
COPY . .
RUN mkdir /out \
 && find . -name package.json -not -path '*/node_modules/*' -not -path './docs/*' -not -path './apps/api/*' \
    | tar -cf - -T - | tar -xf - -C /out \
 && cp package-lock.json /out/

# ---- deps: the landing workspace and the root toolchain; sibling apps' dependencies are skipped ----
FROM node:24-alpine AS deps
WORKDIR /app
COPY --from=manifests /out ./
RUN npm install -g npm@11.9.0 --no-audit --no-fund
RUN npm ci --workspace @klokka/landing --include-workspace-root --no-audit --no-fund

# ---- build ----
FROM deps AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
ARG NEXT_PUBLIC_SITE_URL=https://klokka.coolify.ooguy.com
ARG NEXT_PUBLIC_APP_URL=https://klokka-app.coolify.ooguy.com
ARG NEXT_PUBLIC_APK_URL=https://nexus.coolify.ooguy.com/repository/klokka-downloads/klokka-latest.apk
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_APK_URL=$NEXT_PUBLIC_APK_URL
RUN npm run build --workspace @klokka/landing

# ---- run: the standalone server mirrors the repo layout (apps/landing/server.js) ----
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/apps/landing/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/landing/.next/static ./apps/landing/.next/static
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/landing/server.js"]
