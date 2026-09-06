const http = require('node:http');
const cors = require('cors');
const express = require('express');
const WebSocket = require('ws');
const config = require('./config');
const { closeDatabase, getHistory, getLatest, migrateDatabase } = require('./database');

const app = express();
app.disable('x-powered-by');

app.use(cors({
  origin(origin, callback) {
    if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed'));
  },
  methods: ['GET'],
}));

app.use((request, response, next) => {
  response.setHeader('X-Project-Name', 'Xintinglei');
  response.setHeader('X-Project-Version', config.projectVersion);
  response.setHeader('X-Source-Repository', config.sourceRepositoryUrl);
  next();
});

app.get('/health', (_request, response) => {
  response.json({ status: 'ok', project: 'Xintinglei', version: config.projectVersion });
});

app.get('/api/status/latest', async (_request, response, next) => {
  try {
    response.json(await getLatest({ includePlayerNames: config.showPlayerNames }));
  } catch (error) {
    next(error);
  }
});

app.get('/api/status/history', async (_request, response, next) => {
  try {
    response.json(await getHistory({ hours: 24, includePlayerNames: false }));
  } catch (error) {
    next(error);
  }
});

app.use((_request, response) => {
  response.status(404).json({ error: 'Not found' });
});

app.use((error, _request, response, _next) => {
  if (error.message === 'Origin is not allowed') {
    return response.status(403).json({ error: 'Origin is not allowed' });
  }
  console.error(error);
  return response.status(500).json({ error: 'Internal server error' });
});

const server = http.createServer(app);
const webSocketServer = new WebSocket.Server({
  server,
  maxPayload: 1024,
  perMessageDeflate: false,
});

webSocketServer.on('connection', (socket) => {
  socket.on('message', (message) => {
    if (message.toString() === 'ping') socket.send('pong');
  });
});

async function start() {
  await migrateDatabase();
  await new Promise((resolve) => server.listen(config.port, config.host, resolve));
  console.log(`Xintinglei status backend listening on http://${config.host}:${config.port}`);
}

async function shutdown() {
  webSocketServer.close();
  await new Promise((resolve) => server.close(resolve));
  await closeDatabase();
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    shutdown().finally(() => process.exit(0));
  });
}

start().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
