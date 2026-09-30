const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

const token = jwt.sign({ userId: 'test-user', role: 'Admin' }, 'metaverse-local-dev-secret');

const ws = new WebSocket('ws://localhost:3001');

ws.on('open', () => {
  console.log('Connected!');
  ws.send(JSON.stringify({
    type: 'join',
    payload: {
      spaceId: 'test-space',
      token: token
    }
  }));
});

ws.on('message', (data) => {
  console.log('Received:', data.toString());
});

ws.on('close', (code, reason) => {
  console.log('Closed:', code, reason.toString());
});

ws.on('error', (err) => {
  console.log('Error:', err);
});
