import express from "express";
import { allDb, runDb } from "../db/helpers.js";
import { refreshDevProjects } from "../projects/scan.js";

const router = express.Router();

router.get("/api/dev-project-roots", async (req, res) => {
  try {
    const rows = await allDb("SELECT id, path FROM dev_project_roots ORDER BY path ASC");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/dev-project-roots", async (req, res) => {
  try {
    const roots = Array.isArray(req.body?.roots) ? req.body.roots : [];
    await runDb("DELETE FROM dev_project_roots");
    for (const root of roots) {
      const trimmed = String(root || "").trim();
      if (!trimmed) {
        continue;
      }
      await runDb("INSERT OR IGNORE INTO dev_project_roots (path) VALUES (?)", [trimmed]);
    }
    const projects = await refreshDevProjects(roots.map((root) => String(root || "").trim()).filter(Boolean));
    res.json({ ok: true, projects });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/dev-projects", async (req, res) => {
  try {
    const rows = await allDb(
      "SELECT id, path, projectType, detectedSignals, lastScannedAt FROM dev_projects ORDER BY path ASC"
    );
    res.json(
      rows.map((row) => ({
        ...row,
        detectedSignals: row.detectedSignals ? JSON.parse(row.detectedSignals) : [],
      }))
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
