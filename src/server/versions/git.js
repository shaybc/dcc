import path from "path";
import { getSetting } from "../utils/settings.js";
import { runCommand } from "../utils/git.js";
import { parseDefinitionContent } from "../definitions/parse.js";
import { parseDefinitionTagsForMetadata } from "../definitions/metadata.js";

export function parseGitLogEntries(logOutput) {
  return String(logOutput || "").split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const [hash = "", authorName = "", authorEmail = "", date = "", ...messageParts] = line.split("|");
    return { hash, author: [authorName, authorEmail && `<${authorEmail}>`].filter(Boolean).join(" ").trim(), date, message: messageParts.join("|") };
  }).filter((entry) => entry.hash);
}

export function normalizeHistoricalVersion(rawVersion, commitHash, takenVersions) {
  const normalized = String(rawVersion || "").trim();
  const fallback = `commit-${String(commitHash || "").slice(0, 7) || "unknown"}`;
  let nextVersion = normalized || fallback;
  if (!takenVersions.has(nextVersion)) { takenVersions.add(nextVersion); return nextVersion; }
  let suffix = 1;
  while (takenVersions.has(`${nextVersion}-${suffix}`)) suffix += 1;
  const uniqueVersion = `${nextVersion}-${suffix}`;
  takenVersions.add(uniqueVersion);
  return uniqueVersion;
}

export async function loadVersionHistoryFromGit(definition) {
  const repoPath = await getSetting("repoPath");
  if (!repoPath || !definition?.filePath) return [];
  const absoluteRepoPath = path.resolve(repoPath);
  const absoluteDefinitionPath = path.resolve(definition.filePath);
  if (!absoluteDefinitionPath.startsWith(`${absoluteRepoPath}${path.sep}`)) return [];
  const relativePath = path.relative(absoluteRepoPath, absoluteDefinitionPath).replace(/\\/g, "/");
  const escapedPath = relativePath.replace(/["\\]/g, "\\$&");
  const gitLog = await runCommand(`git log --follow --pretty=format:"%H|%an|%ae|%ad|%s" --date=iso -- ${JSON.stringify(relativePath)}`, { cwd: absoluteRepoPath });
  const commits = parseGitLogEntries(gitLog);
  const takenVersions = new Set();
  const versions = [];
  for (const commit of commits) {
    try {
      const content = await runCommand(`git show ${commit.hash}:"${escapedPath}"`, { cwd: absoluteRepoPath });
      const parsed = parseDefinitionContent(content, definition.filePath);
      const version = normalizeHistoricalVersion(parsed.version, commit.hash, takenVersions);
      versions.push({
        definition_key: definition.key,
        version,
        commit_hash: commit.hash,
        commit_message: commit.message,
        commit_author: commit.author,
        commit_date: new Date(commit.date).toISOString(),
        content,
        metadata: JSON.stringify({ name: parsed.name, description: parsed.description, tags: parseDefinitionTagsForMetadata(parsed.tags), schema: parsed.schema, type: parsed.type })
      });
    } catch (_error) {}
  }
  return versions;
}
