const fs = require('node:fs/promises');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();
const config = require('./config');

let database;
let databaseOpening;

function openDatabase() {
  if (database) return Promise.resolve(database);
  if (databaseOpening) return databaseOpening;
  databaseOpening = fs.mkdir(path.dirname(config.databasePath), { recursive: true })
    .then(() => new Promise((resolve, reject) => {
      const instance = new sqlite3.Database(config.databasePath, (error) => {
        if (error) return reject(error);
        database = instance;
        resolve(instance);
      });
    }));
  return databaseOpening;
}

async function execute(sql) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => db.exec(sql, (error) => (error ? reject(error) : resolve())));
}

async function run(sql, parameters = []) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => db.run(sql, parameters, function onRun(error) {
    if (error) return reject(error);
    resolve({ changes: this.changes, lastID: this.lastID });
  }));
}

async function get(sql, parameters = []) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => db.get(sql, parameters, (error, row) => (error ? reject(error) : resolve(row))));
}

async function all(sql, parameters = []) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => db.all(sql, parameters, (error, rows) => (error ? reject(error) : resolve(rows))));
}

async function migrateDatabase() {
  await execute(`
    CREATE TABLE IF NOT EXISTS status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      is_online INTEGER NOT NULL,
      players_online INTEGER,
      latency INTEGER,
      player_sample TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_status_history_timestamp ON status_history(timestamp);
  `);
}

async function recordStatus({ isOnline, playersOnline, latency, playerSample }) {
  await run(
    `INSERT INTO status_history (timestamp, is_online, players_online, latency, player_sample)
     VALUES (?, ?, ?, ?, ?)`,
    [new Date().toISOString(), isOnline ? 1 : 0, playersOnline ?? null, latency ?? null, playerSample ? JSON.stringify(playerSample) : null]
  );
}

function normalizeStatusRecord(row, includePlayerNames) {
  if (!row) return null;
  const normalized = { ...row, is_online: Boolean(row.is_online) };
  if (includePlayerNames && row.player_sample) {
    try { normalized.player_sample = JSON.parse(row.player_sample); } catch { normalized.player_sample = []; }
  } else {
    delete normalized.player_sample;
  }
  return normalized;
}

async function getLatest({ includePlayerNames = false } = {}) {
  const row = await get('SELECT * FROM status_history ORDER BY timestamp DESC LIMIT 1');
  return normalizeStatusRecord(row, includePlayerNames);
}

async function getHistory({ hours = 24, includePlayerNames = false } = {}) {
  const boundedHours = Math.min(Math.max(Number(hours) || 24, 1), 168);
  const since = new Date(Date.now() - boundedHours * 60 * 60 * 1_000).toISOString();
  const rows = await all(
    // Keep the complete requested period for the availability calculation.
    // The browser chooses how many of the newest samples fit in its chart.
    'SELECT * FROM status_history WHERE timestamp >= ? ORDER BY timestamp ASC',
    [since]
  );
  return rows.map((row) => normalizeStatusRecord(row, includePlayerNames));
}

async function closeDatabase() {
  if (!database) return;
  const closing = database;
  database = undefined;
  databaseOpening = undefined;
  await new Promise((resolve, reject) => closing.close((error) => (error ? reject(error) : resolve())));
}

module.exports = { closeDatabase, getHistory, getLatest, migrateDatabase, recordStatus };
