// server/db.js — SQLite backend cho apc-clone (APC Enter architecture)
// 4 tables: branches, users, profiles, attributes
// DB file: ./apc-server.db (rieng, KHONG dung apc.db / APC.db / db3.db hien co)
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.APC_DB_PATH || path.join(__dirname, '..', 'apc-server.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS branches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin','manager','staff')),
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_code TEXT NOT NULL,
  profile_type TEXT NOT NULL DEFAULT 'thau_chi',
  data TEXT NOT NULL DEFAULT '{}',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_profiles_customer ON profiles(customer_code);
CREATE TABLE IF NOT EXISTS attributes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  field_key TEXT UNIQUE NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text' CHECK (field_type IN ('text','number','date','select','textarea')),
  default_value TEXT DEFAULT '',
  options TEXT DEFAULT '[]',
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  required INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 1 CHECK (level IN (1,2,3)),
  approver TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT (datetime('now','localtime')),
  decided_at TEXT DEFAULT NULL,
  UNIQUE (profile_id, level)
);
CREATE INDEX IF NOT EXISTS idx_approvals_profile ON approvals(profile_id);
`);

// Migration: them cot status cho profiles (DB cu chua co)
try {
  const cols = db.prepare('PRAGMA table_info(profiles)').all().map((c) => c.name);
  if (!cols.includes('status')) {
    db.exec(`ALTER TABLE profiles ADD COLUMN status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_review','approved','rejected'))`);
  }
} catch { /* bang moi da co default */ }

// Seed 1 chi nhanh + 1 admin mac dinh (chi khi bang rong)
const branchCount = db.prepare('SELECT COUNT(*) c FROM branches').get().c;
if (branchCount === 0) {
  const b = db.prepare('INSERT INTO branches (code, name) VALUES (?,?)').run('HHO', 'Hoi so chinh');
  db.prepare("INSERT INTO users (username, role, branch_id) VALUES ('admin','admin',?)").run(b.lastInsertRowid);
}

export default db;
export { DB_PATH };
