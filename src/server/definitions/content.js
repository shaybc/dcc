import path from "path";
import matter from "gray-matter";
import YAML from "yaml";

export function sanitizeDuplicateFileName(fileName) {
  const normalized = path.basename(String(fileName || "").trim());
  if (!normalized || normalized === "." || normalized === "..") return "";
  if (/[\/]/.test(normalized)) return "";
  return normalized;
}

export function updateDefinitionNameInContent(content, fileName, nextName) {
  const trimmedName = String(nextName || "").trim();
  if (!trimmedName) return content;
  const ext = path.extname(fileName).toLowerCase();
  if ([".yml", ".yaml"].includes(ext)) {
    if (/^\s*name\s*:/m.test(content)) return content.replace(/^(\s*name\s*:\s*)(.*)$/m, (_m, prefix) => `${prefix}${trimmedName}`);
    return `name: ${trimmedName}\n${content}`;
  }
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/);
  if (!frontmatterMatch) return content;
  const header = frontmatterMatch[1];
  if (/^\s*name\s*:/m.test(header)) return content.replace(/^(---\r?\n[\s\S]*?\r?\n)(\s*name\s*:\s*)(.*)$/m, (_m, before, prefix) => `${before}${prefix}${trimmedName}`);
  return content.replace(/^---\r?\n/, `---\nname: ${trimmedName}\n`);
}

export function updateDefinitionMetadataInContent(content, fileName, { name = "", dccUri = "" } = {}) {
  const ext = path.extname(fileName).toLowerCase();
  const trimmedName = String(name || "").trim();
  const trimmedDccUri = String(dccUri || "").trim();

  if ([".yml", ".yaml"].includes(ext)) {
    const parsed = YAML.parse(sanitizeYamlHeaderScalars(content || "")) || {};
    if (trimmedName) parsed.name = trimmedName;
    if (trimmedDccUri) parsed.dcc_uri = trimmedDccUri;
    return YAML.stringify(parsed);
  }

  const parsed = matter(String(content || ""));
  if (trimmedName) parsed.data.name = trimmedName;
  if (trimmedDccUri) parsed.data.dcc_uri = trimmedDccUri;
  return matter.stringify(parsed.content, parsed.data);
}

export function bumpPatchVersion(version) {
  const match = String(version || "").trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return "1.0.0";
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

export function applyVersionToContent(content, filePath, version) {
  const ext = path.extname(filePath).toLowerCase();
  if ([".yml", ".yaml"].includes(ext)) {
    const parsed = YAML.parse(content) || {};
    parsed.version = version;
    return YAML.stringify(parsed);
  }
  const parsed = matter(content || "");
  parsed.data.version = version;
  return matter.stringify(parsed.content, parsed.data);
}

export function sanitizeYamlHeaderScalars(raw) {
  return String(raw || "")
    .replace(/^(\s*)(name|version|schema|description)\s*:\s*([^\r\n]*?)(\s+#.*)?$/gim, (fullMatch, indent, key, value, suffix) => {
      const trimmedValue = String(value || "").trim();
      if (!trimmedValue) return fullMatch;
      if (["|", ">", "|-", ">-", "|+", ">+"].includes(trimmedValue)) return fullMatch;
      if (/^("[\s\S]*"|'[\s\S]*')$/.test(trimmedValue)) return fullMatch;
      return `${indent}${key}: "${trimmedValue}"${suffix || ""}`;
    });
}

export function sanitizeMarkdownFrontmatterHeaderScalars(raw) {
  const source = String(raw || "");
  const frontmatterMatch = source.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)(\r?\n|$)/);
  if (!frontmatterMatch) return source;

  const [, opening, frontmatterBody, closing, trailingNewline] = frontmatterMatch;
  const sanitizedFrontmatter = sanitizeYamlHeaderScalars(frontmatterBody);
  return `${opening}${sanitizedFrontmatter}${closing}${trailingNewline}${source.slice(frontmatterMatch[0].length)}`;
}

export function readDefinitionYamlData(rawContent, filePath = "") {
  const ext = path.extname(String(filePath || "")).toLowerCase();
  if ([".md", ".markdown", ".mdx"].includes(ext)) {
    const raw = String(rawContent || "");
    const frontmatterMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);

    const parseFrontmatterFallback = () => {
      if (!frontmatterMatch) return null;
      const data = YAML.parse(sanitizeYamlHeaderScalars(frontmatterMatch[1])) || {};
      const body = raw.slice(frontmatterMatch[0].length).trim();
      return { data: (data && typeof data === "object") ? data : {}, body };
    };

    try {
      const parsed = matter(raw);
      const body = String(parsed.content || "").trim();
      if (frontmatterMatch && (!parsed.data || Object.keys(parsed.data).length === 0)) {
        const fallbackResult = parseFrontmatterFallback();
        if (fallbackResult) return fallbackResult;
      }
      return { data: parsed.data || {}, body };
    } catch (_error) {
      const fallbackResult = parseFrontmatterFallback();
      if (fallbackResult) return fallbackResult;
      return { data: {}, body: raw.trim() };
    }
  }
  const data = YAML.parse(sanitizeYamlHeaderScalars(rawContent || "")) || {};
  return { data: (data && typeof data === "object") ? data : {}, body: "" };
}
