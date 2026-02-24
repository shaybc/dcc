import express from "express";
import fs from "fs/promises";
import path from "path";
import { getSetting, setSetting } from "../utils/settings.js";
import { allDb, runDb } from "../db/helpers.js";
import { getGeminiSettings, normalizeGeminiClient, normalizeGeminiModel, saveGeminiSettings } from "../utils/geminiSettings.js";
import {
  createAssetRepo,
  deleteAssetRepo,
  ensureAssetRepoMigration,
  listAssetRepos,
  updateAssetRepo,
  upsertLegacyAssetRepo,
} from "../utils/assetRepos.js";
import { getAiLogConfigSync, saveAiLogConfigToSettings } from "../utils/aiLogging.js";
import { getLoggerFileConfigSync, saveLoggerFileConfigToSettings } from "../utils/logger.js";

const router = express.Router();

function normalizeMaxRecommendedDefinitions(value, fallback = 8) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.min(8, Math.max(3, Math.round(numericValue)));
}


const DB_PATH = process.env.DCC_DB_PATH || path.join(import.meta.dirname, "../../../data", "dcc.sqlite");

router.get("/api/settings", async (req, res) => {
  try {
    const maxRecommendedDefinitions = normalizeMaxRecommendedDefinitions(await getSetting("maxRecommendedDefinitions"), 8);
    const gemini = await getGeminiSettings();
    await setSetting("maxRecommendedDefinitions", String(maxRecommendedDefinitions));
    const aiLogConfig = getAiLogConfigSync();
    const loggerFileConfig = getLoggerFileConfigSync();
    res.json({
      maxRecommendedDefinitions,
      openAiResponseLogEnabled: aiLogConfig.openAiResponseEnabled,
      aiClientTrafficLogEnabled: aiLogConfig.aiClientTrafficEnabled,
      aiResponseLogMaxLength: aiLogConfig.responseMaxLength,
      logFileMaxSizeMb: loggerFileConfig.maxSizeMb,
      logFileMaxFiles: loggerFileConfig.maxFiles,
      geminiClient: normalizeGeminiClient(gemini.client),
      geminiApiKey: gemini.apiKey,
      geminiModel: normalizeGeminiModel(gemini.model),
      geminiConnectorId: gemini.connectorId,
      geminiConnectorBaseUrl: gemini.connectorBaseUrl,
      geminiConnectorApiKey: gemini.connectorApiKey,
      geminiConnectorModel: normalizeGeminiModel(gemini.connectorModel),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/settings", async (req, res) => {
  const {
    repoUrl,
    repoPath,
    maxRecommendedDefinitions,
    geminiClient,
    geminiApiKey,
    geminiModel,
    geminiConnectorId,
    geminiConnectorBaseUrl,
    geminiConnectorApiKey,
    geminiConnectorModel,
    openAiResponseLogEnabled,
    aiClientTrafficLogEnabled,
    aiResponseLogMaxLength,
    logFileMaxSizeMb,
    logFileMaxFiles,
  } = req.body || {};
  try {
    if (repoUrl !== undefined || repoPath !== undefined) {
      await upsertLegacyAssetRepo(repoUrl, repoPath);
    }
    if (maxRecommendedDefinitions !== undefined) {
      const normalizedValue = normalizeMaxRecommendedDefinitions(maxRecommendedDefinitions, 8);
      await setSetting("maxRecommendedDefinitions", String(normalizedValue));
    }
    await saveGeminiSettings({
      client: geminiClient,
      apiKey: geminiApiKey,
      model: geminiModel,
      connectorId: geminiConnectorId,
      connectorBaseUrl: geminiConnectorBaseUrl,
      connectorApiKey: geminiConnectorApiKey,
      connectorModel: geminiConnectorModel,
    });
    await saveAiLogConfigToSettings({
      openAiResponseEnabled: openAiResponseLogEnabled,
      aiClientTrafficEnabled: aiClientTrafficLogEnabled,
      responseMaxLength: aiResponseLogMaxLength,
    });
    await saveLoggerFileConfigToSettings({
      maxSizeMb: logFileMaxSizeMb,
      maxFiles: logFileMaxFiles,
    });
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

router.post("/api/settings/export", async (req, res) => {
  try {
    const filePath = String(req.body?.filePath || "").trim();
    if (!filePath) {
      res.status(400).json({ error: "A destination path is required." });
      return;
    }

    await ensureAssetRepoMigration();
    const [settingsRows, assetRepos, devProjectRoots] = await Promise.all([
      allDb("SELECT key, value FROM settings ORDER BY key ASC"),
      allDb("SELECT name, remoteUrl, localPath, enabled FROM asset_repos ORDER BY id ASC"),
      allDb("SELECT path FROM dev_project_roots ORDER BY path ASC")
    ]);

    const exportPayload = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      settings: Object.fromEntries(settingsRows.map((row) => [row.key, row.value])),
      assetRepos: assetRepos.map((repo) => ({
        name: repo.name,
        remoteUrl: repo.remoteUrl,
        localPath: repo.localPath,
        enabled: Boolean(repo.enabled),
      })),
      devProjectRoots: devProjectRoots.map((root) => String(root.path || "").trim()).filter(Boolean),
    };

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, `${JSON.stringify(exportPayload, null, 2)}\n`, "utf8");

    res.json({ ok: true, filePath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/settings/import", async (req, res) => {
  try {
    const filePath = String(req.body?.filePath || "").trim();
    if (!filePath) {
      res.status(400).json({ error: "A source path is required." });
      return;
    }

    const fileContents = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(fileContents);
    const settings = parsed && typeof parsed.settings === "object" ? parsed.settings : {};
    const assetRepos = Array.isArray(parsed?.assetRepos) ? parsed.assetRepos : [];
    const devProjectRoots = Array.isArray(parsed?.devProjectRoots) ? parsed.devProjectRoots : [];

    await ensureAssetRepoMigration();
    await runDb("BEGIN TRANSACTION");
    try {
      await runDb("DELETE FROM settings");
      for (const [key, value] of Object.entries(settings)) {
        await runDb("INSERT INTO settings (key, value) VALUES (?, ?)", [String(key), String(value ?? "")]);
      }
      const maxRecommendedDefinitions = normalizeMaxRecommendedDefinitions(settings.maxRecommendedDefinitions, 8);
      await setSetting("maxRecommendedDefinitions", String(maxRecommendedDefinitions));

      await runDb("DELETE FROM asset_repos");
      const now = new Date().toISOString();
      for (const repo of assetRepos) {
        const name = String(repo?.name || "").trim();
        const remoteUrl = String(repo?.remoteUrl || "").trim();
        const localPath = String(repo?.localPath || "").trim();
        if (!name || !remoteUrl || !localPath) {
          continue;
        }
        await runDb(
          "INSERT INTO asset_repos (name, remoteUrl, localPath, enabled, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
          [name, remoteUrl, localPath, repo?.enabled === false ? 0 : 1, now, now]
        );
      }

      await runDb("DELETE FROM dev_project_roots");
      for (const root of devProjectRoots) {
        const trimmedRoot = String(root || "").trim();
        if (!trimmedRoot) {
          continue;
        }
        await runDb("INSERT OR IGNORE INTO dev_project_roots (path) VALUES (?)", [trimmedRoot]);
      }

      await runDb("COMMIT");
    } catch (error) {
      await runDb("ROLLBACK");
      throw error;
    }

    res.json({ ok: true, filePath });
  } catch (error) {
    const isJsonError = error instanceof SyntaxError;
    res.status(isJsonError ? 400 : 500).json({ error: isJsonError ? "Invalid JSON file." : error.message });
  }
});


router.post("/api/database/backup", async (req, res) => {
  try {
    const filePath = String(req.body?.filePath || "").trim();
    if (!filePath) {
      res.status(400).json({ error: "A destination path is required." });
      return;
    }

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.copyFile(DB_PATH, filePath);
    res.json({ ok: true, filePath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/database/restore", async (req, res) => {
  try {
    const filePath = String(req.body?.filePath || "").trim();
    if (!filePath) {
      res.status(400).json({ error: "A source path is required." });
      return;
    }

    await fs.access(filePath);
    await fs.copyFile(filePath, DB_PATH);
    res.json({ ok: true, filePath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
