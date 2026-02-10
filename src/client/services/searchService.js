import { parseTagSearchQuery, isTagOnlyQuery } from "../utils/tagUtils.js";

export function filterDefinitions(definitions, { activeFilter = "all", searchTerm = "" }) {
  const normalizedSearch = String(searchTerm || "").toLowerCase();
  const queryTags = parseTagSearchQuery(normalizedSearch);
  const tagOnlyMode = isTagOnlyQuery(queryTags, definitions);

  return definitions.filter((definition) => {
    const matchesFilter = activeFilter === "all" || definition.type === activeFilter;
    const text = `${definition.name} ${definition.description}`.toLowerCase();
    const matchesTagSearch = queryTags.every((tag) => definition.tagsNormalized.includes(tag));
    const matchesSearch = tagOnlyMode ? matchesTagSearch : text.includes(normalizedSearch);
    return matchesFilter && matchesSearch;
  });
}
