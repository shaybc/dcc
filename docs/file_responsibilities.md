# File Responsibilities Reference

This guide maps the main code files in DCC to their purpose and the functions they are expected to own, so new maintainers can quickly find where to make changes.

> Scope note: this document focuses on **maintained source code and tests** (`src/`, `tests/`, `docs/`, plus root config files). It intentionally omits large binary/vendor/temp artifacts (`temp/`, images, and static CSS asset details) unless they are entry points.

## Root files

| File | Responsibility | Most important functions / entrypoints |
|---|---|---|
| `package.json` | Defines the Node package identity, runtime requirements, and operational workflows. Treat this file as the contract for how contributors install, run, test, and package the app. | npm scripts are the practical entrypoints. `start` launches the server, `test` runs automated checks, and `lint`/related variants enforce consistency before merges. |
| `package-lock.json` | Pins every resolved dependency version so installs are deterministic across machines and CI runs. This is critical for reproducible bug reports and stable builds. | N/A (generated lockfile; behavior comes from npm's resolver and install process). |
| `README.md` | Provides the first-run onboarding path: what DCC is, how to set it up, and how to exercise major features. Keep this synchronized with real setup steps to reduce support churn. | N/A (human-facing narrative; key “entrypoint” is the install/run walkthrough). |

## Backend (`src/server`)

### Entry point and infrastructure

| File | Responsibility | Most important functions |
|---|---|---|
| `src/server/server.js` | Owns the Express composition root. It wires middleware, static hosting, route modules, and startup/shutdown behavior in one place so the server boots predictably. | `createApp` constructs and configures the Express instance; startup flow binds network listeners and initializes dependencies; route mounting centralizes which API modules are active and under what prefixes. |
| `src/server/db/index.js` | Encapsulates SQLite connection lifecycle management so callers do not need to know low-level open/close sequencing details. | DB open/init logic creates or connects to the target DB and applies setup; shutdown hooks guarantee connections are closed cleanly to prevent file locks and test flakiness. |
| `src/server/db/helpers.js` | Provides Promise-based wrappers around callback-style SQLite primitives, giving all server code a consistent async interface. | `runDb` executes mutating SQL and returns execution metadata; `allDb` runs read queries that return arrays; `getDb` fetches exactly one row (or null) for lookup-style operations. |
| `src/server/utils/env.js` | Centralizes parsing and normalization of environment values so feature flags and runtime settings behave consistently. | The `env` normalization layer converts raw strings into typed values (booleans/numbers/paths), applies defaults, and guards against malformed input that would otherwise fail later. |
| `src/server/utils/logger.js` | Defines shared logging behavior and formatting to keep server logs structured and searchable. | `logInfo`, `logWarn`, and `logError` encode severity and metadata consistently; logger config readers/updaters control verbosity and destinations without changing every callsite. |
| `src/server/utils/files.js` | Collects safe filesystem helpers used by multiple modules so path handling, directory creation, and read/write semantics stay uniform. | Read/write helpers standardize encoding and error wrapping; directory helpers ensure parent paths exist before writes and normalize path conventions across platforms. |
| `src/server/utils/git.js` | Wraps git process execution and translates raw failures into actionable, user-safe messages. | `runCommand` executes git commands with controlled I/O; `classifyGitError` maps low-level process errors to known categories; `getUserSafeGitErrorMessage` returns concise errors suitable for API responses/UI. |
| `src/server/utils/settings.js` | Owns settings read/write mechanics, defaults, and normalization so settings remain backward-compatible as schema evolves. | Load/save helpers handle persistence boundary concerns; merge/normalization logic upgrades partial or legacy payloads into a canonical runtime shape. |
| `src/server/utils/geminiSettings.js` | Contains Gemini-provider-specific validation and coercion rules to keep AI settings safe and predictable. | `normalizeGeminiClient` validates client-level options and fills defaults; `normalizeGeminiModel` validates selected model IDs/options and returns a consistent object used by callers. |
| `src/server/utils/aiLogging.js` | Governs AI telemetry/logging controls, including what gets recorded and how large payloads are handled. | `getAiLogConfigSync` reads effective logging config quickly; `updateAiLogConfig` persists runtime logging changes; `truncateAiLogPayload` enforces size limits while preserving useful diagnostics. |
| `src/server/utils/assetRepos.js` | Manages AI asset repository configuration (validation, normalization, lookup) used across routes/services. | Normalization helpers sanitize repo entries; validation rejects invalid names/paths; lookup helpers resolve repositories by name/path for install/export workflows. |

### HTTP routes (controller layer)

| File | Responsibility | Most important functions |
|---|---|---|
| `src/server/routes/lifecycle.js` | Exposes health/status endpoints and lifecycle metadata used by readiness checks and UI shell bootstrapping. | Router setup declares lifecycle endpoints; lifecycle handlers report server availability/version metadata; `applyTagsToDefinitionContent` enriches returned definition content with computed tags. |
| `src/server/routes/projects.js` | Serves project discovery/selection APIs and bridges HTTP payloads into scanning services. | Scan/list handlers validate request inputs, invoke scan orchestration, and translate scan outputs into stable response contracts for the client. |
| `src/server/routes/repo.js` | Publishes repository-level operations (status/history/metadata) over HTTP while abstracting git internals. | Route handlers call git utilities/services, normalize output fields, and map known git failures into appropriate HTTP status/messages. |
| `src/server/routes/definitions.js` | Main controller for definition CRUD/query operations and orchestration across parse/validate/save/install modules. | CRUD handlers load current state, run validation and type detection, persist updates, and return normalized definition payloads for UI consumption. |
| `src/server/routes/validation.js` | Hosts endpoints dedicated to explicit validation requests from the editor and automation workflows. | Validation handlers orchestrate schema/rule checks and convert error collections into response shapes that the UI can render inline. |
| `src/server/routes/settings.js` | Provides API endpoints for reading/updating app settings consumed by settings UI. | Read/update handlers retrieve canonical settings, normalize inbound payloads, persist validated changes, and return merged effective settings. |
| `src/server/routes/openai.js` | Handles AI-provider-facing routes, including model operations and generation endpoints. | Inference handlers validate provider/model options, invoke provider clients, and stream or return generated content with consistent error handling. |
| `src/server/routes/versions.js` | Exposes version history and version-detail APIs for definitions/repos. | Handlers query git/version services, build timeline-friendly payloads, and provide diff/detail views per selected version. |
| `src/server/routes/editor.js` | Supplies editor helper endpoints used for content preview, metadata inference, and authoring assistance. | Utility handlers compute previews, infer metadata fields from content, and return editing aids that reduce client-side duplication. |
| `src/server/routes/agentRuns.js` | Controls agent run lifecycle over HTTP (create/start/status/stop). | Launch handler composes run options and starts jobs via `agentRunManager`; status handler reports current state/log info; stop handler performs coordinated termination and cleanup. |
| `src/server/routes/agentRunPacks.js` | Manages saved run-pack records used to quickly re-run common agent workflows. | CRUD handlers validate pack schemas, persist list/detail updates, and return normalized run-pack entities for client storage/display. |

### Definitions domain (`src/server/definitions`)

| File | Responsibility | Most important functions |
|---|---|---|
| `src/server/definitions/index.js` | Barrel for the definitions domain, exposing the public API surface used by routes and services. | Re-exports define which definition utilities are “supported” for external callers and reduce deep-import coupling. |
| `src/server/definitions/parse.js` | Parses raw definition text into structured objects with normalized fields and inferred type metadata. | `parseDefinitionContent` is the top-level parser that splits header/body and returns normalized output; `parseYamlHeaderFields` parses/normalizes metadata frontmatter; `normalizeDefinitionType` resolves aliases/case variants into canonical types. |
| `src/server/definitions/content.js` | Performs content-level transforms on definition text without losing important structure. | `updateDefinitionMetadataInContent` rewrites frontmatter metadata while preserving body content; `updateDefinitionNameInContent` safely updates name fields and related references; `bumpPatchVersion` increments patch versions in content for publish/save flows. |
| `src/server/definitions/loadDefinition.js` | Loads definitions from storage and converts them into a canonical runtime shape. | Load flow resolves source path/identifier, parses content, attaches derived metadata, and returns a stable object consumed by routes/UI. |
| `src/server/definitions/saveDefinition.js` | Persists create/update operations for definitions with validation and versioning safeguards. | Save/update flow validates payloads, applies version bump strategy, writes content + metadata, and returns persisted canonical representation. |
| `src/server/definitions/install.js` | Coordinates definition installation into destination projects, including path selection and merge behavior. | Install orchestration validates destination compatibility, resolves output paths, writes/merges files, and returns traceable installation results. |
| `src/server/definitions/context.js` | Builds runtime context objects used during definition rendering/execution/recommendation tasks. | `parseContextProviders` parses provider declarations into executable context configuration; merge helpers combine global and definition-level context with precedence rules. |
| `src/server/definitions/definitionType.js` | Holds type constants and conversion utilities between internal and external type labels. | `normalizeDccDefinitionType` maps loose or legacy type strings to canonical enums; conversion helpers translate between DCC and adapter-specific naming schemes. |
| `src/server/definitions/detectDefinitionType.js` | Implements heuristics to infer definition type from content/features when type is missing or ambiguous. | `detectDefinitionType` is the single decision point that evaluates markers/structure and returns the best-supported type classification. |
| `src/server/definitions/validateDefinition.js` | Orchestrates all validation layers for definitions (schema + semantic rules). | `validateDefinition` runs structural checks first, applies type-specific rules next, and returns normalized diagnostics suitable for API and UI display. |
| `src/server/definitions/recommend.js` | Computes recommendation scores and human-readable reasons for matching definitions to a project context. | `recommendDefinitions` builds candidate rankings from feature/technology overlap and scoring weights; `buildProjectTechnologyTokens` derives normalized tokens from project scan signals used in scoring. |
| `src/server/definitions/versionBump.js` | Encapsulates semantic-version bump policy used during save/publish workflows. | `bumpVersionInContent` updates version fields in source text; helpers choose patch/minor/major increments based on explicit intent or inferred change type. |

### Definition export subdomain

| File | Responsibility | Most important functions |
|---|---|---|
| `src/server/definitions/export/exportService.js` | Primary export coordinator that chooses an adapter and executes end-to-end export flow. | Export entrypoint validates request, resolves adapter, executes transform + file strategy, and returns exported artifacts and compatibility metadata. |
| `src/server/definitions/export/validateExportRequest.js` | Validates and normalizes export requests before expensive processing begins. | `validateExportRequest` enforces required fields, destination constraints, and option shape, returning a canonical request object for downstream code. |
| `src/server/definitions/export/fileStrategy.js` | Defines deterministic file naming/path rules for generated export artifacts. | `resolveDccUri` extracts canonical identity from definition metadata/content; `getManagedRelativePath` computes managed output location; `slugFromDccUri` creates stable safe filenames from URIs. |
| `src/server/definitions/export/compatibility.js` | Encodes destination compatibility rules and explains why a definition can/cannot be exported. | `getExportability` evaluates type/feature compatibility for the selected destination; maps/constants provide the compatibility matrix used by UI warnings and server checks. |
| `src/server/definitions/export/adapters/baseAdapter.js` | Shared adapter contract and helper logic used by provider-specific adapters. | `buildDefinitionIdentity` creates stable identifiers for exported artifacts; `buildTraceabilityHeader` injects provenance comments/metadata; `stableSlug` generates deterministic slugs for cross-run consistency. |
| `src/server/definitions/export/adapters/copilotAdapter.js` | Implements transformation rules from DCC definitions to Copilot-oriented output format. | Adapter transform/build functions map DCC fields to Copilot schema, preserving traceability and minimizing lossy conversion. |
| `src/server/definitions/export/adapters/geminiAdapter.js` | Implements transformation rules from DCC definitions to Gemini-oriented output format. | Adapter transform/build functions convert definition content/options into Gemini-compatible structures and metadata conventions. |

### Project scanning + versions + services

| File | Responsibility | Most important functions |
|---|---|---|
| `src/server/projects/scan.js` | Coordinates full project scanning by composing filesystem traversal, signal extraction, and technology detection steps. | Main scan entrypoint orchestrates child scanners, consolidates findings, and returns a normalized project profile consumed by recommendations/UI. |
| `src/server/projects/contextWindow.js` | Estimates context window/token usage to support prompt budgeting and context-size UX. | Estimation functions calculate approximate token footprint from selected content/assets and provide guardrails for model limits. |
| `src/server/projects/scan/constants.js` | Central source of scan-time constants and taxonomy definitions. | `PROJECT_TYPES` and platform/detector maps define recognized project classes and keep detector logic aligned across modules. |
| `src/server/projects/scan/filesystem.js` | Handles filesystem walking/filtering for scans while respecting skip rules and performance constraints. | `buildEntryMap` builds a compact index of relevant files/directories; `shouldSkipDirectoryName` enforces ignore rules; path matching helpers identify files used by technology detectors. |
| `src/server/projects/scan/technology.js` | Converts raw repo signals into project type and technology labels. | `detectProjectType` selects the dominant project category; `collectProjectTechnologies` aggregates framework/runtime markers; `detectCorePlatform` infers base platform when signals are sparse. |
| `src/server/projects/scan/repoSignals.js` | Extracts repository-level signals from manifests, CI config, and framework markers. | Signal collectors parse known files into normalized evidence; fallback helpers provide default platform assumptions when explicit signals are missing. |
| `src/server/versions/git.js` | Converts git history output into version-oriented structures used by version endpoints. | `parseGitLogEntries` parses command output into structured commits; `normalizeHistoricalVersion` converts historical metadata into the same shape used by current-version views. |
| `src/server/services/agentRunManager.js` | Core service that manages agent job lifecycle, process tracking, state transitions, and events. | `agentRunManager` public API starts/stops/queries runs; `buildAgentRunArgs` composes executable arguments from normalized run options and defaults. |
| `src/server/services/agentRunManager/commandLaunch.js` | Prepares executable launch specs for child processes in a safe, cross-platform way. | `createSpawnSpec` assembles command, args, env, and cwd for spawning; executable detection helpers locate valid binaries and report actionable failures. |
| `src/server/services/agentRunManager/runOptions.js` | Normalizes user-provided run options into validated CLI flags and runtime settings. | `normalizeRunOptions` applies defaults, coercions, and validation; `buildArgs` translates normalized options into deterministic argument arrays for process launch. |
| `src/server/services/agentRunManager/constants.js` | Defines run-state enums, timing defaults, and option-flag maps used throughout the manager. | Constants provide a shared vocabulary for statuses and option translation so route, service, and UI layers remain aligned. |
| `src/server/services/agentRunManager/utils.js` | Utility helpers supporting run-manager internals (state conversion, parsing, timestamps). | `normalizeStatus` harmonizes raw status signals; JSON/timestamp helpers standardize log/event parsing and elapsed-time calculations. |

## Frontend (`src/client`)

### App shell, state, and API modules

| File | Responsibility | Most important functions |
|---|---|---|
| `src/client/state/appState.js` | Holds the client-side source of truth for shared UI state and exposes controlled mutation/read APIs. | `getState` returns current state snapshot for renderers/controllers; `setState` applies partial updates and triggers downstream effects; `resetState` reinitializes state for project switches or hard resets. |
| `src/client/ui/appController.js` | Main frontend composition root that wires app startup, controllers, and event flow. | `initializeApp` bootstraps initial data fetches, binds UI modules, and starts the default rendering cycle. |
| `src/client/api/apiClient.js` | Base HTTP client abstraction for all frontend API modules. | Shared request helper handles fetch setup, JSON parsing, and consistent error translation; `parseErrorMessage` extracts user-readable error text from varied server responses. |
| `src/client/api/definitionsApi.js` | Encapsulates all definition-related HTTP calls made by the UI. | `fetchDefinitions` retrieves list data with filters; `fetchDefinitionContent` retrieves a full definition payload for viewing/editing; `saveDefinition` persists create/update changes; `publishDefinition` triggers publish/version flows. |
| `src/client/api/devProjectsApi.js` | Wraps APIs for developer project roots and current-project selection state. | `fetchDevProjects` loads configured project roots; `fetchCurrentDevProject` gets active project context; `setCurrentDevProject` updates selection and persists it server-side. |
| `src/client/api/validationApi.js` | Client wrapper for validation endpoints used by editors and workflows. | `validateDefinition` submits draft content/metadata for server validation and returns diagnostics for inline display. |
| `src/client/api/onboardingApi.js` | Handles onboarding status read/write communication. | `fetchOnboardingStatus` checks whether intro flows should show; `markOnboardingAsSeen` records completion so tours do not reappear unnecessarily. |
| `src/client/api/aboutApi.js` | Accesses metadata/update-related endpoints shown in “About” or maintenance UI. | `fetchAboutInfo` retrieves version/build information; `updateDcc` invokes update endpoint and returns operation status for UI feedback. |

### App controller submodules

| File | Responsibility | Most important functions |
|---|---|---|
| `src/client/ui/appController/constants.js` | Defines constants that stabilize IDs, modes, and defaults across app controller modules. | Constants act as contract values used by controllers to avoid hard-coded strings and drift between modules. |
| `src/client/ui/appController/dom.js` | Central DOM query/cache layer used by controller modules. | Cached element references reduce repeated lookups and provide a single place to update selector changes. |
| `src/client/ui/appController/events.js` | Registers and coordinates top-level UI event handlers. | `setupEventListeners` binds click/input/navigation handlers and routes events into the correct controller actions. |
| `src/client/ui/appController/definitionUtils.js` | Shared formatting and transformation helpers for rendering/filtering definitions in the UI. | `parseDefinitionTags` converts raw tag text into normalized arrays; `extractDccUriFromDefinitionContent` derives identity URI from content; additional helpers normalize type/search fields for list rendering. |
| `src/client/ui/appController/definitionDialogs.js` | Owns modal workflows for create/edit/delete and confirmation prompts. | `openConfirmationDialog` displays reusable confirmation UX and resolves user choice; modal helper factory creates consistent dialog behaviors across different definition actions. |
| `src/client/ui/appController/definitionPreview.js` | Produces rendered previews of definition content before save/publish. | `createDefinitionPreviewRenderer` builds preview pipeline (parse + sanitize + render), plus helper logic for format inference and fallback handling. |
| `src/client/ui/appController/definitionGeneration.js` | Coordinates AI-assisted definition generation lifecycle in the UI. | `createDefinitionGenerationController` orchestrates prompt collection, generation requests, progress states, and insertion of generated content into editors. |
| `src/client/ui/appController/validationController.js` | Integrates validation API calls with editor UX and error presentation. | `createValidationController` runs validations at appropriate times, maps diagnostics to UI elements, and manages validation state transitions. |
| `src/client/ui/appController/pagination.js` | Encapsulates paginated list logic for definition browsing screens. | `createPaginationController` tracks page state, computes visible ranges, and updates UI controls when filters or dataset size changes. |
| `src/client/ui/appController/hubMenuController.js` | Controls tab/menu navigation in hub-style views. | `createHubMenuController` manages active section state, route-like transitions, and menu highlighting behavior. |
| `src/client/ui/appController/activityUtils.js` | Supplies shared helpers for activity feed/timeline display logic. | `createActivityUtils` returns formatting and grouping helpers used by multiple activity views to keep behavior consistent. |
| `src/client/ui/appController/activityRunUtils.js` | Provides run-specific formatting and actions for activity views. | Helpers format run status/duration/output snippets and prepare interaction callbacks for opening run details or stopping runs. |
| `src/client/ui/appController/activityDashboardController.js` | Drives activity dashboard data loading and UI synchronization. | `createActivityDashboardController` fetches activity data, coordinates polling/refresh behavior, and renders dashboard state transitions. |
| `src/client/ui/appController/contextSizeEstimator.js` | Estimates token/size impact for selected context content in the client. | Estimator helpers compute approximate token counts, aggregate section totals, and feed warnings when user selections exceed preferred limits. |
| `src/client/ui/appController/contextSizePanel.js` | Renders and controls the context size panel interactions. | `createContextSizePanelController` binds estimator outputs to UI, handles user toggles/selections, and updates summaries dynamically. |
| `src/client/ui/appController/contextSizePrompts.js` | Stores and shapes prompt templates used in context-size workflows. | Helpers extract reusable prompt text, inject dynamic values, and provide token estimate hints shown to users. |
| `src/client/ui/appController/intentSuggestionUtils.js` | Handles parsing/normalization of intent suggestions used by recommendation UX. | Suggestion helpers normalize payload shapes from backend responses and produce UI-friendly labels/metadata. |
| `src/client/ui/appController/installDestinationUtils.js` | Encodes install destination options and compatibility hints for the UI. | Helpers derive valid destination choices for a definition, map compatibility results to labels, and prepare selector option models. |
| `src/client/ui/appController/onboardingTour.js` | Implements onboarding tour sequencing and persistence-aware behavior. | Tour helpers manage step progression, skip/complete actions, and synchronization with onboarding API/local preference state. |
| `src/client/ui/appController/preferencesStorage.js` | Wraps local-storage persistence for user UI preferences. | `createPreferencesStorage` returns a guarded read/write API with key namespacing and fallback defaults. |
| `src/client/ui/appController/favoritesStorage.js` | Persists and retrieves favorite definition references on the client. | `createFavoritesStorage` provides add/remove/list primitives with consistent serialization and deduping behavior. |
| `src/client/ui/appController/recentRunPackStorage.js` | Stores recent run-pack usage history for quick-access UX. | `getStoredRecentAgentRunPacks` loads and normalizes saved history; `persistRecentAgentRunPacks` writes updated history while enforcing list limits. |
| `src/client/ui/appController/runBuilderParams.js` | Converts run-builder UI inputs into backend-ready request payloads. | `createRunBuilderParamsController` validates and assembles parameters, mapping optional fields into a stable request schema. |

### Frontend services and settings modules

| File | Responsibility | Most important functions |
|---|---|---|
| `src/client/services/searchService.js` | Implements client-side filtering/search scoring for definition lists. | `filterDefinitions` applies query, tag, and type filters to produce stable result sets used by list rendering and pagination. |
| `src/client/services/diffService.js` | Provides text diff utilities used in compare/preview workflows. | `createDiffService` returns functions that compute and format diff output suitable for UI presentation. |
| `src/client/services/loadingService.js` | Manages global/local loading overlays and progress feedback states. | `showLoading` displays spinner/overlay state; `hideLoading` clears it; `updateProgress` updates progress text/value; `showError` presents operation-level failures in loading contexts. |
| `src/client/services/notificationService.js` | Central toast/notification pipeline for success/warning/error user messages. | `notify` emits a notification immediately; `queueNotification` schedules ordered display; `initNotificationService` wires container DOM and default behavior. |
| `src/client/services/autoTagService.js` | Generates/suggests tags based on definition/project metadata to reduce manual tagging effort. | Tag inference helpers read metadata keywords, normalize candidates, and output deduplicated tags suitable for editor prefill. |
| `src/client/settings/dom.js` | Caches settings-page DOM references and selector lookups. | Exported refs (for form/table/buttons) provide a single source for UI modules to interact with settings elements safely. |
| `src/client/settings/helpers.js` | Utility helpers shared across settings modules for sanitization and user messaging. | `escapeHtml` prevents unsafe HTML rendering in settings UI; `normalizeLocalPath` canonicalizes path inputs; `setTextNotice` renders inline status/help text consistently. |
| `src/client/settings/theme.js` | Implements theme preference controls and persistence integration on the settings page. | `initThemeSettings` binds theme UI controls and loads persisted preference; `updateThemeToggleLabel` keeps labels synchronized with active theme state. |
| `src/client/settings/devProjects.js` | Handles CRUD-style interactions for developer project root settings. | `initDevProjects` wires add/remove/select actions, API calls, and list refresh behavior for project roots. |
| `src/client/settings/assetRepos.js` | Controls settings UI for configuring external asset repositories. | `initAssetRepos` initializes table/form interactions, validates entries, and saves repository config through settings APIs. |
| `src/client/settings/recommendations.js` | Manages recommendation-related settings and provider-specific toggles. | `initRecommendationSettings` initializes settings controls and persistence flow; Gemini section toggling helpers show/hide dependent controls based on selected options. |
| `src/client/settings/modelsDialog.js` | Owns model configuration modal lifecycle and data binding. | `initModelsDialog` wires open/close/save actions, hydrates model lists, and persists model configuration changes. |
| `src/client/settings/importExport.js` | Implements settings backup/restore workflows for portability and recovery. | `initImportExport` binds import/export actions, validates file content, and coordinates confirmation + persistence steps. |

### Frontend utility modules

| File | Responsibility | Most important functions |
|---|---|---|
| `src/client/utils/uriUtils.js` | Shared URI parsing/formatting logic used across rendering, filtering, and export-related UI. | `extractDccUriFromDefinitionContent` parses definition text to recover canonical DCC URI for identity/linking workflows. |
| `src/client/utils/stringUtils.js` | Generic string helpers used broadly across client rendering logic. | `escapeHtml` sanitizes text before DOM insertion; `getCardDescription` derives concise summary text for cards/lists; `renderDescriptionMarkdown` renders markdown safely for rich descriptions. |
| `src/client/utils/tagUtils.js` | Tag parsing and query interpretation helpers. | `parseDefinitionTags` normalizes raw tag inputs; `parseTagSearchQuery` splits tag-focused search syntax into structured criteria; `isTagOnlyQuery` detects when user query should bypass free-text matching. |
| `src/client/utils/definitionIcons.js` | Maps definition types to icon resources for consistent visual labeling. | `definitionIconSvg` resolves the SVG/icon asset associated with a normalized definition type. |

### User guide rendering modules

| File | Responsibility | Most important functions |
|---|---|---|
| `src/client/user-guide/app.js` | Entry module for user-guide page bootstrapping and render orchestration. | Initialization/render entrypoint loads guide data, wires navigation listeners, and triggers first content render. |
| `src/client/user-guide/data.js` | Provides guide metadata/content index consumed by the guide renderer. | Data exports act as the authoritative source for section ordering, titles, and source mapping. |
| `src/client/user-guide/toc.js` | Builds and renders table-of-contents structures for guide navigation. | TOC helpers generate hierarchical link models and apply active-section highlighting during navigation/scroll. |
| `src/client/user-guide/markdown.js` | Converts markdown guide content into safe HTML output for display. | Markdown rendering helpers parse markdown, sanitize output, and apply guide-specific formatting conventions. |

## Test suites (`tests`)

Each `tests/*.test.js` file validates one backend module or route behavior area. Use the filename prefix to locate intent quickly:

- `agent-runs-route`, `agent-run-command-launch`: verifies run lifecycle APIs, command launch argument construction, and stop/status edge cases.
- `config-definition-validation`, `rule-definition-validation`, `model-definition-validation`: validates type-specific schemas, required fields, and semantic constraints.
- `definition-*`, `detect-definition-type`, `parse-definition`, `save-definition`, `load-definitions-dcc-uri`: covers parsing accuracy, type detection heuristics, persistence behavior, and URI extraction/loading paths.
- `definition-suggestions-route`, `recommend-definition`, `recommendation_scoring`: ensures recommendation ranking and reason generation remain stable and explainable.
- `export-*`, `copilot-export-adapter`, `gemini-export-adapter`: tests export orchestration, adapter transformations, and compatibility enforcement.
- `gemini-*-stream-logging`: confirms streamed Gemini responses are logged/truncated/classified correctly for telemetry and debugging.
- `install-destination`, `merge-config-content`: checks install target resolution and content merge semantics.
- `lifecycle-tags`, `project-scan-detection`: validates lifecycle endpoint metadata enrichment and project scanner signal detection.

Fixtures under `tests/fixtures/` provide representative inputs for parsers, scanners, adapters, and export/definition workflows; they are the quickest way to understand expected shapes for edge-case content.

## Documentation files (`docs`)

| File | Responsibility | Most important functions / structure |
|---|---|---|
| `docs/architecture.md` | High-level architecture narrative describing major components and system boundaries. | Key structure: component boundary diagrams/sections and data flow descriptions used for design-level orientation. |
| `docs/code_architecture.md` | Code-oriented architecture map that links directories/modules to responsibilities. | Key structure: module breakdown and dependency direction guidance for maintainers. |
| `docs/feature_list.md` | Living inventory of product features and capabilities. | Key structure: feature categories and checklist-style tracking of implemented behavior. |
| `docs/user_guide.md` | End-user operational guide for common workflows. | Key structure: step-by-step tasks, usage examples, and troubleshooting notes. |
| `docs/technology_stack.md` | Summary of runtime stack, major libraries, and platform assumptions. | Key structure: technology grouping by layer (client/server/tooling) and rationale notes. |
| `docs/recommendation_scoring.md` | Detailed explanation of recommendation logic and scoring rationale. | Key structure: scoring factors, weighting model, and interpretation examples. |
| `docs/api_swagger.md` | Instructions for API documentation usage and Swagger/OpenAPI workflows. | Key structure: how to view/regenerate/update API docs and contract references. |
| `docs/whish_list.md` | Backlog notes and future enhancement ideas. | Key structure: prioritized or thematic idea groups for roadmap discussions. |
| `docs/swagger/dcc-server-openapi.yaml` | Canonical machine-readable API contract for server endpoints. | `paths` defines operations/request/response contracts; `components` defines reusable schemas/parameters/security blocks. |
| `docs/file_responsibilities.md` | Maintainer-oriented map of where code responsibilities live. | Use this file to identify likely owner modules quickly, then jump to function-level entrypoints for implementation changes. |

## How to use this document during maintenance

1. Identify the behavior you need to change (API route, parsing, scanning, UI state, etc.).
2. Jump to the relevant section and open the listed file(s).
3. Use the **Most important functions** column to locate the execution entrypoint and then trace outward.
4. Run tests with matching names in `tests/` before and after your change.
5. If you add or repurpose a source module, update this document in the same PR so ownership mapping stays current.
