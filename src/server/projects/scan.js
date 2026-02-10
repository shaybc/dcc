import fs from "fs";
import path from "path";
import { runDb } from "../db/helpers.js";
import { GeminiAIStudioClient } from "../services/ai/geminiAIStudioClient.js";
import { env } from "../utils/env.js";

const fsp = fs.promises;

const PROJECT_TYPES = {
  NODE: "node",
  JAVASCRIPT: "javascript",
  HTML: "html",
  ANGULAR: "angular",
  PYTHON: "python",
  JAVA: "java",
  SPRINGBOOT: "springboot",
  GO: "go",
  RUST: "rust",
  DOTNET: "dotnet",
  CSHARP: "csharp",
  GROOVY: "groovy",
  ANDROID: "android",
  SWIFTUI: "swiftui",
  SWIFT: "swift",
  OBJECTIVE_C: "objective-c",
  CPP: "c++",
  POLYGLOT: "polyglot",
  UNKNOWN: "unknown",
};

const PROJECT_TYPE_VALUES = new Set(Object.values(PROJECT_TYPES));
const AI_ENABLED = env.PROJECT_SCAN_AI_ENABLED;
const aiClient = AI_ENABLED
  ? new GeminiAIStudioClient({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL })
  : null;

const SIGNAL_DETECTORS = [
  { signal: "package.json", ecosystem: PROJECT_TYPES.NODE, type: "file" },
  { signal: "jsconfig.json", ecosystem: PROJECT_TYPES.JAVASCRIPT, type: "file" },
  { signal: "*.js", ecosystem: PROJECT_TYPES.JAVASCRIPT, type: "glob" },
  { signal: "*.mjs", ecosystem: PROJECT_TYPES.JAVASCRIPT, type: "glob" },
  { signal: "*.cjs", ecosystem: PROJECT_TYPES.JAVASCRIPT, type: "glob" },
  { signal: "*.html", ecosystem: PROJECT_TYPES.HTML, type: "glob" },
  { signal: "angular.json", ecosystem: PROJECT_TYPES.ANGULAR, type: "file" },
  { signal: "@angular/core", ecosystem: PROJECT_TYPES.ANGULAR, type: "package-dependency" },
  { signal: "pyproject.toml", ecosystem: PROJECT_TYPES.PYTHON, type: "file" },
  { signal: "requirements.txt", ecosystem: PROJECT_TYPES.PYTHON, type: "file" },
  { signal: "Pipfile", ecosystem: PROJECT_TYPES.PYTHON, type: "file" },
  { signal: "pom.xml", ecosystem: PROJECT_TYPES.JAVA, type: "file" },
  { signal: "build.gradle", ecosystem: PROJECT_TYPES.JAVA, type: "file" },
  { signal: "build.gradle.kts", ecosystem: PROJECT_TYPES.JAVA, type: "file" },
  { signal: "pom.xml::<artifactId>spring-boot", ecosystem: PROJECT_TYPES.SPRINGBOOT, type: "file-contains" },
  { signal: "build.gradle::org.springframework.boot", ecosystem: PROJECT_TYPES.SPRINGBOOT, type: "file-contains" },
  { signal: "build.gradle.kts::org.springframework.boot", ecosystem: PROJECT_TYPES.SPRINGBOOT, type: "file-contains" },
  { signal: "src/main/resources/application.properties", ecosystem: PROJECT_TYPES.SPRINGBOOT, type: "path" },
  { signal: "src/main/resources/application.yml", ecosystem: PROJECT_TYPES.SPRINGBOOT, type: "path" },
  { signal: "go.mod", ecosystem: PROJECT_TYPES.GO, type: "file" },
  { signal: "Cargo.toml", ecosystem: PROJECT_TYPES.RUST, type: "file" },
  { signal: "*.csproj", ecosystem: PROJECT_TYPES.DOTNET, type: "glob" },
  { signal: "*.sln", ecosystem: PROJECT_TYPES.DOTNET, type: "glob" },
  { signal: "*.cs", ecosystem: PROJECT_TYPES.CSHARP, type: "tree-extension" },
  { signal: "*.groovy", ecosystem: PROJECT_TYPES.GROOVY, type: "tree-extension" },
  { signal: "app/src/main/AndroidManifest.xml", ecosystem: PROJECT_TYPES.ANDROID, type: "path" },
  { signal: "AndroidManifest.xml", ecosystem: PROJECT_TYPES.ANDROID, type: "path" },
  { signal: "build.gradle::com.android.application", ecosystem: PROJECT_TYPES.ANDROID, type: "file-contains" },
  { signal: "build.gradle.kts::com.android.application", ecosystem: PROJECT_TYPES.ANDROID, type: "file-contains" },
  { signal: "Package.swift", ecosystem: PROJECT_TYPES.SWIFT, type: "file" },
  { signal: "*.swift", ecosystem: PROJECT_TYPES.SWIFT, type: "tree-extension" },
  { signal: "*.swift::import SwiftUI", ecosystem: PROJECT_TYPES.SWIFTUI, type: "tree-extension-contains" },
  { signal: "*.m", ecosystem: PROJECT_TYPES.OBJECTIVE_C, type: "tree-extension" },
  { signal: "*.mm", ecosystem: PROJECT_TYPES.OBJECTIVE_C, type: "tree-extension" },
  { signal: "CMakeLists.txt", ecosystem: PROJECT_TYPES.CPP, type: "file" },
  { signal: "*.cpp", ecosystem: PROJECT_TYPES.CPP, type: "tree-extension" },
  { signal: "*.cxx", ecosystem: PROJECT_TYPES.CPP, type: "tree-extension" },
  { signal: "*.cc", ecosystem: PROJECT_TYPES.CPP, type: "tree-extension" },
  { signal: "*.hpp", ecosystem: PROJECT_TYPES.CPP, type: "tree-extension" },
  { signal: "*.hxx", ecosystem: PROJECT_TYPES.CPP, type: "tree-extension" },
];

const TREE_SCAN_MAX_DEPTH = 5;
const TREE_SCAN_MAX_FILES = 1500;
const TREE_CONTENT_READ_MAX_BYTES = 1600;

function normalizeProjectType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (PROJECT_TYPE_VALUES.has(normalized)) {
    return normalized;
  }
  return PROJECT_TYPES.UNKNOWN;
}

function detectProjectType(ecosystems) {
  if (ecosystems.size === 0) {
    return PROJECT_TYPES.UNKNOWN;
  }

  const matchesOnly = (allowedValues) => Array.from(ecosystems).every((value) => allowedValues.includes(value));

  if (ecosystems.has(PROJECT_TYPES.ANGULAR) && matchesOnly([
    PROJECT_TYPES.ANGULAR,
    PROJECT_TYPES.NODE,
    PROJECT_TYPES.JAVASCRIPT,
    PROJECT_TYPES.HTML,
  ])) {
    return PROJECT_TYPES.ANGULAR;
  }

  if (ecosystems.has(PROJECT_TYPES.SPRINGBOOT) && matchesOnly([
    PROJECT_TYPES.SPRINGBOOT,
    PROJECT_TYPES.JAVA,
    PROJECT_TYPES.GROOVY,
  ])) {
    return PROJECT_TYPES.SPRINGBOOT;
  }

  if (ecosystems.has(PROJECT_TYPES.ANDROID) && matchesOnly([
    PROJECT_TYPES.ANDROID,
    PROJECT_TYPES.JAVA,
    PROJECT_TYPES.GROOVY,
  ])) {
    return PROJECT_TYPES.ANDROID;
  }

  if (ecosystems.has(PROJECT_TYPES.SWIFTUI) && matchesOnly([
    PROJECT_TYPES.SWIFTUI,
    PROJECT_TYPES.SWIFT,
  ])) {
    return PROJECT_TYPES.SWIFTUI;
  }


  if (ecosystems.has(PROJECT_TYPES.GROOVY) && matchesOnly([
    PROJECT_TYPES.GROOVY,
    PROJECT_TYPES.JAVA,
  ])) {
    return PROJECT_TYPES.GROOVY;
  }

  if (ecosystems.has(PROJECT_TYPES.CSHARP) && matchesOnly([
    PROJECT_TYPES.CSHARP,
    PROJECT_TYPES.DOTNET,
  ])) {
    return PROJECT_TYPES.CSHARP;
  }

  if (ecosystems.size === 1) {
    return Array.from(ecosystems)[0];
  }

  if (ecosystems.has(PROJECT_TYPES.NODE) && matchesOnly([
    PROJECT_TYPES.NODE,
    PROJECT_TYPES.JAVASCRIPT,
    PROJECT_TYPES.HTML,
  ])) {
    return PROJECT_TYPES.NODE;
  }

  if (ecosystems.has(PROJECT_TYPES.JAVASCRIPT) && matchesOnly([
    PROJECT_TYPES.JAVASCRIPT,
    PROJECT_TYPES.HTML,
  ])) {
    return PROJECT_TYPES.JAVASCRIPT;
  }

  return PROJECT_TYPES.POLYGLOT;
}

async function readRootEntries(repoPath) {
  try {
    return await fsp.readdir(repoPath, { withFileTypes: true });
  } catch (_error) {
    return [];
  }
}

function buildEntryMap(entries) {
  const map = new Map();
  for (const entry of entries) {
    map.set(entry.name, entry);
  }
  return map;
}

async function readFileWithLimit(filePath, maxBytes = TREE_CONTENT_READ_MAX_BYTES) {
  try {
    const handle = await fsp.open(filePath, "r");
    const buffer = Buffer.alloc(maxBytes);
    const { bytesRead } = await handle.read(buffer, 0, maxBytes, 0);
    await handle.close();
    return buffer.slice(0, bytesRead).toString("utf8");
  } catch (_error) {
    return "";
  }
}

async function listRepoFiles(repoPath, maxDepth = TREE_SCAN_MAX_DEPTH, maxFiles = TREE_SCAN_MAX_FILES) {
  const files = [];

  async function walk(dir, depth) {
    if (files.length >= maxFiles) {
      return;
    }
    let entries = [];
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch (_error) {
      return;
    }

    for (const entry of entries) {
      if (files.length >= maxFiles) {
        return;
      }
      const absolutePath = path.join(dir, entry.name);
      const relativePath = path.relative(repoPath, absolutePath);
      if (!relativePath || relativePath.startsWith(".git")) {
        continue;
      }
      if (entry.isDirectory()) {
        if (depth < maxDepth) {
          await walk(absolutePath, depth + 1);
        }
        continue;
      }
      if (entry.isFile()) {
        files.push({
          name: entry.name,
          absolutePath,
          relativePath,
        });
      }
    }
  }

  await walk(repoPath, 0);
  return files;
}

function matchesGlobSuffix(name, signalPattern) {
  const suffix = signalPattern.slice(1);
  return name.endsWith(suffix);
}

function collectPotentialAiSignals(entries) {
  const names = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const preferred = [
    "README.md",
    "README",
    "setup.py",
    "Makefile",
    "Dockerfile",
    "composer.json",
    "package-lock.json",
    "yarn.lock",
  ];

  const selected = [];
  for (const fileName of preferred) {
    if (names.includes(fileName)) {
      selected.push(fileName);
    }
  }

  for (const fileName of names) {
    if (selected.length >= 16) {
      break;
    }
    if (!selected.includes(fileName)) {
      selected.push(fileName);
    }
  }

  return selected;
}

async function readSignalSnippets(repoPath, fileNames) {
  const snippets = [];
  for (const fileName of fileNames.slice(0, 8)) {
    const absolute = path.join(repoPath, fileName);
    const content = await readFileWithLimit(absolute, 700);
    if (content) {
      snippets.push({
        fileName,
        snippet: content,
      });
    }
  }
  return snippets;
}

function extractGeminiText(rawResponse) {
  return rawResponse?.candidates?.[0]?.content?.parts?.map((part) => part?.text || "").join("") || "";
}

function parseJsonObject(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    return null;
  }
  try {
    return JSON.parse(trimmed);
  } catch (_error) {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch (_secondError) {
        return null;
      }
    }
    return null;
  }
}

async function detectUnknownProjectWithAi(repoPath, entries) {
  if (!aiClient) {
    return null;
  }

  const rootFileNames = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 30);

  if (!rootFileNames.length) {
    return null;
  }

  const candidateSignalFiles = collectPotentialAiSignals(entries);
  const snippets = await readSignalSnippets(repoPath, candidateSignalFiles);

  const prompt = [
    "You classify software repositories by ecosystem.",
    `Allowed projectType values: ${Array.from(PROJECT_TYPE_VALUES).join(", ")}.`,
    "If multiple ecosystems are clearly present, return polyglot.",
    "If uncertain, return unknown.",
    "Return strict JSON only, no markdown:",
    '{"projectType":"unknown","confidence":0,"detectedSignals":[],"reason":""}',
    "- detectedSignals should be short file-based clues.",
    "- confidence must be a number between 0 and 1.",
    `Repository path: ${repoPath}`,
    `Root files: ${JSON.stringify(rootFileNames)}`,
    `File snippets: ${JSON.stringify(snippets)}`,
  ].join("\n");

  try {
    const raw = await aiClient.generateText({
      prompt,
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
      },
    });
    const text = extractGeminiText(raw);
    const parsed = parseJsonObject(text);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const projectType = normalizeProjectType(parsed.projectType);
    const confidence = Number(parsed.confidence);
    const detectedSignals = Array.isArray(parsed.detectedSignals)
      ? parsed.detectedSignals
        .map((signal) => String(signal || "").trim())
        .filter(Boolean)
        .slice(0, 6)
      : [];

    if (projectType === PROJECT_TYPES.UNKNOWN || !Number.isFinite(confidence) || confidence < 0.6) {
      return null;
    }

    return {
      projectType,
      detectedSignals,
      confidence,
      reason: String(parsed.reason || "").trim(),
    };
  } catch (_error) {
    return null;
  }
}

async function detectRepoSignals(repoPath, rootEntries) {
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
      const files = await getRepoFiles();
      isMatch = files.some((file) => matchesGlobSuffix(file.name, detector.signal));
    } else if (detector.type === "tree-extension-contains") {
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

    if (isMatch) {
      ecosystems.add(detector.ecosystem);
      detectedSignals.push(detector.signal);
    }
  }

  let projectType = detectProjectType(ecosystems);
  if (projectType === PROJECT_TYPES.UNKNOWN) {
    const aiResult = await detectUnknownProjectWithAi(repoPath, entries);
    if (aiResult) {
      projectType = aiResult.projectType;
      detectedSignals.push(`ai:${aiResult.projectType}`);
      detectedSignals.push(...aiResult.detectedSignals.map((signal) => `ai:${signal}`));
      if (aiResult.reason) {
        detectedSignals.push(`ai:reason:${aiResult.reason.slice(0, 120)}`);
      }
    }
  }

  return {
    projectType,
    detectedSignals: Array.from(new Set(detectedSignals)).sort((a, b) => a.localeCompare(b)),
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
        const rootEntries = await readRootEntries(dir);
        const metadata = await detectRepoSignals(dir, rootEntries);
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
