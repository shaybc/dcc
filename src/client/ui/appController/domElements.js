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
const runParamsStage = document.getElementById("runParamsStage");
const runParamVerbose = document.getElementById("runParamVerbose");
const runParamReadonly = document.getElementById("runParamReadonly");
const runParamDenyRead = document.getElementById("runParamDenyRead");
const runParamDenyList = document.getElementById("runParamDenyList");
const runParamDenySearch = document.getElementById("runParamDenySearch");
const runParamDenyFetch = document.getElementById("runParamDenyFetch");
const runParamDenyDiff = document.getElementById("runParamDenyDiff");
const runParamAllowWrite = document.getElementById("runParamAllowWrite");
const runParamAllowEdit = document.getElementById("runParamAllowEdit");
const runParamAllowMultiEdit = document.getElementById("runParamAllowMultiEdit");
const runParamAllowTerminal = document.getElementById("runParamAllowTerminal");
const runParamAllowOnlyEnabled = document.getElementById("runParamAllowOnlyEnabled");
const runParamAllowOnlyList = document.getElementById("runParamAllowOnlyList");
const runParamAllowOnlyAdd = document.getElementById("runParamAllowOnlyAdd");
const runParamDenyTerminalEnabled = document.getElementById("runParamDenyTerminalEnabled");
const runParamDenyTerminalList = document.getElementById("runParamDenyTerminalList");
const runParamDenyTerminalAdd = document.getElementById("runParamDenyTerminalAdd");
const runAgentStatusBar = document.getElementById("runAgentStatusBar");
const runAgentStatusText = document.getElementById("runAgentStatusText");
const runAgentCheckAgent = document.getElementById("runAgentCheckAgent");
const runAgentCheckConfig = document.getElementById("runAgentCheckConfig");
const runAgentCheckReady = document.getElementById("runAgentCheckReady");
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
const activityDetailAgentPath = document.getElementById("activityDetailAgentPath");
const activityDetailConfigPath = document.getElementById("activityDetailConfigPath");
const activityDetailPid = document.getElementById("activityDetailPid");
const activityDetailStarted = document.getElementById("activityDetailStarted");
const activityDetailDuration = document.getElementById("activityDetailDuration");
const activityDetailExit = document.getElementById("activityDetailExit");
const activityDetailSelectedParams = document.getElementById("activityDetailSelectedParams");
const activityDetailCommandLine = document.getElementById("activityDetailCommandLine");
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

export {
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
};
