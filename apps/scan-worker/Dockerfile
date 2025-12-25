# Scan worker - build from monorepo

FROM node:20-slim AS build
WORKDIR /app

# 1) Copy workspace manifests
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/scan-worker/package.json ./apps/scan-worker/package.json

# 2) Install deps (workspace)
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
RUN pnpm install --frozen-lockfile=false

# 3) Copy sources
COPY apps/scan-worker ./apps/scan-worker

# 4) Build
RUN pnpm -C apps/scan-worker build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/apps/scan-worker/dist ./dist
COPY apps/scan-worker/package.json ./package.json

# only runtime deps are required; but this worker has none besides 'pg' and 'pino', so keep it simple.
CMD ["node", "dist/worker.js"]
