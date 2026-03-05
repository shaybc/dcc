const PREVIEW_SECTION_CONFIG = [
  { key: "models", label: "Models", empty: "No Models configured", learnMore: "https://docs.continue.dev/reference#models" },
  { key: "mcpServers", label: "MCP Servers", empty: "No MCP Servers configured", learnMore: "https://docs.continue.dev/reference#mcpservers" },
  { key: "rules", label: "Rules", empty: "No Rules configured", learnMore: "https://docs.continue.dev/reference#rules" },
  { key: "prompts", label: "Prompts", empty: "No Prompts configured", learnMore: "https://docs.continue.dev/reference#prompts" },
  { key: "context", label: "Context", empty: "No Context configured", learnMore: "https://docs.continue.dev/reference#context" },
  { key: "docs", label: "Docs", empty: "No Docs configured", learnMore: "https://docs.continue.dev/reference#docs" }
];

export function formatCreatedDate(value) {
  if (!value) {
    return "Created date unavailable";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Created date unavailable";
  }

  return `Created on ${date.toLocaleDateString()}`;
}

export function inferDefinitionFormat(definition) {
  const filePath = String(definition?.filePath || "").toLowerCase();
  if (filePath.endsWith(".yaml") || filePath.endsWith(".yml")) return "yaml";
  if (filePath.endsWith(".md") || filePath.endsWith(".markdown")) return "md";
  if (filePath.endsWith(".json")) return "json";
  if (filePath.endsWith(".txt")) return "txt";

  const content = String(definition?.content || "").trim();
  if (content.startsWith("#") || content.includes("\n#")) return "md";
  if (content.includes(":") && content.includes("\n")) return "yaml";
  return "txt";
}

export function formatTabLabel(format) {
  if (format === "yaml") return "Source (YAML)";
  if (format === "md") return "Source (MD)";
  if (format === "json") return "Source (JSON)";
  if (format === "txt") return "Source (TXT)";
  return "Source";
}

export function prettifyName(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) {
    return "Unnamed";
  }

  const tail = raw.includes("/") ? raw.split("/").pop() : raw;
  return tail
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function extractField(block, field) {
  const pattern = new RegExp(`(?:^|\\n)\\s*${field}\\s*:\\s*([^\\n]+)`, "i");
  const match = block.match(pattern);
  return match ? match[1].trim().replace(/^['\"]|['\"]$/g, "") : "";
}

function parseTopLevelListSection(content, sectionName) {
  const lines = String(content || "").replace(/\r\n/g, "\n").split("\n");
  const sectionRegex = new RegExp(`^${sectionName}\\s*:\\s*$`, "i");

  let inSection = false;
  let currentItemLines = [];
  const blocks = [];

  const flushCurrent = () => {
    if (currentItemLines.length > 0) {
      blocks.push(currentItemLines.join("\n"));
      currentItemLines = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const topLevelKeyMatch = trimmed.match(/^[A-Za-z][A-Za-z0-9_-]*\s*:\s*$/);

    if (!inSection) {
      if (sectionRegex.test(trimmed)) {
        inSection = true;
      }
      continue;
    }

    if (topLevelKeyMatch && !sectionRegex.test(trimmed)) {
      flushCurrent();
      break;
    }

    const itemMatch = line.match(/^\s*-\s*(.*)$/);
    if (itemMatch) {
      flushCurrent();
      currentItemLines.push(itemMatch[1] || "");
      continue;
    }

    if (currentItemLines.length > 0) {
      currentItemLines.push(line.replace(/^\s+/, ""));
    }
  }

  flushCurrent();
  return blocks;
}

function buildItemFromBlock(typeKey, block) {
  const text = String(block || "").trim();
  const uses = extractField(text, "uses");
  const name = extractField(text, "name");
  const provider = extractField(text, "provider");
  const description = extractField(text, "description");

  const titleSeed = uses || name || provider || text.split("\n")[0] || "Item";
  const title = prettifyName(titleSeed);

  if (typeKey === "models") {
    const derivedProvider = provider || (uses.includes("/") ? uses.split("/")[0] : "model");
    const roleMatches = [...text.matchAll(/-\s*(chat|edit|apply|autocomplete)\b/gi)].map((match) => match[1].toLowerCase());
    const roles = [...new Set(roleMatches)].slice(0, 4);
    return {
      title,
      subtitle: derivedProvider || "model",
      chips: roles,
      description: description || ""
    };
  }

  if (typeKey === "context") {
    return {
      title: title.startsWith("@") ? title : `@${title.replace(/\s+/g, "").toLowerCase()}`,
      subtitle: description || provider || "Context provider"
    };
  }

  return {
    title,
    subtitle: description || provider || `${PREVIEW_SECTION_CONFIG.find((section) => section.key === typeKey)?.label || "Item"} item`
  };
}

function getFallbackPreviewSectionKey(normalizedType) {
  if (normalizedType === "rules") return "rules";
  if (normalizedType === "prompts") return "prompts";
  if (normalizedType === "context") return "context";
  if (normalizedType === "models") return "models";
  if (normalizedType === "mcp servers") return "mcpServers";
  if (normalizedType === "docs") return "docs";
  return null;
}

function buildFallbackPreviewItem(definitionMeta) {
  return {
    title: prettifyName(definitionMeta?.name || definitionMeta?.filePath || "Definition"),
    subtitle: definitionMeta?.description || "Markdown definition"
  };
}

export function createDefinitionPreviewRenderer({ normalizeFilterType, escapeHtml }) {
  function collectPreviewSections(definitionContent, definitionMeta = {}) {
    const mappings = {
      models: ["models"],
      mcpServers: ["mcpServers"],
      rules: ["rules"],
      prompts: ["prompts"],
      context: ["context"],
      docs: ["docs"]
    };

    const normalizedType = normalizeFilterType(definitionMeta?.type);
    const isMarkdown = inferDefinitionFormat(definitionMeta) === "md";
    const sourceContent = String(definitionContent || "");

    if (isMarkdown) {
      const markdownSectionKey = getFallbackPreviewSectionKey(normalizedType);
      const markdownItem = buildFallbackPreviewItem(definitionMeta);
      return PREVIEW_SECTION_CONFIG.map((section) => ({
        ...section,
        items: section.key === markdownSectionKey ? [markdownItem] : []
      }));
    }

    return PREVIEW_SECTION_CONFIG.map((section) => {
      const aliases = mappings[section.key] || [section.key];
      const blocks = aliases.flatMap((alias) => parseTopLevelListSection(sourceContent, alias));
      const items = blocks.map((block) => buildItemFromBlock(section.key, block)).filter((item) => item.title);
      return { ...section, items };
    });
  }

  function renderPreviewSection(section) {
    const header = `
      <div class="preview-section-header">
        <h3>${section.label}</h3>
        <a href="${section.learnMore}" target="_blank" rel="noopener noreferrer">
          Learn more
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M15 3h6v6"></path>
            <path d="M10 14 21 3"></path>
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          </svg>
        </a>
      </div>
    `;

    if (section.items.length === 0) {
      return `
        <section class="preview-section">
          ${header}
          <p class="preview-empty">${section.empty}</p>
        </section>
      `;
    }

    const cards = section.items
      .map((item) => `
        <article class="preview-card">
          <div class="preview-card-title">${escapeHtml(item.title)}</div>
          <div class="preview-card-subtitle">${escapeHtml(item.subtitle || "")}</div>
          ${item.chips && item.chips.length > 0 ? `<div class="preview-card-chips">${item.chips.map((chip) => `<span>${escapeHtml(chip)}</span>`).join("")}</div>` : ""}
        </article>
      `)
      .join("");

    return `
      <section class="preview-section">
        ${header}
        <div class="preview-grid">${cards}</div>
      </section>
    `;
  }

  function renderDefinitionPreview(definitionContent, definitionMeta = {}) {
    const sections = collectPreviewSections(definitionContent, definitionMeta);
    return sections.map((section) => renderPreviewSection(section)).join("");
  }

  return {
    renderDefinitionPreview,
  };
}
