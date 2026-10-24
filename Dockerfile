FROM node:22-alpine

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Copy workspace package manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY packages/ packages/
COPY apps/server/ apps/server/

# Install dependencies
RUN pnpm install

# Expose game server and websocket port
EXPOSE 2567

ENV PORT=2567
ENV NODE_ENV=production

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:2567/health || exit 1

# Start Fastify + Colyseus game server
CMD ["node", "--import", "tsx", "packages/server/index.ts"]
