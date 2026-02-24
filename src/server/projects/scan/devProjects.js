import fs from "fs";
import path from "path";
import { runDb } from "../../db/helpers.js";
import { readRootEntries, shouldSkipDirectoryName } from "./filesystem.js";
import { PROJECT_TYPES } from "./constants.js";
import { defaultCorePlatform, detectRepoSignals } from "./repoSignals.js";

const fsp = fs.promises;

export async function scanDevProjects(roots, options = {}) {
  const projects = new Map();
  const detectNonGitProjects = options.detectNonGitProjects === true;

  async function scanDir(dir) {
    let stat;
    try {
      stat = await fsp.stat(dir);
    } catch (_error) {
      return;
    }
    if (!stat.isDirectory()) {
      return;
    }

    const gitPath = path.join(dir, ".git");
    try {
      const gitStat = await fsp.stat(gitPath);
      if (gitStat.isDirectory()) {
        const rootEntries = await readRootEntries(dir);
        const metadata = await detectRepoSignals(dir, rootEntries);
        projects.set(dir, { path: dir, ...metadata });
        return;
      }
    } catch (_error) {}

    let entries = [];
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch (_error) {
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || shouldSkipDirectoryName(entry.name)) {
        continue;
      }
      await scanDir(path.join(dir, entry.name));
    }

    if (!detectNonGitProjects) {
      return;
    }

    const rootMetadata = await detectRepoSignals(dir, entries, { includeTreeSignals: false });
    if (rootMetadata.projectType !== PROJECT_TYPES.UNKNOWN || rootMetadata.detectedSignals.length > 0) {
      projects.set(dir, { path: dir, ...rootMetadata });
      return;
    }

    const metadata = await detectRepoSignals(dir, entries);
    const hasFiles = entries.some((entry) => entry.isFile());
    if (metadata.projectType !== PROJECT_TYPES.UNKNOWN || metadata.detectedSignals.length > 0 || hasFiles) {
      projects.set(dir, { path: dir, ...metadata });
    }
  }

  for (const root of roots) {
    if (root) {
      await scanDir(root);
    }
  }

  return Array.from(projects.values()).sort((a, b) => a.path.localeCompare(b.path));
}

export async function refreshDevProjects(roots) {
  const projects = await scanDevProjects(roots);
  const lastScannedAt = new Date().toISOString();

  await runDb("DELETE FROM dev_projects");
  for (const project of projects) {
    await runDb(
      "INSERT OR IGNORE INTO dev_projects (path, projectType, corePlatform, detectedSignals, projectTechnologies, lastScannedAt) VALUES (?, ?, ?, ?, ?, ?)",
      [
        project.path,
        project.projectType,
        project.corePlatform || defaultCorePlatform(),
        JSON.stringify(project.detectedSignals),
        JSON.stringify(project.projectTechnologies || []),
        lastScannedAt,
      ]
    );
  }

  return projects.map((project) => ({ ...project, lastScannedAt }));
}
