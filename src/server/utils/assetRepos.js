import path from "path";
import { allDb, getDb, runDb } from "../db/helpers.js";
import { getSetting, setSetting } from "./settings.js";

const DEFAULT_ASSETS_ROOT = path.resolve(process.cwd(), "ai_assets");

function normalizeRepo(row) {
  return {
    id: row.id,
    name: row.name,
    remoteUrl: row.remoteUrl,
    localPath: row.localPath,
    enabled: Boolean(row.enabled),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function getDefaultLocalPath(name = "repo") {
  const safeName = String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "repo";
  return path.join(DEFAULT_ASSETS_ROOT, safeName);
}

export async function listAssetRepos() {
  const rows = await allDb("SELECT * FROM asset_repos ORDER BY id ASC");
  return rows.map(normalizeRepo);
}

export async function getAssetRepo(id) {
  const row = await getDb("SELECT * FROM asset_repos WHERE id = ?", [id]);
  return row ? normalizeRepo(row) : null;
}

export async function createAssetRepo({ name, remoteUrl, localPath, enabled = true }) {
  const normalizedName = String(name || "").trim();
  const normalizedRemoteUrl = String(remoteUrl || "").trim();
  const normalizedLocalPath = String(localPath || "").trim();
  if (!normalizedName || !normalizedRemoteUrl || !normalizedLocalPath) {
    throw new Error("name, remoteUrl, and localPath are required.");
  }

  const timestamp = new Date().toISOString();
  const result = await runDb(
    `INSERT INTO asset_repos (name, remoteUrl, localPath, enabled, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [normalizedName, normalizedRemoteUrl, normalizedLocalPath, enabled ? 1 : 0, timestamp, timestamp]
  );
  await syncLegacyRepoSettings();
  return getAssetRepo(result.lastID);
}

export async function updateAssetRepo(id, updates = {}) {
  const existing = await getAssetRepo(id);
  if (!existing) {
    return null;
  }

  const nextName = updates.name === undefined ? existing.name : String(updates.name || "").trim();
  const nextRemoteUrl = updates.remoteUrl === undefined
    ? existing.remoteUrl
    : String(updates.remoteUrl || "").trim();
  const nextLocalPath = updates.localPath === undefined
    ? existing.localPath
    : String(updates.localPath || "").trim();

  if (!nextName || !nextRemoteUrl || !nextLocalPath) {
    throw new Error("name, remoteUrl, and localPath are required.");
  }

  const nextEnabled = updates.enabled === undefined ? existing.enabled : Boolean(updates.enabled);
  const timestamp = new Date().toISOString();
  await runDb(
    `UPDATE asset_repos
     SET name = ?, remoteUrl = ?, localPath = ?, enabled = ?, updatedAt = ?
     WHERE id = ?`,
    [nextName, nextRemoteUrl, nextLocalPath, nextEnabled ? 1 : 0, timestamp, id]
  );
  await syncLegacyRepoSettings();
  return getAssetRepo(id);
}

export async function deleteAssetRepo(id) {
  const result = await runDb("DELETE FROM asset_repos WHERE id = ?", [id]);
  await syncLegacyRepoSettings();
  return result.changes > 0;
}

export async function getEnabledAssetRepos() {
  const rows = await allDb("SELECT * FROM asset_repos WHERE enabled = 1 ORDER BY id ASC");
  return rows.map(normalizeRepo);
}

export async function ensureAssetRepoMigration() {
  const repoCount = await getDb("SELECT COUNT(*) AS count FROM asset_repos");
  if ((repoCount?.count || 0) > 0) {
    await syncLegacyRepoSettings();
    return;
  }

  const [repoUrl, repoPath] = await Promise.all([getSetting("repoUrl"), getSetting("repoPath")]);
  if (!repoUrl || !repoPath) {
    return;
  }

  const repoName = path.basename(repoPath) || "ai_assets";
  const timestamp = new Date().toISOString();
  await runDb(
    `INSERT INTO asset_repos (name, remoteUrl, localPath, enabled, createdAt, updatedAt)
     VALUES (?, ?, ?, 1, ?, ?)`,
    [repoName, repoUrl, repoPath, timestamp, timestamp]
  );
  await syncLegacyRepoSettings();
}

export async function upsertLegacyAssetRepo(repoUrl, repoPath) {
  const normalizedRepoUrl = String(repoUrl || "").trim();
  const normalizedRepoPath = String(repoPath || "").trim();
  if (!normalizedRepoUrl || !normalizedRepoPath) {
    return;
  }

  const existing = await getDb("SELECT id FROM asset_repos WHERE localPath = ?", [normalizedRepoPath]);
  if (existing?.id) {
    await updateAssetRepo(existing.id, { remoteUrl: normalizedRepoUrl, enabled: true });
    return;
  }

  await createAssetRepo({
    name: path.basename(normalizedRepoPath) || "ai_assets",
    remoteUrl: normalizedRepoUrl,
    localPath: normalizedRepoPath,
    enabled: true,
  });
}

export async function syncLegacyRepoSettings() {
  const primaryRepo = await getDb("SELECT remoteUrl, localPath FROM asset_repos WHERE enabled = 1 ORDER BY id ASC LIMIT 1");
  if (!primaryRepo) {
    await Promise.all([setSetting("repoUrl", ""), setSetting("repoPath", "")]);
    return;
  }
  await Promise.all([setSetting("repoUrl", primaryRepo.remoteUrl), setSetting("repoPath", primaryRepo.localPath)]);
}

export { DEFAULT_ASSETS_ROOT, getDefaultLocalPath };
