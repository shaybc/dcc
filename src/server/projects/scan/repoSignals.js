import fs from "fs";
import path from "path";
import { detectUnknownProjectWithAi } from "./aiDetection.js";
import { CORE_PLATFORMS, PROJECT_TYPES, SIGNAL_DETECTORS, TREE_CONTENT_READ_MAX_BYTES } from "./constants.js";
import { buildEntryMap, listRepoFiles, matchesGlobSuffix, readFileWithLimit } from "./filesystem.js";
import {
  chooseFallbackProjectType,
  collectProjectTechnologies,
  detectCorePlatform,
  detectDataFormatFallback,
  detectProjectType,
} from "./technology.js";

const fsp = fs.promises;

export async function detectRepoSignals(repoPath, rootEntries, options = {}) {
  const includeTreeSignals = options.includeTreeSignals !== false;
  const ecosystems = new Set();
  const detectedSignals = [];
  const entries = rootEntries || [];
  const entryMap = buildEntryMap(entries);
  const fileContentCache = new Map();
  let packageJsonCache = null;
  let repoFiles = null;

  async function getRepoFiles() {
    if (!repoFiles) {
      repoFiles = await listRepoFiles(repoPath);
    }
    return repoFiles;
  }

  async function readCachedFile(relativeFilePath) {
    if (!fileContentCache.has(relativeFilePath)) {
      const content = await readFileWithLimit(path.join(repoPath, relativeFilePath));
      fileContentCache.set(relativeFilePath, content);
    }
    return fileContentCache.get(relativeFilePath) || "";
  }

  async function readPackageJson() {
    if (packageJsonCache !== null) {
      return packageJsonCache;
    }

    const content = await readCachedFile("package.json");
    if (!content) {
      packageJsonCache = null;
      return packageJsonCache;
    }

    try {
      packageJsonCache = JSON.parse(content);
    } catch (_error) {
      packageJsonCache = null;
    }
    return packageJsonCache;
  }

  for (const detector of SIGNAL_DETECTORS) {
    let isMatch = false;

    if (detector.type === "file") {
      const entry = entryMap.get(detector.signal);
      isMatch = Boolean(entry && entry.isFile());
    } else if (detector.type === "glob") {
      isMatch = entries.some((entry) => entry.isFile() && matchesGlobSuffix(entry.name, detector.signal));
    } else if (detector.type === "path") {
      try {
        const stat = await fsp.stat(path.join(repoPath, detector.signal));
        isMatch = stat.isFile();
      } catch (_error) {
        isMatch = false;
      }
    } else if (detector.type === "package-dependency") {
      const packageJson = await readPackageJson();
      const deps = {
        ...(packageJson?.dependencies || {}),
        ...(packageJson?.devDependencies || {}),
        ...(packageJson?.peerDependencies || {}),
      };
      isMatch = Boolean(deps[detector.signal]);
    } else if (detector.type === "file-contains") {
      const [relativePath, containsText] = detector.signal.split("::");
      const content = await readCachedFile(relativePath);
      isMatch = Boolean(content && containsText && content.includes(containsText));
    } else if (detector.type === "tree-extension") {
      if (includeTreeSignals) {
        const files = await getRepoFiles();
        isMatch = files.some((file) => matchesGlobSuffix(file.name, detector.signal));
      }
    } else if (detector.type === "tree-extension-contains") {
      if (includeTreeSignals) {
        const files = await getRepoFiles();
        const [signalGlob, containsText] = detector.signal.split("::");
        for (const file of files) {
          if (!matchesGlobSuffix(file.name, signalGlob)) {
            continue;
          }
          const content = await readFileWithLimit(file.absolutePath, TREE_CONTENT_READ_MAX_BYTES);
          if (content.includes(containsText)) {
            isMatch = true;
            break;
          }
        }
      }
    }

    if (isMatch) {
      ecosystems.add(detector.ecosystem);
      detectedSignals.push(detector.signal);
    }
  }

  let projectType = detectProjectType(ecosystems);
  if (includeTreeSignals && !projectType && ecosystems.size === 0) {
    const dataFallback = await detectDataFormatFallback(getRepoFiles);
    if (dataFallback) {
      projectType = dataFallback.projectType;
      ecosystems.add(dataFallback.projectType);
      detectedSignals.push(...dataFallback.detectedSignals);
    }
  }

  if (!projectType) {
    projectType = chooseFallbackProjectType(ecosystems);
  }

  const repoFilesForTechnologies = await getRepoFiles();
  let projectTechnologies = collectProjectTechnologies({
    projectType: projectType || PROJECT_TYPES.UNKNOWN,
    ecosystems,
    repoFiles: repoFilesForTechnologies,
  });

  if (includeTreeSignals && projectTechnologies.length === 0) {
    const aiResult = await detectUnknownProjectWithAi(repoPath, entries, detectedSignals);
    if (aiResult) {
      projectType = aiResult.projectType;
      ecosystems.add(aiResult.projectType);
      detectedSignals.push(`ai:${aiResult.projectType}`);
      detectedSignals.push(...aiResult.detectedSignals.map((signal) => `ai:${signal}`));
      if (aiResult.reason) {
        detectedSignals.push(`ai:reason:${aiResult.reason.slice(0, 120)}`);
      }
      projectTechnologies = collectProjectTechnologies({
        projectType,
        ecosystems,
        repoFiles: repoFilesForTechnologies,
      });
    }
  }

  if (projectTechnologies.length === 0) {
    projectTechnologies = [PROJECT_TYPES.UNKNOWN];
    projectType = PROJECT_TYPES.UNKNOWN;
  }

  return {
    projectType: projectType || PROJECT_TYPES.UNKNOWN,
    corePlatform: detectCorePlatform(projectType || PROJECT_TYPES.UNKNOWN, projectTechnologies),
    detectedSignals: Array.from(new Set(detectedSignals)).sort((a, b) => a.localeCompare(b)),
    projectTechnologies,
  };
}

export function defaultCorePlatform() {
  return CORE_PLATFORMS.BACKEND;
}
