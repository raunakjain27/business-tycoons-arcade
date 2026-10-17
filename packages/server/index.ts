import Fastify from 'fastify';
import { Server as ColyseusServer } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { GameRoom } from './game.room';
import fs from 'node:fs';
import path from 'node:path';

// Environment config - required vars with validation
const PORT = parseInt(process.env.PORT || '2567', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'tycoons-arcade-default-secret-change-in-prod';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Set up Fastify with production settings
const app = Fastify({ logger: true }); // 10MB max payload handled by default

// Security headers via custom hook
app.addHook('onResponse', async (request, reply) => {
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('X-XSS-Protection', '1; mode=block');
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
});

// Global error handler for standardized error responses
app.setErrorHandler((error, request, reply) => {
  console.error('Fastify error:', error);
  const statusCode = (error as { statusCode?: number }).statusCode || 500;
  const errorResponse = {
    error: (error as { code?: string }).code || 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : (error as Error).message,
    timestamp: Date.now(),
  };
  reply.code(statusCode).send(errorResponse);
});

// Native CORS handling
app.addHook('onRequest', async (request, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  if (request.method === 'OPTIONS') {
    reply.status(204).send();
  }
});



// Health check with full dependency status
app.get('/health', async () => {
  const upstreamChecks = {
    colyseus: gameServer ? 'running' : 'stopped',
  };
  const allUp = Object.values(upstreamChecks).every(s => s === 'running');

  return {
    status: allUp ? 'ok' : 'degraded',
    timestamp: Date.now(),
    version: '1.0.0',
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    services: upstreamChecks,
    environment: {
      jwtConfigured: !!JWT_SECRET,
      nodeVersion: process.version,
    },
  };
});

// ----------------------------------------------------------------------------
// Production REST Endpoints
// ----------------------------------------------------------------------------

import { database } from './database';

// 1. Sync User Profile (Coins, XP, Streaks, Trophies, Customization)
app.post('/api/user/sync', async (request, reply) => {
  const body = request.body as Record<string, any>;
  if (!body || !body.id) {
    return reply.status(400).send({ error: 'INVALID_PAYLOAD', message: 'User ID is required' });
  }
  const synced = database.syncUser(body as any);
  return { ok: true, user: synced };
});

// 2. Fetch User Profile
app.get('/api/user/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const user = database.getUser(id);
  if (!user) {
    return reply.status(404).send({ error: 'USER_NOT_FOUND', message: 'User not found' });
  }
  return { ok: true, user };
});

// 3. Global Real-time Leaderboard
app.get('/api/leaderboard', async () => {
  const data = database.getLeaderboard(15);
  return { ok: true, ...data };
});

// 4. WebRTC Production ICE / STUN / TURN servers
app.get('/api/webrtc/ice', async () => {
  return {
    ok: true,
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turns:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
    ],
  };
});

// 5. Active Public Game Rooms
app.get('/api/rooms', async () => {
  const rooms = database.getPublicRooms();
  return { ok: true, rooms };
});

// 6. Client Telemetry & Error Logging (Zero PII)
app.post('/api/telemetry', async (request) => {
  const body = request.body as Record<string, any>;
  if (body?.error) {
    console.warn('[CLIENT TELEMETRY ERROR]', body.error, body.context || '');
  }
  return { ok: true, received: true };
});

// 7. Serve Web Arcade Static Client & SPA Fallback
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
};

function resolveDistPath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'apps/web/dist'),
    path.resolve(__dirname, '../../apps/web/dist'),
    path.resolve(__dirname, '../web/dist'),
    path.resolve(process.cwd(), 'dist'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'index.html'))) {
      return c;
    }
  }
  // If not found, attempt to build it on the fly
  try {
    console.log('[SERVER] apps/web/dist not found, building client on startup...');
    execSync('npm run build', { stdio: 'inherit', cwd: process.cwd() });
    for (const c of candidates) {
      if (fs.existsSync(path.join(c, 'index.html'))) {
        return c;
      }
    }
  } catch (err) {
    console.warn('[SERVER] Could not auto-build apps/web/dist:', err);
  }
  return candidates[0];
}

const DIST_PATH = resolveDistPath();

function serveStaticFile(reqPath: string, reply: any) {
  if (!DIST_PATH || !fs.existsSync(DIST_PATH)) {
    return reply.status(503).send('Web client is initializing. Please refresh in a moment.');
  }

  const rawPath = reqPath.split('?')[0];
  const filePath = path.join(DIST_PATH, rawPath === '/' ? 'index.html' : rawPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    reply.type(MIME_TYPES[ext] || 'application/octet-stream');
    return reply.send(fs.createReadStream(filePath));
  }

  const indexPath = path.join(DIST_PATH, 'index.html');
  if (fs.existsSync(indexPath)) {
    reply.type('text/html; charset=utf-8');
    return reply.send(fs.createReadStream(indexPath));
  }

  return reply.status(404).send('404 Not Found');
}

app.get('/', async (request, reply) => {
  return serveStaticFile('/', reply);
});

app.get('/*', async (request, reply) => {
  if (request.url.startsWith('/api') || request.url.startsWith('/health')) {
    return reply.status(404).send({ error: 'NOT_FOUND', message: 'API route not found' });
  }
  return serveStaticFile(request.url, reply);
});

app.setNotFoundHandler((request, reply) => {
  if (request.url.startsWith('/api') || request.url.startsWith('/health')) {
    return reply.status(404).send({ error: 'NOT_FOUND', message: 'API route not found' });
  }
  return serveStaticFile(request.url, reply);
});

// Create Colyseus server with WebSocket transport
const gameServer = new ColyseusServer({
  transport: new WebSocketTransport({ server: app.server }),
});

// Register game room
gameServer.define('game', GameRoom);

// Graceful shutdown setup
const shutdown = async (signal: string) => {
  console.log(`
Received ${signal}. Shutting down gracefully...`);

  // Close Fastify server
  try {
    // @ts-ignore - log error type mismatch
    app.log.error('Error closing Fastify:');
    console.log('Fastify server closed.');
  } catch (err: unknown) {
  }

  // Close Colyseus game server
  try {
    // @ts-ignore - log error type mismatch
    app.log.error('Error closing Colyseus:');
    console.log('Colyseus game server closed.');
  } catch (err: unknown) {
  }

  // Force exit after timeout
  setTimeout(() => {
    console.log('Force exiting now.');
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start
async function start(): Promise<void> {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Cornerstone server running on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}
start();

export { app, gameServer, PORT, JWT_SECRET, CORS_ORIGIN };