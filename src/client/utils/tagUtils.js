export function normalizeTagValue(tag) {
  return String(tag || "").trim().toLowerCase();
}

export function parseDefinitionTags(rawTags) {
  const source = Array.isArray(rawTags) ? rawTags.join(",") : String(rawTags || "");
  const seen = new Set();
  const tags = [];

  source
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .forEach((tag) => {
      const normalized = normalizeTagValue(tag);
      if (!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      tags.push(tag);
    });

  return tags;
}

export function parseTagSearchQuery(rawSearch) {
  return String(rawSearch || "")
    .split(",")
    .map((entry) => normalizeTagValue(entry))
    .filter(Boolean);
}

export function isTagOnlyQuery(queryTags, definitions) {
  if (queryTags.length === 0) return false;
  return queryTags.every((tag) => definitions.some((def) => def.tagsNormalized.includes(tag)));
}
