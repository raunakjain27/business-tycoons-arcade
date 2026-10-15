FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/server ./apps/server

# Install pnpm
RUN corepack enable && corepack prepare pnpm@12.11.2 --activate

# Install dependencies
RUN pnpm install --frozen-lockfile

# Expose port
EXPOSE 2567

# Start server
WORKDIR /app/apps/server
CMD ["pnpm", "start"]