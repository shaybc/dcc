import fs from "fs";
import path from "path";
import { runDb } from "../db/helpers.js";
import { GeminiAIStudioClient } from "../services/ai/geminiAIStudioClient.js";
import { env } from "../utils/env.js";

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

const PROJECT_TYPE_VALUES = new Set(Object.values(PROJECT_TYPES));
const AI_ENABLED = env.PROJECT_SCAN_AI_ENABLED;
const aiClient = AI_ENABLED
  ? new GeminiAIStudioClient({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL })
  : null;

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
  if (ecosystems.size > 1) {
    return PROJECT_TYPES.POLYGLOT;
  }
  return Array.from(ecosystems)[0];
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
    try {
      const content = await fsp.readFile(absolute, "utf8");
      snippets.push({
        fileName,
        snippet: content.slice(0, 700),
      });
    } catch (_error) {}
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

  for (const detector of SIGNAL_DETECTORS) {
    if (detector.type === "file") {
      const entry = entryMap.get(detector.signal);
      if (entry && entry.isFile()) {
        ecosystems.add(detector.ecosystem);
        detectedSignals.push(detector.signal);
      }
      continue;
    }

    if (detector.type === "glob") {
      const suffix = detector.signal.slice(1);
      const hasMatch = entries.some((entry) => entry.isFile() && entry.name.endsWith(suffix));
      if (hasMatch) {
        ecosystems.add(detector.ecosystem);
        detectedSignals.push(detector.signal);
      }
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
