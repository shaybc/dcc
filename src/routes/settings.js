import { Router } from "express";
import { getConfigRepoPath, setSetting } from "../services/settingsService.js";

export const settingsRouter = Router();

settingsRouter.get("/", (req, res) => {
  res.json({
    configRepoPath: getConfigRepoPath()
  });
});

settingsRouter.put("/", (req, res) => {
  const { configRepoPath } = req.body || {};
  if (typeof configRepoPath !== "string" || configRepoPath.trim().length === 0) {
    return res.status(400).json({ error: "configRepoPath is required." });
  }
  setSetting("configRepoPath", configRepoPath.trim());
  return res.json({ configRepoPath: configRepoPath.trim() });
});
