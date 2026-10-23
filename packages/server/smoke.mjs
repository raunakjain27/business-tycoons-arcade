import Fastify from 'fastify';
import { Server as ColyseusServer } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { GameRoom } from './game.room.js';

const PORT = 2571;

const app = Fastify({ logger: false });

app.addHook('onRequest', async (request, reply) => {
  const origin = request.headers.origin || '*';
  reply.header('Access-Control-Allow-Origin', origin);
  reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return reply.status(204).send();
  }
});

const gameServer = new ColyseusServer({
  transport: new WebSocketTransport({ server: app.server }),
});

gameServer.define('game', GameRoom);

await app.listen({ port: PORT, host: '0.0.0.0' });
console.log(`Smoke server on :${PORT}, listening at ws://localhost:${PORT}`);

// Simple WebSocket client to test connection
const WebSocket = globalThis.WebSocket;

function createWebSocketClient(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.onopen = () => {
      console.log('WebSocket connected to', url);
      resolve(socket);
    };
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      reject(new Error('WebSocket connection failed'));
    };
    socket.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
    };
  });
}

async function runSmokeTest() {
  console.log('Starting smoke test...');
  
  // Test 1: Verify server is listening
  const socket = await createWebSocketClient(`ws://localhost:${PORT}`);
  
  // Test 2: Send a simple message and verify we get a response
  // Colyseus protocol: JOIN_ROOM = 10
  const joinMessage = new Uint8Array([
    10, // JOIN_ROOM protocol code
    0,  // reconnection token length
    0,  // serializer ID length
  ]);
  
  socket.send(joinMessage);
  console.log('Sent JOIN_ROOM message');
  
  // Wait for response
  const response = await new Promise((resolve, reject) => {
    socket.onmessage = (event) => {
      console.log('Received message:', event.data);
      resolve(event.data);
    };
    socket.onerror = (error) => {
      reject(error);
    };
    setTimeout(() => reject(new Error('Timeout waiting for response')), 5000);
  });
  
  console.log('Smoke test passed - server is accepting connections');
  
  socket.close();
  await app.close();
  process.exit(0);
}

runSmokeTest().catch(err => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
