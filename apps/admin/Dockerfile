# Build from the monorepo ROOT context:  docker build -f apps/admin/Dockerfile .
FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY apps/admin/package.json apps/admin/
RUN pnpm install --frozen-lockfile --filter @savdo-pos/admin...
COPY packages/shared-types packages/shared-types
COPY apps/admin apps/admin
WORKDIR /app/apps/admin
RUN pnpm build

FROM nginx:1.27-alpine AS runtime
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
EXPOSE 80
