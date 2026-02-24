import { runWithLoading } from "../services/loadingService.js";
import { createDiffService } from "../services/diffService.js";
import { loadAvailableDefinitionTags, suggestTagsForDefinitionContent } from "../services/autoTagService.js";
import { definitionIconSvg } from "../utils/definitionIcons.js";

const cardsContainer = document.getElementById("cards");
const definitionsCountLabel = document.getElementById("definitionsCountLabel");
const paginationContainer = document.getElementById("pagination");
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
const autoTagDefinitionButton = document.getElementById("autoTagDefinition");
const editDefinitionButton = document.getElementById("editDefinition");
const newDefinitionButton = document.getElementById("newDefinitionButton");
const newDefinitionMenu = document.getElementById("newDefinitionMenu");
const generateDefinitionMenuItem = document.getElementById("generateDefinitionMenuItem");
const recommendationsToggleButton = document.getElementById("recommendationsToggleButton");
const hubMenuToggleButton = document.getElementById("hubMenuToggle");
const hubMenu = document.getElementById("hubMenu");
const localDefinitionsToggle = document.getElementById("localDefinitionsToggle");
const hideInstalledMenuToggle = document.getElementById("hideInstalledMenuToggle");
const userGuideSeparator = document.getElementById("userGuideSeparator");
const installGuideMenuItem = document.getElementById("installGuideMenuItem");
const settingsMenuItem = document.getElementById("settingsMenuItem");
const duplicateDefinitionButton = document.getElementById("duplicateDefinition");
const pushUpstreamDefinitionButton = document.getElementById("pushUpstreamDefinition");
const versionHistoryButton = document.getElementById("versionHistoryButton");
const deleteDefinitionButton = document.getElementById("deleteDefinition");
const installDefinitionButton = document.getElementById("installDefinition");
const favoriteDefinitionButton = document.getElementById("favoriteDefinition");
const topNav = document.getElementById("topNav");
const activityPage = document.getElementById("activityPage");
const agentsPage = document.getElementById("agentsPage");
const runAgentButton = document.getElementById("runAgentButton");
const runAgentStage = document.getElementById("runAgentStage");
const runConfigStage = document.getElementById("runConfigStage");
const runPromptStage = document.getElementById("runPromptStage");
const runPromptInput = document.getElementById("runPromptInput");
const runPromptCharCount = document.getElementById("runPromptCharCount");
const runPromptClearButton = document.getElementById("runPromptClearButton");
const runAgentStatusBar = document.getElementById("runAgentStatusBar");
const runAgentStatusText = document.getElementById("runAgentStatusText");
const runAgentCheckAgent = document.getElementById("runAgentCheckAgent");
const runAgentCheckConfig = document.getElementById("runAgentCheckConfig");
const runAgentCheckReady = document.getElementById("runAgentCheckReady");
const runAgentOutputPanel = document.getElementById("runAgentOutputPanel");
const runAgentOutputMeta = document.getElementById("runAgentOutputMeta");
const runAgentOutputText = document.getElementById("runAgentOutputText");
const runPickerTitle = document.getElementById("runPickerTitle");
const runPickerSubtitle = document.getElementById("runPickerSubtitle");
const runPickerSearch = document.getElementById("runPickerSearch");
const runPickerTabs = document.getElementById("runPickerTabs");
const runPickerList = document.getElementById("runPickerList");
const runPickerFooter = document.getElementById("runPickerFooter");
const runPickerApplyButton = document.getElementById("runPickerApplyButton");
const discoverTabBadge = document.getElementById("discoverTabBadge");
const installedTabBadge = document.getElementById("installedTabBadge");
const favoritesTabBadge = document.getElementById("favoritesTabBadge");
const activityTabBadge = document.getElementById("activityTabBadge");
const activityList = document.getElementById("activityList");
const activityFilters = document.getElementById("activityFilters");
const activityDetailEmpty = document.getElementById("activityDetailEmpty");
const activityDetailCard = document.getElementById("activityDetailCard");
const activityDetailName = document.getElementById("activityDetailName");
const activityDetailStatus = document.getElementById("activityDetailStatus");
const activityDetailRunId = document.getElementById("activityDetailRunId");
const activityDetailAgent = document.getElementById("activityDetailAgent");
const activityDetailConfig = document.getElementById("activityDetailConfig");
const activityDetailPid = document.getElementById("activityDetailPid");
const activityDetailStarted = document.getElementById("activityDetailStarted");
const activityDetailDuration = document.getElementById("activityDetailDuration");
const activityDetailExit = document.getElementById("activityDetailExit");
const activityLog = document.getElementById("activityLog");
const activityLiveDot = document.getElementById("activityLiveDot");
const activityStreamBackdrop = document.getElementById("activityStreamBackdrop");
const activityStreamPanel = document.getElementById("activityStreamPanel");
const activityOpenStreamButton = document.getElementById("activityOpenStreamButton");
const activityCloseStreamButton = document.getElementById("activityCloseStreamButton");
const activityCancelButton = document.getElementById("activityCancelButton");
const activityRerunButton = document.getElementById("activityRerunButton");
const activityRefreshButton = document.getElementById("activityRefreshButton");
const activityWrapButton = document.getElementById("activityWrapButton");
const activityClearLogsButton = document.getElementById("activityClearLogsButton");
const activityCopyLogsButton = document.getElementById("activityCopyLogsButton");
const activityScrollLockButton = document.getElementById("activityScrollLockButton");
const activityExportLogsButton = document.getElementById("activityExportLogsButton");
const activityNewRunButton = document.getElementById("activityNewRunButton");
const activityLastUpdated = document.getElementById("activityLastUpdated");
const activityStatLaunched = document.getElementById("activityStatLaunched");
const activityStatRunning = document.getElementById("activityStatRunning");
const activityStatFinished = document.getElementById("activityStatFinished");
const activityStatCancelled = document.getElementById("activityStatCancelled");
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
const recommendationsActions = document.createElement("div");
const recommendationsAiButton = document.createElement("button");
const recommendationsMeta = document.createElement("p");
const recommendationsState = document.createElement("p");
const recommendationsCards = document.createElement("div");
const recommendationsCardsContainer = document.createElement("div");
const recommendationsInstallAllButton = document.createElement("button");
const recommendationsDivider = document.createElement("div");
const recommendationsContent = document.createElement("div");

let definitions = [];
let suggestionDefinitionIds = [];
let suggestionsMeta = { projectPath: "", projectType: "", corePlatform: "", suggestions: [] };
let latestSuggestionIntent = "";
const RECOMMENDATIONS_VISIBILITY_STORAGE_KEY = "dcc.recommendations.visible";
const INTENT_RECOMMENDATIONS_STORAGE_KEY = "dcc.recommendations.intent";
const HIDE_INSTALLED_DEFINITIONS_STORAGE_KEY = "dcc.hub.hideInstalledDefinitions";
const ONLY_LOCAL_DEFINITIONS_STORAGE_KEY = "dcc.hub.onlyLocalDefinitions";
let recommendationsVisible = getStoredRecommendationsVisibility();
let activeFilter = "all";
let searchTerm = "";
let semanticSearchState = { query: "", suggestions: [], error: "" };
let tagFilterMode = "or";
let showUntaggedDefinitions = false;
let tagFilterSearchTerm = "";
const selectedTagFilters = new Set();
let devProjects = [];
let currentDetailDefinitionId = null;
let currentDetailDefinitionSource = "";
let currentDetailDefinitionName = "";
let currentDetailDefinitionPath = "";
let currentDetailDefinitionContent = "";
let currentDetailDefinitionDccUri = "";
let currentDetailDefinitionStatus = "";
let currentDetailDefinitionTags = [];
let currentDetailInstalledDestinations = [];
let currentDefinitionVersion = "";
let activeHistoricalVersion = "";
let activeVersionDropdown = null;
let lastValidationResult = null;
let validationAutoRunTimeout = null;
let diffService = null;
let currentDefinitionVersions = [];

const FILTER_TYPES = ["models", "mcp servers", "rules", "prompts", "agents", "context", "workflows", "docs", "configs", "unknown"];
const SPECIAL_FILTERS = [];
const GENERATED_DEFINITION_STORAGE_KEY = "dcc.generated.definition";
const GENERATABLE_DEFINITION_TYPES = ["prompt", "mcpServer", "agent", "rule", "model", "workflow", "context", "doc", "config"];
const COMMON_DEFINITION_HELP_PAGE_PATH = "/help/user-guide/pages/usage/definition-details-actions-test-schema-common.md";
const DEFINITION_HELP_PAGE_BY_TYPE = {
  prompt: "/help/user-guide/pages/usage/definition-details-actions-test-schema-prompt.md",
  mcpServer: "/help/user-guide/pages/usage/definition-details-actions-test-schema-mcpserver.md",
  agent: "/help/user-guide/pages/usage/definition-details-actions-test-schema-agent.md",
  rule: "/help/user-guide/pages/usage/definition-details-actions-test-schema-rule.md",
  model: "/help/user-guide/pages/usage/definition-details-actions-test-schema-model.md",
  workflow: "/help/user-guide/pages/usage/definition-details-actions-test-schema-workflow.md",
  context: "/help/user-guide/pages/usage/definition-details-actions-test-schema-context.md",
  doc: "/help/user-guide/pages/usage/definition-details-actions-test-schema-docs.md",
  config: "/help/user-guide/pages/usage/definition-details-actions-test-schema-config.md"
};
const DEFINITION_TYPE_ALIASES = {
  prompt: "prompt",
  prompts: "prompt",
  mcpserver: "mcpServer",
  mcpservers: "mcpServer",
  agent: "agent",
  agents: "agent",
  rule: "rule",
  rules: "rule",
  model: "model",
  models: "model",
  workflow: "workflow",
  workflows: "workflow",
  context: "context",
  contexts: "context",
  doc: "doc",
  docs: "doc",
  config: "config",
  configs: "config"
};
const FILTER_TYPE_SET = new Set(FILTER_TYPES);
const INSTALL_DESTINATION_OPTIONS = [
  { key: "continue", label: "Continue" },
  { key: "copilot", label: "GitHub Copilot" },
  { key: "gemini", label: "Gemini CLI" }
];
const DESTINATION_COMPATIBILITY = {
  continue: new Set(["rules", "prompts", "workflows", "models", "agents", "mcpservers", "context", "docs", "configs"]),
  copilot: new Set(["rules", "prompts"]),
  gemini: new Set(["rules", "prompts"])
};
let activeInstallDestinationMenu = null;

const MAX_CARD_TAG_PILLS = 3;
const CARDS_PER_PAGE = 25;
let currentCardsPage = 1;
let onlyLocalDefinitions = getStoredOnlyLocalDefinitions();
let activeTopPage = "discover";
const RECENT_AGENT_RUNS_STORAGE_KEY = "dcc.agent.builder.recent-runs";
const RECENT_AGENT_RUN_PACKS_ENDPOINT = "/api/agent-run-packs";
const AGENT_RUNS_ENDPOINT = "/api/agent-runs";
let runBuilderMode = "agent";
let runBuilderPickerFilter = "installed";
let runBuilderSearchQuery = "";
let runBuilderPendingSelection = null;
let runBuilderSelection = { agent: null, config: null };
let recentAgentRunPacks = getStoredRecentAgentRunPacks();
let activeRunId = "";
let activeRunLogSince = 0;
let activeRunPollTimer = null;
let activityRuns = [];
let activityFilter = "all";
let activitySelectedRunId = "";
let activityLogsSince = 0;
let activityLogEntries = [];
let activityWrapEnabled = true;
let activityScrollLocked = true;
let activityPollTimer = null;
let activityTickerTimer = null;
let activityRenderSignature = null;
let isActivityStreamOpen = false;
const FAVORITE_DEFINITION_IDS_STORAGE_KEY = "dcc.favorite.definition.ids";
let favoriteDefinitionIds = getStoredFavoriteDefinitionIds();


function getStoredFavoriteDefinitionIds() {
  try {
    const raw = localStorage.getItem(FAVORITE_DEFINITION_IDS_STORAGE_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0));
  } catch (_error) {
    return new Set();
  }
}

function persistFavoriteDefinitionIds() {
  try {
    localStorage.setItem(FAVORITE_DEFINITION_IDS_STORAGE_KEY, JSON.stringify(Array.from(favoriteDefinitionIds)));
  } catch (_error) {
    // Ignore localStorage errors.
  }
}

function isFavoriteDefinition(definitionId) {
  return favoriteDefinitionIds.has(Number(definitionId));
}

function toggleFavoriteDefinition(definitionId) {
  const normalizedId = Number(definitionId);
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
    return false;
  }

  if (favoriteDefinitionIds.has(normalizedId)) {
    favoriteDefinitionIds.delete(normalizedId);
  } else {
    favoriteDefinitionIds.add(normalizedId);
  }

  persistFavoriteDefinitionIds();
  return favoriteDefinitionIds.has(normalizedId);
}

function normalizeRecentAgentRunPack(entry) {
  if (!entry || typeof entry !== "object") return null;

  const agentId = String(entry.agentId || "").trim();
  const configId = String(entry.configId || "").trim();
  if (!agentId || !configId) return null;

  return {
    agentId,
    configId,
    prompt: String(entry.prompt || "")
  };
}

function getStoredRecentAgentRunPacks() {
  try {
    const raw = localStorage.getItem(RECENT_AGENT_RUNS_STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((value) => normalizeRecentAgentRunPack(value))
      .filter(Boolean)
      .slice(0, 30);
  } catch (_error) {
    return [];
  }
}

function persistRecentAgentRunPacks() {
  try {
    localStorage.setItem(RECENT_AGENT_RUNS_STORAGE_KEY, JSON.stringify(recentAgentRunPacks.slice(0, 30)));
  } catch (_error) {
    // Ignore localStorage failures.
  }
}


async function loadRecentAgentRunPacksFromDatabase() {
  try {
    const response = await fetch(RECENT_AGENT_RUN_PACKS_ENDPOINT);
    if (!response.ok) {
      throw new Error(`Failed to load recent agent packs (${response.status})`);
    }
    const payload = await response.json();
    if (!Array.isArray(payload?.packs)) {
      return;
    }
    recentAgentRunPacks = payload.packs
      .map((entry) => normalizeRecentAgentRunPack(entry))
      .filter(Boolean)
      .slice(0, 30);
    persistRecentAgentRunPacks();
    renderRunBuilder();
  } catch (_error) {
    // Fall back to localStorage-backed recent packs.
  }
}

async function persistRecentAgentRunPackToDatabase(pack) {
  try {
    await fetch(RECENT_AGENT_RUN_PACKS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(pack)
    });
  } catch (_error) {
    // Ignore persistence failures and keep local state.
  }
}

function toRunBuilderItem(definition, fallbackIcon) {
  const normalizedType = normalizeFilterType(definition.type);
  return {
    id: String(definition.id),
    icon: fallbackIcon,
    type: normalizedType,
    name: prettifyName(definition.name || definition.slug || definition.fileName || definition.id),
    desc: String(definition.description || definition.summary || definition.filePath || "No description available."),
    tags: Array.isArray(definition.tags) ? definition.tags.slice(0, 5) : [],
    status: String(definition.status || "")
  };
}

function getRunBuilderData(mode) {
  const type = mode === "agent" ? "agents" : "configs";
  const fallbackIcon = mode === "agent" ? "◈" : "⚙";
  return definitions
    .filter((definition) => normalizeFilterType(definition.type) === type)
    .map((definition) => toRunBuilderItem(definition, fallbackIcon));
}

function getRunBuilderPickerData() {
  if (runBuilderPickerFilter === "recent") {
    const agentsById = new Map(getRunBuilderData("agent").map((item) => [item.id, item]));
    const configsById = new Map(getRunBuilderData("config").map((item) => [item.id, item]));
    const lowerQuery = runBuilderSearchQuery.toLowerCase();
    return recentAgentRunPacks
      .map((pack, index) => {
        const agent = agentsById.get(pack.agentId);
        const config = configsById.get(pack.configId);
        if (!agent || !config) return null;

        return {
          id: `${agent.id}:${config.id}:${index}`,
          type: "pack",
          name: `${agent.name} × ${config.name}`,
          desc: pack.prompt ? `Prompt: ${pack.prompt}` : "No prompt",
          tags: [],
          agent,
          config,
          prompt: pack.prompt
        };
      })
      .filter(Boolean)
      .filter((item) => {
        if (!lowerQuery) return true;
        return item.name.toLowerCase().includes(lowerQuery)
          || item.desc.toLowerCase().includes(lowerQuery)
          || item.agent.desc.toLowerCase().includes(lowerQuery)
          || item.config.desc.toLowerCase().includes(lowerQuery);
      });
  }

  const data = getRunBuilderData(runBuilderMode);
  const lowerQuery = runBuilderSearchQuery.toLowerCase();
  const hasSelectedProject = Boolean(String(devProjectInput?.value || "").trim());
  let filtered = data;

  if (runBuilderPickerFilter === "installed") {
    filtered = filtered.filter((item) => hasSelectedProject && item.status === "saved");
  } else if (runBuilderPickerFilter === "all" && hasSelectedProject) {
    filtered = filtered.filter((item) => item.status !== "saved");
  }

  if (lowerQuery) {
    filtered = filtered.filter((item) => {
      const tags = item.tags.join(" ").toLowerCase();
      return item.name.toLowerCase().includes(lowerQuery)
        || item.desc.toLowerCase().includes(lowerQuery)
        || tags.includes(lowerQuery);
    });
  }

  return filtered;
}

function renderRunBuilderPicker() {
  if (!runPickerList) return;

  runPickerList.innerHTML = "";
  const rows = getRunBuilderPickerData();

  if (!rows.length) {
    runPickerList.innerHTML = `<div class="run-picker-empty">No ${escapeHtml(runBuilderMode)} entries match this filter.</div>`;
    return;
  }

  rows.forEach((item) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = `run-picker-item card${runBuilderPendingSelection?.id === item.id ? " selected" : ""}`;
    const typePillLabel = item.type === "pack" ? "Agent Pack" : formatTypePillLabel(item.type);
    const typePillIcon = item.type === "pack" ? filterIconSvg("agents") : filterIconSvg(item.type);
    const meta = item.type === "pack"
      ? `<p class="run-picker-item-desc"><strong>Agent:</strong> ${escapeHtml(item.agent.name)}<br><strong>Config:</strong> ${escapeHtml(item.config.name)}<br>${escapeHtml(item.prompt ? `Prompt: ${item.prompt}` : "Prompt: none")}</p>`
      : `<p class="run-picker-item-desc">${escapeHtml(item.desc)}</p>`;
    row.innerHTML = `
      <div class="run-picker-item-top">
        <h3 class="run-picker-item-name">${escapeHtml(item.name)}</h3>
        <div class="type-pill ${item.type === "pack" ? "type-pill-agents" : typeClassName(item.type)}">
          <span class="type-pill-icon">${typePillIcon}</span>
          <span>${typePillLabel}</span>
        </div>
      </div>
      ${meta}
      ${item.tags.length > 0 ? `<div class="tag-pills card-tag-pills run-picker-item-tags">${renderTagPills(item.tags, { truncate: true })}</div>` : ""}
    `;
    row.addEventListener("click", () => {
      runBuilderPendingSelection = item;
      if (item.type === "pack") {
        applyRunBuilderPendingSelection();
        return;
      }
      renderRunBuilderPicker();
    });
    runPickerList.appendChild(row);
  });
}

function renderRunBuilderStage(mode) {
  const selected = runBuilderSelection[mode];
  const isAgent = mode === "agent";
  const typeIcon = filterIconSvg(isAgent ? "agents" : "configs");
  const stage = isAgent ? runAgentStage : runConfigStage;
  const empty = document.getElementById(isAgent ? "runAgentStageEmpty" : "runConfigStageEmpty");
  const selectedContainer = document.getElementById(isAgent ? "runAgentStageSelected" : "runConfigStageSelected");
  const stageTypeIcon = document.getElementById(isAgent ? "runAgentStageType" : "runConfigStageType");

  if (!stage || !empty || !selectedContainer) return;

  if (stageTypeIcon) {
    stageTypeIcon.innerHTML = typeIcon;
  }

  stage.classList.toggle("filled", Boolean(selected));
  if (!selected) {
    empty.hidden = false;
    selectedContainer.hidden = true;
    return;
  }

  empty.hidden = true;
  selectedContainer.hidden = false;
  document.getElementById(isAgent ? "runAgentIcon" : "runConfigIcon").innerHTML = typeIcon;
  document.getElementById(isAgent ? "runAgentName" : "runConfigName").textContent = selected.name;
  document.getElementById(isAgent ? "runAgentDesc" : "runConfigDesc").textContent = selected.desc;
  const tagsContainer = document.getElementById(isAgent ? "runAgentTags" : "runConfigTags");
  tagsContainer.innerHTML = selected.tags.map((tag) => `<span class="run-stage-tag">${escapeHtml(tag)}</span>`).join("");
}

function updateRunBuilderStatus() {
  if (!runAgentStatusBar || !runAgentStatusText || !runAgentButton) return;

  const hasAgent = Boolean(runBuilderSelection.agent);
  const hasConfig = Boolean(runBuilderSelection.config);
  const ready = hasAgent && hasConfig;

  runAgentStatusBar.className = "run-agent-status";
  if (ready) {
    runAgentStatusBar.classList.add("ready");
    runAgentStatusText.textContent = `Ready — ${runBuilderSelection.agent.name} × ${runBuilderSelection.config.name}`;
  } else if (hasAgent || hasConfig) {
    runAgentStatusBar.classList.add("partial");
    runAgentStatusText.textContent = hasAgent ? "Select a config to continue." : "Select an agent to continue.";
  } else {
    runAgentStatusText.textContent = "Select an agent and config to continue.";
  }

  runAgentCheckAgent?.classList.toggle("done", hasAgent);
  runAgentCheckConfig?.classList.toggle("done", hasConfig);
  runAgentCheckReady?.classList.toggle("done", ready);
  runAgentButton.disabled = !ready;
}

function renderRunBuilder() {
  if (!agentsPage) return;
  renderRunBuilderStage("agent");
  renderRunBuilderStage("config");
  renderRunBuilderPicker();
  updateRunBuilderStatus();
}

function updateRunPickerApplyButtonVisibility() {
  const shouldHide = runBuilderPickerFilter === "recent";
  if (runPickerApplyButton) {
    runPickerApplyButton.hidden = shouldHide;
    runPickerApplyButton.style.display = shouldHide ? "none" : "";
  }
  if (runPickerFooter) {
    runPickerFooter.classList.toggle("is-hidden", shouldHide);
  }
}

function openRunBuilderPicker(mode) {
  runBuilderMode = mode;
  runBuilderPendingSelection = runBuilderSelection[mode];

  if (runPickerTitle) {
    runPickerTitle.textContent = mode === "agent" ? "Select Agent" : "Select Config";
  }
  if (runPickerSubtitle) {
    runPickerSubtitle.textContent = mode === "agent" ? "Choose which agent will run." : "Choose the runtime config for this launch.";
  }
  if (runPickerApplyButton) {
    runPickerApplyButton.textContent = mode === "agent" ? "Select Agent" : "Select Config";
  }

  runAgentStage?.classList.toggle("picking", mode === "agent");
  runConfigStage?.classList.toggle("picking", mode === "config");
  updateRunPickerApplyButtonVisibility();
  renderRunBuilderPicker();
}

function applyRunBuilderPendingSelection() {
  if (!runBuilderPendingSelection) return;

  if (runBuilderPendingSelection.type === "pack") {
    runBuilderSelection.agent = runBuilderPendingSelection.agent;
    runBuilderSelection.config = runBuilderPendingSelection.config;
    if (runPromptInput) {
      runPromptInput.value = runBuilderPendingSelection.prompt || "";
      handleRunBuilderPromptInput();
    }
    renderRunBuilder();
    return;
  }

  runBuilderSelection[runBuilderMode] = runBuilderPendingSelection;
  renderRunBuilder();

  if (runBuilderMode === "agent" && !runBuilderSelection.config) {
    openRunBuilderPicker("config");
  }
}

function clearRunBuilderStage(mode) {
  runBuilderSelection[mode] = null;
  if (runBuilderMode === mode) {
    runBuilderPendingSelection = null;
  }
  openRunBuilderPicker(mode);
  updateRunBuilderStatus();
  renderRunBuilderStage(mode);
}

function handleRunBuilderPromptInput() {
  if (!runPromptInput || !runPromptCharCount || !runPromptStage) return;
  const length = runPromptInput.value.length;
  runPromptCharCount.textContent = `${length} chars`;
  runPromptStage.classList.toggle("filled", length > 0);
}

function isDefinitionInstalledInCurrentProject(definitionId) {
  const normalizedId = String(definitionId || "").trim();
  if (!normalizedId) return false;
  const definition = definitions.find((item) => String(item.id) === normalizedId);
  if (!definition) return false;

  const installedDestinations = Array.isArray(definition.installedDestinations)
    ? definition.installedDestinations.map((entry) => String(entry || "").trim().toLowerCase())
    : [];
  return installedDestinations.includes("continue");
}

async function ensureRunBuilderDefinitionsInstalled(selection) {
  const pendingInstallIds = [selection?.agent?.id, selection?.config?.id]
    .filter(Boolean)
    .filter((id, index, source) => source.indexOf(id) === index)
    .filter((id) => !isDefinitionInstalledInCurrentProject(id));

  if (!pendingInstallIds.length) {
    return;
  }

  await runWithLoading(async () => {
    for (const definitionId of pendingInstallIds) {
      await saveDefinition(definitionId, "continue", { showLoading: false });
    }
  }, {
    title: "Installing missing definitions...",
    description: "Installing selected agent/config in the current project before launch."
  });

  await fetchDefinitions();
  renderRunBuilder();
}

function clearActiveRunPolling() {
  if (activeRunPollTimer) {
    clearTimeout(activeRunPollTimer);
    activeRunPollTimer = null;
  }
}

function appendRunOutputLine(stream, text) {
  if (!runAgentOutputText) return;
  const prefix = stream === "stderr" ? "[stderr]" : "[stdout]";
  runAgentOutputText.textContent += `${prefix} ${text}`;
  runAgentOutputText.scrollTop = runAgentOutputText.scrollHeight;
}

async function pollActiveRun() {
  if (!activeRunId) return;

  let shouldScheduleNextPoll = true;

  try {
    const [runResponse, logsResponse] = await Promise.all([
      fetch(`${AGENT_RUNS_ENDPOINT}/${encodeURIComponent(activeRunId)}`),
      fetch(`${AGENT_RUNS_ENDPOINT}/${encodeURIComponent(activeRunId)}/logs?since=${activeRunLogSince}`)
    ]);

    if (runResponse.ok) {
      const payload = await runResponse.json();
      const run = payload?.run;
      if (run && runAgentStatusText) {
        const exitSuffix = run.status === "terminated" || run.status === "failed" || run.status === "killed"
          ? ` (exit=${run.exitCode ?? "n/a"}${run.signal ? `, signal=${run.signal}` : ""})`
          : "";
        runAgentStatusText.textContent = `Run ${run.runId}: ${run.status}${exitSuffix}`;
      }

      if (run && runAgentOutputMeta) {
        runAgentOutputMeta.textContent = `runId=${run.runId} pid=${run.pid ?? "n/a"} status=${run.status} out=${run.emittedStdoutBytes ?? 0}B err=${run.emittedStderrBytes ?? 0}B`;
      }

      if (run && ["terminated", "failed", "killed"].includes(run.status)) {
        clearActiveRunPolling();
        shouldScheduleNextPoll = false;
      }
    }

    if (logsResponse.ok) {
      const payload = await logsResponse.json();
      const entries = Array.isArray(payload?.entries) ? payload.entries : [];
      entries.forEach((entry) => {
        appendRunOutputLine(entry?.stream, String(entry?.text || ""));
      });
      activeRunLogSince = Number(payload?.nextSince || activeRunLogSince);
    }
  } catch (_error) {
    if (runAgentStatusText) {
      runAgentStatusText.textContent = `Run ${activeRunId}: unable to fetch updates.`;
    }
  }

  if (activeRunId && shouldScheduleNextPoll) {
    activeRunPollTimer = setTimeout(pollActiveRun, 1500);
  }
}

function mapRunStatus(run) {
  const status = String(run?.status || "").toLowerCase();
  if (status === "running" || status === "stuck") return "running";
  if (status === "launched" || status === "preparing_to_launch") return "launched";
  if (status === "terminated") return "finished";
  if (status === "killed" || status === "failed") return "cancelled";
  return "finished";
}

function getRunNameFromPath(pathValue, fallback) {
  const normalized = String(pathValue || "").trim();
  if (!normalized) return fallback;
  const segments = normalized.split(/[\/]/).filter(Boolean);
  const finalName = segments[segments.length - 1] || fallback;
  return finalName.replace(/\.[^.]+$/, "") || fallback;
}

function isRunCancelable(run) {
  const status = mapRunStatus(run);
  return status === "running" || status === "launched";
}

function isRunLive(run) {
  const status = mapRunStatus(run);
  return status === "running" || status === "launched";
}

function getRunElapsedSeconds(run) {
  const startedAtMs = Date.parse(run?.startedAt || run?.createdAt || "");
  if (!Number.isFinite(startedAtMs)) return 0;
  const endedAtMs = Date.parse(run?.endedAt || "");
  const endMs = Number.isFinite(endedAtMs) ? endedAtMs : Date.now();
  return Math.max(0, Math.floor((endMs - startedAtMs) / 1000));
}

function formatDurationSeconds(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`;
  return `${String(secs).padStart(2, "0")}s`;
}

function formatDuration(startedAt, endedAt) {
  const run = { startedAt, endedAt };
  return formatDurationSeconds(getRunElapsedSeconds(run));
}

function formatLogLevel(entry = {}) {
  const text = String(entry?.text || "").toLowerCase();
  if (entry?.stream === "stderr") {
    if (text.includes("warn")) return "warn";
    return "error";
  }
  if (text.includes("warn")) return "warn";
  if (text.includes("error") || text.includes("failed")) return "error";
  if (text.includes("success") || text.includes("completed") || text.includes("✓")) return "success";
  if (text.includes("init") || text.includes("launch") || text.includes("loading")) return "info";
  return "default";
}

function getLogTimestamp(entry) {
  if (!entry?.timestamp) return "--:--:--";
  return new Date(entry.timestamp).toLocaleTimeString();
}

function getStatusIcon(status) {
  return { running: "▶", launched: "◎", finished: "✓", cancelled: "✕" }[status] || "•";
}

function renderActivityStats() {
  if (!activityStatRunning || !activityStatLaunched || !activityStatFinished || !activityStatCancelled) return;
  const counts = { running: 0, launched: 0, finished: 0, cancelled: 0 };
  activityRuns.forEach((run) => {
    const status = mapRunStatus(run);
    counts[status] = (counts[status] || 0) + 1;
  });
  activityStatRunning.textContent = String(counts.running || 0);
  activityStatLaunched.textContent = String(counts.launched || 0);
  activityStatFinished.textContent = String(counts.finished || 0);
  activityStatCancelled.textContent = String(counts.cancelled || 0);
  updatePageTabBadges();
}

function renderActivityList() {
  if (!activityList) return;
  const items = activityRuns.filter((run) => activityFilter === "all" || mapRunStatus(run) === activityFilter);
  if (!items.length) {
    activityList.innerHTML = '<p class="activity-list-empty">No agent runs match this filter.</p>';
    return;
  }

  activityList.innerHTML = items.map((run, index) => {
    const status = mapRunStatus(run);
    const agentName = getRunNameFromPath(run.agentPath, run.runId);
    const configName = getRunNameFromPath(run.configPath, "config");
    const runSeconds = getRunElapsedSeconds(run);
    const canCancel = isRunCancelable(run);

    return `
      <article class="activity-row ${activitySelectedRunId === run.runId ? "active" : ""} ${status}" data-run-id="${escapeHtml(run.runId)}" data-run-status="${status}" style="animation-delay:${(index * 0.04).toFixed(2)}s">
        <div class="activity-status-indicator ${status}">
          <span class="activity-spin-ring"></span>
          <span class="activity-status-icon">${getStatusIcon(status)}</span>
          <span class="activity-pulse-dot"></span>
        </div>

        <div class="activity-row-info">
          <h3>${escapeHtml(agentName)}</h3>
          <div class="activity-row-meta">
            <span class="activity-row-chip">${escapeHtml(run.runId)}</span>
            <span class="activity-row-config">⚙ ${escapeHtml(configName)}</span>
            <span class="activity-row-pid">pid ${run.pid ?? "n/a"}</span>
          </div>
        </div>

        <div class="activity-row-timer">
          <div class="activity-row-timer-value ${status === "running" ? "running" : status === "launched" ? "launched" : ""}" data-activity-timer="${escapeHtml(run.runId)}">${formatDurationSeconds(runSeconds)}</div>
          <div class="activity-row-timer-label">${status === "running" ? "running" : status === "launched" ? "launching" : "duration"}</div>
        </div>

        <div class="activity-run-actions">
          <button type="button" title="View logs" data-activity-open="${escapeHtml(run.runId)}">≡</button>
          <button type="button" title="Re-run" data-activity-rerun="${escapeHtml(run.runId)}">↺</button>
          <button type="button" title="Cancel run" data-activity-kill="${escapeHtml(run.runId)}" ${canCancel ? "" : "disabled"}>✕</button>
        </div>
      </article>`;
  }).join("");
}

function renderActivityDetail() {
  if (!activityDetailCard || !activityDetailEmpty) return;
  const run = activityRuns.find((entry) => entry.runId === activitySelectedRunId);
  if (!run) {
    activityDetailCard.hidden = true;
    activityDetailEmpty.hidden = false;
    if (activityLog) {
      activityLog.innerHTML = '<div class="activity-log-empty">No logs loaded.</div>';
    }
    return;
  }

  const status = mapRunStatus(run);
  activityDetailEmpty.hidden = true;
  activityDetailCard.hidden = false;
  activityDetailName.textContent = getRunNameFromPath(run.agentPath, run.runId);
  activityDetailStatus.textContent = status;
  activityDetailStatus.className = `activity-status-badge ${status}`;
  activityDetailRunId.textContent = run.runId;
  activityDetailAgent.textContent = getRunNameFromPath(run.agentPath, run.runId);
  activityDetailConfig.textContent = getRunNameFromPath(run.configPath, "config");
  activityDetailPid.textContent = run.pid ?? "n/a";
  activityDetailStarted.textContent = run.startedAt || run.createdAt || "—";
  activityDetailDuration.textContent = formatDuration(run.startedAt || run.createdAt, run.endedAt);
  activityDetailExit.textContent = run.exitCode ?? "—";
  activityCancelButton.disabled = !isRunCancelable(run);
  if (activityLiveDot) {
    activityLiveDot.hidden = !isRunLive(run);
  }
}

function openActivityStreamPanel() {
  if (!activityStreamPanel || !activityStreamBackdrop) return;
  isActivityStreamOpen = true;
  activityStreamBackdrop.hidden = false;
  activityStreamPanel.hidden = false;
  requestAnimationFrame(() => {
    activityStreamPanel.classList.add("open");
  });
}

function closeActivityStreamPanel() {
  if (!activityStreamPanel || !activityStreamBackdrop) return;
  isActivityStreamOpen = false;
  activityStreamPanel.classList.remove("open");
  setTimeout(() => {
    if (!isActivityStreamOpen) {
      activityStreamPanel.hidden = true;
      activityStreamBackdrop.hidden = true;
    }
  }, 220);
}

function renderActivityLogStream() {
  if (!activityLog) return;

  const previousScrollTop = activityLog.scrollTop;

  const lines = activityLogEntries.map((entry) => {
    const level = formatLogLevel(entry);
    const text = escapeHtml(String(entry?.text || "").trimEnd());
    const ts = escapeHtml(getLogTimestamp(entry));
    return `<div class="activity-log-line"><span class="activity-log-ts">${ts}</span><span class="activity-log-text ${level}">${text}</span></div>`;
  });

  const run = activityRuns.find((entry) => entry.runId === activitySelectedRunId);
  if (isRunLive(run)) {
    lines.push('<span class="activity-log-cursor"></span>');
  }

  if (!lines.length) {
    activityLog.innerHTML = '<div class="activity-log-empty">No logs yet.</div>';
    return;
  }

  activityLog.innerHTML = lines.join("");
  if (activityScrollLocked) {
    const maxScrollTop = Math.max(0, activityLog.scrollHeight - activityLog.clientHeight);
    activityLog.scrollTop = Math.min(previousScrollTop, maxScrollTop);
    return;
  }
  activityLog.scrollTop = activityLog.scrollHeight;
}

function setActivityScrollLocked(locked, { forceScrollToBottom = false } = {}) {
  activityScrollLocked = Boolean(locked);
  activityScrollLockButton?.classList.toggle("active", activityScrollLocked);
  if (activityScrollLockButton) {
    activityScrollLockButton.textContent = activityScrollLocked ? "🔒 lock" : "↓ follow";
  }
  if (forceScrollToBottom && activityLog) {
    activityLog.scrollTop = activityLog.scrollHeight;
  }
}

function setActivityScrollLocked(locked, { forceScrollToBottom = false } = {}) {
  activityScrollLocked = Boolean(locked);
  activityScrollLockButton?.classList.toggle("active", activityScrollLocked);
  if ((forceScrollToBottom || activityScrollLocked) && activityLog) {
    activityLog.scrollTop = activityLog.scrollHeight;
  }
}

function refreshVisibleTimers() {
  if (!activityList) return;
  const timerEls = activityList.querySelectorAll("[data-activity-timer]");
  timerEls.forEach((timerEl) => {
    const runId = timerEl.getAttribute("data-activity-timer") || "";
    const run = activityRuns.find((entry) => entry.runId === runId);
    if (!run) return;
    timerEl.textContent = formatDurationSeconds(getRunElapsedSeconds(run));
  });

  const selectedRun = activityRuns.find((entry) => entry.runId === activitySelectedRunId);
  if (selectedRun && activityDetailDuration) {
    activityDetailDuration.textContent = formatDurationSeconds(getRunElapsedSeconds(selectedRun));
  }
}

function buildActivityRenderSignature(runs) {
  if (!Array.isArray(runs) || !runs.length) return "";
  return runs.map((run) => {
    const status = mapRunStatus(run);
    return [
      run?.runId || "",
      status,
      run?.pid ?? "",
      run?.startedAt || run?.createdAt || "",
      run?.endedAt || "",
      run?.exitCode ?? "",
      run?.agentPath || "",
      run?.configPath || ""
    ].join("|");
  }).join("||");
}

async function loadActivityRuns() {
  try {
    const response = await fetch(`${AGENT_RUNS_ENDPOINT}?limit=300`);
    if (!response.ok) throw new Error(`Failed to load agent runs (${response.status})`);
    const payload = await response.json();
    const nextRuns = Array.isArray(payload?.runs) ? payload.runs : [];
    const nextSignature = buildActivityRenderSignature(nextRuns);
    const hasStructuralChanges = nextSignature !== activityRenderSignature;
    activityRuns = nextRuns;
    if (activitySelectedRunId && !activityRuns.some((run) => run.runId === activitySelectedRunId)) {
      activitySelectedRunId = "";
      activityLogsSince = 0;
      activityLogEntries = [];
    }
    if (hasStructuralChanges) {
      activityRenderSignature = nextSignature;
      renderActivityStats();
      renderActivityList();
      renderActivityDetail();
    }
    refreshVisibleTimers();
    if (activityLastUpdated) {
      activityLastUpdated.textContent = `Last updated ${new Date().toLocaleTimeString()}`;
    }
  } catch (error) {
    if (activityList) {
      activityList.innerHTML = `<p class="activity-list-empty">${escapeHtml(error?.message || "Unable to load activity")}</p>`;
    }
  }
}

async function loadActivityLogs(fullReload = false) {
  if (!activitySelectedRunId) return;
  if (fullReload) {
    activityLogsSince = 0;
    activityLogEntries = [];
  }

  const response = await fetch(`${AGENT_RUNS_ENDPOINT}/${encodeURIComponent(activitySelectedRunId)}/logs?since=${activityLogsSince}`);
  if (!response.ok) return;

  const payload = await response.json();
  const entries = Array.isArray(payload?.entries) ? payload.entries : [];
  entries.forEach((entry) => {
    activityLogEntries.push({
      stream: entry?.stream || "stdout",
      text: String(entry?.text || ""),
      timestamp: entry?.timestamp || ""
    });
  });
  activityLogsSince = Number(payload?.nextSince || activityLogsSince);
  renderActivityLogStream();
}

function clearActivityPolling() {
  if (activityPollTimer) {
    clearTimeout(activityPollTimer);
    activityPollTimer = null;
  }
}

async function pollActivity() {
  if (activeTopPage !== "activity") return;
  await loadActivityRuns();
  if (activitySelectedRunId) {
    await loadActivityLogs(false);
  }
  activityPollTimer = setTimeout(pollActivity, 1800);
}

function setActivityFilter(filter) {
  activityFilter = filter || "all";
  activityFilters?.querySelectorAll("[data-activity-filter]").forEach((button) => {
    button.classList.toggle("active", button.getAttribute("data-activity-filter") === activityFilter);
  });
  renderActivityList();
  refreshVisibleTimers();
}

async function selectActivityRun(runId) {
  activitySelectedRunId = runId;
  renderActivityList();
  renderActivityDetail();
  await loadActivityLogs(true);
}

async function killActivityRun(runId) {
  const response = await fetch(`${AGENT_RUNS_ENDPOINT}/${encodeURIComponent(runId)}/kill`, { method: "POST" });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error || `Unable to cancel run (${response.status})`);
  }
  await loadActivityRuns();
  if (activitySelectedRunId === runId) {
    await loadActivityLogs(true);
    renderActivityDetail();
  }
}

function setupActivityDashboard() {
  if (!activityPage) return;

  activityFilters?.querySelectorAll("[data-activity-filter]").forEach((button) => {
    button.addEventListener("click", () => setActivityFilter(button.getAttribute("data-activity-filter") || "all"));
  });

  activityList?.addEventListener("click", (event) => {
    const killButton = event.target.closest("[data-activity-kill]");
    if (killButton) {
      event.stopPropagation();
      const runId = killButton.getAttribute("data-activity-kill") || "";
      if (runId) {
        killActivityRun(runId).catch((error) => window.alert(error?.message || "Unable to cancel run."));
      }
      return;
    }

    const rerunButton = event.target.closest("[data-activity-rerun]");
    if (rerunButton) {
      event.stopPropagation();
      setActiveTopPage("agents");
      return;
    }

    const openButton = event.target.closest("[data-activity-open]");
    const row = event.target.closest("[data-run-id]");
    const runId = openButton?.getAttribute("data-activity-open") || row?.getAttribute("data-run-id") || "";
    if (runId) {
      const shouldOpenStream = Boolean(openButton);
      selectActivityRun(runId).then(() => {
        if (shouldOpenStream) {
          openActivityStreamPanel();
        }
      }).catch(() => {});
    }
  });

  activityRefreshButton?.addEventListener("click", () => {
    loadActivityRuns().then(() => {
      if (activitySelectedRunId) return loadActivityLogs(false);
      return null;
    });
  });

  activityCancelButton?.addEventListener("click", () => {
    if (!activitySelectedRunId) return;
    killActivityRun(activitySelectedRunId).catch((error) => window.alert(error?.message || "Unable to cancel run."));
  });

  activityRerunButton?.addEventListener("click", () => {
    setActiveTopPage("agents");
  });

  activityOpenStreamButton?.addEventListener("click", () => {
    if (!activitySelectedRunId) return;
    openActivityStreamPanel();
  });

  activityCloseStreamButton?.addEventListener("click", () => {
    closeActivityStreamPanel();
  });

  activityStreamBackdrop?.addEventListener("click", () => {
    closeActivityStreamPanel();
  });

  activityWrapButton?.addEventListener("click", () => {
    activityWrapEnabled = !activityWrapEnabled;
    activityWrapButton.classList.toggle("active", activityWrapEnabled);
    activityLog?.classList.toggle("no-wrap", !activityWrapEnabled);
  });

  activityClearLogsButton?.addEventListener("click", () => {
    activityLogEntries = [];
    renderActivityLogStream();
  });

  setActivityScrollLocked(activityScrollLocked);

  activityScrollLockButton?.addEventListener("click", () => {
    const nextLockedState = !activityScrollLocked;
    setActivityScrollLocked(nextLockedState, { forceScrollToBottom: !nextLockedState });
  });

  activityCopyLogsButton?.addEventListener("click", async () => {
    const raw = activityLogEntries.map((entry) => `[${getLogTimestamp(entry)}] ${String(entry?.text || "").trimEnd()}`).join("\n");
    if (!raw) return;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(raw);
    }
  });

  activityExportLogsButton?.addEventListener("click", () => {
    if (!activitySelectedRunId || !activityLogEntries.length) return;
    const raw = activityLogEntries.map((entry) => `[${getLogTimestamp(entry)}] ${String(entry?.text || "").trimEnd()}`).join("\n");
    const blob = new Blob([raw], { type: "text/plain" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `${activitySelectedRunId}-logs.txt`;
    anchor.click();
  });

  activityNewRunButton?.addEventListener("click", () => {
    setActiveTopPage("agents");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isActivityStreamOpen) {
      closeActivityStreamPanel();
    }
  });

  if (!activityTickerTimer) {
    activityTickerTimer = setInterval(refreshVisibleTimers, 1000);
  }

  loadActivityRuns().catch(() => {});
}

async function handleRunAgentClick() {
  if (!runBuilderSelection.agent || !runBuilderSelection.config || !runAgentButton) return;

  const selectedProject = String(devProjectInput.value || "").trim();
  if (!selectedProject) {
    window.alert("Please select a project first.");
    return;
  }

  const runSummary = `Launching ${runBuilderSelection.agent.name} with ${runBuilderSelection.config.name}${runPromptInput?.value ? " and custom prompt" : ""}.`;
  runAgentButton.textContent = "Launching…";
  runAgentButton.disabled = true;

  try {
    await ensureRunBuilderDefinitionsInstalled(runBuilderSelection);

    const idsToPromote = [runBuilderSelection.agent.id, runBuilderSelection.config.id];
    recentAgentRunPacks = [
      {
        agentId: runBuilderSelection.agent.id,
        configId: runBuilderSelection.config.id,
        prompt: String(runPromptInput?.value || "")
      },
      ...recentAgentRunPacks.filter((pack) => pack.agentId !== idsToPromote[0] || pack.configId !== idsToPromote[1])
    ].slice(0, 30);
    persistRecentAgentRunPacks();
    void persistRecentAgentRunPackToDatabase(recentAgentRunPacks[0]);

    const launchPayload = {
      agentId: Number(runBuilderSelection.agent.id),
      configId: Number(runBuilderSelection.config.id),
      prompt: String(runPromptInput?.value || ""),
      projectPath: selectedProject
    };
    const response = await fetch(AGENT_RUNS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(launchPayload)
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload?.error || `Failed to launch agent (${response.status})`);
    }

    const payload = await response.json();
    const runId = String(payload?.run?.runId || "").trim();
    activeRunId = runId;
    activeRunLogSince = 0;
    clearActiveRunPolling();

    if (runAgentOutputPanel) runAgentOutputPanel.hidden = !runId;
    if (runAgentOutputText) runAgentOutputText.textContent = "";
    if (runAgentOutputMeta) {
      runAgentOutputMeta.textContent = runId
        ? `runId=${runId} pid=${payload?.run?.pid ?? "n/a"} status=${payload?.run?.status || "launched"} out=${payload?.run?.emittedStdoutBytes ?? 0}B err=${payload?.run?.emittedStderrBytes ?? 0}B`
        : "No active run";
    }

    if (runId) {
      if (runAgentStatusText) {
        runAgentStatusText.textContent = `Run ${runId}: ${payload?.run?.status || "launched"}`;
      }
      void pollActiveRun();
    }

    window.alert(`${runSummary}${runId ? `\nRun ID: ${runId}` : ""}`);
  } catch (error) {
    window.alert(error?.message || "Failed to prepare agent launch.");
  } finally {
    runAgentButton.innerHTML = '<span class="run-agent-dot" aria-hidden="true"></span> Launch Agent';
    updateRunBuilderStatus();
    renderRunBuilderPicker();
  }
}

function setupRunBuilder() {
  if (!agentsPage) return;

  openRunBuilderPicker("agent");
  updateRunPickerApplyButtonVisibility();
  renderRunBuilder();
  handleRunBuilderPromptInput();
  void loadRecentAgentRunPacksFromDatabase();

  [runAgentStage, runConfigStage].forEach((stage) => {
    stage?.addEventListener("click", () => {
      const mode = stage.getAttribute("data-run-stage");
      if (!mode) return;
      openRunBuilderPicker(mode);
    });
    stage?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      const mode = stage.getAttribute("data-run-stage");
      if (!mode) return;
      openRunBuilderPicker(mode);
    });
  });

  document.querySelectorAll("[data-run-stage-open]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const mode = button.getAttribute("data-run-stage-open");
      if (mode === "agent" || mode === "config") {
        openRunBuilderPicker(mode);
      }
    });
  });

  document.querySelectorAll("[data-run-stage-clear]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const mode = button.getAttribute("data-run-stage-clear");
      if (mode === "agent" || mode === "config") {
        clearRunBuilderStage(mode);
      }
    });
  });

  runPromptInput?.addEventListener("input", handleRunBuilderPromptInput);
  runPromptClearButton?.addEventListener("click", () => {
    if (!runPromptInput) return;
    runPromptInput.value = "";
    handleRunBuilderPromptInput();
  });

  runPickerSearch?.addEventListener("input", () => {
    runBuilderSearchQuery = String(runPickerSearch.value || "").trim();
    renderRunBuilderPicker();
  });

  runPickerTabs?.querySelectorAll("[data-run-picker-filter]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const nextFilter = tab.getAttribute("data-run-picker-filter") || "all";
      runBuilderPickerFilter = nextFilter;
      runPickerTabs.querySelectorAll("[data-run-picker-filter]").forEach((tabButton) => {
        tabButton.classList.toggle("active", tabButton === tab);
      });
      updateRunPickerApplyButtonVisibility();
      renderRunBuilderPicker();
    });
  });

  runPickerApplyButton?.addEventListener("click", applyRunBuilderPendingSelection);
  runAgentButton?.addEventListener("click", handleRunAgentClick);
}

function updatePageTabBadges() {
  if (!discoverTabBadge || !installedTabBadge || !favoritesTabBadge || !activityTabBadge) {
    return;
  }

  const hasSelectedProject = Boolean(String(devProjectInput?.value || "").trim());
  const installedCount = definitions.filter((definition) => definition.status === "saved" && hasSelectedProject).length;
  const favoritesCount = definitions.filter((definition) => isFavoriteDefinition(definition.id)).length;
  const runsForBadge = typeof activityRuns !== "undefined" && Array.isArray(activityRuns) ? activityRuns : [];
  const activityCount = runsForBadge.filter((run) => ["running", "launched"].includes(mapRunStatus(run))).length;

  const applyBadgeValue = (element, value) => {
    if (!element) return;
    if (value > 0) {
      element.textContent = String(value);
      element.classList.add("has-value");
      return;
    }
    element.textContent = "";
    element.classList.remove("has-value");
  };

  applyBadgeValue(discoverTabBadge, definitions.length);
  applyBadgeValue(installedTabBadge, installedCount);
  applyBadgeValue(favoritesTabBadge, favoritesCount);
  applyBadgeValue(activityTabBadge, activityCount);
}

function renderTopNavigation() {
  if (!topNav) {
    return;
  }

  topNav.querySelectorAll("[data-top-nav-tab]").forEach((tab) => {
    const tabPage = tab.getAttribute("data-top-nav-tab") || "discover";
    tab.classList.toggle("active", tabPage === activeTopPage);
  });

  const hubVisible = activeTopPage === "discover" || activeTopPage === "installed" || activeTopPage === "favorites";
  hubHeader.hidden = !hubVisible;
  hubMain.hidden = !hubVisible;
  if (activityPage) {
    activityPage.hidden = activeTopPage !== "activity";
  }
  if (agentsPage) {
    agentsPage.hidden = activeTopPage !== "agents";
  }

  const isDiscoveryPage = activeTopPage === "discover";
  if (recommendationsToggleButton) {
    recommendationsToggleButton.hidden = !isDiscoveryPage;
    recommendationsToggleButton.style.display = isDiscoveryPage ? "" : "none";
  }

  updatePageTabBadges();
}

function setActiveTopPage(page) {
  activeTopPage = page || "discover";
  if (activeTopPage === "discover" || activeTopPage === "installed" || activeTopPage === "favorites") {
    activeFilter = "all";
  }
  currentCardsPage = 1;
  renderTopNavigation();
  renderFilters();
  renderCards();
  renderRunBuilder();

  if (activeTopPage === "activity") {
    clearActivityPolling();
    void pollActivity();
  } else {
    clearActivityPolling();
    closeActivityStreamPanel();
  }
}

function updateFavoriteDefinitionButton() {
  if (!favoriteDefinitionButton) {
    return;
  }

  const isFavorite = isFavoriteDefinition(currentDetailDefinitionId);
  favoriteDefinitionButton.classList.toggle("is-favorite", isFavorite);
  favoriteDefinitionButton.setAttribute("aria-label", isFavorite ? "Remove from favorites" : "Add to favorites");
  favoriteDefinitionButton.title = isFavorite ? "Remove from favorites" : "Add to favorites";
}

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

function getStoredIntentRecommendations() {
  try {
    const raw = localStorage.getItem(INTENT_RECOMMENDATIONS_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    const projectPath = String(parsed?.projectPath || "").trim();
    const intent = String(parsed?.intent || "").trim();
    const suggestions = normalizeAiSuggestedEntries(parsed?.suggestions || []);
    if (!projectPath || !intent || !suggestions.length) {
      return null;
    }
    return { projectPath, intent, suggestions };
  } catch (_error) {
    return null;
  }
}

function persistIntentRecommendations(projectPath, intent, suggestions = []) {
  try {
    const normalizedProjectPath = String(projectPath || "").trim();
    const normalizedIntent = String(intent || "").trim();
    const normalizedSuggestions = normalizeAiSuggestedEntries(suggestions);
    if (!normalizedProjectPath || !normalizedIntent || !normalizedSuggestions.length) {
      localStorage.removeItem(INTENT_RECOMMENDATIONS_STORAGE_KEY);
      return;
    }
    localStorage.setItem(INTENT_RECOMMENDATIONS_STORAGE_KEY, JSON.stringify({
      projectPath: normalizedProjectPath,
      intent: normalizedIntent,
      suggestions: normalizedSuggestions
    }));
  } catch (_error) {
    // Ignore local storage access errors and keep in-memory state.
  }
}

function clearPersistedIntentRecommendations() {
  try {
    localStorage.removeItem(INTENT_RECOMMENDATIONS_STORAGE_KEY);
  } catch (_error) {
    // Ignore local storage access errors and keep in-memory state.
  }
}

function applyIntentSuggestions(projectPath, intent, suggestions = []) {
  const normalizedProjectPath = String(projectPath || "").trim();
  const normalizedIntent = String(intent || "").trim();
  const normalizedSuggestions = normalizeAiSuggestedEntries(suggestions);
  if (!normalizedProjectPath || !normalizedIntent || !normalizedSuggestions.length) {
    return false;
  }

  suggestionDefinitionIds = normalizedSuggestions.map((entry) => entry.definitionId);
  suggestionsMeta = {
    projectPath: normalizedProjectPath,
    projectType: "intent",
    corePlatform: "",
    suggestions: normalizedSuggestions
  };
  latestSuggestionIntent = normalizedIntent;
  return true;
}

async function loadSuggestionsForCurrentProject() {
  const selectedProjectPath = String(devProjectInput.value || "").trim();
  const persistedIntentSuggestions = getStoredIntentRecommendations();
  if (persistedIntentSuggestions && persistedIntentSuggestions.projectPath === selectedProjectPath) {
    if (applyIntentSuggestions(
      persistedIntentSuggestions.projectPath,
      persistedIntentSuggestions.intent,
      persistedIntentSuggestions.suggestions
    )) {
      return;
    }
  }
  await fetchDefinitionSuggestions();
}

function getStoredHideInstalledDefinitions() {
  try {
    return localStorage.getItem(HIDE_INSTALLED_DEFINITIONS_STORAGE_KEY) === "true";
  } catch (_error) {
    return false;
  }
}

function persistHideInstalledDefinitions(value) {
  try {
    localStorage.setItem(HIDE_INSTALLED_DEFINITIONS_STORAGE_KEY, String(Boolean(value)));
  } catch (_error) {
    // Ignore local storage access errors and keep in-memory state.
  }
}

function getStoredOnlyLocalDefinitions() {
  try {
    return localStorage.getItem(ONLY_LOCAL_DEFINITIONS_STORAGE_KEY) === "true";
  } catch (_error) {
    return false;
  }
}

function persistOnlyLocalDefinitions(value) {
  try {
    localStorage.setItem(ONLY_LOCAL_DEFINITIONS_STORAGE_KEY, String(Boolean(value)));
  } catch (_error) {
    // Ignore local storage access errors and keep in-memory state.
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



function extractDccDefinitionTypeFromDefinitionContent(content, filePath = "") {
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
  const nextSearchTerm = String(value || "").toLowerCase();
  if (nextSearchTerm !== searchTerm) {
    semanticSearchState = { query: "", suggestions: [], error: "" };
  }
  searchTerm = nextSearchTerm;
  searchInput.value = value || "";
  searchField.classList.toggle("has-value", searchTerm.length > 0);
  currentCardsPage = 1;
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
  if (type === "installed") {
    return "Installed";
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
  return definitionIconSvg(type, { fallback: "filter" });
}

function renderFilters() {
  const isInstalledPage = activeTopPage === "installed";
  const definitionTypes = definitions.map((def) => normalizeFilterType(def.type));
  const uniqueTypes = new Set(
    [...FILTER_TYPES, ...definitionTypes]
      .filter((type) => Boolean(type) && String(type).toLowerCase() !== "unknown")
      .map((type) => String(type).toLowerCase())
  );
  const types = ["all", ...SPECIAL_FILTERS, ...uniqueTypes]
    .filter((type, index, arr) => type !== "installed" && arr.indexOf(type) === index);
  if (!types.includes(activeFilter)) {
    activeFilter = "all";
  }
  filtersContainer.innerHTML = "";
  filterMenu.innerHTML = "";
  types.forEach((type) => {
    const label = formatFilterLabel(type);
    if (type === activeFilter && type !== "all") {
      const chip = document.createElement("button");
      chip.className = "chip active";
      const chipClearMarkup = `
        <span class="chip-clear" role="button" aria-label="Clear filter">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18"></path>
            <path d="m6 6 12 12"></path>
          </svg>
        </span>
      `;
      chip.innerHTML = `
        <span class="chip-icon">${filterIconSvg(type)}</span>
        <span class="chip-label">${label}</span>
        ${chipClearMarkup}
      `;
      chip.addEventListener("click", (event) => {
        if (isInstalledPage && type === "installed") {
          return;
        }
        if (event.target.closest(".chip-clear")) {
          activeFilter = "all";
        } else {
          activeFilter = type;
        }
        currentCardsPage = 1;
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
      currentCardsPage = 1;
      renderFilters();
      renderCards();
      closeFilterMenu();
    });
    filterMenu.appendChild(menuItem);
  });

  if (selectedTagFilters.size > 0 || showUntaggedDefinitions) {
    const tagsChip = document.createElement("button");
    tagsChip.className = "chip active";
    tagsChip.type = "button";
    tagsChip.innerHTML = `
      <span class="chip-icon">${filterIconSvg("tags")}</span>
      <span class="chip-label">Tags</span>
      <span class="chip-clear" role="button" aria-label="Clear Tags filter">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6 6 18"></path>
          <path d="m6 6 12 12"></path>
        </svg>
      </span>
    `;
    tagsChip.addEventListener("click", (event) => {
      if (!event.target.closest(".chip-clear")) {
        return;
      }

      selectedTagFilters.clear();
      showUntaggedDefinitions = false;
      currentCardsPage = 1;
      renderFilters();
      renderCards();
    });
    filtersContainer.appendChild(tagsChip);
  }

  if (onlyLocalDefinitions) {
    const onlyLocalChip = document.createElement("button");
    onlyLocalChip.className = "chip active";
    onlyLocalChip.type = "button";
    onlyLocalChip.innerHTML = `
      <span class="chip-label">Only Local</span>
      <span class="chip-clear" role="button" aria-label="Clear Only Local filter">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6 6 18"></path>
          <path d="m6 6 12 12"></path>
        </svg>
      </span>
    `;
    onlyLocalChip.addEventListener("click", (event) => {
      if (!event.target.closest(".chip-clear")) {
        return;
      }

      onlyLocalDefinitions = false;
      persistOnlyLocalDefinitions(false);
      updateLocalDefinitionsToggleState();
      currentCardsPage = 1;
      renderFilters();
      renderCards();
    });
    filtersContainer.appendChild(onlyLocalChip);
  }

  renderHubTagFilterSection();
}

function getSortedUniqueTags() {
  const uniqueTags = new Map();
  definitions.forEach((definition) => {
    definition.tags.forEach((tag) => {
      const normalized = normalizeTagValue(tag);
      if (!normalized || uniqueTags.has(normalized)) {
        return;
      }
      uniqueTags.set(normalized, tag);
    });
  });

  return Array.from(uniqueTags.values()).sort((tagA, tagB) => tagA.localeCompare(tagB));
}

function createTagFilterPill(label, { selected = false, emptyState = false } = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "hub-menu-tag-pill";
  button.textContent = label;
  if (selected) {
    button.classList.add("is-selected");
  }
  if (emptyState) {
    button.classList.add("is-empty");
    button.disabled = true;
  }
  return button;
}

function applyTagSearchFilter(tagPillsContainer, emptySearchState, rawQuery) {
  const query = String(rawQuery || "").trim().toLowerCase();
  const pills = Array.from(tagPillsContainer.querySelectorAll(".hub-menu-tag-pill[data-tag-filter-value]"));
  let visibleCount = 0;

  pills.forEach((pill) => {
    const value = String(pill.dataset.tagFilterValue || "");
    if (value === "__untagged__") {
      pill.hidden = false;
      return;
    }

    const label = String(pill.dataset.tagLabel || "").toLowerCase();
    const shouldShow = !query || label.includes(query);
    pill.hidden = !shouldShow;
    if (shouldShow) {
      visibleCount += 1;
    }
  });

  if (emptySearchState) {
    emptySearchState.hidden = visibleCount > 0 || !query;
  }
}

function renderHubTagFilterSection() {
  if (!hubMenu) {
    return;
  }

  const existingSection = hubMenu.querySelector("#hubTagFilterSection");
  if (existingSection) {
    existingSection.remove();
  }

  const tagSection = document.createElement("section");
  tagSection.id = "hubTagFilterSection";
  tagSection.className = "hub-menu-tag-section";

  const tagHeader = document.createElement("div");
  tagHeader.className = "hub-menu-tag-header";
  tagHeader.innerHTML = "<span>Tags</span>";

  const modeRow = document.createElement("div");
  modeRow.className = "hub-tag-filter-mode-row";

  const modeSelector = document.createElement("fieldset");
  modeSelector.className = "hub-tag-filter-mode";
  modeSelector.setAttribute("aria-label", "Tag filter mode");

  ["or", "and"].forEach((mode) => {
    const optionLabel = document.createElement("label");
    optionLabel.className = "hub-tag-filter-mode-option";
    optionLabel.innerHTML = `
      <input type="radio" name="tagFilterMode" value="${mode}" ${tagFilterMode === mode ? "checked" : ""} />
      <span>${mode === "or" ? "Or" : "And"}</span>
    `;
    modeSelector.appendChild(optionLabel);
  });

  modeSelector.addEventListener("change", (event) => {
    const selectedMode = String(event.target?.value || "").toLowerCase();
    if (!["or", "and"].includes(selectedMode)) {
      return;
    }
    tagFilterMode = selectedMode;
    currentCardsPage = 1;
    renderCards();
  });

  const clearTagsFilterButton = document.createElement("button");
  clearTagsFilterButton.type = "button";
  clearTagsFilterButton.className = "hub-tag-filter-clear-btn";
  clearTagsFilterButton.textContent = "×";
  clearTagsFilterButton.setAttribute("title", "Clear Tags filter");
  clearTagsFilterButton.setAttribute("aria-label", "Clear Tags filter");
  clearTagsFilterButton.addEventListener("click", (event) => {
    event.stopPropagation();

    selectedTagFilters.clear();
    showUntaggedDefinitions = false;
    currentCardsPage = 1;
    tagPillsContainer.querySelectorAll(".hub-menu-tag-pill.is-selected").forEach((pill) => {
      pill.classList.remove("is-selected");
    });
    renderFilters();
    renderCards();
  });

  modeRow.appendChild(modeSelector);
  modeRow.appendChild(clearTagsFilterButton);

  const tagSearchInput = document.createElement("input");
  tagSearchInput.type = "text";
  tagSearchInput.className = "hub-menu-tag-search";
  tagSearchInput.placeholder = "Search tags";
  tagSearchInput.value = tagFilterSearchTerm;
  tagSearchInput.setAttribute("aria-label", "Search tags");

  const tagPillsContainer = document.createElement("div");
  tagPillsContainer.className = "hub-menu-tag-pills";
  const uniqueTags = getSortedUniqueTags();

  const emptySearchState = document.createElement("p");
  emptySearchState.className = "hub-menu-tag-empty-state";
  emptySearchState.textContent = "No matching tags";
  emptySearchState.hidden = true;

  const untaggedPill = createTagFilterPill("Untagged", { selected: showUntaggedDefinitions });
  untaggedPill.dataset.tagFilterValue = "__untagged__";
  tagPillsContainer.appendChild(untaggedPill);

  if (uniqueTags.length === 0) {
    tagPillsContainer.appendChild(createTagFilterPill("No tags available", { emptyState: true }));
  } else {
    uniqueTags.forEach((tag) => {
      const normalizedTag = normalizeTagValue(tag);
      const pill = createTagFilterPill(tag, { selected: selectedTagFilters.has(normalizedTag) });
      pill.dataset.tagFilterValue = normalizedTag;
      pill.dataset.tagLabel = tag;
      tagPillsContainer.appendChild(pill);
    });
  }

  tagSearchInput.addEventListener("input", (event) => {
    tagFilterSearchTerm = String(event.target?.value || "");
    applyTagSearchFilter(tagPillsContainer, emptySearchState, tagFilterSearchTerm);
  });

  tagPillsContainer.addEventListener("click", (event) => {
    event.stopPropagation();

    const target = event.target.closest(".hub-menu-tag-pill");
    if (!target || target.disabled) {
      return;
    }

    const value = String(target.dataset.tagFilterValue || "").trim();
    if (!value) {
      return;
    }

    if (value === "__untagged__") {
      showUntaggedDefinitions = !showUntaggedDefinitions;
      target.classList.toggle("is-selected", showUntaggedDefinitions);
    } else if (selectedTagFilters.has(value)) {
      selectedTagFilters.delete(value);
      target.classList.remove("is-selected");
    } else {
      selectedTagFilters.add(value);
      target.classList.add("is-selected");
    }

    currentCardsPage = 1;
    renderFilters();
    renderCards();
  });

  applyTagSearchFilter(tagPillsContainer, emptySearchState, tagFilterSearchTerm);

  tagSection.appendChild(tagHeader);
  tagSection.appendChild(modeRow);
  tagSection.appendChild(tagSearchInput);
  tagSection.appendChild(tagPillsContainer);
  tagSection.appendChild(emptySearchState);

  if (userGuideSeparator?.parentNode === hubMenu) {
    hubMenu.insertBefore(tagSection, userGuideSeparator);
  } else {
    hubMenu.appendChild(tagSection);
  }
}

function matchesSelectedTagFilters(definition) {
  const selectedTags = Array.from(selectedTagFilters);
  const definitionTags = Array.isArray(definition.tagsNormalized) ? definition.tagsNormalized : [];
  const hasNoTags = definitionTags.length === 0;

  if (selectedTags.length === 0) {
    return showUntaggedDefinitions ? hasNoTags : true;
  }

  if (showUntaggedDefinitions && tagFilterMode === "and") {
    return false;
  }

  const matchesTags = tagFilterMode === "and"
    ? selectedTags.every((tag) => definitionTags.includes(tag))
    : selectedTags.some((tag) => definitionTags.includes(tag));

  if (showUntaggedDefinitions) {
    return matchesTags || hasNoTags;
  }

  return matchesTags;
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
    if (definition.status === "local-only") {
      publishDefinition(definition.id)
        .then(fetchDefinitions)
        .catch((error) => {
          window.alert(error.message || "Action failed.");
        });
      return;
    }
    if (!devProjectInput.value.trim()) {
      window.alert("Please select a project first.");
      return;
    }
    if (getSupportedDestinationOptions(definition).length === 0) {
      window.alert("This definition type cannot be installed/exported to available destinations.");
      return;
    }
    openInstallDestinationMenu(saveAction, definition);
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
  if (isFavoriteDefinition(definition.id)) {
    card.classList.add("card-favorite");
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
  const isDiscoveryPage = activeTopPage === "discover";
  recommendationsSection.hidden = !isDiscoveryPage;
  updateRecommendationsToggleLabel();
  recommendationsSection.classList.toggle("is-collapsed", !recommendationsVisible || !isDiscoveryPage);
  recommendationsContent.classList.toggle("is-collapsed", !recommendationsVisible || !isDiscoveryPage);
  const selectedProjectPath = String(devProjectInput.value || "").trim();
  const projectType = String(suggestionsMeta.projectType || "").trim().toLowerCase();
  const corePlatform = String(suggestionsMeta.corePlatform || "").trim().toLowerCase();
  const platformMeta = corePlatform ? ` · Platform: ${corePlatform}` : "";
  recommendationsState.textContent = "";
  recommendationsState.hidden = true;
  recommendationsCards.innerHTML = "";
  recommendationsInstallAllButton.hidden = true;
  recommendationsInstallAllButton.disabled = true;

  if (!recommendationsVisible || !isDiscoveryPage) {
    return;
  }

  if (!selectedProjectPath && projectType !== "intent") {
    recommendationsState.hidden = false;
    recommendationsState.textContent = "Select a dev project to see recommended definitions.";
    recommendationsMeta.textContent = "";
    return;
  }

  if ((!projectType || projectType === "unknown") && projectType !== "intent") {
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
    if (projectType === "intent") {
      recommendationsMeta.textContent = latestSuggestionIntent
        ? `Intent: ${latestSuggestionIntent}`
        : "AI ranked suggestions for your described task.";
    } else {
      recommendationsMeta.textContent = `Project: ${selectedProjectPath} · Type: ${projectType}${platformMeta}`;
    }
    return;
  }

  if (projectType === "intent") {
    recommendationsMeta.textContent = latestSuggestionIntent
      ? `Intent: ${latestSuggestionIntent}`
      : "AI ranked suggestions for your described task.";
  } else {
    recommendationsMeta.textContent = `Project: ${selectedProjectPath} · Type: ${projectType}${platformMeta}`;
  }

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
    return;
  }

  const hasSelectedProject = Boolean(selectedProjectPath);
  recommendationsInstallAllButton.hidden = false;
  recommendationsInstallAllButton.disabled = !hasSelectedProject;
}

function createSemanticSearchPrompt() {
  const wrapper = document.createElement("div");
  wrapper.className = "semantic-search-empty-state";
  const statusText = semanticSearchState.error
    ? `<p>${escapeHtml(semanticSearchState.error)}</p>`
    : "";
  wrapper.innerHTML = `
    <p class="semantic-search-empty-state-title">No results found for this search.</p>
    <p>Would you like the AI to search ?</p>
    ${statusText}
    <button class="btn primary semantic-search-empty-state-button" type="button">Search with AI</button>
  `;

  const button = wrapper.querySelector("button");
  button?.addEventListener("click", async () => {
    const query = String(searchInput.value || "").trim();
    if (!query) {
      return;
    }
    semanticSearchState.error = "";
    try {
      const suggestions = await requestIntentSuggestions(query);
      semanticSearchState = {
        query,
        suggestions,
        error: suggestions.length ? "" : "AI search did not find similar definitions."
      };
    } catch (error) {
      semanticSearchState = {
        query,
        suggestions: [],
        error: String(error?.message || "Unable to search with AI.")
      };
    }
    renderCards();
  });

  return wrapper;
}

function renderCards() {
  const isInstalledPage = activeTopPage === "installed";
  const queryTags = parseTagSearchQuery(searchTerm);
  const tagOnlyMode = isTagOnlyQuery(queryTags);
  const hasSelectedProject = Boolean(String(devProjectInput.value || "").trim());
  const hideInstalledDefinitions = getStoredHideInstalledDefinitions();

  const filtered = definitions.filter((def) => {
    const isInstalledInCurrentProject = def.status === "saved" && hasSelectedProject;
    const isLocalUntrackedDefinition = String(def.source || "").toLowerCase() === "untracked";
    if (onlyLocalDefinitions && !isLocalUntrackedDefinition) {
      return false;
    }
    if (!isInstalledPage && hideInstalledDefinitions && isInstalledInCurrentProject) {
      return false;
    }
    const matchesPage = activeTopPage !== "favorites" || isFavoriteDefinition(def.id);
    const matchesFilter = isInstalledPage
      ? isInstalledInCurrentProject && (activeFilter === "all" || def.type === activeFilter)
      : activeFilter === "all"
      || def.type === activeFilter;
    const text = `${def.name} ${def.description}`.toLowerCase();
    const matchesTagSearch = queryTags.every((tag) => def.tagsNormalized.includes(tag));
    const matchesSearch = tagOnlyMode ? matchesTagSearch : text.includes(searchTerm);
    const matchesTagFilters = matchesSelectedTagFilters(def);
    return matchesPage && matchesFilter && matchesSearch && matchesTagFilters;
  });

  let semanticRankedResults = [];
  const hasSemanticResults = searchTerm.length > 0
    && semanticSearchState.query.toLowerCase() === searchTerm
    && semanticSearchState.suggestions.length > 0;

  if (filtered.length === 0 && hasSemanticResults) {
    semanticRankedResults = semanticSearchState.suggestions
      .map((entry) => definitions.find((def) => Number(def.id) === Number(entry.definitionId)))
      .filter(Boolean)
      .filter((def) => {
        const isInstalledInCurrentProject = def.status === "saved" && hasSelectedProject;
        const isLocalUntrackedDefinition = String(def.source || "").toLowerCase() === "untracked";
        if (onlyLocalDefinitions && !isLocalUntrackedDefinition) {
          return false;
        }
        if (!isInstalledPage && hideInstalledDefinitions && isInstalledInCurrentProject) {
          return false;
        }
        const matchesPage = activeTopPage !== "favorites" || isFavoriteDefinition(def.id);
        const matchesFilter = isInstalledPage
          ? isInstalledInCurrentProject && (activeFilter === "all" || def.type === activeFilter)
          : activeFilter === "all"
          || def.type === activeFilter;
        return matchesPage && matchesFilter && matchesSelectedTagFilters(def);
      });
  }

  const visibleDefinitions = semanticRankedResults.length ? semanticRankedResults : filtered;
  const totalPages = Math.max(Math.ceil(visibleDefinitions.length / CARDS_PER_PAGE), 1);
  if (definitionsCountLabel) {
    const labelPrefix = semanticRankedResults.length ? "Showing semantic matches" : (activeTopPage === "favorites" ? "Showing favorites" : "Showing");
    definitionsCountLabel.textContent = `${labelPrefix}: ${visibleDefinitions.length}/${definitions.length} Definitions.`;
  }
  currentCardsPage = Math.min(Math.max(currentCardsPage, 1), totalPages);
  const pageStartIndex = (currentCardsPage - 1) * CARDS_PER_PAGE;
  const pageDefinitions = visibleDefinitions.slice(pageStartIndex, pageStartIndex + CARDS_PER_PAGE);

  cardsContainer.innerHTML = "";
  if (pageDefinitions.length === 0 && searchTerm.length > 0) {
    cardsContainer.appendChild(createSemanticSearchPrompt());
  } else {
    pageDefinitions.forEach((def) => {
      cardsContainer.appendChild(createDefinitionCard(def));
    });
  }

  renderPagination({ totalItems: visibleDefinitions.length, totalPages });

  renderRecommendationSection();
  updatePageTabBadges();
}


function createPaginationButton({ label, page, disabled = false, active = false, ariaLabel = "" }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "pagination-btn";
  button.textContent = label;
  if (active) {
    button.classList.add("is-active");
    button.setAttribute("aria-current", "page");
  }
  if (ariaLabel) {
    button.setAttribute("aria-label", ariaLabel);
  }
  button.disabled = disabled;
  button.addEventListener("click", () => {
    if (disabled || active) {
      return;
    }
    currentCardsPage = page;
    renderCards();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  return button;
}

function createPaginationEllipsis() {
  const ellipsis = document.createElement("span");
  ellipsis.className = "pagination-ellipsis";
  ellipsis.setAttribute("aria-hidden", "true");
  ellipsis.textContent = "...";
  return ellipsis;
}

function getVisiblePaginationPages(totalPages, currentPage) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "ellipsis", currentPage, "ellipsis", totalPages];
}

function renderPagination({ totalItems, totalPages }) {
  if (!paginationContainer) {
    return;
  }

  paginationContainer.innerHTML = "";

  if (totalItems <= CARDS_PER_PAGE) {
    paginationContainer.hidden = true;
    return;
  }

  paginationContainer.hidden = false;

  const list = document.createElement("ul");
  list.className = "pagination-list";

  const previousItem = document.createElement("li");
  previousItem.appendChild(createPaginationButton({
    label: "Previous",
    page: currentCardsPage - 1,
    disabled: currentCardsPage === 1,
    ariaLabel: "Go to previous page"
  }));
  list.appendChild(previousItem);

  getVisiblePaginationPages(totalPages, currentCardsPage).forEach((entry) => {
    const item = document.createElement("li");
    if (entry === "ellipsis") {
      item.appendChild(createPaginationEllipsis());
      list.appendChild(item);
      return;
    }

    item.appendChild(createPaginationButton({
      label: String(entry),
      page: entry,
      active: entry === currentCardsPage,
      ariaLabel: `Go to page ${entry}`
    }));
    list.appendChild(item);
  });

  const nextItem = document.createElement("li");
  nextItem.appendChild(createPaginationButton({
    label: "Next",
    page: currentCardsPage + 1,
    disabled: currentCardsPage === totalPages,
    ariaLabel: "Go to next page"
  }));
  list.appendChild(nextItem);

  paginationContainer.appendChild(list);
}

function setupRecommendationsSection() {
  recommendationsSection.className = "recommendations-section";
  recommendationsTitle.className = "recommendations-title";
  recommendationsActions.className = "recommendations-actions";
  recommendationsAiButton.className = "btn recommendations-ai-button";
  recommendationsAiButton.type = "button";
  recommendationsAiButton.setAttribute("aria-label", "Semantic intent search");
  recommendationsAiButton.innerHTML = `<span aria-hidden="true">✨</span><span>AI</span>`;
  recommendationsMeta.className = "recommendations-meta";
  recommendationsState.className = "recommendations-state";
  recommendationsCardsContainer.className = "recommendations-cards-container";
  recommendationsCards.className = "grid recommendations-grid";
  recommendationsInstallAllButton.className = "recommendations-install-all-button";
  recommendationsInstallAllButton.type = "button";
  recommendationsInstallAllButton.setAttribute("aria-label", "Add all recommended definitions to current selected project");
  recommendationsInstallAllButton.title = "Add all recommended definitions to current selected project";
  recommendationsInstallAllButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 5v14"></path>
      <path d="M5 12h14"></path>
    </svg>
  `;
  recommendationsContent.id = "recommendations-content";
  recommendationsToggleButton.setAttribute("aria-controls", recommendationsContent.id);
  recommendationsDivider.className = "recommendations-divider";
  recommendationsContent.className = "recommendations-content";

  recommendationsTitle.textContent = "Recommended for current project";
  recommendationsAiButton.addEventListener("click", () => {
    openIntentSuggestionModal();
  });
  recommendationsInstallAllButton.addEventListener("click", (event) => {
    const selectedProjectPath = String(devProjectInput.value || "").trim();
    if (!selectedProjectPath) {
      window.alert("Please select a project first.");
      return;
    }

    const recommendationDefinition = {
      type: "prompt",
      installedDestinations: []
    };
    openInstallDestinationMenu(event.currentTarget, recommendationDefinition, {
      onDestinationSelected: (destination) => installAllRecommendedDefinitions(destination)
    });
  });
  const recommendationsTitlediv = document.createElement("div");
  recommendationsTitlediv.className = "recommendations-title-div";
  recommendationsTitlediv.appendChild(recommendationsTitle);
  recommendationsTitlediv.appendChild(recommendationsMeta);
  recommendationsActions.append(recommendationsAiButton, recommendationsTitlediv);
  updateRecommendationsToggleLabel();
  recommendationsToggleButton.addEventListener("click", () => {
    recommendationsVisible = !recommendationsVisible;
    persistRecommendationsVisibility(recommendationsVisible);
    renderRecommendationSection();
    updatePageTabBadges();
  });

  recommendationsCardsContainer.append(recommendationsCards, recommendationsInstallAllButton);
  recommendationsContent.append(recommendationsActions, recommendationsState, recommendationsCardsContainer, recommendationsDivider);
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
    latestSuggestionIntent = "";
  } catch (_error) {
    suggestionDefinitionIds = [];
    suggestionsMeta = { projectPath: "", projectType: "", corePlatform: "", suggestions: [] };
    latestSuggestionIntent = "";
  }
}

function parseAiSuggestionPayload(rawContent) {
  const text = String(rawContent || "").trim();
  if (!text) return null;

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1] ? fencedMatch[1].trim() : text;

  try {
    return JSON.parse(candidate);
  } catch (_error) {
    const objectMatch = candidate.match(/\{[\s\S]*\}/);
    if (!objectMatch) return null;
    try {
      return JSON.parse(objectMatch[0]);
    } catch (_nestedError) {
      return null;
    }
  }
}

function normalizeAiSuggestedEntries(items = []) {
  const seen = new Set();
  const normalized = [];

  items.forEach((item, index) => {
    const definitionId = Number(item?.definitionId);
    if (!Number.isFinite(definitionId) || seen.has(definitionId)) {
      return;
    }

    const score = Number(item?.score);
    normalized.push({
      definitionId,
      score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : Math.max(100 - (index * 6), 40),
      reasons: Array.isArray(item?.reasons)
        ? item.reasons.map((reason) => String(reason || "").trim()).filter(Boolean).slice(0, 4)
        : []
    });
    seen.add(definitionId);
  });

  return normalized;
}

function buildIntentSearchCatalogSnapshot(sourceDefinitions = []) {
  return sourceDefinitions.map((definition) => {
    const tags = Array.isArray(definition.tags) ? definition.tags.slice(0, 8) : [];
    const description = String(definition.description || "").trim();
    return {
      id: Number(definition.id),
      name: String(definition.name || "").slice(0, 120),
      description: description.slice(0, 260),
      type: definition.type,
      tags
    };
  });
}

function truncateForIntentSearchLog(value, maxLength = 300) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength)}...`;
}

async function requestIntentSuggestions(intent = "") {
  const normalizedIntent = String(intent || "").trim();
  if (!normalizedIntent) {
    throw new Error("Please describe your task before requesting AI suggestions.");
  }

  if (!Array.isArray(definitions) || definitions.length === 0) {
    throw new Error("Definitions are still loading. Please try again in a moment.");
  }

  const catalog = buildIntentSearchCatalogSnapshot(definitions);
  try {
    const response = await fetchWithErrorHandling("/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-DCC-Feature": "definition-intent-search"
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: "You rank software definitions by user intent. Return JSON only with shape {\"suggestions\":[{\"definitionId\":number,\"score\":number,\"reasons\":[string]}]}. Return all relevant suggestions ordered best-first."
          },
          {
            role: "user",
            content: JSON.stringify({ intent: normalizedIntent, definitions: catalog })
          }
        ],
        temperature: 0.2,
        max_tokens: 2048,
        max_thinking_tokens: 500
      })
    }, "Unable to generate AI suggestions.", {
      title: "Generating semantic suggestions...",
      description: "AI is ranking definitions based on your intent."
    });

    const completionText = String(response?.choices?.[0]?.message?.content || "");
    if (!completionText.trim()) {
      console.info("[INTENT_SEARCH] ai_result=empty text_preview=\"\"");
      return [];
    }

    console.info(`[INTENT_SEARCH] ai_result=response text_preview=${JSON.stringify(truncateForIntentSearchLog(completionText, 300))}`);
    const payload = parseAiSuggestionPayload(completionText);
    const suggestions = normalizeAiSuggestedEntries(payload?.suggestions);

    if (!suggestions.length) {
      console.info("[INTENT_SEARCH] ai_result=invalid_json_or_no_suggestions fallback=project-suggestions");
      return [];
    }

    return suggestions;
  } catch (error) {
    console.info(`[INTENT_SEARCH] ai_result=error error_preview=${JSON.stringify(truncateForIntentSearchLog(error?.message || error, 300))}`);
    throw error;
  }
}

async function suggestDefinitionsByIntent(intent = "") {
  const normalizedIntent = String(intent || "").trim();
  try {
    const suggestions = await requestIntentSuggestions(normalizedIntent);
    if (!suggestions.length) {
      await fetchDefinitionSuggestions();
      renderRecommendationSection();
      updatePageTabBadges();
      return;
    }

    const selectedProjectPath = String(devProjectInput.value || "").trim();
    applyIntentSuggestions(selectedProjectPath, normalizedIntent, suggestions);
    persistIntentRecommendations(selectedProjectPath, normalizedIntent, suggestions);
    renderRecommendationSection();
    updatePageTabBadges();
  } catch (_error) {
    await fetchDefinitionSuggestions();
    renderRecommendationSection();
    updatePageTabBadges();
  }
}


function openIntentSuggestionModal() {
  const overlay = document.createElement("div");
  overlay.className = "duplicate-definition-overlay";
  overlay.innerHTML = `
    <div class="duplicate-definition-modal" role="dialog" aria-modal="true" aria-labelledby="intentSuggestionTitle">
      <h3 id="intentSuggestionTitle">AI Suggest Definitions</h3>
      <label class="duplicate-definition-field">Tell me about your task, and i will suggests the definitions to use
        <textarea data-role="intent-task" rows="8" placeholder="Example: I need to migrate native Java API to Spring microservices">${escapeHtml(latestSuggestionIntent)}</textarea>
      </label>
      <div class="duplicate-definition-actions">
        <button class="btn" type="button" data-role="intent-cancel">Cancel</button>
        <button class="btn primary" type="button" data-role="intent-submit">Suggest</button>
      </div>
    </div>
  `;

  const intentInput = overlay.querySelector('[data-role="intent-task"]');
  const cancelButton = overlay.querySelector('[data-role="intent-cancel"]');
  const submitButton = overlay.querySelector('[data-role="intent-submit"]');

  const closeModal = () => {
    overlay.remove();
  };

  cancelButton?.addEventListener("click", closeModal);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeModal();
    }
  });

  submitButton?.addEventListener("click", async () => {
    const intent = String(intentInput?.value || "").trim();
    if (!intent) {
      window.alert("Please describe your task before requesting suggestions.");
      intentInput?.focus();
      return;
    }

    closeModal();
    try {
      await suggestDefinitionsByIntent(intent);
    } catch (error) {
      window.alert(String(error?.message || error || "Unable to generate AI suggestions."));
    }
  });

  document.body.appendChild(overlay);
  intentInput?.focus();
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

  favoriteDefinitionIds = new Set(
    Array.from(favoriteDefinitionIds).filter((definitionId) => definitions.some((definition) => Number(definition.id) === definitionId))
  );
  persistFavoriteDefinitionIds();

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
  closeInstallDestinationMenu();
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
  currentDetailInstalledDestinations = Array.isArray(def.installedDestinations)
    ? def.installedDestinations.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean)
    : [];
  currentDefinitionVersion = String(def.version || "");
  currentDefinitionVersions = [];
  activeHistoricalVersion = "";
  updateFavoriteDefinitionButton();
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
  const dccDefinitionType = extractDccDefinitionTypeFromDefinitionContent(definitionContent, def.filePath);
  currentDetailDefinitionDccUri = String(dccUri || "").trim();
  const detailMetaLines = [];
  if (dccUri) detailMetaLines.push(`DCC URI: ${dccUri}`);
  if (dccDefinitionType) detailMetaLines.push(`DCC Definition Type: ${dccDefinitionType}`);
  if (detailMetaLines.length > 0) {
    detailDccUri.hidden = false;
    detailDccUri.textContent = detailMetaLines.join(" • ");
  } else {
    detailDccUri.hidden = true;
    detailDccUri.textContent = "";
  }

  const tags = parseDefinitionTags(def.tags);
  currentDetailDefinitionTags = [...tags];
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

function normalizeDestinationCompatibilityType(type) {
  const normalizedType = normalizeFilterType(type);
  if (normalizedType === "mcp servers") return "mcpservers";
  return normalizedType;
}

function getSupportedDestinationOptions(definition = {}) {
  const normalizedType = normalizeDestinationCompatibilityType(definition?.type);
  if (!normalizedType || normalizedType === "unknown") return [];
  return INSTALL_DESTINATION_OPTIONS.filter((option) => DESTINATION_COMPATIBILITY[option.key]?.has(normalizedType));
}

function getDestinationLogoPath(destinationKey) {
  const normalizedKey = String(destinationKey || "").trim().toLowerCase();
  const currentTheme = String(document.documentElement.getAttribute("data-theme") || "dark").trim().toLowerCase();
  const logoTone = currentTheme === "light" ? "black" : "white";
  if (!["continue", "copilot", "gemini"].includes(normalizedKey)) return "";
  return `/img/${normalizedKey}_small_${logoTone}_logo.png`;
}

function getDestinationLabel(destination) {
  const normalizedDestination = String(destination || "continue").trim().toLowerCase();
  if (normalizedDestination === "copilot") return "GitHub Copilot";
  if (normalizedDestination === "gemini") return "Gemini CLI";
  return "Continue";
}

function getInstalledDestinationSet(definition = {}) {
  const installed = Array.isArray(definition?.installedDestinations) ? definition.installedDestinations : [];
  return new Set(installed.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean));
}

function closeInstallDestinationMenu() {
  if (!activeInstallDestinationMenu) return;
  activeInstallDestinationMenu.cleanup?.();
  activeInstallDestinationMenu = null;
}

function formatSkippedReason(skippedItem) {
  const reason = String(skippedItem?.reason || "not_exported").trim().toLowerCase();
  const message = String(skippedItem?.message || "").trim();
  const reasonLabels = {
    unknown_destination: "unknown destination",
    unsupported_type_for_destination: "unsupported definition type",
    conversion_failed: "conversion failed",
    no_write_plan: "no output generated",
    unsupported_destination: "unsupported destination",
    unknown_operation: "unsupported write operation"
  };

  const label = reasonLabels[reason] || reason.replace(/_/g, " ");
  return message ? `${label} (${message})` : label;
}

function buildInstallExportSummary(result, destination) {
  const normalizedDestination = String(destination || "continue").trim().toLowerCase();
  const destinationLabel = normalizedDestination === "continue"
    ? "current project"
    : normalizedDestination === "copilot"
      ? "GitHub Copilot"
      : normalizedDestination === "gemini"
        ? "Gemini CLI"
        : normalizedDestination;

  const writtenFiles = Array.isArray(result?.writtenFiles) ? result.writtenFiles : [];
  const skipped = Array.isArray(result?.skipped) ? result.skipped : [];
  const exportedCount = Number.isFinite(Number(result?.exportedCount))
    ? Number(result.exportedCount)
    : (result?.exported ? 1 : 0);

  const lines = [
    normalizedDestination === "continue"
      ? "Definition installed in current project."
      : `Definition exported to ${destinationLabel}.`,
    `Exported: ${exportedCount}`,
    `Files written: ${writtenFiles.length}`,
    `Skipped definitions: ${skipped.length}`
  ];

  if (skipped.length > 0) {
    lines.push("Skipped details:");
    skipped.forEach((entry, index) => {
      const label = entry?.name || entry?.key || entry?.definitionKey || `Definition ${index + 1}`;
      lines.push(`- ${label}: ${formatSkippedReason(entry)}`);
    });
  }

  return lines.join("\n");
}


async function toggleDefinitionDestinationInstall(definition, destination) {
  const definitionId = Number(definition?.id || 0);
  if (!Number.isFinite(definitionId) || definitionId <= 0) {
    return;
  }
  if (!devProjectInput.value.trim()) {
    window.alert("Please select a project first.");
    return;
  }

  const installedSet = getInstalledDestinationSet(definition);
  const isInstalled = installedSet.has(destination);
  const destinationLabel = getDestinationLabel(destination);

  const result = isInstalled
    ? await removeDefinition(definitionId, destination)
    : await saveDefinition(definitionId, destination);

  await fetchDefinitions();

  if (currentDetailDefinitionId === definitionId) {
    await showDetails(definitionId);
  } else {
    renderCards();
  }

  if (isInstalled) {
    window.alert(result?.message || `Definition removed from ${destinationLabel}.`);
  } else {
    window.alert(buildInstallExportSummary(result, destination));
  }
}


async function installAllRecommendedDefinitions(destination) {
  const selectedProjectPath = String(devProjectInput.value || "").trim();
  if (!selectedProjectPath) {
    window.alert("Please select a project first.");
    return;
  }

  const normalizedDestination = String(destination || "").trim().toLowerCase();
  if (!normalizedDestination) {
    return;
  }

  const suggestionIdSet = new Set(suggestionDefinitionIds);
  const suggestionDefinitions = (Array.isArray(suggestionsMeta.suggestions) ? suggestionsMeta.suggestions : [])
    .filter((entry) => suggestionIdSet.has(Number(entry.definitionId)))
    .map((entry) => definitions.find((item) => Number(item.id) === Number(entry.definitionId)))
    .filter(Boolean);

  const installableDefinitions = suggestionDefinitions.filter((definition) => {
    if (definition.status === "local-only") {
      return false;
    }
    const supportsDestination = getSupportedDestinationOptions(definition)
      .some((option) => option.key === normalizedDestination);
    if (!supportsDestination) {
      return false;
    }
    return !getInstalledDestinationSet(definition).has(normalizedDestination);
  });

  if (installableDefinitions.length === 0) {
    window.alert("All recommended definitions are already installed for this destination.");
    return;
  }

  const destinationLabel = getDestinationLabel(normalizedDestination);
  const summary = await runWithLoading(async () => {
    const failedDefinitions = [];
    let installedCount = 0;

    for (const definition of installableDefinitions) {
      try {
        await saveDefinition(definition.id, normalizedDestination, { showLoading: false });
        installedCount += 1;
      } catch (error) {
        failedDefinitions.push({
          name: definition.name || `Definition ${definition.id}`,
          message: error.message || "Unable to install definition."
        });
      }
    }

    await fetchDefinitions();
    return { installedCount, failedDefinitions };
  }, {
    title: "Installing recommended definitions...",
    description: `Installing ${installableDefinitions.length} recommended definitions to ${destinationLabel}.`
  });

  const lines = [
    `Installed ${summary.installedCount}/${installableDefinitions.length} recommended definitions to ${destinationLabel}.`
  ];
  if (summary.failedDefinitions.length > 0) {
    lines.push("Failed installs:");
    summary.failedDefinitions.forEach((entry) => {
      lines.push(`- ${entry.name}: ${entry.message}`);
    });
  }
  window.alert(lines.join("\n"));
}

function openInstallDestinationMenu(anchorEl, definition, { onDestinationSelected = null } = {}) {
  closeInstallDestinationMenu();
  if (!anchorEl) return;

  const installedSet = getInstalledDestinationSet(definition);
  const destinationOptions = getSupportedDestinationOptions(definition);
  if (destinationOptions.length === 0) {
    return;
  }
  const menu = document.createElement("div");
  menu.className = "install-destination-menu";
  menu.setAttribute("role", "menu");
  menu.innerHTML = destinationOptions
    .map((option) => {
      const isInstalled = installedSet.has(option.key);
      return `
        <button type="button" class="install-destination-menu-item" data-destination="${escapeHtml(option.key)}" role="menuitemcheckbox" aria-checked="${isInstalled ? "true" : "false"}">
          <span class="install-destination-menu-item-check">${isInstalled ? "✓" : ""}</span>
          <img class="install-destination-menu-item-logo" src="${escapeHtml(getDestinationLogoPath(option.key))}" alt="" aria-hidden="true" />
          <span>${escapeHtml(option.label)}</span>
        </button>
      `;
    })
    .join("");

  document.body.appendChild(menu);

  const positionMenu = () => {
    const rect = anchorEl.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const margin = 8;

    let left = rect.left + window.scrollX;
    const maxLeft = window.scrollX + viewportWidth - menuRect.width - margin;
    left = Math.min(Math.max(window.scrollX + margin, left), Math.max(window.scrollX + margin, maxLeft));

    const preferredTop = rect.bottom + window.scrollY + 6;
    const maxTop = window.scrollY + viewportHeight - menuRect.height - margin;
    let top = preferredTop;
    if (preferredTop > maxTop) {
      top = rect.top + window.scrollY - menuRect.height - 6;
    }
    top = Math.min(Math.max(window.scrollY + margin, top), Math.max(window.scrollY + margin, maxTop));

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  };

  positionMenu();

  const onMenuClick = async (event) => {
    const target = event.target.closest("[data-destination]");
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    const destination = String(target.getAttribute("data-destination") || "").trim().toLowerCase();
    closeInstallDestinationMenu();
    if (!destination) return;
    try {
      if (typeof onDestinationSelected === "function") {
        await onDestinationSelected(destination);
      } else {
        await toggleDefinitionDestinationInstall(definition, destination);
      }
    } catch (error) {
      window.alert(error.message || "Unable to update definition destination.");
    }
  };

  const onOutsideClick = (event) => {
    if (!menu.contains(event.target) && !anchorEl.contains(event.target)) {
      closeInstallDestinationMenu();
    }
  };

  const onEscape = (event) => {
    if (event.key === "Escape") {
      closeInstallDestinationMenu();
    }
  };

  const onViewportChange = () => {
    positionMenu();
  };

  const cleanup = () => {
    menu.removeEventListener("click", onMenuClick);
    document.removeEventListener("mousedown", onOutsideClick);
    document.removeEventListener("keydown", onEscape);
    window.removeEventListener("resize", onViewportChange);
    window.removeEventListener("scroll", onViewportChange, true);
    menu.remove();
  };

  menu.addEventListener("click", onMenuClick);
  document.addEventListener("mousedown", onOutsideClick);
  document.addEventListener("keydown", onEscape);
  window.addEventListener("resize", onViewportChange);
  window.addEventListener("scroll", onViewportChange, true);

  activeInstallDestinationMenu = { cleanup };
}

function updateInstallDefinitionButtonState() {
  if (!installDefinitionButton) {
    return;
  }

  const hasSelectedProject = Boolean(devProjectInput.value.trim());
  const isLocalOnlyDefinition = currentDetailDefinitionStatus === "local-only";
  const isSavedInCurrentProject = currentDetailDefinitionStatus === "saved";
  const hasDefinition = Number.isFinite(Number(currentDetailDefinitionId)) && currentDetailDefinitionId > 0;
  const currentDefinition = definitions.find((item) => Number(item.id) === Number(currentDetailDefinitionId));
  const hasSupportedDestinations = getSupportedDestinationOptions(currentDefinition || {}).length > 0;
  const canInstall = !isLocalOnlyDefinition && hasSupportedDestinations;

  installDefinitionButton.innerHTML = isSavedInCurrentProject
    ? `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20 6 9 17l-5-5"></path>
      </svg>
    `
    : `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 5v14"></path>
        <path d="M5 12h14"></path>
      </svg>
    `;

  installDefinitionButton.hidden = !canInstall;
  if (!canInstall) {
    installDefinitionButton.disabled = true;
    if (!isLocalOnlyDefinition && !hasSupportedDestinations) {
      installDefinitionButton.title = "No compatible destinations for this definition type";
      installDefinitionButton.setAttribute("aria-label", "No compatible destinations for this definition type");
    }
    return;
  }

  installDefinitionButton.disabled = !hasDefinition || !hasSelectedProject;

  if (!hasSelectedProject) {
    installDefinitionButton.title = "Select a project first";
    installDefinitionButton.setAttribute("aria-label", "Select a project first");
    return;
  }

  installDefinitionButton.title = "Manage install/export destinations";
  installDefinitionButton.setAttribute("aria-label", "Manage install/export destinations");
}

function showDetailPage() {
  hubHeader.hidden = true;
  hubMain.hidden = true;
  detailPage.hidden = false;
  document.body.classList.add("detail-page-open");
  window.scrollTo(0, 0);
}

function showHubPage() {
  closeInstallDestinationMenu();
  detailPage.hidden = true;
  closeVersionDropdown();
  currentDetailDefinitionId = null;
  currentDetailDefinitionSource = "";
  currentDetailDefinitionName = "";
  currentDetailDefinitionPath = "";
  currentDetailDefinitionContent = "";
  currentDetailDefinitionDccUri = "";
  currentDetailDefinitionStatus = "";
  currentDetailInstalledDestinations = [];
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
  updateFavoriteDefinitionButton();
  document.body.classList.remove("detail-page-open");
  renderTopNavigation();
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


async function applyDefinitionTags(id, tags = []) {
  const response = await fetch(`/api/definitions/${id}/tags`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tags })
  });
  if (!response.ok) {
    let message = "Unable to update definition tags.";
    try {
      const payload = await response.json();
      if (payload?.error) message = payload.error;
    } catch (_error) {
      // ignore parse errors
    }
    throw new Error(message);
  }
  return response.json();
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

async function saveDefinition(id, destination = "continue", { showLoading = true } = {}) {
  if (!devProjectInput.value.trim()) {
    window.alert("Please select a project first.");
    return null;
  }
  return fetchWithErrorHandling(`/api/definitions/${id}/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ destination })
  }, "Unable to save definition.", showLoading ? {
    title: destination === "continue" ? "Saving definition..." : "Exporting definition...",
    description: destination === "continue"
      ? "Installing definition in selected project."
      : "Installing/Exporting definition for selected destination.",
  } : null);
}

async function publishDefinition(id) {
  await fetchWithErrorHandling(`/api/definitions/${id}/publish`, { method: "POST" }, "Unable to publish definition.", {
    title: "Publishing definition...",
    description: "Uploading definition to team repository.",
  });
}

async function removeDefinition(id, destination = "continue") {
  return fetchWithErrorHandling(`/api/definitions/${id}/remove`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ destination })
  }, "Unable to remove definition.", {
    title: "Removing definition...",
    description: `Removing definition from ${getDestinationLabel(destination)}.`,
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

function openConfirmationDialog({
  title = "Confirm action",
  message = "Are you sure you want to continue?",
  confirmText = "Confirm",
  cancelText = "Cancel"
} = {}) {
  return new Promise((resolve) => {
    const existingOverlay = document.getElementById("confirmationDialogOverlay");
    existingOverlay?.remove();

    const overlay = document.createElement("div");
    overlay.id = "confirmationDialogOverlay";
    overlay.className = "editor-modal-overlay";

    const modal = document.createElement("div");
    modal.className = "editor-modal";

    const titleElement = document.createElement("h3");
    titleElement.textContent = title;

    const messageElement = document.createElement("p");
    messageElement.textContent = message;
    messageElement.style.margin = "0";

    const actions = document.createElement("div");
    actions.className = "editor-modal-actions";

    const cancelButton = document.createElement("button");
    cancelButton.className = "btn";
    cancelButton.type = "button";
    cancelButton.textContent = cancelText;

    const confirmButton = document.createElement("button");
    confirmButton.className = "btn primary";
    confirmButton.type = "button";
    confirmButton.textContent = confirmText;

    const cleanUpAndResolve = (result) => {
      document.removeEventListener("keydown", onKeydown);
      overlay.remove();
      resolve(Boolean(result));
    };

    const onKeydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cleanUpAndResolve(false);
      }
    };

    cancelButton.addEventListener("click", () => cleanUpAndResolve(false));
    confirmButton.addEventListener("click", () => cleanUpAndResolve(true));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        cleanUpAndResolve(false);
      }
    });

    actions.append(cancelButton, confirmButton);
    modal.append(titleElement, messageElement, actions);
    overlay.append(modal);

    document.addEventListener("keydown", onKeydown);
    document.body.append(overlay);
    confirmButton.focus();
  });
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
  const persistedIntentSuggestions = getStoredIntentRecommendations();
  if (persistedIntentSuggestions && persistedIntentSuggestions.projectPath !== selected) {
    clearPersistedIntentRecommendations();
  }
  if (!selected) {
    await setCurrentDevProject("");
    await loadSuggestionsForCurrentProject();
    await fetchDefinitions();
    updateInstallDefinitionButtonState();
    return;
  }
  if (devProjects.length > 0 && !devProjects.includes(selected)) {
    return;
  }
  await setCurrentDevProject(selected);
  await loadSuggestionsForCurrentProject();
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

async function generateDefinitionFromDescription() {
  let defaults = { defaultType: "prompt", defaultDescription: "", initialError: "" };

  while (true) {
    const request = await openGenerateDefinitionModal(defaults);
    if (!request) {
      return;
    }

    defaults = {
      defaultType: request.selectedType,
      defaultDescription: request.description,
      initialError: ""
    };

    try {
      const generationPrompt = await buildDefinitionGenerationPrompt({
        selectedType: request.selectedType,
        description: request.description
      });

      const response = await runWithLoading(
        async () => fetch("/v1/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-DCC-Feature": "definition-generate"
          },
          body: JSON.stringify({
            prompt: generationPrompt,
            max_tokens: 4096,
            temperature: 0.2
          })
        }),
        {
          title: "Generating definition...",
          description: "Using DCC AI gateway to generate content.",
          timeout: 120000
        }
      );

      if (!response) {
        return;
      }

      if (!response.ok) {
        const payload = await response.text();
        throw new Error(payload || `Definition generation failed with status ${response.status}.`);
      }

      const payload = await response.json();
      const generatedContent = String(payload?.choices?.[0]?.text || "").trim();
      if (!generatedContent) {
        throw new Error("DCC AI gateway returned empty content.");
      }

      window.sessionStorage.setItem(GENERATED_DEFINITION_STORAGE_KEY, JSON.stringify({
        type: request.selectedType,
        content: generatedContent,
        createdAt: Date.now()
      }));
      window.location.assign(`/editor/editor.html?mode=create&type=${encodeURIComponent(request.selectedType)}&generated=1`);
      return;
    } catch (error) {
      defaults.initialError = error?.message || "Unable to generate definition.";
    }
  }
}

async function buildDefinitionGenerationPrompt({ selectedType, description }) {
  const normalizedType = normalizeDefinitionTypeForGeneration(selectedType);
  const [helpPageContent, referenceDefinitions] = await Promise.all([
    loadDefinitionHelpPages(normalizedType),
    loadDefinitionReferencesByType(selectedType, { minItems: 3, maxItems: 5 })
  ]);

  const referenceBlock = referenceDefinitions.length > 0
    ? referenceDefinitions.map((item, index) => [
      `Reference definition ${index + 1}:`,
      `- Name: ${item.name || "Unknown"}`,
      `- DCC URI: ${item.dccUri || "Unknown"}`,
      "- Content:",
      item.content
    ].join("\n")).join("\n\n")
    : "No matching existing definitions were found.";

  return [
    "Generate one complete Continue.dev definition in YAML format.",
    `Definition type: ${normalizedType}`,
    "Output rules:",
    "- Always output YAML.",
    "- Return only the definition content.",
    "- Do not include markdown fences.",
    "- Keep fields valid for the requested schema type.",
    "- Include Continue.dev fields needed for the selected definition type.",
    "- Include DCC metadata extensions when relevant (e.g., dcc_uri, dcc_tags, version).",
    "",
    "Schema guidance from DCC Help (common + selected type):",
    helpPageContent,
    "",
    "Existing definitions of the same type (style references):",
    referenceBlock,
    "",
    "User natural language request:",
    description
  ].join("\n");
}

function normalizeDefinitionTypeForGeneration(typeValue) {
  const normalized = String(typeValue || "").trim().toLowerCase();
  return DEFINITION_TYPE_ALIASES[normalized] || "prompt";
}

async function loadDefinitionHelpPages(selectedType) {
  const normalizedType = normalizeDefinitionTypeForGeneration(selectedType);
  const typeHelpPagePath = DEFINITION_HELP_PAGE_BY_TYPE[normalizedType] || "";
  const paths = [COMMON_DEFINITION_HELP_PAGE_PATH, typeHelpPagePath].filter(Boolean);
  const uniquePaths = [...new Set(paths)];
  const pages = await Promise.all(uniquePaths.map(async (helpPagePath) => {
    try {
      const response = await fetch(helpPagePath);
      if (!response.ok) {
        return `Unable to load help page ${helpPagePath} (${response.status}).`;
      }
      const content = String(await response.text() || "").trim();
      return [
        `Help page: ${helpPagePath}`,
        content || "(Empty help page content)"
      ].join("\n");
    } catch (_error) {
      return `Unable to load help page ${helpPagePath}.`;
    }
  }));

  return pages.join("\n\n");
}

async function loadDefinitionReferencesByType(selectedType, { minItems = 3, maxItems = 5 } = {}) {
  const normalizedType = normalizeDefinitionTypeForGeneration(selectedType);
  const definitionsIndex = await ensureDefinitionsLoadedForGeneration();
  const matchingDefinitions = definitionsIndex
    .filter((definition) => normalizeDefinitionTypeForGeneration(definition?.type || "") === normalizedType)
    .sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0))
    .slice(0, Math.max(minItems, maxItems));

  const details = await Promise.all(matchingDefinitions.map(async (definition) => {
    const id = Number(definition?.id || 0);
    if (!Number.isInteger(id) || id <= 0) {
      return null;
    }
    try {
      const response = await fetch(`/api/definitions/${id}`);
      if (!response.ok) {
        return null;
      }
      const payload = await response.json();
      const content = String(payload?.content || "").trim();
      if (!content) {
        return null;
      }
      return {
        name: payload?.name || definition?.name || "",
        dccUri: extractDccUriFromDefinitionContent(content),
        content
      };
    } catch (_error) {
      return null;
    }
  }));

  return details.filter(Boolean).slice(0, maxItems);
}

async function ensureDefinitionsLoadedForGeneration() {
  if (Array.isArray(definitions) && definitions.length > 0) {
    return definitions;
  }

  try {
    const response = await fetch("/api/definitions");
    if (!response.ok) {
      return [];
    }
    const payload = await response.json();
    return Array.isArray(payload) ? payload : [];
  } catch (_error) {
    return [];
  }
}

function openGenerateDefinitionModal({ defaultType = "prompt", defaultDescription = "", initialError = "" } = {}) {
  return new Promise((resolve) => {
    closeDuplicateDefinitionModal();
    const overlay = document.createElement("div");
    overlay.className = "duplicate-definition-overlay";
    const typeOptions = GENERATABLE_DEFINITION_TYPES
      .map((type) => `<option value="${escapeHtml(type)}" ${type === defaultType ? "selected" : ""}>${escapeHtml(formatFilterLabel(type))}</option>`)
      .join("");

    overlay.innerHTML = `
      <div class="duplicate-definition-modal" role="dialog" aria-modal="true" aria-labelledby="generateDefinitionTitle">
        <h3 id="generateDefinitionTitle">Generate Definition</h3>
        <p class="duplicate-definition-subtitle">Generate a definition from a natural language request via DCC AI gateway.</p>
        <label class="duplicate-definition-field">Definition type
          <select data-role="generate-type">${typeOptions}</select>
        </label>
        <label class="duplicate-definition-field">Natural language description
          <textarea data-role="generate-description" rows="8" placeholder="Describe the definition you want to create...">${escapeHtml(defaultDescription)}</textarea>
        </label>
        <p class="error" data-role="generate-error" ${initialError ? "" : "hidden"}>${escapeHtml(initialError)}</p>
        <div class="duplicate-definition-actions">
          <button class="btn" type="button" data-role="generate-cancel">Cancel</button>
          <button class="btn primary" type="button" data-role="generate-submit">Generate</button>
        </div>
      </div>
    `;

    const typeSelect = overlay.querySelector('[data-role="generate-type"]');
    const descriptionInput = overlay.querySelector('[data-role="generate-description"]');
    const cancelButton = overlay.querySelector('[data-role="generate-cancel"]');
    const submitButton = overlay.querySelector('[data-role="generate-submit"]');
    const errorNode = overlay.querySelector('[data-role="generate-error"]');

    function closeModal(result = null) {
      overlay.remove();
      resolve(result);
    }

    function showError(message) {
      if (!errorNode) return;
      errorNode.textContent = message;
      errorNode.hidden = !message;
    }

    cancelButton?.addEventListener("click", () => closeModal(null));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        closeModal(null);
      }
    });

    submitButton?.addEventListener("click", () => {
      const selectedType = String(typeSelect?.value || "").trim();
      const description = String(descriptionInput?.value || "").trim();

      if (!selectedType || !GENERATABLE_DEFINITION_TYPES.includes(selectedType)) {
        showError("Please choose a valid definition type.");
        typeSelect?.focus();
        return;
      }
      if (!description) {
        showError("Please enter a natural language description.");
        descriptionInput?.focus();
        return;
      }

      closeModal({ selectedType, description });
    });

    document.body.appendChild(overlay);
    descriptionInput?.focus();
  });
}

function closeFilterMenu() {
  filterMenu.classList.remove("open");
  filterButton.setAttribute("aria-expanded", "false");
}

function updateLocalDefinitionsToggleState() {
  if (!localDefinitionsToggle) return;
  localDefinitionsToggle.setAttribute("aria-checked", String(onlyLocalDefinitions));
}

function updateHideInstalledToggleState() {
  if (!hideInstalledMenuToggle) return;
  hideInstalledMenuToggle.setAttribute("aria-checked", String(getStoredHideInstalledDefinitions()));
}

function closeHubMenu({ animate = true } = {}) {
  if (!hubMenu || !hubMenuToggleButton || hubMenu.hidden) return;
  hubMenuToggleButton.classList.remove("is-open");
  hubMenuToggleButton.setAttribute("aria-expanded", "false");
  hubMenuToggleButton.setAttribute("aria-label", "Open main menu");
  if (!animate) {
    hubMenu.classList.remove("is-visible", "is-hiding");
    hubMenu.hidden = true;
    return;
  }
  hubMenu.classList.remove("is-visible");
  hubMenu.classList.add("is-hiding");
  window.setTimeout(() => {
    hubMenu.classList.remove("is-hiding");
    hubMenu.hidden = true;
  }, 200);
}

function openHubMenu() {
  if (!hubMenu || !hubMenuToggleButton) return;
  renderHubTagFilterSection();
  hubMenu.hidden = false;
  hubMenu.classList.remove("is-hiding");
  hubMenu.classList.add("is-visible");
  hubMenuToggleButton.classList.add("is-open");
  hubMenuToggleButton.setAttribute("aria-expanded", "true");
  hubMenuToggleButton.setAttribute("aria-label", "Close main menu");
}

function toggleHubMenu() {
  if (!hubMenu || !hubMenuToggleButton) return;
  if (hubMenu.hidden) {
    openHubMenu();
    return;
  }
  closeHubMenu();
}

function setupEventListeners() {
  filterButton.addEventListener("click", () => {
    const isOpen = filterMenu.classList.toggle("open");
    filterButton.setAttribute("aria-expanded", String(isOpen));
  });
  
  document.addEventListener("click", (event) => {
    const eventPath = typeof event.composedPath === "function" ? event.composedPath() : [];
    const clickedInsideHubMenuWrap = eventPath.includes(hubMenu) || eventPath.some((node) => node?.classList?.contains?.("header-menu-wrap"));

    if (!event.target.closest(".filter-dropdown")) {
      closeFilterMenu();
    }
    if (hubMenu && !hubMenu.hidden && !clickedInsideHubMenuWrap) {
      closeHubMenu();
    }
    if (activeVersionDropdown && !event.target.closest(".version-dropdown") && !event.target.closest("#versionHistoryButton")) {
      closeVersionDropdown();
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key === HIDE_INSTALLED_DEFINITIONS_STORAGE_KEY) {
      updateHideInstalledToggleState();
      renderCards();
      return;
    }
    if (event.key === ONLY_LOCAL_DEFINITIONS_STORAGE_KEY) {
      onlyLocalDefinitions = getStoredOnlyLocalDefinitions();
      updateLocalDefinitionsToggleState();
      renderFilters();
      renderCards();
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

  installDefinitionButton?.addEventListener("click", () => {
    if (!Number.isFinite(Number(currentDetailDefinitionId)) || currentDetailDefinitionId <= 0) {
      return;
    }
    if (!devProjectInput.value.trim()) {
      window.alert("Please select a project first.");
      return;
    }

    const currentDefinition = definitions.find((item) => Number(item.id) === Number(currentDetailDefinitionId));
    if (!currentDefinition) {
      window.alert("Definition not found.");
      return;
    }
    if (getSupportedDestinationOptions(currentDefinition).length === 0) {
      window.alert("This definition type cannot be installed/exported to available destinations.");
      return;
    }

    openInstallDestinationMenu(installDefinitionButton, currentDefinition);
  });
  

  favoriteDefinitionButton?.addEventListener("click", () => {
    if (!Number.isFinite(Number(currentDetailDefinitionId)) || currentDetailDefinitionId <= 0) {
      return;
    }

    toggleFavoriteDefinition(currentDetailDefinitionId);
    updateFavoriteDefinitionButton();
    renderCards();
  });

  autoTagDefinitionButton?.addEventListener("click", async () => {
    if (!Number.isFinite(Number(currentDetailDefinitionId)) || currentDetailDefinitionId <= 0) {
      return;
    }

    const existingTags = Array.isArray(currentDetailDefinitionTags) ? [...currentDetailDefinitionTags] : [];
    if (existingTags.length > 0) {
      const shouldContinue = await openConfirmationDialog({
        title: "Replace existing tags?",
        message: "This definition already has tags. Auto-tagging may replace the current tag selection.",
        confirmText: "Continue",
        cancelText: "Cancel"
      });
      if (!shouldContinue) {
        return;
      }
    }

    const originalLabel = autoTagDefinitionButton.getAttribute("title") || "Auto-tag definition with AI";
    autoTagDefinitionButton.disabled = true;
    autoTagDefinitionButton.setAttribute("title", "Auto-tagging...");

    try {
      const availableTags = await loadAvailableDefinitionTags();
      const suggestedTags = await suggestTagsForDefinitionContent({
        definitionContent: currentDetailDefinitionContent,
        existingTags,
        availableTags
      });
      await applyDefinitionTags(currentDetailDefinitionId, suggestedTags);
      await fetchDefinitions();
      await showDetails(currentDetailDefinitionId);
      window.alert(`Auto-tag complete. ${suggestedTags.length} tags are now attached.`);
    } catch (error) {
      window.alert(error.message || "Unable to auto-tag definition.");
    } finally {
      autoTagDefinitionButton.disabled = false;
      autoTagDefinitionButton.setAttribute("title", originalLabel);
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

  if (generateDefinitionMenuItem) {
    generateDefinitionMenuItem.innerHTML = `<span class="menu-type-icon">✨</span><span>Generate Definition</span>`;
    generateDefinitionMenuItem.addEventListener("click", async () => {
      newDefinitionMenu.hidden = true;
      newDefinitionButton?.setAttribute("aria-expanded", "false");
      await generateDefinitionFromDescription();
    });
  }
  
  if (hubMenuToggleButton) {
    hubMenuToggleButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleHubMenu();
    });
  }

  if (topNav) {
    topNav.querySelectorAll("[data-top-nav-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        const selectedPage = button.getAttribute("data-top-nav-tab") || "discover";
        setActiveTopPage(selectedPage);
      });
    });
  }


  if (localDefinitionsToggle) {
    updateLocalDefinitionsToggleState();
    localDefinitionsToggle.addEventListener("click", () => {
      onlyLocalDefinitions = !onlyLocalDefinitions;
      persistOnlyLocalDefinitions(onlyLocalDefinitions);
      updateLocalDefinitionsToggleState();
      currentCardsPage = 1;
      renderFilters();
      renderCards();
    });
  }

  if (hideInstalledMenuToggle) {
    updateHideInstalledToggleState();
    hideInstalledMenuToggle.addEventListener("click", () => {
      const nextValue = !getStoredHideInstalledDefinitions();
      persistHideInstalledDefinitions(nextValue);
      updateHideInstalledToggleState();
      currentCardsPage = 1;
      renderCards();
    });
  }

  if (installGuideMenuItem) {
    installGuideMenuItem.addEventListener("click", () => {
      closeHubMenu({ animate: false });
      window.location.assign("/user-guide.html");
    });
  }

  if (settingsMenuItem) {
    settingsMenuItem.addEventListener("click", () => {
      closeHubMenu({ animate: false });
      window.location.assign("/settings.html");
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && hubMenu && !hubMenu.hidden) {
      closeHubMenu();
    }
  });

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
  renderTopNavigation();
  setupRecommendationsSection();
  setupEventListeners();
  setupRunBuilder();
  setupActivityDashboard();
  loadDevProjects();
  loadCurrentDevProject()
    .then(loadSuggestionsForCurrentProject)
    .then(fetchDefinitions)
    .then(handleRoute);
}
