import fs from "fs";
import path from "path";
import db from "../db/index.js";
import { runDb } from "../db/helpers.js";
import { runCommand } from "../utils/git.js";
import { walkFiles } from "../utils/files.js";
import { getSetting } from "../utils/settings.js";
import { getTeamRoot } from "./install.js";
import { parseDefinition } from "./parse.js";

export async function collectTeamFiles() {
  const teamRoot = getTeamRoot();
  if (!fs.existsSync(teamRoot)) return [];
  return walkFiles(teamRoot);
}

export async function loadDefinitions() {
  const repoPath = await getSetting("repoPath");
  if (!repoPath || !fs.existsSync(repoPath)) throw new Error("Repo path not found. Configure settings and clone the repo first.");
  const repoFiles = await walkFiles(repoPath);
  const teamFiles = await collectTeamFiles();
  const normalizedRepoFiles = repoFiles.filter((filePath) => !filePath.includes(path.join(repoPath, ".git")));
  const trackedRepoFiles = new Set();
  try {
    const trackedOutput = await runCommand("git ls-files -z", { cwd: repoPath });
    for (const relativePath of trackedOutput.split("\0").filter(Boolean)) trackedRepoFiles.add(path.resolve(repoPath, relativePath));
  } catch (_error) {
    for (const filePath of normalizedRepoFiles) trackedRepoFiles.add(path.resolve(filePath));
  }
  const repoDefinitions = await Promise.all(normalizedRepoFiles.map((filePath) => parseDefinition(filePath)));
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
          (key, name, description, tags, schema, version, content, type, filePath, source, inTeam, status, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            updatedAt = excluded.updatedAt`,
      [definition.key, definition.name, definition.description, definition.tags, definition.schema, definition.version, definition.content, definition.type, definition.filePath, source, inTeam, status, now],
      (err) => err ? reject(err) : resolve());
    });
  }

  for (const definition of teamDefinitions) {
    if (repoKeyMap.has(definition.key)) continue;
    const type = path.basename(path.dirname(definition.filePath)).toLowerCase();
    await new Promise((resolve, reject) => {
      db.run(`INSERT INTO definitions
          (key, name, description, tags, schema, version, content, type, filePath, source, inTeam, status, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            updatedAt = excluded.updatedAt`,
      [definition.key, definition.name, definition.description, definition.tags, definition.schema, definition.version, definition.content, type, definition.filePath, "team", 1, "local-only", now],
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

  return { repoCount: normalizedRepoFiles.length, teamCount: teamFiles.length };
}
