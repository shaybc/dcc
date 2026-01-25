// src/routes/aiCalls.js
import express from "express";
import { z } from "zod";
import { getDb } from "../db/sqlite.js";

export const aiCallsRouter = express.Router();

const ListSchema = z.object({
  limit: z.coerce.number().min(1).max(200).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  model: z.string().optional().default(""),
  endpoint: z.string().optional().default(""),
  q: z.string().optional().default("")
});

aiCallsRouter.get("/", (req, res) => {
  const parsed = ListSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.message });
  }

  const { limit, offset, model, endpoint, q } = parsed.data;
  const db = getDb();

  const where = [];
  const params = { limit, offset };

  if (model) {
    where.push("model = @model");
    params.model = model;
  }
  if (endpoint) {
    where.push("endpoint = @endpoint");
    params.endpoint = endpoint;
  }
  if (q) {
    where.push("(prompt_full LIKE @q OR reply_preview LIKE @q OR error LIKE @q)");
    params.q = `%${q}%`;
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = db
    .prepare(
      `SELECT id, created_at, endpoint, model, is_stream, latency_ms, http_status,
              context_refs_json, reply_preview, error
       FROM ai_calls
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT @limit OFFSET @offset`
    )
    .all(params);

  res.json({ ok: true, data: { rows } });
});

aiCallsRouter.get("/:id", (req, res) => {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, created_at, endpoint, model, is_stream, latency_ms, http_status,
              prompt_full, context_refs_json, reply_preview, error
       FROM ai_calls
       WHERE id = ?`
    )
    .get(req.params.id);

  if (!row) return res.status(404).json({ ok: false, error: "Not found" });
  res.json({ ok: true, data: row });
});
