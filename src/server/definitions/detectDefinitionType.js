import matter from "gray-matter";
import YAML from "yaml";
import { dccDefinitionTypeToInternal } from "./definitionType.js";
import { sanitizeYamlHeaderScalars } from "./content.js";

export function detectDefinitionType(content = "", filePath = "") {
  const extension = String(filePath || "").toLowerCase();
  const isMarkdown = extension.endsWith(".md") || extension.endsWith(".markdown") || /^---\s*\n/.test(String(content || ""));

  if (isMarkdown) {
    const parsed = matter(String(content || ""));
    return dccDefinitionTypeToInternal(parsed?.data?.dcc_definition_type);
  }

  let data = {};
  try {
    data = YAML.parse(sanitizeYamlHeaderScalars(String(content || ""))) || {};
  } catch (_error) {
    data = {};
  }
  return dccDefinitionTypeToInternal(data?.dcc_definition_type);
}
