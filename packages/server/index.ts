// Use Fastify + Colyseus
import Fastify from 'fastify';
import { Server as ColyseusServer } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { GameRoom } from './game.room';

// Environment config
const PORT = parseInt(process.env.PORT || '2567', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Set up Fastify
const app = Fastify({ logger: true });

// CORS
app.register(import('@fastify/cors'), {
  origin: CORS_ORIGIN,
  credentials: true,
});

// Health check
app.get('/health', async () => ({ status: 'ok' }));

// Create Colyseus server with WebSocket transport
const gameServer = new ColyseusServer({
  transport: new WebSocketTransport({ server: app.server }),
});

// Register game room
gameServer.define('game', GameRoom);

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