import fs from "fs";
import path from "path";
import express from "express";
import { runCommand } from "../utils/git.js";
import { ensureAssetRepoMigration, getEnabledAssetRepos } from "../utils/assetRepos.js";
import { loadDefinitions } from "../definitions/index.js";

const router = express.Router();

function resolveLocalRepoPath(localPath) {
  const configuredPath = String(localPath || "").trim();
  if (!configuredPath) {
    throw new Error("Invalid local path. Provide a local folder path.");
  }

  return path.resolve(configuredPath);
}

function shellEscape(value) {
  return `"${String(value).replace(/(["\$`])/g, "\\$1")}"`;
}

async function pullRepo(localPath) {
  try {
    await runCommand("git pull", { cwd: localPath });
  } catch {
    await runCommand("git pull --rebase", { cwd: localPath });
  }
}

router.post("/api/asset-repos/sync", async (req, res) => {
  try {
    await ensureAssetRepoMigration();
    const repos = await getEnabledAssetRepos();
    if (repos.length === 0) {
      res.status(400).json({ error: "No enabled asset repositories found in settings." });
      return;
    }

    const results = [];

    for (const repo of repos) {
      const result = {
        id: repo.id,
        name: repo.name,
        remoteUrl: repo.remoteUrl,
        configuredLocalPath: repo.localPath,
      };

      try {
        const localPath = resolveLocalRepoPath(repo.localPath);
        result.localPath = localPath;

        if (!fs.existsSync(localPath)) {
          await runCommand(`git clone ${shellEscape(repo.remoteUrl)} ${shellEscape(localPath)}`);
          result.status = "cloned";
        } else {
          const gitDir = path.join(localPath, ".git");
          if (!fs.existsSync(gitDir)) {
            const entries = fs.readdirSync(localPath, { withFileTypes: true });
            if (entries.length === 0) {
              await runCommand(`git clone ${shellEscape(repo.remoteUrl)} ${shellEscape(localPath)}`);
              result.status = "cloned";
            } else {
              throw new Error(`Local path exists but is not a git repository: ${localPath}`);
            }
          } else {
            await pullRepo(localPath);
            result.status = "pulled";
          }
        }
      } catch (error) {
        result.status = "failed";
        result.error = error?.message || "Unknown sync error.";

        console.error("[asset-repos/sync] Repository sync failed", {
          repoId: repo.id,
          repoName: repo.name,
          configuredLocalPath: repo.localPath,
          localPath: result.localPath || null,
          error: result.error,
        });
      }

      results.push(result);
    }

    res.json({
      ok: results.every((entry) => entry.status !== "failed"),
      results,
    });
  } catch (error) {
    console.error("[asset-repos/sync] Sync request failed", { error: error?.message || error });
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
