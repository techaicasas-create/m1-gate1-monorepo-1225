# Scan worker - build from monorepo

############################
# 1) Build stage (pnpm)
############################
FROM node:20-slim AS build
WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/scan-worker/package.json ./apps/scan-worker/package.json

# Install deps for build
RUN pnpm install --frozen-lockfile=false

# Copy sources and build
COPY apps/scan-worker ./apps/scan-worker
RUN pnpm -C apps/scan-worker build


############################
# 2) Runtime stage (npm installs real node_modules)
############################
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy compiled output + package.json (with dependencies: pg, pino)
COPY --from=build /app/apps/scan-worker/dist ./dist
COPY --from=build /app/apps/scan-worker/package.json ./package.json

# ✅ Install runtime deps into /app/node_modules for sure (avoids pnpm store symlinks)
RUN npm install --omit=dev --no-audit --no-fund

CMD ["node", "dist/worker.js"]
