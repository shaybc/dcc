import { runWithLoading } from "../services/loadingService.js";
import { createDiffService } from "../services/diffService.js";

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
const detailDccUri = document.getElementById("detailDccUri");
const detailRepoOrigin = document.getElementById("detailRepoOrigin");
const detailTags = document.getElementById("detailTags");
const detailVersionMeta = document.getElementById("detailVersionMeta");
const copyDefinitionButton = document.getElementById("copyDefinition");
const editDefinitionButton = document.getElementById("editDefinition");
const newDefinitionButton = document.getElementById("newDefinitionButton");
const newDefinitionMenu = document.getElementById("newDefinitionMenu");
const recommendationsToggleButton = document.getElementById("recommendationsToggleButton");
const duplicateDefinitionButton = document.getElementById("duplicateDefinition");
const pushUpstreamDefinitionButton = document.getElementById("pushUpstreamDefinition");
const versionHistoryButton = document.getElementById("versionHistoryButton");
const deleteDefinitionButton = document.getElementById("deleteDefinition");
const installDefinitionButton = document.getElementById("installDefinition");
const versionBanner = document.getElementById("versionBanner");
const definitionTabPreview = document.getElementById("definitionTabPreview");
const definitionTabSource = document.getElementById("definitionTabSource");
const definitionTabTest = document.getElementById("definitionTabTest");
const definitionPreviewPanel = document.getElementById("definitionPreviewPanel");
const definitionSourcePanel = document.getElementById("definitionSourcePanel");
const definitionTestPanel = document.getElementById("definitionTestPanel");
const definitionPreviewContent = document.getElementById("definitionPreviewContent");
const diffControls = document.getElementById("diffControls");
const enableDiffMode = document.getElementById("enableDiffMode");
const diffIgnoreWhitespace = document.getElementById("diffIgnoreWhitespace");
const diffCompareBar = document.getElementById("diffCompareBar");
const diffVersionMode = document.getElementById("diffVersionMode");
const versionSelectA = document.getElementById("versionSelectA");
const versionSelectB = document.getElementById("versionSelectB");
const diffContainer = document.getElementById("diffContainer");
const diffStatistics = document.getElementById("diffStatistics");
const diffNavigation = document.getElementById("diffNavigation");
const diffAddedLines = document.getElementById("diffAddedLines");
const diffRemovedLines = document.getElementById("diffRemovedLines");
const diffModifiedLines = document.getElementById("diffModifiedLines");
const prevChangeBtn = document.getElementById("prevChangeBtn");
const nextChangeBtn = document.getElementById("nextChangeBtn");
const currentChangeIndex = document.getElementById("currentChangeIndex");
const totalChanges = document.getElementById("totalChanges");
const diffModeButtons = document.querySelectorAll(".diff-mode-btn");
const runValidationButton = document.getElementById("runValidationButton");
const copyValidationReportButton = document.getElementById("copyValidationReportButton");
const validationStrictToggle = document.getElementById("validationStrictToggle");
const validationLintToggle = document.getElementById("validationLintToggle");
const validationReferencesToggle = document.getElementById("validationReferencesToggle");
const validationAutoRunToggle = document.getElementById("validationAutoRunToggle");
const validationSeverityFilter = document.getElementById("validationSeverityFilter");
const validationResults = document.getElementById("validationResults");
const validationLastRun = document.getElementById("validationLastRun");
const devProjectInput = document.getElementById("devProjectSelect");
const devProjectOptions = document.getElementById("devProjectOptions");
const recommendationsSection = document.createElement("section");
const recommendationsTitle = document.createElement("h2");
const recommendationsMeta = document.createElement("p");
const recommendationsState = document.createElement("p");
const recommendationsCards = document.createElement("div");
const recommendationsDivider = document.createElement("div");
const recommendationsContent = document.createElement("div");

let definitions = [];
let suggestionDefinitionIds = [];
let suggestionsMeta = { projectPath: "", projectType: "", corePlatform: "", suggestions: [] };
const RECOMMENDATIONS_VISIBILITY_STORAGE_KEY = "dcc.recommendations.visible";
let recommendationsVisible = getStoredRecommendationsVisibility();
let activeFilter = "all";
let searchTerm = "";
let devProjects = [];
let currentDetailDefinitionId = null;
let currentDetailDefinitionSource = "";
let currentDetailDefinitionName = "";
let currentDetailDefinitionPath = "";
let currentDetailDefinitionContent = "";
let currentDetailDefinitionDccUri = "";
let currentDetailDefinitionStatus = "";
let currentDefinitionVersion = "";
let activeHistoricalVersion = "";
let activeVersionDropdown = null;
let lastValidationResult = null;
let validationAutoRunTimeout = null;
let diffService = null;
let currentDefinitionVersions = [];

const FILTER_TYPES = ["models", "mcp servers", "rules", "prompts", "agents", "context", "workflows", "docs", "configs", "unknown"];
const FILTER_TYPE_SET = new Set(FILTER_TYPES);
const MAX_CARD_TAG_PILLS = 3;

function getStoredRecommendationsVisibility() {
  try {
    return localStorage.getItem(RECOMMENDATIONS_VISIBILITY_STORAGE_KEY) === "true";
  } catch (_error) {
    return false;
  }
}

function persistRecommendationsVisibility(value) {
  try {
    localStorage.setItem(RECOMMENDATIONS_VISIBILITY_STORAGE_KEY, String(Boolean(value)));
  } catch (_error) {
    // Ignore local storage access errors and keep the in-memory state.
  }
}

function normalizeFilterType(type) {
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
  return FILTER_TYPE_SET.has(normalized) ? normalized : "unknown";
}


function extractDccUriFromDefinitionContent(content, filePath = "") {
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

function renderRepoOrigin(definition) {
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

async function fetchWithErrorHandling(url, options = {}, fallbackMessage = "Request failed.", loadingOptions = null) {
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
  if (normalizedType === "docs") return "Doc";
  if (normalizedType === "configs") return "Config";
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

  return normalized;
}

function getCardTitle(name) {
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
  if (type === "docs" || type === "doc") {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 4h9l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"></path>
        <path d="M15 4v4h4"></path>
        <path d="M9 13h6"></path>
        <path d="M9 17h4"></path>
      </svg>
    `;
  }
  if (type === "configs" || type === "config") {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M7 3.5h8l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 20V5a1.5 1.5 0 0 1 1-1.5z"></path>
        <path d="M15 3.5v4h4"></path>
        <path d="M9 11h6"></path>
        <path d="M9 15h6"></path>
        <path d="M9 19h4"></path>
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

function handleDefinitionCardClick(definition, event) {
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
    openPushUpstreamModal({ definitionName: definition.name || "" })
      .then((submission) => {
        if (!submission) {
          return null;
        }
        return pushDefinitionToUpstream(definition.id, submission).then(fetchDefinitions);
      })
      .catch((error) => {
        window.alert(error.message || "Unable to push definition.");
      });
    return;
  }

  const saveAction = event.target.closest("[data-action-save]");
  if (saveAction) {
    event.stopPropagation();
    const actionPromise = definition.status === "saved"
      ? removeDefinition(definition.id)
      : definition.status === "local-only"
        ? publishDefinition(definition.id)
        : saveDefinition(definition.id);

    actionPromise
      .then(fetchDefinitions)
      .catch((error) => {
        window.alert(error.message || "Action failed.");
      });
    return;
  }

  showDetails(definition.id)
    .then(() => updateRouteForDetails(definition.id))
    .catch((error) => {
      window.alert(error.message || "Unable to open definition details.");
    });
}

function createDefinitionCard(definition, { recommendationRank = null, recommendationScore = null, recommendationReasons = [] } = {}) {
  const card = document.createElement("div");
  card.className = "card";
  const isRecommended = Number.isFinite(Number(recommendationRank)) && Number(recommendationRank) > 0;
  if (isRecommended) {
    card.classList.add("card-recommended");
  }
  if (String(definition.source || "").toLowerCase() === "untracked") {
    card.classList.add("card-local-definition");
  }
  if (definition.status === "saved" && devProjectInput.value.trim()) {
    card.classList.add("card-in-project");
  }

  const showPushAction = !isRecommended && String(definition.source || "").toLowerCase() === "untracked";
  const recommendationMeta = recommendationRank !== null && !isRecommended
    ? `<div class="recommendation-meta">#${recommendationRank} · Score ${recommendationScore || 0}</div>`
    : "";
  const recommendationTooltipText = isRecommended && recommendationReasons.length > 0
    ? `<div class="recommendation-tooltip" role="tooltip" aria-hidden="true">${escapeHtml(recommendationReasons.join(" • "))}</div>`
    : "";
  const cardMetaText = isRecommended
    ? `#${recommendationRank} (Score: ${Number(recommendationScore) || 0})`
    : statusLabel(definition.status, definition.source);
  const cardActions = isRecommended
    ? ""
    : `<div class="card-actions">
      ${showPushAction ? `<div class="icon-btn" data-action-push title="Push to upstream" aria-label="Push to upstream">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 16V4" />
          <path d="M5 9l5-5 5 5" />
        </svg>
      </div>` : ""}
      <div class="icon-btn" data-action-save>
        ${iconSvg(definition.status)}
      </div>
    </div>`;
  const descriptionText = isRecommended ? "" : `<p>${getCardDescription(definition.description)}</p>`;
  const tagsMarkup = (!isRecommended && definition.tags.length > 0)
    ? `<div class="tag-pills card-tag-pills">${renderTagPills(definition.tags, { truncate: true })}</div>`
    : "";

  card.innerHTML = `
    ${cardActions}
    ${recommendationMeta}
    <h3>${escapeHtml(getCardTitle(definition.name))}</h3>
    ${descriptionText}
    ${recommendationTooltipText}
    ${tagsMarkup}
    <div class="meta-row">
      <div class="meta-status">${cardMetaText}</div>
      <div class="type-pill ${typeClassName(definition.type)}">
        <span class="type-pill-icon">${filterIconSvg(definition.type)}</span>
        <span>${formatTypePillLabel(definition.type)}</span>
      </div>
    </div>
  `;

  card.addEventListener("click", (event) => {
    handleDefinitionCardClick(definition, event);
  });

  const recommendationTooltip = card.querySelector(".recommendation-tooltip");
  if (recommendationTooltip) {
    let revealTooltipTimer = null;

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const setTooltipAnchorFromPointer = (event) => {
      const cardRect = card.getBoundingClientRect();
      const tooltipWidth = recommendationTooltip.offsetWidth || 320;
      const halfTooltip = tooltipWidth / 2;
      const clientX = clamp(event.clientX, halfTooltip + 16, window.innerWidth - halfTooltip - 16);
      const localX = clientX - cardRect.left;
      const localY = event.clientY - cardRect.top - 14;
      recommendationTooltip.style.setProperty("--tooltip-x", `${localX}px`);
      recommendationTooltip.style.setProperty("--tooltip-y", `${localY}px`);
    };

    const cancelTooltipReveal = () => {
      if (revealTooltipTimer) {
        window.clearTimeout(revealTooltipTimer);
        revealTooltipTimer = null;
      }
      recommendationTooltip.classList.remove("is-visible");
      recommendationTooltip.setAttribute("aria-hidden", "true");
    };

    card.addEventListener("mouseenter", (event) => {
      cancelTooltipReveal();
      setTooltipAnchorFromPointer(event);
      revealTooltipTimer = window.setTimeout(() => {
        recommendationTooltip.classList.add("is-visible");
        recommendationTooltip.setAttribute("aria-hidden", "false");
      }, 1800);
    });

    card.addEventListener("mousemove", (event) => {
      setTooltipAnchorFromPointer(event);
    });

    card.addEventListener("mouseleave", cancelTooltipReveal);
    card.addEventListener("blur", cancelTooltipReveal, true);
  }

  return card;
}

function updateRecommendationsToggleLabel() {
  recommendationsToggleButton.innerHTML = recommendationsVisible
    ? '<svg class="recommendations-star recommendations-star-filled" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.43 2.6a.62.62 0 0 1 1.14 0l2.48 5.25a.62.62 0 0 0 .47.34l5.74.88a.62.62 0 0 1 .35 1.05l-4.15 4.26a.62.62 0 0 0-.17.54l.98 6a.62.62 0 0 1-.9.65L12.27 18.76a.62.62 0 0 0-.58 0l-5.1 2.81a.62.62 0 0 1-.9-.65l.98-6a.62.62 0 0 0-.17-.54L2.34 10.12a.62.62 0 0 1 .35-1.05l5.74-.88a.62.62 0 0 0 .47-.34L11.43 2.6z"></path></svg>'
    : '<svg class="recommendations-star recommendations-star-outline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 2.6 2.81 5.95 6.49.99-4.69 4.81 1.11 6.79L12 17.99l-5.72 3.15 1.1-6.79-4.68-4.81 6.49-.99L12 2.6z"></path></svg>';
  recommendationsToggleButton.setAttribute("aria-label", recommendationsVisible ? "Hide Recommendations" : "Show Recommendations");
  recommendationsToggleButton.setAttribute("aria-expanded", String(recommendationsVisible));
}

function renderRecommendationSection() {
  updateRecommendationsToggleLabel();
  recommendationsSection.classList.toggle("is-collapsed", !recommendationsVisible);
  recommendationsContent.classList.toggle("is-collapsed", !recommendationsVisible);
  const selectedProjectPath = String(devProjectInput.value || "").trim();
  const projectType = String(suggestionsMeta.projectType || "").trim().toLowerCase();
  const corePlatform = String(suggestionsMeta.corePlatform || "").trim().toLowerCase();
  const platformMeta = corePlatform ? ` · Platform: ${corePlatform}` : "";
  recommendationsState.textContent = "";
  recommendationsState.hidden = true;
  recommendationsCards.innerHTML = "";

  if (!recommendationsVisible) {
    return;
  }

  if (!selectedProjectPath) {
    recommendationsState.hidden = false;
    recommendationsState.textContent = "Select a dev project to see recommended definitions.";
    recommendationsMeta.textContent = "";
    return;
  }

  if (!projectType || projectType === "unknown") {
    recommendationsState.hidden = false;
    recommendationsState.textContent = "Project type is unknown, so recommendations are unavailable.";
    recommendationsMeta.textContent = `Project: ${selectedProjectPath}${platformMeta}`;
    return;
  }

  const suggestionIdSet = new Set(suggestionDefinitionIds);
  const suggestions = (Array.isArray(suggestionsMeta.suggestions) ? suggestionsMeta.suggestions : [])
    .filter((entry) => suggestionIdSet.has(Number(entry.definitionId)));
  if (suggestions.length === 0) {
    recommendationsState.hidden = false;
    recommendationsState.textContent = "No matching suggestions for this project type yet.";
    recommendationsMeta.textContent = `Project: ${selectedProjectPath} · Type: ${projectType}${platformMeta}`;
    return;
  }

  recommendationsMeta.textContent = `Project: ${selectedProjectPath} · Type: ${projectType}${platformMeta}`;

  suggestions.forEach((suggestion, index) => {
    const definition = definitions.find((item) => Number(item.id) === Number(suggestion.definitionId));
    if (!definition) {
      return;
    }
    recommendationsCards.appendChild(createDefinitionCard(definition, {
      recommendationRank: index + 1,
      recommendationScore: suggestion.score,
      recommendationReasons: Array.isArray(suggestion.reasons) ? suggestion.reasons : []
    }));
  });

  if (!recommendationsCards.childElementCount) {
    recommendationsState.hidden = false;
    recommendationsState.textContent = "No matching suggestions for available definitions.";
  }
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
    cardsContainer.appendChild(createDefinitionCard(def));
  });

  renderRecommendationSection();
}

function setupRecommendationsSection() {
  recommendationsSection.className = "recommendations-section";
  recommendationsTitle.className = "recommendations-title";
  recommendationsMeta.className = "recommendations-meta";
  recommendationsState.className = "recommendations-state";
  recommendationsCards.className = "grid recommendations-grid";
  recommendationsContent.id = "recommendations-content";
  recommendationsToggleButton.setAttribute("aria-controls", recommendationsContent.id);
  recommendationsDivider.className = "recommendations-divider";
  recommendationsContent.className = "recommendations-content";

  recommendationsTitle.textContent = "Recommended for current project";
  updateRecommendationsToggleLabel();
  recommendationsToggleButton.addEventListener("click", () => {
    recommendationsVisible = !recommendationsVisible;
    persistRecommendationsVisibility(recommendationsVisible);
    renderRecommendationSection();
  });

  recommendationsContent.append(recommendationsTitle, recommendationsMeta, recommendationsState, recommendationsCards, recommendationsDivider);
  recommendationsSection.append(recommendationsContent);

  cardsContainer.parentNode?.insertBefore(recommendationsSection, cardsContainer);
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

async function fetchDefinitionSuggestions() {
  try {
    const data = await fetchWithErrorHandling("/api/definitions/suggestions", {}, "Unable to load definition suggestions.");
    const nextSuggestions = Array.isArray(data?.suggestions) ? data.suggestions : [];
    suggestionDefinitionIds = nextSuggestions.map((entry) => Number(entry.definitionId)).filter((id) => Number.isFinite(id));
    suggestionsMeta = {
      projectPath: String(data?.projectPath || "").trim(),
      projectType: String(data?.projectType || "").trim(),
      corePlatform: String(data?.corePlatform || "").trim(),
      suggestions: nextSuggestions
    };
  } catch (_error) {
    suggestionDefinitionIds = [];
    suggestionsMeta = { projectPath: "", projectType: "", corePlatform: "", suggestions: [] };
  }
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
  if (format === "yaml") return "Source (YAML)";
  if (format === "md") return "Source (MD)";
  if (format === "json") return "Source (JSON)";
  if (format === "txt") return "Source (TXT)";
  return "Source";
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
function formatValidationSummary(status, summary) {
  const label = String(status || "").toUpperCase() || "UNKNOWN";
  const statusIcon = status === "success" ? "✅" : status === "failure" ? "❌" : "⚠️";
  return `<div class="validation-summary status-${escapeHtml(status || "unknown")}"><span class="validation-status-icon" aria-hidden="true">${statusIcon}</span>${label} · ${summary.errors} errors · ${summary.warnings} warnings · ${summary.infos} info</div>`;
}

function validationCheckIcon(check) {
  return check.passed ? '<span class="check-result-icon check-result-pass" aria-hidden="true">✓</span>' : '<span class="check-result-icon check-result-fail" aria-hidden="true">✕</span>';
}

function renderValidationChecks(checks, severityFilter) {
  const grouped = { schema: [], lint: [], reference: [] };
  checks.forEach((check) => {
    if (severityFilter !== "all" && check.severity !== severityFilter) {
      return;
    }
    const category = grouped[check.category] ? check.category : "lint";
    grouped[category].push(check);
  });

  return Object.entries(grouped).map(([category, entries]) => {
    const title = category.charAt(0).toUpperCase() + category.slice(1);
    const body = entries.length === 0
      ? '<div class="validation-group-empty">No checks in this category.</div>'
      : entries.map((check) => {
        const location = check.location?.line ? ` <span class="validation-location">(L${check.location.line}${check.location.col ? `:C${check.location.col}` : ""})</span>` : "";
        return `<li>${validationCheckIcon(check)}<span class="severity-badge severity-${check.severity}">${check.severity}</span> ${escapeHtml(check.message)}${location}${check.path ? ` <code>${escapeHtml(check.path)}</code>` : ""}</li>`;
      }).join("");

    return `<div class="validation-group"><h4>${title} checks</h4>${entries.length ? `<ul>${body}</ul>` : body}</div>`;
  }).join("");
}

function renderValidationResult(result) {
  const severityFilter = validationSeverityFilter?.value || "all";
  const checksHtml = renderValidationChecks(Array.isArray(result?.checks) ? result.checks : [], severityFilter);
  validationResults.innerHTML = `
    ${formatValidationSummary(result?.status || "unknown", result?.summary || { errors: 0, warnings: 0, infos: 0 })}
    ${checksHtml}
    <details class="validation-raw-report">
      <summary>Raw report</summary>
      <pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre>
    </details>
  `;
}

function updateValidationLastRun() {
  if (!validationLastRun) {
    return;
  }
  validationLastRun.textContent = `Last run: ${new Date().toLocaleString()}`;
}

async function runValidationForCurrentDefinition() {
  if (!currentDetailDefinitionId) {
    return;
  }
  runValidationButton.disabled = true;
  try {
    const payload = await fetchWithErrorHandling(
      `/api/definitions/${currentDetailDefinitionId}/validate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          options: {
            strict: Boolean(validationStrictToggle?.checked),
            lint: Boolean(validationLintToggle?.checked),
            references: Boolean(validationReferencesToggle?.checked),
          },
        }),
      },
      "Unable to validate definition.",
      {
        title: "Running validation...",
        description: "Checking schema, lint, and references.",
      }
    );
    lastValidationResult = payload;
    renderValidationResult(payload);
    updateValidationLastRun();
  } catch (error) {
    validationResults.innerHTML = `<div class="validation-error">${escapeHtml(error.message || "Validation failed")}</div>`;
  } finally {
    runValidationButton.disabled = false;
  }
}

function scheduleValidationRun() {
  if (validationAutoRunTimeout) {
    window.clearTimeout(validationAutoRunTimeout);
  }
  validationAutoRunTimeout = window.setTimeout(() => {
    runValidationForCurrentDefinition();
  }, 350);
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

  if (isTest && validationAutoRunToggle?.checked) {
    scheduleValidationRun();
  }
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

async function fetchVersionContentForDiff(version) {
  if (!currentDetailDefinitionId) {
    return "";
  }
  if (!version || version === "current") {
    return currentDetailDefinitionContent || "";
  }
  const payload = await fetchWithErrorHandling(
    `/api/definitions/${currentDetailDefinitionId}/versions/${encodeURIComponent(version)}`,
    {},
    "Unable to load definition version for comparison."
  );
  return String(payload.content || "");
}

function ensureDiffService() {
  if (diffService || !diffControls) {
    return;
  }
  diffService = createDiffService({
    elements: {
      diffControls,
      enableDiffMode,
      diffIgnoreWhitespace,
      diffCompareBar,
      diffVersionMode,
      versionSelectA,
      versionSelectB,
      diffContainer,
      detailContent,
      diffStatistics,
      diffNavigation,
      diffAddedLines,
      diffRemovedLines,
      diffModifiedLines,
      prevChangeBtn,
      nextChangeBtn,
      currentChangeIndex,
      totalChanges,
      diffModeButtons
    },
    fetchVersionContent: fetchVersionContentForDiff,
    getCurrentVersion: () => currentDefinitionVersion,
    formatDate: formatVersionCommitDate
  });
  diffService.init();
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
      ensureDiffService();
      if (diffService) {
        await diffService.previewRestore(activeHistoricalVersion);
      }
      const confirmed = window.confirm("Review the diff and confirm restoring this version.");
      if (!confirmed) {
        return;
      }
      const payload = await fetchWithErrorHandling(
        `/api/definitions/${currentDetailDefinitionId}/versions/${encodeURIComponent(activeHistoricalVersion)}/restore`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ createNewVersion: true })
        },
        "Unable to restore version.",
        {
          title: "Restoring version...",
          description: "Applying selected historical version.",
        }
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
    "Unable to load definition version.",
    {
      title: "Loading version...",
      description: "Fetching definition version from repository.",
    }
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
    "Unable to load version history.",
    {
      title: "Loading version history...",
      description: "Fetching commit history for this definition.",
    }
  );
  const versions = Array.isArray(payload.versions) ? payload.versions : [];
  currentDefinitionVersions = versions;
  ensureDiffService();
  diffService?.setVersions(currentDefinitionVersions);
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

async function refreshDiffVersions() {
  if (!currentDetailDefinitionId) {
    return;
  }
  try {
    const payload = await fetchWithErrorHandling(
      `/api/definitions/${currentDetailDefinitionId}/versions`,
      {},
      "Unable to load version history."
    );
    currentDefinitionVersions = Array.isArray(payload.versions) ? payload.versions : [];
  } catch (_error) {
    currentDefinitionVersions = [];
  }
  ensureDiffService();
  diffService?.setVersions(currentDefinitionVersions);
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
  currentDetailDefinitionContent = String(def.content || "");
  currentDetailDefinitionStatus = String(def.status || "").toLowerCase();
  currentDefinitionVersion = String(def.version || "");
  currentDefinitionVersions = [];
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
  detailRepoOrigin.textContent = renderRepoOrigin(def);
  detailRepoOrigin.title = String(def.repoRemoteUrl || "").trim();

  const dccUri = extractDccUriFromDefinitionContent(definitionContent, def.filePath);
  currentDetailDefinitionDccUri = String(dccUri || "").trim();
  if (dccUri) {
    detailDccUri.hidden = false;
    detailDccUri.textContent = `DCC URI: ${dccUri}`;
  } else {
    detailDccUri.hidden = true;
    detailDccUri.textContent = "";
  }

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
  await refreshDiffVersions();
  const isUntrackedDefinition = currentDetailDefinitionSource === "untracked";
  const canDeleteDefinition = currentDetailDefinitionSource === "repo" || isUntrackedDefinition;
  deleteDefinitionButton.hidden = !canDeleteDefinition;
  pushUpstreamDefinitionButton.hidden = !isUntrackedDefinition;
  pushUpstreamDefinitionButton.disabled = !isUntrackedDefinition;
  updateInstallDefinitionButtonState();
  definitionTabPreview.disabled = false;
  lastValidationResult = null;
  validationResults.innerHTML = `<div class="validation-empty">Run validation to see schema, lint, and reference checks.</div>`;
  validationLastRun.textContent = "";
  setDefinitionTab("preview");
  renderVersionBanner("");
  showDetailPage();
}

function updateInstallDefinitionButtonState() {
  if (!installDefinitionButton) {
    return;
  }

  const hasSelectedProject = Boolean(devProjectInput.value.trim());
  const isUntrackedDefinition = currentDetailDefinitionSource === "untracked";
  const isLocalOnlyDefinition = currentDetailDefinitionStatus === "local-only";
  const isSavedInCurrentProject = currentDetailDefinitionStatus === "saved";
  const hasDefinition = Number.isFinite(Number(currentDetailDefinitionId)) && currentDetailDefinitionId > 0;
  const canInstall = !isUntrackedDefinition && !isLocalOnlyDefinition;

  installDefinitionButton.hidden = !canInstall;
  if (!canInstall) {
    installDefinitionButton.disabled = true;
    return;
  }

  installDefinitionButton.disabled = !hasDefinition || !hasSelectedProject || isSavedInCurrentProject;

  if (isSavedInCurrentProject) {
    installDefinitionButton.title = "Definition already installed in current project";
    installDefinitionButton.setAttribute("aria-label", "Definition already installed in current project");
    return;
  }

  if (!hasSelectedProject) {
    installDefinitionButton.title = "Select a project first";
    installDefinitionButton.setAttribute("aria-label", "Select a project first");
    return;
  }

  installDefinitionButton.title = "Install definition in current project";
  installDefinitionButton.setAttribute("aria-label", "Install definition in current project");
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
  currentDetailDefinitionContent = "";
  currentDetailDefinitionDccUri = "";
  currentDetailDefinitionStatus = "";
  currentDefinitionVersion = "";
  detailDccUri.hidden = true;
  detailDccUri.textContent = "";
  detailRepoOrigin.textContent = "";
  detailRepoOrigin.title = "";
  activeHistoricalVersion = "";
  deleteDefinitionButton.hidden = true;
  pushUpstreamDefinitionButton.hidden = true;
  pushUpstreamDefinitionButton.disabled = true;
  if (installDefinitionButton) {
    installDefinitionButton.hidden = true;
    installDefinitionButton.disabled = true;
  }
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
  await fetchWithErrorHandling(`/api/definitions/${id}/save`, { method: "POST" }, "Unable to save definition.", {
    title: "Saving definition...",
    description: "Installing definition in selected project.",
  });
}

async function publishDefinition(id) {
  await fetchWithErrorHandling(`/api/definitions/${id}/publish`, { method: "POST" }, "Unable to publish definition.", {
    title: "Publishing definition...",
    description: "Uploading definition to team repository.",
  });
}

async function removeDefinition(id) {
  await fetchWithErrorHandling(`/api/definitions/${id}/remove`, { method: "POST" }, "Unable to remove definition.", {
    title: "Removing definition...",
    description: "Removing definition from current project.",
  });
}

async function deleteDefinitionFromRepo(id) {
  await fetchWithErrorHandling(`/api/definitions/${id}/delete-repo`, { method: "POST" }, "Unable to delete definition.", {
    title: "Deleting definition...",
    description: "Deleting definition from repository.",
  });
}


async function pushDefinitionToUpstream(id, { commitMessage, targetRepoId }) {
  return fetchWithErrorHandling(`/api/definitions/${id}/push-upstream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commitMessage, targetRepoId })
  }, "Unable to push definition.", {
    title: "Pushing definition...",
    description: "Pushing definition to upstream repository.",
  });
}

async function openPushUpstreamModal({ definitionName = "" } = {}) {
  const repos = await fetchWithErrorHandling("/api/asset-repos", { method: "GET" }, "Unable to load asset repositories.");
  const availableRepos = (Array.isArray(repos) ? repos : []).filter((repo) => repo?.enabled);
  if (availableRepos.length === 0) {
    window.alert("No enabled asset repositories found. Configure repositories in Settings first.");
    return null;
  }

  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "duplicate-definition-overlay";
    const defaultMessage = `Add definition ${definitionName || ""}`.trim();
    const repoOptions = availableRepos
      .map((repo) => `<option value="${escapeHtml(String(repo.id))}">${escapeHtml(repo.name || repo.localPath || `Repo ${repo.id}`)}</option>`)
      .join("");

    overlay.innerHTML = `
      <div class="duplicate-definition-modal" role="dialog" aria-modal="true" aria-labelledby="pushUpstreamTitle">
        <h3 id="pushUpstreamTitle">Push to upstream</h3>
        <p class="duplicate-definition-subtitle">Choose a repository and commit message.</p>
        <label class="duplicate-definition-field">Repository
          <select data-role="push-repo">${repoOptions}</select>
        </label>
        <label class="duplicate-definition-field">Commit message
          <input type="text" data-role="push-commit-message" value="${escapeHtml(defaultMessage)}" />
        </label>
        <div class="duplicate-definition-actions">
          <button class="btn" type="button" data-role="push-cancel">Cancel</button>
          <button class="btn primary" type="button" data-role="push-submit">Push</button>
        </div>
      </div>
    `;

    const repoSelect = overlay.querySelector('[data-role="push-repo"]');
    const messageInput = overlay.querySelector('[data-role="push-commit-message"]');
    const cancelButton = overlay.querySelector('[data-role="push-cancel"]');
    const submitButton = overlay.querySelector('[data-role="push-submit"]');

    function closeModal(result = null) {
      overlay.remove();
      resolve(result);
    }

    cancelButton?.addEventListener("click", () => closeModal(null));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        closeModal(null);
      }
    });

    submitButton?.addEventListener("click", () => {
      const targetRepoId = Number(repoSelect?.value || 0);
      const commitMessage = String(messageInput?.value || "").trim() || defaultMessage;
      if (!Number.isFinite(targetRepoId) || targetRepoId <= 0) {
        window.alert("Please select a valid asset repository.");
        repoSelect?.focus();
        return;
      }
      closeModal({ targetRepoId, commitMessage });
    });

    document.body.appendChild(overlay);
    messageInput?.focus();
    messageInput?.setSelectionRange(0, messageInput.value.length);
  });
}

function closeDuplicateDefinitionModal() {
  const existing = document.querySelector(".duplicate-definition-overlay");
  if (existing) {
    existing.remove();
  }
}

function openDuplicateDefinitionModal({ defaultName, defaultDccUri, defaultContent }) {
  closeDuplicateDefinitionModal();
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "duplicate-definition-overlay";
    overlay.innerHTML = `
      <div class="duplicate-definition-modal" role="dialog" aria-modal="true" aria-labelledby="duplicateDefinitionTitle">
        <h3 id="duplicateDefinitionTitle">Duplicate definition</h3>
        <p class="duplicate-definition-subtitle">Review and update fields before creating the duplicate.</p>
        <label class="duplicate-definition-field">Definition name
          <input type="text" data-role="duplicate-name" value="${escapeHtml(defaultName)}" />
        </label>
        <label class="duplicate-definition-field">DCC URI
          <input type="text" data-role="duplicate-dcc-uri" value="${escapeHtml(defaultDccUri)}" />
        </label>
        <label class="duplicate-definition-field">Definition source
          <textarea data-role="duplicate-content" rows="14">${escapeHtml(defaultContent)}</textarea>
        </label>
        <div class="duplicate-definition-actions">
          <button class="btn" type="button" data-role="duplicate-cancel">Cancel</button>
          <button class="btn primary" type="button" data-role="duplicate-save">Create duplicate</button>
        </div>
      </div>
    `;

    const nameInput = overlay.querySelector('[data-role="duplicate-name"]');
    const dccUriInput = overlay.querySelector('[data-role="duplicate-dcc-uri"]');
    const contentInput = overlay.querySelector('[data-role="duplicate-content"]');
    const cancelButton = overlay.querySelector('[data-role="duplicate-cancel"]');
    const saveButton = overlay.querySelector('[data-role="duplicate-save"]');

    function handleCancel() {
      closeDuplicateDefinitionModal();
      resolve(null);
    }

    cancelButton?.addEventListener("click", handleCancel);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        handleCancel();
      }
    });

    saveButton?.addEventListener("click", () => {
      const nextName = String(nameInput?.value || "").trim();
      const nextDccUri = String(dccUriInput?.value || "").trim();
      const nextContent = String(contentInput?.value || "").trim();
      if (!nextName) {
        window.alert("Definition name cannot be empty.");
        nameInput?.focus();
        return;
      }
      if (!nextDccUri) {
        window.alert("Definition dcc_uri cannot be empty.");
        dccUriInput?.focus();
        return;
      }
      if (!nextContent) {
        window.alert("Definition content cannot be empty.");
        contentInput?.focus();
        return;
      }
      closeDuplicateDefinitionModal();
      resolve({ name: nextName, dccUri: nextDccUri, content: nextContent });
    });

    document.body.append(overlay);
    nameInput?.focus();
    nameInput?.select();
  });
}

function createDuplicateDefaults(definitionName, definitionPath, definitionContent = "", definitionDccUri = "") {
  const defaultName = `${String(definitionName || "definition").trim() || "definition"}_copy`;
  const currentDccUri = String(definitionDccUri || extractDccUriFromDefinitionContent(definitionContent, definitionPath) || "").trim();
  const defaultDccUri = currentDccUri ? `${currentDccUri}_copy` : defaultName;
  const originalFileName = pathBasename(definitionPath) || "definition.md";
  const extension = pathExtname(originalFileName);
  const baseName = extension ? originalFileName.slice(0, -extension.length) : originalFileName;
  const defaultFileName = `${baseName}_copy${extension}`;
  return { defaultName, defaultDccUri, defaultFileName };
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

async function duplicateDefinition(id, { name, fileName, dccUri, content }) {
  return fetchWithErrorHandling(`/api/definitions/${id}/duplicate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, fileName, dccUri, content })
  }, "Unable to duplicate definition.", {
    title: "Duplicating definition...",
    description: "Creating a copy of this definition.",
  });
}

searchInput.addEventListener("input", (event) => {
  setSearchValue(event.target.value);
  renderCards();
});

devProjectInput.addEventListener("change", async (event) => {
  const selected = event.target.value.trim();
  if (!selected) {
    await setCurrentDevProject("");
    await fetchDefinitionSuggestions();
    await fetchDefinitions();
    updateInstallDefinitionButtonState();
    return;
  }
  if (devProjects.length > 0 && !devProjects.includes(selected)) {
    return;
  }
  await setCurrentDevProject(selected);
  await fetchDefinitionSuggestions();
  await fetchDefinitions();
  updateInstallDefinitionButtonState();
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

function setupEventListeners() {
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

    const submission = await openPushUpstreamModal({ definitionName: currentDetailDefinitionName || "" });
    if (!submission) {
      return;
    }

    try {
      const result = await pushDefinitionToUpstream(currentDetailDefinitionId, submission);
      await fetchDefinitions();
      const updatedDefinitionId = Number(result?.definition?.id || currentDetailDefinitionId);
      await showDetails(updatedDefinitionId);
      window.alert(result?.message || "Definition pushed to upstream repository.");
    } catch (error) {
      window.alert(error.message || "Unable to push definition.");
    }
  });

  installDefinitionButton?.addEventListener("click", async () => {
    if (!Number.isFinite(Number(currentDetailDefinitionId)) || currentDetailDefinitionId <= 0) {
      return;
    }
    if (!devProjectInput.value.trim()) {
      window.alert("Please select a project first.");
      return;
    }

    try {
      const result = await saveDefinition(currentDetailDefinitionId);
      await fetchDefinitions();
      await showDetails(currentDetailDefinitionId);
      window.alert(result?.message || "Definition installed in current project.");
    } catch (error) {
      window.alert(error.message || "Unable to install definition in current project.");
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
  
    const { defaultName, defaultDccUri, defaultFileName } = createDuplicateDefaults(currentDetailDefinitionName, currentDetailDefinitionPath, currentDetailDefinitionContent, currentDetailDefinitionDccUri);
    const duplicateDetails = await openDuplicateDefinitionModal({
      defaultName,
      defaultDccUri,
      defaultContent: currentDetailDefinitionContent
    });
    if (!duplicateDetails) {
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
      const result = await duplicateDefinition(currentDetailDefinitionId, {
        name: duplicateDetails.name,
        fileName: normalizedFileName,
        dccUri: duplicateDetails.dccUri,
        content: duplicateDetails.content
      });
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
  
  runValidationButton?.addEventListener("click", () => {
    runValidationForCurrentDefinition();
  });
  
  copyValidationReportButton?.addEventListener("click", async () => {
    if (!lastValidationResult) {
      return;
    }
    const raw = JSON.stringify(lastValidationResult, null, 2);
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(raw);
    }
  });
  
  validationSeverityFilter?.addEventListener("change", () => {
    if (lastValidationResult) {
      renderValidationResult(lastValidationResult);
    }
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
  
  
  
}

export function initializeApp() {
  setupRecommendationsSection();
  setupEventListeners();
  loadDevProjects();
  loadCurrentDevProject()
    .then(fetchDefinitionSuggestions)
    .then(fetchDefinitions)
    .then(handleRoute);
}
