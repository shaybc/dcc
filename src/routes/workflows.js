import express from "express";
import { createRun, finishRun } from "../services/runHistoryService.js";
import { runWorkflow } from "../services/workflowRunner.js";

export const workflowsRouter = express.Router();

/**
 * MVP workflow catalog (static). Replace by reading .continue/workflows/*.yaml in future.
 */
const WORKFLOWS = [
  { id: "java-monolith-to-microservice", version: "0.1.0", title: "Java monolith → microservice scaffold (scaffold)" },
  { id: "java-openrewrite-upgrade", version: "0.1.0", title: "OpenRewrite upgrade (scaffold)" }
];

workflowsRouter.get("/", (req, res) => {
  res.json({ workflows: WORKFLOWS });
});

workflowsRouter.post("/:id/run", async (req, res) => {
  const workflowId = req.params.id;
  const wf = WORKFLOWS.find(w => w.id === workflowId);
  if (!wf) return res.status(404).json({ error: "Unknown workflow" });

  const repoPath = req.body?.repoPath;
  const branch = req.body?.branch;
  if (!repoPath || !branch) {
    return res.status(400).json({ error: "repoPath and branch are required" });
  }

  const runId = createRun({
    workflowId,
    workflowVersion: wf.version,
    repoPath,
    branch
  });

  // Fire-and-forget: run in background and update status when done.
  // Node will keep running because the server is alive; steps are stored in SQLite.
  (async () => {
    try {
      await runWorkflow({ runId, workflowId });
      finishRun({ runId, status: "success" });
    } catch (e) {
      finishRun({ runId, status: "failed", notes: String(e?.message || e) });
    }
  })();

  res.json({ runId, status: "running" });
});
