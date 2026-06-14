# Build from the monorepo ROOT context:  docker build -f apps/backend/Dockerfile .
FROM node:20-alpine AS base
# Prisma engines on alpine need OpenSSL + libstdc++ to load.
RUN apk add --no-cache openssl libstdc++ \
  && corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

# ---- deps ----
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY apps/backend/package.json apps/backend/
RUN pnpm install --frozen-lockfile --filter @savdo-pos/backend...

# ---- build ----
FROM deps AS build
COPY packages/shared-types packages/shared-types
# Compile shared-types to CJS so the backend can require() it at runtime.
RUN pnpm --filter @savdo-pos/shared-types build
COPY apps/backend apps/backend
WORKDIR /app/apps/backend
RUN pnpm prisma generate && pnpm build

# ---- runtime ----
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/packages /app/packages
COPY --from=build /app/apps/backend/node_modules /app/apps/backend/node_modules
COPY --from=build /app/apps/backend/dist /app/apps/backend/dist
COPY --from=build /app/apps/backend/prisma /app/apps/backend/prisma
COPY --from=build /app/apps/backend/package.json /app/apps/backend/package.json
WORKDIR /app/apps/backend
EXPOSE 3000
# First deploy: sync schema to DB via db push (no migration history yet),
# then start. Switch to `prisma migrate deploy` once migrations are committed.
CMD ["sh", "-c", "pnpm exec prisma db push --skip-generate --accept-data-loss && node dist/main.js"]
