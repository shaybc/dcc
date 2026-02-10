import fs from "fs";
import path from "path";
import db from "../db/index.js";
import { runDb } from "../db/helpers.js";
import { runCommand } from "../utils/git.js";
import { walkFiles } from "../utils/files.js";
import { ensureAssetRepoMigration, getEnabledAssetRepos } from "../utils/assetRepos.js";
import { getTeamRoot } from "./install.js";
import { parseDefinition } from "./parse.js";

export async function collectTeamFiles() {
  const teamRoot = getTeamRoot();
  if (!fs.existsSync(teamRoot)) return [];
  return walkFiles(teamRoot);
}

export async function loadDefinitions() {
  await ensureAssetRepoMigration();
  const enabledRepos = await getEnabledAssetRepos();
  const availableRepos = enabledRepos.filter((repo) => fs.existsSync(repo.localPath));
  if (availableRepos.length === 0) {
    throw new Error("No cloned enabled asset repositories found. Configure settings and clone repositories first.");
  }

  const repoFiles = [];
  const trackedRepoFiles = new Set();

  const isGitInternalPath = (filePath, repoRoot) => {
    const relativePath = path.relative(repoRoot, filePath);
    if (!relativePath || relativePath.startsWith("..")) return false;
    return relativePath.split(path.sep).includes(".git");
  };

  for (const repo of availableRepos) {
    const files = await walkFiles(repo.localPath);
    for (const filePath of files) {
      if (isGitInternalPath(filePath, repo.localPath)) continue;
      repoFiles.push({
        filePath,
        repoId: repo.id,
        repoName: repo.name,
      });
    }
    try {
      const trackedOutput = await runCommand("git ls-files -z", { cwd: repo.localPath });
      for (const relativePath of trackedOutput.split("\0").filter(Boolean)) {
        trackedRepoFiles.add(path.resolve(repo.localPath, relativePath));
      }
    } catch (_error) {
      for (const filePath of files) trackedRepoFiles.add(path.resolve(filePath));
    }
  }

  const teamFiles = await collectTeamFiles();
  const repoDefinitions = (await Promise.all(repoFiles.map(async (repoFile) => {
    const definition = await parseDefinition(repoFile.filePath);
    if (!definition.dccUri) {
      definition.key = `${definition.type}/${repoFile.repoId}:${path.basename(repoFile.filePath)}`;
    }
    return {
      ...definition,
      repoId: repoFile.repoId,
      repoName: repoFile.repoName,
    };
  })));
  const teamDefinitions = await Promise.all(teamFiles.map((filePath) => parseDefinition(filePath)));
  const repoKeyMap = new Map(repoDefinitions.map((definition) => [definition.key, definition.filePath]));
  const teamKeyMap = new Set(teamDefinitions.map((definition) => definition.key));
  const now = new Date().toISOString();

  for (const definition of repoDefinitions) {
    const inTeam = teamKeyMap.has(definition.key) ? 1 : 0;
    const absoluteFilePath = path.resolve(definition.filePath);
    const source = trackedRepoFiles.has(absoluteFilePath) ? "repo" : "untracked";
    const status = inTeam ? "saved" : "repo";
    await new Promise((resolve, reject) => {
      db.run(`INSERT INTO definitions
          (key, name, description, tags, schema, version, content, type, filePath, source, inTeam, status, updatedAt, repoId, repoName)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET
            name = excluded.name,
            description = excluded.description,
            tags = excluded.tags,
            schema = excluded.schema,
            version = excluded.version,
            content = excluded.content,
            type = excluded.type,
            filePath = excluded.filePath,
            source = excluded.source,
            inTeam = excluded.inTeam,
            status = excluded.status,
            updatedAt = excluded.updatedAt,
            repoId = excluded.repoId,
            repoName = excluded.repoName`,
      [definition.key, definition.name, definition.description, definition.tags, definition.schema, definition.version, definition.content, definition.type, definition.filePath, source, inTeam, status, now, definition.repoId, definition.repoName],
      (err) => err ? reject(err) : resolve());
    });
  }

  for (const definition of teamDefinitions) {
    if (repoKeyMap.has(definition.key)) continue;
    const type = path.basename(path.dirname(definition.filePath)).toLowerCase();
    await new Promise((resolve, reject) => {
      db.run(`INSERT INTO definitions
          (key, name, description, tags, schema, version, content, type, filePath, source, inTeam, status, updatedAt, repoId, repoName)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET
            name = excluded.name,
            description = excluded.description,
            tags = excluded.tags,
            schema = excluded.schema,
            version = excluded.version,
            content = excluded.content,
            type = excluded.type,
            filePath = excluded.filePath,
            source = excluded.source,
            inTeam = excluded.inTeam,
            status = excluded.status,
            updatedAt = excluded.updatedAt,
            repoId = excluded.repoId,
            repoName = excluded.repoName`,
      [definition.key, definition.name, definition.description, definition.tags, definition.schema, definition.version, definition.content, type, definition.filePath, "team", 1, "local-only", now, null, null],
      (err) => err ? reject(err) : resolve());
    });
  }

  const repoKeys = [...repoKeyMap.keys()];
  if (repoKeys.length > 0) await runDb(`DELETE FROM definitions WHERE source IN ('repo', 'untracked') AND key NOT IN (${repoKeys.map(() => "?").join(", ")})`, repoKeys);
  else await runDb("DELETE FROM definitions WHERE source IN ('repo', 'untracked')");

  const teamKeys = [...teamKeyMap];
  if (teamKeys.length > 0) await runDb(`DELETE FROM definitions WHERE source = 'team' AND key NOT IN (${teamKeys.map(() => "?").join(", ")})`, teamKeys);
  else await runDb("DELETE FROM definitions WHERE source = 'team'");

  await runDb("DELETE FROM project_definition_copies WHERE definitionKey NOT IN (SELECT key FROM definitions)");

  return { repoCount: repoFiles.length, teamCount: teamFiles.length, repoRoots: availableRepos.map((repo) => repo.localPath) };
}
