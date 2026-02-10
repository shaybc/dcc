import fs from "fs";
import express from "express";
import { runCommand } from "../utils/git.js";
import { getSetting } from "../utils/settings.js";
import { loadDefinitions } from "../definitions/index.js";

const router = express.Router();

router.post("/api/clone-pull", async (req, res) => {
  try {
    const repoUrl = await getSetting("repoUrl");
    const repoPath = await getSetting("repoPath");
    if (!repoUrl || !repoPath) {
      res.status(400).json({ error: "Missing repoUrl or repoPath in settings." });
      return;
    }

    if (!fs.existsSync(repoPath)) {
      await runCommand(`git clone ${repoUrl} ${repoPath}`);
    } else {
      await runCommand("git pull", { cwd: repoPath });
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/load-definitions", async (req, res) => {
  try {
    const result = await loadDefinitions();
    res.json({ ok: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


export default router;
