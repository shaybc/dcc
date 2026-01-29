import fs from "fs";
import simpleGit from "simple-git";
import { getAiAssetsRepoUrl, getConfigRepoPath } from "./settingsService.js";

function buildSyncError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeGitMessage(error) {
  if (!error) {
    return "";
  }
  if (typeof error === "string") {
    return error;
  }
  if (error.message) {
    return error.message;
  }
  return String(error);
}

export async function syncAiAssetsRepo() {
  const repoPath = getConfigRepoPath();
  const repoUrl = getAiAssetsRepoUrl();

  if (!repoUrl || repoUrl.trim().length === 0) {
    throw buildSyncError("AI Assets repo URL is required to sync.", 400);
  }

  if (!repoPath || repoPath.trim().length === 0) {
    throw buildSyncError("Config repo path is required to sync.", 400);
  }

  if (!fs.existsSync(repoPath)) {
    await simpleGit().clone(repoUrl.trim(), repoPath);
    return {
      action: "cloned",
      repoPath,
      repoUrl: repoUrl.trim()
    };
  }

  const git = simpleGit(repoPath);
  try {
    const pullSummary = await git.pull();
    return {
      action: "pulled",
      repoPath,
      repoUrl: repoUrl.trim(),
      summary: pullSummary
    };
  } catch (error) {
    const message = normalizeGitMessage(error);
    if (message.includes("CONFLICT")) {
      throw buildSyncError(message, 409);
    }
    throw buildSyncError(message || "Failed to sync AI Assets repo.", 500);
  }
}
