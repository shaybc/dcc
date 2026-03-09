# File Responsibilities Reference

This guide maps the main code files in DCC to their purpose and the functions they are expected to own, so new maintainers can quickly find where to make changes.

> Scope note: this document focuses on **maintained source code and tests** (`src/`, `tests/`, `docs/`, plus root config files). It intentionally omits large binary/vendor/temp artifacts (`temp/`, images, and static CSS asset details) unless they are entry points.

## Root files

| File | Responsibility |
|---|---|
| `package.json` | Node package metadata, npm scripts, runtime/development dependency declarations. |
| `package-lock.json` | Locked dependency tree for reproducible installs. |
| `README.md` | Project overview, setup, and top-level usage guidance. |

## Backend (`src/server`)

### Entry point and infrastructure

| File | Responsibility |
|---|---|
| `src/server/server.js` | Express bootstrap, middleware/static hosting setup, route registration, server startup. |
| `src/server/db/index.js` | Database initialization and lifecycle wiring for SQLite access. |
| `src/server/db/helpers.js` | Promise-based helper wrappers for SQLite query/execute utilities. |
| `src/server/utils/env.js` | Environment variable parsing/default handling. |
| `src/server/utils/logger.js` | Shared logging primitives and structured log formatting. |
| `src/server/utils/files.js` | File-system read/write/path helper functions used across modules. |
| `src/server/utils/git.js` | Git command helper utilities and error handling for git operations. |
| `src/server/utils/settings.js` | Settings persistence/read helpers and normalization utilities. |
| `src/server/utils/geminiSettings.js` | Gemini-specific settings validation/access helpers. |
| `src/server/utils/aiLogging.js` | AI interaction logging controls and payload/event logging helpers. |
| `src/server/utils/assetRepos.js` | AI assets repository configuration and lookup helpers. |

### HTTP routes (controller layer)

| File | Responsibility |
|---|---|
| `src/server/routes/lifecycle.js` | Health/lifecycle endpoints used for readiness and metadata checks. |
| `src/server/routes/projects.js` | Project scan/list endpoints and project-related API actions. |
| `src/server/routes/repo.js` | Repository interaction endpoints (git/repo metadata oriented actions). |
| `src/server/routes/definitions.js` | Definition CRUD/query endpoints plus orchestration of definition domain logic. |
| `src/server/routes/validation.js` | Endpoints for schema/content validation workflows. |
| `src/server/routes/settings.js` | Settings API endpoints for UI configuration. |
| `src/server/routes/openai.js` | AI-provider endpoints and model/AI operation integration routes. |
| `src/server/routes/versions.js` | Definition/repo version endpoints and version-history operations. |
| `src/server/routes/editor.js` | Editor support endpoints for create/edit workflow helpers. |
| `src/server/routes/agentRuns.js` | Agent run execution, status, and lifecycle endpoints. |
| `src/server/routes/agentRunPacks.js` | Saved run-pack CRUD/management endpoints. |

### Definitions domain (`src/server/definitions`)

| File | Responsibility |
|---|---|
| `src/server/definitions/index.js` | Definitions domain barrel/entry exports. |
| `src/server/definitions/parse.js` | Parse raw definition content into normalized in-memory structures. |
| `src/server/definitions/content.js` | Definition content transforms and content-level utility operations. |
| `src/server/definitions/loadDefinition.js` | Load definition from disk/database/source with canonical shape. |
| `src/server/definitions/saveDefinition.js` | Save/update definition and write related metadata/content. |
| `src/server/definitions/install.js` | Install definition into target project destinations with merge strategy support. |
| `src/server/definitions/metadata.js` | Metadata extraction/normalization helpers (including URI/source metadata). |
| `src/server/definitions/context.js` | Context-building helpers for definition display/execution workflows. |
| `src/server/definitions/definitionType.js` | Definition type constants/helpers and type-related utility functions. |
| `src/server/definitions/detectDefinitionType.js` | Heuristic/content-based definition-type detection logic. |
| `src/server/definitions/validateDefinition.js` | Schema/rule validation orchestration for definition payloads. |
| `src/server/definitions/recommend.js` | Recommendation scoring and reason-generation logic for definitions. |
| `src/server/definitions/versionBump.js` | Version increment strategy helpers when saving/updating definitions. |

### Definition export subdomain

| File | Responsibility |
|---|---|
| `src/server/definitions/export/exportService.js` | High-level export orchestration and adapter dispatch. |
| `src/server/definitions/export/validateExportRequest.js` | Export request validation and normalization. |
| `src/server/definitions/export/fileStrategy.js` | File naming/path strategy rules for exported output. |
| `src/server/definitions/export/compatibility.js` | Compatibility rules/checks for export destination formats. |
| `src/server/definitions/export/adapters/baseAdapter.js` | Base adapter contract/shared adapter helpers. |
| `src/server/definitions/export/adapters/copilotAdapter.js` | Export mapping rules for Copilot format. |
| `src/server/definitions/export/adapters/geminiAdapter.js` | Export mapping rules for Gemini format. |

### Project scanning + versions + services

| File | Responsibility |
|---|---|
| `src/server/projects/scan.js` | Top-level project scan orchestration across scan helpers. |
| `src/server/projects/contextWindow.js` | Context-window estimation/support for project or prompt operations. |
| `src/server/projects/scan/constants.js` | Shared constants used by project scanning modules. |
| `src/server/projects/scan/filesystem.js` | Filesystem traversal/filtering primitives for scanning. |
| `src/server/projects/scan/technology.js` | Technology detection based on file signatures and manifests. |
| `src/server/projects/scan/devProjects.js` | Development project discovery and root aggregation helpers. |
| `src/server/projects/scan/repoSignals.js` | Repo-level signal extraction (git/config/file patterns). |
| `src/server/projects/scan/aiDetection.js` | AI-tooling detection heuristics from project/repo files. |
| `src/server/versions/cache.js` | In-memory or persisted caching for version data. |
| `src/server/versions/git.js` | Git-backed version retrieval/diff helpers. |
| `src/server/services/ai/geminiAIStudioClient.js` | AI Studio client wrapper for Gemini requests/stream handling. |
| `src/server/services/ai/geminiConnectorClient.js` | Connector-based Gemini client wrapper and stream/event handling. |
| `src/server/services/agentRunManager.js` | External-facing agent run manager service entry. |
| `src/server/services/agentRunManager/AgentRunManager.js` | Core class coordinating run start/stop/state/logging. |
| `src/server/services/agentRunManager/commandLaunch.js` | Process launch mechanics for executing agent commands. |
| `src/server/services/agentRunManager/runOptions.js` | Run option defaults/normalization/validation helpers. |
| `src/server/services/agentRunManager/constants.js` | Shared constants/enums for run manager state/events. |
| `src/server/services/agentRunManager/utils.js` | Shared utility functions used by run manager modules. |
| `src/server/stubs/connector_stub.js` | Local stub connector used for development/testing fallback behavior. |

## Frontend (`src/client`)

### HTML entry points

| File | Responsibility |
|---|---|
| `src/client/index.html` | Main app shell for DCC Hub UI. |
| `src/client/swagger.html` | Swagger/OpenAPI viewer entry page. |
| `src/client/pages/hubMain.html` | Hub main content layout template. |
| `src/client/pages/hubHeader.html` | Shared header template for hub views. |
| `src/client/pages/detailPage.html` | Definition detail page template. |
| `src/client/pages/activityPage.html` | Activity/run history page template. |
| `src/client/pages/agentsPage.html` | Agents page template and layout shell. |

### Frontend app core

| File | Responsibility |
|---|---|
| `src/client/app.js` | Frontend bootstrap, initial load flow, and page/controller wiring. |
| `src/client/theme.js` | Theme bootstrap and theme switching integration. |
| `src/client/state/appState.js` | Shared mutable client-side application state container. |
| `src/client/ui/appController.js` | Main UI orchestration for list/detail/actions and lifecycle events. |

### Frontend API clients

| File | Responsibility |
|---|---|
| `src/client/api/apiClient.js` | Low-level fetch wrapper, error handling, and shared request helpers. |
| `src/client/api/definitionsApi.js` | Definition-related API methods consumed by UI. |
| `src/client/api/devProjectsApi.js` | Development-project scanning/settings API wrappers. |
| `src/client/api/validationApi.js` | Validation endpoint client helpers. |
| `src/client/api/onboardingApi.js` | Onboarding workflow API calls. |
| `src/client/api/aboutApi.js` | About/system metadata API accessors. |

### UI controller submodules

| File | Responsibility |
|---|---|
| `src/client/ui/appController/constants.js` | UI controller constants and static config values. |
| `src/client/ui/appController/domElements.js` | DOM query/caching helper for main UI elements. |
| `src/client/ui/appController/eventListeners.js` | Centralized event binding and handler registration. |
| `src/client/ui/appController/definitionUtils.js` | Definition display/transformation helpers for UI rendering. |
| `src/client/ui/appController/definitionDialogs.js` | Modal/dialog workflows for create/edit/delete operations. |
| `src/client/ui/appController/definitionPreview.js` | Definition preview rendering logic. |
| `src/client/ui/appController/definitionGeneration.js` | AI-assisted definition generation UI workflow orchestration. |
| `src/client/ui/appController/validationController.js` | Client-side integration of validation flows and results display. |
| `src/client/ui/appController/pagination.js` | Paging state and pagination UI behaviors. |
| `src/client/ui/appController/hubMenuController.js` | Hub menu navigation and tab/view switching logic. |
| `src/client/ui/appController/activityUtils.js` | Shared helpers for activity timeline/list rendering. |
| `src/client/ui/appController/activityRunUtils.js` | Agent-run/activity-specific formatting and interaction helpers. |
| `src/client/ui/appController/activityDashboardController.js` | Activity dashboard data loading and render orchestration. |
| `src/client/ui/appController/contextSizeEstimator.js` | Context-size estimation logic for selected content/assets. |
| `src/client/ui/appController/contextSizePanel.js` | Context-size panel rendering and interactions. |
| `src/client/ui/appController/contextSizePrompts.js` | Prompt text/templates used for context-size workflows. |
| `src/client/ui/appController/intentSuggestionUtils.js` | Intent suggestion helpers and UX plumbing for recommendation flows. |
| `src/client/ui/appController/installDestinationUtils.js` | Install destination derivation/selection UI helpers. |
| `src/client/ui/appController/onboardingTour.js` | In-app onboarding tour state and step orchestration. |
| `src/client/ui/appController/preferencesStorage.js` | Local storage helpers for UI preferences. |
| `src/client/ui/appController/favoritesStorage.js` | Favorite definitions persistence helpers. |
| `src/client/ui/appController/recentRunPackStorage.js` | Recent run pack persistence and retrieval helpers. |
| `src/client/ui/appController/runBuilderParams.js` | Parameter assembly helpers for run-builder submissions. |

### Frontend services and settings modules

| File | Responsibility |
|---|---|
| `src/client/services/searchService.js` | Client-side search/filter logic for definition lists. |
| `src/client/services/diffService.js` | Text diff generation/render helper utilities. |
| `src/client/services/loadingService.js` | Shared loading overlay/spinner management. |
| `src/client/services/notificationService.js` | Toast/alert notification display utilities. |
| `src/client/services/autoTagService.js` | Auto-tagging helpers derived from definition/project metadata. |
| `src/client/settings/dom.js` | Settings page DOM cache/lookup helpers. |
| `src/client/settings/helpers.js` | Cross-cutting helper functions for settings modules. |
| `src/client/settings/theme.js` | Settings page theme controls and persistence integration. |
| `src/client/settings/devProjects.js` | Dev project roots settings management UI and API integration. |
| `src/client/settings/assetRepos.js` | AI assets repository settings UI/workflows. |
| `src/client/settings/recommendations.js` | Recommendation-related user settings controls. |
| `src/client/settings/modelsDialog.js` | Model configuration modal behavior and data wiring. |
| `src/client/settings/importExport.js` | Settings backup/restore and import/export UI logic. |

### Frontend utility modules

| File | Responsibility |
|---|---|
| `src/client/utils/uriUtils.js` | URI parsing/formatting helpers used across UI modules. |
| `src/client/utils/stringUtils.js` | Generic string manipulation helpers. |
| `src/client/utils/tagUtils.js` | Tag normalization/formatting helpers. |
| `src/client/utils/definitionIcons.js` | Mapping between definition types and UI icon resources. |

### User guide rendering modules

| File | Responsibility |
|---|---|
| `src/client/user-guide/app.js` | User guide app bootstrap and rendering workflow. |
| `src/client/user-guide/data.js` | User guide content metadata/index data source. |
| `src/client/user-guide/toc.js` | Table-of-contents generation/rendering logic. |
| `src/client/user-guide/markdown.js` | Markdown rendering helpers for guide pages. |

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

| File | Responsibility |
|---|---|
| `docs/architecture.md` | System architecture overview for major components and boundaries. |
| `docs/code_architecture.md` | Code-level architecture map and module boundary summary. |
| `docs/feature_list.md` | Product feature inventory and capabilities checklist. |
| `docs/user_guide.md` | End-user workflow guide and usage instructions. |
| `docs/technology_stack.md` | Runtime and dependency stack summary. |
| `docs/recommendation_scoring.md` | Recommendation score model and rationale explanation. |
| `docs/api_swagger.md` | API usage notes and Swagger/OpenAPI documentation instructions. |
| `docs/whish_list.md` | Backlog or wishlist notes (future enhancements). |
| `docs/swagger/dcc-server-openapi.yaml` | OpenAPI contract for server endpoints. |
| `docs/file_responsibilities.md` | (This file) maintainer-focused source file responsibility map. |

## How to use this document during maintenance

1. Identify the behavior you need to change (API route, parsing, scanning, UI state, etc.).
2. Jump to the relevant section and open the listed file(s).
3. Use corresponding tests in `tests/` with similar names before and after your change.
4. If you add a new source module, update this document in the same PR so responsibility mapping stays current.
