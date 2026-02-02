import fs from "fs";
import path from "path";

const CATEGORIES = ["prompts", "agents", "workflows", "rules", "context", "mcpServers", "models"];

export function getDefinitionCategories() {
  return [...CATEGORIES];
}

function parseConfigSections(fileContent, categories) {
  const sections = new Map();
  const lines = fileContent.split(/\r?\n/);
  let currentKey = null;
  let currentLines = [];
  const flush = () => {
    if (currentKey && categories.includes(currentKey)) {
      sections.set(currentKey, [...currentLines]);
    }
    currentKey = null;
    currentLines = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    const topLevelMatch = line.match(/^(\S[^:]*):\s*(.*)$/);
    if (topLevelMatch && line.trimStart() === line) {
      flush();
      currentKey = topLevelMatch[1].trim();
      const inlineValue = topLevelMatch[2]?.trim();
      if (inlineValue) {
        currentLines.push(inlineValue);
      }
      return;
    }
    if (currentKey) {
      if (trimmed === "" || /^\s+/.test(line)) {
        currentLines.push(line);
      }
    }
  });

  flush();
  return sections;
}

function splitSectionEntries(sectionLines) {
  if (!sectionLines || sectionLines.length === 0) {
    return [];
  }
  const joined = sectionLines.join("\n").trimEnd();
  const dashLine = sectionLines.find((line) => /^\s*-\s+/.test(line));
  if (!dashLine) {
    return joined ? [joined] : [];
  }
  const baseIndent = dashLine.match(/^\s*/)[0].length;
  const items = [];
  let current = [];
  sectionLines.forEach((line) => {
    if (line.trim() === "" && current.length === 0) {
      return;
    }
    const isItemStart = line.startsWith(" ".repeat(baseIndent)) && /^\s*-\s+/.test(line);
    if (isItemStart) {
      if (current.length) {
        items.push(current.join("\n").trimEnd());
      }
      current = [line];
      return;
    }
    if (current.length) {
      current.push(line);
    }
  });
  if (current.length) {
    items.push(current.join("\n").trimEnd());
  }
  return items;
}

function stripQuotes(value) {
  return value.replace(/^["']|["']$/g, "");
}

function extractInlineValue(line) {
  const match = line.match(/^\s*-\s*(.+)$/);
  if (!match) {
    return null;
  }
  const afterDash = match[1].trim();
  if (!afterDash) {
    return null;
  }
  const inlineKeyMatch = afterDash.match(/^([A-Za-z0-9_]+):\s*(.+)$/);
  if (inlineKeyMatch) {
    return { key: inlineKeyMatch[1], value: stripQuotes(inlineKeyMatch[2].trim()) };
  }
  if (!afterDash.includes(":")) {
    return { key: "value", value: stripQuotes(afterDash) };
  }
  return null;
}

function deriveDefinitionName(type, entry, index) {
  const fallback = `${type}-${index + 1}`;
  if (!entry) {
    return fallback;
  }
  const lines = entry.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) {
    return fallback;
  }
  const inline = extractInlineValue(lines[0]);
  if (inline) {
    if (["name", "id", "uses", "provider", "model", "command", "value"].includes(inline.key)) {
      return inline.value || fallback;
    }
  }
  const keys = ["name", "id", "uses", "provider", "model", "command"];
  for (const key of keys) {
    const match = lines.find((line) => new RegExp(`^\\s*${key}:\\s+`).test(line));
    if (match) {
      return stripQuotes(match.split(":").slice(1).join(":").trim()) || fallback;
    }
  }
  return fallback;
}

function loadDefinitionsFromConfig(rootPath, source, categories) {
  const configPath = path.join(rootPath, "config.yaml");
  if (!fs.existsSync(configPath)) {
    return [];
  }
  const fileContent = fs.readFileSync(configPath, "utf-8");
  const sections = parseConfigSections(fileContent, categories);
  const definitions = [];
  sections.forEach((sectionLines, type) => {
    const entries = splitSectionEntries(sectionLines);
    entries.forEach((entry, index) => {
      definitions.push({
        type,
        name: deriveDefinitionName(type, entry, index),
        source,
        content: entry
      });
    });
  });
  return definitions;
}

export function loadDefinitionsFromRoot(rootPath, source) {
  if (!rootPath || !fs.existsSync(rootPath)) {
    return [];
  }

  const definitions = [];
  const categories = getDefinitionCategories();

  categories.forEach((type) => {
    const dir = path.join(rootPath, type);
    if (!fs.existsSync(dir)) {
      return;
    }
    const entries = fs.readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);

    entries.forEach((fileName) => {
      const filePath = path.join(dir, fileName);
      const content = fs.readFileSync(filePath, "utf-8");
      const name = path.parse(fileName).name;
      definitions.push({
        type,
        name,
        source,
        content
      });
    });
  });

  return [...definitions, ...loadDefinitionsFromConfig(rootPath, source, categories)];
}
