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
  JSON: "json",
  XML: "xml",
  YAML: "yaml",
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
  { signal: "*.js", ecosystem: PROJECT_TYPES.JAVASCRIPT, type: "tree-extension" },
  { signal: "*.mjs", ecosystem: PROJECT_TYPES.JAVASCRIPT, type: "tree-extension" },
  { signal: "*.cjs", ecosystem: PROJECT_TYPES.JAVASCRIPT, type: "tree-extension" },
  { signal: "*.html", ecosystem: PROJECT_TYPES.HTML, type: "tree-extension" },
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

const EXTENSION_TECHNOLOGY_MAP = Object.freeze({
  ".js": ["javascript", "js", "frontend", "web", "ui"],
  ".mjs": ["javascript", "js", "frontend", "web", "ui"],
  ".cjs": ["javascript", "js", "frontend", "web", "ui"],
  ".ts": ["typescript", "javascript", "frontend", "web", "ui"],
  ".tsx": ["typescript", "react", "javascript", "frontend", "web", "ui"],
  ".jsx": ["react", "javascript", "frontend", "web", "ui"],
  ".html": ["html", "frontend", "web", "ui"],
  ".css": ["css", "frontend", "web", "ui"],
  ".scss": ["scss", "css", "frontend", "web", "ui"],
  ".vue": ["vue", "javascript", "frontend", "web", "ui"],
  ".yaml": ["yaml"],
  ".yml": ["yaml"],
  ".json": ["json"],
  ".xml": ["xml"],
  ".md": ["markdown"],
  ".py": ["python"],
  ".java": ["java"],
  ".go": ["go"],
  ".rs": ["rust"],
  ".cs": ["csharp", "dotnet"],
  ".swift": ["swift"],
  ".m": ["objective-c"],
  ".mm": ["objective-c"],
  ".cpp": ["c++"],
  ".cxx": ["c++"],
  ".cc": ["c++"],
  ".hpp": ["c++"],
  ".hxx": ["c++"]
});

const PROJECT_TECH_STOP_WORDS = new Set(["ai", "build", "file", "format", "git", "path", "reason", "src", "main"]);
const SHORT_TECH_TOKEN_ALLOWLIST = new Set(["js", "ts", "go", "ui", "md"]);

const IGNORED_SCAN_DIR_NAMES = new Set([
  ".git",
  "log",
  "logs",
  "dist",
  "bin",
  "dist-packages",
  "lib",
  "site-packages",
  "node_modules",
  "vendor",
  "target",
  "build",
  "out",
  "coverage",
  ".next",
  ".nuxt",
  ".cache",
  "__pycache__",
  ".venv",
  "venv",
]);

function shouldSkipDirectoryName(name) {
  const normalized = String(name || "").trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (IGNORED_SCAN_DIR_NAMES.has(normalized)) {
    return true;
  }
  return normalized.endsWith("-packages") || normalized.endsWith("_modules");
}

function normalizeProjectType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (PROJECT_TYPE_VALUES.has(normalized)) {
    return normalized;
  }
  return PROJECT_TYPES.UNKNOWN;
}

function detectProjectType(ecosystems) {
  if (ecosystems.size === 0) {
    return null;
  }

  const values = Array.from(ecosystems);
  const matchesOnly = (allowedValues) => values.every((value) => allowedValues.includes(value));

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

  if (ecosystems.size === 1) {
    return values[0];
  }

  return null;
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
        if (shouldSkipDirectoryName(entry.name)) {
          continue;
        }
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

function chooseFallbackProjectType(ecosystems) {
  const priority = [
    PROJECT_TYPES.ANGULAR,
    PROJECT_TYPES.SPRINGBOOT,
    PROJECT_TYPES.ANDROID,
    PROJECT_TYPES.SWIFTUI,
    PROJECT_TYPES.CSHARP,
    PROJECT_TYPES.NODE,
    PROJECT_TYPES.JAVASCRIPT,
    PROJECT_TYPES.PYTHON,
    PROJECT_TYPES.JAVA,
    PROJECT_TYPES.GROOVY,
    PROJECT_TYPES.GO,
    PROJECT_TYPES.RUST,
    PROJECT_TYPES.DOTNET,
    PROJECT_TYPES.SWIFT,
    PROJECT_TYPES.OBJECTIVE_C,
    PROJECT_TYPES.CPP,
    PROJECT_TYPES.HTML,
    PROJECT_TYPES.YAML,
    PROJECT_TYPES.XML,
    PROJECT_TYPES.JSON,
  ];
  for (const value of priority) {
    if (ecosystems.has(value)) {
      return value;
    }
  }
  return PROJECT_TYPES.UNKNOWN;
}

async function detectDataFormatFallback(repoPath, getRepoFiles) {
  const files = await getRepoFiles();
  const matches = new Set();
  for (const file of files) {
    if (file.name.endsWith('.json')) {
      matches.add(PROJECT_TYPES.JSON);
    } else if (file.name.endsWith('.xml')) {
      matches.add(PROJECT_TYPES.XML);
    } else if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
      matches.add(PROJECT_TYPES.YAML);
    }
  }
  const type = chooseFallbackProjectType(matches);
  if (type === PROJECT_TYPES.UNKNOWN) {
    return null;
  }
  return {
    projectType: type,
    detectedSignals: Array.from(matches).map((value) => `format:${value}`),
  };
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

async function detectUnknownProjectWithAi(repoPath, entries, deterministicSignals = []) {
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
    "Pick the single best-matching ecosystem from the allowed values.",
    "if none apply try to guess based on the file names and snippets and your knowledge,",
    "If still uncertain, return unknown.",
    "Return strict JSON only, no markdown:",
    '{"projectType":"unknown","confidence":0,"detectedSignals":[],"reason":""}',
    "- detectedSignals should be short file-based clues.",
    "- confidence must be a number between 0 and 1.",
    `Repository path: ${repoPath}`,
    `Root files: ${JSON.stringify(rootFileNames)}`,
    `Deterministic signals: ${JSON.stringify(deterministicSignals.slice(0, 24))}`,
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

function tokenizeTechnologyValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9_+]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function normalizeTechnologyTokens(values) {
  return Array.from(new Set(values.flatMap((value) => tokenizeTechnologyValue(value))))
    .filter((token) => token.length >= 3 || SHORT_TECH_TOKEN_ALLOWLIST.has(token))
    .filter((token) => !PROJECT_TECH_STOP_WORDS.has(token))
    .sort((a, b) => a.localeCompare(b));
}

function collectProjectTechnologies({ projectType, ecosystems, detectedSignals, repoFiles }) {
  const values = [projectType, ...Array.from(ecosystems || [])];
  const extensionCounts = new Map();

  for (const file of repoFiles || []) {
    const extension = path.extname(file.name || "").toLowerCase();
    if (!extension) {
      continue;
    }
    extensionCounts.set(extension, (extensionCounts.get(extension) || 0) + 1);
    const extensionTechnologies = EXTENSION_TECHNOLOGY_MAP[extension] || [];
    values.push(...extensionTechnologies);
    values.push(extension.slice(1));
  }

  // Promote dominant file types so data-focused repos (e.g. YAML-heavy) always surface clearly.
  const dominantExtensions = Array.from(extensionCounts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([extension]) => extension);
  for (const extension of dominantExtensions) {
    const mapped = EXTENSION_TECHNOLOGY_MAP[extension] || [];
    values.push(...mapped, extension.slice(1));
  }

  for (const signal of detectedSignals || []) {
    const normalizedSignal = String(signal || "")
      .replace(/^ai:/, "")
      .replace(/^format:/, "")
      .trim();
    if (!normalizedSignal) {
      continue;
    }
    const [signalPath] = normalizedSignal.split("::");
    values.push(signalPath);
  }

  return normalizeTechnologyTokens(values).slice(0, 64);
}

async function detectRepoSignals(repoPath, rootEntries, options = {}) {
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
    const dataFallback = await detectDataFormatFallback(repoPath, getRepoFiles);
    if (dataFallback) {
      projectType = dataFallback.projectType;
      ecosystems.add(dataFallback.projectType);
      detectedSignals.push(...dataFallback.detectedSignals);
    }
  }

  if (includeTreeSignals && (!projectType || projectType === PROJECT_TYPES.UNKNOWN)) {
    const aiResult = await detectUnknownProjectWithAi(repoPath, entries, detectedSignals);
    if (aiResult) {
      projectType = aiResult.projectType;
      detectedSignals.push(`ai:${aiResult.projectType}`);
      detectedSignals.push(...aiResult.detectedSignals.map((signal) => `ai:${signal}`));
      if (aiResult.reason) {
        detectedSignals.push(`ai:reason:${aiResult.reason.slice(0, 120)}`);
      }
    }
  }

  if (!projectType) {
    projectType = chooseFallbackProjectType(ecosystems);
  }

  const normalizedDetectedSignals = Array.from(new Set(detectedSignals)).sort((a, b) => a.localeCompare(b));
  const projectTechnologies = collectProjectTechnologies({
    projectType: projectType || PROJECT_TYPES.UNKNOWN,
    ecosystems,
    detectedSignals: normalizedDetectedSignals,
    repoFiles: await getRepoFiles(),
  });

  return {
    projectType: projectType || PROJECT_TYPES.UNKNOWN,
    detectedSignals: normalizedDetectedSignals,
    projectTechnologies,
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

    const rootMetadata = await detectRepoSignals(dir, entries, { includeTreeSignals: false });
    if (rootMetadata.projectType !== PROJECT_TYPES.UNKNOWN || rootMetadata.detectedSignals.length > 0) {
      projects.set(dir, {
        path: dir,
        ...rootMetadata,
      });
      return;
    }

    const projectCountBeforeChildren = projects.size;
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (shouldSkipDirectoryName(entry.name)) {
          continue;
        }
        await scanDir(path.join(dir, entry.name));
      }
    }

    const hasFiles = entries.some((entry) => entry.isFile());
    if (projects.size > projectCountBeforeChildren && !hasFiles) {
      return;
    }

    const metadata = await detectRepoSignals(dir, entries);
    if (metadata.projectType !== PROJECT_TYPES.UNKNOWN || metadata.detectedSignals.length > 0 || hasFiles) {
      projects.set(dir, {
        path: dir,
        ...metadata,
      });
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
      "INSERT OR IGNORE INTO dev_projects (path, projectType, detectedSignals, projectTechnologies, lastScannedAt) VALUES (?, ?, ?, ?, ?)",
      [project.path, project.projectType, JSON.stringify(project.detectedSignals), JSON.stringify(project.projectTechnologies || []), lastScannedAt]
    );
  }

  return projects.map((project) => ({
    ...project,
    lastScannedAt,
  }));
}
