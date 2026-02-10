import fs from "fs";
import path from "path";
import { runDb } from "../db/helpers.js";

const fsp = fs.promises;

const PROJECT_TYPES = {
  NODE: "node",
  PYTHON: "python",
  JAVA: "java",
  GO: "go",
  RUST: "rust",
  DOTNET: "dotnet",
  POLYGLOT: "polyglot",
  UNKNOWN: "unknown",
};

const SIGNAL_DETECTORS = [
  { signal: "package.json", ecosystem: PROJECT_TYPES.NODE, type: "file" },
  { signal: "pyproject.toml", ecosystem: PROJECT_TYPES.PYTHON, type: "file" },
  { signal: "requirements.txt", ecosystem: PROJECT_TYPES.PYTHON, type: "file" },
  { signal: "Pipfile", ecosystem: PROJECT_TYPES.PYTHON, type: "file" },
  { signal: "pom.xml", ecosystem: PROJECT_TYPES.JAVA, type: "file" },
  { signal: "build.gradle", ecosystem: PROJECT_TYPES.JAVA, type: "file" },
  { signal: "go.mod", ecosystem: PROJECT_TYPES.GO, type: "file" },
  { signal: "Cargo.toml", ecosystem: PROJECT_TYPES.RUST, type: "file" },
  { signal: "*.csproj", ecosystem: PROJECT_TYPES.DOTNET, type: "glob" },
  { signal: "*.sln", ecosystem: PROJECT_TYPES.DOTNET, type: "glob" },
];

function detectProjectType(ecosystems) {
  if (ecosystems.size === 0) {
    return PROJECT_TYPES.UNKNOWN;
  }
  if (ecosystems.size > 1) {
    return PROJECT_TYPES.POLYGLOT;
  }
  return Array.from(ecosystems)[0];
}

async function detectRepoSignals(repoPath) {
  const ecosystems = new Set();
  const detectedSignals = [];

  for (const detector of SIGNAL_DETECTORS) {
    if (detector.type === "file") {
      try {
        const stat = await fsp.stat(path.join(repoPath, detector.signal));
        if (stat.isFile()) {
          ecosystems.add(detector.ecosystem);
          detectedSignals.push(detector.signal);
        }
      } catch (_error) {}
      continue;
    }

    if (detector.type === "glob") {
      let entries = [];
      try {
        entries = await fsp.readdir(repoPath, { withFileTypes: true });
      } catch (_error) {
        continue;
      }
      const suffix = detector.signal.slice(1);
      const hasMatch = entries.some((entry) => entry.isFile() && entry.name.endsWith(suffix));
      if (hasMatch) {
        ecosystems.add(detector.ecosystem);
        detectedSignals.push(detector.signal);
      }
    }
  }

  return {
    projectType: detectProjectType(ecosystems),
    detectedSignals: detectedSignals.sort(),
  };
}

export async function scanDevProjects(roots) {
  const projects = new Map();

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
        const metadata = await detectRepoSignals(dir);
        projects.set(dir, {
          path: dir,
          ...metadata,
        });
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
      if (entry.isDirectory()) {
        await scanDir(path.join(dir, entry.name));
      }
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
      "INSERT OR IGNORE INTO dev_projects (path, projectType, detectedSignals, lastScannedAt) VALUES (?, ?, ?, ?)",
      [project.path, project.projectType, JSON.stringify(project.detectedSignals), lastScannedAt]
    );
  }

  return projects.map((project) => ({
    ...project,
    lastScannedAt,
  }));
}
