import { Router } from "express";
import { syncAiAssetsRepo } from "../services/aiAssetsRepoService.js";
import { copyAiAssetsToProject } from "../services/aiAssetsCopyService.js";
import {
  addProjectPath,
  getAiAssetsRepoUrl,
  getConfigRepoPath,
  listProjectPaths,
  removeProjectPath,
  setSetting
} from "../services/settingsService.js";

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

settingsRouter.post("/copy-ai-assets", (req, res) => {
  try {
    const { projectPath, selections, overwrite } = req.body || {};
    if (typeof projectPath !== "string" || projectPath.trim().length === 0) {
      return res.status(400).json({ error: "projectPath is required." });
    }
    if (!Array.isArray(selections) || selections.length === 0) {
      return res.status(400).json({ error: "At least one asset selection is required." });
    }
    const result = copyAiAssetsToProject({
      projectPath: projectPath.trim(),
      selections,
      overwrite: Boolean(overwrite)
    });
    if (result.conflicts && result.conflicts.length > 0 && !overwrite) {
      return res.status(409).json({
        error: "Some destination files already exist.",
        conflicts: result.conflicts
      });
    }
    return res.json(result);
  } catch (error) {
    const status = error?.status || 500;
    return res.status(status).json({ error: error?.message || "Failed to copy AI assets." });
  }
});

settingsRouter.get("/project-paths", (req, res) => {
  res.json({ paths: listProjectPaths() });
});

settingsRouter.post("/project-paths", (req, res) => {
  const { path } = req.body || {};
  if (typeof path !== "string" || path.trim().length === 0) {
    return res.status(400).json({ error: "path is required." });
  }
  const result = addProjectPath(path.trim());
  return res.json(result);
});

settingsRouter.delete("/project-paths/:id", (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Valid id is required." });
  }
  const removed = removeProjectPath(id);
  if (!removed) {
    return res.status(404).json({ error: "Project path not found." });
  }
  return res.json({ removed: true });
});
