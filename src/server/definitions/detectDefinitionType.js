import matter from "gray-matter";
import YAML from "yaml";

function hasArrayWithValues(value) {
  return Array.isArray(value) && value.length > 0;
}

function hasMarkdownList(body = "") {
  return /^\s*[-*]\s+.+/m.test(String(body || ""));
}

export function detectDefinitionType(content = "", filePath = "") {
  const extension = String(filePath || "").toLowerCase();
  const isMarkdown = extension.endsWith(".md") || extension.endsWith(".markdown") || /^---\s*\n/.test(content);

  if (isMarkdown) {
    const parsed = matter(content || "");
    const frontmatter = parsed.data || {};

    if (hasArrayWithValues(frontmatter.tools)) {
      return "agent";
    }

    if (Object.keys(frontmatter).length > 0 && hasMarkdownList(parsed.content)) {
      return "rule";
    }

    if (Object.keys(frontmatter).length > 0) {
      return "rule";
    }
  }

  const data = YAML.parse(content || "") || {};

  if (hasArrayWithValues(data.prompts)) {
    return "prompt";
  }

  if (hasArrayWithValues(data.mcpServers)) {
    return "mcpServer";
  }

  const hasModels = hasArrayWithValues(data.models);
  const hasContext = hasArrayWithValues(data.context);
  const hasRules = hasArrayWithValues(data.rules);

  if (hasModels && hasContext && hasRules) {
    return "workflow";
  }

  if (hasModels) {
    return "model";
  }

  if (hasContext) {
    return "context";
  }

  return "prompt";
}
