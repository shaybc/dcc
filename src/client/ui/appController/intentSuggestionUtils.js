export function parseAiSuggestionPayload(rawContent) {
  const text = String(rawContent || "").trim();
  if (!text) return null;

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1] ? fencedMatch[1].trim() : text;

  try {
    return JSON.parse(candidate);
  } catch (_error) {
    const objectMatch = candidate.match(/\{[\s\S]*\}/);
    if (!objectMatch) return null;
    try {
      return JSON.parse(objectMatch[0]);
    } catch (_nestedError) {
      return null;
    }
  }
}

export function normalizeAiSuggestedEntries(items = []) {
  const seen = new Set();
  const normalized = [];

  items.forEach((item, index) => {
    const definitionId = Number(item?.definitionId);
    if (!Number.isFinite(definitionId) || seen.has(definitionId)) {
      return;
    }

    const score = Number(item?.score);
    normalized.push({
      definitionId,
      score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : Math.max(100 - (index * 6), 40),
      reasons: Array.isArray(item?.reasons)
        ? item.reasons.map((reason) => String(reason || "").trim()).filter(Boolean).slice(0, 4)
        : []
    });
    seen.add(definitionId);
  });

  return normalized;
}

export function buildIntentSearchCatalogSnapshot(sourceDefinitions = []) {
  return sourceDefinitions.map((definition) => {
    const tags = Array.isArray(definition.tags) ? definition.tags.slice(0, 8) : [];
    const description = String(definition.description || "").trim();
    return {
      id: Number(definition.id),
      name: String(definition.name || "").slice(0, 120),
      description: description.slice(0, 260),
      type: definition.type,
      tags
    };
  });
}

export function truncateForIntentSearchLog(value, maxLength = 300) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength)}...`;
}
