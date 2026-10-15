# Cornerstone

A modern twist on Monopoly with country-specific boards, event cards, and multiplayer support.

## Quick Start

### Development

```bash
# Install dependencies
pnpm install

# Run both server and web in dev mode
pnpm dev

# Or run separately
pnpm dev:server  # Runs Colyseus server on port 2567
pnpm dev:web     # Runs Vite dev server on port 5173
```

### Build & Test

```bash
# Run all tests
pnpm test

# Build all packages/apps
pnpm build
```

## Features

- **Multiple Boards**: Choose from India, USA, UK, UAE, Mixed, or Default boards
- **Fun Twists**: Snake Eyes bonus, Lucky 7 bonus, Influence Shield for high influence players
- **Multiplayer**: Real-time multiplayer with Colyseus (2-6 players)
- **Local vs Online**: Play against bots locally or with friends online
- **Event System**: Expanded deck with 52 unique event cards
- **Roles & Influence**: Unique character abilities and influence mechanics

## Environment Variables

### Server (`apps/server` or root)
- `PORT` - Server port (default: 2567)
- `JWT_SECRET` - JWT signing secret for auth
- `CORS_ORIGIN` - Allowed CORS origin for web client

### Web (`apps/web`)
- `VITE_SERVER_URL` - WebSocket URL for Colyseus server (e.g., `wss://your-server.com` or `ws://localhost:2567`)

See `.env.example` for configuration templates.

## Deployment

### Server Deployment
Deploy the Colyseus server (packages/apps/server) to a platform that supports Node.js (Railway, Render, Fly.io, etc.). Set environment variables above.

### Web Deployment
Build the web app (`pnpm build` in web or root) and deploy the `apps/web/dist` folder to a static host (Vercel, Netlify, Cloudflare Pages). Set `VITE_SERVER_URL` to point to your deployed server.

## Architecture

- **packages/engine** - Pure deterministic game logic with Immer
- **packages/server** - Colyseus game room with auth, validation, state filtering
- **packages/bots** - AI opponents (Easy/Medium/Hard)
- **packages/protocol** - Zod schemas for type-safe communication
- **packages/content** - Boards, events, and game data
- **apps/web** - React + Vite + Zustand frontend
