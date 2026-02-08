const cardsContainer = document.getElementById("cards");
const filtersContainer = document.getElementById("filters");
const searchInput = document.getElementById("search");
const clearSearchButton = document.getElementById("clearSearch");
const searchField = document.querySelector(".search-field");
const filterButton = document.getElementById("filterButton");
const filterMenu = document.getElementById("filterMenu");
const hubHeader = document.getElementById("hubHeader");
const hubMain = document.getElementById("hubMain");
const detailPage = document.getElementById("detailPage");
const closeModal = document.getElementById("closeModal");
const detailTitle = document.getElementById("detailTitle");
const detailDescription = document.getElementById("detailDescription");
const detailContent = document.getElementById("detailContent");
const detailStatus = document.getElementById("detailStatus");
const detailTypeIcon = document.getElementById("detailTypeIcon");
const detailTypeMetaIcon = document.getElementById("detailTypeMetaIcon");
const detailTypeText = document.getElementById("detailTypeText");
const detailCreatedDate = document.getElementById("detailCreatedDate");
const detailTags = document.getElementById("detailTags");
const detailVersionMeta = document.getElementById("detailVersionMeta");
const copyDefinitionButton = document.getElementById("copyDefinition");
const editDefinitionButton = document.getElementById("editDefinition");
const newDefinitionButton = document.getElementById("newDefinitionButton");
const newDefinitionMenu = document.getElementById("newDefinitionMenu");
const duplicateDefinitionButton = document.getElementById("duplicateDefinition");
const pushUpstreamDefinitionButton = document.getElementById("pushUpstreamDefinition");
const versionHistoryButton = document.getElementById("versionHistoryButton");
const deleteDefinitionButton = document.getElementById("deleteDefinition");
const versionBanner = document.getElementById("versionBanner");
const definitionTabPreview = document.getElementById("definitionTabPreview");
const definitionTabSource = document.getElementById("definitionTabSource");
const definitionTabTest = document.getElementById("definitionTabTest");
const definitionPreviewPanel = document.getElementById("definitionPreviewPanel");
const definitionSourcePanel = document.getElementById("definitionSourcePanel");
const definitionTestPanel = document.getElementById("definitionTestPanel");
const definitionPreviewContent = document.getElementById("definitionPreviewContent");
const definitionTestContent = document.getElementById("definitionTestContent");
const devProjectInput = document.getElementById("devProjectSelect");
const devProjectOptions = document.getElementById("devProjectOptions");
let definitions = [];
let activeFilter = "all";
let searchTerm = "";
let devProjects = [];
let currentDetailDefinitionId = null;
let currentDetailDefinitionSource = "";
let currentDetailDefinitionName = "";
let currentDetailDefinitionPath = "";
let currentDefinitionVersion = "";
let activeHistoricalVersion = "";
let activeVersionDropdown = null;
const FILTER_TYPES = ["models", "mcp servers", "rules", "prompts", "agents", "context", "workflows", "unknown"];
const FILTER_TYPE_SET = new Set(FILTER_TYPES);
const MAX_CARD_TAG_PILLS = 3;
function normalizeFilterType(type) {
  const normalized = String(type || "").trim().toLowerCase();
  if (["model", "models"].includes(normalized)) return "models";
  if (["mcp server", "mcp servers", "mcpserver", "mcpservers"].includes(normalized)) return "mcp servers";
  if (["rule", "rules"].includes(normalized)) return "rules";
  if (["prompt", "prompts"].includes(normalized)) return "prompts";
  if (["agent", "agents"].includes(normalized)) return "agents";
  if (["context", "contexts"].includes(normalized)) return "context";
  if (["workflow", "workflows"].includes(normalized)) return "workflows";
  if (["user", "users", "org", "orgs", "ai_assets", "ai assets"].includes(normalized)) return "unknown";
  return FILTER_TYPE_SET.has(normalized) ? normalized : "unknown";
}
function normalizeTagValue(tag) {
  return String(tag || "").trim().toLowerCase();
}
function parseErrorMessage(payload, fallbackMessage) {
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
async function fetchWithErrorHandling(url, options = {}, fallbackMessage = "Request failed.") {
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
}
function parseDefinitionTags(rawTags) {
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
function parseTagSearchQuery(rawSearch) {
  return String(rawSearch || "")
    .split(",")
    .map((entry) => normalizeTagValue(entry))
    .filter(Boolean);
}
function isTagOnlyQuery(queryTags) {
  if (queryTags.length === 0) {
    return false;
  }
  return queryTags.every((tag) => definitions.some((def) => def.tagsNormalized.includes(tag)));
}
function setSearchValue(value) {
  searchTerm = String(value || "").toLowerCase();
  searchInput.value = value || "";
  searchField.classList.toggle("has-value", searchTerm.length > 0);
}
function renderTagPills(tags, { truncate = false } = {}) {
  const visibleTags = truncate ? tags.slice(0, MAX_CARD_TAG_PILLS) : tags;
  const hiddenCount = Math.max(tags.length - visibleTags.length, 0);
  const pills = visibleTags
    .map((tag) => `<button class="tag-pill" type="button" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`)
    .join("");
  if (!hiddenCount) {
    return pills;
  }
  return `${pills}<span class="tag-pill tag-pill-more" aria-label="${hiddenCount} more tags">...</span>`;
}
function iconSvg(status) {
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
function statusLabel(status, source = "") {
  const suffix = String(source || "").toLowerCase() === "untracked" ? " · Untracked" : "";
  if (status === "saved") {
    return `Saved to team${suffix}`;
  }
  if (status === "local-only") {
    return `Local only${suffix}`;
  }
  return `Available${suffix}`;
}
function formatFilterLabel(type) {
  if (type === "all") {
    return "All";
  }
  return type
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
function formatTypePillLabel(type) {
  const normalizedType = normalizeFilterType(type);
  if (normalizedType === "models") return "Model";
  if (normalizedType === "mcp servers") return "MCP Server";
  if (normalizedType === "rules") return "Rule";
  if (normalizedType === "prompts") return "Prompt";
  if (normalizedType === "agents") return "Agent";
  if (normalizedType === "context") return "Context";
  if (normalizedType === "workflows") return "Workflow";
  return "Unknown";
}
function typeClassName(type) {
  return `type-${normalizeFilterType(type).replace(/\s+/g, "-")}`;
}
function getCardDescription(description) {
  const fallback = "No description provided.";
  if (!description) {
    return fallback;
  }
  const normalized = String(description).replace(/\s+/g, " ").trim();
  if (!normalized) {
    return fallback;
  }
  const maxLength = 170;
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function renderDescriptionMarkdown(description) {
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
function filterIconSvg(type) {
  if (type === "prompt" || type === "prompts") {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a4 4 0 0 1-4 4H7l-4 3 1.2-4.6A6 6 0 0 1 3 15a6 6 0 0 1 6-6h8a4 4 0 0 1 4 4z"></path>
      </svg>
    `;
  }
  if (type === "model" || type === "models") {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .66.26 1.3.73 1.77.47.47 1.1.73 1.77.73H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
    `;
  }
  if (type === "mcp servers" || type === "mcp server") {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="6" rx="2"></rect>
        <rect x="3" y="9" width="18" height="6" rx="2"></rect>
        <rect x="3" y="15" width="18" height="6" rx="2"></rect>
      </svg>
    `;
  }
  if (type === "rules" || type === "rule") {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 3h8"></path>
        <path d="M6 7h12"></path>
        <path d="M8 11h8"></path>
        <path d="M10 15h4"></path>
        <path d="M12 19h0"></path>
      </svg>
    `;
  }
  if (type === "agents" || type === "agent") {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="8" r="4"></circle>
        <path d="M6 20a6 6 0 0 1 12 0"></path>
      </svg>
    `;
  }
  if (type === "users" || type === "user") {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="7" r="4"></circle>
        <path d="M4 21a8 8 0 0 1 16 0"></path>
      </svg>
    `;
  }
  if (type === "orgs" || type === "org") {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 21h18"></path>
        <path d="M5 21V7l7-4 7 4v14"></path>
        <path d="M9 21v-6h6v6"></path>
      </svg>
    `;
  }
  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="8"></circle>
      <path d="M8 12h8"></path>
      <path d="M12 8v8"></path>
    </svg>
  `;
}
function renderFilters() {
  const definitionTypes = definitions.map((def) => normalizeFilterType(def.type));
  const uniqueTypes = new Set(
    [...FILTER_TYPES, ...definitionTypes]
      .filter(Boolean)
      .map((type) => String(type).toLowerCase())
  );
  const types = ["all", ...uniqueTypes];
  filtersContainer.innerHTML = "";
  filterMenu.innerHTML = "";
  types.forEach((type) => {
    const label = formatFilterLabel(type);
    if (type === activeFilter && type !== "all") {
      const chip = document.createElement("button");
      chip.className = "chip active";
      chip.innerHTML = `
        <span class="chip-icon">${filterIconSvg(type)}</span>
        <span class="chip-label">${label}</span>
        <span class="chip-clear" role="button" aria-label="Clear filter">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18"></path>
            <path d="m6 6 12 12"></path>
          </svg>
        </span>
      `;
      chip.addEventListener("click", (event) => {
        if (event.target.closest(".chip-clear")) {
          activeFilter = "all";
        } else {
          activeFilter = type;
        }
        renderFilters();
        renderCards();
      });
      filtersContainer.appendChild(chip);
    }
    const menuItem = document.createElement("button");
    menuItem.className = "filter-menu-item";
    menuItem.type = "button";
    menuItem.innerHTML = `
      <span class="chip-icon">${filterIconSvg(type)}</span>
      <span class="chip-label">${label}</span>
      ${type === activeFilter ? `<span class="active-indicator"></span>` : ""}
    `;
    menuItem.addEventListener("click", () => {
      activeFilter = type;
      renderFilters();
      renderCards();
      closeFilterMenu();
    });
    filterMenu.appendChild(menuItem);
  });
}
function renderCards() {
  const queryTags = parseTagSearchQuery(searchTerm);
  const tagOnlyMode = isTagOnlyQuery(queryTags);
  const filtered = definitions.filter((def) => {
    const matchesFilter = activeFilter === "all" || def.type === activeFilter;
    const text = `${def.name} ${def.description}`.toLowerCase();
    const matchesTagSearch = queryTags.every((tag) => def.tagsNormalized.includes(tag));
    const matchesSearch = tagOnlyMode ? matchesTagSearch : text.includes(searchTerm);
    return matchesFilter && matchesSearch;
  });
  cardsContainer.innerHTML = "";
  filtered.forEach((def) => {
    const card = document.createElement("div");
    card.className = "card";
    if (def.status === "saved" && devProjectInput.value.trim()) {
      card.classList.add("card-in-project");
    }
    const showPushAction = String(def.source || "").toLowerCase() === "untracked";
    card.innerHTML = `
      <div class="card-actions">
        ${showPushAction ? `<div class="icon-btn" data-action-push title="Push to upstream" aria-label="Push to upstream">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 16V4" />
            <path d="M5 9l5-5 5 5" />
          </svg>
        </div>` : ""}
        <div class="icon-btn" data-action-save>
          ${iconSvg(def.status)}
        </div>
      </div>
      <h3>${def.name}</h3>
      <p>${getCardDescription(def.description)}</p>
      ${def.tags.length > 0 ? `<div class="tag-pills card-tag-pills">${renderTagPills(def.tags, { truncate: true })}</div>` : ""}
      <div class="meta-row">
        <div class="meta-status">${statusLabel(def.status, def.source)}</div>
        <div class="type-pill ${typeClassName(def.type)}">
          <span class="type-pill-icon">${filterIconSvg(def.type)}</span>
          <span>${formatTypePillLabel(def.type)}</span>
        </div>
      </div>
    `;
    card.addEventListener("click", async (event) => {
      const clickedTag = event.target.closest("[data-tag]");
      if (clickedTag) {
        event.stopPropagation();
        setSearchValue(clickedTag.getAttribute("data-tag") || "");
        renderCards();
        return;
      }
      const pushAction = event.target.closest("[data-action-push]");
      if (pushAction) {
        event.stopPropagation();
        const commitMessage = window.prompt("Commit message", `Add definition ${def.name || ""}`);
        if (commitMessage === null) {
          return;
        }
        try {
          await pushDefinitionToUpstream(def.id, commitMessage);
          await fetchDefinitions();
        } catch (error) {
          window.alert(error.message || "Unable to push definition.");
        }
        return;
      }
      const saveAction = event.target.closest("[data-action-save]");
      if (saveAction) {
        event.stopPropagation();
        try {
          if (def.status === "saved") {
            await removeDefinition(def.id);
          } else if (def.status === "local-only") {
            await publishDefinition(def.id);
          } else if (def.status !== "saved") {
            await saveDefinition(def.id);
          }
          await fetchDefinitions();
        } catch (error) {
          window.alert(error.message || "Action failed.");
        }
        return;
      }
      await showDetails(def.id);
      updateRouteForDetails(def.id);
    });
    cardsContainer.appendChild(card);
  });
}
function renderDevProjectsOptions(projects) {
  devProjectOptions.innerHTML = "";
  projects.forEach((project) => {
    const option = document.createElement("option");
    option.value = project;
    devProjectOptions.appendChild(option);
  });
}
async function loadDevProjects() {
  const response = await fetch("/api/dev-projects");
  if (!response.ok) {
    return;
  }
  const data = await response.json();
  devProjects = data.map((project) => project.path || project).filter(Boolean);
  renderDevProjectsOptions(devProjects);
}
async function loadCurrentDevProject() {
  const response = await fetch("/api/current-dev-project");
  if (!response.ok) {
    return;
  }
  const data = await response.json();
  devProjectInput.value = data.path || "";
}
async function setCurrentDevProject(path) {
  await fetch("/api/current-dev-project", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path })
  });
}
async function fetchDefinitions() {
  const response = await fetch("/api/definitions");
  const rawDefinitions = await response.json();
  definitions = rawDefinitions.map((definition) => {
    const tags = parseDefinitionTags(definition.tags);
    return {
      ...definition,
      type: normalizeFilterType(definition.type),
      tags,
      tagsNormalized: tags.map((tag) => normalizeTagValue(tag))
    };
  });
  renderFilters();
  renderCards();
}
function formatCreatedDate(value) {
  if (!value) {
    return "Created date unavailable";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Created date unavailable";
  }
  return `Created on ${date.toLocaleDateString()}`;
}
function inferDefinitionFormat(definition) {
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
function formatTabLabel(format) {
  if (format === "yaml") return "YAML";
  if (format === "md") return "MD";
  if (format === "json") return "JSON";
  if (format === "txt") return "TXT";
  return "SOURCE";
}
const PREVIEW_SECTION_CONFIG = [
  { key: "models", label: "Models", empty: "No Models configured", learnMore: "https://docs.continue.dev/hub/blocks/block-types#models" },
  { key: "mcpServers", label: "MCP Servers", empty: "No MCP Servers configured", learnMore: "https://docs.continue.dev/hub/blocks/block-types#mcpServers" },
  { key: "rules", label: "Rules", empty: "No Rules configured", learnMore: "https://docs.continue.dev/hub/blocks/block-types#rules" },
  { key: "prompts", label: "Prompts", empty: "No Prompts configured", learnMore: "https://docs.continue.dev/hub/blocks/block-types#prompts" },
  { key: "context", label: "Context", empty: "No Context configured", learnMore: "https://docs.continue.dev/hub/blocks/block-types#context" }
];
function prettifyName(rawValue) {
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
  return null;
}
function buildFallbackPreviewItem(definitionMeta) {
  return {
    title: prettifyName(definitionMeta?.name || definitionMeta?.filePath || "Definition"),
    subtitle: definitionMeta?.description || "Markdown definition"
  };
}
function collectPreviewSections(definitionContent, definitionMeta = {}) {
  const mappings = {
    models: ["models"],
    mcpServers: ["mcpServers", "mcp_servers", "mcpservers"],
    rules: ["rules"],
    prompts: ["prompts"],
    context: ["context"]
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
    if (isMarkdown) {
      return {
        ...section,
        items: section.key === fallbackSectionKey ? [fallbackItem] : []
      };
    }
    const aliases = mappings[section.key] || [section.key];
    const blocks = aliases.flatMap((alias) => parseTopLevelListSection(sourceContent, alias));
    const items = blocks.map((block) => buildItemFromBlock(section.key, block)).filter((item) => item.title);
    return { ...section, items };
  });
  const hasItems = sections.some((section) => section.items.length > 0);
  const fallbackSectionKey = getFallbackPreviewSectionKey(normalizedType);
  if (!hasItems && isMarkdown && fallbackSectionKey) {
    const fallbackItem = buildFallbackPreviewItem(definitionMeta);
    return sections.map((section) => (
      section.key === fallbackSectionKey
        ? { ...section, items: [fallbackItem] }
        : section
    ));
  }
  return sections;
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
function getTestLabelForType(type) {
  const normalizedType = normalizeFilterType(type);
  if (normalizedType === "prompts") return "🧪 Test Prompt";
  if (normalizedType === "models") return "🧪 Test Model Configuration";
  if (normalizedType === "mcp servers") return "🧪 Test MCP Server";
  if (normalizedType === "agents") return "🧪 Test Agent";
  if (normalizedType === "rules") return "🧪 Validate Rule";
  if (normalizedType === "context") return "🧪 Test Context Providers";
  if (normalizedType === "workflows") return "🧪 Test Workflow";
  return "🧪 Test Definition";
}
function parsePromptVariables(content) {
  const matches = String(content || "").match(/\{([a-zA-Z0-9_.-]+)\}/g) || [];
  const seen = new Set();
  const vars = [];
  matches.forEach((match) => {
    const name = match.slice(1, -1).trim();
    if (!name || seen.has(name)) return;
    seen.add(name);
    vars.push(name);
  });
  return vars;
}
function renderTestInputs(definition) {
  const normalizedType = normalizeFilterType(definition.type);
  if (normalizedType === "prompts") {
    const variables = parsePromptVariables(definition.content || "");
    const variableInputs = variables.length > 0
      ? variables.map((variable) => `
        <div class="variable-input">
          <label for="testVar-${escapeHtml(variable)}">Variable: {${escapeHtml(variable)}}</label>
          <textarea id="testVar-${escapeHtml(variable)}" data-test-var="${escapeHtml(variable)}" rows="3" placeholder="Enter value for {${escapeHtml(variable)}}"></textarea>
        </div>
      `).join("")
      : `<p class="test-inline-note">No template variables detected. The prompt content will be tested as-is.</p>`;
    return `
      <div class="test-section">
        <label>Input Variables</label>
        ${variableInputs}
      </div>
      <div class="test-section">
        <label for="testModel">Model</label>
        <input id="testModel" type="text" value="gemini-2.0-flash-exp" placeholder="gemini-2.0-flash-exp">
      </div>
      <div class="test-section options-grid">
        <div>
          <label for="testTemperature">Temperature</label>
          <input id="testTemperature" type="number" value="0.7" min="0" max="2" step="0.1">
        </div>
        <div>
          <label for="testMaxTokens">Max Tokens</label>
          <input id="testMaxTokens" type="number" value="1000" min="1" step="1">
        </div>
      </div>
    `;
  }
  if (normalizedType === "models") {
    return `
      <div class="test-section">
        <label for="testMessage">Test Message</label>
        <textarea id="testMessage" rows="4" placeholder="Write a haiku about coding"></textarea>
      </div>
      <div class="test-section">
        <label for="testMode">Test Mode</label>
        <select id="testMode">
          <option value="dry_run">Simple completion</option>
          <option value="simulation">Streaming simulation</option>
        </select>
      </div>
      <div class="test-section options-grid">
        <div>
          <label for="testTemperature">Temperature</label>
          <input id="testTemperature" type="number" value="0.7" min="0" max="2" step="0.1">
        </div>
        <div>
          <label for="testMaxTokens">Max Tokens</label>
          <input id="testMaxTokens" type="number" value="1000" min="1" step="1">
        </div>
      </div>
    `;
  }
  if (normalizedType === "mcp servers") {
    return `
      <div class="test-section">
        <label for="testMcpType">Test Type</label>
        <select id="testMcpType">
          <option value="connection">Connection Test</option>
          <option value="list_tools">List Tools</option>
        </select>
      </div>
      <p class="test-inline-note">Tool calls are not available in this environment, but connection and listing are supported.</p>
    `;
  }
  if (normalizedType === "rules") {
    return `
      <div class="test-section">
        <p class="test-inline-note">Runs frontmatter, required field, markdown, and content validation checks.</p>
      </div>
      <div class="test-section">
        <label for="testRuleSample">Test Application (optional)</label>
        <textarea id="testRuleSample" rows="4" placeholder="Paste code snippet to validate against this rule"></textarea>
      </div>
    `;
  }
  if (normalizedType === "workflows") {
    return `
      <div class="test-section">
        <p class="test-inline-note">Validates workflow structure, step dependencies, and reference integrity.</p>
      </div>
      <div class="test-section">
        <label><input id="testWorkflowDryRun" type="checkbox" checked> Include dry-run simulation estimates</label>
      </div>
    `;
  }
  if (normalizedType === "agents") {
    return `
      <div class="test-section">
        <label for="testAgentScenario">Scenario</label>
        <textarea id="testAgentScenario" rows="4" placeholder="Find all TODO comments in the current file"></textarea>
      </div>
      <div class="test-section">
        <label><input id="testUseMocks" type="checkbox" checked> Enable tool mocking</label>
      </div>
    `;
  }
  if (normalizedType === "context") {
    return `
      <div class="test-section">
        <label for="testContextQuery">Test Query</label>
        <textarea id="testContextQuery" rows="4" placeholder="Show me the current file structure"></textarea>
      </div>
    `;
  }
  return `<p class="test-inline-note">Testing is not available for this definition type.</p>`;
}
function renderDefinitionTest(definition) {
  return `
    <div class="test-interface" data-definition-id="${definition.id}">
      <section class="test-input-panel">
        <h3>${getTestLabelForType(definition.type)}</h3>
        ${renderTestInputs(definition)}
        <div class="test-actions">
          <button type="button" class="primary-btn" id="runDefinitionTestButton">▶ Run Test</button>
          <button type="button" class="secondary-btn" id="saveDefinitionTestCaseButton">💾 Save Test Case</button>
        </div>
      </section>
      <section class="test-results-panel">
        <div class="results-header">
          <h3>Results & Validation</h3>
          <button type="button" class="secondary-btn" id="definitionTestHistoryButton">📜 History</button>
        </div>
        <div id="definitionTestResultsContent" class="empty-state">Run a test to see results.</div>
      </section>
    </div>
  `;
}
function setDefinitionTab(activeTab) {
  const isPreview = activeTab === "preview";
  const isSource = activeTab === "source";
  const isTest = activeTab === "test";
  definitionTabPreview.classList.toggle("active", isPreview);
  definitionTabSource.classList.toggle("active", isSource);
  definitionTabTest.classList.toggle("active", isTest);
  definitionTabPreview.setAttribute("aria-selected", String(isPreview));
  definitionTabSource.setAttribute("aria-selected", String(isSource));
  definitionTabTest.setAttribute("aria-selected", String(isTest));
  definitionPreviewPanel.hidden = !isPreview;
  definitionSourcePanel.hidden = !isSource;
  definitionTestPanel.hidden = !isTest;
}
function formatVersionCommitDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString();
}
function renderVersionMeta(currentVersion, historicalVersion = "") {
  if (!detailVersionMeta) {
    return;
  }
  const version = historicalVersion || currentVersion;
  if (!version) {
    detailVersionMeta.innerHTML = "";
    return;
  }
  const historicalSuffix = historicalVersion ? "<span class=\"version-mode-badge\">Historical</span>" : "";
  detailVersionMeta.innerHTML = `<span class="version-badge">v${escapeHtml(version)}</span>${historicalSuffix}`;
}
function closeVersionDropdown() {
  if (!activeVersionDropdown) {
    return;
  }
  activeVersionDropdown.remove();
  activeVersionDropdown = null;
}
function renderVersionBanner(historicalVersion) {
  if (!versionBanner) {
    return;
  }
  if (!historicalVersion || historicalVersion === currentDefinitionVersion) {
    versionBanner.hidden = true;
    versionBanner.innerHTML = "";
    return;
  }
  versionBanner.hidden = false;
  versionBanner.innerHTML = `
    <span>Viewing version ${escapeHtml(historicalVersion)} (Current: ${escapeHtml(currentDefinitionVersion || "unknown")})</span>
    <div class="version-banner-actions">
      <button type="button" data-action="restore">Restore this version</button>
      <button type="button" data-action="back">Back to current</button>
    </div>
  `;
  versionBanner.querySelector('[data-action="restore"]')?.addEventListener("click", async () => {
    if (!currentDetailDefinitionId || !activeHistoricalVersion) {
      return;
    }
    try {
      const payload = await fetchWithErrorHandling(
        `/api/definitions/${currentDetailDefinitionId}/versions/${encodeURIComponent(activeHistoricalVersion)}/restore`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ createNewVersion: true })
        },
        "Unable to restore version."
      );
      window.alert(payload.message || "Version restored successfully.");
      await fetchDefinitions();
      await showDetails(currentDetailDefinitionId);
    } catch (error) {
      window.alert(error.message || "Unable to restore version.");
    }
  });
  versionBanner.querySelector('[data-action="back"]')?.addEventListener("click", async () => {
    if (!currentDetailDefinitionId) {
      return;
    }
    await showDetails(currentDetailDefinitionId);
  });
}
async function loadDefinitionVersion(version) {
  if (!currentDetailDefinitionId) {
    return;
  }
  const payload = await fetchWithErrorHandling(
    `/api/definitions/${currentDetailDefinitionId}/versions/${encodeURIComponent(version)}`,
    {},
    "Unable to load definition version."
  );
  activeHistoricalVersion = payload.version;
  const versionContent = payload.content || "";
  detailContent.textContent = versionContent;
  definitionPreviewContent.innerHTML = renderDefinitionPreview(versionContent, payload.metadata || {});
  renderVersionMeta(currentDefinitionVersion, activeHistoricalVersion);
  renderVersionBanner(activeHistoricalVersion);
  closeVersionDropdown();
}
function createVersionDropdown({ versions, currentVersion }) {
  const dropdown = document.createElement("div");
  dropdown.className = "version-dropdown";
  dropdown.innerHTML = `
    <div class="version-search"><input type="search" placeholder="Search versions" aria-label="Search versions"></div>
    <button class="version-option view-all" type="button">View all versions</button>
    <div class="version-list"></div>
  `;
  const searchInputEl = dropdown.querySelector(".version-search input");
  const list = dropdown.querySelector(".version-list");
  const viewAllButton = dropdown.querySelector(".view-all");
  let showAllVersions = false;
  function renderVersionList() {
    if (!list) {
      return;
    }
    const query = String(searchInputEl?.value || "").trim().toLowerCase();
    const visibleSource = showAllVersions ? versions : versions.slice(0, 25);
    const filteredVersions = visibleSource.filter((version) => String(version.version || "").toLowerCase().includes(query));
    if (viewAllButton) {
      const shouldShowViewAll = !showAllVersions && query.length === 0 && versions.length > 25;
      viewAllButton.hidden = !shouldShowViewAll;
    }
    if (filteredVersions.length === 0) {
      list.innerHTML = '<div class="version-empty">No matching versions</div>';
      return;
    }
    list.innerHTML = filteredVersions.map((version) => `
      <button class="version-option ${version.version === currentVersion ? "current" : ""}" type="button" data-version="${escapeHtml(version.version)}">
        <span class="version-number">${escapeHtml(version.version)}</span>
        <span class="version-date">${escapeHtml(formatVersionCommitDate(version.commitDate))}</span>
        ${version.version === currentVersion ? '<span class="checkmark">✓</span>' : ""}
      </button>
    `).join("");
    [...list.querySelectorAll(".version-option[data-version]")].forEach((button) => {
      button.addEventListener("click", async () => {
        await loadDefinitionVersion(button.getAttribute("data-version") || "");
      });
    });
  }
  searchInputEl?.addEventListener("input", () => {
    renderVersionList();
  });
  viewAllButton?.addEventListener("click", () => {
    showAllVersions = true;
    renderVersionList();
  });
  renderVersionList();
  return dropdown;
}
async function openVersionHistoryDropdown() {
  if (!currentDetailDefinitionId || !versionHistoryButton) {
    return;
  }
  if (activeVersionDropdown) {
    closeVersionDropdown();
    return;
  }
  const payload = await fetchWithErrorHandling(
    `/api/definitions/${currentDetailDefinitionId}/versions`,
    {},
    "Unable to load version history."
  );
  const versions = Array.isArray(payload.versions) ? payload.versions : [];
  if (versions.length === 0) {
    window.alert("No history available for this definition.");
    return;
  }
  activeVersionDropdown = createVersionDropdown({ versions, currentVersion: payload.currentVersion || "" });
  document.body.appendChild(activeVersionDropdown);
  const rect = versionHistoryButton.getBoundingClientRect();
  activeVersionDropdown.style.top = `${rect.bottom + window.scrollY + 8}px`;
  activeVersionDropdown.style.left = `${Math.max(rect.left + window.scrollX - 220, 8)}px`;
}
function showDefinitionTestLoading() {
  const content = document.getElementById("definitionTestResultsContent");
  if (!content) return;
  content.innerHTML = `
    <div class="test-loading">
      <div class="spinner" aria-hidden="true"></div>
      <div>Running test…</div>
    </div>
  `;
}
function formatCheckName(raw) {
  return String(raw || "")
    .replace(/_/g, " ")
    .replace(/\w/g, (char) => char.toUpperCase());
}
function displayDefinitionTestResults(result) {
  const content = document.getElementById("definitionTestResultsContent");
  if (!content) return;
  const status = String(result?.status || "unknown");
  const statusIcon = status === "success" ? "✅" : status === "warning" ? "⚠️" : "❌";
  const metadata = result?.results?.metadata || {};
  const output = escapeHtml(String(result?.results?.output || ""));
  const checks = Array.isArray(result?.results?.validation) ? result.results.validation : [];
  const warnings = Array.isArray(result?.warnings) ? result.warnings : [];
  const errors = Array.isArray(result?.errors) ? result.errors : [];
  content.innerHTML = `
    <div class="test-result ${status}">
      <div class="result-header">
        <span class="status-badge ${status}">${statusIcon} ${escapeHtml(status.toUpperCase())}</span>
        <span class="duration">Duration: ${Number(result?.duration || 0) / 1000}s</span>
      </div>
      <div class="result-metadata">
        <div class="metadata-item"><span class="label">Model</span><span class="value">${escapeHtml(String(metadata.model || "n/a"))}</span></div>
        <div class="metadata-item"><span class="label">Tokens</span><span class="value">${escapeHtml(String(metadata.tokensUsed?.prompt || 0))} + ${escapeHtml(String(metadata.tokensUsed?.completion || 0))}</span></div>
      </div>
      <div class="result-output">
        <h4>Response</h4>
        <div class="output-content"><pre>${output || "No output."}</pre></div>
      </div>
      <div class="validation-checks">
        <h4>Validation Checks</h4>
        ${checks.length ? checks.map((check) => `
          <div class="validation-item ${check.passed ? "passed" : "failed"}">
            ${check.passed ? "✓" : "✗"} ${escapeHtml(formatCheckName(check.check))}
            ${check.value ? `<span class="check-value">${escapeHtml(String(check.value))}</span>` : ""}
          </div>`).join("") : `<div class="test-inline-note">No validation checks reported.</div>`}
      </div>
      ${warnings.length ? `<div class="warnings"><h4>Warnings</h4>${warnings.map((item) => `<div class="warning-item">⚠️ ${escapeHtml(String(item))}</div>`).join("")}</div>` : ""}
      ${errors.length ? `<div class="errors"><h4>Errors</h4>${errors.map((item) => `<div class="error-item">❌ ${escapeHtml(String(item))}</div>`).join("")}</div>` : ""}
    </div>
  `;
}
function collectDefinitionTestPayload(definition) {
  const normalizedType = normalizeFilterType(definition.type);
  const config = {
    model: document.getElementById("testModel")?.value || "gemini-2.0-flash-exp",
    temperature: Number.parseFloat(document.getElementById("testTemperature")?.value || "0.7"),
    maxTokens: Number.parseInt(document.getElementById("testMaxTokens")?.value || "1000", 10)
  };
  if (normalizedType === "prompts") {
    const variables = {};
    document.querySelectorAll("[data-test-var]").forEach((element) => {
      const key = element.getAttribute("data-test-var");
      if (!key) return;
      variables[key] = element.value;
    });
    return { testType: "dry_run", input: { variables }, config };
  }
  if (normalizedType === "models") {
    return {
      testType: document.getElementById("testMode")?.value || "dry_run",
      input: { message: document.getElementById("testMessage")?.value || "" },
      config
    };
  }
  if (normalizedType === "mcp servers") {
    return { testType: document.getElementById("testMcpType")?.value || "connection", input: {}, config: {} };
  }
  if (normalizedType === "rules") {
    return { testType: "validation", input: { sampleCode: document.getElementById("testRuleSample")?.value || "" }, config: {} };
  }
  if (normalizedType === "workflows") {
    return { testType: "validation", input: { dryRun: Boolean(document.getElementById("testWorkflowDryRun")?.checked) }, config: {} };
  }
  if (normalizedType === "agents") {
    return {
      testType: "simulation",
      input: { scenario: document.getElementById("testAgentScenario")?.value || "", useMocks: Boolean(document.getElementById("testUseMocks")?.checked) },
      config: {}
    };
  }
  if (normalizedType === "context") {
    return { testType: "simulation", input: { query: document.getElementById("testContextQuery")?.value || "" }, config: {} };
  }
  return { testType: "validation", input: {}, config: {} };
}
async function runDefinitionTest(definition) {
  if (!definition?.id) return;
  showDefinitionTestLoading();
  const payload = collectDefinitionTestPayload(definition);
  try {
    const response = await fetchWithErrorHandling(
      `/api/definitions/${definition.id}/test`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      },
      "Unable to run test."
    );
    displayDefinitionTestResults(response);
  } catch (error) {
    displayDefinitionTestResults({ status: "error", duration: 0, results: { output: "", validation: [] }, errors: [error.message || "Test failed."] });
  }
}
async function saveDefinitionTestCase(definition) {
  if (!definition?.id) return;
  const name = window.prompt("Test case name", "Ad-hoc test case");
  if (name === null) return;
  const payload = collectDefinitionTestPayload(definition);
  try {
    await fetchWithErrorHandling(
      `/api/definitions/${definition.id}/test-cases`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "Ad-hoc test case",
          description: "Saved from definition detail test tab",
          testType: payload.testType,
          inputData: payload.input,
          expectedOutput: null
        })
      },
      "Unable to save test case."
    );
    window.alert("Test case saved.");
  } catch (error) {
    window.alert(error.message || "Unable to save test case.");
  }
}
async function showDefinitionTestHistory(definition) {
  if (!definition?.id) return;
  try {
    const payload = await fetchWithErrorHandling(`/api/definitions/${definition.id}/test-results?limit=10`, {}, "Unable to load test history.");
    const rows = Array.isArray(payload.results) ? payload.results : [];
    if (rows.length === 0) {
      window.alert("No test history available yet.");
      return;
    }
    const lines = rows.map((row) => {
      const stamp = row.createdAt ? new Date(row.createdAt).toLocaleString() : "Unknown time";
      return `${row.status?.toUpperCase() || "UNKNOWN"} • ${stamp} • ${(Number(row.duration || 0) / 1000).toFixed(2)}s`;
    });
    window.alert(`Recent test runs\n\n${lines.join("\n")}`);
  } catch (error) {
    window.alert(error.message || "Unable to load test history.");
  }
}
function bindDefinitionTestActions(definition) {
  document.getElementById("runDefinitionTestButton")?.addEventListener("click", () => runDefinitionTest(definition));
  document.getElementById("saveDefinitionTestCaseButton")?.addEventListener("click", () => saveDefinitionTestCase(definition));
  document.getElementById("definitionTestHistoryButton")?.addEventListener("click", () => showDefinitionTestHistory(definition));
}
async function showDetails(id) {
  closeVersionDropdown();
  pushUpstreamDefinitionButton.hidden = true;
  const response = await fetch(`/api/definitions/${id}`);
  const def = await response.json();
  currentDetailDefinitionId = def.id;
  currentDetailDefinitionSource = String(def.source || "").toLowerCase();
  currentDetailDefinitionName = String(def.name || "");
  currentDetailDefinitionPath = String(def.filePath || "");
  currentDefinitionVersion = String(def.version || "");
  activeHistoricalVersion = "";
  detailTitle.textContent = def.name;
  renderVersionMeta(currentDefinitionVersion, "");
  detailDescription.innerHTML = renderDescriptionMarkdown(def.description);
  const definitionContent = def.content || "";
  detailContent.textContent = definitionContent;
  detailStatus.textContent = statusLabel(def.status, def.source);
  detailStatus.className = `status-pill ${def.status}`;
  const normalizedType = normalizeFilterType(def.type);
  const typeLabel = formatTypePillLabel(normalizedType);
  const typeIcon = filterIconSvg(normalizedType);
  detailTypeIcon.innerHTML = typeIcon;
  detailTypeMetaIcon.innerHTML = typeIcon;
  detailTypeText.textContent = typeLabel;
  detailCreatedDate.textContent = formatCreatedDate(def.createdAt);
  const tags = parseDefinitionTags(def.tags);
  detailTags.innerHTML = tags.length > 0 ? `<div class="tag-pills">${renderTagPills(tags)}</div>` : "";
  detailTags.querySelectorAll("[data-tag]").forEach((element) => {
    element.addEventListener("click", () => {
      showHubPage();
      updateRouteForHub();
      setSearchValue(element.getAttribute("data-tag") || "");
      renderCards();
    });
  });
  const format = inferDefinitionFormat(def);
  const tabLabel = formatTabLabel(format);
  definitionTabSource.textContent = tabLabel;
  definitionPreviewContent.innerHTML = renderDefinitionPreview(definitionContent, def);
  definitionTestContent.innerHTML = renderDefinitionTest(def);
  bindDefinitionTestActions(def);
  const isUntrackedDefinition = currentDetailDefinitionSource === "untracked";
  const canDeleteDefinition = currentDetailDefinitionSource === "repo" || isUntrackedDefinition;
  deleteDefinitionButton.hidden = !canDeleteDefinition;
  pushUpstreamDefinitionButton.hidden = !isUntrackedDefinition;
  pushUpstreamDefinitionButton.disabled = !isUntrackedDefinition;
  definitionTabPreview.disabled = false;
  definitionTabSource.disabled = false;
  definitionTabTest.disabled = false;
  setDefinitionTab("preview");
  renderVersionBanner("");
  showDetailPage();
}
function showDetailPage() {
  hubHeader.hidden = true;
  hubMain.hidden = true;
  detailPage.hidden = false;
  document.body.classList.add("detail-page-open");
  window.scrollTo(0, 0);
}
function showHubPage() {
  detailPage.hidden = true;
  closeVersionDropdown();
  currentDetailDefinitionId = null;
  currentDetailDefinitionSource = "";
  currentDetailDefinitionName = "";
  currentDetailDefinitionPath = "";
  currentDefinitionVersion = "";
  activeHistoricalVersion = "";
  deleteDefinitionButton.hidden = true;
  pushUpstreamDefinitionButton.hidden = true;
  pushUpstreamDefinitionButton.disabled = true;
  hubHeader.hidden = false;
  hubMain.hidden = false;
  document.body.classList.remove("detail-page-open");
}
function updateRouteForDetails(id) {
  const url = new URL(window.location.href);
  url.searchParams.set("definition", String(id));
  window.history.pushState({}, "", url);
}
function updateRouteForHub(replace = false) {
  const url = new URL(window.location.href);
  url.searchParams.delete("definition");
  const historyMethod = replace ? "replaceState" : "pushState";
  window.history[historyMethod]({}, "", url);
}
async function handleRoute() {
  const definitionId = new URL(window.location.href).searchParams.get("definition");
  if (!definitionId) {
    showHubPage();
    return;
  }
  const numericId = Number(definitionId);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    updateRouteForHub(true);
    showHubPage();
    return;
  }
  await showDetails(numericId);
}
async function copyDefinitionToClipboard() {
  const definitionText = detailContent.textContent || "";
  if (!definitionText.trim()) {
    return;
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(definitionText);
    return;
  }
  const fallbackTextArea = document.createElement("textarea");
  fallbackTextArea.value = definitionText;
  fallbackTextArea.style.position = "fixed";
  fallbackTextArea.style.opacity = "0";
  document.body.appendChild(fallbackTextArea);
  fallbackTextArea.select();
  document.execCommand("copy");
  fallbackTextArea.remove();
}
async function saveDefinition(id) {
  if (!devProjectInput.value.trim()) {
    window.alert("Please select a project first.");
    return;
  }
  await fetchWithErrorHandling(`/api/definitions/${id}/save`, { method: "POST" }, "Unable to save definition.");
}
async function publishDefinition(id) {
  await fetchWithErrorHandling(`/api/definitions/${id}/publish`, { method: "POST" }, "Unable to publish definition.");
}
async function removeDefinition(id) {
  await fetchWithErrorHandling(`/api/definitions/${id}/remove`, { method: "POST" }, "Unable to remove definition.");
}
async function deleteDefinitionFromRepo(id) {
  await fetchWithErrorHandling(`/api/definitions/${id}/delete-repo`, { method: "POST" }, "Unable to delete definition.");
}
async function pushDefinitionToUpstream(id, commitMessage) {
  return fetchWithErrorHandling(`/api/definitions/${id}/push-upstream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commitMessage })
  }, "Unable to push definition.");
}
function createDuplicateDefaults(definitionName, definitionPath) {
  const defaultName = `${String(definitionName || "definition").trim() || "definition"}_copy`;
  const originalFileName = pathBasename(definitionPath) || "definition.md";
  const extension = pathExtname(originalFileName);
  const baseName = extension ? originalFileName.slice(0, -extension.length) : originalFileName;
  const defaultFileName = `${baseName}_copy${extension}`;
  return { defaultName, defaultFileName };
}
function pathBasename(filePath) {
  const normalized = String(filePath || "").replace(/\\/g, "/");
  const segments = normalized.split("/").filter(Boolean);
  return segments[segments.length - 1] || "";
}
function pathExtname(fileName) {
  const value = String(fileName || "");
  const dotIndex = value.lastIndexOf(".");
  if (dotIndex <= 0) {
    return "";
  }
  return value.slice(dotIndex);
}
async function duplicateDefinition(id, name, fileName) {
  return fetchWithErrorHandling(`/api/definitions/${id}/duplicate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, fileName })
  }, "Unable to duplicate definition.");
}
searchInput.addEventListener("input", (event) => {
  setSearchValue(event.target.value);
  renderCards();
});
devProjectInput.addEventListener("change", async (event) => {
  const selected = event.target.value.trim();
  if (!selected) {
    await setCurrentDevProject("");
    await fetchDefinitions();
    return;
  }
  if (devProjects.length > 0 && !devProjects.includes(selected)) {
    return;
  }
  await setCurrentDevProject(selected);
  await fetchDefinitions();
});
function openEditorForCurrentDefinition() {
  if (!currentDetailDefinitionPath) return;
  window.location.assign(`/editor/editor.html?mode=edit&path=${encodeURIComponent(currentDetailDefinitionPath)}`);
}
function toggleNewMenu() {
  if (!newDefinitionMenu || !newDefinitionButton) return;
  newDefinitionMenu.hidden = !newDefinitionMenu.hidden;
  newDefinitionButton.setAttribute("aria-expanded", String(!newDefinitionMenu.hidden));
}
function closeFilterMenu() {
  filterMenu.classList.remove("open");
  filterButton.setAttribute("aria-expanded", "false");
}
filterButton.addEventListener("click", () => {
  const isOpen = filterMenu.classList.toggle("open");
  filterButton.setAttribute("aria-expanded", String(isOpen));
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".filter-dropdown")) {
    closeFilterMenu();
  }
  if (activeVersionDropdown && !event.target.closest(".version-dropdown") && !event.target.closest("#versionHistoryButton")) {
    closeVersionDropdown();
  }
});
clearSearchButton.addEventListener("click", () => {
  setSearchValue("");
  renderCards();
});
deleteDefinitionButton.addEventListener("click", async () => {
  if (!Number.isFinite(Number(currentDetailDefinitionId)) || currentDetailDefinitionId <= 0) {
    return;
  }
  const isUntrackedDefinition = currentDetailDefinitionSource === "untracked";
  const confirmationMessage = isUntrackedDefinition
    ? "Are you sure you want to delete this untracked local definition file? Note: if this definition is already installed in any project - it will not be deleted from those projects."
    : "Are you sure you want to delete this definition from team repository? Note: projects that already have this definition installed - will not be deleted, but you will not be able to install this definition to new projects or update existing installations. If you want to remove this definition from specific project(s) only - please select the project,and click 'Remove from project' button from the definition card or details page.";
  const isConfirmed = window.confirm(confirmationMessage);
  if (!isConfirmed) {
    return;
  }
  try {
    const result = await deleteDefinitionFromRepo(currentDetailDefinitionId);
    await fetchDefinitions();
    updateRouteForHub(true);
    showHubPage();
    const successMessage = isUntrackedDefinition
      ? "Definition deleted from local files."
      : "Definition deleted from the repository.";
    window.alert(result?.message || successMessage);
  } catch (error) {
    window.alert(error.message || "Unable to delete definition.");
  }
});
pushUpstreamDefinitionButton.addEventListener("click", async () => {
  if (!Number.isFinite(Number(currentDetailDefinitionId)) || currentDetailDefinitionId <= 0) {
    return;
  }
  const commitMessage = window.prompt("Commit message", `Add definition ${currentDetailDefinitionName || ""}`);
  if (commitMessage === null) {
    return;
  }
  try {
    const result = await pushDefinitionToUpstream(currentDetailDefinitionId, commitMessage);
    await fetchDefinitions();
    await showDetails(currentDetailDefinitionId);
    window.alert(result?.message || "Definition pushed to upstream repository.");
  } catch (error) {
    window.alert(error.message || "Unable to push definition.");
  }
});
copyDefinitionButton.addEventListener("click", async () => {
  try {
    await copyDefinitionToClipboard();
    copyDefinitionButton.classList.add("copied");
    copyDefinitionButton.setAttribute("title", "Copied");
    copyDefinitionButton.setAttribute("aria-label", "Definition copied");
    window.setTimeout(() => {
      copyDefinitionButton.classList.remove("copied");
      copyDefinitionButton.setAttribute("title", "Copy definition");
      copyDefinitionButton.setAttribute("aria-label", "Copy definition");
    }, 1200);
  } catch (_error) {
    copyDefinitionButton.setAttribute("title", "Unable to copy");
  }
});
duplicateDefinitionButton.addEventListener("click", async () => {
  if (!Number.isFinite(Number(currentDetailDefinitionId)) || currentDetailDefinitionId <= 0) {
    return;
  }
  const { defaultName, defaultFileName } = createDuplicateDefaults(currentDetailDefinitionName, currentDetailDefinitionPath);
  const duplicateName = window.prompt("New definition name", defaultName);
  if (duplicateName === null) {
    return;
  }
  const normalizedName = duplicateName.trim();
  if (!normalizedName) {
    window.alert("Definition name cannot be empty.");
    return;
  }
  const duplicateFileName = window.prompt("New definition file name", defaultFileName);
  if (duplicateFileName === null) {
    return;
  }
  const normalizedFileName = duplicateFileName.trim();
  if (!normalizedFileName) {
    window.alert("Definition file name cannot be empty.");
    return;
  }
  try {
    const result = await duplicateDefinition(currentDetailDefinitionId, normalizedName, normalizedFileName);
    await fetchDefinitions();
    if (Number.isFinite(Number(result?.id)) && result.id > 0) {
      updateRouteForDetails(result.id);
      await showDetails(result.id);
      return;
    }
    window.alert("Definition duplicated, but unable to locate the new copy.");
  } catch (error) {
    window.alert(error.message || "Unable to duplicate definition.");
  }
});
definitionTabPreview.addEventListener("click", () => {
  setDefinitionTab("preview");
});
definitionTabSource.addEventListener("click", () => {
  setDefinitionTab("source");
});
definitionTabTest.addEventListener("click", () => {
  setDefinitionTab("test");
});
closeModal.addEventListener("click", () => {
  showHubPage();
  updateRouteForHub();
});
window.addEventListener("popstate", () => {
  handleRoute();
});
document.addEventListener("click", (event) => {
  if (newDefinitionMenu && !event.target.closest(".new-menu-wrap")) {
    newDefinitionMenu.hidden = true;
    if (newDefinitionButton) {
      newDefinitionButton.setAttribute("aria-expanded", "false");
    }
  }
});
if (newDefinitionButton) {
  newDefinitionButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleNewMenu();
  });
}
if (newDefinitionMenu) {
  newDefinitionMenu.querySelectorAll("[data-new-type]").forEach((button) => {
    const type = button.getAttribute("data-new-type") || "prompt";
    const label = button.getAttribute("data-type-label") || formatFilterLabel(type);
    button.innerHTML = `<span class="menu-type-icon">${filterIconSvg(type)}</span><span>${escapeHtml(label)}</span>`;
    button.addEventListener("click", () => {
      window.location.assign(`/editor/editor.html?mode=create&type=${encodeURIComponent(type)}`);
    });
  });
}
if (editDefinitionButton) {
  editDefinitionButton.addEventListener("click", () => {
    openEditorForCurrentDefinition();
  });
}
if (versionHistoryButton) {
  versionHistoryButton.addEventListener("click", async () => {
    try {
      await openVersionHistoryDropdown();
    } catch (error) {
      window.alert(error.message || "Unable to load version history.");
    }
  });
}
loadDevProjects();
loadCurrentDevProject().then(fetchDefinitions).then(handleRoute);
