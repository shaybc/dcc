import path from "path";
import { allDb, runDb } from "../db/helpers.js";
import { loadVersionHistoryFromGit } from "./git.js";
import { getSetting } from "../utils/settings.js";
import { runCommand } from "../utils/git.js";

export async function refreshDefinitionVersionCache(definition) {
  const versions = await loadVersionHistoryFromGit(definition);
  await runDb("DELETE FROM definition_versions WHERE definition_key = ?", [definition.key]);
  for (const version of versions) {
    await runDb(`INSERT OR REPLACE INTO definition_versions
      (definition_key, version, commit_hash, commit_message, commit_author, commit_date, content, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [version.definition_key, version.version, version.commit_hash, version.commit_message, version.commit_author, version.commit_date, version.content, version.metadata]);
  }
  return versions;
}

export async function getCachedDefinitionVersions(definitionKey) {
  return allDb(`SELECT id, definition_key, version, commit_hash, commit_message, commit_author, commit_date, metadata, created_at
     FROM definition_versions
     WHERE definition_key = ?
     ORDER BY datetime(commit_date) DESC, id DESC`, [definitionKey]);
}

export async function getVersionHistory(definition) {
  const cachedVersions = await getCachedDefinitionVersions(definition.key);
  if (cachedVersions.length === 0) {
    await refreshDefinitionVersionCache(definition);
    return getCachedDefinitionVersions(definition.key);
  }
  const latestCached = cachedVersions[0];
  if (!latestCached?.commit_hash) {
    await refreshDefinitionVersionCache(definition);
    return getCachedDefinitionVersions(definition.key);
  }
  try {
    const repoPath = await getSetting("repoPath");
    if (!repoPath || !definition?.filePath) return cachedVersions;
    const absoluteRepoPath = path.resolve(repoPath);
    const absoluteDefinitionPath = path.resolve(definition.filePath);
    if (!absoluteDefinitionPath.startsWith(`${absoluteRepoPath}${path.sep}`)) return cachedVersions;
    const relativePath = path.relative(absoluteRepoPath, absoluteDefinitionPath).replace(/\\/g, "/");
    const latestHash = await runCommand(`git log -n 1 --pretty=format:%H -- ${JSON.stringify(relativePath)}`, { cwd: absoluteRepoPath });
    if (latestHash && latestHash !== latestCached.commit_hash) {
      await refreshDefinitionVersionCache(definition);
      return getCachedDefinitionVersions(definition.key);
    }
  } catch (_error) {
    return cachedVersions;
  }
  return cachedVersions;
}
