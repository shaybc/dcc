// src/services/ai/aiLogService.js
import crypto from "crypto";
import { env } from "../../utils/env.js";
import { getDb } from "../../db/sqlite.js";

/**
 * Local AI call logging for later investigation (Mission Control-like observability).
 *
 * This keeps the data minimal to reduce sensitive leakage:
 * - prompt_full: full user/system prompt text (configurable decision; keep for now)
 * - context_refs_json: names of context providers/files (best-effort)
 * - reply_preview: first N chars (AI_LOG_REPLY_PREVIEW_CHARS)
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
  error
}) {
  if (!env.AI_LOG_ENABLED) return;

  try {
    const db = getDb();
    const id = `ai_${crypto.randomUUID()}`;
    const createdAt = Date.now();
    db.prepare(
      `INSERT INTO ai_calls (
        id, created_at, endpoint, model, is_stream, latency_ms, http_status,
        prompt_full, context_refs_json, reply_preview, error
      ) VALUES (
        @id, @created_at, @endpoint, @model, @is_stream, @latency_ms, @http_status,
        @prompt_full, @context_refs_json, @reply_preview, @error
      )`
    ).run({
      id,
      created_at: createdAt,
      endpoint: String(endpoint || ""),
      model: String(model || ""),
      is_stream: isStream ? 1 : 0,
      latency_ms: Number(latencyMs || 0),
      http_status: Number(httpStatus || 0),
      prompt_full: String(promptFull || ""),
      context_refs_json: JSON.stringify(Array.isArray(contextRefs) ? contextRefs : []),
      reply_preview: String(replyPreview || ""),
      error: error ? String(error) : null
    });
  } catch {
    // Best-effort logging only. Never break the AI response path.
  }
}
