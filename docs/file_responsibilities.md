# File Responsibilities Reference

This guide maps the main code files in DCC to their purpose and the functions they are expected to own, so new maintainers can quickly find where to make changes.

> Scope note: this document focuses on **maintained source code and tests** (`src/`, `tests/`, `docs/`, plus root config files). It intentionally omits large binary/vendor/temp artifacts (`temp/`, images, and static CSS asset details) unless they are entry points.

## Root files

| File | Responsibility | Most important functions / entrypoints |
|---|---|---|
| `package.json` | Node package metadata, npm scripts, runtime/development dependency declarations. | npm scripts are the main operational entrypoints (`start`, `test`, `lint` variants). |
| `package-lock.json` | Locked dependency tree for reproducible installs. | N/A (generated lockfile). |
| `README.md` | Project overview, setup, and top-level usage guidance. | N/A (human-facing guide). |

## Backend (`src/server`)

### Entry point and infrastructure

| File | Responsibility | Most important functions |
|---|---|---|
| `src/server/server.js` | Express bootstrap, middleware/static hosting setup, route registration, server startup. | Server bootstrap (`createApp`/startup flow) and route mounting are the key control points. |
| `src/server/db/index.js` | Database initialization and lifecycle wiring for SQLite access. | DB open/init path and shutdown/close hooks. |
| `src/server/db/helpers.js` | Promise-based helper wrappers for SQLite query/execute utilities. | `runDb` (mutations), `allDb` (list queries), `getDb` (single-row query). |
| `src/server/utils/env.js` | Environment variable parsing/default handling. | `env` normalization and typed fallback handling. |
| `src/server/utils/logger.js` | Shared logging primitives and structured log formatting. | `logInfo`, `logWarn`, `logError`, plus logger config readers/updaters. |
| `src/server/utils/files.js` | File-system read/write/path helper functions used across modules. | Safe read/write helpers and directory creation/normalization helpers. |
| `src/server/utils/git.js` | Git command helper utilities and error handling for git operations. | `runCommand`, `classifyGitError`, `getUserSafeGitErrorMessage`. |
| `src/server/utils/settings.js` | Settings persistence/read helpers and normalization utilities. | Settings load/save and defaults merge/normalization flow. |
| `src/server/utils/geminiSettings.js` | Gemini-specific settings validation/access helpers. | `normalizeGeminiClient`, `normalizeGeminiModel`. |
| `src/server/utils/aiLogging.js` | AI interaction logging controls and payload/event logging helpers. | `getAiLogConfigSync`, `updateAiLogConfig`, `truncateAiLogPayload`. |
| `src/server/utils/assetRepos.js` | AI assets repository configuration and lookup helpers. | Repository list normalization, validation, and lookup by name/path. |

### HTTP routes (controller layer)

| File | Responsibility | Most important functions |
|---|---|---|
| `src/server/routes/lifecycle.js` | Health/lifecycle endpoints used for readiness and metadata checks. | Router registration + lifecycle handlers, and `applyTagsToDefinitionContent` helper. |
| `src/server/routes/projects.js` | Project scan/list endpoints and project-related API actions. | Scan/list route handlers that bridge HTTP input to scan services. |
| `src/server/routes/repo.js` | Repository interaction endpoints (git/repo metadata oriented actions). | Route handlers for git metadata/status/ops and response shaping. |
| `src/server/routes/definitions.js` | Definition CRUD/query endpoints plus orchestration of definition domain logic. | CRUD handlers that call parse/load/save/validate/install pipelines. |
| `src/server/routes/validation.js` | Endpoints for schema/content validation workflows. | Validation handler orchestration and error mapping to API responses. |
| `src/server/routes/settings.js` | Settings API endpoints for UI configuration. | Read/update settings handlers and payload normalization. |
| `src/server/routes/openai.js` | AI-provider endpoints and model/AI operation integration routes. | AI generation/inference handlers and provider option validation. |
| `src/server/routes/versions.js` | Definition/repo version endpoints and version-history operations. | Version history and version detail route handlers. |
| `src/server/routes/editor.js` | Editor support endpoints for create/edit workflow helpers. | Editor utility handlers (preview, metadata inference, content helpers). |
| `src/server/routes/agentRuns.js` | Agent run execution, status, and lifecycle endpoints. | Launch/status/stop handlers wired to `agentRunManager`. |
| `src/server/routes/agentRunPacks.js` | Saved run-pack CRUD/management endpoints. | Create/list/update/delete handlers for run packs. |

### Definitions domain (`src/server/definitions`)

| File | Responsibility | Most important functions |
|---|---|---|
| `src/server/definitions/index.js` | Definitions domain barrel/entry exports. | Barrel exports used by routes/services to consume definitions APIs. |
| `src/server/definitions/parse.js` | Parse raw definition content into normalized in-memory structures. | `parseDefinitionContent`, `parseYamlHeaderFields`, `normalizeDefinitionType`. |
| `src/server/definitions/content.js` | Definition content transforms and content-level utility operations. | `updateDefinitionMetadataInContent`, `updateDefinitionNameInContent`, `bumpPatchVersion`. |
| `src/server/definitions/loadDefinition.js` | Load definition from disk/database/source with canonical shape. | Canonical load path and normalization of loaded definition payloads. |
| `src/server/definitions/saveDefinition.js` | Save/update definition and write related metadata/content. | Save/update flow that validates, versions, and persists content. |
| `src/server/definitions/install.js` | Install definition into target project destinations with merge strategy support. | `getProjectDestinationInfo`, merge/install orchestration, output file derivation. |
| `src/server/definitions/metadata.js` | Metadata extraction/normalization helpers (including URI/source metadata). | `extractDccUriFromDefinitionContent`, metadata/tag extraction and cleanup helpers. |
| `src/server/definitions/context.js` | Context-building helpers for definition display/execution workflows. | `parseContextProviders` and config/context merge helpers. |
| `src/server/definitions/definitionType.js` | Definition type constants/helpers and type-related utility functions. | `normalizeDccDefinitionType` and DCC/internal type conversion helpers. |
| `src/server/definitions/detectDefinitionType.js` | Heuristic/content-based definition-type detection logic. | `detectDefinitionType` (single decision point used across ingestion flows). |
| `src/server/definitions/validateDefinition.js` | Schema/rule validation orchestration for definition payloads. | `validateDefinition` (core schema + rule validation entrypoint). |
| `src/server/definitions/recommend.js` | Recommendation scoring and reason-generation logic for definitions. | `recommendDefinitions`, `buildProjectTechnologyTokens`. |
| `src/server/definitions/versionBump.js` | Version increment strategy helpers when saving/updating definitions. | `bumpVersionInContent` and semantic-version patch/minor/major handling. |

### Definition export subdomain

| File | Responsibility | Most important functions |
|---|---|---|
| `src/server/definitions/export/exportService.js` | High-level export orchestration and adapter dispatch. | Export orchestration entrypoint and adapter selection logic. |
| `src/server/definitions/export/validateExportRequest.js` | Export request validation and normalization. | `validateExportRequest` (input contract enforcement). |
| `src/server/definitions/export/fileStrategy.js` | File naming/path strategy rules for exported output. | `resolveDccUri`, `getManagedRelativePath`, `slugFromDccUri`. |
| `src/server/definitions/export/compatibility.js` | Compatibility rules/checks for export destination formats. | `getExportability`, destination compatibility maps/constants. |
| `src/server/definitions/export/adapters/baseAdapter.js` | Base adapter contract/shared adapter helpers. | `buildDefinitionIdentity`, `buildTraceabilityHeader`, `stableSlug`. |
| `src/server/definitions/export/adapters/copilotAdapter.js` | Export mapping rules for Copilot format. | Copilot adapter transform/build functions used by export service. |
| `src/server/definitions/export/adapters/geminiAdapter.js` | Export mapping rules for Gemini format. | Gemini adapter transform/build functions used by export service. |

### Project scanning + versions + services

| File | Responsibility | Most important functions |
|---|---|---|
| `src/server/projects/scan.js` | Top-level project scan orchestration across scan helpers. | Main scan orchestration entrypoint used by project APIs. |
| `src/server/projects/contextWindow.js` | Context-window estimation/support for project or prompt operations. | Context-size estimation function(s) for prompt budgeting. |
| `src/server/projects/scan/constants.js` | Shared constants used by project scanning modules. | `PROJECT_TYPES`, core platform maps, detector constant sets. |
| `src/server/projects/scan/filesystem.js` | Filesystem traversal and filtering helpers for scanning. | `buildEntryMap`, `shouldSkipDirectoryName`, path matching helpers. |
| `src/server/projects/scan/technology.js` | Technology/project-type detection based on discovered files/signals. | `detectProjectType`, `collectProjectTechnologies`, `detectCorePlatform`. |
| `src/server/projects/scan/repoSignals.js` | Repo-level signal extraction (CI files, manifests, frameworks, etc.). | Signal collection and default platform fallback helpers. |
| `src/server/versions/git.js` | Git history parsing for version timelines and metadata. | `parseGitLogEntries`, `normalizeHistoricalVersion`. |
| `src/server/services/agentRunManager.js` | Main agent run lifecycle orchestration service. | `agentRunManager` API and `buildAgentRunArgs`. |
| `src/server/services/agentRunManager/commandLaunch.js` | Child-process launch preparation for agent commands. | `createSpawnSpec`, executable detection helpers. |
| `src/server/services/agentRunManager/runOptions.js` | Normalize user run options into concrete CLI args/flags. | `normalizeRunOptions`, `buildArgs`. |
| `src/server/services/agentRunManager/constants.js` | Agent run status, timing, and option constants. | Run state constants and option-flag maps. |
| `src/server/services/agentRunManager/utils.js` | Small utility helpers used by run manager internals. | `normalizeStatus`, JSON parsing helpers, timestamp helpers. |

## Frontend (`src/client`)

### App shell, state, and API modules

| File | Responsibility | Most important functions |
|---|---|---|
| `src/client/state/appState.js` | Global app state container and mutation/read helpers. | `getState`, `setState`, `resetState`. |
| `src/client/ui/appController.js` | Main application bootstrap + coordinator for UI modules. | `initializeApp` (primary client startup entrypoint). |
| `src/client/api/apiClient.js` | Shared fetch/http wrapper logic and API error normalization. | `parseErrorMessage` and base request helper(s). |
| `src/client/api/definitionsApi.js` | Client calls for definitions CRUD + related server endpoints. | `fetchDefinitions`, `fetchDefinitionContent`, `saveDefinition`, `publishDefinition`. |
| `src/client/api/devProjectsApi.js` | Client API for dev-project roots/current project selection. | `fetchDevProjects`, `fetchCurrentDevProject`, `setCurrentDevProject`. |
| `src/client/api/validationApi.js` | Validation endpoint client wrappers. | `validateDefinition`. |
| `src/client/api/onboardingApi.js` | Onboarding status API helpers. | `fetchOnboardingStatus`, `markOnboardingAsSeen`. |
| `src/client/api/aboutApi.js` | About/version/update endpoint client wrappers. | `fetchAboutInfo`, `updateDcc`. |

### App controller submodules

| File | Responsibility | Most important functions |
|---|---|---|
| `src/client/ui/appController/constants.js` | UI controller constants and static config values. | Filter/storage key constants consumed by controller submodules. |
| `src/client/ui/appController/domElements.js` | DOM query/caching helper for main UI elements. | DOM cache/selector getters used by UI controllers. |
| `src/client/ui/appController/eventListeners.js` | Centralized event binding and handler registration. | `setupEventListeners`. |
| `src/client/ui/appController/definitionUtils.js` | Definition display/transformation helpers for UI rendering. | `parseDefinitionTags`, `extractDccUriFromDefinitionContent`, filter/type normalization helpers. |
| `src/client/ui/appController/definitionDialogs.js` | Modal/dialog workflows for create/edit/delete operations. | `openConfirmationDialog`, duplicate modal helper factory. |
| `src/client/ui/appController/definitionPreview.js` | Definition preview rendering logic. | `createDefinitionPreviewRenderer`, format/inference helpers. |
| `src/client/ui/appController/definitionGeneration.js` | AI-assisted definition generation UI workflow orchestration. | `createDefinitionGenerationController`. |
| `src/client/ui/appController/validationController.js` | Client-side integration of validation flows and results display. | `createValidationController`. |
| `src/client/ui/appController/pagination.js` | Paging state and pagination UI behaviors. | `createPaginationController`. |
| `src/client/ui/appController/hubMenuController.js` | Hub menu navigation and tab/view switching logic. | `createHubMenuController`. |
| `src/client/ui/appController/activityUtils.js` | Shared helpers for activity timeline/list rendering. | `createActivityUtils`. |
| `src/client/ui/appController/activityRunUtils.js` | Agent-run/activity-specific formatting and interaction helpers. | Activity run formatter/action helpers for run list/details. |
| `src/client/ui/appController/activityDashboardController.js` | Activity dashboard data loading and render orchestration. | `createActivityDashboardController`. |
| `src/client/ui/appController/contextSizeEstimator.js` | Context-size estimation logic for selected content/assets. | Token/size estimator helpers used by size panel. |
| `src/client/ui/appController/contextSizePanel.js` | Context-size panel rendering and interactions. | `createContextSizePanelController`. |
| `src/client/ui/appController/contextSizePrompts.js` | Prompt text/templates used for context-size workflows. | Prompt extraction + rule reference/token estimate helpers. |
| `src/client/ui/appController/intentSuggestionUtils.js` | Intent suggestion helpers and UX plumbing for recommendation flows. | Suggestion payload parsing + normalization helpers. |
| `src/client/ui/appController/installDestinationUtils.js` | Install destination derivation/selection UI helpers. | Destination compatibility/options/labels helpers. |
| `src/client/ui/appController/onboardingTour.js` | In-app onboarding tour state and step orchestration. | Tour state machine/step progression helpers. |
| `src/client/ui/appController/preferencesStorage.js` | Local storage helpers for UI preferences. | `createPreferencesStorage`. |
| `src/client/ui/appController/favoritesStorage.js` | Favorite definitions persistence helpers. | `createFavoritesStorage`. |
| `src/client/ui/appController/recentRunPackStorage.js` | Recent run pack persistence and retrieval helpers. | `getStoredRecentAgentRunPacks`, `persistRecentAgentRunPacks`. |
| `src/client/ui/appController/runBuilderParams.js` | Parameter assembly helpers for run-builder submissions. | `createRunBuilderParamsController`. |

### Frontend services and settings modules

| File | Responsibility | Most important functions |
|---|---|---|
| `src/client/services/searchService.js` | Client-side search/filter logic for definition lists. | `filterDefinitions`. |
| `src/client/services/diffService.js` | Text diff generation/render helper utilities. | `createDiffService`. |
| `src/client/services/loadingService.js` | Shared loading overlay/spinner management. | `showLoading`, `hideLoading`, `updateProgress`, `showError`. |
| `src/client/services/notificationService.js` | Toast/alert notification display utilities. | `notify`, `queueNotification`, `initNotificationService`. |
| `src/client/services/autoTagService.js` | Auto-tagging helpers derived from definition/project metadata. | Tag inference/generation helpers for definition creation/editing. |
| `src/client/settings/dom.js` | Settings page DOM cache/lookup helpers. | DOM references (`settingsForm`, `assetReposTable`, button refs). |
| `src/client/settings/helpers.js` | Cross-cutting helper functions for settings modules. | `escapeHtml`, `normalizeLocalPath`, `setTextNotice`. |
| `src/client/settings/theme.js` | Settings page theme controls and persistence integration. | `initThemeSettings`, `updateThemeToggleLabel`. |
| `src/client/settings/devProjects.js` | Dev project roots settings management UI and API integration. | `initDevProjects`. |
| `src/client/settings/assetRepos.js` | AI assets repository settings UI/workflows. | `initAssetRepos`. |
| `src/client/settings/recommendations.js` | Recommendation-related user settings controls. | `initRecommendationSettings`, Gemini section toggling. |
| `src/client/settings/modelsDialog.js` | Model configuration modal behavior and data wiring. | `initModelsDialog`. |
| `src/client/settings/importExport.js` | Settings backup/restore and import/export UI logic. | `initImportExport`. |

### Frontend utility modules

| File | Responsibility | Most important functions |
|---|---|---|
| `src/client/utils/uriUtils.js` | URI parsing/formatting helpers used across UI modules. | `extractDccUriFromDefinitionContent`. |
| `src/client/utils/stringUtils.js` | Generic string manipulation helpers. | `escapeHtml`, `getCardDescription`, `renderDescriptionMarkdown`. |
| `src/client/utils/tagUtils.js` | Tag normalization/formatting helpers. | `parseDefinitionTags`, `parseTagSearchQuery`, `isTagOnlyQuery`. |
| `src/client/utils/definitionIcons.js` | Mapping between definition types and UI icon resources. | `definitionIconSvg`. |

### User guide rendering modules

| File | Responsibility | Most important functions |
|---|---|---|
| `src/client/user-guide/app.js` | User guide app bootstrap and rendering workflow. | Guide app initialization/render entrypoint. |
| `src/client/user-guide/data.js` | User guide content metadata/index data source. | Content index/data provider exports. |
| `src/client/user-guide/toc.js` | Table-of-contents generation/rendering logic. | TOC build/render helpers. |
| `src/client/user-guide/markdown.js` | Markdown rendering helpers for guide pages. | Markdown-to-HTML rendering and sanitization helpers. |

## Test suites (`tests`)

Each `tests/*.test.js` file validates one backend module or route behavior area. Use the filename prefix to locate intent quickly:

- `agent-runs-route`, `agent-run-command-launch`: agent execution route/service behaviors.
- `config-definition-validation`, `rule-definition-validation`, `model-definition-validation`: schema validation coverage per definition type.
- `definition-*`, `detect-definition-type`, `parse-definition`, `save-definition`, `load-definitions-dcc-uri`: definition parsing/CRUD/type logic.
- `definition-suggestions-route`, `recommend-definition`, `recommendation_scoring`: recommendation route/engine behavior.
- `export-*`, `copilot-export-adapter`, `gemini-export-adapter`: export service and adapter-specific mapping/validation behavior.
- `gemini-*-stream-logging`: Gemini client stream logging and telemetry correctness.
- `install-destination`, `merge-config-content`: install/merge mechanics.
- `lifecycle-tags`, `project-scan-detection`: lifecycle metadata and project scanning logic.

Fixtures under `tests/fixtures/` provide representative inputs for parsers, scanners, and export/definition behaviors.

## Documentation files (`docs`)

| File | Responsibility | Most important functions / structure |
|---|---|---|
| `docs/architecture.md` | System architecture overview for major components and boundaries. | N/A (architecture narrative). |
| `docs/code_architecture.md` | Code-level architecture map and module boundary summary. | N/A (architecture narrative). |
| `docs/feature_list.md` | Product feature inventory and capabilities checklist. | N/A (feature reference). |
| `docs/user_guide.md` | End-user workflow guide and usage instructions. | N/A (end-user steps). |
| `docs/technology_stack.md` | Runtime and dependency stack summary. | N/A (stack reference). |
| `docs/recommendation_scoring.md` | Recommendation score model and rationale explanation. | N/A (algorithm explanation). |
| `docs/api_swagger.md` | API usage notes and Swagger/OpenAPI documentation instructions. | N/A (API docs workflow). |
| `docs/whish_list.md` | Backlog or wishlist notes (future enhancements). | N/A (ideas list). |
| `docs/swagger/dcc-server-openapi.yaml` | OpenAPI contract for server endpoints. | Paths/components sections are the key contract entrypoints. |
| `docs/file_responsibilities.md` | (This file) maintainer-focused source file responsibility map. | Use this file to find owner modules + key exported function names quickly. |

## How to use this document during maintenance

1. Identify the behavior you need to change (API route, parsing, scanning, UI state, etc.).
2. Jump to the relevant section and open the listed file(s).
3. Start with the **Most important functions** column to locate the entrypoint quickly.
4. Use corresponding tests in `tests/` with similar names before and after your change.
5. If you add a new source module, update this document in the same PR so responsibility mapping stays current.
