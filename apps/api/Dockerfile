# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

# 复制 workspace 文件
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/tsconfig.json ./apps/api/
COPY packages ./packages

# 仅安装 api 依赖（示例；真实项目可做更精细的依赖裁剪）
RUN pnpm install --filter @aicasa/api... --frozen-lockfile=false

COPY apps/api ./apps/api

WORKDIR /app/apps/api
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/apps/api/dist ./dist
COPY --from=base /app/apps/api/package.json ./package.json
RUN corepack enable && pnpm install --prod --frozen-lockfile=false

EXPOSE 8080
CMD ["node","dist/server.js"]
