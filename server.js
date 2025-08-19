// server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const PORT = process.env.PORT || 5000;
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

// Serve static files from ./public (optional)
app.use(express.static(path.join(__dirname, 'public')));

// In-memory message history (keeps last MAX_HISTORY messages)
const MAX_HISTORY = 200;
const history = [];

// Broadcast helper
function broadcast(data, exclude = null) {
  const str = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(str);
    }
  });
}

// Heartbeat helpers
function noop() {}
function heartbeat() { this.isAlive = true; }

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', heartbeat);

  // Send history to newly connected client
  ws.send(JSON.stringify({ type: 'history', messages: history }));

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      if (data.type === 'message' && typeof data.text === 'string') {
        const msg = {
          type: 'message',
          id: Date.now().toString(36) + Math.random().toString(36).slice(2,8),
          username: String(data.username || 'Anonymous').slice(0,32),
          text: String(data.text).slice(0,2000),
          ts: Date.now()
        };

        history.push(msg);
        if (history.length > MAX_HISTORY) history.shift();

        broadcast(msg);
      }
    } catch (err) {
      console.error('Invalid message', err);
    }
  });

  ws.on('close', () => { /* no-op */ });
});

// Ping clients to detect dead connections
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping(noop);
  });
}, 30000);

wss.on('close', () => clearInterval(interval));

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`WebSocket endpoint ws://localhost:${PORT}/ws`);
});
