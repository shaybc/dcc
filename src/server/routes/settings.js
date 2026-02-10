import express from "express";
import { getSetting, setSetting } from "../utils/settings.js";

const router = express.Router();

router.get("/api/settings", async (req, res) => {
  try {
    const repoUrl = await getSetting("repoUrl");
    const repoPath = await getSetting("repoPath");
    res.json({ repoUrl: repoUrl || "", repoPath: repoPath || "" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/settings", async (req, res) => {
  const { repoUrl, repoPath } = req.body;
  try {
    if (repoUrl !== undefined) {
      await setSetting("repoUrl", repoUrl);
    }
    if (repoPath !== undefined) {
      await setSetting("repoPath", repoPath);
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/current-dev-project", async (req, res) => {
  try {
    const path = await getSetting("currentDevProject");
    res.json({ path: path || "" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/current-dev-project", async (req, res) => {
  try {
    const path = String(req.body?.path || "").trim();
    await setSetting("currentDevProject", path);
    res.json({ ok: true, path });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


export default router;
