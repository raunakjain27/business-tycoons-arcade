# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN corepack enable && \
    corepack prepare pnpm@12.11.2 --activate && \
    pnpm install --frozen-lockfile

# Copy source code
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/server ./apps/server

# Build the server
WORKDIR /app/apps/server
RUN pnpm build 2>/dev/null || pnpm install --frozen-lockfile

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies
RUN corepack enable && \
    corepack prepare pnpm@12.11.2 --activate && \
    pnpm install --frozen-lockfile --production

# Copy built artifacts from builder
COPY --from=builder /app/apps/server/dist ./dist 2>/dev/null || true
COPY --from=builder /app/apps/server/.next ./ .next 2>/dev/null || true
COPY --from=builder /app/apps/server/package.json ./
COPY --from=builder /app/apps/server/tsconfig.json ./
COPY --from=builder /app/apps/server/index.ts ./

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy only necessary files
COPY apps/server/index.ts ./
COPY apps/server/package.json ./
COPY apps/server/node_modules ./node_modules
COPY .env.example ./

# Set working directory
WORKDIR /app/apps/server

# Expose the port
EXPOSE 2567

# Set environment
ENV NODE_ENV=production \
    PORT=2567

# Switch to non-root user
USER appuser

# Start server with production settings
CMD ["pnpm", "start"]