import express from "express";
import { allDb, runDb } from "../db/helpers.js";

const router = express.Router();

function normalizePackInput(payload) {
  const agentId = String(payload?.agentId || "").trim();
  const configId = String(payload?.configId || "").trim();
  const prompt = String(payload?.prompt || "");
  const runOptions = payload?.runOptions || {};
  if (!agentId || !configId) {
    return null;
  }
  return {
    agentId,
    configId,
    prompt,
    runOptions: {
      verbose: Boolean(runOptions.verbose),
      readonly: Boolean(runOptions.readonly),
      denyRead: Boolean(runOptions.denyRead),
      denyList: Boolean(runOptions.denyList),
      denySearch: Boolean(runOptions.denySearch),
      denyFetch: Boolean(runOptions.denyFetch),
      denyDiff: Boolean(runOptions.denyDiff),
      allowWrite: Boolean(runOptions.allowWrite),
      allowEdit: Boolean(runOptions.allowEdit),
      allowMultiEdit: Boolean(runOptions.allowMultiEdit),
      allowTerminal: Boolean(runOptions.allowTerminal),
      allowOnly: Array.isArray(runOptions.allowOnly)
        ? runOptions.allowOnly.map((entry) => String(entry || "").trim()).filter(Boolean)
        : [],
      denyTerminalCommands: Array.isArray(runOptions.denyTerminalCommands)
        ? runOptions.denyTerminalCommands.map((entry) => String(entry || "").trim()).filter(Boolean)
        : []
    }
  };
}

router.get("/api/agent-run-packs", async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query?.limit) || 30, 1), 100);
    let rows = [];
    try {
      rows = await allDb(
        `SELECT agentId, configId, prompt, runOptionsJson, createdAt, updatedAt
         FROM agent_run_packs
         ORDER BY datetime(updatedAt) DESC
         LIMIT ?`,
        [limit]
      );
    } catch (error) {
      if (!String(error?.message || "").includes("runOptionsJson")) {
        throw error;
      }
      rows = await allDb(
        `SELECT agentId, configId, prompt, createdAt, updatedAt
         FROM agent_run_packs
         ORDER BY datetime(updatedAt) DESC
         LIMIT ?`,
        [limit]
      );
    }
    res.json({
      packs: rows.map((row) => {
        let runOptions = {};
        try {
          runOptions = JSON.parse(row.runOptionsJson || "{}");
        } catch {
          runOptions = {};
        }
        return {
          agentId: row.agentId,
          configId: row.configId,
          prompt: row.prompt,
          runOptions,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        };
      })
    });
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
    try {
      await runDb(
        `INSERT INTO agent_run_packs (agentId, configId, prompt, runOptionsJson, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(agentId, configId)
         DO UPDATE SET prompt = excluded.prompt, runOptionsJson = excluded.runOptionsJson, updatedAt = excluded.updatedAt`,
        [pack.agentId, pack.configId, pack.prompt, JSON.stringify(pack.runOptions || {}), now, now]
      );
    } catch (error) {
      if (!String(error?.message || "").includes("runOptionsJson")) {
        throw error;
      }
      await runDb(
        `INSERT INTO agent_run_packs (agentId, configId, prompt, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(agentId, configId)
         DO UPDATE SET prompt = excluded.prompt, updatedAt = excluded.updatedAt`,
        [pack.agentId, pack.configId, pack.prompt, now, now]
      );
    }

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
