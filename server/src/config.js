const path = require('node:path');

const serverRoot = path.resolve(__dirname, '..');

function booleanFromEnv(value, fallback) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function positiveIntegerFromEnv(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveFromServerRoot(value, fallback) {
  const selected = value || fallback;
  return path.isAbsolute(selected) ? selected : path.resolve(serverRoot, selected);
}

const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:8080,http://127.0.0.1:8080')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

module.exports = Object.freeze({
  host: process.env.HOST || '127.0.0.1',
  port: positiveIntegerFromEnv(process.env.PORT, 3000),
  projectVersion: process.env.PROJECT_VERSION || '0.1.0-local',
  sourceRepositoryUrl: process.env.SOURCE_REPOSITORY_URL || 'https://github.com/BaizhouziYou/xintinglei-website',
  databasePath: resolveFromServerRoot(process.env.STATUS_DATABASE_PATH, 'data/status.db'),
  minecraftAddress: process.env.MC_SERVER_ADDRESS || 'mc.xintinglei.cn',
  minecraftPort: positiveIntegerFromEnv(process.env.MC_SERVER_PORT, 25565),
  enableSrv: booleanFromEnv(process.env.MC_ENABLE_SRV, true),
  pollTimeoutMs: positiveIntegerFromEnv(process.env.STATUS_POLL_TIMEOUT_MS, 5000),
  showPlayerNames: booleanFromEnv(process.env.SHOW_PLAYER_NAMES, false),
  corsOrigins
});
