import { getDb } from "../db/sqlite.js";

export const DEFAULT_CONFIG_REPO_PATH = "c:\\git\\ai_assets";
export const DEFAULT_AI_ASSETS_REPO_URL = "";

export function getSetting(key, fallbackValue = null) {
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  if (row && typeof row.value === "string") {
    return row.value;
  }
  if (fallbackValue !== null && fallbackValue !== undefined) {
    const now = Date.now();
    db.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)").run(key, fallbackValue, now);
    return fallbackValue;
  }
  return null;
}

export function setSetting(key, value) {
  const db = getDb();
  const now = Date.now();
  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value=excluded.value,
      updated_at=excluded.updated_at
  `).run(key, value, now);
}

export function getConfigRepoPath() {
  return getSetting("configRepoPath", DEFAULT_CONFIG_REPO_PATH);
}

export function getAiAssetsRepoUrl() {
  return getSetting("aiAssetsRepoUrl", DEFAULT_AI_ASSETS_REPO_URL);
}

export function listProjectPaths() {
  const db = getDb();
  return db.prepare("SELECT id, path, created_at FROM project_paths ORDER BY created_at DESC").all();
}

export function addProjectPath(path) {
  const db = getDb();
  const now = Date.now();
  const insert = db.prepare("INSERT OR IGNORE INTO project_paths (path, created_at) VALUES (?, ?)").run(path, now);
  const row = db.prepare("SELECT id, path, created_at FROM project_paths WHERE path = ?").get(path);
  return { path: row, created: insert.changes > 0 };
}

export function removeProjectPath(id) {
  const db = getDb();
  const result = db.prepare("DELETE FROM project_paths WHERE id = ?").run(id);
  return result.changes > 0;
}
