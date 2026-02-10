import fs from "fs";
import express from "express";
import { runCommand } from "../utils/git.js";
import { ensureAssetRepoMigration, getEnabledAssetRepos } from "../utils/assetRepos.js";
import { loadDefinitions } from "../definitions/index.js";

const router = express.Router();

router.post("/api/clone-pull", async (req, res) => {
  try {
    await ensureAssetRepoMigration();
    const repos = await getEnabledAssetRepos();
    if (repos.length === 0) {
      res.status(400).json({ error: "No enabled asset repositories found in settings." });
      return;
    }

    for (const repo of repos) {
      if (!fs.existsSync(repo.localPath)) {
        await runCommand(`git clone ${repo.remoteUrl} ${repo.localPath}`);
      } else {
        await runCommand("git pull", { cwd: repo.localPath });
      }
    }

    res.json({ ok: true, synced: repos.length });
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
