export function normalizeFilterType(type, filterTypeSet) {
  const normalized = String(type || "").trim().toLowerCase();
  if (["model", "models"].includes(normalized)) return "models";
  if (["mcp server", "mcp servers", "mcpserver", "mcpservers"].includes(normalized)) return "mcp servers";
  if (["rule", "rules"].includes(normalized)) return "rules";
  if (["prompt", "prompts"].includes(normalized)) return "prompts";
  if (["agent", "agents"].includes(normalized)) return "agents";
  if (["context", "contexts"].includes(normalized)) return "context";
  if (["workflow", "workflows"].includes(normalized)) return "workflows";
  if (["doc", "docs", "documentation"].includes(normalized)) return "docs";
  if (["config", "configs"].includes(normalized)) return "configs";
  if (["user", "users", "org", "orgs", "ai_assets", "ai assets"].includes(normalized)) return "unknown";
  return filterTypeSet.has(normalized) ? normalized : "unknown";
}

export function extractDccUriFromDefinitionContent(content, filePath = "") {
  const raw = String(content || "");
  const ext = String(filePath || "").toLowerCase();
  const frontmatterMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (frontmatterMatch) {
    const frontmatterValue = frontmatterMatch[1].match(/^\s*dcc_uri\s*:\s*(.+?)\s*$/m);
    if (frontmatterValue?.[1]) {
      return frontmatterValue[1].replace(/^("|')(.*)\1$/, "$2").trim();
    }
  }

  if (ext.endsWith(".md") || ext.endsWith(".markdown")) {
    return "";
  }

  const yamlValue = raw.match(/^\s*dcc_uri\s*:\s*(.+?)\s*$/m);
  if (!yamlValue?.[1]) {
    return "";
  }
  return yamlValue[1].replace(/^("|')(.*)\1$/, "$2").trim();
}

export function extractDccDefinitionTypeFromDefinitionContent(content, filePath = "") {
  const raw = String(content || "");
  const ext = String(filePath || "").toLowerCase();
  const frontmatterMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (frontmatterMatch) {
    const frontmatterValue = frontmatterMatch[1].match(/^\s*dcc_definition_type\s*:\s*(.+?)\s*$/m);
    if (frontmatterValue?.[1]) {
      return frontmatterValue[1].replace(/^("|')(.*)\1$/, "$2").trim();
    }
  }

  if (ext.endsWith(".md") || ext.endsWith(".markdown")) {
    return "";
  }

  const yamlValue = raw.match(/^\s*dcc_definition_type\s*:\s*(.+?)\s*$/m);
  if (!yamlValue?.[1]) {
    return "";
  }
  return yamlValue[1].replace(/^("|')(.*)\1$/, "$2").trim();
}

export function renderRepoOrigin(definition) {
  const repoDisplayName = String(definition?.repoDisplayName || definition?.repoName || "").trim();
  const repoRelativePath = String(definition?.repoRelativePath || "").trim();
  const repoRemoteUrl = String(definition?.repoRemoteUrl || "").trim();

  if (!repoDisplayName && !repoRemoteUrl) {
    return "Origin: Team / local-only";
  }

  let originText = `Origin: ${repoDisplayName || repoRemoteUrl}`;
  if (repoRelativePath) {
    originText += ` (${repoRelativePath})`;
  }
  return originText;
}

export function normalizeTagValue(tag) {
  return String(tag || "").trim().toLowerCase();
}

export function parseDefinitionTags(rawTags) {
  const source = Array.isArray(rawTags) ? rawTags.join(",") : String(rawTags || "");
  const seen = new Set();
  const tags = [];

  source
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .forEach((tag) => {
      const normalized = normalizeTagValue(tag);
      if (!normalized || seen.has(normalized)) {
        return;
      }
      seen.add(normalized);
      tags.push(tag);
    });

  return tags;
}

export function parseTagSearchQuery(rawSearch) {
  return String(rawSearch || "")
    .split(",")
    .map((entry) => normalizeTagValue(entry))
    .filter(Boolean);
}

export function iconSvg(status) {
  if (status === "saved") {
    return `
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M5 10.5l3 3 7-7" />
      </svg>
    `;
  }
  if (status === "local-only") {
    return `
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10 4v12" />
        <path d="M6 8l4-4 4 4" />
      </svg>
    `;
  }
  return `
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M10 4v12" />
      <path d="M4 10h12" />
    </svg>
  `;
}

export function statusLabel(status, source = "") {
  const suffix = String(source || "").toLowerCase() === "untracked" ? " · Untracked" : "";
  if (status === "saved") {
    return `Saved to team${suffix}`;
  }
  if (status === "local-only") {
    return `Local only${suffix}`;
  }
  return `Available${suffix}`;
}

export function formatFilterLabel(type) {
  if (type === "all") {
    return "All";
  }
  if (type === "installed") {
    return "Installed";
  }
  return type
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatTypePillLabel(type, filterTypeSet) {
  const normalizedType = normalizeFilterType(type, filterTypeSet);
  if (normalizedType === "models") return "Model";
  if (normalizedType === "mcp servers") return "MCP Server";
  if (normalizedType === "rules") return "Rule";
  if (normalizedType === "prompts") return "Prompt";
  if (normalizedType === "agents") return "Agent";
  if (normalizedType === "context") return "Context";
  if (normalizedType === "workflows") return "Workflow";
  if (normalizedType === "docs") return "Doc";
  if (normalizedType === "configs") return "Config";
  return "Unknown";
}

export function typeClassName(type, filterTypeSet) {
  return `type-${normalizeFilterType(type, filterTypeSet).replace(/\s+/g, "-")}`;
}

export function getCardDescription(description) {
  const fallback = "No description provided.";
  if (!description) {
    return fallback;
  }

  const normalized = String(description).replace(/\s+/g, " ").trim();
  if (!normalized) {
    return fallback;
  }

  return normalized;
}

export function getCardTitle(name) {
  const fallback = "Untitled definition";
  const normalized = String(name || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return fallback;
  }

  const maxLength = 25;
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderDescriptionMarkdown(description) {
  const raw = String(description || "").replace(/\r\n/g, "\n");
  if (!raw.trim()) {
    return "<p>No description provided.</p>";
  }

  const codeBlocks = [];
  let html = escapeHtml(raw).replace(/```([\s\S]*?)```/g, (_, code) => {
    const trimmed = code.replace(/^\n+|\n+$/g, "");
    const index = codeBlocks.push(`<pre><code>${trimmed}</code></pre>`) - 1;
    return `@@CODE_BLOCK_${index}@@`;
  });

  html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  const blocks = html
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (/^@@CODE_BLOCK_\d+@@$/.test(block)) {
        return block;
      }
      return `<p>${block.replace(/\n/g, "<br>")}</p>`;
    });

  const withParagraphs = blocks.join("");
  return withParagraphs.replace(/@@CODE_BLOCK_(\d+)@@/g, (_, index) => codeBlocks[Number(index)] || "");
}

export function parseErrorMessage(payload, fallbackMessage) {
  if (!payload) {
    return fallbackMessage;
  }
  if (typeof payload === "string") {
    return payload;
  }
  if (payload.error) {
    return String(payload.error);
  }
  return fallbackMessage;
}

export function createFetchWithErrorHandling({ runWithLoading }) {
  return async function fetchWithErrorHandling(url, options = {}, fallbackMessage = "Request failed.", loadingOptions = null) {
    const executeRequest = async () => {
      const response = await fetch(url, options);
      let payload = null;
      try {
        payload = await response.json();
      } catch (_error) {
        payload = null;
      }

      if (!response.ok) {
        throw new Error(parseErrorMessage(payload, fallbackMessage));
      }

      return payload;
    };

    if (loadingOptions) {
      return runWithLoading(executeRequest, loadingOptions);
    }

    return executeRequest();
  };
}
