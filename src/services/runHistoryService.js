import { getDb } from "../db/sqlite.js";
import { randomUUID } from "crypto";

export function createRun({ workflowId, workflowVersion, repoPath, branch }) {
  const db = getDb();
  const id = randomUUID();
  const startedAt = Date.now();
  db.prepare(`
    INSERT INTO runs (id, workflow_id, workflow_version, repo_path, branch, status, started_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, workflowId, workflowVersion, repoPath, branch, "running", startedAt);
  return id;
}

export function finishRun({ runId, status, prUrl = null, notes = null }) {
  const db = getDb();
  db.prepare(`
    UPDATE runs SET status=?, finished_at=?, pr_url=?, notes=?
    WHERE id=?
  `).run(status, Date.now(), prUrl, notes, runId);
}

export function listRuns({ limit = 50 }) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM runs ORDER BY started_at DESC LIMIT ?
  `).all(limit);
}

export function getRun(runId) {
  const db = getDb();
  const run = db.prepare(`SELECT * FROM runs WHERE id=?`).get(runId);
  const steps = db.prepare(`SELECT * FROM run_steps WHERE run_id=? ORDER BY id ASC`).all(runId);
  return { run, steps };
}

export function addStep({ runId, stepName, status = "running", detail = null }) {
  const db = getDb();
  const startedAt = Date.now();
  const res = db.prepare(`
    INSERT INTO run_steps (run_id, step_name, status, started_at, detail)
    VALUES (?, ?, ?, ?, ?)
  `).run(runId, stepName, status, startedAt, detail);
  return res.lastInsertRowid;
}

export function finishStep({ stepId, status, detail = null }) {
  const db = getDb();
  db.prepare(`
    UPDATE run_steps SET status=?, finished_at=?, detail=?
    WHERE id=?
  `).run(status, Date.now(), detail, stepId);
}
