import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const dbPath = path.join(DATA_DIR, 'catan.db');

declare global {
  // eslint-disable-next-line no-var
  var __catanDb: Database.Database | undefined;
}

function init(database: Database.Database) {
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(group_id, name),
      UNIQUE(group_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      winner_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      variant TEXT NOT NULL DEFAULT 'Base',
      played_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS game_players (
      game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      PRIMARY KEY(game_id, player_id)
    );

    CREATE INDEX IF NOT EXISTS idx_games_group ON games(group_id);
    CREATE INDEX IF NOT EXISTS idx_players_group ON players(group_id);
  `);

  const cols = database
    .prepare(`PRAGMA table_info(players)`)
    .all() as { name: string }[];
  if (!cols.some((c) => c.name === 'user_id')) {
    database.exec(`ALTER TABLE players ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
    database.exec(`CREATE UNIQUE INDEX IF NOT EXISTS uq_players_group_user ON players(group_id, user_id) WHERE user_id IS NOT NULL`);
  }
  database.exec(`CREATE INDEX IF NOT EXISTS idx_players_user ON players(user_id)`);
}

export function getDb(): Database.Database {
  if (!global.__catanDb) {
    const database = new Database(dbPath);
    init(database);
    global.__catanDb = database;
  }
  return global.__catanDb;
}
