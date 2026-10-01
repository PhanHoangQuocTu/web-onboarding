# syntax=docker/dockerfile:1

FROM node:24-alpine AS base

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.32.0 --activate

FROM base AS deps

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml next.config.ts postcss.config.mjs tsconfig.json next-env.d.ts ./
COPY src ./src
COPY public ./public
ENV DOCKER_BUILD=true
RUN --mount=type=bind,source=.env.local,target=/app/.env.local,readonly pnpm build

FROM node:24-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production \
    PORT=5123 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --chown=nextjs:nodejs scripts/migrate.mjs ./scripts/migrate.mjs
COPY --chown=nextjs:nodejs db ./db

USER nextjs
EXPOSE 5123
CMD ["sh", "-c", "node scripts/migrate.mjs && exec node server.js"]
