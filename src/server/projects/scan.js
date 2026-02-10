import fs from "fs";
import path from "path";
import { runDb } from "../db/helpers.js";

const fsp = fs.promises;

export async function scanDevProjects(roots) {
  const projects = new Set();
  async function scanDir(dir) {
    let stat;
    try { stat = await fsp.stat(dir); } catch (_error) { return; }
    if (!stat.isDirectory()) return;
    const gitPath = path.join(dir, ".git");
    try {
      const gitStat = await fsp.stat(gitPath);
      if (gitStat.isDirectory()) { projects.add(dir); return; }
    } catch (_error) {}
    let entries = [];
    try { entries = await fsp.readdir(dir, { withFileTypes: true }); } catch (_error) { return; }
    for (const entry of entries) if (entry.isDirectory()) await scanDir(path.join(dir, entry.name));
  }
  for (const root of roots) if (root) await scanDir(root);
  return Array.from(projects).sort();
}

export async function refreshDevProjects(roots) {
  const projects = await scanDevProjects(roots);
  await runDb("DELETE FROM dev_projects");
  for (const project of projects) await runDb("INSERT OR IGNORE INTO dev_projects (path) VALUES (?)", [project]);
  return projects;
}
