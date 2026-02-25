import { runWithLoading } from "../services/loadingService.js";
import { createDiffService } from "../services/diffService.js";
import { loadAvailableDefinitionTags, suggestTagsForDefinitionContent } from "../services/autoTagService.js";
import { definitionIconSvg } from "../utils/definitionIcons.js";
import { createDefinitionGenerationController } from "./appController/definitionGeneration.js";
import { createHubMenuController } from "./appController/hubMenuController.js";
import { createPreferencesStorage } from "./appController/preferencesStorage.js";
import { setupEventListeners as setupAppEventListeners } from "./appController/eventListeners.js";
import {
  createDefinitionPreviewRenderer,
  formatCreatedDate,
  formatTabLabel,
  inferDefinitionFormat,
  prettifyName,
} from "./appController/definitionPreview.js";
import {
  closeDuplicateDefinitionModal,
  createDuplicateModalHelpers,
  openConfirmationDialog,
} from "./appController/definitionDialogs.js";
import { createValidationController } from "./appController/validationController.js";
import { createFavoritesStorage } from "./appController/favoritesStorage.js";
import {
  createFetchWithErrorHandling,
  escapeHtml,
  extractDccDefinitionTypeFromDefinitionContent,
  extractDccUriFromDefinitionContent,
  formatFilterLabel,
  formatTypePillLabel as formatTypePillLabelUtil,
  getCardDescription,
  getCardTitle,
  iconSvg,
  normalizeFilterType as normalizeFilterTypeUtil,
  normalizeTagValue,
  parseDefinitionTags,
  parseTagSearchQuery,
  renderDescriptionMarkdown,
  renderRepoOrigin,
  statusLabel,
  typeClassName as typeClassNameUtil,
} from "./appController/definitionUtils.js";
import {
  getStoredRecentAgentRunPacks,
  normalizeRecentAgentRunPack,
  persistRecentAgentRunPacks,
} from "./appController/recentRunPackStorage.js";
import { createRunBuilderParamsController } from "./appController/runBuilderParams.js";
import { createPaginationController } from "./appController/pagination.js";
import { createActivityUtils } from "./appController/activityUtils.js";

import {
  AGENT_RUNS_ENDPOINT,
  CARDS_PER_PAGE,
  COMMON_DEFINITION_HELP_PAGE_PATH,
  DEFINITION_HELP_PAGE_BY_TYPE,
  DEFINITION_TYPE_ALIASES,
  DESTINATION_COMPATIBILITY,
  FAVORITE_DEFINITION_IDS_STORAGE_KEY,
  FILTER_TYPE_SET,
  FILTER_TYPES,
  GENERATED_DEFINITION_STORAGE_KEY,
  GENERATABLE_DEFINITION_TYPES,
  HIDE_INSTALLED_DEFINITIONS_STORAGE_KEY,
  INSTALL_DESTINATION_OPTIONS,
  INTENT_RECOMMENDATIONS_STORAGE_KEY,
  MAX_CARD_TAG_PILLS,
  ONLY_LOCAL_DEFINITIONS_STORAGE_KEY,
  RECOMMENDATIONS_VISIBILITY_STORAGE_KEY,
  RECENT_AGENT_RUN_PACKS_ENDPOINT,
  RECENT_AGENT_RUNS_STORAGE_KEY,
  SPECIAL_FILTERS,
} from "./appController/constants.js";

import {
  formatDuration,
  formatDurationSeconds,
  formatLogLevel,
  getFullRunPath,
  getLogTimestamp,
  getRunElapsedSeconds,
  getStatusGroupLabel,
  getStatusIcon,
  isRunCancelable,
  isRunLive,
  mapRunStatus,
} from "./appController/activityRunUtils.js";

import {
  cardsContainer,
  definitionsCountLabel,
  paginationContainer,
  filtersContainer,
  searchInput,
  clearSearchButton,
  searchField,
  filterButton,
  filterMenu,
  hubHeader,
  hubMain,
  detailPage,
  closeModal,
  detailTitle,
  detailDescription,
  detailContent,
  detailStatus,
  detailTypeIcon,
  detailTypeMetaIcon,
  detailTypeText,
  detailCreatedDate,
  detailDccUri,
  detailRepoOrigin,
  detailTags,
  detailVersionMeta,
  copyDefinitionButton,
  autoTagDefinitionButton,
  editDefinitionButton,
  newDefinitionButton,
  newDefinitionMenu,
  generateDefinitionMenuItem,
  recommendationsToggleButton,
  hubMenuToggleButton,
  hubMenu,
  localDefinitionsToggle,
  hideInstalledMenuToggle,
  userGuideSeparator,
  installGuideMenuItem,
  settingsMenuItem,
  duplicateDefinitionButton,
  pushUpstreamDefinitionButton,
  versionHistoryButton,
  deleteDefinitionButton,
  installDefinitionButton,
  favoriteDefinitionButton,
  topNav,
  activityPage,
  agentsPage,
  runAgentButton,
  runAgentStage,
  runConfigStage,
  runPromptStage,
  runPromptInput,
  runPromptCharCount,
  runPromptClearButton,
  runParamsStage,
  runParamVerbose,
  runParamReadonly,
  runParamDenyRead,
  runParamDenyList,
  runParamDenySearch,
  runParamDenyFetch,
  runParamDenyDiff,
  runParamAllowWrite,
  runParamAllowEdit,
  runParamAllowMultiEdit,
  runParamAllowTerminal,
  runParamAllowOnlyEnabled,
  runParamAllowOnlyList,
  runParamAllowOnlyAdd,
  runParamDenyTerminalEnabled,
  runParamDenyTerminalList,
  runParamDenyTerminalAdd,
  runAgentStatusBar,
  runAgentStatusText,
  runAgentCheckAgent,
  runAgentCheckConfig,
  runAgentCheckReady,
  runPickerTitle,
  runPickerSubtitle,
  runPickerSearch,
  runPickerTabs,
  runPickerList,
  runPickerFooter,
  runPickerApplyButton,
  discoverTabBadge,
  installedTabBadge,
  favoritesTabBadge,
  activityTabBadge,
  activityList,
  activityFilters,
  activityDetailEmpty,
  activityDetailCard,
  activityDetailName,
  activityDetailStatus,
  activityDetailRunId,
  activityDetailAgent,
  activityDetailConfig,
  activityDetailAgentPath,
  activityDetailConfigPath,
  activityDetailPid,
  activityDetailStarted,
  activityDetailDuration,
  activityDetailExit,
  activityDetailSelectedParams,
  activityDetailCommandLine,
  activityLog,
  activityLiveDot,
  activityStreamBackdrop,
  activityStreamPanel,
  activityOpenStreamButton,
  activityCloseStreamButton,
  activityCancelButton,
  activityRerunButton,
  activityRefreshButton,
  activityWrapButton,
  activityClearLogsButton,
  activityCopyLogsButton,
  activityScrollLockButton,
  activityExportLogsButton,
  activityNewRunButton,
  activityLastUpdated,
  activityStatLaunched,
  activityStatRunning,
  activityStatFinished,
  activityStatCancelled,
  versionBanner,
  definitionTabPreview,
  definitionTabSource,
  definitionTabTest,
  definitionPreviewPanel,
  definitionSourcePanel,
  definitionTestPanel,
  definitionPreviewContent,
  diffControls,
  enableDiffMode,
  diffIgnoreWhitespace,
  diffCompareBar,
  diffVersionMode,
  versionSelectA,
  versionSelectB,
  diffContainer,
  diffStatistics,
  diffNavigation,
  diffAddedLines,
  diffRemovedLines,
  diffModifiedLines,
  prevChangeBtn,
  nextChangeBtn,
  currentChangeIndex,
  totalChanges,
  diffModeButtons,
  runValidationButton,
  copyValidationReportButton,
  validationStrictToggle,
  validationLintToggle,
  validationReferencesToggle,
  validationAutoRunToggle,
  validationSeverityFilter,
  validationResults,
  validationLastRun,
  devProjectInput,
  devProjectOptions,
  recommendationsSection,
  recommendationsTitle,
  recommendationsActions,
  recommendationsAiButton,
  recommendationsMeta,
  recommendationsState,
  recommendationsCards,
  recommendationsCardsContainer,
  recommendationsInstallAllButton,
  recommendationsDivider,
  recommendationsContent,
} from "./appController/domElements.js";

let definitions = [];
let suggestionDefinitionIds = [];
let suggestionsMeta = { projectPath: "", projectType: "", corePlatform: "", suggestions: [] };
let latestSuggestionIntent = "";
const preferencesStorage = createPreferencesStorage({
  recommendationsVisibilityStorageKey: RECOMMENDATIONS_VISIBILITY_STORAGE_KEY,
  intentRecommendationsStorageKey: INTENT_RECOMMENDATIONS_STORAGE_KEY,
  hideInstalledDefinitionsStorageKey: HIDE_INSTALLED_DEFINITIONS_STORAGE_KEY,
  onlyLocalDefinitionsStorageKey: ONLY_LOCAL_DEFINITIONS_STORAGE_KEY,
  normalizeAiSuggestedEntries,
});
const {
  getStoredRecommendationsVisibility,
  persistRecommendationsVisibility,
  getStoredIntentRecommendations,
  persistIntentRecommendations,
  clearPersistedIntentRecommendations,
  getStoredHideInstalledDefinitions,
  persistHideInstalledDefinitions,
  getStoredOnlyLocalDefinitions,
  persistOnlyLocalDefinitions,
} = preferencesStorage;
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
let activeInstallDestinationMenu = null;

let currentCardsPage = 1;
let onlyLocalDefinitions = getStoredOnlyLocalDefinitions();
let activeTopPage = "discover";
let runBuilderMode = "agent";
let runBuilderPickerFilter = "installed";
let runBuilderSearchQuery = "";
let runBuilderPendingSelection = null;
let runBuilderSelection = { agent: null, config: null };
let recentAgentRunPacks = getStoredRecentAgentRunPacks(RECENT_AGENT_RUNS_STORAGE_KEY);
let activeRunId = "";
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
const favoritesStorage = createFavoritesStorage(FAVORITE_DEFINITION_IDS_STORAGE_KEY);
const { isFavoriteDefinition, toggleFavoriteDefinition, pruneFavoriteDefinitionIds } = favoritesStorage;

const runBuilderParamsController = createRunBuilderParamsController({
  runPromptInput,
  runPromptCharCount,
  runPromptStage,
  runParamsStage,
  runParamVerbose,
  runParamReadonly,
  runParamDenyRead,
  runParamDenyList,
  runParamDenySearch,
  runParamDenyFetch,
  runParamDenyDiff,
  runParamAllowWrite,
  runParamAllowEdit,
  runParamAllowMultiEdit,
  runParamAllowTerminal,
  runParamAllowOnlyEnabled,
  runParamAllowOnlyList,
  runParamAllowOnlyAdd,
  runParamDenyTerminalEnabled,
  runParamDenyTerminalList,
  runParamDenyTerminalAdd,
});

const {
  applyRunBuilderParams,
  collectRunBuilderParams,
  resetRunBuilderParams,
  updateRunBuilderParamState,
  createRunParamArrayInput,
  getRunParamArrayValues,
  handleRunBuilderPromptInput,
  formatRunOptionSummary,
} = runBuilderParamsController;

const paginationController = createPaginationController({
  paginationContainer,
  onPageChange: (page) => {
    currentCardsPage = page;
    renderCards();
  },
});

const {
  createPaginationButton,
  createPaginationEllipsis,
  getVisiblePaginationPages,
  renderPagination,
} = paginationController;

const activityUtils = createActivityUtils({
  definitionsRef: () => definitions,
  showDetails,
  activityLastUpdated,
  setActiveTopPage,
  updateRouteForDetails,
});

const {
  getRunNameFromPath,
  normalizeDefinitionPath,
  findDefinitionByPath,
  setActivityDefinitionLink,
  openDefinitionDetailsByPath,
} = activityUtils;

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
    persistRecentAgentRunPacks(RECENT_AGENT_RUNS_STORAGE_KEY, recentAgentRunPacks);
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
          prompt: pack.prompt,
          runOptions: pack.runOptions || {}
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
    applyRunBuilderParams(runBuilderPendingSelection.runOptions || {});
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

function resetRunAgentForm() {
  runBuilderSelection = { agent: null, config: null };
  runBuilderPendingSelection = null;
  if (runPromptInput) {
    runPromptInput.value = "";
  }
  resetRunBuilderParams();
  openRunBuilderPicker("agent");
  handleRunBuilderPromptInput();
  renderRunBuilder();
}

function prefillRunBuilderFromActivityRun(runId) {
  const normalizedRunId = String(runId || "").trim();
  if (!normalizedRunId) return;

  const run = activityRuns.find((entry) => entry.runId === normalizedRunId);
  if (!run) return;

  const agentDefinition = findDefinitionByPath(run.agentPath);
  const configDefinition = findDefinitionByPath(run.configPath);

  runBuilderSelection = {
    agent: agentDefinition ? toRunBuilderItem(agentDefinition, "◈") : null,
    config: configDefinition ? toRunBuilderItem(configDefinition, "⚙") : null
  };
  runBuilderPendingSelection = null;

  if (runPromptInput) {
    runPromptInput.value = String(run.prompt || "");
    handleRunBuilderPromptInput();
  }
  applyRunBuilderParams(run.runOptions || {});

  renderRunBuilder();
  if (!runBuilderSelection.agent) {
    openRunBuilderPicker("agent");
  } else if (!runBuilderSelection.config) {
    openRunBuilderPicker("config");
  }
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

async function pollActiveRun() {
  if (!activeRunId) return;

  let shouldScheduleNextPoll = true;

  try {
    const runResponse = await fetch(`${AGENT_RUNS_ENDPOINT}/${encodeURIComponent(activeRunId)}`);

    if (runResponse.ok) {
      const payload = await runResponse.json();
      const run = payload?.run;
      if (run && runAgentStatusText) {
        const exitSuffix = run.status === "terminated" || run.status === "failed" || run.status === "killed"
          ? ` (exit=${run.exitCode ?? "n/a"}${run.signal ? `, signal=${run.signal}` : ""})`
          : "";
        runAgentStatusText.textContent = `Run ${run.runId}: ${run.status}${exitSuffix}`;
      }

      if (run && ["terminated", "failed", "killed"].includes(run.status)) {
        clearActiveRunPolling();
        shouldScheduleNextPoll = false;
      }
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

  const groupOrder = ["running", "launched", "finished", "cancelled"];
  const groupedRuns = new Map(groupOrder.map((status) => [status, []]));
  items.forEach((run) => {
    const status = mapRunStatus(run);
    if (!groupedRuns.has(status)) {
      groupedRuns.set(status, []);
    }
    groupedRuns.get(status).push(run);
  });

  const statusesToRender = [
    ...groupOrder.filter((status) => (groupedRuns.get(status) || []).length),
    ...Array.from(groupedRuns.keys()).filter((status) => !groupOrder.includes(status) && (groupedRuns.get(status) || []).length),
  ];

  let animationIndex = 0;
  activityList.innerHTML = statusesToRender
    .map((status) => {
      const rows = (groupedRuns.get(status) || []).map((run) => {
        const agentName = getRunNameFromPath(run.agentPath, run.runId);
        const configName = getRunNameFromPath(run.configPath, "config");
        const runSeconds = getRunElapsedSeconds(run);
        const canCancel = isRunCancelable(run);

        const rowMarkup = `
      <article class="activity-row ${activitySelectedRunId === run.runId ? "active" : ""} ${status}" data-run-id="${escapeHtml(run.runId)}" data-run-status="${status}" style="animation-delay:${(animationIndex * 0.04).toFixed(2)}s">
        <div class="activity-status-indicator ${status}">
          <span class="activity-spin-ring"></span>
          <span class="activity-status-icon">${getStatusIcon(status)}</span>
          <span class="activity-pulse-dot"></span>
        </div>

        <div class="activity-row-info">
          <h3>${escapeHtml(agentName)}</h3>
          <div class="activity-row-meta">
            <span class="tag-pill">${escapeHtml(run.runId)}</span>
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
        animationIndex += 1;
        return rowMarkup;
      }).join("");

      return `
        <section class="activity-group" data-status="${status}">
          <div class="activity-group-label" role="heading" aria-level="3">
            <span class="activity-group-label-text">${getStatusIcon(status)} ${escapeHtml(getStatusGroupLabel(status))}</span>
          </div>
          ${rows}
        </section>`;
    })
    .join("");
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
  setActivityDefinitionLink(activityDetailAgent, run.agentPath, run.runId);
  setActivityDefinitionLink(activityDetailConfig, run.configPath, "config");
  activityDetailAgentPath.textContent = getFullRunPath(run.agentPath);
  activityDetailConfigPath.textContent = getFullRunPath(run.configPath);
  activityDetailPid.textContent = run.pid ?? "n/a";
  activityDetailStarted.textContent = run.startedAt || run.createdAt || "—";
  activityDetailDuration.textContent = formatDuration(run.startedAt || run.createdAt, run.endedAt);
  activityDetailExit.textContent = run.exitCode ?? "—";
  if (activityDetailSelectedParams) {
    activityDetailSelectedParams.textContent = formatRunOptionSummary(run.runOptions || {});
  }
  if (activityDetailCommandLine) {
    activityDetailCommandLine.textContent = run.commandLine || run.command || "—";
  }
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

function updateActivityScrollLockState(locked, { forceScrollToBottom = false } = {}) {
  activityScrollLocked = Boolean(locked);
  activityScrollLockButton?.classList.toggle("active", activityScrollLocked);
  if (activityScrollLockButton) {
    activityScrollLockButton.textContent = activityScrollLocked ? "🔒 lock" : "↓ follow";
  }
  if (forceScrollToBottom && activityLog) {
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

function hasLiveActivityRuns() {
  return activityRuns.some((run) => isRunLive(run));
}

function startActivityPolling() {
  clearActivityPolling();
  void pollActivity();
}

async function pollActivity() {
  if (activeTopPage !== "activity") return;
  await loadActivityRuns();
  if (activitySelectedRunId) {
    await loadActivityLogs(false);
  }
  if (!hasLiveActivityRuns()) {
    clearActivityPolling();
    return;
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
      const runId = rerunButton.getAttribute("data-activity-rerun") || "";
      prefillRunBuilderFromActivityRun(runId);
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

  [activityDetailAgent, activityDetailConfig].forEach((element) => {
    element?.addEventListener("click", () => {
      if (!activitySelectedRunId) return;
      const run = activityRuns.find((entry) => entry.runId === activitySelectedRunId);
      if (!run) return;
      const pathValue = element === activityDetailAgent ? run.agentPath : run.configPath;
      openDefinitionDetailsByPath(pathValue);
    });
    element?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      element.click();
    });
  });

  activityRefreshButton?.addEventListener("click", () => {
    loadActivityRuns().then(() => {
      if (activitySelectedRunId) return loadActivityLogs(false);
      return null;
    }).finally(() => {
      if (activeTopPage === "activity" && hasLiveActivityRuns() && !activityPollTimer) {
        startActivityPolling();
      }
    });
  });

  activityCancelButton?.addEventListener("click", () => {
    if (!activitySelectedRunId) return;
    killActivityRun(activitySelectedRunId).catch((error) => window.alert(error?.message || "Unable to cancel run."));
  });

  activityRerunButton?.addEventListener("click", () => {
    prefillRunBuilderFromActivityRun(activitySelectedRunId);
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

  updateActivityScrollLockState(activityScrollLocked);

  activityScrollLockButton?.addEventListener("click", () => {
    const nextLockedState = !activityScrollLocked;
    updateActivityScrollLockState(nextLockedState, { forceScrollToBottom: !nextLockedState });
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
        prompt: String(runPromptInput?.value || ""),
        runOptions: collectRunBuilderParams()
      },
      ...recentAgentRunPacks.filter((pack) => pack.agentId !== idsToPromote[0] || pack.configId !== idsToPromote[1])
    ].slice(0, 30);
    persistRecentAgentRunPacks(RECENT_AGENT_RUNS_STORAGE_KEY, recentAgentRunPacks);
    void persistRecentAgentRunPackToDatabase(recentAgentRunPacks[0]);

    const launchPayload = {
      agentId: Number(runBuilderSelection.agent.id),
      configId: Number(runBuilderSelection.config.id),
      prompt: String(runPromptInput?.value || ""),
      projectPath: selectedProject,
      runOptions: collectRunBuilderParams()
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
    clearActiveRunPolling();

    if (runId) {
      if (runAgentStatusText) {
        runAgentStatusText.textContent = `Run ${runId}: ${payload?.run?.status || "launched"}`;
      }
      void pollActiveRun();
    }

    resetRunAgentForm();
    setActiveTopPage("activity");

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

  [
    runParamVerbose,
    runParamReadonly,
    runParamDenyRead,
    runParamDenyList,
    runParamDenySearch,
    runParamDenyFetch,
    runParamDenyDiff,
    runParamAllowWrite,
    runParamAllowEdit,
    runParamAllowMultiEdit,
    runParamAllowTerminal,
    runParamAllowOnlyEnabled,
    runParamDenyTerminalEnabled
  ]
    .forEach((checkbox) => checkbox?.addEventListener("change", updateRunBuilderParamState));
  runParamAllowOnlyAdd?.addEventListener("click", () => {
    createRunParamArrayInput(runParamAllowOnlyList, "*.ts");
    updateRunBuilderParamState();
  });
  runParamDenyTerminalAdd?.addEventListener("click", () => {
    createRunParamArrayInput(runParamDenyTerminalList, "npm install");
    updateRunBuilderParamState();
  });
  updateRunBuilderParamState();

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
    startActivityPolling();
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

function normalizeFilterType(type) {
  return normalizeFilterTypeUtil(type, FILTER_TYPE_SET);
}




const fetchWithErrorHandling = createFetchWithErrorHandling({ runWithLoading });

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

function formatTypePillLabel(type) {
  return formatTypePillLabelUtil(type, FILTER_TYPE_SET);
}

function typeClassName(type) {
  return typeClassNameUtil(type, FILTER_TYPE_SET);
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
  button.dataset.tagLabel = String(label || "");
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
  const pills = Array.from(tagPillsContainer.querySelectorAll(".hub-menu-tag-pill"));
  let visibleCount = 0;

  pills.forEach((pill) => {
    const value = String(pill.dataset.tagFilterValue || "").toLowerCase();
    const label = String(pill.dataset.tagLabel || pill.textContent || "").trim().toLowerCase();
    const isEmptyStatePill = pill.classList.contains("is-empty");
    const shouldShow = isEmptyStatePill
      ? !query
      : (!query || label.includes(query) || value.includes(query));

    pill.hidden = !shouldShow;
    pill.classList.toggle("is-hidden-by-search", !shouldShow);

    if (shouldShow && !isEmptyStatePill) {
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

  renderPagination({ totalItems: visibleDefinitions.length, totalPages, currentPage: currentCardsPage });

  renderRecommendationSection();
  updatePageTabBadges();
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

  pruneFavoriteDefinitionIds(definitions.map((definition) => definition.id));

  renderFilters();
  renderCards();
  renderActivityList();
  renderActivityDetail();
}


const definitionPreviewRenderer = createDefinitionPreviewRenderer({
  normalizeFilterType,
  escapeHtml,
});

const { renderDefinitionPreview } = definitionPreviewRenderer;

const validationController = createValidationController({
  escapeHtml,
  validationSeverityFilter,
  validationResults,
  validationLastRun,
  runValidationButton,
  validationStrictToggle,
  validationLintToggle,
  validationReferencesToggle,
  validationAutoRunToggle,
  definitionTabPreview,
  definitionTabSource,
  definitionTabTest,
  definitionPreviewPanel,
  definitionSourcePanel,
  definitionTestPanel,
  fetchWithErrorHandling,
  getCurrentDetailDefinitionId: () => currentDetailDefinitionId,
  getValidationAutoRunTimeout: () => validationAutoRunTimeout,
  setValidationAutoRunTimeout: (value) => { validationAutoRunTimeout = value; },
  setLastValidationResult: (value) => { lastValidationResult = value; },
});

const { renderValidationResult, runValidationForCurrentDefinition, scheduleValidationRun, setDefinitionTab } = validationController;

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

const duplicateModalHelpers = createDuplicateModalHelpers({
  escapeHtml,
  extractDccUriFromDefinitionContent,
});

const { openDuplicateDefinitionModal, createDuplicateDefaults } = duplicateModalHelpers;

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

const definitionGenerationController = createDefinitionGenerationController({
  closeDuplicateDefinitionModal,
  generatedDefinitionStorageKey: GENERATED_DEFINITION_STORAGE_KEY,
  generatableDefinitionTypes: GENERATABLE_DEFINITION_TYPES,
  definitionTypeAliases: DEFINITION_TYPE_ALIASES,
  commonDefinitionHelpPagePath: COMMON_DEFINITION_HELP_PAGE_PATH,
  definitionHelpPageByType: DEFINITION_HELP_PAGE_BY_TYPE,
  escapeHtml,
  formatFilterLabel,
  extractDccUriFromDefinitionContent,
  getDefinitions: () => definitions,
});

const { generateDefinitionFromDescription } = definitionGenerationController;


const hubMenuController = createHubMenuController({
  filterMenu,
  filterButton,
  localDefinitionsToggle,
  hideInstalledMenuToggle,
  getStoredHideInstalledDefinitions,
  getOnlyLocalDefinitions: () => onlyLocalDefinitions,
  hubMenu,
  hubMenuToggleButton,
  renderHubTagFilterSection,
});

const {
  closeFilterMenu,
  updateLocalDefinitionsToggleState,
  updateHideInstalledToggleState,
  closeHubMenu,
  toggleHubMenu,
} = hubMenuController;

function setupEventListeners() {
  setupAppEventListeners({
    filterButton, filterMenu, hubMenu,
    activeVersionDropdownRef: () => activeVersionDropdown,
    closeFilterMenu, closeHubMenu, closeVersionDropdown,
    hideInstalledDefinitionsStorageKey: HIDE_INSTALLED_DEFINITIONS_STORAGE_KEY,
    onlyLocalDefinitionsStorageKey: ONLY_LOCAL_DEFINITIONS_STORAGE_KEY,
    updateHideInstalledToggleState, renderCards, getStoredOnlyLocalDefinitions,
    setOnlyLocalDefinitions: (value) => { onlyLocalDefinitions = value; },
    updateLocalDefinitionsToggleState, renderFilters,
    clearSearchButton, setSearchValue,
    deleteDefinitionButton, getCurrentDetailDefinitionId: () => currentDetailDefinitionId,
    getCurrentDetailDefinitionSource: () => currentDetailDefinitionSource,
    deleteDefinitionFromRepo, fetchDefinitions, updateRouteForHub, showHubPage,
    pushUpstreamDefinitionButton, openPushUpstreamModal, getCurrentDetailDefinitionName: () => currentDetailDefinitionName,
    pushDefinitionToUpstream, showDetails,
    installDefinitionButton, devProjectInput, getDefinitions: () => definitions,
    getSupportedDestinationOptions, openInstallDestinationMenu,
    favoriteDefinitionButton, toggleFavoriteDefinition, updateFavoriteDefinitionButton,
    autoTagDefinitionButton, getCurrentDetailDefinitionTags: () => currentDetailDefinitionTags,
    suggestTagsForDefinitionContent, loadAvailableDefinitionTags, getCurrentDetailDefinitionContent: () => currentDetailDefinitionContent,
    applyDefinitionTags, copyDefinitionButton, copyDefinitionToClipboard,
    duplicateDefinitionButton, createDuplicateDefaults, getCurrentDetailDefinitionPath: () => currentDetailDefinitionPath,
    getCurrentDetailDefinitionDccUri: () => currentDetailDefinitionDccUri, openDuplicateDefinitionModal,
    getCurrentDetailDefinitionContentValue: () => currentDetailDefinitionContent, duplicateDefinition, updateRouteForDetails,
    definitionTabPreview, setDefinitionTab, definitionTabSource, definitionTabTest,
    runValidationButton, runValidationForCurrentDefinition, copyValidationReportButton,
    getLastValidationResult: () => lastValidationResult, validationSeverityFilter, renderValidationResult,
    closeModal, updateRouteForHubNoReplace: updateRouteForHub, handleRoute,
    newDefinitionMenu, newDefinitionButton, toggleNewMenu, generateDefinitionMenuItem, generateDefinitionFromDescription,
    formatFilterLabel, filterIconSvg, escapeHtml,
    hubMenuToggleButton, toggleHubMenu, topNav, setActiveTopPage,
    localDefinitionsToggle, persistOnlyLocalDefinitions, hideInstalledMenuToggle,
    getStoredHideInstalledDefinitions, persistHideInstalledDefinitions,
    installGuideMenuItem, settingsMenuItem, openEditorForCurrentDefinition, editDefinitionButton,
    versionHistoryButton, openVersionHistoryDropdown,
    setCurrentCardsPage: (value) => { currentCardsPage = value; },
  });
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
