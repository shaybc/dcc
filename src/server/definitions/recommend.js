const DEFAULT_MATCH_WEIGHTS = Object.freeze({
  projectType: 6,
  projectTypeContext: 5,
  definitionType: 4,
  tag: 3,
  keyword: 2,
  dccMetadata: 2,
  projectTechnologyTag: 3,
  projectTechnologyKeyword: 2,
  projectTechnologyMetadata: 2,
  projectPathKeyword: 1,
  projectPathTag: 2
});

export const PROJECT_TYPE_RECOMMENDATION_MAP = Object.freeze({
  node: Object.freeze({
    definitionTypes: Object.freeze({ configs: 3, workflows: 2, prompts: 1 }),
    tags: Object.freeze({ typescript: 3, npm: 3, eslint: 3, jest: 3, javascript: 2 }),
    keywords: Object.freeze({ typescript: 2, npm: 2, eslint: 2, jest: 2, javascript: 2 })
  }),
  python: Object.freeze({
    definitionTypes: Object.freeze({ configs: 3, workflows: 2, prompts: 1 }),
    tags: Object.freeze({ pytest: 3, ruff: 3, poetry: 3, fastapi: 3 }),
    keywords: Object.freeze({ pytest: 2, ruff: 2, poetry: 2, fastapi: 2 })
  })
});

const PROJECT_TECH_STOP_WORDS = new Set([
  "ai",
  "application",
  "artifactid",
  "build",
  "core",
  "file",
  "format",
  "git",
  "lock",
  "main",
  "package",
  "path",
  "reason",
  "resources",
  "src"
]);
const SHORT_TECH_TOKEN_ALLOWLIST = new Set(["go", "ui"]);
const PROJECT_TECH_CANONICAL_MAP = Object.freeze({ js: "javascript", ts: "typescript", md: "markdown" });
const CORE_PLATFORM = Object.freeze({ WEB: "web", MOBILE: "mobile", BACKEND: "backend" });
const CORE_PLATFORM_BY_PROJECT_TYPE = Object.freeze({
  angular: CORE_PLATFORM.WEB,
  javascript: CORE_PLATFORM.WEB,
  html: CORE_PLATFORM.WEB,
  android: CORE_PLATFORM.MOBILE,
  swiftui: CORE_PLATFORM.MOBILE,
  swift: CORE_PLATFORM.MOBILE,
  "objective-c": CORE_PLATFORM.MOBILE,
  node: CORE_PLATFORM.BACKEND,
  python: CORE_PLATFORM.BACKEND,
  java: CORE_PLATFORM.BACKEND,
  springboot: CORE_PLATFORM.BACKEND,
  go: CORE_PLATFORM.BACKEND,
  rust: CORE_PLATFORM.BACKEND,
  dotnet: CORE_PLATFORM.BACKEND,
  csharp: CORE_PLATFORM.BACKEND,
  groovy: CORE_PLATFORM.BACKEND,
  "c++": CORE_PLATFORM.BACKEND,
  yaml: CORE_PLATFORM.BACKEND,
  xml: CORE_PLATFORM.BACKEND,
  json: CORE_PLATFORM.BACKEND
});
const CORE_PLATFORM_TOKENS = Object.freeze({
  [CORE_PLATFORM.WEB]: new Set(["web", "frontend", "browser", "html", "css", "javascript", "typescript", "react", "angular", "vue"]),
  [CORE_PLATFORM.MOBILE]: new Set(["mobile", "android", "ios", "swift", "swiftui", "kotlin", "compose", "objective", "react", "native", "flutter"]),
  [CORE_PLATFORM.BACKEND]: new Set(["backend", "server", "service", "api", "node", "python", "java", "springboot", "go", "rust", "dotnet", "csharp", "groovy", "database"])
});
const EXPLICIT_PLATFORM_TOKENS = Object.freeze({
  [CORE_PLATFORM.WEB]: new Set(["web", "frontend", "browser"]),
  [CORE_PLATFORM.MOBILE]: new Set(["mobile", "android", "ios", "swift", "swiftui", "kotlin", "compose", "objective", "native", "flutter"]),
  [CORE_PLATFORM.BACKEND]: new Set(["backend", "server", "service", "api"])
});

function normalizeToken(value) {
  return String(value || "").trim().toLowerCase();
}

function tokenize(value) {
  return normalizeToken(value)
    .split(/[^a-z0-9_+]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function uniqueTokens(values) {
  return [...new Set(values.flatMap((value) => tokenize(value)))];
}

function collectTagTokens(definition) {
  const tagsFromString = Array.isArray(definition?.tags)
    ? definition.tags
    : String(definition?.tags || "").split(",");
  const dccTags = definition?.dcc_tags;
  const tagValues = [
    ...tagsFromString,
    ...(Array.isArray(dccTags) ? dccTags : String(dccTags || "").split(","))
  ];
  return uniqueTokens(tagValues);
}

function collectDccMetadataTokens(definition) {
  const metadataValues = [];
  for (const [key, value] of Object.entries(definition || {})) {
    if (!normalizeToken(key).startsWith("dcc_")) continue;
    if (Array.isArray(value)) metadataValues.push(...value);
    else if (value && typeof value === "object") metadataValues.push(...Object.values(value));
    else metadataValues.push(value);
  }
  if (definition?.dcc && typeof definition.dcc === "object") {
    metadataValues.push(...Object.values(definition.dcc));
  }
  return uniqueTokens(metadataValues.map((value) => String(value || "")));
}

function normalizeProjectTechnologyTokens(values) {
  const canonicalTokens = uniqueTokens(values).map((token) => PROJECT_TECH_CANONICAL_MAP[token] || token);
  return [...new Set(canonicalTokens)]
    .filter((token) => token.length >= 3 || SHORT_TECH_TOKEN_ALLOWLIST.has(token))
    .filter((token) => !PROJECT_TECH_STOP_WORDS.has(token));
}

function inferCorePlatform(projectType, projectTechnologyTokens = []) {
  const normalizedProjectType = normalizeToken(projectType);
  if (CORE_PLATFORM_BY_PROJECT_TYPE[normalizedProjectType]) {
    return CORE_PLATFORM_BY_PROJECT_TYPE[normalizedProjectType];
  }

  for (const platform of [CORE_PLATFORM.MOBILE, CORE_PLATFORM.WEB, CORE_PLATFORM.BACKEND]) {
    const tokens = CORE_PLATFORM_TOKENS[platform];
    if (projectTechnologyTokens.some((technology) => tokens.has(technology))) {
      return platform;
    }
  }

  return "";
}

function getDefinitionTokens(definition) {
  const name = String(definition?.name || "");
  const description = String(definition?.description || "");
  const type = String(definition?.type || "");
  const tags = collectTagTokens(definition);
  const dccMetadataTokens = collectDccMetadataTokens(definition);
  const textTokens = uniqueTokens([`${name} ${description} ${type}`]);
  return {
    tags,
    dccMetadataTokens,
    textBlob: normalizeToken(`${name} ${description}`),
    combinedTokens: new Set([...tags, ...dccMetadataTokens, ...textTokens])
  };
}

function definitionMatchesCorePlatform(definitionTokens, corePlatform) {
  if (!corePlatform) {
    return false;
  }
  const platformTokens = CORE_PLATFORM_TOKENS[corePlatform] || new Set();
  for (const token of definitionTokens.combinedTokens) {
    if (platformTokens.has(token)) {
      return true;
    }
  }
  return false;
}

function detectDefinitionCorePlatforms(definitionTokens) {
  const matches = [];
  for (const platform of Object.values(CORE_PLATFORM)) {
    const explicitTokens = EXPLICIT_PLATFORM_TOKENS[platform] || new Set();
    if ([...definitionTokens.combinedTokens].some((token) => explicitTokens.has(token))) {
      matches.push(platform);
    }
  }
  return matches;
}

export function buildProjectTechnologyTokens(projectType, projectTechnologies = [], detectedSignals = []) {
  return normalizeProjectTechnologyTokens([
    projectType,
    ...(Array.isArray(projectTechnologies) ? projectTechnologies : []),
    ...(Array.isArray(detectedSignals) ? detectedSignals : [])
  ]);
}

function scoreDefinition(definition, context) {
  const reasons = [];
  const type = normalizeToken(definition?.type);
  const definitionTokens = getDefinitionTokens(definition);
  const { tags, dccMetadataTokens, textBlob } = definitionTokens;
  const profile = context.projectType ? context.map[context.projectType] : null;

  let score = 0;

  if (context.projectType && type === context.projectType) {
    score += DEFAULT_MATCH_WEIGHTS.projectType;
    reasons.push(`projectType match: ${context.projectType}`);
  }

  if (context.projectType) {
    if (tags.includes(context.projectType)) {
      score += DEFAULT_MATCH_WEIGHTS.projectTypeContext;
      reasons.push(`projectType tag match: ${context.projectType}`);
    }

    if (textBlob.includes(context.projectType)) {
      score += DEFAULT_MATCH_WEIGHTS.projectTypeContext;
      reasons.push(`projectType keyword match: ${context.projectType}`);
    }

    if (dccMetadataTokens.includes(context.projectType)) {
      score += DEFAULT_MATCH_WEIGHTS.projectTypeContext;
      reasons.push(`projectType metadata match: ${context.projectType}`);
    }
  }

  if (profile?.definitionTypes?.[type]) {
    score += profile.definitionTypes[type] * DEFAULT_MATCH_WEIGHTS.definitionType;
    reasons.push(`definition type boost: ${type}`);
  }

  const boostedTags = Object.keys(profile?.tags || {});
  for (const tag of boostedTags) {
    if (!tags.includes(tag)) continue;
    score += (profile.tags[tag] || 1) * DEFAULT_MATCH_WEIGHTS.tag;
    reasons.push(`tag match: ${tag}`);
  }

  const boostedKeywords = Object.keys(profile?.keywords || {});
  for (const keyword of boostedKeywords) {
    if (!textBlob.includes(keyword)) continue;
    score += (profile.keywords[keyword] || 1) * DEFAULT_MATCH_WEIGHTS.keyword;
    reasons.push(`keyword match: ${keyword}`);
  }

  for (const keyword of boostedKeywords) {
    if (!dccMetadataTokens.includes(keyword)) continue;
    score += (profile.keywords[keyword] || 1) * DEFAULT_MATCH_WEIGHTS.dccMetadata;
    reasons.push(`dcc metadata match: ${keyword}`);
  }

  for (const technology of context.projectTechnologyTokens) {
    if (tags.includes(technology)) {
      score += DEFAULT_MATCH_WEIGHTS.projectTechnologyTag;
      reasons.push(`project technology tag: ${technology}`);
    }

    if (textBlob.includes(technology)) {
      score += DEFAULT_MATCH_WEIGHTS.projectTechnologyKeyword;
      reasons.push(`project technology keyword: ${technology}`);
    }

    if (dccMetadataTokens.includes(technology)) {
      score += DEFAULT_MATCH_WEIGHTS.projectTechnologyMetadata;
      reasons.push(`project technology metadata: ${technology}`);
    }
  }

  for (const token of context.projectPathTokens) {
    if (!token || token.length < 3) continue;
    if (!textBlob.includes(token)) continue;
    score += DEFAULT_MATCH_WEIGHTS.projectPathKeyword;
    reasons.push(`project path keyword: ${token}`);
  }

  for (const token of context.projectPathTokens) {
    if (!token || token.length < 3) continue;
    if (!tags.includes(token)) continue;
    score += DEFAULT_MATCH_WEIGHTS.projectPathTag;
    reasons.push(`project path tag: ${token}`);
  }

  return {
    score,
    reasons,
    matchesCorePlatform: definitionMatchesCorePlatform(definitionTokens, context.corePlatform),
    definitionPlatforms: detectDefinitionCorePlatforms(definitionTokens)
  };
}

/**
 * Deterministically rank definition suggestions for a project context.
 */
export function recommendDefinitions(currentProjectPath, currentProjectType, definitions, options = {}) {
  const candidateDefinitions = Array.isArray(definitions) ? definitions : [];
  const projectTechnologyTokens = buildProjectTechnologyTokens(
    currentProjectType,
    options.projectTechnologies,
    options.detectedSignals
  );
  const context = {
    projectType: normalizeToken(currentProjectType),
    projectPathTokens: uniqueTokens([String(currentProjectPath || "")]),
    projectTechnologyTokens,
    corePlatform: normalizeToken(options.corePlatform) || inferCorePlatform(currentProjectType, projectTechnologyTokens),
    map: options.recommendationMap || PROJECT_TYPE_RECOMMENDATION_MAP
  };

  const fallbackLimit = Math.max(0, Number(options.fallbackSuggestionLimit ?? 3));

  const scoredDefinitions = candidateDefinitions
    .map((definition, index) => {
      const { score, reasons, matchesCorePlatform, definitionPlatforms } = scoreDefinition(definition, context);
      const matchesTechnology = reasons.some((reason) => reason.startsWith("project technology "));
      const hasConflictingPlatform = context.corePlatform
        && definitionPlatforms.length > 0
        && !definitionPlatforms.includes(context.corePlatform);
      return {
        ...definition,
        score,
        reasons,
        matchesCorePlatform,
        matchesTechnology,
        hasConflictingPlatform,
        _index: index
      };
    })
    .filter((definition) => definition.score > 0 && !definition.hasConflictingPlatform)
    .sort((left, right) => (
      (right.score - left.score)
      || String(left.name || "").localeCompare(String(right.name || ""))
      || String(left.key || "").localeCompare(String(right.key || ""))
      || (left._index - right._index)
    ));

  const corePlatformMatches = scoredDefinitions.filter((definition) => definition.matchesCorePlatform);
  const technologyMatches = scoredDefinitions.filter((definition) => !definition.matchesCorePlatform && definition.matchesTechnology);
  const fallbackMatches = scoredDefinitions
    .filter((definition) => !definition.matchesCorePlatform && !definition.matchesTechnology)
    .slice(0, fallbackLimit);

  return [...corePlatformMatches, ...technologyMatches, ...fallbackMatches]
    .map(({ _index, matchesCorePlatform, matchesTechnology, hasConflictingPlatform, ...definition }) => definition);
}

export default recommendDefinitions;
