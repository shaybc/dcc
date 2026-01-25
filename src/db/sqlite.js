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
  const dbPath = path.join(os.homedir(), ".dcc");
  // ensure directory exists
  try {
    fs.mkdirSync(dbPath, { recursive: true });
  } catch {
    // best-effort; if it fails, DB open will throw with a clear error
  }
  const file = path.join(dbPath, "history.db");
  _db = new Database(file);
  _db.pragma("journal_mode = WAL");
  return _db;
}
