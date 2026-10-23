const { WebSocketServer } = require('ws');
const wss = new WebSocketServer({ port: 9001, clientTracking: true });
wss.on('connection', (ws, req) => {
  console.log('connected', ws._socket === undefined ? 'no-socket' : 'has-socket', ws._socket ? ws._socket._handle ? 'reused-net' : 'fresh' : '');
  setTimeout(() => { ws.close(); }, 50);
});
setTimeout(() => { wss.close(); process.exit(0); }, 1500);
