require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function run() {
  const user = await prisma.user.findFirst();
  const space = await prisma.space.findFirst();
  console.log('User:', user?.id, 'Space:', space?.id);

  if (!user || !space) return;

  const token = jwt.sign({ userId: user.id, role: user.role }, 'metaverse-local-dev-secret');

  const ws = new WebSocket('ws://localhost:3001');

  ws.on('open', () => {
    console.log('Connected!');
    ws.send(JSON.stringify({
      type: 'join',
      payload: {
        spaceId: space.id,
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
}

run();
