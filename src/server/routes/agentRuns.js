import express from "express";
import fs from "fs/promises";
import { getDb } from "../db/helpers.js";
import { getProjectDestinationInfo } from "../definitions/install.js";
import { agentRunManager } from "../services/agentRunManager.js";
import { logError, logInfo } from "../utils/logger.js";

const router = express.Router();

function normalizePayload(payload) {
  const agentId = Number(payload?.agentId);
  const configId = Number(payload?.configId);
  const prompt = String(payload?.prompt || "");
  const projectPath = String(payload?.projectPath || "").trim();

  if (!Number.isFinite(agentId) || !Number.isFinite(configId) || !projectPath) {
    return null;
  }

  return { agentId, configId, prompt, projectPath };
}

async function resolveInstalledDefinitionPath(definitionId, expectedType, projectPath) {
  const row = await getDb("SELECT id, type, filePath FROM definitions WHERE id = ?", [definitionId]);
  if (!row) {
    throw new Error(`Definition ${definitionId} was not found.`);
  }

  const destination = getProjectDestinationInfo(projectPath, row.type, row.filePath);
  if (!destination) {
    throw new Error(`Definition ${definitionId} has unsupported type '${row.type}'.`);
  }

  if (destination.normalizedType !== expectedType) {
    throw new Error(`Definition ${definitionId} is not a ${expectedType.slice(0, -1)} definition.`);
  }

  try {
    await fs.access(destination.destPath);
  } catch (_error) {
    throw new Error(`Definition ${definitionId} is not installed in the selected project: ${destination.destPath}`);
  }

  return destination.destPath;
}

router.post("/api/agent-runs", async (req, res) => {
  try {
    const payload = normalizePayload(req.body || {});
    if (!payload) {
      res.status(400).json({ error: "agentId, configId, and projectPath are required." });
      return;
    }

    const [agentPath, configPath] = await Promise.all([
      resolveInstalledDefinitionPath(payload.agentId, "agents", payload.projectPath),
      resolveInstalledDefinitionPath(payload.configId, "configs", payload.projectPath)
    ]);

    const run = agentRunManager.startRun({
      projectPath: payload.projectPath,
      agentPath,
      configPath,
      prompt: payload.prompt
    });

    logInfo("Agent run launch request succeeded", {
      runId: run?.runId,
      projectPath: payload.projectPath,
      agentId: payload.agentId,
      configId: payload.configId
    });

    res.status(201).json({ run });
  } catch (error) {
    logError("Agent run launch request failed", { error: error.message, payload: req.body || {} });
    res.status(500).json({ error: error.message || "Unable to launch agent." });
  }
});

router.get("/api/agent-runs/:runId", (req, res) => {
  const run = agentRunManager.getRunSnapshot(String(req.params.runId || ""));
  if (!run) {
    res.status(404).json({ error: "Run not found." });
    return;
  }
  res.json({ run });
});

router.get("/api/agent-runs/:runId/logs", (req, res) => {
  const logs = agentRunManager.getRunLogs(String(req.params.runId || ""), { since: req.query?.since });
  if (!logs) {
    res.status(404).json({ error: "Run not found." });
    return;
  }
  res.json(logs);
});

router.get("/api/agent-runs/:runId/stream", (req, res) => {
  const runId = String(req.params.runId || "");
  const run = agentRunManager.getRunSnapshot(runId);
  if (!run) {
    res.status(404).json({ error: "Run not found." });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const logSnapshot = agentRunManager.getRunLogs(runId, { since: 0 });
  res.write(`event: snapshot\n`);
  res.write(`data: ${JSON.stringify({ run, logs: logSnapshot?.entries || [] })}\n\n`);

  const unsubscribe = agentRunManager.subscribe(runId, (message) => {
    res.write(`event: ${message.type}\n`);
    res.write(`data: ${JSON.stringify(message)}\n\n`);
  });

  const heartbeat = setInterval(() => {
    res.write("event: ping\ndata: {}\n\n");
  }, 15000);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

router.post("/api/agent-runs/:runId/kill", (req, res) => {
  const runId = String(req.params.runId || "");
  const killed = agentRunManager.killRun(runId);
  if (!killed) {
    res.status(404).json({ error: "Run not found or already terminated." });
    return;
  }
  res.json({ ok: true });
});

export default router;
