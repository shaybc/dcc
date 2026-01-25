import Database from "better-sqlite3";
import os from "os";
import path from "path";
import fs from "fs";

let _db = null;

/**
 * Returns a singleton SQLite connection.
 * Stored under ~/.dcc/history.db for local, per-developer history.
 */
export function getDb() {
  if (_db) return _db;

  const dir = path.join(os.homedir(), ".dcc");

  // Ensure directory exists (better-sqlite3 requires the directory to exist)
  fs.mkdirSync(dir, { recursive: true });

  const file = path.join(dir, "history.db");

  _db = new Database(file);
  _db.pragma("journal_mode = WAL");
  return _db;
}
