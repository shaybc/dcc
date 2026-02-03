import { getDb } from "./sqlite.js";

/**
 * Runs schema migrations. This is intentionally simple:
 * - SQLite file is created automatically by better-sqlite3.
 * - Migrations are idempotent with IF NOT EXISTS.
 */
export function migrate() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      workflow_version TEXT NOT NULL,
      repo_path TEXT NOT NULL,
      branch TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      finished_at INTEGER,
      pr_url TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS run_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      step_name TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      finished_at INTEGER,
      detail TEXT,
      FOREIGN KEY(run_id) REFERENCES runs(id)
    );

    -- AI call audit log (Mission Control-like observability)
    -- Stores full prompt text (user + system), best-effort context refs, and a short response preview.
    CREATE TABLE IF NOT EXISTS ai_calls (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      endpoint TEXT NOT NULL,
      model TEXT NOT NULL,
      is_stream INTEGER NOT NULL,
      latency_ms INTEGER NOT NULL,
      http_status INTEGER NOT NULL,

      prompt_full TEXT NOT NULL,
      context_refs_json TEXT NOT NULL,
      reply_preview TEXT NOT NULL,
      error TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_ai_calls_created_at ON ai_calls(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_calls_model ON ai_calls(model);

    CREATE TABLE IF NOT EXISTS definitions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      source TEXT NOT NULL,
      content TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_definitions_name ON definitions(name);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_paths (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    );
  `);
}
