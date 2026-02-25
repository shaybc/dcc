import path from "path";

const AGGREGATE_FILES_BY_DESTINATION = {
  copilot: path.join(".github", "copilot-instructions.md"),
  gemini: path.join(".gemini", "instructions.md")
};

const PROMPT_TARGETS_BY_DESTINATION = {
  copilot: {
    dir: path.join(".github", "prompts"),
    extension: ".prompt.md"
  },
  gemini: {
    dir: path.join(".gemini", "commands"),
    extension: ".md"
  }
};

function normalizeDestination(destination) {
  return String(destination || "").trim().toLowerCase();
}

function normalizeType(type) {
  return String(type || "").trim().toLowerCase();
}

export function slugFromDccUri(input = "") {
  const rawValue = resolveDccUri(input) || (typeof input === "object" && input !== null
    ? String(input.name || "")
    : String(input || ""));

  const slug = rawValue
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "definition";
}

export function getDccBlockMarkers(input = "") {
  const dccUri = resolveDccUri(input);

  if (!dccUri) return null;

  return {
    start: `<!-- DCC:BEGIN ${dccUri} -->`,
    end: `<!-- DCC:END ${dccUri} -->`
  };
}

export function resolveDccUri(input = "") {
  if (typeof input === "object" && input !== null) {
    const directUri = String(input.dccUri || input.dcc_uri || input.uri || "").trim();
    if (directUri) return directUri;

    const key = String(input.key || "").trim();
    const keySeparatorIndex = key.indexOf("::");
    if (keySeparatorIndex !== -1) {
      const keyUri = key.slice(keySeparatorIndex + 2).trim();
      if (keyUri) return keyUri;
    }
    return "";
  }

  return String(input || "").trim();
}

export function getManagedRelativePath({ destination, type, dccUri } = {}) {
  const normalizedDestination = normalizeDestination(destination);
  const normalizedType = normalizeType(type);

  if (normalizedType === "rules") {
    return AGGREGATE_FILES_BY_DESTINATION[normalizedDestination] || "";
  }

  if (normalizedType !== "prompts") {
    return "";
  }

  const promptTarget = PROMPT_TARGETS_BY_DESTINATION[normalizedDestination];
  if (!promptTarget) return "";

  const slug = slugFromDccUri(dccUri);
  return path.join(promptTarget.dir, `${slug}${promptTarget.extension}`);
}

export default {
  slugFromDccUri,
  resolveDccUri,
  getDccBlockMarkers,
  getManagedRelativePath
};
