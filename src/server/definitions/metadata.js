import path from "path";
import matter from "gray-matter";
import YAML from "yaml";
import { parseYamlHeaderFields } from "./parse.js";

export function stripTopLevelYamlKeys(raw, keysToStrip) {
  const keys = new Set((keysToStrip || []).map((key) => String(key || "").trim()).filter(Boolean));
  if (!keys.size) return raw;
  const lines = String(raw || "").split(/\r?\n/);
  const keptLines = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(/^(\s*)([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
    const indent = match ? match[1] : "";
    const key = match ? match[2] : "";
    const shouldStrip = match && indent.length === 0 && keys.has(key);
    if (!shouldStrip) { keptLines.push(line); continue; }
    for (let next = index + 1; next < lines.length; next += 1) {
      const nextLine = lines[next];
      if (!nextLine.trim()) { index = next; continue; }
      const nextIndent = (nextLine.match(/^\s*/) || [""])[0].length;
      if (nextIndent > 0) { index = next; continue; }
      break;
    }
  }
  return keptLines.join("\n");
}

export function stripDccMetadataDeep(value) {
  if (Array.isArray(value)) return value.map((item) => stripDccMetadataDeep(item));
  if (!value || typeof value !== "object") return value;
  const cleaned = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = String(key || "").trim().toLowerCase();
    const isLegacyTagsKey = normalizedKey === "tags";
    const isDccKey = normalizedKey === "dcc" || normalizedKey.startsWith("dcc_");
    if (isDccKey || isLegacyTagsKey) continue;
    cleaned[key] = stripDccMetadataDeep(nestedValue);
  }
  return cleaned;
}

export function stripDccProjectMetadata(content, filePath) {
  const raw = String(content || "");
  const ext = path.extname(String(filePath || "")).toLowerCase();
  const keysToStrip = ["tags", "dcc_tags", "dcc_uri", "dcc_config_type"];
  if ([".yml", ".yaml"].includes(ext)) {
    try {
      const parsedYaml = YAML.parse(raw);
      if (parsedYaml && typeof parsedYaml === "object") {
        return `${YAML.stringify(stripDccMetadataDeep(parsedYaml)).replace(/\n$/, "")}\n`;
      }
    } catch (_error) {}
    return stripTopLevelYamlKeys(raw, keysToStrip);
  }
  if ([".md", ".markdown", ".mdx"].includes(ext)) {
    try {
      const parsed = matter(raw);
      if (!parsed?.matter) return raw;
      return matter.stringify(parsed.content, stripDccMetadataDeep(parsed.data));
    } catch (_error) { return raw; }
  }
  return raw;
}

export function extractDccUriFromDefinitionContent(content, { filePath = "", format = "" } = {}) {
  const normalizedFormat = String(format || "").toLowerCase();
  const ext = path.extname(String(filePath || "")).toLowerCase();
  const treatAsMarkdown = normalizedFormat === "markdown" || [".md", ".markdown", ".mdx"].includes(ext);
  if (treatAsMarkdown) {
    try { const parsed = matter(String(content || "")); return String(parsed?.data?.dcc_uri || "").trim(); } catch (_error) { return ""; }
  }
  try {
    const parsedYaml = YAML.parse(String(content || ""));
    if (parsedYaml && typeof parsedYaml === "object" && !Array.isArray(parsedYaml)) return String(parsedYaml.dcc_uri || "").trim();
  } catch (_error) {}
  const headers = parseYamlHeaderFields(String(content || ""));
  return String(headers.dcc_uri || "").trim();
}

export function parseDefinitionTagsForMetadata(rawTags) {
  return String(rawTags || "").split(",").map((tag) => tag.trim()).filter(Boolean);
}
