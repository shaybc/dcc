import matter from "gray-matter";
import YAML from "yaml";
import { dccDefinitionTypeToInternal } from "./definitionType.js";
import { sanitizeYamlHeaderScalars } from "./content.js";

export function detectDefinitionType(content = "", filePath = "") {
  const raw = String(content || "");
  const extension = String(filePath || "").toLowerCase();
  const isMarkdown = extension.endsWith(".md") || extension.endsWith(".markdown") || /^---\s*\n/.test(raw);

  if (isMarkdown) {
    try {
      const parsed = matter(raw);
      const detected = dccDefinitionTypeToInternal(parsed?.data?.dcc_definition_type);
      if (detected) return detected;
    } catch (_error) {
      // fall back to tolerant frontmatter parsing below
    }

    const frontmatterMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!frontmatterMatch) return "";

    try {
      const data = YAML.parse(sanitizeYamlHeaderScalars(frontmatterMatch[1])) || {};
      return dccDefinitionTypeToInternal(data?.dcc_definition_type);
    } catch (_error) {
      return "";
    }
  }

  let data = {};
  try {
    data = YAML.parse(sanitizeYamlHeaderScalars(String(content || ""))) || {};
  } catch (_error) {
    data = {};
  }
  return dccDefinitionTypeToInternal(data?.dcc_definition_type);
}
