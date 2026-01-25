// src/services/ai/aiLogService.js
import { getDb } from "../../db/sqlite.js";
import { randomUUID } from "crypto";
import { env } from "../../utils/env.js";

/**
 * Stores a small but useful record for every OpenAI-compatible call.
 * Goal: investigation + reporting without persisting full code context.
 */
export function logAiCall({
  endpoint,
  model,
  isStream,
  latencyMs,
  httpStatus,
  promptFull,
  contextRefs,
  replyPreview,
  error = null
}) {
  if (!env.AI_LOG_ENABLED) return null;

  const db = getDb();
  const id = randomUUID();
  const createdAt = Date.now();

  db.prepare(`
    INSERT INTO ai_calls (
      id, created_at, endpoint, model, is_stream, latency_ms, http_status,
      prompt_full, context_refs_json, reply_preview, error
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    createdAt,
    endpoint,
    model,
    isStream ? 1 : 0,
    Math.max(0, Math.floor(latencyMs || 0)),
    httpStatus,
    String(promptFull || ""),
    JSON.stringify(Array.isArray(contextRefs) ? contextRefs : []),
    String(replyPreview || ""),
    error ? String(error) : null
  );

  return id;
}

export function listAiCalls({ limit = 50 }) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, created_at, endpoint, model, is_stream, latency_ms, http_status,
           context_refs_json, reply_preview, error
    FROM ai_calls
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit);

  return rows.map(r => ({
    ...r,
    context_refs: safeJsonParse(r.context_refs_json, [])
  }));
}

export function getAiCall(id) {
  const db = getDb();
  const r = db.prepare(`SELECT * FROM ai_calls WHERE id=?`).get(id);
  if (!r) return null;

  return {
    ...r,
    context_refs: safeJsonParse(r.context_refs_json, [])
  };
}

function safeJsonParse(s, fallback) {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}
