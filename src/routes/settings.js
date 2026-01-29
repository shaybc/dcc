import { Router } from "express";
import { syncAiAssetsRepo } from "../services/aiAssetsRepoService.js";
import { getAiAssetsRepoUrl, getConfigRepoPath, setSetting } from "../services/settingsService.js";

export const settingsRouter = Router();

settingsRouter.get("/", (req, res) => {
  res.json({
    configRepoPath: getConfigRepoPath(),
    aiAssetsRepoUrl: getAiAssetsRepoUrl()
  });
});

settingsRouter.put("/", (req, res) => {
  const { configRepoPath, aiAssetsRepoUrl } = req.body || {};
  if (typeof configRepoPath !== "string" || configRepoPath.trim().length === 0) {
    return res.status(400).json({ error: "configRepoPath is required." });
  }
  if (typeof aiAssetsRepoUrl !== "string" || aiAssetsRepoUrl.trim().length === 0) {
    return res.status(400).json({ error: "aiAssetsRepoUrl is required." });
  }
  setSetting("configRepoPath", configRepoPath.trim());
  setSetting("aiAssetsRepoUrl", aiAssetsRepoUrl.trim());
  return res.json({ configRepoPath: configRepoPath.trim(), aiAssetsRepoUrl: aiAssetsRepoUrl.trim() });
});

settingsRouter.post("/sync-ai-assets", async (req, res) => {
  try {
    const result = await syncAiAssetsRepo();
    return res.json(result);
  } catch (error) {
    const status = error?.status || 500;
    return res.status(status).json({ error: error?.message || "Failed to sync AI Assets repo." });
  }
});
