#!/usr/bin/env node
import WebSocket from 'ws';

const WS_URL = process.env.WS_URL || 'ws://localhost:3001';
const SPACE_ID = process.env.SPACE_ID;
const TOKEN = process.env.TOKEN;
const TOKENS = (process.env.TOKENS || '').split(',').map(token => token.trim()).filter(Boolean);
const CLIENTS = Number(process.env.CLIENTS || 10);
const DURATION_MS = Number(process.env.DURATION_MS || 30000);
const MOVE_INTERVAL_MS = Number(process.env.MOVE_INTERVAL_MS || 850);

if (!SPACE_ID || (!TOKEN && TOKENS.length === 0)) {
  console.error('Usage: SPACE_ID=<spaceId> TOKEN=<jwt> or TOKENS=<jwt1,jwt2> [WS_URL=ws://localhost:3001] [CLIENTS=25] node scripts/load-test-ws.mjs');
  process.exit(1);
}

const metrics = {
  opened: 0,
  joined: 0,
  closed: 0,
  errors: 0,
  messages: 0,
  rejectedMoves: 0,
};

const sockets = [];
const startedAt = Date.now();

function randomStep(value) {
  return Math.max(0, Math.min(40, value + Math.floor(Math.random() * 3) - 1));
}

for (let i = 0; i < CLIENTS; i += 1) {
  const url = new URL(WS_URL);
  url.searchParams.set('spaceId', SPACE_ID);
  const ws = new WebSocket(url);
  let x = 3 + (i % 8);
  let y = 3 + Math.floor(i / 8);
  let moveTimer;

  ws.on('open', () => {
    metrics.opened += 1;
    ws.send(JSON.stringify({ type: 'join', payload: { spaceId: SPACE_ID, token: TOKENS[i % TOKENS.length] || TOKEN } }));
  });

  ws.on('message', (raw) => {
    metrics.messages += 1;
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === 'space-joined') {
      metrics.joined += 1;
      x = msg.payload.spawn?.x ?? x;
      y = msg.payload.spawn?.y ?? y;
      moveTimer = setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN) return;
        x = randomStep(x);
        y = randomStep(y);
        ws.send(JSON.stringify({ type: 'move', payload: { x, y } }));
        if (Math.random() < 0.08) {
          ws.send(JSON.stringify({ type: 'chat-message', payload: { scope: 'nearby', message: `load-${i}-${Date.now()}` } }));
        }
      }, MOVE_INTERVAL_MS);
    }

    if (msg.type === 'movement-rejected') metrics.rejectedMoves += 1;
    if (msg.type === 'join-error' || msg.type === 'webrtc-error') {
      console.error('server-error', i, msg);
      metrics.errors += 1;
    }
  });

  ws.on('error', (error) => {
    metrics.errors += 1;
    console.error('socket-error', i, error.message);
  });

  ws.on('close', () => {
    metrics.closed += 1;
    if (moveTimer) clearInterval(moveTimer);
  });

  sockets.push(ws);
}

setTimeout(() => {
  sockets.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close();
  });
  const elapsedMs = Date.now() - startedAt;
  const failedJoins = CLIENTS - metrics.joined;
  console.log(JSON.stringify({ ...metrics, clients: CLIENTS, failedJoins, elapsedMs }, null, 2));
  process.exit(metrics.errors > 0 || failedJoins > 0 ? 1 : 0);
}, DURATION_MS);
