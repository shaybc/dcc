import express from "express";
import { getSetting, setSetting } from "../utils/settings.js";
import {
  createAssetRepo,
  deleteAssetRepo,
  ensureAssetRepoMigration,
  listAssetRepos,
  updateAssetRepo,
  upsertLegacyAssetRepo,
} from "../utils/assetRepos.js";

const router = express.Router();

function normalizeMaxRecommendedDefinitions(value, fallback = 8) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.min(8, Math.max(3, Math.round(numericValue)));
}

router.get("/api/settings", async (req, res) => {
  try {
    const maxRecommendedDefinitions = normalizeMaxRecommendedDefinitions(await getSetting("maxRecommendedDefinitions"), 8);
    await setSetting("maxRecommendedDefinitions", String(maxRecommendedDefinitions));
    res.json({ maxRecommendedDefinitions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/settings", async (req, res) => {
  const { repoUrl, repoPath, maxRecommendedDefinitions } = req.body || {};
  try {
    if (repoUrl !== undefined || repoPath !== undefined) {
      await upsertLegacyAssetRepo(repoUrl, repoPath);
    }
    if (maxRecommendedDefinitions !== undefined) {
      const normalizedValue = normalizeMaxRecommendedDefinitions(maxRecommendedDefinitions, 8);
      await setSetting("maxRecommendedDefinitions", String(normalizedValue));
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/asset-repos", async (req, res) => {
  try {
    await ensureAssetRepoMigration();
    const repos = await listAssetRepos();
    res.json(repos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/asset-repos", async (req, res) => {
  try {
    await ensureAssetRepoMigration();
    const repo = await createAssetRepo(req.body || {});
    res.status(201).json(repo);
  } catch (error) {
    const status = /required/i.test(error.message) ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
});

router.put("/api/asset-repos/:id", async (req, res) => {
  try {
    await ensureAssetRepoMigration();
    const repo = await updateAssetRepo(Number(req.params.id), req.body || {});
    if (!repo) {
      res.status(404).json({ error: "Asset repository not found." });
      return;
    }
    res.json(repo);
  } catch (error) {
    const status = /required/i.test(error.message) ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
});

router.delete("/api/asset-repos/:id", async (req, res) => {
  try {
    await ensureAssetRepoMigration();
    const deleted = await deleteAssetRepo(Number(req.params.id));
    if (!deleted) {
      res.status(404).json({ error: "Asset repository not found." });
      return;
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
