import path from "path";
import fs from "fs";
import matter from "gray-matter";
import YAML from "yaml";
import { detectDefinitionType } from "./detectDefinitionType.js";

const fsp = fs.promises;

export function deriveType(filePath, data, rawContent = "") {
  if (data && data.type) {
    return String(data.type).toLowerCase();
  }

  const dccUri = String(data?.dcc_uri || "").trim().toLowerCase();
  if (dccUri) {
    const [prefix] = dccUri.split("/");
    if (["rules", "prompts", "workflows", "models", "agents", "mcpservers", "mcpserver", "context", "docs", "configs", "config"].includes(prefix)) {
      return prefix;
    }
  }

  try {
    const detected = detectDefinitionType(rawContent || "", filePath || "");
    if (detected) {
      return String(detected).toLowerCase();
    }
  } catch (_error) {
    // Best-effort only; fallback to folder inference below.
  }

  const parts = filePath.split(path.sep);
  const folder = parts[parts.length - 2] || "unknown";
  return folder.toLowerCase();
}

export function normalizeDefinitionType(type) {
  const normalized = String(type || "").trim().toLowerCase();
  if (["rule", "rules"].includes(normalized)) return "rules";
  if (["prompt", "prompts"].includes(normalized)) return "prompts";
  if (["workflow", "workflows"].includes(normalized)) return "workflows";
  if (["model", "models"].includes(normalized)) return "models";
  if (["agent", "agents"].includes(normalized)) return "agents";
  if (["mcp server", "mcp servers", "mcpserver", "mcpservers"].includes(normalized)) return "mcpservers";
  if (["context", "contexts"].includes(normalized)) return "context";
  if (["doc", "docs", "documentation"].includes(normalized)) return "docs";
  if (["config", "configs"].includes(normalized)) return "configs";
  return normalized;
}

export function buildKey(type, filePath, { dccUri = "" } = {}) {
  const normalizedType = normalizeDefinitionType(type) || "unknown";
  const normalizedDccUri = String(dccUri || "").trim().toLowerCase();
  if (normalizedDccUri) {
    return `${normalizedType}::${normalizedDccUri}`;
  }
  return `${normalizedType}/${path.basename(filePath)}`;
}

export const YAML_HEADER_FIELDS = new Set(["name", "version", "schema", "description", "tags", "dcc_tags", "dcc_uri"]);

export function parseYamlHeaderFields(raw) {
  const headers = {};
  const normalized = raw.replace(/^\uFEFF/, "");
  const lines = normalized.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) break;
    const match = line.match(/^(\s*)([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
    if (!match) continue;
    const [, indent, key, value] = match;
    if (!YAML_HEADER_FIELDS.has(key)) continue;
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      const listItems = [];
      const blockIndent = indent.length;
      for (let next = i + 1; next < lines.length; next += 1) {
        const nextLine = lines[next];
        if (!nextLine.trim()) continue;
        const nextIndent = (nextLine.match(/^\s*/) || [""])[0].length;
        if (nextIndent <= blockIndent) break;
        const listMatch = nextLine.trim().match(/^-\s+(.*)$/);
        if (!listMatch) break;
        const item = listMatch[1].replace(/^(\"|\')(.*)\1$/, "$2").trim();
        if (item) listItems.push(item);
      }
      if (listItems.length > 0) headers[key] = listItems;
      continue;
    }
    if (["|", ">", "|-", ">-", "|+", ">+"].includes(trimmedValue)) {
      const blockLines = [];
      const blockIndent = indent.length;
      let contentIndent = null;
      for (let next = i + 1; next < lines.length; next += 1) {
        const nextLine = lines[next];
        if (!nextLine.trim()) { blockLines.push(""); continue; }
        const nextIndent = (nextLine.match(/^\s*/) || [""])[0].length;
        if (nextIndent <= blockIndent) { i = next - 1; break; }
        if (contentIndent === null) contentIndent = nextIndent;
        blockLines.push(nextLine.slice(contentIndent));
        if (next === lines.length - 1) i = next;
      }
      const blockValue = blockLines.join("\n").trim();
      if (blockValue) headers[key] = blockValue;
      continue;
    }
    const unquoted = value.replace(/^(\"|\')(.*)\1$/, "$2").trim();
    headers[key] = unquoted;
  }
  return headers;
}

export function normalizeTags(rawTags) {
  if (Array.isArray(rawTags)) {
    return rawTags.map((tag) => String(tag || "").trim()).filter(Boolean).join(", ");
  }
  if (typeof rawTags === "string") {
    return rawTags.split(",").map((tag) => tag.trim()).filter(Boolean).join(", ");
  }
  return "";
}

export async function parseDefinition(filePath) {
  const raw = await fsp.readFile(filePath, "utf8");
  return parseDefinitionContent(raw, filePath);
}

export function parseDefinitionContent(raw, filePath) {
  let parsed = { data: {}, content: raw };
  const ext = path.extname(filePath).toLowerCase();
  if ([".yml", ".yaml"].includes(ext)) {
    let yamlData = {};
    try {
      const parsedYaml = YAML.parse(raw);
      if (parsedYaml && typeof parsedYaml === "object" && !Array.isArray(parsedYaml)) yamlData = parsedYaml;
    } catch (_error) {
      yamlData = {};
    }
    parsed = { data: { ...parseYamlHeaderFields(raw), ...yamlData }, content: raw };
  } else {
    try { parsed = matter(raw); } catch (_error) { parsed = { data: {}, content: raw }; }
  }
  const type = deriveType(filePath, parsed.data, raw);
  const tags = normalizeTags(parsed.data.dcc_tags || parsed.data.tags);
  const name = parsed.data.name || path.basename(filePath);
  const description = parsed.data.description || "";
  const schema = parsed.data.schema || "";
  const version = parsed.data.version || "";
  return { name, description, tags, schema, version, content: raw, type, filePath, key: buildKey(type, filePath, { dccUri: parsed.data?.dcc_uri }) };
}
