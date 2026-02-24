import path from "path";
import {
  CORE_PLATFORM_BY_PROJECT_TYPE,
  CORE_PLATFORM_TECHNOLOGY_HINTS,
  CORE_PLATFORMS,
  EXTENSION_TECHNOLOGY_MAP,
  MAX_PROJECT_TECHNOLOGIES,
  PROJECT_TECH_STOP_WORDS,
  PROJECT_TYPE_VALUES,
  PROJECT_TYPES,
  SHORT_TECH_TOKEN_ALLOWLIST,
  TECHNOLOGY_ALLOWLIST,
  TECHNOLOGY_CANONICAL_MAP,
} from "./constants.js";

export function normalizeProjectType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (PROJECT_TYPE_VALUES.has(normalized)) {
    return normalized;
  }
  return PROJECT_TYPES.UNKNOWN;
}

export function detectProjectType(ecosystems) {
  if (ecosystems.size === 0) {
    return null;
  }

  const values = Array.from(ecosystems);
  const matchesOnly = (allowedValues) => values.every((value) => allowedValues.includes(value));

  if (ecosystems.has(PROJECT_TYPES.ANGULAR) && matchesOnly([PROJECT_TYPES.ANGULAR, PROJECT_TYPES.NODE, PROJECT_TYPES.JAVASCRIPT, PROJECT_TYPES.HTML])) {
    return PROJECT_TYPES.ANGULAR;
  }
  if (ecosystems.has(PROJECT_TYPES.SPRINGBOOT) && matchesOnly([PROJECT_TYPES.SPRINGBOOT, PROJECT_TYPES.JAVA, PROJECT_TYPES.GROOVY])) {
    return PROJECT_TYPES.SPRINGBOOT;
  }
  if (ecosystems.has(PROJECT_TYPES.ANDROID) && matchesOnly([PROJECT_TYPES.ANDROID, PROJECT_TYPES.JAVA, PROJECT_TYPES.GROOVY])) {
    return PROJECT_TYPES.ANDROID;
  }
  if (ecosystems.has(PROJECT_TYPES.SWIFTUI) && matchesOnly([PROJECT_TYPES.SWIFTUI, PROJECT_TYPES.SWIFT])) {
    return PROJECT_TYPES.SWIFTUI;
  }
  if (ecosystems.has(PROJECT_TYPES.GROOVY) && matchesOnly([PROJECT_TYPES.GROOVY, PROJECT_TYPES.JAVA])) {
    return PROJECT_TYPES.GROOVY;
  }
  if (ecosystems.has(PROJECT_TYPES.CSHARP) && matchesOnly([PROJECT_TYPES.CSHARP, PROJECT_TYPES.DOTNET])) {
    return PROJECT_TYPES.CSHARP;
  }
  if (ecosystems.has(PROJECT_TYPES.NODE) && matchesOnly([PROJECT_TYPES.NODE, PROJECT_TYPES.JAVASCRIPT, PROJECT_TYPES.HTML])) {
    return PROJECT_TYPES.NODE;
  }
  if (ecosystems.has(PROJECT_TYPES.JAVASCRIPT) && matchesOnly([PROJECT_TYPES.JAVASCRIPT, PROJECT_TYPES.HTML])) {
    return PROJECT_TYPES.JAVASCRIPT;
  }

  if (ecosystems.size === 1) {
    return values[0];
  }
  return null;
}

export function chooseFallbackProjectType(ecosystems) {
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

export async function detectDataFormatFallback(getRepoFiles) {
  const files = await getRepoFiles();
  const matches = new Set();

  for (const file of files) {
    if (file.name.endsWith(".json")) {
      matches.add(PROJECT_TYPES.JSON);
    } else if (file.name.endsWith(".xml")) {
      matches.add(PROJECT_TYPES.XML);
    } else if (file.name.endsWith(".yaml") || file.name.endsWith(".yml")) {
      matches.add(PROJECT_TYPES.YAML);
    }
  }

  const projectType = chooseFallbackProjectType(matches);
  if (projectType === PROJECT_TYPES.UNKNOWN) {
    return null;
  }

  return {
    projectType,
    detectedSignals: Array.from(matches).map((value) => `format:${value}`),
  };
}

function tokenizeTechnologyValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9_+]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function canonicalizeTechnologyToken(token) {
  return TECHNOLOGY_CANONICAL_MAP[token] || token;
}

function normalizeTechnologyTokens(values) {
  return Array.from(new Set(values
    .flatMap((value) => tokenizeTechnologyValue(value))
    .map((token) => canonicalizeTechnologyToken(token))))
    .filter((token) => token.length >= 3 || SHORT_TECH_TOKEN_ALLOWLIST.has(token))
    .filter((token) => !PROJECT_TECH_STOP_WORDS.has(token))
    .filter((token) => TECHNOLOGY_ALLOWLIST.has(token));
}

export function collectProjectTechnologies({ projectType, ecosystems, repoFiles }) {
  const scoreByTechnology = new Map();
  const extensionCounts = new Map();

  const addScore = (token, weight) => {
    const normalized = normalizeTechnologyTokens([token])[0];
    if (!normalized) {
      return;
    }
    scoreByTechnology.set(normalized, (scoreByTechnology.get(normalized) || 0) + weight);
  };

  if (projectType && projectType !== PROJECT_TYPES.UNKNOWN) {
    addScore(projectType, 8);
  }

  for (const ecosystem of Array.from(ecosystems || [])) {
    addScore(ecosystem, 6);
  }

  for (const file of repoFiles || []) {
    const extension = path.extname(file.name || "").toLowerCase();
    if (!extension) {
      continue;
    }

    extensionCounts.set(extension, (extensionCounts.get(extension) || 0) + 1);
    for (const technology of EXTENSION_TECHNOLOGY_MAP[extension] || []) {
      addScore(technology, 1);
    }
  }

  const dominantExtensions = Array.from(extensionCounts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([extension]) => extension);

  for (const extension of dominantExtensions) {
    for (const technology of EXTENSION_TECHNOLOGY_MAP[extension] || []) {
      addScore(technology, 4);
    }
  }

  return Array.from(scoreByTechnology.entries())
    .sort((left, right) => (right[1] - left[1]) || left[0].localeCompare(right[0]))
    .map(([technology]) => technology)
    .slice(0, MAX_PROJECT_TECHNOLOGIES);
}

export function detectCorePlatform(projectType, projectTechnologies = []) {
  const normalizedProjectType = normalizeProjectType(projectType);
  if (CORE_PLATFORM_BY_PROJECT_TYPE[normalizedProjectType]) {
    return CORE_PLATFORM_BY_PROJECT_TYPE[normalizedProjectType];
  }

  for (const platform of [CORE_PLATFORMS.MOBILE, CORE_PLATFORMS.WEB, CORE_PLATFORMS.BACKEND]) {
    const hints = CORE_PLATFORM_TECHNOLOGY_HINTS[platform];
    if (projectTechnologies.some((token) => hints.has(token))) {
      return platform;
    }
  }

  return CORE_PLATFORMS.BACKEND;
}
