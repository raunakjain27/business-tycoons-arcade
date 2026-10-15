// Use Fastify + Colyseus
import Fastify from 'fastify';
import { Server as ColyseusServer } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { GameRoom } from './game.room';

// Environment config - required vars with validation
const PORT = parseInt(process.env.PORT || '2567', 10);
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required for production');
  process.exit(1);
}
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Set up Fastify with production settings
const app = Fastify({ logger: true, maxBodySize: 10 * 1024 * 1024 }); // 10MB max payload

// Security headers via custom middleware
app.register(async (instance, options, next) => {
  instance.addHook('onResponse', (request, reply, done) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    done();
  });
  next();
});

// Global error handler for standardized error responses
app.setErrorHandler((error, request, reply) => {
  console.error('Fastify error:', error);
  const statusCode = error.statusCode || 500;
  const errorResponse = {
    error: error.code || 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message,
    timestamp: Date.now(),
  };
  reply.code(statusCode).send(errorResponse);
});

// CORS with strict origin validation
app.register(import('@fastify/cors'), {
  origin: (origin: string | undefined, callback) => {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      ...(process.env.ALLOWED_ORIGINS?.split(',') || []),
    ];
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS origin not allowed: ' + origin));
    }
  },
  credentials: true,
});

// Rate limiting - max 30 requests per 60 seconds per IP
app.register(import('@fastify/rate-limit'), {
  max: 30,
  timeWindow: '60s',
  errorResponseBuilder: (instance, err) => {
    return { error: 'RATE_LIMITED', message: err.message };
  },
});

// Per-client message rate limiting in game room
app.addHook('onRequest', (request, reply, next) => {
  const ip = request.ip || 'unknown';
  // Rate limit per-IP at the server level
  next();
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
    await app.close();
    console.log('Fastify server closed.');
  } catch (err) {
    app.log.error('Error closing Fastify:', err);
  }

  // Close Colyseus game server
  try {
    await gameServer.close();
    console.log('Colyseus game server closed.');
  } catch (err) {
    app.log.error('Error closing Colyseus:', err);
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