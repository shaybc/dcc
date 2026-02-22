import express from "express";
import { allDb, runDb } from "../db/helpers.js";

const router = express.Router();

function normalizePackInput(payload) {
  const agentId = String(payload?.agentId || "").trim();
  const configId = String(payload?.configId || "").trim();
  const prompt = String(payload?.prompt || "");
  if (!agentId || !configId) {
    return null;
  }
  return { agentId, configId, prompt };
}

router.get("/api/agent-run-packs", async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query?.limit) || 30, 1), 100);
    const rows = await allDb(
      `SELECT agentId, configId, prompt, createdAt, updatedAt
       FROM agent_run_packs
       ORDER BY datetime(updatedAt) DESC
       LIMIT ?`,
      [limit]
    );
    res.json({ packs: rows });
  } catch (error) {
    res.status(500).json({ error: error.message || "Unable to load recent agent packs." });
  }
});

router.post("/api/agent-run-packs", async (req, res) => {
  try {
    const pack = normalizePackInput(req.body || {});
    if (!pack) {
      res.status(400).json({ error: "agentId and configId are required." });
      return;
    }

    const now = new Date().toISOString();
    await runDb(
      `INSERT INTO agent_run_packs (agentId, configId, prompt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(agentId, configId)
       DO UPDATE SET prompt = excluded.prompt, updatedAt = excluded.updatedAt`,
      [pack.agentId, pack.configId, pack.prompt, now, now]
    );

    await runDb(
      `DELETE FROM agent_run_packs
       WHERE id NOT IN (
         SELECT id FROM agent_run_packs ORDER BY datetime(updatedAt) DESC LIMIT 30
       )`
    );

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message || "Unable to save recent agent pack." });
  }
});

export default router;
