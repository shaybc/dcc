// src/routes/aiCalls.js
import express from "express";
import { listAiCalls, getAiCall } from "../services/ai/aiLogService.js";

export const aiCallsRouter = express.Router();

/**
 * GET /api/ai-calls?limit=50
 */
aiCallsRouter.get("/", (req, res) => {
  const limit = Number(req.query.limit || 50);
  res.json({ calls: listAiCalls({ limit }) });
});

/**
 * GET /api/ai-calls/:id
 */
aiCallsRouter.get("/:id", (req, res) => {
  const call = getAiCall(req.params.id);
  if (!call) return res.status(404).json({ error: "Not found" });
  res.json({ call });
});
