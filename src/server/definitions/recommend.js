const DEFAULT_MATCH_WEIGHTS = Object.freeze({
  projectType: 6,
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
    tags: Object.freeze({ typescript: 3, npm: 3, eslint: 3, jest: 3, javascript: 2, frontend: 2, html: 2 }),
    keywords: Object.freeze({ typescript: 2, npm: 2, eslint: 2, jest: 2, javascript: 2, frontend: 2, html: 2 })
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
  return uniqueTokens(values)
    .filter((token) => token.length >= 3)
    .filter((token) => !PROJECT_TECH_STOP_WORDS.has(token));
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
  const name = String(definition?.name || "");
  const description = String(definition?.description || "");
  const textBlob = normalizeToken(`${name} ${description}`);
  const tags = collectTagTokens(definition);
  const dccMetadataTokens = collectDccMetadataTokens(definition);
  const profile = context.projectType ? context.map[context.projectType] : null;

  let score = 0;

  if (context.projectType && type === context.projectType) {
    score += DEFAULT_MATCH_WEIGHTS.projectType;
    reasons.push(`projectType match: ${context.projectType}`);
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

  return { score, reasons };
}

/**
 * Deterministically rank definition suggestions for a project context.
 */
export function recommendDefinitions(currentProjectPath, currentProjectType, definitions, options = {}) {
  const candidateDefinitions = Array.isArray(definitions) ? definitions : [];
  const context = {
    projectType: normalizeToken(currentProjectType),
    projectPathTokens: uniqueTokens([String(currentProjectPath || "")]),
    projectTechnologyTokens: buildProjectTechnologyTokens(
      currentProjectType,
      options.projectTechnologies,
      options.detectedSignals
    ),
    map: options.recommendationMap || PROJECT_TYPE_RECOMMENDATION_MAP
  };

  return candidateDefinitions
    .map((definition, index) => {
      const { score, reasons } = scoreDefinition(definition, context);
      return {
        ...definition,
        score,
        reasons,
        _index: index
      };
    })
    .filter((definition) => definition.score > 0)
    .sort((left, right) => (
      (right.score - left.score)
      || String(left.name || "").localeCompare(String(right.name || ""))
      || String(left.key || "").localeCompare(String(right.key || ""))
      || (left._index - right._index)
    ))
    .map(({ _index, ...definition }) => definition);
}

export default recommendDefinitions;
