import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const MIGRATIONS = [
  `
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'Pro Secure',
    storage_quota_bytes INTEGER NOT NULL DEFAULT 30000000000,
    require_password INTEGER NOT NULL DEFAULT 1,
    notify_access INTEGER NOT NULL DEFAULT 1,
    allow_access_requests INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX sessions_user ON sessions(user_id);

  CREATE TABLE files (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    storage_key TEXT,
    iv TEXT,
    auth_tag TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX files_user_created ON files(user_id, created_at DESC);

  CREATE TABLE links (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    slug TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    expires_at TEXT,
    read_only INTEGER NOT NULL DEFAULT 0,
    access_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE INDEX links_user_created ON links(user_id, created_at DESC);

  CREATE TABLE events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    actor TEXT,
    file_name TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX events_user_created ON events(user_id, created_at DESC);

  CREATE TABLE contacts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL
  );
  CREATE INDEX contacts_user ON contacts(user_id);
  `,
]

// Lowercase without diacritics: "Reunião" -> "reuniao".
export const foldText = (text) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

export function openDatabase(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;')
  // SQLite's LIKE only folds ASCII case, so "REUNIÃO" would not match "reunião". Searches compare fold() on both sides.
  db.function('fold', { deterministic: true }, (text) => (text == null ? null : foldText(String(text))))
  migrate(db)
  return db
}

function migrate(db) {
  const { user_version: current } = db.prepare('PRAGMA user_version').get()
  for (let version = current; version < MIGRATIONS.length; version++) {
    db.exec('BEGIN')
    try {
      db.exec(MIGRATIONS[version])
      db.exec(`PRAGMA user_version = ${version + 1}`)
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  }
}

export function transaction(db, work) {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = work()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
